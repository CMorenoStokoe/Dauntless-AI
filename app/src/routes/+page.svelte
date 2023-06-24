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
	import { error } from '@sveltejs/kit';
	import HuDlite from '$lib/components/HUDlite.svelte';

	// Initialise environmental variables
	const showSplash = writable<boolean>(true); // Show the splash screen at start
	const responding = writable<boolean>(false); // Used to track when the app is respodning to the player
	const visualising = writable<boolean>(false); // Used to track when the app is visualising an image response
	const visualisingPrompt = writable<string>(''); // Used to record the current prompt being visualised
	const calculating = writable<boolean>(false); // Used to track when the app is visualising a text response
	const illustration = writable<string>(
		'https://drive.google.com/uc?id=1g5cZtSEBM0uJ4t9Dv6JxZNlUC7s-gzQS'
	); // An image encoded in base-64
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
	}); // Used to track when the app is visualising a response

	// 1: Interactive chat dialog for user to converse with simulation (OpenAI Chat Completion)
	const { messages, handleSubmit, input } = useChat({
		initialMessages: [initialisationSystemMessage, initialisationAgentMessage],
		onResponse: () => {
			responding.set(true);
		},
		onFinish: (message: Message) => {
			responding.set(false);
			useChatFn(message.content); // Run game play functions
		}
	});

	// 2: Illustrate the response using AI image generation (Stability.ai / DALL-E)
	async function useImage(description: string) {
		// Start visualising indicator
		visualising.set(true);
		visualisingPrompt.set(description);

		// Format message from GPT as a prompt for an image
		const prompt = JSON.stringify({ text: description });

		// Send the prompt to image gen AI
		try {
			const response = await fetch('/api/image', {
				method: 'POST',
				body: prompt,
				headers: {
					'content-type': 'application/json'
				},
				signal: AbortSignal.timeout(30000)
			});

			// Raise errors
			if (!response.ok) {
				throw new Error(
					`⚠️ WARNING: useImage: Response error/timeout (${response.status}): ${response.text}`
				);
			}

			// Get and set the image to the background
			const encodedImageSrc = await response.text();
			illustration.set(encodedImageSrc);
		} catch (error) {
			console.log('⚠️ WARNING: useImage: Failed:', error);
		}

		// Disable visualising
		visualising.set(false);
	}

	// 3: Bind chat response to call functions in our code (OpenAI Functions)
	async function useChatFn(scenario: string) {
		// Start visualising indicator
		calculating.set(true);

		// Format message from GPT as a prompt for a chat response
		const prompt = JSON.stringify({ text: scenario });

		// Get and parse response
		try {
			// Send the prompt to image gen AI
			const response = await fetch('/api/game', {
				method: 'POST',
				body: prompt,
				headers: {
					'content-type': 'application/json'
				},
				signal: AbortSignal.timeout(30000)
			});

			// Raise errors
			if (!response.ok) {
				throw new Error(
					`⚠️ WARNING: useChatFn: Response error/timeout (${response.status}): ${response.text}`
				);
			}

			// Arrange responses
			const functionResponses: {
				damageReport: Game.ShipsDamage;
				newLocation: { description: string | undefined };
			} = await response.json();

			// Indicate we have received a response from the chat
			calculating.set(false);

			/** Process damage function */
			try {
				const newDamage = functionResponses.damageReport;

				// Ignore empty damage reports
				if (newDamage === undefined || Object.keys(newDamage).length === 0) {
					console.log('⚠️ WARNING: useChatFn: Empty damage report', newDamage);
				} else if (newDamage.enemyShip === undefined && newDamage.playerShip === undefined) {
					console.log('⚠️ WARNING: useChatFn: Badly formatted damage report', newDamage);
				} else {
					// Identify which ship was damaged
					const damagedShip = newDamage.enemyShip ? 'enemyShip' : 'playerShip';

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

					// Log success
					console.log('✅ SUCCESS: useChatFn: Damage function executed', newDamage);
				}
			} catch (error) {
				console.log('⚠️ WARNING: useChatFn: Damage function failed:', error);
			}

			/** Process location function */
			try {
				if (functionResponses.newLocation) {
					const newLocation = functionResponses.newLocation.description;
					if (newLocation) {
						console.log('✅ SUCCESS: useChatFn: Location function executed', newLocation);
						useImage(newLocation);
					}
				}
			} catch (error) {
				console.log('⚠️ WARNING: useChatFn: Location function failed:', error);
			}
		} catch {
			console.log('⚠️ WARNING: useChatFn: Request failed:', error);
		}
	}

	// Simple game over screen
	if (Object.entries($ships.playerShip).some(([key, value]) => Number(value) <= 0)) {
		alert('Game over! One of your systems reached 0 health and was destroyed.');
	}
</script>

<!-- View -->
<div
	class="h-full space-y-2 flex flex-col justify-between items-center bg-black relative"
	style="background-image: url({$illustration}); background-repeat: no-repeat; background-size: cover;"
>
	<!-- Splash screen -->
	{#if $showSplash}
		<div
			class="w-full h-full p-4 flex flex-col justify-center items-center
			absolute top-0 left-0
			bg-black z-10
			text-green-500 text-center"
		>
			<div class="max-w-xl flex flex-col justify-center items-center space-y-4">
				<p class="text-2xl font-bold font-display">Welcome!</p>
				<div class="flex flex-row font-bold font-display">
					<p>This is a space game where</p>
					<p
						class="px-4 text-white animate__animated animate__slower animate__shakeX animate__infinite"
					>
						everything
					</p>
					<p>is generated by AI.</p>
				</div>
				<p>The AI will present you a scenario to explore space, and respond to your decisions.</p>
				<div
					class="w-full flex flex-row justify-between items-center
		bg-black border border-green-500
		text-green-500 text-xs font-mono font-light"
				>
					<p
						class="p-1 animate__animated animate__infinite {!$responding &&
						!$visualising &&
						!$calculating
							? 'bg-green-500 text-black'
							: ''}"
					>
						Waiting
					</p>
					<p
						class="p-1 animate__animated animate__infinite {$responding
							? 'bg-green-500 text-black animate__flash'
							: ''}"
					>
						Responding
					</p>
					<p
						class="p-1 animate__animated animate__infinite {$calculating
							? 'bg-green-500 text-black animate__flash'
							: ''}"
					>
						Analysing
					</p>
					<p
						class="p-1 animate__animated animate__infinite {$visualising
							? 'bg-green-500 text-black animate__flash'
							: ''}"
					>
						Visualising
					</p>
				</div>
				<p>
					The AI is COMPLETELY in control! It will make up a <span class="font-bold text-white"
						>story</span
					>, track <span class="font-bold text-white">damage</span> to your ship, and
					<span class="font-bold text-white">visualise</span> anything remarkable you encounter.
				</p>
				<HuDlite ship={$ships.playerShip} />
				<p class="text-xs">
					The models we are using are OpenAI (GPT-3.5) and Stability.ai (Stable Diffusion 2-XL).
				</p>
				<button
					class="p-2 bg-black border border-green-500
				hover:bg-green-500 hover:text-black
				font-display text-xl
				animate__animated animate__infinite animate__pulse"
					on:click={() => {
						showSplash.set(false);
					}}
				>
					Play
				</button>
			</div>
		</div>
	{/if}

	<!-- Navigation and HUD bar -->
	<div class="w-full">
		<nav
			class="w-full p-2 flex flex-row justify-between items-center
        bg-gradient-to-b from-black to-transparent"
		>
			<!-- Header -->
			<div class="flex flex-col items-center">
				<p class="text-lg font-display text-green-500">The Zyzyx Quadrant</p>
				<a
					class="text-white text-xs hover:text-green-500"
					href="https://github.com/CMorenoStokoe/Dauntless-AI"
				>
					<Icon name="github" style="brands" color="white" /> GitHub
				</a>
			</div>
			<Hud ship={$ships.playerShip} />
		</nav>
		<!-- Description of scene -->
		{#if $visualisingPrompt !== ''}
			<p class="p-2 font-mono text-green-500">Viewing: {$visualisingPrompt}</p>
		{/if}
	</div>

	<!-- AI chat and response module -->
	<div
		class="w-full p-2
		text-xl font-mono font-bold
    	bg-gradient-to-t from-black to-transparent"
	>
		<!-- Chat interface -->
		<div
			use:scrollToBottom={$messages}
			class="w-full h-96 max-h-96 p-2 overflow-y-scroll"
			style="-webkit-mask-image: -webkit-gradient(linear, left bottom, left top, color-stop(85%,rgba(0,0,0,1)), color-stop(100%,rgba(0,0,0,0)) );"
		>
			<ul class="min-h-full pt-20 flex flex-col justify-end">
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

		<!-- Status indicator -->
		<div
			class="w-full flex flex-row justify-between items-center
			bg-black border border-green-500
			text-green-500 text-xs font-mono font-light"
		>
			<p
				class="p-1 animate__animated animate__infinite {!$responding &&
				!$visualising &&
				!$calculating
					? 'bg-green-500 text-black'
					: ''}"
			>
				Waiting
			</p>
			<p
				class="p-1 animate__animated animate__infinite {$responding
					? 'bg-green-500 text-black animate__flash'
					: ''}"
			>
				Responding
			</p>
			<p
				class="p-1 animate__animated animate__infinite {$calculating
					? 'bg-green-500 text-black animate__flash'
					: ''}"
			>
				Analysing
			</p>
			<p
				class="p-1 animate__animated animate__infinite {$visualising
					? 'bg-green-500 text-black animate__flash'
					: ''}"
			>
				Visualising
			</p>
		</div>

		<!-- Client messenger and visualising indicator -->
		{#if $visualising}
			<div class="w-full p-2 bg-black text-green-500 border border-green-500 overflow-hidden">
				<div
					class="flex flex-row items-center space-x-2
					animate__animated animate__delay-1s animate__lightSpeedOutRight animate__infinite"
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
					<p class="text-green-500 font-bold">Calculating outcome</p>
					<p />
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
