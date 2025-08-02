<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { innerHeight, innerWidth } from 'svelte/reactivity/window';
	import * as THREE from 'three';
	import { onMount } from 'svelte';

	let fragmentShaderProps = $state({
		u_time: 0,
		u_mouse: [0, 0],
		u_res: [innerWidth.current, innerHeight.current]
	});

	// Ping-pong render targets
	let renderTargetA: THREE.WebGLRenderTarget;
	let renderTargetB: THREE.WebGLRenderTarget;
	let pingpong = false;

	// Separate materials for offscreen and display
	let offscreenMaterial: THREE.ShaderMaterial;
	let displayMaterial: THREE.ShaderMaterial;

	// Scene for offscreen rendering
	let offscreenScene: THREE.Scene;
	let offscreenCamera: THREE.OrthographicCamera;
	let offscreenMesh: THREE.Mesh;

	const { renderer } = useThrelte();

	const vertexShader = `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`;

	// Offscreen shader that does the feedback processing
	const offscreenFragmentShader = `
		precision highp float;

		varying vec2 vUv;
		uniform float u_time;
		uniform vec2 u_mouse;
		uniform vec2 u_res;
		uniform sampler2D u_feedback;
		uniform bool u_hasFeedback;

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
		}

		float noise(vec2 p) {
			vec2 i = floor(p);
			vec2 f = fract(p);
			vec2 u = f * f * (3.0 - 2.0 * f);
			return mix(
				mix(hash(i + vec2(0, 0)), hash(i + vec2(1, 0)), u.x),
				mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
				u.y
			);
		}

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
			vec2 uv = vUv;
			vec2 mouse = u_mouse;

			// Sample previous frame with slight offset for trails
			vec3 feedback = vec3(0.0);
			if (u_hasFeedback) {
				vec2 offset = (mouse - 0.5) * 0.002;
				feedback = texture2D(u_feedback, uv + offset).rgb;
				feedback *= 0.98; // fade over time
			}

			// Generate new noise
			vec2 p = uv * 4.0 - 2.0;
			p.x += sin(u_time * 0.2) * 0.4;
			p.y += cos(u_time * 0.3) * 0.4;
			p += mouse * 2.0 - 1.0;

			float n = fBm(p + u_time * 0.15);
			vec3 newColor = 0.5 + 0.5 * cos(vec3(3, 2, 1) + n * 6.28 + u_time * 0.3);

			// Blend new color with feedback
			vec3 col = mix(feedback, newColor, 0.1);
			
			// Add brightness where mouse is
			float mouseDist = distance(uv, mouse);
			col += exp(-mouseDist * 8.0) * 0.3;

			gl_FragColor = vec4(col, 1.0);
		}
	`;

	// Display shader just shows the result texture
	const displayFragmentShader = `
		precision highp float;
		varying vec2 vUv;
		uniform sampler2D u_displayTexture;

		void main() {
			gl_FragColor = texture2D(u_displayTexture, vUv);
		}
	`;

	onMount(() => {
		if (!renderer) return;

		const size = 512;

		// Create render targets
		renderTargetA = new THREE.WebGLRenderTarget(size, size, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		renderTargetB = new THREE.WebGLRenderTarget(size, size, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});

		// Create offscreen rendering setup
		offscreenScene = new THREE.Scene();
		offscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

		// Create separate material for offscreen rendering
		offscreenMaterial = new THREE.ShaderMaterial({
			uniforms: {
				u_time: { value: 0 },
				u_mouse: { value: [0, 0] },
				u_res: { value: [size, size] },
				u_feedback: { value: null },
				u_hasFeedback: { value: false }
			},
			vertexShader,
			fragmentShader: offscreenFragmentShader
		});

		// Create display material
		displayMaterial = new THREE.ShaderMaterial({
			uniforms: {
				u_displayTexture: { value: null }
			},
			vertexShader,
			fragmentShader: displayFragmentShader
		});

		const geometry = new THREE.PlaneGeometry(2, 2);
		offscreenMesh = new THREE.Mesh(geometry, offscreenMaterial);
		offscreenScene.add(offscreenMesh);

		return () => {
			renderTargetA?.dispose();
			renderTargetB?.dispose();
			offscreenMaterial?.dispose();
			displayMaterial?.dispose();
		};
	});

	let displayMeshRef = $state<THREE.Mesh>();

	useTask((delta) => {
		fragmentShaderProps.u_time += delta;

		if (!renderer || !offscreenMaterial || !displayMaterial || !displayMeshRef) return;

		// Update offscreen material uniforms
		offscreenMaterial.uniforms.u_time.value = fragmentShaderProps.u_time;
		offscreenMaterial.uniforms.u_mouse.value = fragmentShaderProps.u_mouse;

		// Ping-pong: read from one target, write to the other
		const readTarget = pingpong ? renderTargetB : renderTargetA;
		const writeTarget = pingpong ? renderTargetA : renderTargetB;

		// Set feedback texture (from the target we're reading from)
		offscreenMaterial.uniforms.u_feedback.value = readTarget.texture;
		offscreenMaterial.uniforms.u_hasFeedback.value = true;

		// Render to the write target
		const originalRenderTarget = renderer.getRenderTarget();
		renderer.setRenderTarget(writeTarget);
		renderer.render(offscreenScene, offscreenCamera);
		renderer.setRenderTarget(originalRenderTarget);

		// Update display material to show the result
		displayMaterial.uniforms.u_displayTexture.value = writeTarget.texture;
		if (displayMeshRef.material !== displayMaterial) {
			displayMeshRef.material = displayMaterial;
		}

		// Flip targets for next frame
		pingpong = !pingpong;
	});

	function onPointerMove(e: PointerEvent) {
		if (!innerWidth.current || !innerHeight.current) return;
		const { clientX, clientY } = e;
		fragmentShaderProps.u_mouse = [
			clientX / innerWidth.current,
			1.0 - clientY / innerHeight.current
		];
	}
</script>

<svelte:window onpointermove={onPointerMove} />

<T.PerspectiveCamera position={[0, 0, 1]} makeDefault fov={20} />

<T.Mesh bind:ref={displayMeshRef}>
	<T.PlaneGeometry args={[1, 1]} />
</T.Mesh>
