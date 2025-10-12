export interface Intent {
    id: number // internal representation
    action: string
    goal_relations: GoalRelation[]
    insights?: Insight[]
}

// Intent is the promise of an action, Action is the actual completed or failed to complete work. Perhaps Action is not the right word.
export interface Action extends Intent {
    // Did the intent get completed?
    completed: string
    // Description of if the Action was completed or not
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

export interface Insight {
    id: number // likely not used for anything but may be useful in the future.
    name: string
    description: string 
}