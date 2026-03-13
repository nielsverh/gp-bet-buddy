import type { Player, Bet, RaceScore } from '@/types/f1';
import { PLAYER_COLORS } from '@/types/f1';

const STORAGE_KEY = 'f1-betting-poule';

interface StoredData {
  players: Player[];
  bets: Bet[];
  scores: RaceScore[];
  currentSeason: number;
}

function getAll(): StoredData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      players: [],
      bets: [],
      scores: [],
      currentSeason: new Date().getFullYear(),
    };
  }
  return JSON.parse(raw);
}

function saveAll(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
