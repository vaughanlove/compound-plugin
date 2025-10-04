import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, normalizePath, TFile } from 'obsidian';
import { FINISH_MORNING_ENTRY_COMMAND, INSERT_GOAL_COMMAND } from 'src/commands';
import { MORNING_TEMPLATE, EVENING_TEMPLATE, HOW_TO_TEMPLATE, GOAL_TEMPLATE, GOALS_INSTRUCTION_TEMPLATE } from 'src/templates';

interface CompoundSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: CompoundSettings = {
	mySetting: 'default'
}

const DEFAULT_JOURNAL_PATH = "compound"
const DEFAULT_JOURNAL_GET_STARTED_PATH = normalizePath(`${DEFAULT_JOURNAL_PATH}/how to.md`)
const DEFAULT_JOURNAL_GOALS_PATH = normalizePath(`${DEFAULT_JOURNAL_PATH}/goals.md`)

export default class Compound extends Plugin {
	settings: CompoundSettings;

	async initializeCompound() {
		const hasInitializedVault = await this.app.vault.getAbstractFileByPath(DEFAULT_JOURNAL_PATH);
		if (!hasInitializedVault) {
			await this.app.vault.createFolder(DEFAULT_JOURNAL_PATH);
			const file = await this.app.vault.create(DEFAULT_JOURNAL_GET_STARTED_PATH, HOW_TO_TEMPLATE);
			const goal_file = await this.app.vault.create(DEFAULT_JOURNAL_GOALS_PATH, GOALS_INSTRUCTION_TEMPLATE);
			this.app.workspace.trigger('file-explorer-refresh');

		}
	}

	revealFileInExplorer(file: TFile) {
		this.app.workspace.trigger('file-explorer-refresh');

		const fileExplorers = this.app.workspace.getLeavesOfType('file-explorer');
		if (fileExplorers.length > 0) {
			const fileExplorer = fileExplorers[0].view as any;
			if (fileExplorer.revealInFolder) {
				fileExplorer.revealInFolder(file);
			}
		}
	}

	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(async () => {
			await this.initializeCompound();
		});

		this.addRibbonIcon("anvil", "Morning Planning", async (_evt: MouseEvent) => {
			const now = window.moment();
			const todaysDate = now.format('YYYY.MM.DD');
			const todaysPath = normalizePath(`${DEFAULT_JOURNAL_PATH}/${todaysDate}`)
			const todaysMorningEntryPath = normalizePath(`${todaysPath}/morning.md`)

			let file = this.app.vault.getAbstractFileByPath(todaysMorningEntryPath);
			const todaysFolder = this.app.vault.getAbstractFileByPath(todaysPath)

			if (file) {
				if (file instanceof TFile) {
					await this.app.workspace.getLeaf().openFile(file);
					this.revealFileInExplorer(file);
				}
			}
			else {
				if (!todaysFolder) {
					const folder = await this.app.vault.createFolder(todaysPath);
				} const file = await this.app.vault.create(todaysMorningEntryPath, MORNING_TEMPLATE);

				if (file instanceof TFile) {
					await this.app.workspace.getLeaf().openFile(file);
					this.revealFileInExplorer(file);
				}
			}


		})

		this.addRibbonIcon("moon-star", "Evening Reflection", async (_evt: MouseEvent) => {
			const now = window.moment();
			const todaysDate = now.format('YYYY.MM.DD');
			const todaysPath = normalizePath(`${DEFAULT_JOURNAL_PATH}/${todaysDate}`)
			const todaysEveningEntryPath = normalizePath(`${todaysPath}/evening.md`)

			const todaysFolder = this.app.vault.getAbstractFileByPath(todaysPath)
			let file = this.app.vault.getAbstractFileByPath(todaysEveningEntryPath);

			if (file) {
				if (file instanceof TFile) {
					await this.app.workspace.getLeaf().openFile(file);
					this.revealFileInExplorer(file);
				}
			}
			else {
				if (!todaysFolder) {
					const folder = await this.app.vault.createFolder(todaysPath);
				}
				const file = await this.app.vault.create(todaysEveningEntryPath, EVENING_TEMPLATE);

				if (file instanceof TFile) {
					await this.app.workspace.getLeaf().openFile(file);
					this.revealFileInExplorer(file);
				}
			}
		})

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

class CompoundSettingTab extends PluginSettingTab {
	plugin: Compound;

	constructor(app: App, plugin: Compound) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
