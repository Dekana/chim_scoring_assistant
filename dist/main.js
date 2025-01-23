"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Papa = __importStar(require("papaparse"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const generate_1 = __importDefault(require("./generate"));
const score_1 = __importDefault(require("./score"));
async function getCSVData(csvPath, quoteChar) {
    if (fs.existsSync(csvPath)) {
        try {
            const csvObj = Papa.parse(fs.readFileSync(csvPath).toString(), { header: true, quoteChar: quoteChar, skipEmptyLines: true });
            if (csvObj && csvObj.data) {
                return JSON.stringify(csvObj.data);
            }
        }
        catch {
            return "";
        }
    }
    return "";
}
async function getJSONData(jsonPath) {
    if (fs.existsSync(jsonPath)) {
        try {
            const settingsObj = JSON.parse(fs.readFileSync(jsonPath).toString());
            if (settingsObj) {
                return JSON.stringify(settingsObj);
            }
        }
        catch {
            return "";
        }
    }
    return "";
}
function saveJSONData(jsonPath, settings) {
    fs.writeFileSync(path.join(__dirname, "..", jsonPath), settings);
}
function createWindow() {
    // Create the browser window.
    const mainWindow = new electron_1.BrowserWindow({
        height: 1024,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        },
        width: 1280,
    });
    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
    //mainWindow.removeMenu();
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron_1.app.whenReady().then(() => {
    electron_1.ipcMain.handle('getCSVData', async (_event, csvPath, quoteChar) => {
        return await getCSVData(csvPath, quoteChar);
    });
    electron_1.ipcMain.handle('getJSONData', async (_event, jsonPath) => {
        return await getJSONData(jsonPath);
    });
    electron_1.ipcMain.handle('generateResponses', async (event, settingsPath, settings, csvData) => {
        try {
            saveJSONData(settingsPath, settings);
            const responses = await (0, generate_1.default)(settings, csvData, event.sender);
            return JSON.stringify({ status: "ok", responses: responses });
        }
        catch (err) {
            return JSON.stringify({ status: "error", errorMessage: err.message });
        }
    });
    electron_1.ipcMain.handle('generateScores', async (event, settingsPath, settings, csvData) => {
        try {
            saveJSONData(settingsPath, settings);
            const responses = await (0, score_1.default)(settings, csvData, event.sender);
            return JSON.stringify({ status: "ok", responses: responses });
        }
        catch (err) {
            return JSON.stringify({ status: "error", errorMessage: err.message });
        }
    });
    createWindow();
    electron_1.app.on("activate", function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
