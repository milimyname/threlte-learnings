<script lang="ts">
	import Scene from './scene.svelte';
	import { Canvas } from '@threlte/core';
</script>

<div>
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
