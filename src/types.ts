export interface Action {
    action: string
    goal_relations: GoalRelation[]
}

export interface ActionReflection extends Action {
    completed: string
    explanation: string 
}

export interface GoalRelation {
    goal_name: string
    relation_type?: string
    reasoning?: string
}

export interface Goal {
    name: string
    description: string
}