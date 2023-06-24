import type { RequestHandler } from './$types';
import { Configuration, OpenAIApi, type ChatCompletionFunctions } from 'openai-edge';
import { API_KEY_OPENAI } from '$env/static/private';
import { describePhenomenonPrompt } from '$lib/prompts/promps';

/**
 * * Gameplay AI
 * Send an ai-generated scenario back to generative AI so we can call game play functions from it
 * @param {string} request.json.scenario A request where the body contains the scenario sent by AI
 * @returns A chat response generated from previous message(s)
 */

// Configure open ai api access
const config = new Configuration({
	apiKey: API_KEY_OPENAI
});

// Initialize api object
const openai = new OpenAIApi(config);

// Access point for out app to call the api
export const POST: RequestHandler = async ({ request }) => {
	// Get prompt from request
	const prompt: { text: string } = await request.json();

	// Initialise variables the AI can set
	const variablesAICanSet: {
		damageReport: Game.ShipsDamage;
		newLocation: { description: string | undefined };
	} = {
		damageReport: {},
		newLocation: { description: undefined }
	};

	// Define functions the AI can run to set variables in a more reliable and structured way
	const functionsAICanRun: {
		writePlayerDamageReport: (report: Game.ShipDamageReport) => void;
		describeNewLocation: (description: { description: string; wasDetected: boolean }) => void;
	} = {
		writePlayerDamageReport: (report: Game.ShipDamageReport) => {
			if (
				report.shipName &&
				(report.shields || report.weapons || report.communications || report.engines)
			) {
				console.log('INFO 🚀 writePlayerDamageReport returned valid report', report);
				variablesAICanSet.damageReport.playerShip = {
					shipName: 'IFS Dauntless',
					shields: report.shields,
					weapons: report.weapons,
					communications: report.communications,
					engines: report.engines
				};
			} else {
				console.log('WARNING ⚠️ writePlayerDamageReport returned invalid report', report);
			}
		},
		describeNewLocation: (description: { description: string; wasDetected: boolean }) => {
			if (description.description) {
				if (description.wasDetected) {
					variablesAICanSet.newLocation.description = description.description;
					console.log('INFO 🚀 writePlayerDamageReport returned valid description', description);
				}
				console.log('INFO 🚀 writePlayerDamageReport no object detected', description);
			} else {
				console.log('WARNING ⚠️ describeNewLocation returned invalid description', description);
			}
		}
	};

	// Describe game functions the AI can call
	const gameFunctions: ChatCompletionFunctions[] = [
		{
			name: 'describeNewLocation',
			description:
				'Is there an interstellar object, such as a planet, star, moon, black hole, pulsar, nebula or space station?',
			parameters: {
				type: 'object',
				properties: {
					wasDetected: {
						type: 'boolean',
						description: 'Is there an interstellar object in this text?'
					},
					description: {
						type: 'string',
						description: describePhenomenonPrompt.content
					}
				}
			}
		},
		{
			name: 'writePlayerDamageReport',
			description: "If the captain's ship, IFS Dauntless, has taken damage, write a damage report.",
			parameters: {
				type: 'object',
				properties: {
					shipName: {
						type: 'string',
						description: 'The name of the ship that has been damaged.'
					},
					shields: {
						type: 'number',
						description:
							"The amount damage taken to this ship's shields, provided as an integer from 0 to 50 depending on the severity of damage. Eg, 10 represents light damage, 30 represents severe damage."
					},
					communications: {
						type: 'number',
						description:
							"The status of damage taken to this ship's communications, provided as an integer from 0 to 50 depending on the severity of damage. Eg, 10 represents light damage, 30 represents severe damage."
					},
					weapons: {
						type: 'number',
						description:
							"The status of damage taken to this ship's weapons, provided as an integer from 0 to 50 depending on the severity of damage. Eg, 10 represents light damage, 30 represents severe damage."
					},
					engines: {
						type: 'number',
						description:
							"The status of damage taken to this ship's engines, provided as an integer from 0 to 50 depending on the severity of damage. Eg, 10 represents light damage, 30 represents severe damage.."
					}
				},
				required: ['shipName']
			}
		}
	];

	// Run any fumctions called by the AI
	const runAIFunctions = (completion: {
		id: string;
		object: string;
		created: number;
		model: string;
		choices: [
			{
				index: 0;
				message: {
					role: string;
					content: string | null;
					function_call: { name: string; arguments: string };
				};
				finish_reason: string;
			}
		];
		usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
	}) => {
		// Get response
		const message = completion.choices[0].message;

		// Pass response to call functions
		if (message.function_call) {
			const availableFunctions: {
				writePlayerDamageReport: (args: Game.ShipDamageReport) => void;
				describeNewLocation: (args: { description: string; wasDetected: boolean }) => void;
			} = {
				writePlayerDamageReport: functionsAICanRun.writePlayerDamageReport,
				describeNewLocation: functionsAICanRun.describeNewLocation
			};

			// Parse the function the AI wants to run along with its arguments
			const nameOfFunctionAIWantsToRun = message.function_call.name as
				| 'writePlayerDamageReport'
				| 'describeNewLocation';
			const functionAIWantsToRun = availableFunctions[nameOfFunctionAIWantsToRun];
			const functionArgs = JSON.parse(message.function_call.arguments);

			// Try running the function
			try {
				functionAIWantsToRun(functionArgs);
				console.log(
					'✅ SUCCESS: game/+server.ts: AI called function',
					nameOfFunctionAIWantsToRun,
					functionArgs
				);
			} catch (error) {
				console.log(
					'⚠️ WARNING: game/+server.ts: AI function call failed:',
					error,
					nameOfFunctionAIWantsToRun,
					functionArgs
				);
			}
		}
	};

	// Send prompt to the AI
	const response_describeNewLocation = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo-0613',
		messages: [{ role: 'user', content: 'Space:' + prompt.text }],
		functions: [gameFunctions[0]],
		function_call: { name: 'describeNewLocation' } // This is the default when specifying functions but we will be explicit
	});
	// Send prompt to the AI
	const response_writePlayerDamageReport = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo-0613',
		messages: [{ role: 'user', content: prompt.text }],
		functions: [gameFunctions[1]],
		function_call: { name: 'writePlayerDamageReport' } // This is the default when specifying functions but we will be explicit
	});
	const completion_response_describeNewLocation = await response_describeNewLocation.json();
	const completion_response_writePlayerDamageReport = await response_writePlayerDamageReport.json();
	runAIFunctions(completion_response_describeNewLocation);
	runAIFunctions(completion_response_writePlayerDamageReport);

	// Return the response
	const functionResponses: {
		damageReport: Game.ShipsDamage;
		newLocation: { description: string | undefined };
	} = {
		damageReport: variablesAICanSet.damageReport,
		newLocation: variablesAICanSet.newLocation
	};
	console.log('🚀 image prompt:', functionResponses.newLocation.description);
	return new Response(JSON.stringify(functionResponses));
};
