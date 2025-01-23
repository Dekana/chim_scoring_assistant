import * as fs from 'fs';
import * as path from 'path';
import * as PapaParse from 'papaparse';
import { sanitize } from 'sanitize-filename-ts';
import * as utils from './utils';
import { type WebContents } from 'electron';

const scoringPromptPath = path.join(__dirname, '..', 'scorePrompt.txt');
let scoreFilePath: string;

interface ModelDetails {
	model: string;
	provider: string;
	url: string;
	temperature: string;
	top_p: string;
	min_p: string;
	repetition_penalty: string;
	max_tokens: string;
	response_format: string;
	prompt: string;
	response: string;
	response_time: string;
}

interface ScoreResult {
	responsiveness: string;
	roleplaying: string;
	quality: string;
	action_appropriateness: string;
	target_selection?: string;
	explanation: string;
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
						explanation: {
							type: "string"
						},
						responsiveness: {
							type: "number"
						},
						roleplaying: {
							type: "number"
						},
						quality: {
							type: "number"
						},
						action_appropriateness: {
							type: "number"
						}
					},
					required: [
						"explanation",
						"responsiveness",
						"roleplaying",
						"quality",
						"action_appropriateness"
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

function isAvailableAction(action: string) {
	return [
		"InspectSurroundings",
		"ExchangeItems",
		"LetsRelax",
		"ListInventory",
		"TakeASeat",
		"IncreaseWalkSpeed",
		"DecreaseWalkSpeed",
		"WaitHere",
		"Inspect",
		"Hunt",
		"LeadTheWayTo",
		"Attack",
		"Heal",
		"Talk"
	].includes(action);
}

function scoreTargetSelection(action: string, target: string): string {
	// no target is required
	if ([
		"InspectSurroundings",
		"ExchangeItems",
		"LetsRelax",
		"ListInventory",
		"TakeASeat",
		"IncreaseWalkSpeed",
		"DecreaseWalkSpeed",
		"WaitHere"
	].includes(action))
	{
		// no target is required, but it was requested to be blank. 4 if target, 5 if no target
		return target ? "4" : "5";
	
	// target is required
	} else if (["Inspect",
		"Hunt",
		"LeadTheWayTo",
		"Attack",
		"Heal"
	].includes(action))
	{
		// binary choice. 5 if target, 1 if no target
		return target ? "5" : "1"
	
	// no target is required. Irrelevant for Talk because Listener is used.
	} else if (["Talk"].includes(action)) {
		return "5";
	}

	return "1"; // default for unrecognized action
}

async function sendToLLM(url: string, apiKey: string, postBody: object): Promise<ScoreResult> {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`
		},
		body: JSON.stringify(postBody)
	});

	if (!response.ok) {
		const responseText = await response.text();
		if (responseText) {
			throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
		}
		throw new Error(`HTTP error! status: ${response.status}`);
		}

	try {
		const result = JSON.parse(await response.text());
		const scores: ScoreResult = JSON.parse(result["choices"][0]["message"]["content"]);

		if (!scores.responsiveness || !scores.roleplaying || !scores.quality || !scores.action_appropriateness) {
			throw new Error();
		}
		return scores;
	} catch {
		return {
			responsiveness: "",
			roleplaying: "",
			quality: "",
			action_appropriateness: "",
			explanation: "The LLM failed or refused to assign a score."
		};
	}
}

async function generateScores(settings: utils.Settings, csvData: string, sender: WebContents) {
	const responses = JSON.parse(csvData);
	const scoringPromptTemplate = getScoringPromptTemplate();
	
	const { url, apiKey } = cleanSettings(settings);

	const aggregateScores = {
		scored_response_count: 0,
		total_responsiveness_score: 0,
		total_roleplaying_score: 0,
		total_quality_score: 0,
		total_action_appropriateness_score: 0,
		total_target_selection_score: 0,
		total_response_time: 0
	}
	const modelDetails: ModelDetails = {
		model: responses[0]["model"] ?? "",
		provider: responses[0]["provider"] ?? "",
		url: responses[0]["url"] ?? "",
		temperature: responses[0]["temperature"] ?? "",
		top_p: responses[0]["top_p"] ?? "",
		min_p: responses[0]["min_p"] ?? "",
		repetition_penalty: responses[0]["repetition_penalty"] ?? "",
		max_tokens: responses[0]["max_completion_tokens"] || responses[0]["max_tokens"] || "",
		response_format: responses[0]["response_format"] ?? "",
		prompt: responses[0]["prompt"] ?? "",
		response: responses[0]["response"] ?? "",
		response_time: responses[0]["response_time"] ?? ""
	}
	scoreFilePath = writeScoreFile(modelDetails.model);

	let skipped = 0;
	const results = [];
	for (const response of responses) {
		if (!response["prompt"]) {
			skipped++;
			continue;
		}

		let initialResponseObj;
		let scores: ScoreResult;
		try {
			initialResponseObj = JSON.parse(response["response"]);
			if (!initialResponseObj) {
				throw new Error();
			}
		} catch {
			scores = {
				responsiveness: "1",
				roleplaying: "1",
				quality: "1",
				action_appropriateness: "1",
				target_selection: "1",
				explanation: "The response was not properly formatted JSON."
			}
			aggregateScores.scored_response_count++;
		}
		
		if (initialResponseObj) {
			let scoringPrompt = scoringPromptTemplate.replace("{prompt}", response["prompt"]);
			scoringPrompt = scoringPrompt.replace("{response}", response["response"]);
			const messages: object[] = JSON.parse(response["prompt"]);
			messages.push({role: "user", "content": scoringPrompt});
			const postBody = {
				messages: messages,
				stream: false,
				...settings
			};
			scores = await sendToLLM(url, apiKey, postBody);
			
			if (scores.responsiveness) {
				scores.action_appropriateness = isAvailableAction(initialResponseObj["action"]) ? scores.action_appropriateness : "1";
				scores.target_selection = scoreTargetSelection(initialResponseObj["action"], initialResponseObj["target"]);
				scores.explanation = scores.explanation || "The LLM did not explain its scoring.";
				aggregateScores.scored_response_count++;
			}
		}

		// Update aggregate scores
		if (scores.responsiveness) {
			aggregateScores.total_response_time += parseFloat(modelDetails.response_time) || 0;
			aggregateScores.total_responsiveness_score += parseFloat(scores.responsiveness) || 0;
			aggregateScores.total_roleplaying_score += parseFloat(scores.roleplaying) || 0;
			aggregateScores.total_quality_score += parseFloat(scores.quality) || 0;
			aggregateScores.total_action_appropriateness_score += parseFloat(scores.action_appropriateness) || 0;
			aggregateScores.total_target_selection_score += parseFloat(scores.target_selection || "") || 0;
		
			const result = [{...modelDetails, ...scores}];
			const csvString = PapaParse.unparse(result, {header: false});
			
			fs.appendFileSync(scoreFilePath, csvString + '\r\n');
	
			results.push(result);
		} else {
			skipped++;
		}

		sendIncrementEvent(sender, results.length, skipped, responses.length);
	}

	// Calculate average scores
	if (modelDetails && aggregateScores.scored_response_count > 0) {

		const dt = new Date();
		const csvString = [
			dt.toISOString(),
			modelDetails.model,
			modelDetails.url,
			modelDetails.temperature,
			modelDetails.top_p,
			modelDetails.min_p,
			modelDetails.repetition_penalty,
			modelDetails.max_tokens,
			modelDetails.response_format,
			aggregateScores.scored_response_count,
			aggregateScores.total_response_time / aggregateScores.scored_response_count,
			aggregateScores.total_responsiveness_score / aggregateScores.scored_response_count,
			aggregateScores.total_roleplaying_score / aggregateScores.scored_response_count,
			aggregateScores.total_quality_score / aggregateScores.scored_response_count,
			aggregateScores.total_action_appropriateness_score / aggregateScores.scored_response_count,
			aggregateScores.total_target_selection_score / aggregateScores.scored_response_count,
		].join(",");
		fs.appendFileSync(path.join(__dirname, '..', 'aggregateScores.csv'), csvString + '\r\n');
	}

	return results;
}

function sendIncrementEvent(sender: WebContents, processed: number, skipped: number, total: number) {
	sender.send('incrementGenerateScores', processed, skipped, total);
}

function getScoringPromptTemplate() {
  return fs.readFileSync(scoringPromptPath).toString();
}

function writeAggregateScoreFile() {
	if (!fs.existsSync(path.join(__dirname, '..', 'aggregateScores.csv'))) {
		const headersArr = [
			"timestamp",
			"model",
			"provider",
			"url",
			"temperature",
			"top_p",
			"min_p",
			"repetition_penalty",
			"max_tokens",
			"response_format",
			"scored_response_count",
			"average_response_time",
			"average_responsiveness",
			"average_roleplaying",
			"average_quality",
			"average_action_appropriateness",
			"average_target_selection"
		];
		const headers = headersArr.join(",");
		fs.writeFileSync(path.join(__dirname, '..', 'aggregateScores.csv'), headers + '\r\n');
	}
}

function writeScoreFile(modelName: string) {
	const headersArr = [
		"model",
		"url",
		"temperature",
		"top_p",
		"min_p",
		"repetition_penalty",
		"max_tokens",
		"response_format",
		"prompt",
		"response",
		"response_time",
		"responsiveness",
		"roleplaying",
		"quality",
		"action_appropriateness",
		"target_selection",
		"explanation"
	];
	const headers = headersArr.join(',');

	const modelDirPath = path.join(__dirname, "..", "models", sanitize(modelName));
	if (!fs.existsSync(modelDirPath)) {
		fs.mkdirSync(modelDirPath);
	}

	const responseDirPath = path.join(modelDirPath, "scores");
	if (!fs.existsSync(responseDirPath)) {
		fs.mkdirSync(responseDirPath);
	}

	const responseFileName = sanitize(`scores_${utils.getTimestampString()}.csv`);
	const responseFilePath = path.join(responseDirPath, responseFileName);
	fs.writeFileSync(responseFilePath, headers + '\r\n');

	return responseFilePath;
}

export default async (settingsStr: string, csvData: string, sender: WebContents) => {
	const settings: utils.Settings = JSON.parse(settingsStr);

	if (!settings.model) throw new Error("settings did not include required field: model");
	if (!settings.url) throw new Error("settings did not include required field: url");
	
	writeAggregateScoreFile();

	let rows = [];
	try {
		rows = await generateScores(settings, csvData, sender);
	} finally {
		// discard empty response files
		if (rows.length === 0) {
			fs.unlinkSync(scoreFilePath);
		}
	}

	return rows;
};
