export const PLAYER_COLORS = [
  "#E63946",
  "#457B9D",
  "#2A9D8F",
  "#E9C46A",
  "#F4A261",
  "#9B5DE5",
  "#00BBF9",
  "#FE6D73",
  "#06D6A0",
  "#118AB2",
  "#FFD166",
  "#EF476F",
] as const;

export type TeamId = "home" | "away";

export interface Player {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  connected: boolean;
}

export type RoomPhase = "lobby" | "playing" | "finished";

export interface RoomSettings {
  gameId: string | null;
  wordPackId: string | null;
}

export interface RoomSnapshot {
  code: string;
  phase: RoomPhase;
  players: Player[];
  settings: RoomSettings;
  hostId: string | null;
  gameState: unknown | null;
}

export interface ClientMessage {
  type: "join" | "leave" | "update_settings" | "start_game" | "game_action" | "return_to_lobby";
  playerId?: string;
  name?: string;
  settings?: Partial<RoomSettings>;
  action?: unknown;
}

export interface ServerMessage {
  type: "room_state" | "error";
  room?: RoomSnapshot;
  playerId?: string;
  message?: string;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generatePlayerId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function pickPlayerColor(usedColors: string[]): string {
  const available = PLAYER_COLORS.find((c) => !usedColors.includes(c));
  return available ?? PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

export const GAMES = [
  {
    id: "touchline",
    name: "Touchline Clues",
    description: "Word guessing with football names. Clues on party chat — managers see colours, team taps words.",
    minPlayers: 2,
    maxPlayers: 12,
  },
] as const;

export type GameId = (typeof GAMES)[number]["id"];
