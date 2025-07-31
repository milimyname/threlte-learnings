<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { innerHeight, innerWidth } from 'svelte/reactivity/window';

	let fragmentShaderProps = $state({
		u_time: 0,
		u_mouse: [0, 0],
		u_res: [innerHeight.current, innerWidth.current]
	});

	const vertexShader = `
    // three.js already gives you position, uv, etc.
    varying vec2 vUv;

    void main() {
        vUv = uv;              // pass uv to fragment shader
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;

	const fragmentShader = `
	precision highp float;

	varying vec2 vUv;
	uniform float u_time;
	uniform vec2 u_mouse;
	uniform vec2 u_res;

	// --- 2-D pseudo-random hash ---
	float hash(vec2 p) {
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
	}

	// --- value noise ---
	float noise(vec2 p) {
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f * f * (3.0 - 2.0 * f);  // smoothstep
		return mix(
			mix(hash(i + vec2(0, 0)), hash(i + vec2(1, 0)), u.x),
			mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
			u.y
		);
	}

	// --- fBm (fractional Brownian motion) ---
	float fBm(vec2 p) {
		float val = 0.0;
		float amp = 0.5;
		for (int i = 0; i < 4; i++) {
			val += amp * noise(p);
			p *= 2.0;
			amp *= 0.5;
		}
		return val;
	}

	void main() {
		// aspect-correct coordinates
		vec2 uv = vUv;
		vec2 mouse = u_mouse;

		// swirling domain
		vec2 p = uv * 4.0 - 2.0;
		p.x += sin(u_time * 0.2) * 0.4;
		p.y += cos(u_time * 0.3) * 0.4;
		p += mouse * 2.0 - 1.0; // subtle mouse influence

		float n = fBm(p + u_time * 0.15);

		// color palette
		vec3 col = 0.5 + 0.5 * cos(vec3(3, 2, 1) + n * 6.28 + u_time * 0.3);

		gl_FragColor = vec4(col, 1.0);
	}
`;

	useTask((delta) => {
		fragmentShaderProps.u_time += delta;
	});

	function onPointerMove(e: PointerEvent) {
		if (!innerWidth.current || !innerHeight.current) return;
		const { clientX, clientY } = e;
		fragmentShaderProps.u_mouse = [
			clientX / innerWidth.current,
			-1000.0 - clientY / innerHeight.current // flip Y so (0,0) is bottom-left in UV space
		];
	}
</script>

<svelte:window onpointermove={onPointerMove} />

<T.PerspectiveCamera position={[0, 0, 1]} makeDefault fov={20} />
<T.Mesh>
	<T.PlaneGeometry args={[1, 1]} />
	<T.ShaderMaterial
		uniforms={{
			u_time: { value: 0 },
			u_mouse: { value: [0, 0] },
			u_res: { value: [0, 0] }
		}}
		uniforms.u_time.value={fragmentShaderProps.u_time}
		uniforms.u_mouse.value={fragmentShaderProps.u_mouse}
		uniforms.u_res.value={fragmentShaderProps.u_res}
		{vertexShader}
		{fragmentShader}
	/>
</T.Mesh>
