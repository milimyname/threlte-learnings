<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { useTexture } from '@threlte/extras';
	import * as THREE from 'three';
	import Particles from './particles.svelte';

	const { scene, camera } = useThrelte();

	const RADIUS = 2.5;
	const SENSITIVITY = 0.01;
	let hovered = $state<number | null>();
	let movement = $state({ x: 0, y: 0 });
	let rotation = $state({ x: 0, y: 0 });

	const urls = [
		'/interactive-photo-orb/cederic-vandenberghe.jpeg',
		'/interactive-photo-orb/dorian-mongel.jpeg',
		'/interactive-photo-orb/henrique-ferreira.jpeg',
		'/interactive-photo-orb/marc-wieland.jpeg',
		'/interactive-photo-orb/rachel-davis.jpeg',
		'/interactive-photo-orb/richard-clark.jpeg'
	];

	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();

	function onPointerMove(event: MouseEvent) {
		pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

		movement.x = event.movementX * SENSITIVITY;
		movement.y = event.movementY * SENSITIVITY;
	}

	let meshes = $derived(
		Array.from(scene.children)
			.flatMap((c) => c.children)
			.filter((o) => o instanceof THREE.Group)
			.map((group) => group.children[0] as THREE.Mesh)
	);

	useTask(() => {
		rotation.y += movement.x;
		rotation.x += movement.y;
		raycaster.setFromCamera(pointer, $camera);

		let meshes = Array.from(scene.children)
			.flatMap((c) => c.children)
			.filter((o) => o instanceof THREE.Group)
			.map((group) => group.children[0] as THREE.Mesh);

		meshes.forEach((m) => ((m.material.colorWrite = true), m.material.color.set(0xffffff)));

		const intersects = raycaster.intersectObjects(meshes);

		if (intersects.length > 0) {
			hovered = intersects[0].object.userData.id;
			intersects[0].object.material.color.set(0xff0000);
		} else hovered = null;
	});

	const asyncTextures = useTexture(urls);
</script>

<svelte:window onpointermove={onPointerMove} />

<T.PerspectiveCamera makeDefault position={[0, 0, 6]} fov={50} />

<T.AmbientLight intensity={0.49} />
<T.DirectionalLight position={[1.9, 0, 8.8]} />

{#await asyncTextures}
	<p>Loading textures...</p>
{:then textures}
	<T.Group rotation={[rotation.x, rotation.y, 0]}>
		{#each textures as texture, i}
			{@const total = textures.length}
			{@const phi = Math.PI * (i / total)}
			{@const theta = Math.PI * 2 * (i / total)}
			{@const spherical = new THREE.Spherical(RADIUS, phi, theta)}
			{@const position = new THREE.Vector3().setFromSpherical(spherical)}

			<T.Group position={position.toArray()} scale={hovered === i ? 0.55 : 0.5}>
				<T.Mesh lookAt={[0, 10, 0]} userData={{ id: i }}>
					<T.PlaneGeometry args={[2, 1.5]} />
					<T.MeshStandardMaterial map={texture} side={THREE.DoubleSide} />
				</T.Mesh>
			</T.Group>
		{/each}
	</T.Group>
{/await}

<Particles />
