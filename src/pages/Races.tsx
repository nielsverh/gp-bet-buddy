import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DriverPicker from '@/components/DriverPicker';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Flag, CheckCircle2, Clock, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { fetchRaces, fetchDrivers, fetchRaceResults, isRetirement } from '@/lib/f1api';
import { getPlayers, getBets, saveBet, saveScores, getCurrentSeason, getScores } from '@/lib/storage';
import { calculateScore } from '@/lib/scoring';
import type { Bet, Driver, Race, RaceResult } from '@/types/f1';

export default function Races() {
  const season = getCurrentSeason();
  const players = getPlayers();
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  const [localBets, setLocalBets] = useState<Record<string, Partial<Bet>>>({});
  const [, forceUpdate] = useState(0);

  const { data: races = [], isLoading: racesLoading } = useQuery({
    queryKey: ['races', season],
    queryFn: () => fetchRaces(season),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', season],
    queryFn: () => fetchDrivers(season),
  });

  const { data: raceResults, isLoading: resultsLoading } = useQuery({
    queryKey: ['results', season, expandedRace],
    queryFn: () => expandedRace ? fetchRaceResults(season, expandedRace) : Promise.resolve([]),
    enabled: !!expandedRace,
  });

  const bets = getBets(season);
  const scores = getScores(season);

  function getBetKey(playerId: string, round: number) {
    return `${playerId}-${round}`;
  }

  function getExistingBet(playerId: string, round: number): Bet | undefined {
    return bets.find(b => b.playerId === playerId && b.raceRound === round && b.season === season);
  }

  function getCurrentBetValue(playerId: string, round: number, field: keyof Bet): string {
    const key = getBetKey(playerId, round);
    const local = localBets[key];
    if (local && local[field]) return local[field] as string;
    const existing = getExistingBet(playerId, round);
    if (existing) return existing[field] as string;
    return '';
  }

  function updateLocalBet(playerId: string, round: number, field: keyof Bet, value: string) {
    const key = getBetKey(playerId, round);
    setLocalBets(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        playerId,
        raceRound: round,
        season,
        [field]: value,
      },
    }));
  }

  function handleSaveBets(round: number) {
    let savedCount = 0;
    players.forEach(player => {
      const key = getBetKey(player.id, round);
      const local = localBets[key];
      const existing = getExistingBet(player.id, round);
      const bet: Bet = {
        playerId: player.id,
        raceRound: round,
        season,
        gpWinner: local?.gpWinner || existing?.gpWinner || '',
        p10: local?.p10 || existing?.p10 || '',
        firstRetirement: local?.firstRetirement || existing?.firstRetirement || '',
      };
      if (bet.gpWinner || bet.p10 || bet.firstRetirement) {
        saveBet(bet);
        savedCount++;
      }
    });
    if (savedCount > 0) {
      toast.success(`Saved bets for ${savedCount} player(s)`);
      forceUpdate(n => n + 1);
    }
  }

  function handleCalculateScores(round: number, results: RaceResult[]) {
    const roundBets = bets.filter(b => b.raceRound === round && b.season === season);
    if (roundBets.length === 0) {
      toast.error('No bets found for this race');
      return;
    }
    const newScores = roundBets.map(bet => calculateScore(bet, results));
    saveScores(newScores);
    toast.success('Scores calculated!');
    forceUpdate(n => n + 1);
  }

  const isRacePast = (race: Race) => new Date(race.date) < new Date();
  const hasResults = (round: number) => scores.some(s => s.raceRound === round);

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Flag className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Add players first in the Players tab.</p>
      </div>
    );
  }

  if (racesLoading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Loading races...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-extrabold tracking-tight">{season} Races</h2>

      {races.map(race => {
        const isExpanded = expandedRace === race.round;
        const past = isRacePast(race);
        const scored = hasResults(race.round);
        const raceBets = bets.filter(b => b.raceRound === race.round && b.season === season);
        const hasBets = raceBets.length > 0;

        return (
          <Card key={race.round} className="overflow-hidden">
            <button
              className="w-full text-left"
              onClick={() => setExpandedRace(isExpanded ? null : race.round)}
            >
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold font-mono">
                      R{race.round}
                    </div>
                    <div>
                      <CardTitle className="text-base">{race.raceName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{race.circuitName} · {race.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {scored && <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30">Scored</Badge>}
                    {hasBets && !scored && <Badge variant="secondary">Bets placed</Badge>}
                    {past && !scored && !hasBets && <Badge variant="outline" className="border-primary/30 text-primary">Race done</Badge>}
                    {!past && <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" />Upcoming</Badge>}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
            </button>

            {isExpanded && (
              <CardContent className="border-t border-border pt-4 space-y-6">
                {/* Bet entry per player */}
                {players.map(player => {
                  const playerScore = scores.find(s => s.playerId === player.id && s.raceRound === race.round);

                  return (
                    <div key={player.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: player.color }} />
                          <span className="font-semibold">{player.name}</span>
                        </div>
                        {playerScore && (
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">P1: <span className="text-foreground font-mono">{playerScore.gpWinnerPoints}</span></span>
                            <span className="text-muted-foreground">P10: <span className="text-foreground font-mono">{playerScore.p10Points}</span></span>
                            <span className="text-muted-foreground">DNF: <span className="text-foreground font-mono">{playerScore.retirementPoints}</span></span>
                            <span className="font-bold text-lg" style={{ color: player.color }}>{playerScore.total}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">GP Winner (P1)</label>
                          <DriverPicker
                            drivers={drivers}
                            value={getCurrentBetValue(player.id, race.round, 'gpWinner')}
                            onSelect={v => updateLocalBet(player.id, race.round, 'gpWinner', v)}
                            placeholder="Type driver name..."
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">10th Place (P10)</label>
                          <DriverPicker
                            drivers={drivers}
                            value={getCurrentBetValue(player.id, race.round, 'p10')}
                            onSelect={v => updateLocalBet(player.id, race.round, 'p10', v)}
                            placeholder="Type driver name..."
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">First to Retire (DNF)</label>
                          <DriverPicker
                            drivers={drivers}
                            value={getCurrentBetValue(player.id, race.round, 'firstRetirement')}
                            onSelect={v => updateLocalBet(player.id, race.round, 'firstRetirement', v)}
                            placeholder="Type driver name..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-3 pt-2">
                  <Button onClick={() => handleSaveBets(race.round)}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Bets
                  </Button>
                  {past && (
                    <Button
                      variant="secondary"
                      onClick={() => raceResults && handleCalculateScores(race.round, raceResults)}
                      disabled={resultsLoading || !raceResults || raceResults.length === 0}
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      {resultsLoading ? 'Fetching results...' : 'Calculate Scores'}
                    </Button>
                  )}
                </div>

                {/* Show race results if fetched */}
                {raceResults && raceResults.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-secondary/50">
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Race Results</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-sm">
                      {raceResults.map(r => (
                        <div key={r.position} className="flex items-center gap-2 py-0.5">
                          <span className="font-mono text-muted-foreground w-6 text-right">P{r.position}</span>
                          <span className={isRetirement(r.status) ? 'text-destructive line-through' : ''}>
                            {r.driver.code}
                          </span>
                          {isRetirement(r.status) && (
                            <span className="text-xs text-destructive">DNF</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
