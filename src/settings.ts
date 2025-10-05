import { App, PluginSettingTab, Setting } from 'obsidian';
import type Compound from '../main'; // type-only import, avoids circular import
import { CompoundSettings } from './interfaces';

export class CompoundSettingTab extends PluginSettingTab {
	plugin: Compound;

	constructor(app: App, plugin: Compound) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Journal Path')
			.setDesc('Path to your journal folder')
			.addText(text => text
				.setPlaceholder('Journal')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}