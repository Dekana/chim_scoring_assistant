import { contextBridge, ipcRenderer } from 'electron';

const PROMPTS_CSV_PATH = 'prompts.csv';
const RESPONSE_SETTINGS_JSON_PATH = 'responseSettings.json';
const SCORE_SETTINGS_JSON_PATH = 'scoreSettings.json';
const SCORES_CSV_PATH = 'aggregateScores.csv';

contextBridge.exposeInMainWorld('electronAPI', {
	getAggregateScores: () => ipcRenderer.invoke('getCSVData', SCORES_CSV_PATH, '"'),
	getPrompts: () => ipcRenderer.invoke('getCSVData', PROMPTS_CSV_PATH, "'"),
	getResponseSettings: () => ipcRenderer.invoke('getJSONData', RESPONSE_SETTINGS_JSON_PATH),
	getScoreSettings: () => ipcRenderer.invoke('getJSONData', SCORE_SETTINGS_JSON_PATH),
	generateResponses: (settings: string, csvData: string) => ipcRenderer.invoke('generateResponses', RESPONSE_SETTINGS_JSON_PATH, settings, csvData),
	generateScores: (settings: string, csvData: string) => ipcRenderer.invoke('generateScores', SCORE_SETTINGS_JSON_PATH, settings, csvData),
	incrementGenerateResponses: (callback: (processed: number, skipped: number, total: number) => void) => ipcRenderer.on('incrementGenerateResponses', (_event, processed, skipped, total) => callback(processed, skipped, total)),
	incrementGenerateScores: (callback: (processed: number, skipped: number, total: number) => void) => ipcRenderer.on('incrementGenerateScores', (_event, processed, skipped, total) => callback(processed, skipped, total))
});

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
/*
window.addEventListener("DOMContentLoaded", () => {
	const replaceText = (selector: string, text: string) => {
	  const element = document.getElementById(selector);
	  if (element) {
		element.innerText = text;
	  }
	};
  
	for (const type of ["chrome", "node", "electron"]) {
	  replaceText(`${type}-version`, process.versions[type as keyof NodeJS.ProcessVersions]);
	}
});
*/