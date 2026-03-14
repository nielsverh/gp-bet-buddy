import type { Bet, RaceResult, RaceScore } from '@/types/f1';
import { F1_POINTS_SCALE } from '@/types/f1';
import { isRetirement, isDNS } from './f1api';

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

  // P10 scoring (symmetric)
  const p10Result = results.find(r => r.driver.driverId === bet.p10);
  if (p10Result && !isRetirement(p10Result.status)) {
    const diff = Math.abs(p10Result.position - 10);
    score.p10Points = diff < F1_POINTS_SCALE.length ? F1_POINTS_SCALE[diff] : 0;
  }

  // First retirement scoring (exclude DNS)
  const retirees = results.filter(r => isRetirement(r.status) && !isDNS(r.status));
  if (retirees.length > 0 && bet.firstRetirement) {
    // Retiree with highest position number = fewest laps completed = retired first
    const sortedRetirees = retirees.sort((a, b) => b.position - a.position);
    const firstToRetire = sortedRetirees[0];
    
    if (firstToRetire.driver.driverId === bet.firstRetirement) {
      score.retirementPoints = 10;
    }
  }

  score.total = score.gpWinnerPoints + score.p10Points + score.retirementPoints;
  return score;
}
