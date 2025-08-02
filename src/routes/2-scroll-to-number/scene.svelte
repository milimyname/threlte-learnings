<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { Instance, InstancedMesh } from '@threlte/extras';
	import { scrollY } from 'svelte/reactivity/window';
	import * as THREE from 'three';

	let scrollProgress = $derived(() => {
		if (!scrollY.current) return 0;
		const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
		return Math.min(scrollY.current / maxScroll, 1);
	});
	let visible = $state(false);

	const BAR_COUNT = 5;
	const thresholds = [0.1, 0.25, 0.4, 0.55, 0.7];
	const burstFired = $state(Array(BAR_COUNT).fill(false));

	let positions = $state(new Float32Array(0));
	let velocities: THREE.Vector3[] = [];
	let lifetimes: number[] = [];

	function spawnParticles(barIndex: number) {
		const tip = new THREE.Vector3((barIndex - 2) * 1, 0, 0);
		const newPos = new Float32Array(30 * 3);
		const newVel: THREE.Vector3[] = [];
		const newLife: number[] = [];

		for (let i = 0; i < 30; i++) {
			newPos[i * 3 + 0] = tip.x;
			newPos[i * 3 + 1] = tip.y;
			newPos[i * 3 + 2] = tip.z;

			newVel.push(
				new THREE.Vector3(
					(Math.random() - 0.5) * 0.2,
					Math.random() * 0.3 + 0.1,
					(Math.random() - 0.5) * 0.2
				)
			);
			newLife.push(60); // frames until death
		}

		// append
		positions = new Float32Array([...positions, ...newPos]);
		velocities.push(...newVel);
		lifetimes.push(...newLife);
	}

	$effect(() => {
		const observer = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
		observer.observe(document.querySelector('#timeline-root')!); // or use bind:this
		return () => observer.disconnect();
	});

	$effect(() => {
		const p = scrollProgress();
		if (!p) return;
		thresholds.forEach((t, i) => {
			if (p >= t && !burstFired[i]) {
				burstFired[i] = true;
				spawnParticles(i);
			}
		});
	});

	useTask((delta) => {
		if (!visible) return;

		if (!positions.length) return;

		const arr = positions.slice();
		let alive = 0;

		for (let i = 0; i < lifetimes.length; i++) {
			const idx = i * 3;
			if (lifetimes[i]-- <= 0) continue;

			arr[idx + 0] += velocities[i].x * delta * 60;
			arr[idx + 1] += velocities[i].y * delta * 60 - delta * 0.5; // gravity
			arr[idx + 2] += velocities[i].z * delta * 60;

			velocities[i].y -= delta * 0.5;
			alive++;
		}

		// keep only living particles
		if (alive !== lifetimes.length) {
			const newPos = new Float32Array(alive * 3);
			const newVel: THREE.Vector3[] = [];
			const newLife: number[] = [];

			for (let i = 0, j = 0; i < lifetimes.length; i++) {
				if (lifetimes[i] > 0) {
					newPos[j * 3 + 0] = arr[i * 3 + 0];
					newPos[j * 3 + 1] = arr[i * 3 + 1];
					newPos[j * 3 + 2] = arr[i * 3 + 2];
					newVel.push(velocities[i]);
					newLife.push(lifetimes[i]);
					j++;
				}
			}
			positions = newPos;
			velocities = newVel;
			lifetimes = newLife;
		} else {
			positions = arr;
		}
	});
</script>

<T.PerspectiveCamera position={[0.1, -4, 13.9]} makeDefault fov={80} lookAt={[0, 0, 0]} />

<T.AmbientLight intensity={0.49} />
<T.DirectionalLight position={[0.1, -4, 13.9]} />

<InstancedMesh position={[0, 0, 1.7]}>
	<T.CylinderGeometry args={[0.2, 0.2, 8, 8]} />
	<T.MeshStandardMaterial color="#0078ff" />

	{#each { length: 5 }, bar}
		<Instance
			position={[(bar - 2) * 1, -10 + scrollProgress() * 10, 1.7]}
			rotation.x={scrollProgress() * (Math.PI / 2)}
		/>
	{/each}
</InstancedMesh>

<T.Points>
	<T.BufferGeometry>
		<T.BufferAttribute
			attach={({ parent, ref }) => {
				//@ts-ignore
				parent.setAttribute('position', ref);
				return () => {
					//@ts-ignore
					parent.setAttribute('position', null);
				};
			}}
			args={[positions, 3]}
		/>
	</T.BufferGeometry>
	<T.PointsMaterial size={0.5} color="#b34949" depthTest={false} />
</T.Points>
