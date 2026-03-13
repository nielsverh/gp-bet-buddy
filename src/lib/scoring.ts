import type { Bet, RaceResult, RaceScore } from '@/types/f1';
import { F1_POINTS_SCALE } from '@/types/f1';
import { isRetirement } from './f1api';

export function calculateScore(bet: Bet, results: RaceResult[]): RaceScore {
  const score: RaceScore = {
    playerId: bet.playerId,
    raceRound: bet.raceRound,
    gpWinnerPoints: 0,
    p10Points: 0,
    retirementPoints: 0,
    total: 0,
  };

  if (results.length === 0) return score;

  // GP Winner scoring
  const winnerResult = results.find(r => r.driver.driverId === bet.gpWinner);
  if (winnerResult && !isRetirement(winnerResult.status)) {
    const diff = Math.abs(winnerResult.position - 1);
    score.gpWinnerPoints = diff < F1_POINTS_SCALE.length ? F1_POINTS_SCALE[diff] : 0;
  }
  // If driver retired → 0 points (already 0)

  // P10 scoring (symmetric)
  const p10Result = results.find(r => r.driver.driverId === bet.p10);
  if (p10Result && !isRetirement(p10Result.status)) {
    const diff = Math.abs(p10Result.position - 10);
    score.p10Points = diff < F1_POINTS_SCALE.length ? F1_POINTS_SCALE[diff] : 0;
  }

  // First retirement scoring
  const retirees = results.filter(r => isRetirement(r.status));
  if (retirees.length > 0 && bet.firstRetirement) {
    // The first retiree is the one with the highest position number (last classified)
    // Actually in F1 results, retirees are listed at the bottom by laps completed
    // The first to retire has the fewest laps, which is the last in the results
    const sortedRetirees = retirees.sort((a, b) => b.position - a.position);
    const firstRetiree = sortedRetirees[sortedRetirees.length - 1];
    // Actually, the retiree with the highest position number retired last (more laps completed)
    // The one who retired first completed fewer laps → lowest position among retirees is wrong
    // In Ergast data, retirees are ordered by laps completed, the last one in results retired first
    // Let's use: first retiree = last position number (most laps NOT completed)
    const firstToRetire = sortedRetirees[0]; // highest position number = retired earliest (fewest laps)
    
    if (firstToRetire.driver.driverId === bet.firstRetirement) {
      score.retirementPoints = 10;
    }
  }

  score.total = score.gpWinnerPoints + score.p10Points + score.retirementPoints;
  return score;
}
