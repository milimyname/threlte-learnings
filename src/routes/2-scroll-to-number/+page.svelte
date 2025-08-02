<script lang="ts">
	import Scene from './scene.svelte';
	import { Canvas } from '@threlte/core';
</script>

<div
	style="height: 200vh; padding: 20px; background: linear-gradient(to bottom, #1a1a1a, #2a2a2a);"
>
	<h1 style="color: white; margin-bottom: 100vh;">Scroll down to see the cylinder rotate!</h1>
	<h2 style="color: white;">Keep scrolling...</h2>
</div>

<div id="timeline-root">
	<Canvas>
		{#if import.meta.env.MODE === 'development'}
			{#await import('@threlte/studio') then { Studio }}
				<Studio>
					<Scene />
				</Studio>
			{/await}
		{:else}
			<Scene />
		{/if}
	</Canvas>
</div>

<style>
	div {
		height: 100vh;
		width: 100%;
	}
</style>
