<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
	import { useLoader } from '@threlte/core';
	import { initMic } from './audio';

	let analyser = $state<AnalyserNode | null>(null);
	let dataArray = $state<Uint8Array<ArrayBuffer>>(new Uint8Array(0));
	let loudness = $state(0);
	let target = $state(0);

	const svg = useLoader(SVGLoader).load('/favicon.svg');

	const shapes = $derived($svg ? $svg.paths.flatMap((p) => SVGLoader.createShapes(p)) : []);

	$effect(() => {
		initMic()
			.then(({ analyser: a }) => {
				analyser = a;
				dataArray = new Uint8Array(a.frequencyBinCount);
			})
			.catch((error) => {
				console.error('Error initializing microphone:', error);
				analyser = null;
				dataArray = new Uint8Array(0);
			});
	});

	useTask(() => {
		if (!analyser) return;
		analyser.getByteFrequencyData(dataArray);
		const sum = dataArray.reduce((a, b) => a + b, 0);
		target = sum / dataArray.length / 255;
		loudness += (target - loudness) * 0.1; // simple lerp
	});
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 40]} fov={50}>
	<OrbitControls />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.49} />
<T.DirectionalLight position={[0.1, -4, 13.9]} />

{#each shapes as shape}
	<T.Mesh scale={0.1} position.y={-loudness * 0.5}>
		<T.ExtrudeGeometry
			args={[shape, { depth: Math.max(0.1, 0.5 + loudness * 2) }]}
			dispose={false}
		/>
		<T.MeshStandardMaterial wireframe color="#ff00ff" />
	</T.Mesh>
{/each}
