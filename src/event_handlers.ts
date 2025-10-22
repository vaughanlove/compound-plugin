import { TFile, Workspace } from "obsidian";
import { MORNING_GRAPH_VIEW } from "./renderer/views/MorningActionGraphView";
import { EVENING_GRAPH_VIEW } from "./renderer/views/EveningActionGraphView";

export function handleOpenMorningFile(workspace: Workspace) {
    return async (file: TFile) => {
            if (file) {
                if (file.name === 'morning.md' && file.path.includes('compound/')) {
                    // Extract the parent folder (date folder)
                    const parentFolder = file.parent?.path || '';

                    // If we're opening a morning.md from a different date folder, close existing view
                    if (this.currentMorningFolder && this.currentMorningFolder !== parentFolder) {
                        const leaves = workspace.getLeavesOfType(MORNING_GRAPH_VIEW);
                        leaves.forEach(leaf => leaf.detach());
                    }

                    // Update the current folder
                    this.currentMorningFolder = parentFolder;

                    let leaf = workspace.getLeavesOfType(MORNING_GRAPH_VIEW)[0];

                    leaf = workspace.getRightLeaf(false)!;
                    await leaf.setViewState({
                        type: MORNING_GRAPH_VIEW,
                        active: true,
                    });


                    workspace.revealLeaf(leaf);
                } else {
                    // Close the view when navigating away from morning.md
                    const leaves = workspace.getLeavesOfType(MORNING_GRAPH_VIEW);
                    leaves.forEach(leaf => leaf.detach());
                }

                if  (file.name === 'evening.md' && file.path.includes('compound/')) {
                    // Extract the parent folder (date folder)
                    const parentFolder = file.parent?.path || '';

                    // If we're opening a morning.md from a different date folder, close existing view
                    if (this.currentEveningFolder && this.currentEveningFolder !== parentFolder) {
                        const leaves = workspace.getLeavesOfType(EVENING_GRAPH_VIEW);
                        leaves.forEach(leaf => leaf.detach());
                    }

                    // Update the current folder
                    this.currentEveningFolder = parentFolder;

                    let leaf = workspace.getLeavesOfType(EVENING_GRAPH_VIEW)[0];

                    leaf = workspace.getRightLeaf(false)!;
                    await leaf.setViewState({
                        type: EVENING_GRAPH_VIEW,
                        active: true,
                    });


                    workspace.revealLeaf(leaf);
                } else {
                    // Close the view when navigating away from morning.md
                    const leaves = workspace.getLeavesOfType(EVENING_GRAPH_VIEW);
                    leaves.forEach(leaf => leaf.detach());
                }
            }
        }
} 