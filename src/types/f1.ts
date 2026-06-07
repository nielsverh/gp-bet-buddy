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
  time?: string; // UTC time of the race start, e.g. "15:00:00Z" (when known)
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

// Special "firstRetirement" bet value meaning "no one retires this race"
export const NO_RETIREMENTS = 'NONE';

// 20 hand-picked colors that read well as filled avatar circles with white text,
// spread evenly around the hue wheel so players are easy to tell apart at a glance.
export const PLAYER_COLORS = [
  'hsl(0, 72%, 51%)',    // Red
  'hsl(14, 80%, 52%)',   // Vermilion
  'hsl(28, 85%, 50%)',   // Orange
  'hsl(38, 92%, 50%)',   // Amber
  'hsl(48, 85%, 45%)',   // Gold
  'hsl(65, 60%, 42%)',   // Olive
  'hsl(88, 55%, 42%)',   // Lime
  'hsl(110, 55%, 42%)',  // Grass green
  'hsl(142, 60%, 45%)',  // Green
  'hsl(165, 60%, 40%)',  // Teal green
  'hsl(185, 70%, 40%)',  // Teal
  'hsl(195, 80%, 45%)',  // Cyan
  'hsl(210, 70%, 55%)',  // Blue
  'hsl(225, 65%, 58%)',  // Royal blue
  'hsl(245, 60%, 60%)',  // Indigo
  'hsl(265, 55%, 58%)',  // Violet
  'hsl(280, 60%, 55%)',  // Purple
  'hsl(305, 55%, 52%)',  // Magenta
  'hsl(330, 70%, 55%)',  // Pink
  'hsl(350, 75%, 55%)',  // Rose
];
