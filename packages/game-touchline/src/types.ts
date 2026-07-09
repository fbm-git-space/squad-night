import type { TeamId } from "@party/shared";

export type CardType = TeamId | "neutral" | "assassin";

export interface GridCard {
  id: number;
  word: string;
  type: CardType;
  revealed: boolean;
}

export type GamePhase =
  | "briefing"
  | "clue"
  | "guessing"
  | "turn_end"
  | "finished";

export type GameMode = "teams" | "coop";

export interface TouchlineState {
  phase: GamePhase;
  mode: GameMode;
  wordPackId: string;
  grid: GridCard[];
  homeManagerId: string;
  awayManagerId: string;
  /** Co-op only — the guessing partner (not a manager). */
  coopOperativeId: string | null;
  homeTeamIds: string[];
  awayTeamIds: string[];
  homeRemaining: number;
  awayRemaining: number;
  currentTeam: TeamId;
  guessesRemaining: number;
  currentClue: { word: string; count: number } | null;
  lastGuessCardId: number | null;
  winner: TeamId | null;
  turnMessage: string | null;
}

export type TouchlineAction =
  | { type: "ready" }
  | { type: "give_clue"; word: string; count: number }
  | { type: "guess"; cardId: number }
  | { type: "pass" }
  | { type: "next_turn" };

export interface TouchlineCardView {
  id: number;
  word: string;
  revealed: boolean;
  type?: CardType;
}

export interface TouchlineView {
  phase: GamePhase;
  mode: GameMode;
  role: "manager" | "operative" | "spectator";
  team: TeamId | null;
  grid: TouchlineCardView[];
  homeRemaining: number;
  awayRemaining: number;
  currentTeam: TeamId;
  guessesRemaining: number;
  currentClue: { word: string; count: number } | null;
  homeManagerName: string;
  awayManagerName: string;
  winner: TeamId | null;
  turnMessage: string | null;
  lastGuessCardId: number | null;
  canAct: boolean;
  canGuess: boolean;
  canSeeColors: boolean;
  wordPackName: string;
}

export const HOME_WORD_COUNT = 9;
export const AWAY_WORD_COUNT = 8;
export const NEUTRAL_COUNT = 7;
export const GRID_SIZE = 25;

export function createGrid(words: string[]): GridCard[] {
  const types: CardType[] = [
    ...Array(HOME_WORD_COUNT).fill("home" as CardType),
    ...Array(AWAY_WORD_COUNT).fill("away" as CardType),
    ...Array(NEUTRAL_COUNT).fill("neutral" as CardType),
    "assassin",
  ];

  const shuffledTypes = types.sort(() => Math.random() - 0.5);

  return words.map((word, i) => ({
    id: i,
    word,
    type: shuffledTypes[i],
    revealed: false,
  }));
}

export function countRemaining(grid: GridCard[], team: TeamId): number {
  return grid.filter((c) => c.type === team && !c.revealed).length;
}

export function getPlayerRole(
  state: TouchlineState,
  playerId: string
): "manager" | "operative" | "spectator" {
  if (state.mode === "coop") {
    if (playerId === state.homeManagerId) return "manager";
    if (playerId === state.coopOperativeId) return "operative";
    return "spectator";
  }
  if (playerId === state.homeManagerId || playerId === state.awayManagerId) {
    return "manager";
  }
  return "operative";
}

export function getPlayerTeam(
  state: TouchlineState,
  playerId: string
): TeamId | null {
  if (state.mode === "coop") {
    if (playerId === state.homeManagerId || playerId === state.coopOperativeId) {
      return "home";
    }
    return null;
  }
  if (state.homeTeamIds.includes(playerId)) return "home";
  if (state.awayTeamIds.includes(playerId)) return "away";
  return null;
}

export function isManagerTurn(state: TouchlineState, playerId: string): boolean {
  const role = getPlayerRole(state, playerId);
  if (role !== "manager") return false;
  if (state.mode === "coop") return state.phase === "clue";
  const team = getPlayerTeam(state, playerId);
  return team === state.currentTeam && state.phase === "clue";
}

export function isOperativeTurn(state: TouchlineState, playerId: string): boolean {
  const team = getPlayerTeam(state, playerId);
  if (state.phase !== "guessing" || state.guessesRemaining <= 0) return false;
  if (team !== state.currentTeam) return false;
  return getPlayerRole(state, playerId) === "operative";
}

export function validateClue(clueWord: string, grid: GridCard[]): string | null {
  const normalized = clueWord.trim().toLowerCase();
  if (!normalized) return "Clue cannot be empty";
  if (normalized.includes(" ")) return "Clue must be a single word";
  const onBoard = grid.some((c) => c.word.toLowerCase() === normalized);
  if (onBoard) return "Clue cannot match a word on the board";
  return null;
}
