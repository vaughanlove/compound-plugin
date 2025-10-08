import { App, PluginSettingTab, Setting } from 'obsidian';
import type Compound from './main'; // type-only import, avoids circular import
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
			.setName('Anthropic API Key')
			.setDesc("Your Anthropic Api Key (Look at the how to file for instructions)")
			.addText(text => text
				.setPlaceholder('sk-*******')
				.setValue(this.plugin.settings.ANTHROPIC_API_KEY)
				.onChange(async (value) => {
					this.plugin.settings.ANTHROPIC_API_KEY = value;
					await this.plugin.saveSettings();
				}));
	}
}