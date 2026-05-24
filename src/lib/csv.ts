import type { StoredData } from './storage';
import type { Bet, RaceScore } from '@/types/f1';
import { PLAYER_COLORS } from '@/types/f1';

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(...fields: string[]): string {
  return fields.map(csvEscape).join(',');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function exportToCSV(data: StoredData): string {
  const lines: string[] = [];

  lines.push('PLAYERS');
  lines.push(csvRow('name', 'color'));
  for (const player of data.players) {
    lines.push(csvRow(player.name, player.color));
  }
  lines.push('');

  lines.push('BETS');
  lines.push(csvRow('season', 'round', 'player', 'gpWinner', 'p10', 'firstRetirement'));
  for (const bet of data.bets) {
    const player = data.players.find(p => p.id === bet.playerId);
    if (!player) continue;
    lines.push(csvRow(
      String(bet.season),
      String(bet.raceRound),
      player.name,
      bet.gpWinner,
      bet.p10,
      bet.firstRetirement,
    ));
  }
  lines.push('');

  lines.push('SCORES');
  lines.push(csvRow('season', 'round', 'player', 'gpWinnerPoints', 'p10Points', 'retirementPoints', 'total'));
  for (const score of data.scores) {
    const player = data.players.find(p => p.id === score.playerId);
    const bet = data.bets.find(b => b.playerId === score.playerId && b.raceRound === score.raceRound);
    if (!player || !bet) continue;
    lines.push(csvRow(
      String(bet.season),
      String(score.raceRound),
      player.name,
      String(score.gpWinnerPoints),
      String(score.p10Points),
      String(score.retirementPoints),
      String(score.total),
    ));
  }

  return lines.join('\n');
}

export interface ParsedCSVSummary {
  players: number;
  bets: number;
  scores: number;
}

export function parseCSV(csv: string): { data: StoredData; summary: ParsedCSVSummary } {
  const lines = csv.split('\n');
  let section = '';
  let skipHeader = false;

  const playersByName = new Map<string, { id: string; name: string; color: string }>();
  const bets: Bet[] = [];
  const scores: RaceScore[] = [];
  let currentSeason = new Date().getFullYear();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === 'PLAYERS' || line === 'BETS' || line === 'SCORES') {
      section = line;
      skipHeader = true;
      continue;
    }

    if (skipHeader) {
      skipHeader = false;
      continue;
    }

    const fields = parseCsvLine(line);

    if (section === 'PLAYERS') {
      const [name, color] = fields;
      if (!name) continue;
      playersByName.set(name, {
        id: crypto.randomUUID(),
        name,
        color: color || PLAYER_COLORS[playersByName.size % PLAYER_COLORS.length],
      });
    } else if (section === 'BETS') {
      const [season, round, playerName, gpWinner, p10, firstRetirement] = fields;
      const player = playersByName.get(playerName);
      if (!player) continue;
      const seasonNum = parseInt(season);
      if (seasonNum) currentSeason = Math.max(currentSeason, seasonNum);
      bets.push({
        playerId: player.id,
        raceRound: parseInt(round),
        season: seasonNum,
        gpWinner: gpWinner || '',
        p10: p10 || '',
        firstRetirement: firstRetirement || '',
      });
    } else if (section === 'SCORES') {
      const [, round, playerName, gpWinnerPoints, p10Points, retirementPoints, total] = fields;
      const player = playersByName.get(playerName);
      if (!player) continue;
      scores.push({
        playerId: player.id,
        raceRound: parseInt(round),
        gpWinnerPoints: parseInt(gpWinnerPoints) || 0,
        p10Points: parseInt(p10Points) || 0,
        retirementPoints: parseInt(retirementPoints) || 0,
        total: parseInt(total) || 0,
      });
    }
  }

  return {
    data: {
      players: Array.from(playersByName.values()),
      bets,
      scores,
      currentSeason,
    },
    summary: {
      players: playersByName.size,
      bets: bets.length,
      scores: scores.length,
    },
  };
}
