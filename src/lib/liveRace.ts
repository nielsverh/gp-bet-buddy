import type { Race, Driver, Bet } from '@/types/f1';
import { F1_POINTS_SCALE, NO_RETIREMENTS } from '@/types/f1';

// ---------------------------------------------------------------------------
// Timing constants — these decide how "live" the live page feels vs. how much
// load it puts on the free OpenF1 API and on devices reaching the Pi over
// Tailscale (often mobile data). All polling described here happens *client-side*
// and *only* while this constraints below say we should be "live" — see
// useLiveRace for how that's enforced (visibility + time window).
// ---------------------------------------------------------------------------

// How often we re-fetch live positions/gaps while a race is live and the page
// is open. Why 60 seconds:
//  - This is a *prognosis*, not a timing-tower — what matters for bet outcomes
//    (who's P1/P10, who has retired) typically only changes meaningfully every
//    tens of seconds to minutes, not every second.
//  - OpenF1 is a free, shared, no-auth community API. Polling once a minute per
//    open tab is friendly even if multiple poule members watch simultaneously.
//  - Over Tailscale on mobile data, fewer/chunkier requests beat a constant
//    drip — better battery life and data usage for everyone.
// Because 60s > 30s, the UI also offers a manual "refresh now" button.
export const POLL_INTERVAL_MS = 60_000;

// Start polling this long before the scheduled lights-out (covers grid-walk,
// formation lap, and "is it actually starting on time") and keep polling this
// long afterwards (covers red flags, restarts and races that simply overrun
// — F1 races are scheduled for ~2h but the full window incl. delays can stretch).
const PRE_RACE_WINDOW_MS = 20 * 60 * 1000; // 20 minutes before
const POST_RACE_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours after

// OpenF1 only emits a new position/interval record when something changes, so a
// car that's still circulating will refresh at least every lap (seconds to low
// minutes). If we hear nothing about a driver for this long mid-race, that's a
// strong "this car has stopped" signal — used as our retirement heuristic for
// the prognosis (the official score is still computed from the final results
// once the race is marked complete, exactly as before).
export const RETIREMENT_SILENCE_MS = 4 * 60 * 1000;

export function getRaceStart(race: Race): Date | null {
  if (!race.date) return null;
  const iso = race.time ? `${race.date}T${race.time}` : `${race.date}T00:00:00Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function getLiveWindow(race: Race): { start: Date; end: Date } | null {
  const raceStart = getRaceStart(race);
  if (!raceStart) return null;
  return {
    start: new Date(raceStart.getTime() - PRE_RACE_WINDOW_MS),
    end: new Date(raceStart.getTime() + POST_RACE_WINDOW_MS),
  };
}

export function isRaceLiveWindow(race: Race, now: Date = new Date()): boolean {
  const window = getLiveWindow(race);
  if (!window) return false;
  return now >= window.start && now <= window.end;
}

// The race (if any) whose scheduled live window currently contains `now`.
export function findLiveRace(races: Race[], now: Date = new Date()): Race | null {
  return races.find(r => isRaceLiveWindow(r, now)) ?? null;
}

// The next upcoming race by scheduled start — used for the "nothing live right
// now, here's what's next" state.
export function findNextRace(races: Race[], now: Date = new Date()): Race | null {
  const upcoming = races
    .map(r => ({ race: r, start: getRaceStart(r) }))
    .filter((x): x is { race: Race; start: Date } => x.start !== null && x.start.getTime() > now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return upcoming[0]?.race ?? null;
}

// ---------------------------------------------------------------------------
// Live grid + score projection
// ---------------------------------------------------------------------------

export interface LiveGridEntry {
  position: number;
  driver: Driver;
  gapToLeader: string | null;
  interval: string | null;
  likelyRetired: boolean;
  lastSeen: Date | null;
}

export interface LiveScoreProjection {
  playerId: string;
  gpWinnerPoints: number;
  p10Points: number;
  retirementPoints: number;
  total: number;
}

// Mirrors calculateScore() in scoring.ts but works off a live grid snapshot
// instead of final RaceResult[] — "as if the race ended right now".
export function projectScore(bet: Bet, grid: LiveGridEntry[]): LiveScoreProjection {
  let gpWinnerPoints = 0;
  let p10Points = 0;
  let retirementPoints = 0;

  const winner = grid.find(g => g.driver.driverId === bet.gpWinner);
  if (winner && !winner.likelyRetired) {
    const diff = Math.abs(winner.position - 1);
    gpWinnerPoints = diff < F1_POINTS_SCALE.length ? F1_POINTS_SCALE[diff] : 0;
  }

  const p10 = grid.find(g => g.driver.driverId === bet.p10);
  if (p10 && !p10.likelyRetired) {
    const diff = Math.abs(p10.position - 10);
    p10Points = diff < F1_POINTS_SCALE.length ? F1_POINTS_SCALE[diff] : 0;
  }

  const retiredSoFar = grid
    .filter(g => g.likelyRetired && g.lastSeen)
    .sort((a, b) => (a.lastSeen as Date).getTime() - (b.lastSeen as Date).getTime());

  if (bet.firstRetirement === NO_RETIREMENTS) {
    if (retiredSoFar.length === 0) retirementPoints = 10;
  } else if (retiredSoFar.length > 0 && bet.firstRetirement) {
    if (retiredSoFar[0].driver.driverId === bet.firstRetirement) retirementPoints = 10;
  }

  return {
    playerId: bet.playerId,
    gpWinnerPoints,
    p10Points,
    retirementPoints,
    total: gpWinnerPoints + p10Points + retirementPoints,
  };
}
