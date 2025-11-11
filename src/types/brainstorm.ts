export type CardType = "image" | "prompt" | "constraint";

export interface BrainstormCard {
  id: string;
  type: CardType;
  text?: string;      // for prompt/constraint
  imageUrl?: string;  // for image
  credit?: string;    // optional attribution
  tags?: string[];    // optional tags for future filters
}

export interface BrainstormConfig {
  title?: string;
  timerMinutes?: number; // default 15
  allowCopy?: boolean;   // not used in single-card deck
}

