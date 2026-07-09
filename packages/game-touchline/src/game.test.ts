import { describe, it, expect } from "vitest";
import { initTouchline, initTouchlineCoop, reduceTouchline, getTouchlineView } from "./index.js";
import type { Player } from "@party/shared";
import { createGrid, validateClue, isOperativeTurn } from "./types.js";

const mockPlayers: Player[] = [
  { id: "p1", name: "Alice", color: "#E63946", isHost: true, connected: true },
  { id: "p2", name: "Bob", color: "#457B9D", isHost: false, connected: true },
  { id: "p3", name: "Carol", color: "#2A9D8F", isHost: false, connected: true },
  { id: "p4", name: "Dave", color: "#E9C46A", isHost: false, connected: true },
];

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

  it("assigns one manager and one operative per team with four players", () => {
    const state = initTouchline({
      players: mockPlayers,
      config: { wordPackId: "legends" },
    });
    expect(state.homeTeamIds).toHaveLength(2);
    expect(state.awayTeamIds).toHaveLength(2);
  });
});

const twoPlayers: Player[] = mockPlayers.slice(0, 2);

describe("initTouchlineCoop", () => {
  it("assigns manager and partner roles", () => {
    const state = initTouchlineCoop({
      players: twoPlayers,
      config: { wordPackId: "legends" },
    });
    expect(state.mode).toBe("coop");
    expect(state.homeTeamIds).toHaveLength(2);
    expect(state.awayTeamIds).toHaveLength(0);
    expect(state.coopOperativeId).toBeTruthy();
    expect(state.homeManagerId).not.toBe(state.coopOperativeId);
  });
});

describe("co-op mode", () => {
  it("operative guesses, manager does not", () => {
    const state = initTouchlineCoop({
      players: twoPlayers,
      config: { wordPackId: "legends" },
    });
    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    s = reduceTouchline(s, { type: "give_clue", word: "", count: 1 }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    expect(isOperativeTurn(s, state.coopOperativeId!)).toBe(true);
    expect(isOperativeTurn(s, state.homeManagerId)).toBe(false);
  });

  it("assassin ends the game with no winner", () => {
    const state = initTouchlineCoop({
      players: twoPlayers,
      config: { wordPackId: "legends" },
    });
    const assassinCard = state.grid.find((c) => c.type === "assassin");
    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    s = reduceTouchline(s, { type: "give_clue", word: "", count: 1 }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    const result = reduceTouchline(
      s,
      { type: "guess", cardId: assassinCard!.id },
      state.coopOperativeId!
    );
    if ("error" in result) throw new Error(result.error);
    expect(result.phase).toBe("finished");
    expect(result.winner).toBeNull();
    expect(result.turnMessage).toContain("assassin");
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

  it("rejects ready from away manager during home briefing", () => {
    const state = initTouchline({
      players: mockPlayers,
      config: { wordPackId: "legends" },
    });
    const result = reduceTouchline(state, { type: "ready" }, state.awayManagerId);
    expect("error" in result).toBe(true);
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

  it("allows voice clue without a typed word", () => {
    const state = initTouchline({
      players: mockPlayers,
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

  it("only operatives can guess", () => {
    const state = initTouchline({
      players: mockPlayers,
      config: { wordPackId: "legends" },
    });
    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    s = reduceTouchline(s, { type: "give_clue", word: "", count: 1 }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    expect(isOperativeTurn(s, state.homeManagerId)).toBe(false);
    const operativeId = state.homeTeamIds.find((id) => id !== state.homeManagerId);
    expect(operativeId).toBeTruthy();
    expect(isOperativeTurn(s, operativeId!)).toBe(true);
  });

  it("assassin hit by home team gives away the win", () => {
    const state = initTouchline({
      players: mockPlayers,
      config: { wordPackId: "legends" },
    });
    const assassinCard = state.grid.find((c) => c.type === "assassin");
    expect(assassinCard).toBeDefined();

    let s = reduceTouchline(state, { type: "ready" }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    s = reduceTouchline(s, { type: "give_clue", word: "", count: 1 }, state.homeManagerId);
    if ("error" in s) throw new Error(s.error);
    const operativeId = state.homeTeamIds.find((id) => id !== state.homeManagerId)!;
    const result = reduceTouchline(
      s,
      { type: "guess", cardId: assassinCard!.id },
      operativeId
    );
    if ("error" in result) throw new Error(result.error);
    expect(result.phase).toBe("finished");
    expect(result.winner).toBe("away");
    expect(result.turnMessage).toContain("Home hit the assassin");
  });
});
