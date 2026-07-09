"use client";

import { GAMES } from "@party/shared";
import { WORD_PACKS } from "@party/game-touchline";
import type { RoomSnapshot } from "@party/shared";
import { HowToPlay } from "@/components/HowToPlay";

interface LobbyProps {
  room: RoomSnapshot;
  playerId: string | null;
  onUpdateSettings: (settings: {
    gameId?: string;
    wordPackId?: string;
    coopManagerId?: string | null;
  }) => void;
  onStart: () => void;
  error: string | null;
}

export function Lobby({ room, playerId, onUpdateSettings, onStart, error }: LobbyProps) {
  const isHost = playerId === room.hostId;
  const game = GAMES.find((g) => g.id === room.settings.gameId);
  const connectedPlayers = room.players.filter((p) => p.connected);
  const connectedCount = connectedPlayers.length;
  const isCoop = room.settings.gameId === "touchline-coop";
  const coopManagerId = room.settings.coopManagerId;
  const coopRolesReady =
    !isCoop || (connectedCount === 2 && !!coopManagerId);

  const canStart =
    isHost &&
    game &&
    connectedCount >= game.minPlayers &&
    connectedCount <= game.maxPlayers &&
    coopRolesReady;

  const fitsPlayerCount = (g: (typeof GAMES)[number]) =>
    connectedCount >= g.minPlayers && connectedCount <= g.maxPlayers;

  function selectGame(gId: string) {
    if (gId === "touchline-coop") {
      onUpdateSettings({
        gameId: gId,
        coopManagerId: coopManagerId ?? playerId ?? null,
      });
    } else {
      onUpdateSettings({ gameId: gId, coopManagerId: null });
    }
  }

  function coopRoleLabel(pId: string): string | null {
    if (!isCoop || connectedCount !== 2 || !coopManagerId) return null;
    if (pId === coopManagerId) return "Manager";
    const partner = connectedPlayers.find((p) => p.id !== coopManagerId);
    if (partner?.id === pId) return "Partner";
    return null;
  }

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
        <h2 className="font-semibold text-white/80">Players ({connectedCount})</h2>
        <ul className="space-y-2">
          {connectedPlayers.map((p) => {
            const coopRole = coopRoleLabel(p.id);
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 truncate">{p.name}</span>
                {p.id === room.hostId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold">
                    Host
                  </span>
                )}
                {coopRole && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      coopRole === "Manager"
                        ? "bg-home/30 text-home"
                        : "bg-gold/20 text-gold"
                    }`}
                  >
                    {coopRole}
                  </span>
                )}
                {p.id === playerId && (
                  <span className="text-xs text-white/40">you</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {(room.settings.gameId === "touchline" ||
        room.settings.gameId === "touchline-coop") && (
        <HowToPlay compact coop={isCoop} />
      )}

      {isHost ? (
        <div className="card-surface p-4 space-y-4">
          <h2 className="font-semibold text-white/80">Game setup</h2>

          <div className="space-y-2">
            <p className="text-sm text-white/50">Game</p>
            {GAMES.map((g) => {
              const fits = fitsPlayerCount(g);
              return (
                <button
                  key={g.id}
                  onClick={() => fits && selectGame(g.id)}
                  disabled={!fits}
                  className={`w-full text-left p-4 rounded-xl transition-all border ${
                    room.settings.gameId === g.id
                      ? "border-pitch-light bg-pitch/30"
                      : fits
                        ? "border-white/10 bg-black/20 hover:bg-black/30"
                        : "border-white/5 bg-black/10 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-sm text-white/60 mt-1">{g.description}</p>
                  <p className="text-xs text-white/40 mt-2">
                    {g.minPlayers}–{g.maxPlayers} players
                    {!fits && connectedCount < g.minPlayers && " · need more players"}
                    {!fits && connectedCount > g.maxPlayers && " · too many players"}
                  </p>
                </button>
              );
            })}
          </div>

          {isCoop && connectedCount === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-white/50">Co-op roles</p>
              <p className="text-xs text-white/40">
                Choose who sees the board colours and gives clues.
              </p>
              <div className="grid gap-2">
                {connectedPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onUpdateSettings({ coopManagerId: p.id })}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      coopManagerId === p.id
                        ? "border-home bg-home/20"
                        : "border-white/10 bg-black/20 hover:bg-black/30"
                    }`}
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-white/50">
                      {coopManagerId === p.id ? "Manager" : "Tap to set as Manager"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(room.settings.gameId === "touchline" ||
            room.settings.gameId === "touchline-coop") && (
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
              : isCoop && connectedCount === 2 && !coopManagerId
                ? "Choose who is Manager"
                : game && connectedCount > game.maxPlayers
                  ? `Too many players (max ${game.maxPlayers})`
                  : `Need ${game ? Math.max(0, game.minPlayers - connectedCount) : 4} more player(s)`}
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
          {isCoop && coopManagerId && connectedCount === 2 && (
            <p className="text-xs text-white/40">
              Manager: {room.players.find((p) => p.id === coopManagerId)?.name ?? "—"}
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
