export interface Player {
  id: string;
  name: string;
  color: string;
}

export interface Race {
  round: number;
  raceName: string;
  circuitName: string;
  date: string;
  country: string;
}

export interface Driver {
  driverId: string;
  code: string;
  givenName: string;
  familyName: string;
  constructorName?: string;
}

export interface RaceResult {
  position: number;
  driver: Driver;
  status: string;
}

export interface Bet {
  playerId: string;
  raceRound: number;
  season: number;
  gpWinner: string; // driverId
  p10: string; // driverId
  firstRetirement: string; // driverId
}

export interface RaceScore {
  playerId: string;
  raceRound: number;
  gpWinnerPoints: number;
  p10Points: number;
  retirementPoints: number;
  total: number;
}

export interface SeasonData {
  season: number;
  players: Player[];
  bets: Bet[];
  scores: RaceScore[];
}

// F1 points scale for position difference
export const F1_POINTS_SCALE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const PLAYER_COLORS = [
  'hsl(0, 72%, 51%)',    // Red
  'hsl(210, 70%, 55%)',  // Blue
  'hsl(38, 92%, 50%)',   // Amber
  'hsl(142, 60%, 45%)',  // Green
  'hsl(280, 60%, 55%)',  // Purple
  'hsl(190, 80%, 45%)',  // Cyan
  'hsl(330, 70%, 55%)',  // Pink
  'hsl(25, 90%, 55%)',   // Orange
];
