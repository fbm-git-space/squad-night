"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomCode } from "@party/shared";
import { NAME_STORAGE_KEY } from "@/hooks/useRoom";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    setName(localStorage.getItem(NAME_STORAGE_KEY) ?? "");
  }, []);

  function saveNameAndGo(code: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_STORAGE_KEY, trimmed);
    router.push(`/room/${code.toUpperCase()}?name=${encodeURIComponent(trimmed)}&host=1`);
  }

  function saveNameAndJoin(code: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_STORAGE_KEY, trimmed);
    router.push(`/room/${code.toUpperCase()}?name=${encodeURIComponent(trimmed)}`);
  }

  function handleCreate() {
    saveNameAndGo(generateRoomCode());
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) return;
    saveNameAndJoin(code);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <p className="text-pitch-light text-sm uppercase tracking-widest font-semibold">
            Football party games
          </p>
          <h1 className="font-display text-6xl md:text-7xl tracking-wide text-gold">
            SQUAD NIGHT
          </h1>
          <p className="text-white/70 text-lg">
            Play online with your mates. No downloads, just vibes.
          </p>
        </div>

        <div className="card-surface p-6 space-y-4 text-left">
          <label className="block space-y-2">
            <span className="text-sm text-white/60">Your name</span>
            <input
              className="input-field"
              placeholder="e.g. SalahFan99"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
          </label>

          <button
            className="btn-primary w-full disabled:opacity-40"
            disabled={!name.trim()}
            onClick={handleCreate}
          >
            Create Room
          </button>

          <div className="flex items-center gap-3 text-white/40 text-sm">
            <div className="flex-1 h-px bg-white/10" />
            or join one
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              className="input-field flex-1 uppercase tracking-widest text-center font-mono"
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
            />
            <button
              type="submit"
              className="btn-secondary shrink-0"
              disabled={joinCode.length !== 6 || !name.trim()}
            >
              Join
            </button>
          </form>
        </div>

        <p className="text-white/40 text-sm">
          Share the room link with friends — everyone plays on their own screen.
        </p>
      </div>
    </main>
  );
}
