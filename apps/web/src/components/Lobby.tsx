"use client";

import { GAMES } from "@party/shared";
import { WORD_PACKS } from "@party/game-touchline";
import type { RoomSnapshot } from "@party/shared";
import { HowToPlay } from "@/components/HowToPlay";

interface LobbyProps {
  room: RoomSnapshot;
  playerId: string | null;
  onUpdateSettings: (settings: { gameId?: string; wordPackId?: string }) => void;
  onStart: () => void;
  error: string | null;
}

export function Lobby({ room, playerId, onUpdateSettings, onStart, error }: LobbyProps) {
  const isHost = playerId === room.hostId;
  const game = GAMES.find((g) => g.id === room.settings.gameId);
  const connectedCount = room.players.filter((p) => p.connected).length;
  const canStart = isHost && game && connectedCount >= game.minPlayers;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-white/50 text-sm">Room code</p>
        <p className="font-display text-5xl tracking-[0.2em] text-gold">{room.code}</p>
        <button
          className="text-sm text-pitch-light hover:underline mt-1"
          onClick={() => {
            const url = `${window.location.origin}/room/${room.code}`;
            navigator.clipboard.writeText(url);
          }}
        >
          Copy room link
        </button>
      </div>

      <div className="card-surface p-4 space-y-3">
        <h2 className="font-semibold text-white/80">
          Players ({connectedCount})
        </h2>
        <ul className="space-y-2">
          {room.players
            .filter((p) => p.connected)
            .map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 truncate">{p.name}</span>
                {p.isHost && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold">
                    Host
                  </span>
                )}
                {p.id === playerId && (
                  <span className="text-xs text-white/40">you</span>
                )}
              </li>
            ))}
        </ul>
      </div>

      {room.settings.gameId === "touchline" && <HowToPlay compact />}

      {isHost ? (
        <div className="card-surface p-4 space-y-4">
          <h2 className="font-semibold text-white/80">Game setup</h2>

          <div className="space-y-2">
            <p className="text-sm text-white/50">Game</p>
            {GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => onUpdateSettings({ gameId: g.id })}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  room.settings.gameId === g.id
                    ? "border-pitch-light bg-pitch/30"
                    : "border-white/10 bg-black/20 hover:bg-black/30"
                }`}
              >
                <p className="font-semibold">{g.name}</p>
                <p className="text-sm text-white/60 mt-1">{g.description}</p>
                <p className="text-xs text-white/40 mt-2">
                  {g.minPlayers}–{g.maxPlayers} players
                </p>
              </button>
            ))}
          </div>

          {room.settings.gameId === "touchline" && (
            <div className="space-y-2">
              <p className="text-sm text-white/50">Word pack</p>
              <div className="grid gap-2">
                {WORD_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => onUpdateSettings({ wordPackId: pack.id })}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      room.settings.wordPackId === pack.id
                        ? "border-pitch-light bg-pitch/30"
                        : "border-white/10 bg-black/20 hover:bg-black/30"
                    }`}
                  >
                    <p className="font-medium">{pack.name}</p>
                    <p className="text-xs text-white/50">{pack.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn-primary w-full disabled:opacity-40"
            disabled={!canStart}
            onClick={onStart}
          >
            {canStart
              ? "Kick Off!"
              : `Need ${game ? game.minPlayers - connectedCount : 4} more player(s)`}
          </button>
        </div>
      ) : (
        <div className="card-surface p-6 text-center text-white/60 space-y-2">
          <p className="text-lg">Waiting for the host to start…</p>
          <p className="text-sm">
            {game?.name ?? "A game"} · {connectedCount} players ready
          </p>
          {room.hostId && (
            <p className="text-xs text-white/40">
              Host: {room.players.find((p) => p.id === room.hostId)?.name ?? "—"}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-center text-red-400 text-sm bg-red-400/10 py-2 px-4 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
