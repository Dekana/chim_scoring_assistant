import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';
import { sanitize } from 'sanitize-filename-ts';
import * as utils from './utils';
import { type WebContents } from 'electron';

interface LLMResponse {
  response: string;
  responseTime: number;
}

// prevent meta properties from entering the POST settings
function cleanSettings(settings: utils.Settings) {
	const url = settings.url;
	delete settings.url;
	const apiKey = settings.api_key;
	if (settings.api_key !== undefined) {
		delete settings.api_key;
	}
	if (settings.response_format_type !== undefined) {
		if (settings.response_format_type) {
			const responseFormat = getResponseFormat(settings.response_format_type);
			if (responseFormat) {
				settings.response_format = responseFormat;
			}
		}
		delete settings.response_format_type;
	}
	if (settings.provider_order !== undefined) {
		settings.provider = {order: [settings.provider_order], require_parameters: true};
		delete settings.provider_order;
	}

	return { url, apiKey};
}

function getResponseFormat(response_format_type: string) {
	if (response_format_type === "json_object") {
		return {
			type: "json_object"
		};
	} else if (response_format_type === "json_schema") {
		return {
			type: "json_schema",
			json_schema: {
				name: "response",
				schema: {
					type: "object",
					properties: {
						character: {
							type: "string",
							description: "the name of the character who is making this response",
						},
						listener: {
							type: "string",
							description: "specify who the responding character is talking to"
						},
						message: {
							type: "string",
							description: "the responding character's lines of dialogue"
						},
						mood: {
							type: "string",
							description: "mood to use while speaking",
							enum: [
								"sassy",
								"assertive",
								"sexy",
								"smug",
								"kindly",
								"lovely",
								"seductive",
								"sarcastic",
								"sardonic",
								"smirking",
								"amused",
								"default",
								"assisting",
								"irritated",
								"playful",
								"neutral",
								"teasing",
								"mocking"
							]
						},
						action: {
							type: "string",
							description: "a valid action",
							enum: [
								"IncreaseWalkSpeed",
								"ExchangeItems",
								"Inspect",
								"LetsRelax",
								"Hunt",
								"TakeASeat",
								"ListInventory",
								"InspectSurroundings",
								"DecreaseWalkSpeed",
								"Talk",
								"LeadTheWayTo",
								"WaitHere",
								"Attack",
								"Heal"
							]
						},
						target: {
							type: "string",
							description: "action's target|destination name"
						}
					},
					required: [
						"character",
						"listener",
						"message",
						"mood",
						"action",
						"target"
					],
					additionalProperties: false
				},
				strict: true
			}
		}
	} else {
		return;
	}
}

async function sendToLLM(url: string, apiKey: string, postBody: object): Promise<LLMResponse> {
	const startTime = Date.now();
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`
		},
		body: JSON.stringify(postBody)
	});
	const endTime = Date.now();
	const responseTime = (endTime - startTime) / 1000; // in seconds

	if (!response.ok) {
		const responseText = await response.text();
		if (responseText) {
			throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
		}
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	try {
		const result = JSON.parse(await response.text());
		return { response: result["choices"][0]["message"]["content"], responseTime: responseTime }
	} catch {
		return { response: '', responseTime: 0 }
	}
}

async function generateResponses(settings: utils.Settings, csvData: string, responseFilePath: string, sender: WebContents) {
	const prompts = JSON.parse(csvData);

	const { url, apiKey } = cleanSettings(settings);

	let skipped = 0;
	const responses = [];
	for (const promptRow of prompts) {
		if (!promptRow.prompt) {
			skipped++;
			continue; // skip if there is no prompt
		}
		const messages = JSON.parse(promptRow.prompt);
		if (!Array.isArray(messages)) {
			skipped++;
			continue; // skip if prompt is not an array of messages
		}
		const promptStr: string = promptRow.prompt;
		if (promptStr.indexOf("#CHAT HISTORY#") >= 0) {
			skipped++;
			continue; // skip if the prompt was for a summary
		}
		const prompt = {
			messages: messages,
			stream: false,
			...settings
		};
		const { response, responseTime } = await sendToLLM(url!, apiKey, prompt);

		const result = {
			model: settings.model,
			provider: settings.provider ? settings.provider.order[0] || "" : "",
			url: url,
			temperature: settings.temperature ?? "",
			top_p: settings.top_p ?? "",
			min_p: settings.min_p ?? "",
			repetition_penalty: settings.repetition_penalty ?? "",
			max_tokens: settings.max_completion_tokens || settings.max_tokens || "",
			response_format: settings.response_format ? settings.response_format.type || "" : "",
			prompt: promptRow.prompt,
			response: response,
			response_time: responseTime
		};
		const csvString = Papa.unparse([result], {header: false});
		fs.appendFileSync(responseFilePath, csvString + '\r\n');

		responses.push(result);

		sendIncrementEvent(sender, responses.length, skipped, prompts.length);
	}

	return responses;
}

function sendIncrementEvent(sender: WebContents, processed: number, skipped: number, total: number) {
	sender.send('incrementGenerateResponses', processed, skipped, total);
}

function writeResponseFile(modelName: string) {
	const headersArr = [
		"model",
		"provider",
		"url",
		"temperature",
		"top_p",
		"min_p",
		"repetition_penalty",
		"max_tokens",
		"response_format",
		"prompt",
		"response",
		"response_time"
	];
	const headers = headersArr.join(",");

	const modelDirPath = path.join(__dirname, "..", "models", sanitize(modelName));
	if (!fs.existsSync(modelDirPath)) {
		fs.mkdirSync(modelDirPath);
	}

	const responseDirPath = path.join(modelDirPath, "responses");
	if (!fs.existsSync(responseDirPath)) {
		fs.mkdirSync(responseDirPath);
	}

	const responseFileName = sanitize(`responses_${utils.getTimestampString()}.csv`);
	const responseFilePath = path.join(responseDirPath, responseFileName);
	fs.writeFileSync(responseFilePath, headers + '\r\n');

	return responseFilePath;
}

export default async (settingsStr: string, csvData: string, sender: WebContents) => {
	const settings: utils.Settings = JSON.parse(settingsStr);

	if (!settings.model) throw new Error("settings did not include required field: model");
	if (!settings.url) throw new Error("settings did not include required field: url");

	const responseFilePath = writeResponseFile(settings.model);

	let rows = [];
	try {
		rows = await generateResponses(settings, csvData, responseFilePath, sender);
	} finally {
		// discard empty response files
		if (rows.length === 0) {
			fs.unlinkSync(responseFilePath);
		}
	}

	return rows;
};