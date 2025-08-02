<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	const PARTICLE_COUNT = 200;
	const EXPLODE_SPEED = 3.5;
	const DURATION = 2; // seconds
	const RADIUS = 2.5;

	let status = $state<'idle' | 'exploding' | 'reforming'>('idle');
	let positions = $state(new Float32Array(PARTICLE_COUNT * 3));
	let startTime = 0; // when explosion started
	let origins = $state<Float32Array>(new Float32Array(0)); // original sphere points

	function explode() {
		if (status !== 'idle') return;
		status = 'exploding';
		startTime = performance.now() / 1000;

		// build arrays once
		origins = new Float32Array(PARTICLE_COUNT * 3);
		positions = new Float32Array(PARTICLE_COUNT * 3);

		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const [x, y, z] = new THREE.Vector3().randomDirection().multiplyScalar(RADIUS);
			origins.set([x, y, z], i * 3);
			positions.set([x, y, z], i * 3);
		}
	}

	function reform() {
		status = 'reforming';
		startTime = performance.now() / 1000;
	}

	/* ---------- key listener ---------- */
	$effect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.code === 'Space') status === 'idle' ? explode() : reform();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	useTask(() => {
		if (status === 'idle') return;

		const now = performance.now() / 1000;
		const t = Math.min((now - startTime) / DURATION, 1);

		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const idx = i * 3;
			const ox = origins[idx];
			const oy = origins[idx + 1];
			const oz = origins[idx + 2];

			if (status === 'exploding') {
				// outward along random direction
				const dir = new THREE.Vector3(ox, oy, oz);
				positions[idx] = ox + dir.x * t * EXPLODE_SPEED;
				positions[idx + 1] = oy + dir.y * t * EXPLODE_SPEED;
				positions[idx + 2] = oz + dir.z * t * EXPLODE_SPEED;
				if (t >= 1) reform();
			} else if (status === 'reforming') {
				// lerp back to original point
				positions[idx] = THREE.MathUtils.lerp(positions[idx], ox, t);
				positions[idx + 1] = THREE.MathUtils.lerp(positions[idx + 1], oy, t);
				positions[idx + 2] = THREE.MathUtils.lerp(positions[idx + 2], oz, t);
				if (t >= 1) status = 'idle';
			}
		}

		// trigger Svelte reactivity
		positions = new Float32Array(positions);
	});
</script>

{#if status !== 'idle'}
	<T.Points>
		<T.BufferGeometry>
			<T.BufferAttribute
				args={[positions, 3]}
				attach={({ parent, ref }) => {
					parent.setAttribute('position', ref);
					return () => parent.setAttribute('position', null);
				}}
			/>
		</T.BufferGeometry>
		<T.PointsMaterial size={0.15} color="red" />
	</T.Points>
{/if}
