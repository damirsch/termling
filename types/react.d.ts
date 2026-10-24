import type { CSSProperties, JSX } from "react";
import type { AgentEvent, Cue, Gaze, Mood } from "./index";

export type TermlingProps = {
  mood?: Mood;
  pixel?: number;
  perch?: boolean;
  tint?: boolean;
  gaze?: Gaze;
  onCue?: (cue: Cue) => void;
  className?: string;
  style?: CSSProperties;
};

export declare function Termling(props: TermlingProps): JSX.Element;
export declare function useAgentMood(initial?: Mood, sleepAfter?: number): [Mood, (event: AgentEvent) => void];
