import type Compound from "./main";
import { App, normalizePath, TFile, Vault } from "obsidian";
import { Action, Goal } from "./types";

export function extract_goals_from_text(text: string) {
    // regex out goals in goals.ts
    // thought for the future: when goals are inductively created, I think I'll version control the goals by having some hidden id, and then everytime a new 
    // ai generation is prompted, the internal goal representation will update the goals.

    // capture any content between `<goal>` and `</goal>`
    const goalRegex = /<goal>(.*?)<\/goal>/g;
    const result = goalRegex.exec(text)
    console.log(result)
}


export function revealFileInExplorer(app: App, file: TFile) {
    app.workspace.trigger('file-explorer-refresh');

    const fileExplorers = app.workspace.getLeavesOfType('file-explorer');
    if (fileExplorers.length > 0) {
        const fileExplorer = fileExplorers[0].view as any;
        if (fileExplorer.revealInFolder) {
            fileExplorer.revealInFolder(file);
        }
    }
}

const parseGoalFromString = (input: string): Goal | undefined => {
    const nameMatch = input.match(/Name:\s*(.+?)(?:<br>|$)/i);
    const descriptionMatch = input.match(/Description:\s*(.+?)(?:<br>|$)/i);

    if (nameMatch && descriptionMatch) {
        return {
            name: nameMatch[1].trim(),
            description: descriptionMatch[1].trim()
        };
    }

    return undefined;
};

export async function getAndExtractGoals(plugin: Compound): Promise<Goal[]> {
    const goalPattern = /<goal>([\s\S]*?)<\/goal>/g;
    const goalsMarkdownContent = await plugin.app.vault.read(plugin.app.vault.getFileByPath(normalizePath(`compound/goals.md`))!);
    const goals: Goal[] = [];
    let match;

    while ((match = goalPattern.exec(goalsMarkdownContent)) !== null && match[1] !== null) {
        const goalObject = parseGoalFromString(match[1]);
        if (goalObject !== undefined) {
            goals.push(goalObject);
        }
    }
    return goals;
}

export const goalsToString = (goals: Goal[]): string =>
    goals
        .map(goal => `${goal.name}: ${goal.description}`)
        .join('\n');

export const saveGoalsAsJson = async (
    vault: Vault,
    goals: Goal[],
    filepath: string
): Promise<void> => {
    const content = JSON.stringify(goals, null, 2);
    await vault.create(filepath, content);
};

export const loadGoalsFromJson = async (
    vault: Vault,
    filepath: string
): Promise<Goal[]> => {
    const file = vault.getAbstractFileByPath(filepath);
    if (!file) return [];

    const content = await vault.read(file as any);
    return JSON.parse(content) as Goal[];
};

export const parseActionsFromJson = (jsonString: string): Action[] => {
    return JSON.parse(jsonString) as Action[];
};

export const saveActionsAsJson = async (
    vault: Vault,
    actions: Action[],
    filepath: string
): Promise<void> => {
    const content = JSON.stringify(actions, null, 2);
    const file = vault.getAbstractFileByPath(filepath);
    
    if (file instanceof TFile) {
        await vault.modify(file, content);
    } else {
        await vault.create(filepath, content);
    }
};

export const extractJsonFromMarkdown = (text: string): string => {
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        return jsonBlockMatch[1].trim();
    }
    // If no code block, return as-is (might be plain JSON)
    return text.trim();
};

export const loadActionsFromJson = async (
    vault: Vault,
    filepath: string
): Promise<Action[]> => {
    const file = vault.getAbstractFileByPath(filepath);
    
    if (file instanceof TFile) {
        const content = await vault.read(file);
        return parseActionsFromJson(content);
    } else {
        throw new Error(`File not found: ${filepath}`);
    }
};