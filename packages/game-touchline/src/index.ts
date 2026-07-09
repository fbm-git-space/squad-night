import { registerGame, type GameContext } from "@party/game-core";
import type { Player, TeamId } from "@party/shared";
import {
  countRemaining,
  createGrid,
  getPlayerRole,
  getPlayerTeam,
  isManagerTurn,
  isOperativeTurn,
  validateClue,
  type GridCard,
  type TouchlineAction,
  type TouchlineState,
  type TouchlineView,
  GRID_SIZE,
} from "./types.js";
import { getWordPack, pickWords } from "./words.js";

function assignTeams(players: Player[]): {
  homeManagerId: string;
  awayManagerId: string;
  homeTeamIds: string[];
  awayTeamIds: string[];
} {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const home: Player[] = [];
  const away: Player[] = [];

  shuffled.forEach((p, i) => {
    if (i % 2 === 0) home.push(p);
    else away.push(p);
  });

  if (home.length === 0 || away.length === 0) {
    throw new Error("Need at least one player per team");
  }

  const homeManager = home[0];
  const awayManager = away[0];

  return {
    homeManagerId: homeManager.id,
    awayManagerId: awayManager.id,
    homeTeamIds: home.map((p) => p.id),
    awayTeamIds: away.map((p) => p.id),
  };
}

export function initTouchline(context: GameContext): TouchlineState {
  const wordPackId = (context.config.wordPackId as string) ?? "legends";
  const words = pickWords(wordPackId, GRID_SIZE);
  const grid = createGrid(words);
  const { homeManagerId, awayManagerId, homeTeamIds, awayTeamIds } =
    assignTeams(context.players);

  return {
    phase: "briefing",
    wordPackId,
    grid,
    homeManagerId,
    awayManagerId,
    homeTeamIds,
    awayTeamIds,
    homeRemaining: countRemaining(grid, "home"),
    awayRemaining: countRemaining(grid, "away"),
    currentTeam: "home",
    guessesRemaining: 0,
    currentClue: null,
    lastGuessCardId: null,
    winner: null,
    turnMessage: "Home team goes first. Managers study the board, then start the clue phase.",
  };
}

function revealCard(grid: GridCard[], cardId: number): GridCard[] {
  return grid.map((c) => (c.id === cardId ? { ...c, revealed: true } : c));
}

function endTurn(state: TouchlineState, message: string): TouchlineState {
  const nextTeam: TeamId = state.currentTeam === "home" ? "away" : "home";
  return {
    ...state,
    phase: "clue",
    currentTeam: nextTeam,
    guessesRemaining: 0,
    currentClue: null,
    lastGuessCardId: null,
    turnMessage: message,
  };
}

export function reduceTouchline(
  state: TouchlineState,
  action: TouchlineAction,
  playerId: string
): TouchlineState | { error: string } {
  if (state.phase === "finished") {
    return { error: "Game is already finished" };
  }

  switch (action.type) {
    case "ready": {
      if (state.phase !== "briefing") {
        return { error: "Briefing already complete" };
      }
      const role = getPlayerRole(state, playerId);
      if (role !== "manager") {
        return { error: "Only managers can start the game" };
      }
      const team = getPlayerTeam(state, playerId);
      if (team !== state.currentTeam) {
        return { error: "Wait for the other team's manager" };
      }
      return {
        ...state,
        phase: "clue",
        turnMessage: `${state.currentTeam === "home" ? "Home" : "Away"} manager — give your clue!`,
      };
    }

    case "give_clue": {
      if (!isManagerTurn(state, playerId)) {
        return { error: "Not your turn to give a clue" };
      }
      const word = action.word?.trim() ?? "";
      if (word) {
        const clueError = validateClue(word, state.grid);
        if (clueError) return { error: clueError };
      }
      if (action.count < 1 || action.count > 9) {
        return { error: "Count must be between 1 and 9" };
      }

      return {
        ...state,
        phase: "guessing",
        currentClue: { word: word || "", count: action.count },
        guessesRemaining: action.count + 1,
        turnMessage: null,
      };
    }

    case "guess": {
      if (!isOperativeTurn(state, playerId)) {
        return { error: "You cannot guess right now" };
      }

      const card = state.grid.find((c) => c.id === action.cardId);
      if (!card) return { error: "Invalid card" };
      if (card.revealed) return { error: "Card already revealed" };

      const grid = revealCard(state.grid, action.cardId);
      const homeRemaining = countRemaining(grid, "home");
      const awayRemaining = countRemaining(grid, "away");

      if (card.type === "assassin") {
        const losingTeam = state.currentTeam;
        const winningTeam = losingTeam === "home" ? "away" : "home";
        const losingLabel = losingTeam === "home" ? "Home" : "Away";
        const winningLabel = winningTeam === "home" ? "Home" : "Away";
        return {
          ...state,
          grid,
          phase: "finished",
          winner: winningTeam,
          homeRemaining,
          awayRemaining,
          guessesRemaining: 0,
          lastGuessCardId: action.cardId,
          turnMessage: `${losingLabel} hit the assassin — ${winningLabel} win!`,
        };
      }

      if (card.type === "home" && homeRemaining === 0) {
        return {
          ...state,
          grid,
          phase: "finished",
          winner: "home",
          homeRemaining,
          awayRemaining,
          guessesRemaining: 0,
          lastGuessCardId: action.cardId,
          turnMessage: "Home team wins!",
        };
      }

      if (card.type === "away" && awayRemaining === 0) {
        return {
          ...state,
          grid,
          phase: "finished",
          winner: "away",
          homeRemaining,
          awayRemaining,
          guessesRemaining: 0,
          lastGuessCardId: action.cardId,
          turnMessage: "Away team wins!",
        };
      }

      const guessesRemaining = state.guessesRemaining - 1;
      const wrongGuess = card.type !== state.currentTeam;

      if (wrongGuess || guessesRemaining <= 0) {
        const teamLabel = state.currentTeam === "home" ? "Home" : "Away";
        const reason = wrongGuess
          ? `${teamLabel} picked a wrong word — turn over.`
          : `${teamLabel} used all guesses.`;
        return endTurn(
          {
            ...state,
            grid,
            homeRemaining,
            awayRemaining,
            guessesRemaining: 0,
            lastGuessCardId: action.cardId,
          },
          reason
        );
      }

      return {
        ...state,
        grid,
        homeRemaining,
        awayRemaining,
        guessesRemaining,
        lastGuessCardId: action.cardId,
      };
    }

    case "pass": {
      if (!isOperativeTurn(state, playerId)) {
        return { error: "You cannot pass right now" };
      }
      const teamLabel = state.currentTeam === "home" ? "Home" : "Away";
      return endTurn(state, `${teamLabel} passed.`);
    }

    default:
      return { error: "Unknown action" };
  }
}

export function getTouchlineView(
  state: TouchlineState,
  playerId: string,
  players: Player[]
): TouchlineView {
  const role = getPlayerRole(state, playerId);
  const team = getPlayerTeam(state, playerId);
  const pack = getWordPack(state.wordPackId);
  const isManager = role === "manager";
  const showTypes = isManager || state.phase === "finished";

  const homeManager = players.find((p) => p.id === state.homeManagerId);
  const awayManager = players.find((p) => p.id === state.awayManagerId);

  const grid = state.grid.map((card) => ({
    id: card.id,
    word: card.word,
    revealed: card.revealed,
    type: showTypes || card.revealed ? card.type : undefined,
  }));

  const canGiveClue = isManagerTurn(state, playerId);
  const canGuess = isOperativeTurn(state, playerId);

  return {
    phase: state.phase,
    role,
    team,
    grid,
    homeRemaining: state.homeRemaining,
    awayRemaining: state.awayRemaining,
    currentTeam: state.currentTeam,
    guessesRemaining: state.guessesRemaining,
    currentClue: state.currentClue,
    homeManagerName: homeManager?.name ?? "Home Manager",
    awayManagerName: awayManager?.name ?? "Away Manager",
    winner: state.winner,
    turnMessage: state.turnMessage,
    lastGuessCardId: state.lastGuessCardId,
    canAct: canGiveClue || canGuess,
    canGuess,
    canSeeColors: isManager,
    wordPackName: pack?.name ?? state.wordPackId,
  };
}

export function isTouchlineFinished(state: TouchlineState): boolean {
  return state.phase === "finished";
}

registerGame({
  id: "touchline",
  name: "Touchline Clues",
  minPlayers: 4,
  maxPlayers: 8,
  init: initTouchline,
  reduce: reduceTouchline,
  getView: (state, playerId) => {
    throw new Error("Use getTouchlineView with players list");
  },
  isFinished: isTouchlineFinished,
});

export { WORD_PACKS, getWordPack } from "./words.js";
export type { TouchlineState, TouchlineAction, TouchlineView } from "./types.js";
