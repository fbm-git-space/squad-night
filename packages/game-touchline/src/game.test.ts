import { describe, it, expect } from "vitest";
import { initTouchline, reduceTouchline, getTouchlineView } from "./index.js";
import type { Player } from "@party/shared";
import { createGrid, validateClue, isOperativeTurn, teamHasOperatives } from "./types.js";

const mockPlayers: Player[] = [
  { id: "p1", name: "Alice", color: "#E63946", isHost: true, connected: true },
  { id: "p2", name: "Bob", color: "#457B9D", isHost: false, connected: true },
  { id: "p3", name: "Carol", color: "#2A9D8F", isHost: false, connected: true },
  { id: "p4", name: "Dave", color: "#E9C46A", isHost: false, connected: true },
];

const twoPlayers: Player[] = mockPlayers.slice(0, 2);

describe("validateClue", () => {
  it("rejects empty clues", () => {
    expect(validateClue("", createGrid(Array(25).fill("word")))).toBeTruthy();
  });

  it("rejects multi-word clues", () => {
    expect(validateClue("two words", createGrid(Array(25).fill("word")))).toBeTruthy();
  });

  it("rejects clues matching board words", () => {
    const grid = createGrid(["Messi", ...Array(24).fill("other")]);
    expect(validateClue("Messi", grid)).toBeTruthy();
  });

  it("accepts valid clues", () => {
    const grid = createGrid(Array(25).fill("word"));
    expect(validateClue("Striker", grid)).toBeNull();
  });
});

describe("initTouchline", () => {
  it("creates a valid game state", () => {
    const state = initTouchline({
      players: mockPlayers,
      config: { wordPackId: "legends" },
    });
    expect(state.grid).toHaveLength(25);
    expect(state.phase).toBe("briefing");
    expect(state.homeManagerId).toBeTruthy();
    expect(state.awayManagerId).toBeTruthy();
  });

  it("works with two players", () => {
    const state = initTouchline({
      players: twoPlayers,
      config: { wordPackId: "legends" },
    });
    expect(state.homeTeamIds).toHaveLength(1);
    expect(state.awayTeamIds).toHaveLength(1);
    expect(teamHasOperatives(state, "home")).toBe(false);
    expect(teamHasOperatives(state, "away")).toBe(false);
  });
});

describe("two-player mode", () => {
  it("allows solo manager to guess after giving a clue", () => {
    const state = initTouchline({
      players: twoPlayers,
      config: { wordPackId: "legends" },
    });
    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    s = reduceTouchline(s, { type: "give_clue", word: "", count: 1 }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    expect(isOperativeTurn(s, state.homeManagerId)).toBe(true);
  });

  it("allows voice clue without a typed word", () => {
    const state = initTouchline({
      players: twoPlayers,
      config: { wordPackId: "legends" },
    });
    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    s = reduceTouchline(s, { type: "give_clue", word: "", count: 2 }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    expect(s.phase).toBe("guessing");
    expect(s.currentClue?.word).toBe("");
    expect(s.currentClue?.count).toBe(2);
  });

  it("shows operative role when solo manager is guessing", () => {
    const state = initTouchline({
      players: twoPlayers,
      config: { wordPackId: "legends" },
    });
    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    s = reduceTouchline(s, { type: "give_clue", word: "", count: 2 }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    const view = getTouchlineView(s, state.homeManagerId, twoPlayers);
    expect(view.role).toBe("operative");
    expect(view.canGuess).toBe(true);
    expect(view.canSeeColors).toBe(false);
  });

  it("assassin hit by home team gives away the win", () => {
    const state = initTouchline({
      players: twoPlayers,
      config: { wordPackId: "legends" },
    });
    const assassinCard = state.grid.find((c) => c.type === "assassin");
    expect(assassinCard).toBeDefined();

    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    s = reduceTouchline(s, { type: "give_clue", word: "", count: 1 }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    const result = reduceTouchline(
      s,
      { type: "guess", cardId: assassinCard!.id },
      state.homeManagerId
    );
    if ("error" in result) throw new Error(result.error);
    expect(result.phase).toBe("finished");
    expect(result.winner).toBe("away");
    expect(result.turnMessage).toContain("Home hit the assassin");
  });
});

describe("reduceTouchline", () => {
  it("allows manager to start from briefing", () => {
    const state = initTouchline({
      players: mockPlayers,
      config: { wordPackId: "legends" },
    });
    const result = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.phase).toBe("clue");
    }
  });

  it("rejects clue from wrong team manager", () => {
    const state = initTouchline({
      players: mockPlayers,
      config: { wordPackId: "legends" },
    });
    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    const result = reduceTouchline(
      s,
      { type: "give_clue", word: "Legend", count: 2 },
      state.awayManagerId
    );
    expect("error" in result).toBe(true);
  });
});
