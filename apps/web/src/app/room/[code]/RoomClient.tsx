"use client";

import { useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getTouchlineView } from "@party/game-touchline";
import type { TouchlineState } from "@party/game-touchline";
import { useRoom, NAME_STORAGE_KEY } from "@/hooks/useRoom";
import { Lobby } from "@/components/Lobby";
import { TouchlineGame } from "@/components/TouchlineGame";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const searchParams = useSearchParams();
  const claimHost = searchParams.get("host") === "1";
  const [playerName, setPlayerName] = useState("");
  const [nameReady, setNameReady] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("name")?.trim() ?? "";
    const fromStorage = localStorage.getItem(NAME_STORAGE_KEY)?.trim() ?? "";
    setPlayerName(fromUrl || fromStorage);
    setNameReady(true);
  }, [searchParams]);

  const {
    room,
    playerId,
    connected,
    error,
    updateSettings,
    startGame,
    sendGameAction,
    returnToLobby,
  } = useRoom({
    roomCode: code,
    playerName,
    claimHost,
  });

  if (!nameReady) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="card-surface p-8 text-center text-white/60">Loading…</div>
      </main>
    );
  }

  if (!playerName) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p>Enter your name on the home page first.</p>
          <Link href="/" className="btn-primary inline-block">
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-4 pb-8 max-w-lg mx-auto">
      <header className="flex items-center justify-between py-3 mb-2">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70">
          Squad Night
        </Link>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            connected ? "bg-pitch-light/30 text-pitch-light" : "bg-red-500/20 text-red-400"
          }`}
        >
          {connected ? "Connected" : "Connecting…"}
        </span>
      </header>

      {!room ? (
        <div className="card-surface p-8 text-center space-y-3 text-white/60">
          <p>Joining room as <span className="text-white">{playerName}</span>…</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      ) : room.phase === "lobby" ? (
        <Lobby
          room={room}
          playerId={playerId}
          onUpdateSettings={updateSettings}
          onStart={startGame}
          error={error}
        />
      ) : (room.settings.gameId === "touchline" ||
          room.settings.gameId === "touchline-coop") &&
        playerId ? (
        <TouchlineGame
          view={getTouchlineView(
            room.gameState as TouchlineState,
            playerId,
            room.players
          )}
          players={room.players}
          onAction={sendGameAction}
          onReturnToLobby={returnToLobby}
          isHost={playerId === room.hostId}
          hostName={
            room.players.find((p) => p.id === room.hostId)?.name ?? "the host"
          }
          error={error}
        />
      ) : (
        <div className="card-surface p-8 text-center">Unknown game state</div>
      )}
    </main>
  );
}
