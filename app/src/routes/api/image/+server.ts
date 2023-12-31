import type { RequestHandler } from './$types';
import { API_KEY_STABILITY } from '$env/static/private';

const engineId = 'stable-diffusion-xl-beta-v2-2-2';
const apiHost = 'https://api.stability.ai';
const apiKey = API_KEY_STABILITY;

/**
 * * Generative image AI
 * Send a prompt to a generative image AI model to generate an image based on it
 * @param {string} request.body A request where the body contains a prompt
 * @returns An image generated from the prompt
 */

//todo: add image upscaling https://api.stability.ai/docs#tag/v1generation/operation/upscaleImage

export const POST: RequestHandler = async ({ request }) => {
	// Get prompt from request
	const prompt: { text: string } = await request.json();

	// Send the prompt to the AI API
	const response = await fetch(`${apiHost}/v1/generation/${engineId}/text-to-image`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			engineId: 'stable-diffusion-xl-beta-v2-2-2',
			text_prompts: [prompt],
			height: 512,
			width: 896,
			samples: 1,
			steps: 50,
			style_preset: 'low-poly'
		})
	});

	// If the request is unsuccessful, show the error
	if (!response.ok) {
		console.log(`⚠️ WARNING: Image generation failed: ${await response.text()}`);
		return new Response('');
	}

	// If the response is successful, extract the return data containing the generated image
	const responseJSON: {
		artifacts: Array<{
			base64: string;
			seed: number;
			finishReason: string;
		}>;
	} = await response.json();

	// Get the generated image as a base64 encoded string
	const encodedImage = responseJSON.artifacts.at(0)!.base64;
	//const decodedImage = Buffer.from(encodedImage, 'base64');
	const encodedImageSrc = 'data:text/plain;base64,' + encodedImage;

	// Otherwise return the response
	return new Response(encodedImageSrc);
};
