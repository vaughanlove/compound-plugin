import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, normalizePath, TFile } from 'obsidian';
import { create_evening_reflection_callback, create_morning_reflection_callback, FINISH_MORNING_ENTRY_COMMAND, initializeCompound, INSERT_GOAL_COMMAND } from 'src/commands';
import { DEFAULT_JOURNAL_GET_STARTED_PATH, DEFAULT_JOURNAL_GOALS_PATH, DEFAULT_JOURNAL_PATH, DEFAULT_SETTINGS } from 'src/constants';
import { CompoundSettings } from 'src/interfaces';
import { CompoundSettingTab } from 'src/settings';
import { MORNING_TEMPLATE, EVENING_TEMPLATE, HOW_TO_TEMPLATE, GOAL_TEMPLATE, GOALS_INSTRUCTION_TEMPLATE } from 'src/templates';


export default class Compound extends Plugin {
	settings: CompoundSettings;

	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(async () => {
			await initializeCompound(this.app);
		});

		this.addRibbonIcon("anvil", "Morning Planning", create_morning_reflection_callback(this.app))
		this.addRibbonIcon("moon-star", "Evening Reflection", create_evening_reflection_callback(this.app))

		this.addCommand(FINISH_MORNING_ENTRY_COMMAND);
		this.addCommand(INSERT_GOAL_COMMAND);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CompoundSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}