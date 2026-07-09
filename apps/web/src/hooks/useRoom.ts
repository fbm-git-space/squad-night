"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  createGameSocket,
  sendMessage,
  getStoredPlayerId,
  storePlayerId,
  clearStoredPlayerId,
  type RoomSnapshot,
  type ServerMessage,
} from "@/lib/party";

interface UseRoomOptions {
  roomCode: string;
  playerName: string;
}

export function useRoom({ roomCode, playerName }: UseRoomOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmedName = playerName.trim();
    if (!roomCode || !trimmedName) return;

    const socket = createGameSocket(roomCode);
    socketRef.current = socket;

    const storedId = getStoredPlayerId(roomCode, trimmedName);

    socket.on("connect", () => {
      setConnected(true);
      sendMessage(socket, {
        type: "join",
        playerId: storedId,
        name: trimmedName,
      });
    });

    socket.on("server", (data: ServerMessage) => {
      if (data.type === "room_state") {
        setRoom(data.room ?? null);
        if (data.playerId) {
          setPlayerId(data.playerId);
          storePlayerId(roomCode, trimmedName, data.playerId);
        }
        setError(null);
      } else if (data.type === "error") {
        setError(data.message ?? "Something went wrong");
      }
    });

    socket.on("connect_error", () => {
      setError("Could not connect to game server. Is it running?");
      setConnected(false);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode, playerName]);

  const updateSettings = useCallback(
    (settings: { gameId?: string | null; wordPackId?: string | null }) => {
      if (!socketRef.current) return;
      sendMessage(socketRef.current, { type: "update_settings", settings });
    },
    []
  );

  const startGame = useCallback(() => {
    if (!socketRef.current) return;
    sendMessage(socketRef.current, { type: "start_game" });
  }, []);

  const sendGameAction = useCallback((action: unknown) => {
    if (!socketRef.current) return;
    sendMessage(socketRef.current, { type: "game_action", action });
  }, []);

  const returnToLobby = useCallback(() => {
    if (!socketRef.current) return;
    sendMessage(socketRef.current, { type: "return_to_lobby" });
  }, []);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    sendMessage(socketRef.current, { type: "leave" });
    clearStoredPlayerId(roomCode);
  }, [roomCode]);

  return {
    room,
    playerId,
    connected,
    error,
    updateSettings,
    startGame,
    sendGameAction,
    returnToLobby,
    leaveRoom,
  };
}

export { NAME_STORAGE_KEY } from "@/lib/party";
