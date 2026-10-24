export type Mood = "idle" | "listening" | "thinking" | "reading" | "searching" | "writing" | "running" | "error" | "waiting" | "compacting" | "done" | "sleeping";

export type Cue = "blip" | "wake" | "key" | "boing" | "sigh" | "bell" | "fanfare" | "yawn" | "snore" | "whirr" | "spin" | "quiet";

export type Gaze = { x: number; y: number };

export type AgentEvent = {
  hook_event_name: string;
  tool_name?: string;
  failed?: boolean;
  notification_type?: string;
  message?: string;
  source?: string;
  detail?: string;
  summary?: string;
  project?: string;
};

export type Critter = {
  feel: (mood: Mood, now?: number) => void;
  replay: (now?: number) => void;
  look: (gaze: Gaze) => void;
  frame: (now: number) => void;
};

export type Mounted = {
  canvas: HTMLCanvasElement;
  feel: (mood: Mood) => void;
  look: (gaze: Gaze) => void;
  replay: () => void;
  destroy: () => void;
};

export type Brain = { feed: (event: AgentEvent) => void; set: (mood: Mood) => void; stop: () => void };

export declare const moods: Mood[];
export declare const words: Record<Mood, string>;
export declare const world: { width: number; height: number; floor: number };
export declare const tone: Record<string, string | string[]>;
export declare const skins: Partial<Record<Mood, string>>;

export declare function createTermling(
  canvas: HTMLCanvasElement,
  initial: Mood,
  gaze: Gaze,
  options?: { perch?: boolean; tint?: boolean; seed?: number; spread?: number; period?: number; beats?: number; onCue?: (cue: Cue) => void },
): Critter;
export declare function mount(target: HTMLElement, options?: { mood?: Mood; pixel?: number; perch?: boolean; tint?: boolean; gaze?: Gaze; onCue?: (cue: Cue) => void }): Mounted;
export declare function moodFor(event: AgentEvent): { now?: Mood; later?: [number, Mood] } | null;
export declare function moodOfTool(tool?: string): Mood;
export declare function describe(event: AgentEvent): string;
export declare function createBrain(initial: Mood, onMood: (mood: Mood, cause: string | null) => void, sleepAfter?: number): Brain;

export declare const sound: {
  wake: () => void;
  setMuted: (value: boolean) => void;
  setMusic: (value: boolean) => void;
  stop: () => void;
  cue: (name: Cue) => void;
};
