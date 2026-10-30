// Records one voice message and returns it as a 16 kHz mono WAV (base64), the format the agent's
// /transcribe expects. Raw samples are captured from the microphone as they arrive, so no
// browser recording format (WebM, MP4) has to be decoded; Chrome fails to decode its own WebM
// with some microphones. Recording stops when the customer taps stop, after a pause once they
// have started talking, or at 30 seconds.

const RATE = 16_000;
const MAX_MS = 30_000;
const PAUSE_MS = 1500;
const SPEECH_LEVEL = 0.02; // RMS above this counts as talking
const FRAME = 4096;        // samples per callback, about 85 ms at 48 kHz

export const canRecord = () => !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== "undefined";

// result is null when the recording stopped on its own without hearing anyone.
export type Recording = { stop: () => void; result: Promise<string | null> };

export async function record(): Promise<Recording> {
  // Created before the first await, while the tap still counts as a user gesture (Safari).
  const ctx = new AudioContext();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (err) {
    void ctx.close();
    throw err;
  }
  void ctx.resume();

  // ScriptProcessorNode is deprecated, but unlike an AudioWorklet it needs no separate module
  // file, which a host site's Content Security Policy could block.
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(FRAME, 1, 1);
  const frames: Float32Array[] = [];
  const started = Date.now();
  let heard = false;
  let quietSince = 0;
  let tapped = false;
  let finished = false;
  let done = () => {};
  const stopped = new Promise<void>((resolve) => (done = resolve));

  const finish = () => {
    if (finished) return;
    finished = true;
    processor.onaudioprocess = null;
    source.disconnect();
    processor.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    done();
  };
  processor.onaudioprocess = (e) => {
    const samples = e.inputBuffer.getChannelData(0);
    frames.push(samples.slice());
    const level = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
    const now = Date.now();
    if (level > SPEECH_LEVEL) {
      heard = true;
      quietSince = 0;
    } else if (heard && !quietSince) {
      quietSince = now;
    }
    if ((quietSince && now - quietSince > PAUSE_MS) || now - started > MAX_MS) finish();
  };
  // Chrome only runs a processor that is connected to an output. It writes nothing, so the
  // customer doesn't hear themselves.
  source.connect(processor);
  processor.connect(ctx.destination);

  const result = stopped.then(async () => {
    try {
      // A tap on stop always sends, in case the microphone is quieter than SPEECH_LEVEL.
      if ((!heard && !tapped) || !frames.length) return null;
      const buffer = ctx.createBuffer(1, frames.reduce((n, f) => n + f.length, 0), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let at = 0;
      for (const f of frames) {
        data.set(f, at);
        at += f.length;
      }
      return toWavBase64(await toMono16k(buffer));
    } finally {
      void ctx.close();
    }
  });
  return { stop: () => { tapped = true; finish(); }, result };
}

async function toMono16k(buffer: AudioBuffer) {
  const offline = new OfflineAudioContext(1, Math.ceil(buffer.duration * RATE), RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination); // a 1-channel destination mixes stereo down to mono
  source.start();
  return (await offline.startRendering()).getChannelData(0);
}

function toWavBase64(pcm: Float32Array) {
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const ascii = (at: number, s: string) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);       // fmt chunk size
  view.setUint16(20, 1, true);        // PCM
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true); // bytes per second
  view.setUint16(32, 2, true);        // bytes per sample
  view.setUint16(34, 16, true);       // bits per sample
  ascii(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((x, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true));

  const bytes = new Uint8Array(view.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
