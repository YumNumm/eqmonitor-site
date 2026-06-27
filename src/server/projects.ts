import type {
	MilestoneInfo,
	ProjectItem,
	ProjectsData,
} from "~/lib/projectsSchema";
import type { AppEnv } from "./env";

const PROJECT_IDS = [
	"PVT_kwHOBF_bC84BXd5F", // #12 EQMonitor
	"PVT_kwHOBF_bC84BX0S3", // #13 EQMonitor Internal
];

const REPOS = [
	{ owner: "YumNumm", name: "EQMonitor" },
	{ owner: "YumNumm", name: "eqmonitor-backend" },
];

const GRAPHQL_QUERY = `
query($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
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
              number
              milestone { title }
              labels(first: 10) { nodes { name } }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
`;

const MILESTONES_QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    milestones(first: 50, states: OPEN) {
      nodes {
        title
        dueOn
        openIssues: issues(states: OPEN) { totalCount }
        closedIssues: issues(states: CLOSED) { totalCount }
      }
    }
  }
}
`;

interface GraphQLFieldValue {
	name?: string;
	title?: string;
	text?: string;
	field?: { name?: string };
}

interface GraphQLIssueContent {
	title: string;
	body: string;
	url: string;
	number: number;
	milestone: { title: string } | null;
	labels: { nodes: Array<{ name: string }> };
}

interface GraphQLProjectItem {
	fieldValues: { nodes: GraphQLFieldValue[] };
	content: GraphQLIssueContent | null;
}

interface GraphQLProjectResponse {
	data: {
		node: {
			items: {
				nodes: GraphQLProjectItem[];
				pageInfo: { hasNextPage: boolean; endCursor: string | null };
			};
		};
	};
}

interface GraphQLMilestonesResponse {
	data: {
		repository: {
			milestones: {
				nodes: Array<{
					title: string;
					dueOn: string | null;
					openIssues: { totalCount: number };
					closedIssues: { totalCount: number };
				}>;
			};
		};
	};
}

function extractField(
	fieldValues: GraphQLFieldValue[],
	fieldName: string,
): string | null {
	for (const fv of fieldValues) {
		if (fv.field?.name === fieldName) {
			return fv.name ?? fv.title ?? fv.text ?? null;
		}
	}
	return null;
}

function toProjectItem(node: GraphQLProjectItem): ProjectItem | null {
	if (!node.content?.labels) return null;

	const labels = node.content.labels.nodes.map((l) => l.name);
	if (!labels.includes("public")) return null;

	const priorityRaw = extractField(node.fieldValues.nodes, "Priority");
	const priority =
		priorityRaw === "P0" ||
		priorityRaw === "P1" ||
		priorityRaw === "P2" ||
		priorityRaw === "P3"
			? priorityRaw
			: null;

	const status = extractField(node.fieldValues.nodes, "Status");

	return {
		title: node.content.title,
		body: node.content.body ?? "",
		url: node.content.url,
		number: node.content.number,
		priority,
		status,
		milestone: node.content.milestone?.title ?? null,
	};
}

async function graphqlRequest<T>(
	token: string,
	query: string,
	variables: Record<string, unknown>,
): Promise<T> {
	const res = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "eqmonitor-site",
		},
		body: JSON.stringify({ query, variables }),
	});

	if (!res.ok) {
		throw new Error(
			`GitHub GraphQL API error: ${res.status} ${await res.text()}`,
		);
	}

	const json = (await res.json()) as T & {
		errors?: Array<{ message: string }>;
	};
	if (json.errors?.length) {
		throw new Error(
			`GitHub GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`,
		);
	}
	return json;
}

async function fetchProjectItems(
	token: string,
	projectId: string,
): Promise<ProjectItem[]> {
	const items: ProjectItem[] = [];
	let cursor: string | null = null;

	do {
		const json = await graphqlRequest<GraphQLProjectResponse>(
			token,
			GRAPHQL_QUERY,
			{ projectId, cursor },
		);
		const page = json.data.node.items;

		for (const node of page.nodes) {
			const item = toProjectItem(node);
			if (item) items.push(item);
		}

		cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
	} while (cursor);

	return items;
}

async function fetchAllProjectItems(token: string): Promise<ProjectItem[]> {
	const results = await Promise.all(
		PROJECT_IDS.map((id) => fetchProjectItems(token, id)),
	);
	const seen = new Set<string>();
	const items: ProjectItem[] = [];
	for (const list of results) {
		for (const item of list) {
			if (!seen.has(item.url)) {
				seen.add(item.url);
				items.push(item);
			}
		}
	}
	return items;
}

async function fetchMilestones(token: string): Promise<MilestoneInfo[]> {
	const results = await Promise.all(
		REPOS.map((repo) =>
			graphqlRequest<GraphQLMilestonesResponse>(token, MILESTONES_QUERY, repo),
		),
	);

	const merged = new Map<string, MilestoneInfo>();
	for (const result of results) {
		for (const ms of result.data.repository.milestones.nodes) {
			const existing = merged.get(ms.title);
			if (existing) {
				existing.openIssues += ms.openIssues.totalCount;
				existing.closedIssues += ms.closedIssues.totalCount;
				if (!existing.dueOn && ms.dueOn) existing.dueOn = ms.dueOn;
			} else {
				merged.set(ms.title, {
					title: ms.title,
					dueOn: ms.dueOn,
					openIssues: ms.openIssues.totalCount,
					closedIssues: ms.closedIssues.totalCount,
				});
			}
		}
	}

	return Array.from(merged.values());
}

export async function fetchAndStoreProjects(env: AppEnv): Promise<void> {
	const [items, milestones] = await Promise.all([
		fetchAllProjectItems(env.GITHUB_TOKEN),
		fetchMilestones(env.GITHUB_TOKEN),
	]);

	const data: ProjectsData = {
		items,
		milestones,
		updatedAt: new Date().toISOString(),
	};

	await env.PROJECTS_KV.put("projects:items", JSON.stringify(data));
}

export async function getProjectsData(
	kv: KVNamespace,
): Promise<ProjectsData | null> {
	const raw = await kv.get("projects:items");
	if (!raw) return null;
	return JSON.parse(raw) as ProjectsData;
}
