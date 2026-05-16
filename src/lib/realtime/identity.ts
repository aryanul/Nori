import type { UserIdentity } from "@/types/realtime";

const STORAGE_KEY = "nori:user";

const PALETTE = [
  "#fb7185", // rose
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fbbf24", // amber
  "#7dd3fc", // sky
  "#f472b6", // pink
  "#facc15", // yellow
  "#60a5fa", // blue
];

const ADJECTIVES = [
  "Curious",
  "Quiet",
  "Lively",
  "Bright",
  "Calm",
  "Bold",
  "Swift",
  "Warm",
];

const ANIMALS = [
  "Otter",
  "Fox",
  "Heron",
  "Lynx",
  "Whale",
  "Crane",
  "Moth",
  "Mole",
];

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function getOrCreateUserIdentity(): UserIdentity {
  if (typeof window === "undefined") {
    return { id: "ssr", name: "Guest", color: "#7dd3fc" };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserIdentity>;
      if (parsed.id && parsed.name && parsed.color) {
        return parsed as UserIdentity;
      }
    }
  } catch {
    // fall through
  }
  const identity: UserIdentity = {
    id: randomId(),
    name: `${randomOf(ADJECTIVES)} ${randomOf(ANIMALS)}`,
    color: randomOf(PALETTE),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // ignore
  }
  return identity;
}
