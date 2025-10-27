import { App, Editor, MarkdownView, normalizePath, Notice, Plugin, Setting, TFile } from "obsidian";
import { create_evening_text, GOAL_TEMPLATE, GOALS_INSTRUCTION_TEMPLATE, HOW_TO_TEMPLATE, MORNING_TEMPLATE } from "./templates";
import { DEFAULT_JOURNAL_GET_STARTED_PATH, DEFAULT_JOURNAL_GOALS_PATH, DEFAULT_JOURNAL_PATH } from "./constants";
import { extractJsonFromMarkdown, getAndExtractGoals, goalsToString, loadIntentsFromJson, loadIntentsJsonAsMarkdown, parseActionsAndRelateToIntentsFromMarkdown, parseIntentsFromJson, parseJsonFromMarkdown, revealFileInExplorer, saveActionsAsJson, saveGoalsAsJson, saveIntentsAsJson, updateAnalysisText } from "./utils";
import { createDailySummaryPrompt, createExtractIntentsPrompt, createReflectOnIntentsPrompt } from "./prompts";
import { createClient, query_llm } from "./llm";
import type Compound from "./main";
import { extractRegexPatternFromString } from "./regex";
import { ANALYSIS_SECTION_REGEX } from "./regex_patterns";
import { EveningReflectionOutputType, UpdateType } from "./types";

export const INSERT_GOAL_COMMAND = {
    id: 'Insert new goal',
    name: 'Insert New Goal',
    editorCallback: (editor: Editor, _view: MarkdownView) => {
        editor.replaceSelection(GOAL_TEMPLATE);
    }
}

export const reflectOnEvening = (plugin: Compound) => {
    return {
        id: 'compound-reflect',
        name: 'Reflect',
        editorCallback: async (editor: Editor, _view: MarkdownView) => {
            const client = await createClient(plugin.settings.ANTHROPIC_API_KEY);
            if (!client.ok) {
                new Notice(client.error)
                return
            }

            const content = editor.getValue();

            updateAnalysisText(editor, UpdateType.initialize);

            try {
                const eveningRegex = /\n### Evening Reflection\n([\s\S]*?)(?=\n## Analysis History|\z)/;
                const match = eveningRegex.exec(editor.getValue());
                let entryText = '';
                if (match) {
                    entryText = match[1]
                } else {
                    throw new Error("Could not extract text from evening reflection.")
                }

                const markdownIntents = await loadIntentsJsonAsMarkdown(plugin.app.vault, normalizePath(`${_view.file?.parent?.path}/daily_intents.json`));
                const llmResponse = await query_llm(client.value, createReflectOnIntentsPrompt(entryText, markdownIntents));

                if (!llmResponse.ok) {
                    new Notice(llmResponse.error);
                    return;
                }

                const structuredIntents = await loadIntentsFromJson(plugin.app.vault, normalizePath(`${_view.file?.parent?.path}/daily_intents.json`))
                const eveningReflectionText = parseJsonFromMarkdown<EveningReflectionOutputType>(llmResponse.value)

                if (!eveningReflectionText.ok){
                    new Notice(eveningReflectionText.error)
                    return;
                } 


                const structuredActions = parseActionsAndRelateToIntentsFromMarkdown(eveningReflectionText.value.actions, structuredIntents);

                updateAnalysisText(editor, UpdateType.success)

                // need to update the internal file (hidden from obsidian) in the folder.
                saveActionsAsJson(plugin.app.vault, structuredActions, normalizePath(`${_view.file?.parent?.path}/daily_actions.json`));

                // now want to generate the daily summary
                const structuredGoals = await getAndExtractGoals(plugin);
                const secondResponse = await query_llm(client.value, createDailySummaryPrompt(JSON.stringify(structuredActions), JSON.stringify(structuredGoals)));

                if (!secondResponse.ok) {
                    new Notice(secondResponse.error);
                    return;
                }
                
                await plugin.app.vault.create(normalizePath(`${_view.file?.parent?.path}/llm summary.md`), secondResponse.value);
            } catch (error) {
                console.log(error)
                updateAnalysisText(editor, UpdateType.failure)
            }
        }
    }
}


export const hardRefreshEveningNote = (plugin: Compound) => {
    return {
        id: 'compound-hard-refresh-evening',
        name: 'Hard refresh evening note',
        editorCallback: async (editor: Editor, _view: MarkdownView) => {
            const file = plugin.app.workspace.getActiveFile();


            let intentsMarkdown = ''
            try {
                console.log(normalizePath(`${file?.parent?.parent?.path}/daily_intents.json`));
                intentsMarkdown = await loadIntentsJsonAsMarkdown(plugin.app.vault, normalizePath(`${file?.parent?.path}/daily_intents.json`))

            } catch {
                intentsMarkdown = '\n\nNo actions found. Have you analyzed your morning entry?';
            }
            if (file instanceof TFile) {
                // Replace the entire content
                await plugin.app.vault.modify(file, create_evening_text(intentsMarkdown));
            }
        }
    }
}

export const finishMorningEntryCommand = (plugin: Compound) => {
    return {
        id: 'compound-done-note',
        name: 'Done compound note',
        editorCallback: async (editor: Editor, _view: MarkdownView) => {
            const client = await createClient(plugin.settings.ANTHROPIC_API_KEY);
            if (!client.ok) {
                new Notice(client.error)
                return;
            }

            updateAnalysisText(editor, UpdateType.initialize)

            try {
                const entryText = _view.data.slice(93);
                const goalsObject = await getAndExtractGoals(plugin);
                const llmResponse = await query_llm(client.value, createExtractIntentsPrompt(entryText, goalsToString(goalsObject)))

                if (!llmResponse.ok) {
                    new Notice(llmResponse.error)
                    return;
                }

                const actionJsonString = extractJsonFromMarkdown(llmResponse.value);
                const structuredActions = parseIntentsFromJson(actionJsonString);

                updateAnalysisText(editor, UpdateType.success)
                
                // need to update the internal file (hidden from obsidian) in the folder.
                saveIntentsAsJson(plugin.app.vault, structuredActions, normalizePath(`${_view.file?.parent?.path}/daily_intents.json`));

                // Move cursor to end
                editor.setCursor(editor.lastLine(), editor.getLine(editor.lastLine()).length);

            } catch (error) {
                updateAnalysisText(editor, UpdateType.failure)
            }

        }
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

            let actionsMarkdown = ''
            try {
                actionsMarkdown = await loadIntentsJsonAsMarkdown(this.app.vault, normalizePath(`${todaysPath}/daily_intents.json`))

            } catch {
                actionsMarkdown = 'No actions found. Have you analyzed your morning entry?';
            }

            const file = await app.vault.create(todaysEveningEntryPath, create_evening_text(actionsMarkdown));

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