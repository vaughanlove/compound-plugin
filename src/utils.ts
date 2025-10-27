import type Compound from "./main";
import { App, Editor, normalizePath, TFile, Vault } from "obsidian";
import { Intent, Goal, Action, UpdateType } from "./types";
import { Result } from "./error";

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

export const loadActionsFromJson = async (
    vault: Vault,
    filepath: string
): Promise<Action[]> => {
    const file = vault.getAbstractFileByPath(filepath);
    if (!file) return [];

    const content = await vault.read(file as any);
    return JSON.parse(content) as Action[];
};

export const parseIntentsFromJson = (jsonString: string): Intent[] => {
    const intentsWithoutIds = JSON.parse(jsonString) as Omit<Intent, 'id'>[];
    return intentsWithoutIds.map((intent, index) => ({
        id: index + 1, // note that LLMs much prefer to start at id =1, very clear quirk with claude. Don't want to waste instructions input on making explicit to zero.
        ...intent
    }));
};
export const saveIntentsAsJson = async (
    vault: Vault,
    actions: Intent[],
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


/**
 * Assumes that a text block has one json entry and returns the text inside that block.
 * 
 * Useful for downstream extraction using tryParseJsonFromText
 */
export const extractJsonFromMarkdown = (text: string): string => {
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        return jsonBlockMatch[1].trim();
    }
    // If no code block, return as-is (might be plain JSON)
    return text.trim();
};

export const loadIntentsFromJson = async (
    vault: Vault,
    filepath: string
): Promise<Intent[]> => {
    const file = vault.getAbstractFileByPath(filepath);

    if (file instanceof TFile) {
        const content = await vault.read(file);
        return parseIntentsFromJson(content);
    } else {
        throw new Error(`File not found: ${filepath}`);
    }
};

export const loadIntentsJsonAsMarkdown = async (
    vault: Vault,
    filepath: string
): Promise<string> => {
    const file = vault.getAbstractFileByPath(filepath);

    if (file instanceof TFile) {
        const content = await vault.read(file);
        return convertActionArrayToMarkdown(parseIntentsFromJson(content));
    } else {
        throw new Error(`File not found: ${filepath}`);
    }
}

function convertActionArrayToMarkdown(actions: Intent[]): string {
    if (actions.length === 0) {
        return "\n\nNo actions available. Perhaps you need to analyze your morning reflection?";
    }

    let markdown = "\n\n";

    actions.forEach((action, index) => {
        markdown += `${index + 1}. ${action.action}\n`;
    });

    return markdown;
}

export const parseActionsAndRelateToIntentsFromMarkdown = (actions: Action[], intents: Intent[]): Action[] => {
    return actions.map(action => {
        const intent = intents.find(i => i.id === action.id);
        if (!intent) {
            throw new Error(`No intent found with id ${action.id}`);
        }
        return {
            ...intent,
            completed: action.completed,
            explanation: action.explanation
        };
    });
};


export function tryParseJsonFromText<T>(text: string): Result<T, string> {
    try {
        return { ok: true, value: JSON.parse(text) as T };
    } catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e.message : "Unknown parse error"
        }
    }
}

export function parseJsonFromMarkdown<T>(text: string): Result<T, string> {
    const extracted = extractJsonFromMarkdown(text);
    return tryParseJsonFromText<T>(extracted);
}

export function updateAnalysisText(editor: Editor, type: UpdateType): void {
    const content = editor.getValue();
    const analysisRegex = /\n## Analysis History\n([\s\S]*?)(?=\n##|\n---|\z)/;
    const hasAnalysis = analysisRegex.test(content);
    if (type == UpdateType.initialize) {
        // Check if there's already an analysis section
        let analysisStartPos;

        if (hasAnalysis) {
            // Find where the Analysis History section is
            const match = content.match(analysisRegex);
            const matchIndex = content.indexOf(match![0]); // nullish coalesing not great

            analysisStartPos = {
                line: editor.lastLine(),
                ch: editor.getLine(editor.lastLine()).length
            };

            // Add re-analysis indicator
            const timestamp = new Date().toLocaleString();
            editor.replaceRange(`\n\n🔄 Re-analyzing at ${timestamp}...`, analysisStartPos);
        } else {
            // First analysis - create the section
            const lastLine = editor.lastLine();
            analysisStartPos = {
                line: lastLine,
                ch: editor.getLine(lastLine).length
            };

            const timestamp = new Date().toLocaleString();
            editor.replaceRange(`\n\n## Analysis History\n\n🔍 Analyzing at ${timestamp}...`, analysisStartPos);
        }
    }
    else if (type == UpdateType.success) {
        // Replace the "analyzing..." line with success
        const currentContent = editor.getValue();
        const analyzingPattern = hasAnalysis
            ? /🔄 Re-analyzing at .*?\.\.\./g
            : /🔍 Analyzing at .*?\.\.\./g;

        const timestamp = new Date().toLocaleString();
        const successLine = hasAnalysis
            ? `🔄 Re-analyzed at ${timestamp} ✅`
            : `🔍 Analyzed at ${timestamp} ✅`;

        const updatedContent = currentContent.replace(analyzingPattern, successLine);
        editor.setValue(updatedContent);
    }

    else if (type == UpdateType.failure) {
        const currentContent = editor.getValue();
        const analyzingPattern = hasAnalysis
            ? /🔄 Re-analyzing at .*?\.\.\./g
            : /🔍 Analyzing at .*?\.\.\./g;

        const timestamp = new Date().toLocaleString();
        const errorLine = hasAnalysis
            ? `🔄 Re-analysis failed at ${timestamp} ❌`
            : `🔍 Analysis failed at ${timestamp} ❌`;

        const updatedContent = currentContent.replace(analyzingPattern, errorLine);
        editor.setValue(updatedContent);
    }

    editor.setCursor(editor.lastLine(), editor.getLine(editor.lastLine()).length);

}