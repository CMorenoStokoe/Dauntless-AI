import type { RequestHandler } from './$types';
import { API_KEY_STABILITY } from '$env/static/private';

const engineId = 'stable-diffusion-v1-5';
const apiHost = 'https://api.stability.ai';
const apiKey = API_KEY_STABILITY;

/**
 * * Generative image AI
 * Send a prompt to a generative image AI model to generate an image based on it
 * @param {string} request.body A request where the body contains a prompt
 * @returns An image generated from the prompt
 */

export const POST: RequestHandler = async ({ request }) => {
	// Get prompt from request
	const prompt: { text: string } = await request.json();

	// Clip it to the limit
	if (prompt.text.length > 345) {
		prompt.text = prompt.text.substring(0, 345);
	}

	// Send the prompt to the AI API
	const response = await fetch(`${apiHost}/v1/generation/${engineId}/text-to-image`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			text_prompts: [prompt],
			cfg_scale: 7,
			clip_guidance_preset: 'FAST_BLUE',
			height: 600,
			width: 800,
			samples: 1,
			steps: 20,
			style_preset: 'pixel_art'
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
