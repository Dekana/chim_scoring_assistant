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
* The AI judge's the suitability of the selected action, but the application overrides the score with a 1 if it's an unrecognized action.
* The target score is calculated without AI input. If the selected action requires a target (like "Attack") but has no target specified, the target score is set to 1. Slightly incorrect targets get a 4, while correctly set targets get a 5.

## Known Issues / TODO

* The `scorePrompt.txt` file may need some refinement.
* The prompts file must be enclosed in single quotes rather than double quotes. This is to avoid some problems with incorrect json in the CHIM logs.
* The application does not currently support actions from the CHIM plugin "Min AI". These actions will result in an action score of 1 as unrecognized.
* Error handling could be improved. Currently, the results of a run are lost if an error occurs. Ideally, partial results would be logged to the "Results" tab or saved to a file.
* An optional configurable wait time between requests to the LLM could be added to mitigate rate limits.
