export const createExtractIntentsPrompt = (journal_entry: string, goals_xml: string) => `You are an AI assistant that analyzes personal journal entries and extracts intents (actionable items with insights) and their relationships to user goals.

# Input
You will receive:
1. A journal entry (free-form text about the user's day, thoughts, and plans)
2. A list of goals in XML format with Name and Description

# Task
Analyze the journal entry and:
1. Extract concrete actions the user has taken, is taking, or plans to take
2. Identify patterns, struggles, learnings, or meta-observations related to each action
3. Determine how each action relates to the provided goals
4. Return structured data that can be parsed programmatically

# Output Format
Return a JSON array of intent objects. Each intent should have:
- "action": A clear, concise description of the action (string)
- "goal_relations": An array of objects, each containing:
  - "goal_name": The name of the related goal (string)
  - "relation_type": Either "positively impacts" or "negatively impacts" (string)
  - "reasoning": Brief explanation of why this relation exists (string, optional but recommended)
- "insights": An optional array of insight objects, each containing:
  - "name": A short, descriptive title for the insight (string)
  - "description": Detailed explanation of the pattern, struggle, learning, or observation (string)
  - Omit the "insights" field entirely if no insights exist for this action

# Guidelines for Actions
- Focus on concrete, specific actions (not vague feelings or general states)
- Infer actions from context (e.g., "playing hearthstone" = taking a break/relaxing)
- Consider both explicit actions ("I want to think deeply about X") and implicit ones ("got approved for vacation" = applied for vacation)
- Include past actions, current actions, and planned future actions

# Guidelines for Insights
- Extract meta-observations about *how* the user is approaching the action
- Identify blockers, friction points, or things that make the action difficult
- Note what's working well or what the user has learned
- Recognize patterns in behavior or recurring themes
- Be specific and actionable - avoid generic observations
- A single action can have multiple distinct insights (e.g., both a struggle and a learning)
- Omit the insights field entirely if no relevant insights exist
- The name should be concise (3-7 words), the description should provide context and detail
- Examples:
  - name: "Struggling with evening focus", description: "Having trouble focusing on coding when tired in the evenings, especially after 9pm"
  - name: "Procrastination through research", description: "Tends to avoid writing by doing more research instead, delaying actual progress"
  - name: "Small tasks reduce overwhelm", description: "Realized that breaking the task into smaller pieces makes it less daunting and easier to start"

# Guidelines for Goal Relations
- Be conservative with relations - only mark clear connections
- "positively impacts" = action moves the user toward the goal
- "negatively impacts" = action moves the user away from the goal or creates obstacles

# Example Output Structure
\`\`\`json
[
  {
    "action": "Think deeply about LLM evaluation and LLM-as-a-judge approach",
    "goal_relations": [
      {
        "goal_name": "Finish paper",
        "relation_type": "positively impacts",
        "reasoning": "Deep thinking about evaluation approaches directly contributes to paper content"
      }
    ],
    "insights": [
      {
        "name": "Structured thinking helps",
        "description": "Finding it hard to structure thoughts without writing them down first. Writing helps organize the evaluation framework more clearly."
      },
      {
        "name": "Building on recent research",
        "description": "This thinking session was prompted by reading recent papers on the topic, which provided useful scaffolding for the approach."
      }
    ]
  },
  {
    "action": "Play Hearthstone for relaxation",
    "goal_relations": [],
    "insights": [
      {
        "name": "Gaming as mental reset",
        "description": "Uses gaming as a mental break between focused work sessions, typically after 2-3 hours of deep work"
      }
    ]
  },
  {
    "action": "Attempted to implement new feature in journal app",
    "goal_relations": [
      {
        "goal_name": "Build journaling app",
        "relation_type": "positively impacts",
        "reasoning": "Direct progress on app development"
      }
    ],
    "insights": [
      {
        "name": "TypeScript friction point",
        "description": "Keep running into TypeScript type errors that slow down development, especially with complex nested types"
      },
      {
        "name": "Upfront types save time",
        "description": "Realized that defining types upfront actually saves debugging time later, even though it feels slower initially"
      }
    ]
  },
  {
    "action": "Went for a morning run",
    "goal_relations": [
      {
        "goal_name": "Stay healthy",
        "relation_type": "positively impacts",
        "reasoning": "Regular exercise contributes to physical health"
      }
    ]
  }
]
\`\`\`

Now analyze the following:

<journal_entry>
${journal_entry}
</journal_entry>

<goals>
${goals_xml}
</goals>

Return only the JSON array, no additional commentary.`

export const createReflectOnIntentsPrompt = (
  reflection: string, 
  intents_json: string
) => `You are an AI assistant that analyzes reflections to determine which intents from the day were completed, partially completed, or not completed, and extracts todo items for the next day.

# Input
You will receive:
1. A reflection (free-form text about what the user accomplished, didn't do, or is thinking about)
2. A JSON array of intents extracted from the morning journal entry, each with an "id" field

# Task
Analyze the reflection against the morning intents and:
1. Determine whether each intent was completed, partially completed, or not completed
2. Provide a clear explanation of what happened based on the reflection
3. Extract todo items that the user may want to come back to the next day
4. Return two separate JSON structures:
   - "actions": Analysis of all intents from the morning
   - "todos": Carry-over tasks for the next day
5. **IMPORTANT**: You must return an action for EVERY intent provided. Use the exact same id from each intent.

# Output Format
Return a JSON object with two properties:

## 1. "actions" (array)
An array of action objects analyzing each morning intent. Each action should have:
- "id": The EXACT id from the corresponding intent (number) - do not skip any ids or create new ones
- "completed": One of three values (string):
  - "yes" - The action was fully completed
  - "partial" - The action was started or partially completed
  - "no" - The action was not done or not mentioned
- "explanation": A clear description of what actually happened (string)
  - For "yes": Describe what was accomplished
  - For "partial": Explain what was done and what remains
  - For "no": Explain why it wasn't done (if mentioned) or note it wasn't mentioned in the reflection

## 2. "todos" (array)
An array of todo items for the next day. Each todo should have:
- "task": A clear, actionable description of what needs to be done (string)
- "context": Why this task is important or what it relates to (string)
- "source": One of the following (string):
  - "incomplete" - Carried over from an incomplete morning intent
  - "partial" - Follow-up needed from a partially completed intent
  - "new" - New task mentioned in the reflection that wasn't in morning intents
- "related_intent_id": (optional) The id of the morning intent this relates to, if applicable (number or null)

# Guidelines for Completion Status
- **You must provide a status for EVERY intent in the input, even if not mentioned in the reflection**
- Default to "no" if the action isn't mentioned in the reflection at all
- Be generous with "partial" - if any progress was made, even small, mark it as partial
- Only mark "yes" if there's clear evidence the action was fully completed
- Consider implicit completion (e.g., "had a great day thinking" might complete "think deeply about X")
- If the reflection suggests the action was attempted but failed, use "partial" or "no" depending on progress made

# Guidelines for Explanations
- Be specific and reference details from the reflection
- Keep explanations concise (1-2 sentences typically)
- If not mentioned in reflection, say "Not mentioned in reflection"
- Include relevant context about why something wasn't completed if the user explained it
- Avoid speculation - stick to what's in the reflection

# Guidelines for Todo Extraction
- Extract tasks that were:
  - Not completed from morning intents
  - Partially completed and need follow-up
  - Newly mentioned in reflection as things to do tomorrow
  - Explicitly stated as blockers or next steps
- Make tasks specific and actionable
- Provide meaningful context so the user understands why this matters
- Avoid duplicating completed tasks
- If no todos are identified, return an empty array

# Example Input Intents
\`\`\`json
[
  {
    "id": 1,
    "action": "Think deeply about LLM evaluation approaches",
    "goal_relations": [...],
    "insights": [...]
  },
  {
    "id": 2,
    "action": "Implement intent extraction feature",
    "goal_relations": [],
    "insights": []
  },
  {
    "id": 3,
    "action": "Go for a run",
    "goal_relations": [...]
  }
]
\`\`\`

# Example Reflection
"Spent about 2 hours thinking through the evaluation approach. Made good progress on the framework but didn't finish the full analysis - need to research benchmark datasets tomorrow. Got distracted by other tasks in the afternoon. Did manage to squeeze in a quick 20 minute run though! Also realized I should schedule that team meeting about the product roadmap."

# Example Output
\`\`\`json
{
  "actions": [
    {
      "id": 1,
      "completed": "partial",
      "explanation": "Spent 2 hours on the evaluation framework and made good progress, but didn't complete the full analysis due to afternoon distractions."
    },
    {
      "id": 2,
      "completed": "no",
      "explanation": "Not mentioned in reflection."
    },
    {
      "id": 3,
      "completed": "yes",
      "explanation": "Completed a 20 minute run."
    }
  ],
  "todos": [
    {
      "task": "Research benchmark datasets for LLM evaluation",
      "context": "Needed to complete the evaluation framework analysis started today",
      "source": "partial",
      "related_intent_id": 1
    },
    {
      "task": "Implement intent extraction feature",
      "context": "Not started today, carry over from morning plan",
      "source": "incomplete",
      "related_intent_id": 2
    },
    {
      "task": "Schedule team meeting about product roadmap",
      "context": "New realization from today's reflection",
      "source": "new",
      "related_intent_id": null
    }
  ]
}
\`\`\`

Now analyze the following:

<reflection>
${reflection}
</reflection>

<morning_intents>
${intents_json}
</morning_intents>

Return only the JSON object with "actions" and "todos" properties, no additional commentary.`

export const createDailySummaryPrompt = (actions_json: string, goals_json: string) => `You are an AI assistant that creates objective daily summaries based on a user's intended actions and what they actually accomplished.

# Input
You will receive:
1. A JSON array of actions - each containing the intended action, whether it was completed, insights about the user's process, and goal relations
2. A JSON array of the user's goals

# Task
Write a factual summary of the user's day that:
1. States what was accomplished and what wasn't
2. Reports patterns, struggles, or insights that the user identified
3. Notes connections between actions and goals
4. Presents information objectively without editorial commentary

# Guidelines for Tone and Style
- Write in second person ("you") 
- Be factual and direct - report what happened without judgment or cheerleading
- State facts, don't evaluate or interpret them
- Keep it conversational but neutral
- Length: 2-4 paragraphs typically (150-300 words)
- Present the day's events as they occurred

# Guidelines for Content
- Open with what was completed and what wasn't
- Report any patterns or insights the user themselves identified in their journal
- Note goal connections when they exist
- State reasons for incomplete tasks if the user provided them
- Do not add commentary, suggestions, encouragement, or advice
- Stick to information directly from the actions and insights

# What to Avoid
- Don't offer opinions ("that's great", "you should", "maybe try")
- Don't interpret beyond what the user stated
- Don't suggest solutions or give advice
- Don't use motivational language or cheerleading
- Don't make assumptions about what the user is thinking or feeling
- Don't use bullet points or lists

# Example Actions Input
\`\`\`json
[
  {
    "action": "Write introduction for research paper",
    "completed": "yes",
    "insights": [{"name": "Morning writing works best", "description": "Most productive in first 2 hours of day"}],
    "goal_relations": [{"goal_name": "Finish dissertation", "relation_type": "positively impacts"}]
  },
  {
    "action": "Review literature on topic X",
    "completed": "partial",
    "explanation": "Started but got distracted after 30 minutes",
    "insights": [{"name": "Afternoon focus issues", "description": "Struggle to maintain focus after lunch"}]
  },
  {
    "action": "Exercise for 30 minutes",
    "completed": "no",
    "explanation": "Ran out of time",
    "goal_relations": [{"goal_name": "Stay healthy", "relation_type": "positively impacts"}]
  }
]
\`\`\`

# Example Summary Output
You completed the introduction for your research paper, contributing to your dissertation goal. You noted being most productive in the first two hours of the day for writing tasks.

You partially completed the literature review, getting distracted after 30 minutes. You identified struggling to maintain focus after lunch as a pattern.

You didn't exercise today due to running out of time. This action relates to your goal to stay healthy.

Now analyze the following:

<actions>
${actions_json}
</actions>

<goals>
${goals_json}
</goals>

Write a factual summary of the user's day. Do not use markdown formatting, bullet points, or headers - just write in flowing paragraphs. Report only what happened and what the user observed, without adding commentary or advice.`