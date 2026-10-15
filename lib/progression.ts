// Levels, unlocks, art styles and wheel prizes. Shared by server and client.
// The XP thresholds here must match the database: the Writers' Room policy
// checks 500 XP (level 5) in the progression migration.

export type Unlock =
  | { kind: "style"; style: StyleId }
  | { kind: "room" }
  | { kind: "frame"; frame: "gold" | "holo" }
  | { kind: "creation" };

export const LEVELS = [
  { level: 1, xp: 0, title: "Lurker", unlock: { kind: "style", style: "classic" } },
  { level: 2, xp: 50, title: "Open Mic", unlock: { kind: "style", style: "renaissance" } },
  { level: 3, xp: 150, title: "Class Clown", unlock: { kind: "style", style: "disposable" } },
  { level: 4, xp: 300, title: "Regular", unlock: { kind: "style", style: "claymation" } },
  { level: 5, xp: 500, title: "Headliner", unlock: { kind: "room" } },
  { level: 6, xp: 750, title: "Crowd Favorite", unlock: { kind: "style", style: "pixar" } },
  { level: 7, xp: 1050, title: "Meme Lord", unlock: { kind: "frame", frame: "gold" } },
  { level: 8, xp: 1400, title: "Roast Master", unlock: { kind: "style", style: "noir" } },
  { level: 9, xp: 1800, title: "Icon", unlock: { kind: "creation" } },
  { level: 10, xp: 2250, title: "Legend", unlock: { kind: "frame", frame: "holo" } },
] as const satisfies readonly { level: number; xp: number; title: string; unlock: Unlock }[];

export const MAX_LEVEL = LEVELS.length;
export const WRITERS_ROOM_LEVEL = 5;

export function levelInfo(xp: number) {
  const current = [...LEVELS].reverse().find((l) => xp >= l.xp) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  return {
    level: current.level,
    title: current.title,
    xp,
    floor: current.xp,
    next,
    // 0..1 progress toward the next level (1 at max level).
    progress: next ? (xp - current.xp) / (next.xp - current.xp) : 1,
    toNext: next ? next.xp - xp : 0,
  };
}

export const STYLES = {
  classic: {
    label: "Classic",
    emoji: "✨",
    level: 1,
    prompt: null, // The AI picks whatever style fits the joke best.
  },
  renaissance: {
    label: "Renaissance painting",
    emoji: "🖼️",
    level: 2,
    prompt: "a dramatic Renaissance oil painting with chiaroscuro lighting, ornate and painterly",
  },
  disposable: {
    label: "'90s disposable camera",
    emoji: "📸",
    level: 3,
    prompt: "a candid 1990s disposable camera photo with harsh flash, film grain and a date stamp feel",
  },
  claymation: {
    label: "Claymation",
    emoji: "🧸",
    level: 4,
    prompt: "a stop-motion claymation scene with visible fingerprints in the clay, Aardman style",
  },
  pixar: {
    label: "Pixar-style",
    emoji: "🎬",
    level: 6,
    prompt: "a polished 3D animated movie still in a Pixar-like style, expressive characters, warm lighting",
  },
  noir: {
    label: "Film noir",
    emoji: "🕵️",
    level: 8,
    prompt: "a black-and-white 1940s film noir still with hard shadows, venetian-blind light and rain",
  },
} as const;
export type StyleId = keyof typeof STYLES;

export function isStyleId(value: string): value is StyleId {
  return value in STYLES;
}

export function dailyLimit(level: number, hasBonus: boolean) {
  return (level >= 9 ? 4 : 3) + (hasBonus ? 1 : 0);
}

export function frameFor(level: number): "gold" | "holo" | null {
  if (level >= 10) return "holo";
  if (level >= 7) return "gold";
  return null;
}

export function describeUnlock(unlock: Unlock) {
  switch (unlock.kind) {
    case "style":
      return { emoji: STYLES[unlock.style].emoji, label: `${STYLES[unlock.style].label} art style` };
    case "room":
      return { emoji: "🎬", label: "Writers' Room: vote on tomorrow's theme" };
    case "frame":
      return unlock.frame === "gold"
        ? { emoji: "🥇", label: "Gold frame on your riffs" }
        : { emoji: "🌈", label: "Holographic frame on your riffs" };
    case "creation":
      return { emoji: "➕", label: "4 creations a day instead of 3" };
  }
}

// Daily visit XP, matching check_in() in the database.
export function visitXp(streak: number) {
  return 10 + 5 * Math.min(streak, 7);
}

// Wheel segments in order around the wheel. `chance` must match spin_wheel().
export const PRIZES = [
  { id: "xp10", label: "+10 XP", short: "+10", chance: 0.35, color: "#ffb38a" },
  { id: "xp25", label: "+25 XP", short: "+25", chance: 0.3, color: "#ff8a5c" },
  { id: "xp50", label: "+50 XP", short: "+50", chance: 0.2, color: "#ff5a1f" },
  { id: "freeze", label: "Streak freeze", short: "🧊", chance: 0.1, color: "#60a5fa" },
  { id: "creation", label: "Extra creation today", short: "➕", chance: 0.05, color: "#a855f7" },
] as const;
export type PrizeId = (typeof PRIZES)[number]["id"];
