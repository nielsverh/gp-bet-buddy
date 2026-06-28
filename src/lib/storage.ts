import type { Player, Bet, RaceScore } from '@/types/f1';
import { PLAYER_COLORS } from '@/types/f1';
import { generateId } from './utils';

export interface StoredData {
  players: Player[];
  bets: Bet[];
  scores: RaceScore[];
  currentSeason: number;
}

const DEFAULT_DATA: StoredData = {
  players: [],
  bets: [],
  scores: [],
  currentSeason: new Date().getFullYear(),
};

// In-memory cache to avoid async everywhere
let cache: StoredData | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// One-time self-heal for data saved before RaceScore had a `season` field:
// those old scores deserialize with season === undefined, which then shows up
// as an "undefined" entry in the season picker. Backfill it from the matching
// bet (same player + round), falling back to the poule's current season if no
// bet is found. Returns true if anything was changed (so callers know to persist).
function migrateLegacyData(data: StoredData): boolean {
  let changed = false;
  for (const score of data.scores) {
    if (!Number.isFinite(score.season)) {
      const matchingBet = data.bets.find(
        b => b.playerId === score.playerId && b.raceRound === score.raceRound
      );
      score.season = matchingBet?.season ?? data.currentSeason;
      changed = true;
    }
  }
  return changed;
}

// Initial load from server
export async function initStorage(): Promise<void> {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      cache = await res.json();
      if (migrateLegacyData(cache)) saveAll(cache);
      return;
    }
  } catch {
    // API not available, fall back to localStorage
  }
  const raw = localStorage.getItem('f1-betting-poule');
  cache = raw ? JSON.parse(raw) : { ...DEFAULT_DATA };
  if (migrateLegacyData(cache)) saveAll(cache);
}

function getAll(): StoredData {
  if (!cache) {
    // Sync fallback for first render before initStorage completes
    const raw = localStorage.getItem('f1-betting-poule');
    cache = raw ? JSON.parse(raw) : { ...DEFAULT_DATA };
    if (migrateLegacyData(cache)) saveAll(cache);
  }
  return cache;
}

function saveAll(data: StoredData) {
  cache = data;
  // Also save to localStorage as immediate backup
  localStorage.setItem('f1-betting-poule', JSON.stringify(data));
  // Debounce server save
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {
      // Server not available, localStorage is the fallback
    });
  }, 300);
}

export function getPlayers(): Player[] {
  return getAll().players;
}

export function savePlayers(players: Player[]) {
  const data = getAll();
  data.players = players;
  saveAll(data);
}

export function addPlayer(name: string): Player {
  const data = getAll();
  const player: Player = {
    id: generateId(),
    name,
    color: PLAYER_COLORS[data.players.length % PLAYER_COLORS.length],
  };
  data.players.push(player);
  saveAll(data);
  return player;
}

export function setPlayerColor(id: string, color: string) {
  const data = getAll();
  const player = data.players.find(p => p.id === id);
  if (player) {
    player.color = color;
    saveAll(data);
  }
}

export function removePlayer(id: string) {
  const data = getAll();
  data.players = data.players.filter(p => p.id !== id);
  data.bets = data.bets.filter(b => b.playerId !== id);
  data.scores = data.scores.filter(s => s.playerId !== id);
  saveAll(data);
}

export function getBets(season?: number): Bet[] {
  const data = getAll();
  if (season) return data.bets.filter(b => b.season === season);
  return data.bets;
}

export function saveBet(bet: Bet) {
  const data = getAll();
  const idx = data.bets.findIndex(
    b => b.playerId === bet.playerId && b.raceRound === bet.raceRound && b.season === bet.season
  );
  if (idx >= 0) {
    data.bets[idx] = bet;
  } else {
    data.bets.push(bet);
  }
  saveAll(data);
}

export function getScores(season?: number): RaceScore[] {
  const data = getAll();
  if (season) return data.scores.filter(s => s.season === season);
  return data.scores;
}

export function saveScore(score: RaceScore) {
  const data = getAll();
  const idx = data.scores.findIndex(
    s => s.playerId === score.playerId && s.raceRound === score.raceRound && s.season === score.season
  );
  if (idx >= 0) {
    data.scores[idx] = score;
  } else {
    data.scores.push(score);
  }
  saveAll(data);
}

export function saveScores(scores: RaceScore[]) {
  scores.forEach(saveScore);
}

export function getCurrentSeason(): number {
  return getAll().currentSeason;
}

export function setCurrentSeason(season: number) {
  const data = getAll();
  data.currentSeason = season;
  saveAll(data);
}

// Seasons worth showing in the season picker: every season we actually have
// bets/scores for, plus the real-world current year so a brand new season
// (with no data yet) is selectable as soon as it starts. Sorted most-recent-first.
export function getAvailableSeasons(): number[] {
  const data = getAll();
  const seasons = new Set<number>();
  for (const bet of data.bets) if (Number.isFinite(bet.season)) seasons.add(bet.season);
  for (const score of data.scores) if (Number.isFinite(score.season)) seasons.add(score.season);
  seasons.add(new Date().getFullYear());
  return Array.from(seasons).sort((a, b) => b - a);
}

export function exportData(): StoredData {
  return getAll();
}

// Merges incoming players/bets/scores into the current poule rather than
// replacing it, so importing an old season's CSV adds that season's history
// instead of wiping out whatever is currently stored (e.g. the live season).
// Players are matched by name (case-insensitive); bets/scores are matched by
// player + race round + season and upserted.
export function importData(incoming: StoredData) {
  const data = getAll();

  const existingByName = new Map(data.players.map(p => [p.name.toLowerCase(), p]));
  const incomingIdToExistingId = new Map<string, string>();

  for (const incomingPlayer of incoming.players) {
    const key = incomingPlayer.name.toLowerCase();
    const existing = existingByName.get(key);
    if (existing) {
      incomingIdToExistingId.set(incomingPlayer.id, existing.id);
    } else {
      const player: Player = { ...incomingPlayer };
      data.players.push(player);
      existingByName.set(key, player);
      incomingIdToExistingId.set(incomingPlayer.id, player.id);
    }
  }

  for (const incomingBet of incoming.bets) {
    const playerId = incomingIdToExistingId.get(incomingBet.playerId);
    if (!playerId) continue;
    const bet: Bet = { ...incomingBet, playerId };
    const idx = data.bets.findIndex(
      b => b.playerId === bet.playerId && b.raceRound === bet.raceRound && b.season === bet.season
    );
    if (idx >= 0) data.bets[idx] = bet; else data.bets.push(bet);
  }

  for (const incomingScore of incoming.scores) {
    const playerId = incomingIdToExistingId.get(incomingScore.playerId);
    if (!playerId) continue;
    const score: RaceScore = { ...incomingScore, playerId };
    const idx = data.scores.findIndex(
      s => s.playerId === score.playerId && s.raceRound === score.raceRound && s.season === score.season
    );
    if (idx >= 0) data.scores[idx] = score; else data.scores.push(score);
  }

  saveAll(data);
}
