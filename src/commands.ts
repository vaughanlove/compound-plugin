import { App, Editor, MarkdownView, normalizePath, Notice, Plugin, Setting, TFile } from "obsidian";
import { create_evening_text, GOAL_TEMPLATE, GOALS_INSTRUCTION_TEMPLATE, HOW_TO_TEMPLATE, MORNING_TEMPLATE } from "./templates";
import { DEFAULT_JOURNAL_GET_STARTED_PATH, DEFAULT_JOURNAL_GOALS_PATH, DEFAULT_JOURNAL_PATH } from "./constants";
import { extractJsonFromMarkdown, getAndExtractGoals, goalsToString, loadIntentsFromJson, loadIntentsJsonAsMarkdown, parseActionsAndRelateToIntentsFromMarkdown, parseIntentsFromJson, revealFileInExplorer, saveActionsAsJson, saveGoalsAsJson, saveIntentsAsJson } from "./utils";
import { createDailySummaryPrompt, createExtractIntentsPrompt, createReflectOnIntentsPrompt } from "./prompts";
import { createClient, query_llm } from "./llm";
import type Compound from "./main";
import { extractRegexPatternFromString } from "./regex";
import { ANALYSIS_SECTION_REGEX } from "./regex_patterns";

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

            // Check if there's already an reflect section
            const analysisSectionMatch = extractRegexPatternFromString(content, ANALYSIS_SECTION_REGEX)
            if (!analysisSectionMatch.ok) {
                new Notice(analysisSectionMatch.error)
                return;
            }

            let analysisStartPos;

            // Find where the Analysis History section is
            const matchIndex = content.indexOf(analysisSectionMatch.value); // nullish coalesing not great

            // need a nice abstraction for replacing text.
            analysisStartPos = {
                line: editor.lastLine(),
                ch: editor.getLine(editor.lastLine()).length
            };

            // Add re-analysis indicator
            const timestamp = new Date().toLocaleString();
            editor.replaceRange(`\n\n🔄 Re-analyzing at ${timestamp}...`, analysisStartPos);
            // First analysis - create the section
            const lastLine = editor.lastLine();
            analysisStartPos = {
                line: lastLine,
                ch: editor.getLine(lastLine).length
            };

            editor.replaceRange(`\n\n## Analysis History\n\n🔍 Analyzing at ${timestamp}...`, analysisStartPos);

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
                const structuredActions = parseActionsAndRelateToIntentsFromMarkdown(extractJsonFromMarkdown(llmResponse.value), structuredIntents);

                const currentContent = editor.getValue();
                const analyzingPattern = analysisSectionMatch.ok
                    ? /🔄 Re-analyzing at .*?\.\.\./g
                    : /🔍 Analyzing at .*?\.\.\./g;

                const timestamp = new Date().toLocaleString();
                const successLine = analysisSectionMatch.ok
                    ? `🔄 Re-analyzed at ${timestamp} ✅`
                    : `🔍 Analyzed at ${timestamp} ✅`;

                const updatedContent = currentContent.replace(analyzingPattern, successLine);
                editor.setValue(updatedContent);

                // need to update the internal file (hidden from obsidian) in the folder.
                saveActionsAsJson(plugin.app.vault, structuredActions, normalizePath(`${_view.file?.parent?.path}/daily_actions.json`));


                // now want to generate the daily summary
                const structuredGoals = await getAndExtractGoals(plugin);


                const second_stream = await client.value.messages.create({
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: createDailySummaryPrompt(JSON.stringify(structuredActions), JSON.stringify(structuredGoals)) }],
                    model: 'claude-sonnet-4-5-20250929',
                    stream: true,
                });

                let secondFullResponse = '';

                // Process the stream
                for await (const chunk of second_stream) {
                    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                        secondFullResponse += chunk.delta.text;
                    }
                }

                await plugin.app.vault.create(normalizePath(`${_view.file?.parent?.path}/llm summary.md`), secondFullResponse);


                // Move cursor to end
                editor.setCursor(editor.lastLine(), editor.getLine(editor.lastLine()).length);

            } catch (error) {
                const currentContent = editor.getValue();
                const analyzingPattern = analysisSectionMatch.ok
                    ? /🔄 Re-analyzing at .*?\.\.\./g
                    : /🔍 Analyzing at .*?\.\.\./g;

                const timestamp = new Date().toLocaleString();
                const errorLine = analysisSectionMatch.ok
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
                const stream = await client.value.messages.create({
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: createExtractIntentsPrompt(entryText, goalsToString(goalsObject)) }],
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

                const actionJsonString = extractJsonFromMarkdown(fullResponse);
                const structuredActions = parseIntentsFromJson(actionJsonString);


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
                saveIntentsAsJson(plugin.app.vault, structuredActions, normalizePath(`${_view.file?.parent?.path}/daily_intents.json`));

                // Move cursor to end
                editor.setCursor(editor.lastLine(), editor.getLine(editor.lastLine()).length);

            } catch (error) {
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