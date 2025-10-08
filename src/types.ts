export type Action = {
    action: string
    goal_relations: GoalRelation[]
}

export type GoalRelation = {
    goal_name: string
    relation_type?: string
    reasoning?: string
}

export type Goal = {
    name: string
    description: string
}