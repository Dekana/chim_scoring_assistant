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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Papa = __importStar(require("papaparse"));
const sanitize_filename_ts_1 = require("sanitize-filename-ts");
const utils = __importStar(require("./utils"));
// prevent meta properties from entering the POST settings
function cleanSettings(settings) {
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
        settings.provider = { order: [settings.provider_order], require_parameters: true };
        delete settings.provider_order;
    }
    return { url, apiKey };
}
function getResponseFormat(response_format_type) {
    if (response_format_type === "json_object") {
        return {
            type: "json_object"
        };
    }
    else if (response_format_type === "json_schema") {
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
        };
    }
    else {
        return;
    }
}
async function sendToLLM(url, apiKey, postBody) {
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
        return { response: result["choices"][0]["message"]["content"], responseTime: responseTime };
    }
    catch {
        return { response: '', responseTime: 0 };
    }
}
async function generateResponses(settings, csvData, responseFilePath, sender) {
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
        const promptStr = promptRow.prompt;
        if (promptStr.indexOf("#CHAT HISTORY#") >= 0) {
            skipped++;
            continue; // skip if the prompt was for a summary
        }
        const prompt = {
            messages: messages,
            stream: false,
            ...settings
        };
        const { response, responseTime } = await sendToLLM(url, apiKey, prompt);
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
        const csvString = Papa.unparse([result], { header: false });
        fs.appendFileSync(responseFilePath, csvString + '\r\n');
        responses.push(result);
        sendIncrementEvent(sender, responses.length, skipped, prompts.length);
    }
    return responses;
}
function sendIncrementEvent(sender, processed, skipped, total) {
    sender.send('incrementGenerateResponses', processed, skipped, total);
}
function writeResponseFile(modelName) {
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
    const modelDirPath = path.join(__dirname, "..", "models", (0, sanitize_filename_ts_1.sanitize)(modelName));
    if (!fs.existsSync(modelDirPath)) {
        fs.mkdirSync(modelDirPath);
    }
    const responseDirPath = path.join(modelDirPath, "responses");
    if (!fs.existsSync(responseDirPath)) {
        fs.mkdirSync(responseDirPath);
    }
    const responseFileName = (0, sanitize_filename_ts_1.sanitize)(`responses_${utils.getTimestampString()}.csv`);
    const responseFilePath = path.join(responseDirPath, responseFileName);
    fs.writeFileSync(responseFilePath, headers + '\r\n');
    return responseFilePath;
}
exports.default = async (settingsStr, csvData, sender) => {
    const settings = JSON.parse(settingsStr);
    if (!settings.model)
        throw new Error("settings did not include required field: model");
    if (!settings.url)
        throw new Error("settings did not include required field: url");
    const responseFilePath = writeResponseFile(settings.model);
    let rows = [];
    try {
        rows = await generateResponses(settings, csvData, responseFilePath, sender);
    }
    finally {
        // discard empty response files
        if (rows.length === 0) {
            fs.unlinkSync(responseFilePath);
        }
    }
    return rows;
};
