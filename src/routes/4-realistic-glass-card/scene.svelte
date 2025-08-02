<script lang="ts">
	import { T } from '@threlte/core';
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />

<T.AmbientLight intensity={0.49} />
<T.DirectionalLight position={[0.1, -4, 13.9]} />

<T.Mesh rotation={[0, 2, 0]}>
	<T.BoxGeometry args={[1, 1, 1]} />
	<T.MeshStandardMaterial color="#0078ff" />
</T.Mesh>
