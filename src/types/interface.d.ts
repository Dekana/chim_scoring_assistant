export interface IElectronAPI {
	getAggregateScores: () => Promise<string>,
	getPrompts: () => Promise<string>,
	getResponseSettings: () => Promise<string>,
	getScoreSettings: () => Promise<string>,
	generateResponses: (settings: string, csvData: string) => Promise<string>,
	generateScores: (settings: string, csvData: string) => Promise<string>,
	incrementGenerateResponses: (callback: (processed: number, skipped: number, total: number) => void) => Promise<void>,
	incrementGenerateScores: (callback: (processed: number, skipped: number, total: number) => void) => Promise<void>,
  }
  
  declare global {
	interface Window {
	  electronAPI: IElectronAPI
	}
  }