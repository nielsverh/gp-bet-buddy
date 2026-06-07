import { useCallback, useEffect, useRef, useState } from 'react';
import type { Driver, Race } from '@/types/f1';
import {
  fetchIntervalsSince,
  fetchLatestSession,
  fetchPositionsSince,
  fetchSessionDrivers,
  type OpenF1Session,
} from '@/lib/openf1';
import {
  POLL_INTERVAL_MS,
  RETIREMENT_SILENCE_MS,
  isRaceLiveWindow,
  type LiveGridEntry,
} from '@/lib/liveRace';

interface DriverLiveState {
  position: number | null;
  gapToLeader: string | null;
  interval: string | null;
  lastSeen: Date | null;
}

export interface UseLiveRaceResult {
  // True when "now" falls within the scheduled live window for this race —
  // i.e. when we *should* be polling at all.
  isWindowActive: boolean;
  // True once OpenF1 has confirmed an actual live Race session (can lag the
  // window slightly — sessions sometimes start late).
  isSessionLive: boolean;
  loading: boolean;
  error: string | null;
  grid: LiveGridEntry[];
  lastPoll: Date | null;
  secondsToNextPoll: number;
  pollIntervalSeconds: number;
  refresh: () => void;
}

function formatGap(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return `+${value.toFixed(3)}s`;
  return value; // OpenF1 sometimes returns strings like "1 LAP"
}

export function useLiveRace(race: Race | null, drivers: Driver[]): UseLiveRaceResult {
  const [isWindowActive, setIsWindowActive] = useState(() => (race ? isRaceLiveWindow(race) : false));
  const [isSessionLive, setIsSessionLive] = useState(false);
  const [grid, setGrid] = useState<LiveGridEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [secondsToNextPoll, setSecondsToNextPoll] = useState(POLL_INTERVAL_MS / 1000);

  const sessionRef = useRef<OpenF1Session | null>(null);
  const driverMapRef = useRef<Map<number, Driver>>(new Map());
  const liveStatesRef = useRef<Map<number, DriverLiveState>>(new Map());
  const lastPollRef = useRef<Date | null>(null);
  const pollingRef = useRef(false);
  const driversRef = useRef<Driver[]>(drivers);
  driversRef.current = drivers;

  // Reset all per-session state when we switch to a different race.
  useEffect(() => {
    sessionRef.current = null;
    driverMapRef.current = new Map();
    liveStatesRef.current = new Map();
    lastPollRef.current = null;
    setGrid([]);
    setLastPoll(null);
    setIsSessionLive(false);
    setError(null);
  }, [race?.round]);

  const rebuildGrid = useCallback(() => {
    const now = Date.now();
    const entries: LiveGridEntry[] = [];
    for (const [num, s] of liveStatesRef.current.entries()) {
      const driver = driverMapRef.current.get(num);
      if (!driver || s.position === null) continue;
      const likelyRetired = !!s.lastSeen && now - s.lastSeen.getTime() > RETIREMENT_SILENCE_MS;
      entries.push({
        position: s.position,
        driver,
        gapToLeader: s.gapToLeader,
        interval: s.interval,
        likelyRetired,
        lastSeen: s.lastSeen,
      });
    }
    entries.sort((a, b) => a.position - b.position);
    setGrid(entries);
  }, []);

  const poll = useCallback(async (isManual = false) => {
    if (!race || pollingRef.current) return;
    if (!isRaceLiveWindow(race)) {
      setIsWindowActive(false);
      return;
    }
    setIsWindowActive(true);
    pollingRef.current = true;
    if (isManual) setLoading(true);
    setError(null);

    try {
      let activeSession = sessionRef.current;

      // Resolve (and cache) the live Race session + its driver_number -> Driver mapping.
      if (!activeSession) {
        const latest = await fetchLatestSession();
        if (latest && latest.session_type === 'Race') {
          activeSession = latest;
          sessionRef.current = latest;
          setIsSessionLive(true);

          const sessionDrivers = await fetchSessionDrivers(latest.session_key);
          const map = new Map<number, Driver>();
          for (const sd of sessionDrivers) {
            const match = driversRef.current.find(
              d => d.code.toUpperCase() === sd.name_acronym?.toUpperCase()
            );
            if (match) map.set(sd.driver_number, match);
          }
          driverMapRef.current = map;
          liveStatesRef.current = new Map();
        } else {
          // Within our scheduled window, but OpenF1 doesn't have a live Race
          // session yet (delay, or session ended). Just record that we tried.
          setIsSessionLive(false);
          const now = new Date();
          setLastPoll(now);
          lastPollRef.current = now;
          return;
        }
      }

      // Only fetch what changed since our last poll (small payload, 30s overlap
      // to be safe against clock drift / late-arriving rows).
      const since = lastPollRef.current
        ? new Date(lastPollRef.current.getTime() - 30_000).toISOString()
        : new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const [positions, intervals] = await Promise.all([
        fetchPositionsSince(activeSession.session_key, since),
        fetchIntervalsSince(activeSession.session_key, since),
      ]);

      const ensure = (num: number): DriverLiveState => {
        let s = liveStatesRef.current.get(num);
        if (!s) {
          s = { position: null, gapToLeader: null, interval: null, lastSeen: null };
          liveStatesRef.current.set(num, s);
        }
        return s;
      };

      for (const p of positions) {
        const s = ensure(p.driver_number);
        const date = new Date(p.date);
        if (!s.lastSeen || date > s.lastSeen) {
          s.position = p.position;
          s.lastSeen = date;
        }
      }
      for (const iv of intervals) {
        const s = ensure(iv.driver_number);
        const date = new Date(iv.date);
        s.gapToLeader = formatGap(iv.gap_to_leader);
        s.interval = formatGap(iv.interval);
        if (!s.lastSeen || date > s.lastSeen) s.lastSeen = date;
      }

      rebuildGrid();
      const now = new Date();
      setLastPoll(now);
      lastPollRef.current = now;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Live data ophalen mislukt');
    } finally {
      pollingRef.current = false;
      setLoading(false);
    }
  }, [race, rebuildGrid]);

  // The actual scheduling: poll only while (a) we're in the scheduled live
  // window for this race AND (b) the tab is visible. This is what keeps the
  // Pi/devices quiet outside race weekends — no background timers fire at all
  // when nobody has this page open and looking at it.
  useEffect(() => {
    if (!race) return undefined;

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      poll();
      pollTimer = setInterval(() => poll(), POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const evaluate = () => {
      const active = isRaceLiveWindow(race);
      setIsWindowActive(active);
      if (active && document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    evaluate();
    const windowCheckTimer = setInterval(evaluate, 60_000);
    document.addEventListener('visibilitychange', evaluate);

    return () => {
      stopPolling();
      clearInterval(windowCheckTimer);
      document.removeEventListener('visibilitychange', evaluate);
    };
  }, [race, poll]);

  // 1Hz countdown ticker for the "next update in Xs" display — purely cosmetic,
  // doesn't trigger any network activity itself.
  useEffect(() => {
    const id = setInterval(() => {
      if (!lastPollRef.current) {
        setSecondsToNextPoll(POLL_INTERVAL_MS / 1000);
        return;
      }
      const elapsed = Date.now() - lastPollRef.current.getTime();
      setSecondsToNextPoll(Math.max(0, Math.ceil((POLL_INTERVAL_MS - elapsed) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(() => {
    poll(true);
  }, [poll]);

  return {
    isWindowActive,
    isSessionLive,
    loading,
    error,
    grid,
    lastPoll,
    secondsToNextPoll,
    pollIntervalSeconds: POLL_INTERVAL_MS / 1000,
    refresh,
  };
}
