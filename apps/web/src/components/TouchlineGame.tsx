"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchlineView, TouchlineAction } from "@party/game-touchline";
import type { Player } from "@party/shared";
import { HowToPlay } from "@/components/HowToPlay";

interface TouchlineGameProps {
  view: TouchlineView;
  players: Player[];
  onAction: (action: TouchlineAction) => void;
  onReturnToLobby: () => void;
  isHost: boolean;
  hostName: string;
  error?: string | null;
}

const CARD_TYPE_STYLES: Record<string, string> = {
  home: "bg-home border-home",
  away: "bg-away border-away",
  neutral: "bg-yellow-600 border-yellow-500",
  assassin: "bg-black border-red-500",
};

const REVEALED_TYPE_STYLES: Record<string, string> = {
  home: "bg-home border-2 border-home text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]",
  away: "bg-away border-2 border-away text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]",
  neutral: "bg-yellow-600 border-2 border-yellow-400 text-white",
  assassin: "bg-black border-2 border-red-500 text-red-200",
};

export function TouchlineGame({
  view,
  onAction,
  onReturnToLobby,
  isHost,
  hostName,
  error,
}: TouchlineGameProps) {
  const [clueCount, setClueCount] = useState(1);
  const [optionalClueWord, setOptionalClueWord] = useState("");

  const isActiveManager =
    view.role === "manager" && view.team === view.currentTeam;
  const currentTeamLabel = view.currentTeam === "home" ? "Home" : "Away";

  if (view.phase === "finished") {
    const winMessage =
      view.turnMessage ??
      (view.winner === "home"
        ? "Home team wins!"
        : view.winner === "away"
          ? "Away team wins!"
          : "Game over");

    return (
      <div className="space-y-6 text-center">
        <ScoreBar view={view} />
        <div className="card-surface p-8 space-y-3">
          <p className="font-display text-5xl text-gold">FULL TIME</p>
          <p className="text-xl">{winMessage}</p>
        </div>
        <Board view={view} onGuess={() => {}} canGuess={false} />
        {isHost ? (
          <button className="btn-primary w-full" onClick={onReturnToLobby}>
            Back to Lobby
          </button>
        ) : (
          <div className="card-surface p-4 text-white/60 text-sm">
            <p>Waiting for {hostName} to take everyone back to the lobby…</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-pitch/95 backdrop-blur-sm border-b border-white/10">
        <ScoreBar view={view} />
      </div>

      <details className="card-surface text-sm">
        <summary className="cursor-pointer px-4 py-3 font-semibold text-white/80 hover:text-white list-none flex items-center justify-between">
          How to play
          <span className="text-white/40 text-xs font-normal">tap to open</span>
        </summary>
        <div className="px-4 pb-4 border-t border-white/10">
          <HowToPlay compact embedded />
        </div>
      </details>

      {view.turnMessage && (
        <p className="text-center text-sm bg-black/30 py-2 px-4 rounded-lg text-white/80">
          {view.turnMessage}
        </p>
      )}

      {view.phase === "briefing" && isActiveManager && (
        <div className="card-surface p-4 space-y-3 text-center">
          <p className="font-semibold">You are the {view.team === "home" ? "Home" : "Away"} Manager</p>
          <p className="text-sm text-white/60">
            You see every word&apos;s colour. Study the board, then when ready let your team know on party chat and start the clue phase.
          </p>
          {view.soloTeam && (
            <p className="text-sm text-gold/80">
              Two-player mode: you&apos;ll also tap guesses for your team after giving a clue.
            </p>
          )}
          <button className="btn-primary w-full" onClick={() => onAction({ type: "ready" })}>
            Ready — start my turn
          </button>
        </div>
      )}

      {view.phase === "briefing" && view.role === "manager" && view.team !== view.currentTeam && (
        <div className="card-surface p-4 text-center text-white/60 space-y-2">
          <p>
            {currentTeamLabel} manager ({view.currentTeam === "home" ? view.homeManagerName : view.awayManagerName}) is studying the board…
          </p>
          <p className="text-sm">You&apos;ll get your turn when it&apos;s {view.team === "home" ? "Home" : "Away"}&apos;s clue phase.</p>
        </div>
      )}

      {view.phase === "briefing" && view.role !== "manager" && (
        <div className="card-surface p-4 text-center text-white/60 space-y-2">
          <p>
            You&apos;re on team{" "}
            <span className={view.team === "home" ? "text-home font-semibold" : "text-away font-semibold"}>
              {view.team === "home" ? "Home" : view.team === "away" ? "Away" : "—"}
            </span>
          </p>
          <p className="text-sm">Wait for your manager to study the board. Discuss guesses on party chat when it&apos;s your turn.</p>
          <p className="text-sm mt-1">
            {view.homeManagerName} (Home) · {view.awayManagerName} (Away)
          </p>
        </div>
      )}

      {view.phase === "clue" && isActiveManager && (
        <VoiceClueForm
          clueCount={clueCount}
          optionalWord={optionalClueWord}
          onCountChange={setClueCount}
          onWordChange={setOptionalClueWord}
          onSubmit={() => {
            onAction({
              type: "give_clue",
              word: optionalClueWord.trim(),
              count: clueCount,
            });
            setOptionalClueWord("");
          }}
        />
      )}

      {view.phase === "clue" && !isActiveManager && (
        <div className="card-surface p-4 text-center space-y-1">
          <p className="text-white/70">
            {currentTeamLabel} manager is giving a clue…
          </p>
          <p className="text-sm text-white/40">Listen on party chat</p>
        </div>
      )}

      {view.phase === "guessing" && view.canGuess && (
        <div className="card-surface p-3 text-center bg-gold/10 border border-gold/30">
          <p className="text-sm font-semibold text-gold">
            {view.soloTeam ? "Your turn — tap words on the board" : "Tap a word to guess"}
          </p>
          {view.soloTeam && (
            <p className="text-xs text-white/50 mt-1">Colours hidden — you&apos;re guessing now</p>
          )}
        </div>
      )}

      {view.phase === "guessing" && view.currentClue && (
        <ClueBanner view={view} currentTeamLabel={currentTeamLabel} />
      )}

      <Board
        view={view}
        canGuess={view.canGuess}
        onGuess={(cardId) => onAction({ type: "guess", cardId })}
      />

      {error && (
        <p className="text-center text-red-400 text-sm bg-red-400/10 py-2 px-4 rounded-lg">
          {error}
        </p>
      )}

      {view.phase === "guessing" && view.canAct && (
        <button className="btn-secondary w-full" onClick={() => onAction({ type: "pass" })}>
          Pass turn
        </button>
      )}

      <RoleBadge view={view} />
    </div>
  );
}

function ClueBanner({
  view,
  currentTeamLabel,
}: {
  view: TouchlineView;
  currentTeamLabel: string;
}) {
  const hasTypedClue = view.currentClue?.word.trim();
  const count = view.currentClue?.count ?? 0;

  return (
    <div className="card-surface p-4 text-center space-y-2">
      {hasTypedClue ? (
        <>
          <p className="text-sm text-white/50">Clue</p>
          <p className="font-display text-3xl text-gold tracking-wide">
            {view.currentClue!.word.toUpperCase()} · {count}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-white/50">{currentTeamLabel} manager&apos;s clue</p>
          <p className="font-display text-3xl text-gold tracking-wide">
            🎤 Party chat · {count}
          </p>
          <p className="text-xs text-white/40">
            Clue was said out loud — find up to {count} word{count !== 1 ? "s" : ""}
          </p>
        </>
      )}
      <p className="text-sm text-white/50">
        {view.guessesRemaining} tap{view.guessesRemaining !== 1 ? "s" : ""} left
      </p>
      {view.soloTeam && view.canAct && (
        <p className="text-xs text-white/40">Colours hidden while you guess</p>
      )}
      {view.canAct && view.role === "operative" && (
        <p className="text-xs text-pitch-light">Discuss on party chat, then tap a word</p>
      )}
    </div>
  );
}

function ScoreBar({ view }: { view: TouchlineView }) {
  return (
    <div className="flex gap-2 text-center text-sm">
      <div
        className={`flex-1 py-2 rounded-lg ${
          view.currentTeam === "home" ? "ring-2 ring-home bg-home/20" : "bg-black/20"
        }`}
      >
        <p className="text-home font-semibold">Home</p>
        <p className="font-display text-3xl">{view.homeRemaining}</p>
      </div>
      <div
        className={`flex-1 py-2 rounded-lg ${
          view.currentTeam === "away" ? "ring-2 ring-away bg-away/20" : "bg-black/20"
        }`}
      >
        <p className="text-away font-semibold">Away</p>
        <p className="font-display text-3xl">{view.awayRemaining}</p>
      </div>
    </div>
  );
}

function Board({
  view,
  canGuess,
  onGuess,
}: {
  view: TouchlineView;
  canGuess: boolean;
  onGuess: (id: number) => void;
}) {
  const [flashId, setFlashId] = useState<number | null>(null);
  const prevGuessRef = useRef<number | null>(null);

  useEffect(() => {
    const id = view.lastGuessCardId;
    if (id !== null && id !== prevGuessRef.current) {
      prevGuessRef.current = id;
      setFlashId(id);
      const timer = setTimeout(() => setFlashId(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [view.lastGuessCardId]);

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {view.grid.map((card) => {
        const isFlashing = flashId === card.id;
        const revealedStyle =
          card.revealed && card.type ? REVEALED_TYPE_STYLES[card.type] : null;
        const hiddenStyle =
          !card.revealed && card.type && view.canSeeColors
            ? CARD_TYPE_STYLES[card.type] + " opacity-90"
            : "bg-white/10 border-white/20";

        return (
          <button
            key={card.id}
            disabled={!canGuess || card.revealed}
            onClick={() => onGuess(card.id)}
            className={`relative aspect-square rounded-lg border text-[0.6rem] sm:text-xs font-semibold p-1 transition-all duration-300 leading-tight ${
              revealedStyle ?? hiddenStyle
            } ${
              canGuess && !card.revealed
                ? "hover:scale-105 hover:ring-2 hover:ring-gold cursor-pointer"
                : ""
            } ${card.revealed ? "scale-[0.97] saturate-150" : ""} ${
              isFlashing ? "animate-pulse ring-4 ring-white z-10 scale-105" : ""
            }`}
          >
            {card.revealed && card.type && (
              <span
                className="absolute inset-0 rounded-lg opacity-30 pointer-events-none"
                aria-hidden
                style={{
                  background:
                    card.type === "home"
                      ? "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)"
                      : card.type === "away"
                        ? "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 8px)"
                        : undefined,
                }}
              />
            )}
            <span className={card.revealed ? "line-through decoration-2 opacity-90" : ""}>
              {card.word}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function VoiceClueForm({
  clueCount,
  optionalWord,
  onCountChange,
  onWordChange,
  onSubmit,
}: {
  clueCount: number;
  optionalWord: string;
  onCountChange: (v: number) => void;
  onWordChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="card-surface p-4 space-y-4">
      <div className="text-center space-y-1">
        <p className="font-semibold">Your turn to clue</p>
        <p className="text-sm text-white/60">
          1. Say your one-word clue + number on <strong className="text-white/80">party chat</strong>
        </p>
        <p className="text-sm text-white/60">
          2. Pick the number below, then start guessing
        </p>
        <p className="text-xs text-gold/80 mt-2">
          Example: say &quot;Striker, 2&quot; out loud → set number to 2
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          className="btn-secondary w-12 h-12 text-xl"
          disabled={clueCount <= 1}
          onClick={() => onCountChange(Math.max(1, clueCount - 1))}
        >
          −
        </button>
        <div className="text-center">
          <p className="font-display text-5xl text-gold">{clueCount}</p>
          <p className="text-xs text-white/40">words to find</p>
        </div>
        <button
          type="button"
          className="btn-secondary w-12 h-12 text-xl"
          disabled={clueCount >= 9}
          onClick={() => onCountChange(Math.min(9, clueCount + 1))}
        >
          +
        </button>
      </div>

      <button className="btn-primary w-full" onClick={onSubmit}>
        Start guessing
      </button>

      <details className="text-sm text-white/40">
        <summary className="cursor-pointer hover:text-white/60">Optional: type clue for the board</summary>
        <input
          className="input-field mt-2"
          placeholder="Only if you want it shown on screen"
          value={optionalWord}
          onChange={(e) => onWordChange(e.target.value.replace(/\s/g, ""))}
        />
      </details>
    </div>
  );
}

function RoleBadge({ view }: { view: TouchlineView }) {
  const teamLabel =
    view.team === "home" ? "Home" : view.team === "away" ? "Away" : null;
  const labels = {
    manager: `Manager${teamLabel ? ` (${teamLabel})` : ""}`,
    operative: `Operative${teamLabel ? ` (${teamLabel})` : ""}`,
    spectator: "Spectator",
  };

  return (
    <p className="text-center text-xs text-white/40">
      {labels[view.role]} · {view.wordPackName}
    </p>
  );
}
