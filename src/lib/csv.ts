import { getPlayers, getBets, getScores, getCurrentSeason, savePlayers, saveBet, saveScores } from './storage';
import type { Player, Bet, RaceScore } from '@/types/f1';
import { PLAYER_COLORS } from '@/types/f1';

export function exportToCSV(): string {
  const season = getCurrentSeason();
  const players = getPlayers();
  const bets = getBets(season);
  const scores = getScores(season);

  const lines: string[] = [];

  // Section: Players
  lines.push('## PLAYERS');
  lines.push('id,name,color');
  players.forEach(p => lines.push(`${p.id},${esc(p.name)},${esc(p.color)}`));

  lines.push('');

  // Section: Bets
  lines.push('## BETS');
  lines.push('playerId,raceRound,season,gpWinner,p10,firstRetirement');
  bets.forEach(b =>
    lines.push(`${b.playerId},${b.raceRound},${b.season},${b.gpWinner},${b.p10},${b.firstRetirement}`)
  );

  lines.push('');

  // Section: Scores
  lines.push('## SCORES');
  lines.push('playerId,raceRound,gpWinnerPoints,p10Points,retirementPoints,total');
  scores.forEach(s =>
    lines.push(`${s.playerId},${s.raceRound},${s.gpWinnerPoints},${s.p10Points},${s.retirementPoints},${s.total}`)
  );

  return lines.join('\n');
}

export function downloadCSV() {
  const csv = exportToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `f1-poule-${getCurrentSeason()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromCSV(content: string): { players: number; bets: number; scores: number } {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  let section = '';
  let playerCount = 0;
  let betCount = 0;
  let scoreCount = 0;
  const newPlayers: Player[] = [];

  for (const line of lines) {
    if (line.startsWith('## PLAYERS')) { section = 'players'; continue; }
    if (line.startsWith('## BETS'))    { section = 'bets'; continue; }
    if (line.startsWith('## SCORES'))  { section = 'scores'; continue; }
    if (line.startsWith('id,') || line.startsWith('playerId,')) continue; // header

    const cols = parseLine(line);

    if (section === 'players' && cols.length >= 3) {
      newPlayers.push({ id: cols[0], name: cols[1], color: cols[2] });
      playerCount++;
    }

    if (section === 'bets' && cols.length >= 6) {
      saveBet({
        playerId: cols[0],
        raceRound: parseInt(cols[1]),
        season: parseInt(cols[2]),
        gpWinner: cols[3],
        p10: cols[4],
        firstRetirement: cols[5],
      });
      betCount++;
    }

    if (section === 'scores' && cols.length >= 6) {
      saveScores([{
        playerId: cols[0],
        raceRound: parseInt(cols[1]),
        gpWinnerPoints: parseInt(cols[2]),
        p10Points: parseInt(cols[3]),
        retirementPoints: parseInt(cols[4]),
        total: parseInt(cols[5]),
      }]);
      scoreCount++;
    }
  }

  if (newPlayers.length > 0) {
    savePlayers(newPlayers);
  }

  return { players: playerCount, bets: betCount, scores: scoreCount };
}

function esc(val: string): string {
  if (val.includes(',') || val.includes('"')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}
