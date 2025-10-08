import { App, Editor, MarkdownView, normalizePath, Notice, Plugin, Setting, TFile } from "obsidian";
import { EVENING_TEMPLATE, GOAL_TEMPLATE, GOALS_INSTRUCTION_TEMPLATE, HOW_TO_TEMPLATE, MORNING_TEMPLATE } from "./templates";
import { DEFAULT_JOURNAL_GET_STARTED_PATH, DEFAULT_JOURNAL_GOALS_PATH, DEFAULT_JOURNAL_PATH } from "./constants";
import { getAndExtractGoals, goalsToString, revealFileInExplorer, saveGoalsAsJson } from "./utils";
import { createExtractActionsPrompt } from "./prompts";
import { createClient } from "./llm";
import type Compound from "main";

export const INSERT_GOAL_COMMAND = {
    id: 'Insert new goal',
    name: 'Insert New Goal',
    editorCallback: (editor: Editor, _view: MarkdownView) => {
        editor.replaceSelection(GOAL_TEMPLATE);
    }
}

export const finishMorningEntryCommand = (plugin: Compound) => {
    return {
        id: 'compound-done-note',
        name: 'Done compound note',
        editorCallback: async (editor: Editor, _view: MarkdownView) => {
            const client = createClient(plugin.settings.ANTHROPIC_API_KEY);

            // Check if there's already an analysis section
            const content = editor.getValue();
            const analysisRegex = /\n## Analysis History\n([\s\S]*?)(?=\n##|\n---|\z)/;
            const hasAnalysis = analysisRegex.test(content);

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

            try {
                const entryText = _view.data.slice(93);
                const goalsObject = await getAndExtractGoals(plugin);
                const stream = await client.messages.create({
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: createExtractActionsPrompt(entryText, goalsToString(goalsObject)) }],
                    model: 'claude-sonnet-4-5-20250929',
                    stream: true,
                });

                let fullResponse = '';

                // Process the stream
                for await (const chunk of stream) {
                    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                        fullResponse += chunk.delta.text;
                    }
                }

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

                // need to update the internal file (hidden from obsidian) in the folder.
                saveGoalsAsJson(plugin.app.vault, goalsObject, normalizePath(`${_view.file?.parent?.path}/daily_goals.json`))

                // Move cursor to end
                editor.setCursor(editor.lastLine(), editor.getLine(editor.lastLine()).length);

            } catch (error) {
                // Replace the "analyzing..." line with error
                const currentContent = editor.getValue();
                const analyzingPattern = hasAnalysis
                    ? /🔄 Re-analyzing at .*?\.\.\./g
                    : /🔍 Analyzing at .*?\.\.\./g;

                const timestamp = new Date().toLocaleString();
                const errorLine = hasAnalysis
                    ? `🔄 Re-analysis failed at ${timestamp} ❌: ${error.message}`
                    : `🔍 Analysis failed at ${timestamp} ❌: ${error.message}`;

                const updatedContent = currentContent.replace(analyzingPattern, errorLine);
                editor.setValue(updatedContent);

                // Move cursor to end
                editor.setCursor(editor.lastLine(), editor.getLine(editor.lastLine()).length);
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