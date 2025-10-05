import { App, Editor, MarkdownView, normalizePath, TFile } from "obsidian";
import { EVENING_TEMPLATE, GOAL_TEMPLATE, GOALS_INSTRUCTION_TEMPLATE, HOW_TO_TEMPLATE, MORNING_TEMPLATE } from "./templates";
import { DEFAULT_JOURNAL_GET_STARTED_PATH, DEFAULT_JOURNAL_GOALS_PATH, DEFAULT_JOURNAL_PATH } from "./constants";
import { revealFileInExplorer } from "./utils";

export const INSERT_GOAL_COMMAND = {
    id: 'Insert new goal',
    name: 'Insert New Goal',
    editorCallback: (editor: Editor, _view: MarkdownView) => {
        editor.replaceSelection(GOAL_TEMPLATE);
    }
}

export const FINISH_MORNING_ENTRY_COMMAND = {
    id: 'compound-done-note',
    name: 'Done compound note',
    editorCallback: (editor: Editor, _view: MarkdownView) => {
        console.log(editor.getSelection());
        editor.replaceSelection('Compound note done👌');
    }
}

export function create_evening_reflection_callback(app: App) {
    return async (_evt: MouseEvent) => {
                const now = window.moment();
                const todaysDate = now.format('YYYY.MM.DD');
                const todaysPath = normalizePath(`${DEFAULT_JOURNAL_PATH}/${todaysDate}`)
                const todaysEveningEntryPath = normalizePath(`${todaysPath}/evening.md`)
    
                const todaysFolder = app.vault.getAbstractFileByPath(todaysPath)
                let file = app.vault.getAbstractFileByPath(todaysEveningEntryPath);
    
                if (file) {
                    if (file instanceof TFile) {
                        await app.workspace.getLeaf().openFile(file);
                        revealFileInExplorer(app, file);
                    }
                }
                else {
                    if (!todaysFolder) {
                        const folder = await app.vault.createFolder(todaysPath);
                    }
                    const file = await app.vault.create(todaysEveningEntryPath, EVENING_TEMPLATE);
    
                    if (file instanceof TFile) {
                        await app.workspace.getLeaf().openFile(file);
                        revealFileInExplorer(app, file);
                    }
                }
            }
}

export function create_morning_reflection_callback(app: App) {
    return async (_evt: MouseEvent) => {
                const now = window.moment();
                const todaysDate = now.format('YYYY.MM.DD');
                const todaysPath = normalizePath(`${DEFAULT_JOURNAL_PATH}/${todaysDate}`)
                const todaysMorningEntryPath = normalizePath(`${todaysPath}/morning.md`)
    
                let file = app.vault.getAbstractFileByPath(todaysMorningEntryPath);
                const todaysFolder = app.vault.getAbstractFileByPath(todaysPath)
    
                if (file) {
                    if (file instanceof TFile) {
                        await app.workspace.getLeaf().openFile(file);
                        revealFileInExplorer(app, file);
                    }
                }
                else {
                    if (!todaysFolder) {
                        const folder = await app.vault.createFolder(todaysPath);
                    } const file = await app.vault.create(todaysMorningEntryPath, MORNING_TEMPLATE);
    
                    if (file instanceof TFile) {
                        await app.workspace.getLeaf().openFile(file);
                        revealFileInExplorer(app, file);
                    }
                }
    
    
            }
}

export async function initializeCompound(app: App) {
		const hasInitializedVault = await app.vault.getAbstractFileByPath(DEFAULT_JOURNAL_PATH);
		if (!hasInitializedVault) {
			await app.vault.createFolder(DEFAULT_JOURNAL_PATH);
			const file = await app.vault.create(DEFAULT_JOURNAL_GET_STARTED_PATH, HOW_TO_TEMPLATE);
			const goal_file = await app.vault.create(DEFAULT_JOURNAL_GOALS_PATH, GOALS_INSTRUCTION_TEMPLATE);
			app.workspace.trigger('file-explorer-refresh');
		}
	}