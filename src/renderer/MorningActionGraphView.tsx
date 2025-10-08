import * as React from 'react';
import { StrictMode } from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import {ActionGoalGraph} from './Graph';
import { loadActionsFromJson } from 'src/utils';
import { normalizePath } from 'obsidian';

export const MORNING_GRAPH_VIEW = 'morning-graph-view';

export class MorningGraphView extends ItemView {
	root: Root | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return MORNING_GRAPH_VIEW;
	}

	getDisplayText() {
		return 'Morning graph';
	}

	async onOpen() {
		this.root = createRoot(this.contentEl);

		// load the actual saved data, if it doesn't exist the component just renders a call to action.
		// const actions = await loadActionsFromJson();
		console.log("hello?")
		const file = this.app.workspace.getActiveFile();
  		const parentPath = file?.parent?.path;
		console.log(normalizePath(`${parentPath}/daily_actions.json`))
		const actions = await loadActionsFromJson(this.app.vault, normalizePath(`${parentPath}/daily_actions.json`))

		console.log(actions)
		this.root.render(
			<StrictMode>
				<ActionGoalGraph />,
			</StrictMode>,
		);
	}

	async onClose() {
		this.root?.unmount();
	}
}