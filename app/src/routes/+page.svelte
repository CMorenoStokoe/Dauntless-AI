<script lang="ts">
	import type { Message } from 'ai';
	import { useChat } from 'ai/svelte';
	import { writable } from 'svelte/store';
	import '@fortawesome/fontawesome-free/css/all.css';
	import '@fortawesome/fontawesome-free/js/all.js';
	import Icon from '../lib/components/Icon.svelte';
	import { initialisationAgentMessage, initialisationSystemMessage } from '../lib/prompts/promps';
	import { scrollToBottom } from '../lib/scroll';
	import Hud from '../lib/components/HUD.svelte';
	import defaultBridgeImage from '$lib/images/star.png';

	// Initialise environmental variables
	const loading = writable<boolean>(false); // Used to track when the app is loading an image response
	const calculating = writable<boolean>(false); // Used to track when the app is loading a text response
	const illustration = writable<string>(defaultBridgeImage); // An image encoded in base-64
	const ships = writable<Game.ShipsStatus>({
		playerShip: {
			shipName: 'IFS Dauntless',
			shields: 100,
			engines: 100,
			weapons: 100,
			communications: 100
		},
		enemyShip: {
			shipName: 'Enemy Ship',
			shields: 100,
			engines: 100,
			weapons: 100,
			communications: 100
		}
	}); // Used to track when the app is loading a response

	// 1: Interactive chat dialog for user to converse with simulation (OpenAI Chat Completion)
	const { messages, handleSubmit, input } = useChat({
		initialMessages: [initialisationSystemMessage, initialisationAgentMessage],
		onFinish: (message: Message) => {
			useChatFn(message.content); // Run game play functions
		}
	});

	// 2: Illustrate the response using AI image generation (Stability.ai / DALL-E)
	async function useImage(description: string) {
		// Start loading indicator
		loading.set(true);

		// Format message from GPT as a prompt for an image
		const prompt = JSON.stringify({ text: description });

		// Send the prompt to image gen AI
		const response = await fetch('/api/image', {
			method: 'POST',
			body: prompt,
			headers: {
				'content-type': 'application/json'
			}
		});

		// Get and set the image to the background
		const encodedImageSrc = await response.text();
		illustration.set(encodedImageSrc);

		// Disable loading
		loading.set(false);
	}

	// 3: Bind chat response to call functions in our code (OpenAI Functions)
	async function useChatFn(scenario: string) {
		// Start loading indicator
		calculating.set(true);

		// Format message from GPT as a prompt for a chat response
		const prompt = JSON.stringify({ text: scenario });

		// Get and parse response
		const response = await fetch('/api/game', {
			method: 'POST',
			body: prompt,
			headers: {
				'content-type': 'application/json'
			}
		});
		const functionResponses: {
			damageReport: Game.ShipsDamage;
			newLocation: { description: string | undefined };
		} = await response.json();

		// Indicate we have recieved a response from the chat
		calculating.set(false);

		/** Process location function */
		if (functionResponses.newLocation) {
			if (functionResponses.newLocation.description) {
				useImage(functionResponses.newLocation.description);
			}
		}

		/** Process damage function */
		const newDamage = functionResponses.damageReport;

		// Ignore empty damage reports
		if (newDamage === undefined || Object.keys(newDamage).length === 0) {
			console.log('⚠️ WARNING: +page.svelte: AI function call returned empty data', newDamage);
			return;
		} else if (newDamage.enemyShip === undefined && newDamage.playerShip === undefined) {
			console.log(
				'⚠️ WARNING: +page.svelte: AI function call returned badly formatted data',
				newDamage
			);
			return;
		}

		// Identify which ship was damaged
		const damagedShip = newDamage.enemyShip ? 'enemyShip' : 'playerShip';

		// Try calling the function
		try {
			// Apply damage to systems on the damaged ship
			ships.update((currentStatus: Game.ShipsStatus) => {
				const newStatus = currentStatus;
				const systems: Array<'shields' | 'weapons' | 'communications' | 'engines'> = [
					'shields',
					'weapons',
					'communications',
					'engines'
				];
				systems.forEach((system) => {
					const currentHealth = newStatus[damagedShip][system];
					const damage = newDamage[damagedShip]![system] ?? 0;
					const newHealth = Math.max(0, currentHealth - damage);
					newStatus[damagedShip][system] = newHealth;
				});
				return newStatus;
			});
			console.log('✅ SUCCESS: +page.svelte: AI function call successful', newDamage);
		} catch (error) {
			console.log('⚠️ WARNING: +page.svelte: AI function call failed:', error, newDamage);
		}
	}

	// Simple game over screen
	if (Object.entries($ships.playerShip).some(([key, value]) => Number(value) <= 0)) {
		alert('Game over! One of your systems reached 0 health and was destroyed.');
	}
</script>

<!-- View -->
<div
	class="h-full space-y-2 flex flex-col justify-between items-center bg-black"
	style="background-image: url({$illustration}); background-repeat: no-repeat; background-size: cover;"
>
	<!-- Navigation and HUD bar -->
	<nav
		class="w-full p-2 flex flex-row justify-between items-center
        bg-gradient-to-b from-black to-transparent"
	>
		<p class="text-2xl font-display text-green-500">IFS Dauntless</p>
		<Hud ship={$ships.playerShip} />
	</nav>

	<div
		class="w-full p-2 text-xl font-mono font-bold
    bg-gradient-to-t from-black to-transparent"
	>
		<!-- Chat interface -->
		<div
			use:scrollToBottom={$messages}
			class="w-full h-60 max-h-60 p-2 overflow-y-scroll"
			style="-webkit-mask-image: -webkit-gradient(linear, left bottom, left top, color-stop(50%,rgba(0,0,0,1)), color-stop(100%,rgba(0,0,0,0)) );"
		>
			<ul class="min-h-full pt-20 flex flex-col justify-end text-black">
				{#each $messages as message}
					{#if message.role !== 'system'}
						<li
							class={message.role === 'user' ? 'uppercase text-shadow-green' : 'text-shadow-white'}
						>
							{message.role === 'user' ? '$ ' : ''}
							{message.content}
						</li>
					{/if}
				{/each}
			</ul>
		</div>

		<!-- Client messenger -->

		<!-- Loading indicator -->
		{#if $loading}
			<div class="w-full p-2 bg-black text-green-500 border border-green-500 overflow-hidden">
				<div
					class="flex flex-row items-center space-x-2 animate__animated animate__delay-1s animate__lightSpeedOutRight animate__infinite"
				>
					<p class="text-green-500 font-bold">Visual incoming</p>
					<div class="p-1/2 bg-green-500" />
					<div class="p-1 bg-green-500" />
					<div class="p-2 bg-green-500" />
				</div>
			</div>
		{:else if $calculating}
			<div class="w-full p-2 bg-black text-green-500 border border-green-500 overflow-hidden">
				<div class="flex flex-row items-center space-x-2">
					<p class="text-green-500 font-bold">Calculating outcome...</p>
				</div>
			</div>
		{:else}
			<form on:submit={handleSubmit} class="w-full flex flex-row justify-between">
				<div
					class="w-full p-2 flex flex-row space-x-2 items-center bg-black text-green-500 border border-green-500"
				>
					<p
						class={$input === ''
							? 'animate__animated animate__flash animate__slower animate__infinite'
							: ''}
					>
						$
					</p>
					<input
						bind:value={$input}
						placeholder="Awaiting command"
						class="h-full w-full bg-transparent"
					/>
				</div>
				<button
					type="submit"
					class="p-2 border border-green-500 bg-green-500 hover:border-green-200 hover:bg-green-200"
				>
					<Icon name="rocket" style="solid" size="2xl" color="green" />
				</button>
			</form>
		{/if}
	</div>
</div>
