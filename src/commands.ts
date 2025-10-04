import { Editor, MarkdownView } from "obsidian";
import { GOAL_TEMPLATE } from "./templates";

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