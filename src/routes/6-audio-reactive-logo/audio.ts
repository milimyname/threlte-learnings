export async function initMic(): Promise<{
	context: AudioContext;
	analyser: AnalyserNode;
}> {
	const context = new (window.AudioContext || (window as any).webkitAudioContext)();
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

	const source = context.createMediaStreamSource(stream);
	const analyser = context.createAnalyser();

	analyser.fftSize = 512;

	source.connect(analyser);

	return { context, analyser };
}
