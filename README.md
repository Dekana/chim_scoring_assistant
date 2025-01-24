# CHIM Scoring Assistant

This application is a tool to assist with ranking large language models (LLMs) for use in the CHIM Skyrim mod. It allows you to:

* Use exported context logs from CHIM to generate responses from an LLM
* Get a different LLM to score those responses
* View the average scores in a table

See the CHIM discord for more details.

## Usage

Run the application using the `chim_scoring_assistant.exe` file. Refer to the application's "Instructions" tab for more detailed instructions.

The application remembers your LLM settings and the prompts file when you click the "Generate" button. This means you shouldn't need to re-enter this information the next time you use the application.

Only the average scores are displayed within the application. However, all LLM responses and score explanations are saved in the "models" folder for your reference.

## Scoring

LLM responses are evaluated on five criteria, each on a scale of 1 to 5. The specific prompts used for scoring are defined in the `scorePrompt.txt` file.

The five criteria are:

1. **Responsiveness:** How well the LLM's response addressed the player's prompt.
2. **Roleplaying:** How effectively the LLM roleplayed as its assigned character.
3. **Quality:** Overall quality of the response, considering humor, wit, depth, originality, and appropriateness.
4. **Action:** How suitable the selected action was in the context of the scene.
5. **Target:** How well the AI selected a target for its action (if applicable).

## Manual Adjustments

The application makes some manual adjustments to the scores:

* All scores are overridden with a 1 if the response is not valid JSON (as this is unusable in CHIM).
* The AI judges the suitability of the selected action, but the application overrides the score with a 1 if it's an unrecognized action.
* The target score is calculated without AI input. If the selected action requires a target (like "Attack") but has no target specified, the target score is set to 1. Slightly incorrect targets get a 4, while correctly set targets get a 5.

## AI Service-Specific Settings

*   **OpenAI:** When using OpenAI models, use `max_completion_tokens` instead of `max_tokens`. Leave the `min_p` field blank, as it is not supported by the OpenAI API and will cause errors.
*   **OpenRouter:** When selecting specific Providers on OpenRouter, check that provider's documentation on OpenRouter for the model. Not all fields are universally supported across all providers. For example, when using the Fireworks AI provider through OpenRouter, the `json_schema` parameter is usable, but the `min_p` parameter must be left blank.
*   **LM Studio (Local):** When using a locally running LM Studio instance, a model name is still required in the application. This name is used for organizing and saving results in the correct folders within the application, even though LM Studio itself doesn't strictly require a model name in the API request. The API key field can be left blank when using a local LM Studio instance.

## Known Issues / TODO

* The `scorePrompt.txt` file may need some refinement.
* The prompts file must be enclosed in single quotes rather than double quotes. This is to avoid some problems with incorrect json in the CHIM logs.
* The application does not currently support actions from the CHIM plugin "Min AI". These actions will result in an action score of 1 as unrecognized.
* Error handling could be improved. Currently, the results of a run are lost if an error occurs. Ideally, partial results would be logged to the "Results" tab or saved to a file.
* An optional configurable wait time between requests to the LLM could be added to mitigate rate limits.

## Building the project

Requires Nodejs.
1. Clone the repository.
2. Open a command prompt in the cloned folder with admin rights and type `corepack enable` to enable Yarn.
3. Type `yarn`, `yarn tsc`, and then `yarn start` to launch the app locally.
4. Or type `yarn`, `yarn tsc` and then `yarn make` to build the exe and zip files used in releases.
