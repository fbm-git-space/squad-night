import { io, type Socket } from "socket.io-client";
import type { ClientMessage, RoomSnapshot, ServerMessage } from "@party/shared";

export function getGameServerUrl(): string {
  if (process.env.NEXT_PUBLIC_GAME_SERVER_URL) {
    return process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  }
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:3001`;
  }
  return "http://127.0.0.1:3001";
}

export function createGameSocket(roomCode: string): Socket {
  return io(getGameServerUrl(), {
    query: { room: roomCode.toLowerCase() },
    transports: ["websocket", "polling"],
  });
}

export function sendMessage(socket: Socket, message: ClientMessage) {
  socket.emit("client", message);
}

export type { RoomSnapshot, ServerMessage, ClientMessage };

export const NAME_STORAGE_KEY = "squad-night-player-name";

function playerStorageKey(roomCode: string): string {
  return `squad-night-player-${roomCode.toLowerCase()}`;
}

export function getStoredPlayerId(roomCode: string, playerName: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(playerStorageKey(roomCode));
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as { playerId: string; name: string };
    if (stored.name === playerName.trim()) return stored.playerId;
  } catch {
    // ignore
  }
  return undefined;
}

export function storePlayerId(roomCode: string, playerName: string, playerId: string): void {
  sessionStorage.setItem(
    playerStorageKey(roomCode),
    JSON.stringify({ playerId, name: playerName.trim() })
  );
}

export function clearStoredPlayerId(roomCode: string): void {
  sessionStorage.removeItem(playerStorageKey(roomCode));
}
