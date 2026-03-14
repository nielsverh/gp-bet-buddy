import type { Player, Bet, RaceScore } from '@/types/f1';
import { PLAYER_COLORS } from '@/types/f1';

interface StoredData {
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

// Initial load from server
export async function initStorage(): Promise<void> {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      cache = await res.json();
      return;
    }
  } catch {
    // API not available, fall back to localStorage
  }
  const raw = localStorage.getItem('f1-betting-poule');
  cache = raw ? JSON.parse(raw) : { ...DEFAULT_DATA };
}

function getAll(): StoredData {
  if (!cache) {
    // Sync fallback for first render before initStorage completes
    const raw = localStorage.getItem('f1-betting-poule');
    cache = raw ? JSON.parse(raw) : { ...DEFAULT_DATA };
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
    id: crypto.randomUUID(),
    name,
    color: PLAYER_COLORS[data.players.length % PLAYER_COLORS.length],
  };
  data.players.push(player);
  saveAll(data);
  return player;
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
  if (season) return data.scores.filter(s => {
    const bet = data.bets.find(b => b.playerId === s.playerId && b.raceRound === s.raceRound);
    return bet?.season === season;
  });
  return data.scores;
}

export function saveScore(score: RaceScore) {
  const data = getAll();
  const idx = data.scores.findIndex(
    s => s.playerId === score.playerId && s.raceRound === score.raceRound
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
