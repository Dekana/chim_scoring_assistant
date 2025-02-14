"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const PROMPTS_CSV_PATH = 'prompts.csv';
const RESPONSE_SETTINGS_JSON_PATH = 'responseSettings.json';
const SCORE_SETTINGS_JSON_PATH = 'scoreSettings.json';
const SCORES_CSV_PATH = 'aggregateScores.csv';
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getAggregateScores: () => electron_1.ipcRenderer.invoke('getCSVData', SCORES_CSV_PATH, '"'),
    getPrompts: () => electron_1.ipcRenderer.invoke('getCSVData', PROMPTS_CSV_PATH, "'"),
    getResponseSettings: () => electron_1.ipcRenderer.invoke('getJSONData', RESPONSE_SETTINGS_JSON_PATH),
    getScoreSettings: () => electron_1.ipcRenderer.invoke('getJSONData', SCORE_SETTINGS_JSON_PATH),
    generateResponses: (settings, csvBuffer, csvData) => electron_1.ipcRenderer.invoke('generateResponses', RESPONSE_SETTINGS_JSON_PATH, settings, PROMPTS_CSV_PATH, csvBuffer, csvData),
    generateScores: (settings, csvData) => electron_1.ipcRenderer.invoke('generateScores', SCORE_SETTINGS_JSON_PATH, settings, csvData),
    incrementGenerateResponses: (callback) => electron_1.ipcRenderer.on('incrementGenerateResponses', (_event, processed, skipped, total) => callback(processed, skipped, total)),
    incrementGenerateScores: (callback) => electron_1.ipcRenderer.on('incrementGenerateScores', (_event, processed, skipped, total) => callback(processed, skipped, total))
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
