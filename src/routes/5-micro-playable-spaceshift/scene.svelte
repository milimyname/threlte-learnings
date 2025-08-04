<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { Text } from '@threlte/extras';

	let position = $state<[number, number, number]>([0, 0, 0]);
	let currentKeys = $state<Set<string>>(new Set());
	let asteroidProps = $state<{ x: number; y: number; size: number }[]>([]);
	let gameOver = $state(false);
	let score = $state(0);
	let highScore = $state(Number(localStorage?.getItem('hs') ?? 0));
	let surviveTimer = $state(0);

	const SPEED_FACTOR = 0.1;

	function handleKeyDown(event: KeyboardEvent) {
		event.preventDefault();
		currentKeys.add(event.key);
	}

	function handleKeyUp(event: KeyboardEvent) {
		event.preventDefault();
		currentKeys.delete(event.key);
	}

	function hit(
		ax: number,
		ay: number,
		aw: number,
		ah: number,
		bx: number,
		by: number,
		bw: number,
		bh: number
	) {
		return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
	}

	useTask((delta) => {
		surviveTimer += delta;
		if (surviveTimer >= 1) {
			surviveTimer -= 1;
			score += 1;
		}

		if (currentKeys.size > 0) {
			if (currentKeys.has('w') || currentKeys.has('ArrowUp'))
				position[1] += SPEED_FACTOR * 60 * delta;
			if (currentKeys.has('s') || currentKeys.has('ArrowDown'))
				position[1] -= SPEED_FACTOR * 60 * delta;
			if (currentKeys.has('a') || currentKeys.has('ArrowLeft'))
				position[0] -= SPEED_FACTOR * 60 * delta;
			if (currentKeys.has('d') || currentKeys.has('ArrowRight'))
				position[0] += SPEED_FACTOR * 60 * delta;
		}

		if (Math.random() < 0.01) {
			const size = Math.random() * 0.4 + 0.1; // 0.1 … 0.5
			const x = (Math.random() - 0.5) * 7; // -3.5 … 3.5
			(asteroidProps ||= []).push({ x, y: 3.5, size }); // always start at y = 3.5
		}

		asteroidProps = asteroidProps.filter((a) => {
			a.y -= 1.5 * delta;
			return a.y > -4;
		});

		for (let i = 0; i < asteroidProps.length; i++) {
			const asteroid = asteroidProps[i];
			if (
				hit(
					position[0] - 0.5,
					position[1] - 0.5,
					1,
					1,
					asteroid.x - asteroid.size / 2,
					asteroid.y - asteroid.size / 2,
					asteroid.size,
					asteroid.size
				)
			)
				gameOver = true;
		}
	});

	$effect(() => {
		if (gameOver) {
			alert('Game Over! You hit an asteroid!');
			position = [0, 0, 0];
			asteroidProps = [];
			gameOver = false;

			if (score > highScore) {
				highScore = score;
				localStorage.setItem('hs', String(highScore));
			}

			score = 0;
			surviveTimer = 0;
		}
	});
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<T.PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />

<T.AmbientLight intensity={0.49} />
<T.DirectionalLight position={[0.1, -4, 13.9]} />

<Text
	text={`Score: ${score}   Best: ${highScore}`}
	fontSize={0.25}
	position={[-0.5, -1, 0]}
	color="#ffffff"
	anchorX="left"
	anchorY="top"
/>

<T.Mesh rotation={[0, 0, 0]} {position}>
	<T.BoxGeometry args={[1, 1, 1]} />
	<T.MeshStandardMaterial color="#0078ff" />
</T.Mesh>

{#if asteroidProps}
	{#each asteroidProps as { x, y, size }}
		<T.Mesh position={[x, y, 0]}>
			<T.SphereGeometry args={[size, 32, 32]} />
			<T.MeshStandardMaterial color="#ff0000" />
		</T.Mesh>
	{/each}
{/if}
