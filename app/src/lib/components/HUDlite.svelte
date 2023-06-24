<!--
    * HUD 
    Creates a heads up display summarising ship system status
    @param name <string> Name of a font awesome icon class
    @param color
    @return An SVG icon component
-->
<script lang="ts">
	import Icon from './Icon.svelte';

	export let ship: Game.ShipStatusReport;
</script>

<ul class="flex flex-row space-x-2 text-xl transition-all">
	<li
		class="flex flex-col items-center text-{ship.shields === 100
			? 'green'
			: 'red'}-500 {ship.shields < 100
			? 'animate__flash '
			: ''} animate__animated animate__infinite animate__slow
		"
	>
		<p class="text-xs">Shields</p>
		<p>{ship.shields}%</p>
	</li>
	<li
		class="flex flex-col items-center text-{ship.engines === 100
			? 'green'
			: 'red'}-500 {ship.engines < 100
			? 'animate__flash '
			: ''} animate__animated animate__infinite animate__slow
		"
	>
		<p class="text-xs">Engines</p>
		<p>{ship.engines}%</p>
	</li>
	<li
		class="flex flex-col items-center text-{ship.weapons === 100
			? 'green'
			: 'red'}-500 {ship.weapons < 100
			? 'animate__flash '
			: ''} animate__animated animate__infinite animate__slow
		"
	>
		<p class="text-xs">Weapons</p>
		<p>{ship.weapons}%</p>
	</li>
	<li
		class="flex flex-col items-center text-{ship.communications === 100
			? 'green'
			: 'red'}-500 {ship.communications < 100
			? 'animate__flash '
			: ''} animate__animated animate__infinite animate__slow
		"
	>
		<p class="text-xs">Comms</p>
		<p>{ship.communications}%</p>
	</li>
</ul>
