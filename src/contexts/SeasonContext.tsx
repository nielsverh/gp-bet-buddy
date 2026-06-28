import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getAvailableSeasons, getCurrentSeason, setCurrentSeason } from '@/lib/storage';

interface SeasonContextValue {
  selectedSeason: number;
  setSelectedSeason: (season: number) => void;
  availableSeasons: number[];
  refreshAvailableSeasons: () => void;
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [refreshTick, setRefreshTick] = useState(0);
  // refreshTick is a manual invalidation trigger, not a real input to
  // getAvailableSeasons() (which reads from the storage module's cache) —
  // bumping it is how refreshAvailableSeasons() forces a recompute after an
  // import introduces a season we didn't know about yet.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const availableSeasons = useMemo(() => getAvailableSeasons(), [refreshTick]);

  const [selectedSeason, setSelectedSeasonState] = useState(() => {
    const stored = getCurrentSeason();
    return availableSeasons.includes(stored) ? stored : availableSeasons[0];
  });

  function setSelectedSeason(season: number) {
    setSelectedSeasonState(season);
    // Persisted (and synced across devices) purely as a "last viewed season"
    // convenience default for next time — not load-bearing for data integrity.
    setCurrentSeason(season);
  }

  function refreshAvailableSeasons() {
    setRefreshTick(t => t + 1);
  }

  return (
    <SeasonContext.Provider value={{ selectedSeason, setSelectedSeason, availableSeasons, refreshAvailableSeasons }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason(): SeasonContextValue {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error('useSeason must be used within a SeasonProvider');
  return ctx;
}
