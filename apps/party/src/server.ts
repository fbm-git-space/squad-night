import type * as Party from "partykit/server";
import {
  generatePlayerId,
  pickPlayerColor,
  type ClientMessage,
  type Player,
  type RoomSettings,
  type RoomSnapshot,
  type ServerMessage,
} from "@party/shared";
import { getGame } from "@party/game-core";
import "@party/game-touchline";
import { getTouchlineView } from "@party/game-touchline";

interface RoomState {
  code: string;
  phase: "lobby" | "playing" | "finished";
  players: Map<string, Player>;
  connections: Map<string, string>;
  hostId: string | null;
  settings: RoomSettings;
  gameState: unknown | null;
}

export default class RoomServer implements Party.Server {
  private state: RoomState;

  constructor(readonly room: Party.Room) {
    this.state = {
      code: room.id.toUpperCase(),
      phase: "lobby",
      players: new Map(),
      connections: new Map(),
      hostId: null,
      settings: { gameId: "touchline", wordPackId: "legends" },
      gameState: null,
    };
  }

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({ type: "connected" } satisfies ServerMessage));
  }

  private assignHost(): void {
    for (const p of this.state.players.values()) {
      p.isHost = false;
    }
    const connected = [...this.state.players.values()].filter((p) => p.connected);
    if (connected.length === 0) {
      this.state.hostId = null;
      return;
    }
    connected[0].isHost = true;
    this.state.hostId = connected[0].id;
  }

  onClose(conn: Party.Connection) {
    const playerId = this.state.connections.get(conn.id);
    if (!playerId) return;

    this.state.connections.delete(conn.id);
    const player = this.state.players.get(playerId);
    if (player) {
      player.connected = false;
    }

    if (this.state.hostId === playerId) {
      this.assignHost();
    }

    this.broadcastState();
  }

  onMessage(message: string, sender: Party.Connection) {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message) as ClientMessage;
    } catch {
      this.sendError(sender, "Invalid message");
      return;
    }

    switch (parsed.type) {
      case "join":
        this.handleJoin(sender, parsed.playerId, parsed.name);
        break;
      case "leave":
        this.handleLeave(sender);
        break;
      case "update_settings":
        this.handleUpdateSettings(sender, parsed.settings);
        break;
      case "start_game":
        this.handleStartGame(sender);
        break;
      case "game_action":
        this.handleGameAction(sender, parsed.action);
        break;
      case "return_to_lobby":
        this.handleReturnToLobby(sender);
        break;
      default:
        this.sendError(sender, "Unknown message type");
    }
  }

  private handleJoin(conn: Party.Connection, existingId?: string, name?: string) {
    const displayName = name?.trim().slice(0, 20);
    if (!displayName) {
      this.sendError(conn, "Name is required");
      return;
    }

    let playerId = existingId;
    let player = playerId ? this.state.players.get(playerId) : undefined;

    if (player && player.name === displayName) {
      player.connected = true;
      this.state.connections.set(conn.id, player.id);
    } else {
      playerId = generatePlayerId();
      const usedColors = [...this.state.players.values()].map((p) => p.color);
      const isFirst = this.state.players.size === 0;

      player = {
        id: playerId,
        name: displayName,
        color: pickPlayerColor(usedColors),
        isHost: isFirst,
        connected: true,
      };

      this.state.players.set(playerId, player);
      this.state.connections.set(conn.id, playerId);

      if (isFirst) {
        this.state.hostId = playerId;
      }
    }

    const host = this.state.hostId ? this.state.players.get(this.state.hostId) : null;
    if (!host?.connected) {
      this.assignHost();
    }

    conn.send(
      JSON.stringify({
        type: "room_state",
        room: this.buildSnapshot(),
        playerId: player!.id,
      } satisfies ServerMessage)
    );
    this.broadcastState();
  }

  private handleLeave(conn: Party.Connection) {
    const playerId = this.state.connections.get(conn.id);
    if (!playerId) return;

    this.state.connections.delete(conn.id);
    this.state.players.delete(playerId);

    if (this.state.hostId === playerId) {
      this.assignHost();
    }

    this.broadcastState();
    conn.close();
  }

  private handleUpdateSettings(conn: Party.Connection, settings?: Partial<RoomSettings>) {
    if (!this.isHost(conn)) {
      this.sendError(conn, "Only the host can change settings");
      return;
    }
    if (this.state.phase !== "lobby") {
      this.sendError(conn, "Cannot change settings during a game");
      return;
    }

    this.state.settings = { ...this.state.settings, ...settings };
    this.broadcastState();
  }

  private handleStartGame(conn: Party.Connection) {
    if (!this.isHost(conn)) {
      this.sendError(conn, "Only the host can start the game");
      return;
    }
    if (this.state.phase !== "lobby") {
      this.sendError(conn, "Game already in progress");
      return;
    }

    const gameId = this.state.settings.gameId;
    if (!gameId) {
      this.sendError(conn, "No game selected");
      return;
    }

    const game = getGame(gameId);
    if (!game) {
      this.sendError(conn, "Unknown game");
      return;
    }

    const players = this.getConnectedPlayers();
    if (players.length < game.minPlayers) {
      this.sendError(conn, `Need at least ${game.minPlayers} players`);
      return;
    }

    this.state.gameState = game.init({
      players,
      config: { wordPackId: this.state.settings.wordPackId },
    });
    this.state.phase = "playing";
    this.broadcastState();
  }

  private handleGameAction(conn: Party.Connection, action: unknown) {
    if (this.state.phase !== "playing" || !this.state.gameState) {
      this.sendError(conn, "No active game");
      return;
    }

    const playerId = this.state.connections.get(conn.id);
    if (!playerId) {
      this.sendError(conn, "Not in room");
      return;
    }

    const gameId = this.state.settings.gameId;
    const game = gameId ? getGame(gameId) : undefined;
    if (!game) {
      this.sendError(conn, "Unknown game");
      return;
    }

    const result = game.reduce(this.state.gameState, action, playerId);
    if (result && typeof result === "object" && "error" in result) {
      this.sendError(conn, result.error);
      return;
    }

    this.state.gameState = result;
    if (game.isFinished(this.state.gameState)) {
      this.state.phase = "finished";
    }
    this.broadcastState();
  }

  private handleReturnToLobby(conn: Party.Connection) {
    if (!this.isHost(conn)) {
      this.sendError(conn, "Only the host can return to lobby");
      return;
    }

    this.state.phase = "lobby";
    this.state.gameState = null;
    this.broadcastState();
  }

  private isHost(conn: Party.Connection): boolean {
    const playerId = this.state.connections.get(conn.id);
    return playerId === this.state.hostId;
  }

  private getConnectedPlayers(): Player[] {
    return [...this.state.players.values()].filter((p) => p.connected);
  }

  private buildSnapshot(): RoomSnapshot {
    return {
      code: this.state.code,
      phase: this.state.phase,
      players: [...this.state.players.values()],
      settings: this.state.settings,
      hostId: this.state.hostId,
      gameState: this.state.gameState,
    };
  }

  private broadcastState() {
    const snapshot = this.buildSnapshot();
    this.room.broadcast(
      JSON.stringify({ type: "room_state", room: snapshot } satisfies ServerMessage)
    );
  }

  private sendError(conn: Party.Connection, message: string) {
    conn.send(JSON.stringify({ type: "error", message } satisfies ServerMessage));
  }
}

RoomServer satisfies Party.Worker;

export function getTouchlineViewForPlayer(
  gameState: unknown,
  playerId: string,
  players: Player[]
) {
  return getTouchlineView(gameState as Parameters<typeof getTouchlineView>[0], playerId, players);
}
