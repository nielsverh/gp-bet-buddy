import type { Race, Driver, RaceResult } from '@/types/f1';

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

export async function fetchRaces(season: number): Promise<Race[]> {
  const res = await fetch(`${BASE_URL}/${season}.json`);
  if (!res.ok) throw new Error('Failed to fetch races');
  const data = await res.json();
  const races = data.MRData.RaceTable.Races;
  return races.map((r: any) => ({
    round: parseInt(r.round),
    raceName: r.raceName,
    circuitName: r.Circuit.circuitName,
    date: r.date,
    country: r.Circuit.Location.country,
  }));
}

export async function fetchDrivers(season: number): Promise<Driver[]> {
  const res = await fetch(`${BASE_URL}/${season}/drivers.json?limit=100`);
  if (!res.ok) throw new Error('Failed to fetch drivers');
  const data = await res.json();
  return data.MRData.DriverTable.Drivers.map((d: any) => ({
    driverId: d.driverId,
    code: d.code || d.familyName.substring(0, 3).toUpperCase(),
    givenName: d.givenName,
    familyName: d.familyName,
  }));
}

export async function fetchRaceResults(season: number, round: number): Promise<RaceResult[]> {
  const res = await fetch(`${BASE_URL}/${season}/${round}/results.json`);
  if (!res.ok) throw new Error('Failed to fetch results');
  const data = await res.json();
  const race = data.MRData.RaceTable.Races[0];
  if (!race) return [];
  return race.Results.map((r: any) => ({
    position: parseInt(r.position),
    driver: {
      driverId: r.Driver.driverId,
      code: r.Driver.code || r.Driver.familyName.substring(0, 3).toUpperCase(),
      givenName: r.Driver.givenName,
      familyName: r.Driver.familyName,
      constructorName: r.Constructor?.name,
    },
    status: r.status,
  }));
}

export function isRetirement(status: string): boolean {
  if (status === 'Finished') return false;
  if (/^\+\d+ [Ll]aps?$/.test(status)) return false;
  return true; // DNF, DNS, Accident, Engine, etc.
}

export function isDNS(status: string): boolean {
  return status === 'DNS' || status === 'Did not start';
}
