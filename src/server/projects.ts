import type { AppEnv } from './env'
import type { ProjectItem, ProjectsData } from '~/lib/projectsSchema'

const PROJECT_NUMBERS = [12, 13]

const GRAPHQL_QUERY = `
query($number: Int!, $cursor: String) {
  user(login: "YumNumm") {
    projectV2(number: $number) {
      items(first: 100, after: $cursor) {
        nodes {
          fieldValues(first: 8) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldIterationValue {
                title
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
          content {
            ... on Issue {
              title
              body
              url
              labels(first: 10) { nodes { name } }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
`

interface GraphQLFieldValue {
  name?: string
  title?: string
  text?: string
  field?: { name?: string }
}

interface GraphQLIssueContent {
  title: string
  body: string
  url: string
  labels: { nodes: Array<{ name: string }> }
}

interface GraphQLProjectItem {
  fieldValues: { nodes: GraphQLFieldValue[] }
  content: GraphQLIssueContent | null
}

interface GraphQLResponse {
  data: {
    user: {
      projectV2: {
        items: {
          nodes: GraphQLProjectItem[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      }
    }
  }
}

function extractField(
  fieldValues: GraphQLFieldValue[],
  fieldName: string,
): string | null {
  for (const fv of fieldValues) {
    if (fv.field?.name === fieldName) {
      return fv.name ?? fv.title ?? fv.text ?? null
    }
  }
  return null
}

function toProjectItem(node: GraphQLProjectItem): ProjectItem | null {
  if (!node.content?.labels) return null

  const labels = node.content.labels.nodes.map((l) => l.name)
  if (!labels.includes('public')) return null

  const priorityRaw = extractField(node.fieldValues.nodes, 'Priority')
  const priority =
    priorityRaw === 'P0' ||
    priorityRaw === 'P1' ||
    priorityRaw === 'P2' ||
    priorityRaw === 'P3'
      ? priorityRaw
      : null

  return {
    title: node.content.title,
    body: node.content.body ?? '',
    url: node.content.url,
    priority,
    milestone: extractField(node.fieldValues.nodes, 'Milestone'),
  }
}

async function fetchProjectItems(
  token: string,
  projectNumber: number,
): Promise<ProjectItem[]> {
  const items: ProjectItem[] = []
  let cursor: string | null = null

  do {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'eqmonitor-site',
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { number: projectNumber, cursor },
      }),
    })

    if (!res.ok) {
      throw new Error(`GitHub GraphQL API error: ${res.status} ${await res.text()}`)
    }

    const json = (await res.json()) as GraphQLResponse & {
      errors?: Array<{ message: string }>
    }
    if (json.errors?.length) {
      throw new Error(
        `GitHub GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`,
      )
    }
    const page = json.data.user.projectV2.items

    for (const node of page.nodes) {
      const item = toProjectItem(node)
      if (item) items.push(item)
    }

    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (cursor)

  return items
}

async function fetchAllProjectItems(token: string): Promise<ProjectItem[]> {
  const results = await Promise.all(
    PROJECT_NUMBERS.map((n) => fetchProjectItems(token, n)),
  )
  const seen = new Set<string>()
  const items: ProjectItem[] = []
  for (const list of results) {
    for (const item of list) {
      if (!seen.has(item.url)) {
        seen.add(item.url)
        items.push(item)
      }
    }
  }
  return items
}

export async function fetchAndStoreProjects(env: AppEnv): Promise<void> {
  const items = await fetchAllProjectItems(env.GITHUB_TOKEN)

  const data: ProjectsData = {
    items,
    updatedAt: new Date().toISOString(),
  }

  await env.PROJECTS_KV.put('projects:items', JSON.stringify(data))
}

export async function getProjectsData(
  kv: KVNamespace,
): Promise<ProjectsData | null> {
  const raw = await kv.get('projects:items')
  if (!raw) return null
  return JSON.parse(raw) as ProjectsData
}
