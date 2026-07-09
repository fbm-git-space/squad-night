import type { Socket, Server } from "socket.io";
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

interface RoomState {
  code: string;
  phase: "lobby" | "playing" | "finished";
  players: Map<string, Player>;
  connections: Map<string, string>;
  hostId: string | null;
  /** Room creator — regains host on reconnect when possible. */
  founderId: string | null;
  settings: RoomSettings;
  gameState: unknown | null;
}

export class GameRoom {
  private state: RoomState;
  private io: Server;

  constructor(code: string, io: Server) {
    this.io = io;
    this.state = {
      code: code.toUpperCase(),
      phase: "lobby",
      players: new Map(),
      connections: new Map(),
      hostId: null,
      founderId: null,
      settings: { gameId: "touchline", wordPackId: "legends", coopManagerId: null },
      gameState: null,
    };
  }

  get code(): string {
    return this.state.code;
  }

  isEmpty(): boolean {
    return this.getConnectedPlayers().length === 0;
  }

  handleDisconnect(socket: Socket): void {
    const playerId = this.state.connections.get(socket.id);
    if (!playerId) return;

    this.state.connections.delete(socket.id);
    const player = this.state.players.get(playerId);
    if (player) player.connected = false;

    if (this.state.hostId === playerId) {
      this.assignHost();
    }
    this.broadcastState();
  }

  handleMessage(socket: Socket, parsed: ClientMessage): void {
    switch (parsed.type) {
      case "join":
        this.handleJoin(socket, parsed.playerId, parsed.name, parsed.claimHost);
        break;
      case "leave":
        this.handleLeave(socket);
        break;
      case "update_settings":
        this.handleUpdateSettings(socket, parsed.settings);
        break;
      case "start_game":
        this.handleStartGame(socket);
        break;
      case "game_action":
        this.handleGameAction(socket, parsed.action);
        break;
      case "return_to_lobby":
        this.handleReturnToLobby(socket);
        break;
      default:
        this.sendError(socket, "Unknown message type");
    }
  }

  private syncHostFlags(): void {
    for (const p of this.state.players.values()) {
      p.isHost = p.id === this.state.hostId;
    }
  }

  private assignHost(): void {
    if (this.state.founderId) {
      const founder = this.state.players.get(this.state.founderId);
      if (founder?.connected) {
        this.state.hostId = founder.id;
        this.syncHostFlags();
        return;
      }
    }

    for (const p of this.state.players.values()) {
      p.isHost = false;
    }
    const connected = this.getConnectedPlayers();
    if (connected.length === 0) {
      this.state.hostId = null;
      return;
    }
    this.state.hostId = connected[0].id;
    connected[0].isHost = true;
  }

  private setRoomHost(playerId: string, asFounder: boolean): void {
    if (asFounder) {
      this.state.founderId = playerId;
    }
    this.state.hostId = playerId;
    this.syncHostFlags();
  }

  private handleJoin(
    socket: Socket,
    existingId?: string,
    name?: string,
    claimHost?: boolean
  ): void {
    const displayName = name?.trim().slice(0, 20);
    if (!displayName) {
      this.sendError(socket, "Name is required");
      return;
    }

    let playerId = existingId;
    let player = playerId ? this.state.players.get(playerId) : undefined;

    if (player && player.name === displayName) {
      player.connected = true;
      this.state.connections.set(socket.id, player.id);
      playerId = player.id;
    } else {
      playerId = generatePlayerId();
      const usedColors = [...this.state.players.values()].map((p) => p.color);
      const isFirst = this.state.players.size === 0;

      player = {
        id: playerId,
        name: displayName,
        color: pickPlayerColor(usedColors),
        isHost: false,
        connected: true,
      };

      this.state.players.set(playerId, player);
      this.state.connections.set(socket.id, playerId);

      if (isFirst && !this.state.founderId && !claimHost) {
        this.setRoomHost(playerId, true);
      }
    }

    if (claimHost) {
      this.setRoomHost(playerId!, true);
    } else if (playerId === this.state.founderId) {
      this.setRoomHost(playerId!, false);
    } else {
      const host = this.state.hostId ? this.state.players.get(this.state.hostId) : null;
      if (!host?.connected) {
        this.assignHost();
      } else {
        this.syncHostFlags();
      }
    }

    socket.emit("server", {
      type: "room_state",
      room: this.buildSnapshot(),
      playerId: player!.id,
    } satisfies ServerMessage);
    this.broadcastState();
  }

  private handleLeave(socket: Socket): void {
    const playerId = this.state.connections.get(socket.id);
    if (!playerId) return;

    this.state.connections.delete(socket.id);
    this.state.players.delete(playerId);

    if (this.state.hostId === playerId) {
      if (playerId === this.state.founderId) {
        this.state.founderId = null;
      }
      this.assignHost();
    }

    if (this.state.settings.coopManagerId === playerId) {
      this.state.settings.coopManagerId = null;
    }

    this.broadcastState();
    socket.disconnect();
  }

  private handleUpdateSettings(socket: Socket, settings?: Partial<RoomSettings>): void {
    if (!this.isHost(socket)) {
      this.sendError(socket, "Only the host can change settings");
      return;
    }
    if (this.state.phase !== "lobby") {
      this.sendError(socket, "Cannot change settings during a game");
      return;
    }

    this.state.settings = { ...this.state.settings, ...settings };

    if (this.state.settings.gameId !== "touchline-coop") {
      this.state.settings.coopManagerId = null;
    }

    if (
      this.state.settings.coopManagerId &&
      !this.getConnectedPlayers().some((p) => p.id === this.state.settings.coopManagerId)
    ) {
      this.state.settings.coopManagerId = null;
    }

    this.broadcastState();
  }

  private handleStartGame(socket: Socket): void {
    if (!this.isHost(socket)) {
      this.sendError(socket, "Only the host can start the game");
      return;
    }
    if (this.state.phase !== "lobby") {
      this.sendError(socket, "Game already in progress");
      return;
    }

    const gameId = this.state.settings.gameId;
    if (!gameId) {
      this.sendError(socket, "No game selected");
      return;
    }

    const game = getGame(gameId);
    if (!game) {
      this.sendError(socket, "Unknown game");
      return;
    }

    const players = this.getConnectedPlayers();
    if (players.length < game.minPlayers) {
      this.sendError(socket, `Need at least ${game.minPlayers} players`);
      return;
    }

    if (players.length > game.maxPlayers) {
      this.sendError(socket, `Maximum ${game.maxPlayers} players for this game`);
      return;
    }

    if (gameId === "touchline-coop") {
      const managerId = this.state.settings.coopManagerId;
      if (!managerId || !players.some((p) => p.id === managerId)) {
        this.sendError(socket, "Choose who will be Manager before starting");
        return;
      }
    }

    this.state.gameState = game.init({
      players,
      config: {
        wordPackId: this.state.settings.wordPackId,
        coopManagerId: this.state.settings.coopManagerId,
      },
    });
    this.state.phase = "playing";
    this.broadcastState();
  }

  private handleGameAction(socket: Socket, action: unknown): void {
    if (this.state.phase !== "playing" || !this.state.gameState) {
      this.sendError(socket, "No active game");
      return;
    }

    const playerId = this.state.connections.get(socket.id);
    if (!playerId) {
      this.sendError(socket, "Not in room");
      return;
    }

    const gameId = this.state.settings.gameId;
    const game = gameId ? getGame(gameId) : undefined;
    if (!game) {
      this.sendError(socket, "Unknown game");
      return;
    }

    const result = game.reduce(this.state.gameState, action as never, playerId);
    if (result && typeof result === "object" && "error" in result) {
      this.sendError(socket, String(result.error));
      return;
    }

    this.state.gameState = result;
    if (game.isFinished(this.state.gameState)) {
      this.state.phase = "finished";
    }
    this.broadcastState();
  }

  private handleReturnToLobby(socket: Socket): void {
    if (!this.isHost(socket)) {
      this.sendError(socket, "Only the host can return to lobby");
      return;
    }

    this.state.phase = "lobby";
    this.state.gameState = null;
    this.broadcastState();
  }

  private isHost(socket: Socket): boolean {
    const playerId = this.state.connections.get(socket.id);
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

  private broadcastState(): void {
    const snapshot = this.buildSnapshot();
    this.io.to(this.state.code).emit("server", {
      type: "room_state",
      room: snapshot,
    } satisfies ServerMessage);
  }

  private sendError(socket: Socket, message: string): void {
    socket.emit("server", { type: "error", message } satisfies ServerMessage);
  }
}
