// Client for the OpenF1 API (https://openf1.org) — a free, no-key-required API
// that exposes *live* timing data (positions, gaps, race control messages) while
// a session is running. Ergast/Jolpica only has final results, so we need this
// separate source for the "live prognosis" feature.

const OPENF1_BASE = 'https://api.openf1.org/v1';

export interface OpenF1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string; // 'Race' | 'Sprint' | 'Qualifying' | 'Practice' | ...
  date_start: string; // ISO timestamp, UTC
  date_end: string; // ISO timestamp, UTC
  circuit_short_name: string;
  country_name: string;
  year: number;
}

export interface OpenF1Driver {
  driver_number: number;
  name_acronym: string; // 3-letter code, matches Ergast Driver.code (e.g. "VER")
  full_name: string;
  team_name: string;
  team_colour?: string;
}

export interface OpenF1Position {
  driver_number: number;
  position: number;
  date: string; // ISO timestamp
}

export interface OpenF1Interval {
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
  date: string; // ISO timestamp
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${OPENF1_BASE}${path}`);
  if (!res.ok) throw new Error(`OpenF1 request failed: ${path}`);
  return res.json();
}

// Returns the most recent session OpenF1 knows about (or null if the request fails /
// nothing is available). Used to detect whether a Race session is currently live.
export async function fetchLatestSession(): Promise<OpenF1Session | null> {
  try {
    const sessions = await getJson<OpenF1Session[]>('/sessions?session_key=latest');
    return sessions[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchSessionDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
  return getJson<OpenF1Driver[]>(`/drivers?session_key=${sessionKey}`);
}

// `since` (ISO string) limits the response to recent updates only — positions/intervals
// are only recorded when they change, so most polls only need a small recent slice
// rather than the full session history (which can be tens of thousands of rows).
export async function fetchPositionsSince(sessionKey: number, since: string): Promise<OpenF1Position[]> {
  return getJson<OpenF1Position[]>(`/position?session_key=${sessionKey}&date>=${encodeURIComponent(since)}`);
}

export async function fetchIntervalsSince(sessionKey: number, since: string): Promise<OpenF1Interval[]> {
  return getJson<OpenF1Interval[]>(`/intervals?session_key=${sessionKey}&date>=${encodeURIComponent(since)}`);
}
