// Short beeps for timer events. Browsers only allow audio after a user
// gesture, so `unlock()` is called from the Start button.
let context: AudioContext | null = null;

export function unlockAudio(): void {
  if (context) return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (Ctor) context = new Ctor();
}

/** `count` beeps: 1 = warning, 2 = phase over, 3 = interview over. */
export function beep(count: number): void {
  if (!context) return;
  for (let i = 0; i < count; i++) {
    const at = context.currentTime + i * 0.22;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = count === 1 ? 660 : 880;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.15, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(gain).connect(context.destination);
    osc.start(at);
    osc.stop(at + 0.2);
  }
}
