import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, RefreshCw, Clock, AlertTriangle, Flag } from 'lucide-react';
import { fetchRaces, fetchDrivers } from '@/lib/f1api';
import { getPlayers, getBets, getCurrentSeason } from '@/lib/storage';
import { useLiveRace } from '@/hooks/useLiveRace';
import {
  findLiveRace,
  findNextRace,
  getRaceStart,
  projectScore,
  POLL_INTERVAL_MS,
} from '@/lib/liveRace';
import { NO_RETIREMENTS } from '@/types/f1';

function formatTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatCountdown(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'nu';
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `over ${days}d ${hours}u`;
  if (hours > 0) return `over ${hours}u ${minutes}m`;
  return `over ${minutes}m`;
}

export default function Live() {
  const season = getCurrentSeason();
  const players = getPlayers();
  const bets = getBets(season);

  const { data: races = [], isLoading: racesLoading } = useQuery({
    queryKey: ['races', season],
    queryFn: () => fetchRaces(season),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', season],
    queryFn: () => fetchDrivers(season),
  });

  const now = new Date();
  const liveRace = findLiveRace(races, now);
  const nextRace = !liveRace ? findNextRace(races, now) : null;

  const {
    isWindowActive,
    isSessionLive,
    loading,
    error,
    grid,
    lastPoll,
    secondsToNextPoll,
    pollIntervalSeconds,
    refresh,
  } = useLiveRace(liveRace, drivers);

  if (racesLoading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Laden...</div>;
  }

  if (!liveRace) {
    const nextStart = nextRace ? getRaceStart(nextRace) : null;
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <h2 className="text-3xl font-extrabold tracking-tight">Live</h2>
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <Radio className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold">Geen race live op dit moment</p>
            <p className="text-sm text-muted-foreground">
              Deze pagina wordt automatisch actief in een venster rond de geplande start van elke race
              — buiten dat venster wordt er niets opgehaald, om de Pi en de gratis live-databron te ontzien.
            </p>
            {nextRace && nextStart && (
              <div className="pt-2 border-t border-border text-sm">
                <p className="text-muted-foreground">Volgende race:</p>
                <p className="font-medium">{nextRace.raceName}</p>
                <p className="text-muted-foreground">
                  {nextStart.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                  {formatCountdown(nextStart, now)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const raceBets = bets.filter(b => b.raceRound === liveRace.round && b.season === season);
  const projections = players
    .map(player => {
      const bet = raceBets.find(b => b.playerId === player.id);
      if (!bet) return null;
      return { player, bet, projection: projectScore(bet, grid) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.projection.total - a.projection.total);

  const retiredCount = grid.filter(g => g.likelyRetired).length;

  function driverLabel(driverId: string): string {
    if (driverId === NO_RETIREMENTS) return 'Niemand valt uit';
    const d = drivers.find(d => d.driverId === driverId);
    return d ? `${d.code}` : driverId || '—';
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          Live
          {isSessionLive ? (
            <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
              <Radio className="w-3 h-3 mr-1 animate-pulse" /> LIVE
            </Badge>
          ) : isWindowActive ? (
            <Badge variant="outline" className="text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" /> Wachten op start...
            </Badge>
          ) : null}
        </h2>
        <p className="text-muted-foreground">
          Round {liveRace.round} · {liveRace.raceName} — {liveRace.circuitName}
        </p>
      </div>

      {/* Poll status */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-muted-foreground">
            <span>Laatste update: <span className="text-foreground font-mono">{formatTime(lastPoll)}</span></span>
            <span>Volgende update over: <span className="text-foreground font-mono">{secondsToNextPoll}s</span></span>
            <span className="hidden sm:inline">Pollinterval: {pollIntervalSeconds}s</span>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Verversen...' : 'Ververs nu'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {!isSessionLive && isWindowActive && grid.length === 0 && !error && (
        <p className="text-sm text-muted-foreground text-center py-2">
          We zitten in het racevenster, maar de live-timing is nog niet gestart (formatieronde, vertraging, ...).
          Zodra de sessie live gaat verschijnt de grid hieronder automatisch.
        </p>
      )}

      {/* Grid */}
      {grid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="w-5 h-5 text-primary" />
              Actuele volgorde
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {grid.map(entry => (
                <div
                  key={entry.driver.driverId}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${entry.likelyRetired ? 'opacity-50' : ''}`}
                >
                  <span className="w-6 font-mono font-bold text-muted-foreground">{entry.position}</span>
                  <span className="font-mono text-xs w-10 text-muted-foreground">{entry.driver.code}</span>
                  <span className="font-medium flex-1 truncate">
                    {entry.driver.givenName} {entry.driver.familyName}
                    {entry.driver.constructorName && (
                      <span className="text-muted-foreground font-normal"> · {entry.driver.constructorName}</span>
                    )}
                  </span>
                  {entry.likelyRetired ? (
                    <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                      Mogelijk uitgevallen
                    </Badge>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground text-right w-24">
                      {entry.gapToLeader ?? (entry.position === 1 ? 'Leider' : '—')}
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted-foreground text-right w-24 hidden sm:inline">
                    {entry.interval ?? (entry.position === 1 ? '—' : '')}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Gap = afstand tot leider · Interval = afstand tot voorganger.
              {retiredCount > 0 && ` ${retiredCount} auto('s) zonder recente update worden als mogelijk uitgevallen beschouwd.`}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score projection */}
      {grid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prognose poule-stand</CardTitle>
            <p className="text-sm text-muted-foreground">
              Punten alsof de race nu zou eindigen — gebaseerd op de actuele volgorde en wie (vermoedelijk)
              is uitgevallen. De officiële score wordt zoals altijd na afloop definitief berekend.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {projections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nog geen bets voor deze race.</p>
            ) : (
              projections.map(({ player, bet, projection }, i) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-sm font-mono text-muted-foreground">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: player.color }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        P1: {driverLabel(bet.gpWinner)} · P10: {driverLabel(bet.p10)} · DNF: {driverLabel(bet.firstRetirement)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold font-mono">{projection.total}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {projection.gpWinnerPoints} + {projection.p10Points} + {projection.retirementPoints}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {grid.length === 0 && isSessionLive && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Sessie is live, wachten op de eerste posities... (komt binnen {Math.max(0, Math.round((POLL_INTERVAL_MS - (lastPoll ? Date.now() - lastPoll.getTime() : 0)) / 1000))}s)
        </p>
      )}
    </div>
  );
}
