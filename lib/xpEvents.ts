// The header listens for XP changes so any action (vote, battle pick, new
// riff, wheel spin) can animate the XP bar without a page refresh.
const EVENT = "dailyriff:xp";

export function announceXp(xp: number) {
  window.dispatchEvent(new CustomEvent<number>(EVENT, { detail: xp }));
}

export function onXp(listener: (xp: number) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<number>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
