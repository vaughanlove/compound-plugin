export const create_evening_text = (actions_markdown: string) => `Good evening. Write and reflect on your day. Here is a summary of the actions I deduced from your morning: ${actions_markdown}`
export const MORNING_TEMPLATE = `Good morning. Write below about your plan for the day. Remember your goals.`
export const HOW_TO_TEMPLATE = `Hello!

This is a brief introduction to using the Compound plugin for daily note taking. It is designed to be a very lightweight extension of obsidian for goal-oriented journaling. However deep you want to take it is up to you, from project to life planning. 

The idea really stemmed from the fact that when I think about what I did a week ago, I really only have a general idea, no specifics. So this internally generated knowledge graph will hopefully allow insights into trends in your life that you may not have been aware of, for better or worse.

Enjoy!`
export const GOALS_INSTRUCTION_TEMPLATE = `This is where you can define your goals. The reality of goals are that they are rarely static, and change inductively as new information and opportunity comes available. For the time being they should be statically defined, this is a future work

#### instructions
Hold Ctrl-P and use the command "Insert new goal" to begin. This populates a empty template you can modify. 
`
export const GOAL_TEMPLATE = `<goal>Name: <br> \nDescription: <br> \n</goal>` 