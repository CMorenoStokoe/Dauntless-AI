import type { RequestHandler } from './$types';
import { Configuration, OpenAIApi, type ChatCompletionFunctions } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { API_KEY_OPENAI } from '$env/static/private';
import { describePhenomenonPrompt } from '$lib/prompts/promps';

/**
 * * Generative chat AI
 * Send message(s) to a generative chat AI to generate a response
 * @param {CreateChatCompletionRequest.messages} request.json.messages A request where the body contains message(s) sent to the AI
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
	// Get a list of message(s) sent by the user, including previous ones
	const { messages } = await request.json();

	// Send the users response to the api with context from previous messages
	const response = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		stream: true, // Return a stream so we can show it live as it comes in
		messages
	});

	// Create a stream from these responses as they come in
	const stream = OpenAIStream(response);

	// Return a stream of text responses as they are returned by the ai
	return new StreamingTextResponse(stream);
};
