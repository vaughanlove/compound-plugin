import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, normalizePath, TFile, BasesView, QueryController } from 'obsidian';
import { create_evening_reflection_callback, create_morning_reflection_callback, finishMorningEntryCommand, initializeCompound, INSERT_GOAL_COMMAND } from 'src/commands';
import { DEFAULT_JOURNAL_GET_STARTED_PATH, DEFAULT_JOURNAL_GOALS_PATH, DEFAULT_JOURNAL_PATH, DEFAULT_SETTINGS } from 'src/constants';
import { CompoundSettings } from 'src/interfaces';
import { CompoundSettingTab } from 'src/settings';
import { MORNING_TEMPLATE, EVENING_TEMPLATE, HOW_TO_TEMPLATE, GOAL_TEMPLATE, GOALS_INSTRUCTION_TEMPLATE } from 'src/templates';
// import * as d3 from 'd3';

// maybe use bases view for a calendar overview of actions?

// Define your data type
interface MorningActionData {
  date: Date;
  value: number;
}


export default class Compound extends Plugin {
	settings: CompoundSettings;

	getGraphData() {
    // Replace this with your actual data source
    // This could come from your plugin's settings, data files, etc.
    return [
      { date: new Date('2025-10-01'), value: 5 },
      { date: new Date('2025-10-02'), value: 8 },
      { date: new Date('2025-10-03'), value: 6 },
      { date: new Date('2025-10-04'), value: 10 },
      { date: new Date('2025-10-05'), value: 7 },
      { date: new Date('2025-10-06'), value: 9 },
    ];
  }
	

	async onload() {
		await this.loadSettings();
		
		// this.registerMarkdownCodeBlockProcessor('morning-graph', (source, el, ctx) => {

    //   console.log("source: ", source);
    //   console.log("el: ", el);
    //   console.log("ctx: ", ctx);

    //   // Get your plugin's data
    //   const data: MorningActionData[] = this.getGraphData();
      
    //   // Clear the container
    //   el.empty();
      
    //   // Set dimensions
    //   const width = 700;
    //   const height = 400;
    //   const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    //   const innerWidth = width - margin.left - margin.right;
    //   const innerHeight = height - margin.top - margin.bottom;
      
    //   // Create SVG
    //   const svg = d3.select(el)
    //     .append('svg')
    //     .attr('width', width)
    //     .attr('height', height)
    //     .style('background', 'var(--background-primary)')
    //     .append('g')
    //     .attr('transform', `translate(${margin.left},${margin.top})`);
      
    //     const dateExtent = d3.extent(data, (d: MorningActionData) => d.date);

    //   // Create scales
    //   const xScale = d3.scaleTime()
    //     .domain([dateExtent[0] ?? new Date(), dateExtent[1] ?? new Date()])
    //     .range([0, innerWidth]);
      
    //    const maxValue = d3.max(data, (d: MorningActionData) => d.value) ?? 0;
    //   const yScale = d3.scaleLinear()
    //     .domain([0, maxValue])
    //     .nice()
    //     .range([innerHeight, 0]);
      
    //   // Create line generator
    //   const line = d3.line<MorningActionData>()
    //     .x((d: MorningActionData) => xScale(d.date))
    //     .y((d: MorningActionData) => yScale(d.value))
    //     .curve(d3.curveMonotoneX);
      
    //   // Add the line path
    //   svg.append('path')
    //     .datum(data)
    //     .attr('fill', 'none')
    //     .attr('stroke', 'var(--text-accent)')
    //     .attr('stroke-width', 2)
    //     .attr('d', line);
      
    //   // Add dots
    //   svg.selectAll('circle')
    //     .data(data)
    //     .enter()
    //     .append('circle')
    //     .attr('cx', (d: MorningActionData) => xScale(d.date))
    //     .attr('cy', (d: MorningActionData) => yScale(d.value))
    //     .attr('r', 4)
    //     .attr('fill', 'var(--text-accent)')
    //     .attr('stroke', 'var(--background-primary)')
    //     .attr('stroke-width', 2);
      
    //   // Add X axis
    //   svg.append('g')
    //     .attr('transform', `translate(0,${innerHeight})`)
    //     .call(d3.axisBottom(xScale))
    //     .style('color', 'var(--text-muted)');
      
    //   // Add Y axis
    //   svg.append('g')
    //     .call(d3.axisLeft(yScale))
    //     .style('color', 'var(--text-muted)');
      
    //   // Add labels
    //   svg.append('text')
    //     .attr('x', innerWidth / 2)
    //     .attr('y', innerHeight + 35)
    //     .attr('text-anchor', 'middle')
    //     .style('fill', 'var(--text-normal)')
    //     .text('Date');
      
    //   svg.append('text')
    //     .attr('transform', 'rotate(-90)')
    //     .attr('x', -innerHeight / 2)
    //     .attr('y', -35)
    //     .attr('text-anchor', 'middle')
    //     .style('fill', 'var(--text-normal)')
    //     .text('Actions Completed');
    // });

		this.app.workspace.onLayoutReady(async () => {
			await initializeCompound(this.app);
		});

		this.addRibbonIcon("anvil", "Morning Planning", create_morning_reflection_callback(this.app))
		this.addRibbonIcon("moon-star", "Evening Reflection", create_evening_reflection_callback(this.app))

		this.addCommand(finishMorningEntryCommand(this));
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