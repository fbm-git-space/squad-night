import type { Player } from "@party/shared";

export interface GameContext {
  players: Player[];
  config: Record<string, unknown>;
}

export interface GameDefinition<TState = unknown, TAction = unknown, TView = unknown> {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  init(context: GameContext): TState;
  reduce(state: TState, action: TAction, playerId: string): TState | { error: string };
  getView(state: TState, playerId: string): TView;
  isFinished(state: TState): boolean;
}

export interface GameRegistryEntry {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  init: GameDefinition["init"];
  reduce: GameDefinition["reduce"];
  getView: GameDefinition["getView"];
  isFinished: GameDefinition["isFinished"];
}

const registry = new Map<string, GameRegistryEntry>();

export function registerGame(game: GameRegistryEntry): void {
  registry.set(game.id, game);
}

export function getGame(id: string): GameRegistryEntry | undefined {
  return registry.get(id);
}

export function listGames(): GameRegistryEntry[] {
  return Array.from(registry.values());
}
