import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import * as Papa from 'papaparse';
import * as fs from "fs";
import * as path from "path";
import generateResponses from "./generate";
import generateScores from "./score";

const isDev = !app.isPackaged;

async function getCSVData (fileName: string, quoteChar: string) {
	const filePath = isDev ? path.join(process.cwd(), fileName) : path.join(process.cwd(), "resources", "app", fileName);
	if (fs.existsSync(filePath)) {
		try {
			const csvObj = Papa.parse(fs.readFileSync(filePath).toString(), {header: true, quoteChar: quoteChar, skipEmptyLines: true});
			if (csvObj && csvObj.data) {
				return JSON.stringify(csvObj.data);
			}
		} catch {
			return "";
		}
	}
	return "";
}

async function getJSONData (fileName: string) {
	const filePath = isDev ? path.join(process.cwd(), fileName) : path.join(process.cwd(), "resources", "app", fileName);
	if (fs.existsSync(filePath)) {
		try {
			const settingsObj = JSON.parse(fs.readFileSync(filePath).toString());
			if (settingsObj) {
				return JSON.stringify(settingsObj);
			}
		} catch {
			return "";
		}
	}
	return "";
}

function saveCSVData (fileName: string, csvBuffer: ArrayBuffer) {
	const filePath = path.join(__dirname, "..", fileName);
	fs.writeFileSync(filePath, Buffer.from(csvBuffer));
}

function saveJSONData (fileName: string, settings: string) {
	fs.writeFileSync(path.join(__dirname, "..", fileName), settings);
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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
app.whenReady().then(() => {
	ipcMain.handle('getCSVData', async (_event: IpcMainInvokeEvent, csvPath: string, quoteChar: string) => {
		return await getCSVData(csvPath, quoteChar);
	});
	ipcMain.handle('getJSONData', async (_event: IpcMainInvokeEvent, jsonPath: string) => {
		return await getJSONData(jsonPath);
	});
	ipcMain.handle('generateResponses', async (event: IpcMainInvokeEvent, settingsPath: string, settings: string, csvFileName: string, csvBuffer: ArrayBuffer, csvData: string) => {
		try {
			saveJSONData(settingsPath, settings);
			saveCSVData(csvFileName, csvBuffer);
			const responses = await generateResponses(settings, csvData, event.sender);
			return JSON.stringify({status: "ok", responses : responses});
		} catch (err) {
			return JSON.stringify({status: "error", errorMessage: err.message});
		}
	});
	ipcMain.handle('generateScores', async (event: IpcMainInvokeEvent, settingsPath: string, settings: string, csvData: string) => {
		try {
			saveJSONData(settingsPath, settings);
			const responses = await generateScores(settings, csvData, event.sender);
			return JSON.stringify({status: "ok", responses : responses});
		} catch (err) {
			return JSON.stringify({status: "error", errorMessage: err.message});
		}
	});
	createWindow();

	app.on("activate", function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.