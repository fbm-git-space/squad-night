"use client";

interface HowToPlayProps {
  compact?: boolean;
}

function ColourKey() {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-home shrink-0" />
        <span>Home team words</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-away shrink-0" />
        <span>Away team words</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-yellow-700 shrink-0" />
        <span>Neutral — ends your turn</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-black border border-red-600 shrink-0" />
        <span>Assassin — your team loses</span>
      </div>
    </div>
  );
}

export function HowToPlay({ compact = false }: HowToPlayProps) {
  if (compact) {
    return (
      <div className="card-surface p-4 space-y-2 text-sm text-white/70">
        <p className="font-semibold text-white/90">Quick rules</p>
        <ul className="space-y-1.5 list-disc list-inside marker:text-pitch-light">
          <li>Two teams — find all your coloured words first to win.</li>
          <li><strong className="text-white/90">Managers</strong> see every word&apos;s colour. Everyone else sees words only.</li>
          <li>Manager gives a <strong className="text-white/90">one-word clue + number</strong> on party chat (e.g. &quot;Striker, 2&quot;).</li>
          <li>In the app: pick the number, hit <strong className="text-white/90">Start guessing</strong>, then tap words.</li>
          <li>Tap an opponent&apos;s word or a <strong className="text-white/90">neutral</strong> (tan) word — turn over.</li>
          <li>Tap the <strong className="text-white/90">assassin</strong> (black) word — <em>your</em> team loses, the other team wins.</li>
        </ul>
        <p className="text-xs text-white/40 pt-1">Managers — colour key:</p>
        <ColourKey />
      </div>
    );
  }

  return (
    <div className="card-surface p-5 space-y-4 text-sm text-white/70">
      <div>
        <p className="font-display text-2xl text-gold tracking-wide">HOW TO PLAY</p>
        <p className="text-white/50 mt-1">Touchline Clues · ~15 min</p>
      </div>

      <section className="space-y-2">
        <p className="font-semibold text-white/90">The goal</p>
        <p>
          Home and Away each have secret words on the board. First team to reveal all of theirs wins.
        </p>
      </section>

      <section className="space-y-2">
        <p className="font-semibold text-white/90">Board colours (managers only)</p>
        <ColourKey />
      </section>

      <section className="space-y-2">
        <p className="font-semibold text-white/90">Roles</p>
        <ul className="space-y-1 list-disc list-inside marker:text-pitch-light">
          <li><span className="text-home">Manager</span> — sees the full board with colours. Gives clues, never guesses (unless two-player mode).</li>
          <li><span className="text-white/90">Operatives</span> — see words only. Tap the ones they think match the clue.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <p className="font-semibold text-white/90">Clues (party chat friendly)</p>
        <p>
          The manager thinks of <strong className="text-white/90">one word</strong> that links some of their team&apos;s words,
          then says it out loud on Xbox/party chat with a <strong className="text-white/90">number</strong>:
        </p>
        <p className="bg-black/30 rounded-lg px-3 py-2 text-gold font-medium text-center">
          &quot;Legend, 2&quot; → two board words relate to that clue
        </p>
        <p>
          In the app, the manager only picks the number and hits <strong className="text-white/90">Start guessing</strong> — no typing needed.
        </p>
      </section>

      <section className="space-y-2">
        <p className="font-semibold text-white/90">Guessing</p>
        <ul className="space-y-1 list-disc list-inside marker:text-pitch-light">
          <li>Operatives discuss on voice chat, then tap a word.</li>
          <li>Your team&apos;s word — keep going (one bonus guess allowed).</li>
          <li>Opponent&apos;s word or <strong className="text-white/90">neutral</strong> (tan) — turn ends.</li>
          <li><strong className="text-white/90">Assassin</strong> (black) — the team that tapped it loses instantly; the other team wins.</li>
        </ul>
      </section>
    </div>
  );
}
