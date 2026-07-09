export interface WordPack {
  id: string;
  name: string;
  description: string;
  words: string[];
}

export const WORD_PACKS: WordPack[] = [
  {
    id: "legends",
    name: "Legends & Stars",
    description: "Iconic players from across the decades",
    words: [
      "Messi", "Ronaldo", "Pelé", "Maradona", "Zidane", "Ronaldinho", "Henry", "Beckham",
      "Cruyff", "Maldini", "Buffon", "Casillas", "Neuer", "Ramos", "Puyol", "Kaka",
      "Iniesta", "Xavi", "Modric", "Kroos", "Salah", "Haaland", "Mbappe", "Neymar",
      "Benzema", "Lewandowski", "Suarez", "Aguero", "Kane", "De Bruyne", "Gerrard",
      "Lampard", "Scholes", "Rooney", "Shevchenko", "Rivaldo", "Figo", "Bergkamp",
      "Van Persie", "Totti", "Del Piero", "Batistuta", "Romario", "Eusebio", "Best",
      "Charlton", "Platini", "Matthaus", "Beckenbauer", "Muller", "R9", "Klose",
      "Owen", "Torres", "Villa", "Xabi Alonso", "Fabregas", "Pirlo", "Totti", "Cannavaro",
      "Nesta", "Thuram", "Desailly", "Vieira", "Makelele", "Essien", "Robben", "Ribery",
      "Ozil", "Bale", "Hazard", "Courtois", "Alisson", "Ederson", "Van Dijk", "Drogba",
      "Eto'o", "Samuel", "Yaya", "Pogba", "Griezmann", "Antoine", "Modric", "Rijkaard",
      "Gullit", "Van Basten", "Makélélé", "Seedorf", "Roberto Carlos", "Cafu", "Carlos Alberto",
      "Zico", "Socrates", "Kaka", "Adriano", "Tevez", "Mascherano", "Di Maria", "Higuain",
      "Icardi", "Lukaku", "Son", "Salah", "Mane", "Firmino", "Sturridge", "Suarez",
      "Cavani", "Falcao", "Aguero", "Tevez", "Hamsik", "Insigne", "Immobile", "Vlahovic",
    ],
  },
  {
    id: "clubs-competitions",
    name: "Clubs & Competitions",
    description: "Teams, trophies, tactics, and stadium culture",
    words: [
      "Champions League", "World Cup", "Premier League", "La Liga", "Serie A", "Bundesliga",
      "El Clasico", "Derby", "Transfer", "Penalty", "Offside", "Corner", "Free Kick",
      "Hat-trick", "Clean Sheet", "Stoppage Time", "Extra Time", "VAR", "Red Card",
      "Yellow Card", "Captain", "Substitute", "Formation", "Tactics", "Counter Attack",
      "Pressing", "Tiki-taka", "Crossbar", "Goalkeeper", "Striker", "Midfielder",
      "Defender", "Winger", "Fullback", "Sweeper", "False Nine", "Set Piece", "Throw-in",
      "Anfield", "Camp Nou", "Old Trafford", "San Siro", "Wembley", "Maracana", "Allianz",
      "Emirates", "Etihad", "Stamford Bridge", "White Hart Lane", "Signal Iduna", "Parc des Princes",
      "Real Madrid", "Barcelona", "Manchester United", "Liverpool", "Bayern Munich", "Juventus",
      "AC Milan", "Inter Milan", "Arsenal", "Chelsea", "Manchester City", "Tottenham",
      "PSG", "Borussia Dortmund", "Ajax", "Benfica", "Porto", "Galatasaray", "Celtic",
      "Rangers", "FIFA", "UEFA", "Copa America", "Euros", "FA Cup", "Copa del Rey",
      "Super Cup", "Ballon d'Or", "Golden Boot", "Relegation", "Promotion", "Playoffs",
      "Group Stage", "Knockout", "Semi Final", "Final", "Underdog", "Rivalry", "Ultras",
      "Chants", "Scarf", "Kit", "Boots", "Pitch", "Grass", "Turf", "Injury Time",
      "Wall", "Overlap", "Through Ball", "Header", "Volley", "Bicycle Kick", "Nutmeg",
      "Dribble", "Tackle", "Save", "Assist", "Own Goal", "Golden Goal", "Away Goals",
    ],
  },
];

export function getWordPack(id: string): WordPack | undefined {
  return WORD_PACKS.find((p) => p.id === id);
}

export function pickWords(packId: string, count: number): string[] {
  const pack = getWordPack(packId);
  if (!pack) throw new Error(`Unknown word pack: ${packId}`);

  const shuffled = [...pack.words].sort(() => Math.random() - 0.5);
  const unique = [...new Set(shuffled)];
  if (unique.length < count) {
    throw new Error(`Word pack ${packId} does not have enough unique words`);
  }
  return unique.slice(0, count);
}
