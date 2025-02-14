/// <reference types="papaparse" />

let promptCsvBuffer: ArrayBuffer;
let promptCsvData: object[];
let responses: object[];

interface Settings {
	url?: string,
	api_key?: string,
	model?: string,
	provider_order?: string,
	temperature?: number,
	top_p?: number,
	min_p?: number,
	repetition_penalty?: number,
	max_tokens?: number,
	max_completion_tokens?: number;
	response_format_type?: string
}

interface TableRow {
	timestamp?: string;
	model?: string;
	provider?: string;
	url?: string;
	temperature?: string;
	top_p?: string;
	min_p?: string;
	repetition_penalty?: string;
	max_tokens?: string;
	response_format?: string;
	scored_response_count?: string;
	average_response_time?: string;
	average_responsiveness?: string;
	average_roleplaying?: string;
	average_quality?: string;
	average_action_appropriateness?: string;
	average_target_selection?: string;
}

interface APIResponse {
	status: string;
	responses: object[];
	errorMessage: string;
}

async function setDefaultPrompts(promptsStr: string) {
	const promptLoadResult = document.getElementById('upload-prompts-result') as HTMLSpanElement;

	try {
		if (!promptsStr) {
			promptLoadResult.innerHTML = `
			<div class="alert alert-info show">
				Select a CSV file containing the prompts for the LLM being scored.
			</div>`;
			toggleResponseButton(false);
		} else {
			const prompts = JSON.parse(promptsStr);
			if (prompts.length) {
				promptCsvData = prompts;
				promptLoadResult.innerHTML = `
				<div class="alert alert-success show">
					Loaded ${prompts.length} prompts.
				</div>`;
				toggleResponseButton(true);
			} else {
				promptLoadResult.innerHTML = `
				<div class="alert alert-info show">
					Could not find any data in the selected CSV file.<br />
					Select a CSV file containing the prompts for the LLM being scored.
				</div>`;
				toggleResponseButton(false);
			}
		}
	} catch (err) {
		promptLoadResult.innerHTML = `
		<div class="alert alert-danger show">
			Error loading the prompts CSV file: ${escapeHtml(err.message)}
		</div>`;
		toggleResponseButton(false);
	}
}

function onPromptFileChange(event: Event) {
	const promptLoadResult = document.getElementById('upload-prompts-result') as HTMLSpanElement;
    const input = event.target as HTMLInputElement;
	const file: File | undefined = input.files ? input.files[0] : undefined;

	if (file) {
		if (file.type !== 'text/csv' && !file.name.endsWith(".csv")) {
			promptLoadResult.innerHTML = `
			<div class="alert alert-info show">
				Select a CSV file containing the prompts for the LLM being scored.
			</div>`;
			toggleResponseButton(false);
			input.value = ''; // Clear the invalid selection
		} else {
			Papa.parse(file, {
				header: true,
				quoteChar: "'",
				skipEmptyLines: true,
				complete: async function(results) {
					const rows = results.data.length;
					if (rows) {
						promptCsvData = results.data as object[];
						promptCsvBuffer = await file.arrayBuffer();
						promptLoadResult.innerHTML = `
						<div class="alert alert-success show">
							Loaded ${rows} prompts.
						</div>`;
						toggleResponseButton(true);
					} else {
						promptLoadResult.innerHTML = `
						<div class="alert alert-warning show">
							Could not find any data in the selected CSV file.<br />
							Select a CSV file containing the prompts for the LLM being scored.
						</div>`;
						toggleResponseButton(false);
						input.value = ''; // Clear the invalid selection
					}
				},
				error: function(err) {
					promptLoadResult.innerHTML = `
					<div class="alert alert-danger show">
						Error loading the prompts CSV file: ${escapeHtml(err.message)}
					</div>`;
					toggleResponseButton(false);
					input.value = ''; // Clear the invalid selection
				}
			});
		}
	} else {
		promptLoadResult.innerHTML = `
		<div class="alert alert-info show">
			Select a CSV file containing the prompts for the LLM being scored.
		</div>`;
		toggleResponseButton(false);
	}
}

function onResponsesFileChange(event: Event) {
	const responsesLoadResult = document.getElementById('upload-responses-result') as HTMLSpanElement;
    const input = event.target as HTMLInputElement;
	const file: File | undefined = input.files ? input.files[0] : undefined;

	if (file) {
		if (file.type !== 'text/csv' && !file.name.endsWith(".csv")) {
			responsesLoadResult.innerHTML = `
			<div class="alert alert-info show">
				First generate the responses to be scored, or select a CSV file containing the responses.
			</div>`;
			toggleScoreButton(false);
			input.value = ''; // Clear the invalid selection
		} else {
			Papa.parse(file, {
				header: true,
				skipEmptyLines: true,
				complete: function(results) {
					const rows = results.data.length;
					if (rows) {
						responses = results.data as object[];
						responsesLoadResult.innerHTML = `
						<div class="alert alert-success show">
							Loaded ${rows} responses.
						</div>`;
						toggleScoreButton(true);
					} else {
						responsesLoadResult.innerHTML = `
						<div class="alert alert-warning show">
							Could not find any data in the selected CSV file.<br />
							First generate the responses to be scored, or select a CSV file containing the responses.
						</div>`;
						toggleScoreButton(false);
						input.value = ''; // Clear the invalid selection
					}
				},
				error: function(err) {
					responsesLoadResult.innerHTML = `
					<div class="alert alert-danger show">
						Error loading the responses CSV file: ${escapeHtml(err.message)}
					</div>`;
					toggleScoreButton(false);
					input.value = ''; // Clear the invalid selection
				}
			});
		}
	} else {
		responsesLoadResult.innerHTML = `
		<div class="alert alert-info show">
			First generate the responses to be scored, or select a CSV file containing the responses.
		</div>`;
		toggleScoreButton(false);
	}
}

async function onGenerateResponsesClick() {
	const generateResponsesResult = document.getElementById('generate-responses-result');
	const generateScoresResult = document.getElementById('generate-scores-result');
	const uploadResponsesResult = document.getElementById('upload-responses-result');
	const responseSettings = getSettingsFromInputs("response-");

	generateResponsesResult.innerHTML = '';
	generateScoresResult.innerHTML = '';
	
	toggleResponseButton(false);
	toggleScoreButton(false);
	toggleSpinners(true);
	try {
		const responseStr = await window.electronAPI.generateResponses(JSON.stringify(responseSettings, null, 2), promptCsvBuffer, JSON.stringify(promptCsvData));
		const response: APIResponse = JSON.parse(responseStr);
		if (response.errorMessage) {
			throw new Error(response.errorMessage);
		}

		if (response.responses.length > 0) {
			generateResponsesResult.innerHTML = `
				<div class="alert alert-success show">
					Created ${response.responses.length} responses. Ready to generate scores.
				</div>`;
			
			responses = response.responses;
			uploadResponsesResult.innerHTML = `
				<div class="alert alert-success show">
					Loaded ${responses.length} prompts.
				</div>`;
			toggleScoreButton(true);
		} else {
			generateResponsesResult.innerHTML = `
				<div class="alert alert-warning show">
					No responses were generated. Confirm that the prompts CSV is in the correct format.
				</div>`;
		}
	} catch (err) {
		generateResponsesResult.innerHTML = `
			<div class="alert alert-danger show">
				An error occurred while generating responses:<br />${escapeHtml(err.message)}
			</div>`;
	} finally {
		toggleResponseButton(true);
		toggleSpinners(false);
		document.getElementById("response-button-text").innerText = "Generate Responses";
	}
}

async function onGenerateScoresClick() {
	const generateResponsesResult = document.getElementById('generate-responses-result');
	const generateScoresResult = document.getElementById('generate-scores-result');
	const scoreSettings = getSettingsFromInputs("score-");

	generateResponsesResult.innerHTML = '';
	generateScoresResult.innerHTML = '';
	
	toggleResponseButton(false);
	toggleScoreButton(false);
	toggleSpinners(true);
	try {
		const responseStr = await window.electronAPI.generateScores(JSON.stringify(scoreSettings, null, 2), JSON.stringify(responses));
		const response: APIResponse = JSON.parse(responseStr);
		if (response.errorMessage) {
			throw new Error(response.errorMessage);
		}

		if (response.responses.length > 0) {
			generateScoresResult.innerHTML = `
				<div class="alert alert-success show">
					Scored ${response.responses.length} responses. Added average scores to the Results tab.
				</div>`;
		} else {
			generateScoresResult.innerHTML = `
				<div class="alert alert-warning show">
					No scores were generated. Confirm that the responses CSV is in the correct format.
				</div>`;
		}
	} catch (err) {
		generateScoresResult.innerHTML = `
			<div class="alert alert-danger show">
				An error occurred while generating scores:<br />${escapeHtml(err.message)}
			</div>`;
	} finally {
		toggleResponseButton(true);
		toggleScoreButton(true);
		toggleSpinners(false);
		document.getElementById("score-button-text").innerText = "Generate Scores";
	}

	// rebuild results table
	await buildResultsTable();
}

function getSettingsFromInputs(prefix: string) {
	const urlInput = document.getElementById(`input-${prefix}url`) as HTMLInputElement;
	const apiKeyInput = document.getElementById(`input-${prefix}api-key`) as HTMLInputElement;
	const modelInput = document.getElementById(`input-${prefix}model`) as HTMLInputElement;
	const providerInput = document.getElementById(`input-${prefix}provider`) as HTMLInputElement;
	const temperatureInput = document.getElementById(`input-${prefix}temperature`) as HTMLInputElement;
	const topPInput = document.getElementById(`input-${prefix}top-p`) as HTMLInputElement;
	const minPInput = document.getElementById(`input-${prefix}min-p`) as HTMLInputElement;
	const repetitionPenaltyInput = document.getElementById(`input-${prefix}repetition-penalty`) as HTMLInputElement;
	const maxTokensInput = document.getElementById(`input-${prefix}max-tokens`) as HTMLInputElement;
	const maxTokensCheckbox = document.getElementById(`checkbox-${prefix}max-tokens`) as HTMLInputElement;
	const maxCompletionTokensCheckbox = document.getElementById(`checkbox-${prefix}max-completion-tokens`) as HTMLInputElement;
	const responseFormatJsonObject = document.getElementById(`input-${prefix}response-format-json-object`) as HTMLInputElement;
	const responseFormatJsonSchema = document.getElementById(`input-${prefix}response-format-json-schema`) as HTMLInputElement;

	const settings: Settings = {};
	if (urlInput.value) settings.url = urlInput.value;
	if (apiKeyInput.value) settings.api_key = apiKeyInput.value;
	if (modelInput.value) settings.model = modelInput.value;
	if (providerInput.value) settings.provider_order = providerInput.value;
	if (temperatureInput.value && !isNaN(temperatureInput.value as unknown as number)) settings.temperature = parseFloat(temperatureInput.value);
	if (topPInput.value && !isNaN(temperatureInput.value as unknown as number)) settings.top_p = parseFloat(topPInput.value);
	if (minPInput.value && !isNaN(temperatureInput.value as unknown as number)) settings.min_p = parseFloat(minPInput.value);
	if (repetitionPenaltyInput.value && !isNaN(temperatureInput.value as unknown as number)) settings.repetition_penalty = parseFloat(repetitionPenaltyInput.value);

	// get radio button values
	if (maxTokensCheckbox.checked && maxTokensInput.value && !isNaN(temperatureInput.value as unknown as number)) {
		settings.max_tokens = parseFloat(maxTokensInput.value);
	}
	if (maxCompletionTokensCheckbox.checked && maxCompletionTokensCheckbox.value && !isNaN(temperatureInput.value as unknown as number)) {
		settings.max_completion_tokens = parseFloat(maxCompletionTokensCheckbox.value);
	}
	if (responseFormatJsonObject.checked) {
		settings.response_format_type = "json_object"
	}
	if (responseFormatJsonSchema.checked) {
		settings.response_format_type = "json_schema"
	}

	return settings;
}

function setSettings(settingsStr: string, prefix: string) {
	try {
		const settings: Settings = JSON.parse(settingsStr);
		const urlInput = document.getElementById(`input-${prefix}url`) as HTMLInputElement;
		const apiKeyInput = document.getElementById(`input-${prefix}api-key`) as HTMLInputElement;
		const modelInput = document.getElementById(`input-${prefix}model`) as HTMLInputElement;
		const providerInput = document.getElementById(`input-${prefix}provider`) as HTMLInputElement;
		const temperatureInput = document.getElementById(`input-${prefix}temperature`) as HTMLInputElement;
		const topPInput = document.getElementById(`input-${prefix}top-p`) as HTMLInputElement;
		const minPInput = document.getElementById(`input-${prefix}min-p`) as HTMLInputElement;
		const repetitionPenaltyInput = document.getElementById(`input-${prefix}repetition-penalty`) as HTMLInputElement;
		const maxTokensInput = document.getElementById(`input-${prefix}max-tokens`) as HTMLInputElement;
		const maxTokensCheckbox = document.getElementById(`checkbox-${prefix}max-tokens`) as HTMLInputElement;
		const maxCompletionTokensCheckbox = document.getElementById(`checkbox-${prefix}max-completion-tokens`) as HTMLInputElement;
		const responseFormatNone = document.getElementById(`input-${prefix}response-format-none`) as HTMLInputElement;
		const responseFormatJsonObject = document.getElementById(`input-${prefix}response-format-json-object`) as HTMLInputElement;
		const responseFormatJsonSchema = document.getElementById(`input-${prefix}response-format-json-schema`) as HTMLInputElement;
	
	
		urlInput.value = settings.url || '';
		apiKeyInput.value = settings.api_key || '';
		modelInput.value = settings.model || '';
		providerInput.value = settings.provider_order || '';
		temperatureInput.value = settings.temperature !== undefined ? settings.temperature.toString() : '';
		topPInput.value = settings.top_p !== undefined ? settings.top_p.toString() : '';
		minPInput.value = settings.min_p !== undefined ? settings.min_p.toString() : '';
		repetitionPenaltyInput.value = settings.repetition_penalty !== undefined ? settings.repetition_penalty.toString() : '';

		// Handle radio buttons
		if (settings.max_completion_tokens !== undefined) {
			maxTokensCheckbox.checked = false;
			maxCompletionTokensCheckbox.checked = true;
			maxTokensInput.value = settings.max_completion_tokens.toString() || '';
		} else {
			maxTokensCheckbox.checked = true;
			maxCompletionTokensCheckbox.checked = false;
			maxTokensInput.value = settings.max_tokens !== undefined ? settings.max_tokens.toString() || '' : '';
		}

		const responseFormat = settings.response_format_type;
		if (responseFormat === 'json_object') {
			responseFormatNone.checked = false;
			responseFormatJsonObject.checked = true;
			responseFormatJsonSchema.checked = false;
		} else if (responseFormat === 'json_schema') {
			responseFormatNone.checked = false;
			responseFormatJsonObject.checked = false;
			responseFormatJsonSchema.checked = true;
		} else {
			responseFormatNone.checked = true; // Default to "None"
			responseFormatJsonObject.checked = false;
			responseFormatJsonSchema.checked = false;
		}
	} catch {
		// fail silently
	}
}

async function buildResultsTable() {
	const aggregateResultsTableDiv = document.getElementById('results-table-container') as HTMLElement;
	const showSettingsCheckbox = document.getElementById("toggle-settings-columns") as HTMLInputElement;
	const toggleClass = showSettingsCheckbox.checked ? "" : ' class="d-none"';

	let rows: TableRow[] = [];
	try {
		const scoreStr = await window.electronAPI.getAggregateScores();
		rows = JSON.parse(scoreStr);
	} catch {
		aggregateResultsTableDiv.innerHTML = 'No scores found.';
	}
	
	if (rows && rows.length > 0) {
		// add a checkbox here to toggle the settings columns
		let htmlStr = `<table id="aggregateResults" class="table table-striped table-sm table-bordered">
			<thead>
				<tr>
					<th>date</th>
					<th>model</th>
					<th${toggleClass}>provider</th>
					<th${toggleClass}>url</th>
					<th${toggleClass}>temperature</th>
					<th${toggleClass}>top_p</th>
					<th${toggleClass}>min_p</th>
					<th${toggleClass}>repetition_penalty</th>
					<th${toggleClass}>max_tokens</th>
					<th${toggleClass}>response_format</th>
					<th>responses</th>
					<th>average response time</th>
					<th>responsiveness</th>
					<th>roleplaying</th>
					<th>quality</th>
					<th>action</th>
					<th>target</th>
				</tr>
			</thead><tbody>`;
				
		for (const row of rows) {
			htmlStr += '<tr>';
			htmlStr += `<td>${escapeHtml(row.timestamp) || ""}</td>`;
			htmlStr += `<td>${escapeHtml(row.model) || ""}</td>`;
			htmlStr += `<td${toggleClass}>${escapeHtml(row.provider) || ""}</td>`;
			htmlStr += `<td${toggleClass}>${escapeHtml(row.url) || ""}</td>`;
			htmlStr += `<td${toggleClass}>${escapeHtml(row.temperature) || ""}</td>`;
			htmlStr += `<td${toggleClass}>${escapeHtml(row.top_p) || ""}</td>`;
			htmlStr += `<td${toggleClass}>${escapeHtml(row.min_p) || ""}</td>`;
			htmlStr += `<td${toggleClass}>${escapeHtml(row.repetition_penalty) || ""}</td>`;
			htmlStr += `<td${toggleClass}>${escapeHtml(row.max_tokens) || ""}</td>`;
			htmlStr += `<td${toggleClass}>${escapeHtml(row.response_format) || ""}</td>`;
			htmlStr += `<td>${escapeHtml(row.scored_response_count) || ""}</td>`;
			htmlStr += `<td>${escapeHtml(row.average_response_time) || ""}</td>`;
			htmlStr += `<td>${escapeHtml(row.average_responsiveness) || ""}</td>`;
			htmlStr += `<td>${escapeHtml(row.average_roleplaying) || ""}</td>`;
			htmlStr += `<td>${escapeHtml(row.average_quality) || ""}</td>`;
			htmlStr += `<td>${escapeHtml(row.average_action_appropriateness) || ""}</td>`;
			htmlStr += `<td>${escapeHtml(row.average_target_selection) || ""}</td>`;
			htmlStr += '</tr>';
		}

		htmlStr += "</tbody></table>";
		aggregateResultsTableDiv.innerHTML = htmlStr;
	}
}

function toggleResponseButton(status: boolean) {
	const responsesButton = document.getElementById("btn-generate-responses") as HTMLButtonElement;
	responsesButton.disabled = !status;
}

function toggleScoreButton(status: boolean) {
	const scoresButton = document.getElementById("btn-generate-scores") as HTMLButtonElement;
	scoresButton.disabled = !status;
}

function toggleSpinners(status: boolean) {
	const responseSpinner = document.getElementById("response-button-spinner");
	const scoreSpinner = document.getElementById("score-button-spinner");
	const promptsUpload = document.getElementById("file-upload-prompts") as HTMLInputElement;
	const responsesUpload = document.getElementById("file-upload-responses") as HTMLInputElement;

	if (status) {
		responseSpinner.classList.remove("d-none");
		scoreSpinner.classList.remove("d-none");
		promptsUpload.disabled = true;
		responsesUpload.disabled = true;
	} else {
		responseSpinner.classList.add("d-none");
		scoreSpinner.classList.add("d-none");
		promptsUpload.disabled = null;
		responsesUpload.disabled = null;
	}
}

function escapeHtml(unsafe: string) {
	if (!unsafe) {
		return "";
	}

    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

window.onload = async function() {
	document.getElementById("file-upload-prompts").addEventListener("change", onPromptFileChange);
	document.getElementById("file-upload-responses").addEventListener("change", onResponsesFileChange);
	document.getElementById("btn-generate-responses").addEventListener("click", async () => {
		await onGenerateResponsesClick();
	});
	document.getElementById("btn-generate-scores").addEventListener("click", async () => {
		onGenerateScoresClick();
	});
	document.getElementById("toggle-settings-columns").addEventListener("change", buildResultsTable);
	await window.electronAPI.incrementGenerateResponses(async (processed: number, skipped: number, total: number) => {
		document.getElementById("response-button-text").innerText = `Generate Responses: ${processed + skipped} / ${total} (${skipped} skipped)`
	});
	await window.electronAPI.incrementGenerateScores(async (processed: number, skipped: number, total: number) => {
		document.getElementById("score-button-text").innerText = `Generate Scores: ${processed + skipped} / ${total} (${skipped} skipped)`
	});
	try {
		const promptsStr = await window.electronAPI.getPrompts();
		await setDefaultPrompts(promptsStr);
	} catch {
		// fail silently
	}
	try {
		const settingsStr = await window.electronAPI.getResponseSettings();
		setSettings(settingsStr, "response-");
	} catch {
		// fail silently
	}
	try {
		const settingsStr = await window.electronAPI.getScoreSettings();
		setSettings(settingsStr, "score-");
	} catch {
		// fail silently
	}
	await buildResultsTable();
};
