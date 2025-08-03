<script lang="ts">
	import { T, useThrelte, useTask, useParent } from '@threlte/core';
	import { NoToneMapping, FrontSide, BackSide, Color, type Side } from 'three';
	import { useFBO } from '@threlte/extras';
	import { MeshTransmissionMaterial } from './MeshTransmissionMaterialDrei';
	import { MeshDiscardMaterial } from './MeshDiscardMaterial';

	interface Props {
		buffer?: any;
		transmissionSampler?: boolean;
		backside?: boolean;
		side?: Side;
		transmission?: number;
		thickness?: number;
		backsideThickness?: number;
		backsideEnvMapIntensity?: number;
		samples?: number;
		resolution: number;
		backsideResolution?: number;
		background?: string;
		anisotropy?: number;
		anisotropicBlur?: number;
		chromaticAberration?: number;
		ior?: number;
		roughness?: number;
		metalness?: number;
	}

	const {
		buffer,
		transmissionSampler = false,
		backside = false,
		side = FrontSide,
		transmission = 1,
		thickness = 0,
		backsideThickness = 0,
		backsideEnvMapIntensity = 1,
		samples = 6,
		resolution,
		backsideResolution,
		background,
		anisotropy,
		anisotropicBlur,
		...props
	}: Props = $props();
	const discardMaterial = new MeshDiscardMaterial();
	const { current: parent }: { current: any } = useParent();
	const backsideRes = $derived(backsideResolution || resolution);
	const fboMain = useFBO();
	const fboBack = useFBO();
	const { renderer, camera, scene } = useThrelte();

	let ref: any = $state(null);
	let oldBg;
	let oldEnvMapIntensity;
	let oldTone;

	$effect.pre(() => {
		fboMain.setSize(resolution, resolution);
	});

	$effect.pre(() => {
		fboBack.setSize(backsideRes, backsideRes);
	});

	useTask((time) => {
		ref.time = time;

		if (ref.buffer === fboMain.texture && !transmissionSampler) {
			if (parent) {
				oldTone = renderer.toneMapping;
				oldBg = scene.background;
				oldEnvMapIntensity = ref.envMapIntensity;

				renderer.toneMapping = NoToneMapping;
				if (background) scene.background = new Color(background);
				parent.material = discardMaterial;

				if (backside) {
					renderer.setRenderTarget(fboBack);
					renderer.render(scene, camera.current);
					parent.material = ref;
					parent.material.buffer = fboBack.texture;
					parent.material.thickness = backsideThickness;
					parent.material.side = BackSide;
					parent.material.envMapIntensity = backsideEnvMapIntensity;
				}

				renderer.setRenderTarget(fboMain);
				renderer.render(scene, camera.current);

				parent.material = ref;
				parent.material.thickness = thickness;
				parent.material.side = side;
				parent.material.buffer = fboMain.texture;
				parent.material.envMapIntensity = oldEnvMapIntensity;

				scene.background = oldBg;
				renderer.setRenderTarget(null);
				renderer.toneMapping = oldTone;
			}
		}
	});
</script>

<T
	bind:ref
	args={[samples, transmissionSampler]}
	is={MeshTransmissionMaterial}
	{...props}
	buffer={buffer || fboMain.texture}
	anisotropicBlur={anisotropicBlur ?? anisotropy}
	{thickness}
	{side}
/>
