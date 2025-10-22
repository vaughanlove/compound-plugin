import * as React from 'react';

import { StrictMode } from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import {Graph} from '../Graph';
import { loadActionsFromJson } from 'src/utils';
import { normalizePath } from 'obsidian';
import { Action } from 'src/types';

export const EVENING_GRAPH_VIEW = 'evening-graph-view';

export class EveningGraphView extends ItemView {
    root: Root | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return EVENING_GRAPH_VIEW;
    }

    getDisplayText() {
        return 'Evening graph';
    }

    async onOpen() {
        this.root = createRoot(this.contentEl);

        // load the actual saved data, if it doesn't exist the component just renders a call to action.
        // const actions = await loadActionsFromJson();
        const file = this.app.workspace.getActiveFile();
        const parentPath = file?.parent?.path;

        let actions: Action[] = [];
        try{
            actions = await loadActionsFromJson(this.app.vault, normalizePath(`${parentPath}/daily_actions.json`))
        } catch {
            console.error("No actions found.")
        }

        this.root.render(
            <StrictMode>
                <Graph data={actions} mode={'action'}/>,
            </StrictMode>,
        );
    }

    async onClose() {
        this.root?.unmount();
    }
}