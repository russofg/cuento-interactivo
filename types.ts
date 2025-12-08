export interface StoryChoice {
  text: string;
  tone: 'aggressive' | 'romantic' | 'submissive' | 'investigative' | 'neutral'| 'erotic'| 'rought'| 'passionate';
}

export interface StorySegment {
  content: string;
  choices: StoryChoice[];
  isEnding: boolean;
  summary?: string; // Internal use for keeping context concise
}

export interface GameState {
  history: { role: string; text: string }[];
  currentSegment: StorySegment | null;
  isLoading: boolean;
  error: string | null;
  theme: string;
  playerName: string;
  gender: string;
  orientation: string;
}

export enum AppStep {
  AGE_GATE,
  SETUP,
  PLAYING,
  GAME_OVER
}

export const THEMES = [
  "Romance en la Oficina",
  "Fantasía Medieval Oscura",
  "Encuentro en un Bar",
  "Ciencia Ficción Distópica",
  "Thriller de Misterio",
  "Vacaciones Tropicales"
];