import * as v from 'valibot'

export const ProjectItemSchema = v.object({
  title: v.string(),
  body: v.string(),
  url: v.pipe(v.string(), v.url()),
  priority: v.nullable(v.picklist(['P0', 'P1', 'P2', 'P3'])),
  milestone: v.nullable(v.string()),
})

export const MilestoneInfoSchema = v.object({
  title: v.string(),
  dueOn: v.nullable(v.string()),
  openIssues: v.number(),
  closedIssues: v.number(),
})

export const ProjectsDataSchema = v.object({
  items: v.array(ProjectItemSchema),
  milestones: v.array(MilestoneInfoSchema),
  updatedAt: v.string(),
})

export type ProjectItem = v.InferOutput<typeof ProjectItemSchema>
export type MilestoneInfo = v.InferOutput<typeof MilestoneInfoSchema>
export type ProjectsData = v.InferOutput<typeof ProjectsDataSchema>
