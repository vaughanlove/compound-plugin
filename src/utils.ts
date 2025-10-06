import type Compound from "main";
import { App, normalizePath, TFile } from "obsidian";

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

export async function getAndExtractGoals(plugin: Compound) {
    const goalPattern = /<goal>([\s\S]*?)<\/goal>/g;
    const goalsMarkdownContent = await plugin.app.vault.read(plugin.app.vault.getFileByPath(normalizePath(`compound/goals.md`))!);
    const goals: string[] = [];
    let match;

    while ((match = goalPattern.exec(goalsMarkdownContent)) !== null) {
        goals.push(`<goal>${match[1]}</goal>`);
    }

    console.log(goals)

    return goals.join('');
}