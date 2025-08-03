<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { OrbitControls, Sky, Text3DGeometry, useFBO } from '@threlte/extras';
	import * as THREE from 'three';
	import { EffectComposer, RenderPass, DepthOfFieldEffect, EffectPass } from 'postprocessing';
	import { scrollY } from 'svelte/reactivity/window';
	import MeshTransmissionMaterial from './mesh-transmission-material.svelte';

	const { renderer, scene, size, camera } = useThrelte();

	const fbo = useFBO({
		size: size.current
	});

	let glassRef = $state<THREE.Mesh>();
	let composer = $state<EffectComposer>();
	let ab = $derived(Math.min(scrollY.current || 1 / 1000, 1));

	useTask(() => {
		if (!glassRef) return;
		const lastRenderTarget = renderer.getRenderTarget();

		if (!composer) {
			composer = new EffectComposer(renderer);
			composer.addPass(new RenderPass(scene, $camera));
			composer.addPass(
				new EffectPass(
					$camera,
					new DepthOfFieldEffect($camera, {
						focusDistance: 0.25, // closer focal plane
						focalLength: 0.02, // narrower depth
						bokehScale: 3 // larger blur circles
					})
				)
			);
		}
		composer.render();

		glassRef.visible = false;
		renderer.setRenderTarget(fbo);
		renderer.render(scene, $camera);
		glassRef.visible = true;
		renderer.setRenderTarget(lastRenderTarget);
	});
</script>

<T.PerspectiveCamera position.x={5} position.y={5} position.z={10} makeDefault>
	<OrbitControls />
</T.PerspectiveCamera>

<Sky />
<T.AmbientLight intensity={0.5} />

<T.Mesh position={[-2, 0, 0]}>
	<Text3DGeometry text={'Hi ma!'} depth={0.1} size={1} />
	<T.MeshStandardMaterial color="red" />
</T.Mesh>

<T.Mesh bind:ref={glassRef} position={[0, 0, 2]}>
	<T.PlaneGeometry args={[3, 6]} />

	<MeshTransmissionMaterial
		buffer={fbo.texture}
		thickness={0.1}
		backside={true}
		backsideThickness={0.1}
		backsideEnvMapIntensity={0.5}
		anisotropy={0.1}
		resolution={1024}
		side={THREE.DoubleSide}
		chromaticAberration={ab}
		roughness={0.4239}
		metalness={0.337}
		transmission={0.4022}
		ior={10}
	/>
</T.Mesh>
