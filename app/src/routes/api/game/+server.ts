import type { RequestHandler } from './$types';
import { Configuration, OpenAIApi, type ChatCompletionFunctions } from 'openai-edge';
import { API_KEY_OPENAI } from '$env/static/private';
import type { Message } from 'ai';

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

	// The AI can choose to call these functions to describe any damages that have taken place
	const damageReport: Game.ShipsDamage = {};
	const damageReportSchema: ChatCompletionFunctions['parameters'] = {
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
	};
	const writePlayerDamageReport = (report: Game.ShipDamageReport) => {
		if (
			report.shipName &&
			(report.shields || report.weapons || report.communications || report.engines)
		) {
			console.log('INFO 🚀 writePlayerDamageReport returned valid report', report);
			damageReport.playerShip = {
				shipName: 'IFS Dauntless',
				shields: report.shields,
				weapons: report.weapons,
				communications: report.communications,
				engines: report.engines
			};
		} else {
			console.log('WARNING ⚠️ writePlayerDamageReport returned invalid report', report);
		}
	};
	const writeEnemyDamageReport = (report: Game.ShipDamageReport) => {
		if (
			report.shipName &&
			(report.shields || report.weapons || report.communications || report.engines)
		) {
			console.log('INFO 🚀 writeEnemyDamageReport returned valid report', report);
			damageReport.enemyShip = {
				shipName: 'Enemy ship',
				shields: report.shields,
				weapons: report.weapons,
				communications: report.communications,
				engines: report.engines
			};
		} else {
			console.log('WARNING ⚠️ writeEnemyDamageReport returned invalid report', report);
		}
	};

	// Describe game functions the AI can call
	const gameFunctions: ChatCompletionFunctions[] = [
		{
			name: 'writePlayerDamageReport',
			description:
				"A damage report describing any damage the captain's ship (IFS Dauntless) has taken.",
			parameters: damageReportSchema
		},
		{
			name: 'writeEnemyDamageReport',
			description: 'A damage report describing damage that an enemy ship has taken.',
			parameters: damageReportSchema
		}
	];

	// Send prompt to the AI
	const response = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo-0613',
		messages: [{ role: 'user', content: prompt.text }],
		functions: gameFunctions,
		function_call: 'auto' // This is the default when specifying functions but we will be explicit
	});

	// Parse response
	const completion: {
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
	} = await response.json();

	// Get response
	const message = completion.choices[0].message;

	// Pass response to call functions
	if (message.function_call) {
		const availableFunctions: Record<string, (args: Record<string, any>) => void> = {
			writePlayerDamageReport: writePlayerDamageReport,
			writeEnemyDamageReport: writeEnemyDamageReport
		};

		// Parse the function the AI wants to run along with its arguments
		const nameOfFunctionAIWantsToRun: string = message.function_call.name;
		const functionAIWantsToRun: (args: Record<string, any>) => void =
			availableFunctions[nameOfFunctionAIWantsToRun];
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

	// Return the response
	return new Response(JSON.stringify(damageReport));
};
