import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy, TrendingUp, Flag } from 'lucide-react';
import { getPlayers, getScores } from '@/lib/storage';
import { fetchRaces } from '@/lib/f1api';
import { useSeason } from '@/contexts/SeasonContext';
import type { Race, Player, RaceScore } from '@/types/f1';

const CONFETTI_COLORS = ['#E10600', '#FFD700', '#00D2BE', '#FF8700', '#0067FF', '#ffffff', '#39B54A', '#9B59B6'];

interface PlayerStanding extends Player {
  totalPoints: number;
  raceScores: Map<number, RaceScore>;
}

// ---- ScoreTable --------------------------------------------------------

function scoreClass(total: number) {
  if (total === 0) return 'bg-muted/30 text-muted-foreground';
  if (total <= 12) return 'bg-blue-950/70 text-blue-300';
  if (total <= 28) return 'bg-green-950/70 text-green-300';
  if (total <= 45) return 'bg-yellow-950/70 text-yellow-300';
  return 'bg-orange-950/70 text-orange-300 font-extrabold';
}

function ScoreTable({ standings, scoredRaces }: {
  standings: PlayerStanding[];
  scoredRaces: Race[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-primary" />
          Punten per race
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-card z-10 text-left p-3 font-semibold min-w-[130px]">
                  Speler
                </th>
                {scoredRaces.map(race => (
                  <th key={race.round} className="p-2 text-center font-medium text-muted-foreground min-w-[50px]">
                    <span className="text-xs block">{race.country.substring(0, 3).toUpperCase()}</span>
                    <span className="text-[10px] text-muted-foreground/50">R{race.round}</span>
                  </th>
                ))}
                <th className="p-3 text-right font-bold min-w-[72px]">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((player, i) => (
                <tr key={player.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 bg-card z-10 p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: player.color }}
                      >
                        {i + 1}
                      </div>
                      <span className="font-medium truncate max-w-[80px]">{player.name}</span>
                    </div>
                  </td>
                  {scoredRaces.map(race => {
                    const score = player.raceScores.get(race.round);
                    const total = score?.total ?? 0;
                    return (
                      <td key={race.round} className="p-1 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`mx-auto w-10 h-8 rounded flex items-center justify-center font-bold cursor-help transition-opacity hover:opacity-80 ${scoreClass(total)}`}>
                              {total > 0 ? total : '—'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-bold mb-1">{race.raceName.replace(' Grand Prix', '')}</p>
                            <p>🏁 GP: <span className="font-semibold">{score?.gpWinnerPoints ?? 0}</span></p>
                            <p>🔟 P10: <span className="font-semibold">{score?.p10Points ?? 0}</span></p>
                            <p>💥 Uitval: <span className="font-semibold">{score?.retirementPoints ?? 0}</span></p>
                            <p className="border-t border-border mt-1 pt-1 font-bold">
                              Totaal: {total}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right">
                    <span className="text-xl font-extrabold" style={{ color: player.color }}>
                      {player.totalPoints}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Column totals */}
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20">
                <td className="sticky left-0 bg-muted/20 p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Max per race
                </td>
                {scoredRaces.map(race => {
                  const maxPoints = Math.max(0, ...standings.map(p => p.raceScores.get(race.round)?.total ?? 0));
                  return (
                    <td key={race.round} className="p-1 text-center">
                      <div className="mx-auto w-10 h-8 rounded flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {maxPoints > 0 ? maxPoints : ''}
                      </div>
                    </td>
                  );
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Season chart -------------------------------------------------------

function SeasonChart({ chartData, players }: {
  chartData: Record<string, unknown>[];
  players: Player[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Seizoensverloop
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
              <XAxis
                dataKey="race"
                tick={{ fill: 'hsl(215 14% 50%)', fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                height={55}
              />
              <YAxis tick={{ fill: 'hsl(215 14% 50%)', fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(220 18% 10%)',
                  border: '1px solid hsl(220 14% 18%)',
                  borderRadius: '8px',
                  color: 'hsl(210 20% 92%)',
                }}
              />
              <Legend />
              {players.map(p => (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.name}
                  stroke={p.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: p.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Podium step -------------------------------------------------------

const PODIUM_STYLES = [
  { gradient: 'linear-gradient(160deg, #8B6914 0%, #FFD700 50%, #B8860B 100%)', label: '🥇', height: 180 },
  { gradient: 'linear-gradient(160deg, #4A5568 0%, #C0C0C0 50%, #718096 100%)', label: '🥈', height: 145 },
  { gradient: 'linear-gradient(160deg, #7B3F00 0%, #CD7F32 50%, #A0522D 100%)', label: '🥉', height: 115 },
];

function PodiumStep({ player, rank }: { player: PlayerStanding; rank: number }) {
  const style = PODIUM_STYLES[rank - 1];
  return (
    <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-xl border-4"
        style={{ backgroundColor: player.color, borderColor: `${player.color}88` }}
      >
        {player.name.charAt(0)}
      </div>
      <div className="text-center px-1">
        <p className="font-bold text-sm leading-tight truncate w-full">{player.name}</p>
        <p className="text-sm text-muted-foreground">{player.totalPoints} pts</p>
      </div>
      <div
        className="w-full rounded-t-xl flex items-center justify-center shadow-inner"
        style={{ height: `${style.height}px`, background: style.gradient }}
      >
        <span className="text-4xl drop-shadow-lg">{style.label}</span>
      </div>
    </div>
  );
}

// ---- Champion header ----------------------------------------------------

function ConfettiPiece({ left, color, delay, duration, width, height }: {
  left: string; color: string; delay: string; duration: string; width: string; height: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '-20px',
        left,
        width,
        height,
        backgroundColor: color,
        borderRadius: '2px',
        animation: `confettiFall ${duration} ${delay} linear infinite`,
        pointerEvents: 'none',
        zIndex: 0,
        willChange: 'transform',
      }}
    />
  );
}

function ChampionHeader({ standings, season }: { standings: PlayerStanding[]; season: number }) {
  const winner = standings[0];

  const confettiPieces = useMemo(() =>
    Array.from({ length: 48 }, (_, i) => ({
      left: `${((i * 2.08) % 100).toFixed(1)}%`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: `${((i * 0.13) % 4).toFixed(2)}s`,
      duration: `${(3.5 + (i * 0.19) % 2.5).toFixed(2)}s`,
      width: `${6 + (i * 7) % 8}px`,
      height: `${9 + (i * 5) % 9}px`,
    }))
  , []);

  const podiumOrder = [standings[1], standings[0], standings[2]].filter(Boolean);
  const podiumRanks = [2, 1, 3];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-card to-background border border-border/60 pb-2">
      {/* Confetti layer */}
      {confettiPieces.map((p, i) => (
        <ConfettiPiece key={i} {...p} />
      ))}

      {/* Hero */}
      <div className="relative z-10 text-center pt-10 pb-6 px-4">
        <div className="inline-block mb-3" style={{ animation: 'trophyBounce 1.8s ease-in-out infinite' }}>
          <span className="text-7xl">🏆</span>
        </div>
        <p className="text-xs font-black tracking-[0.3em] text-accent uppercase mb-2">
          {season} Kampioen
        </p>
        <h1
          className="text-5xl sm:text-6xl font-black tracking-tight mb-2"
          style={{ color: winner.color, textShadow: `0 0 40px ${winner.color}55` }}
        >
          {winner.name}
        </h1>
        <p className="text-muted-foreground text-lg">
          <span className="text-3xl font-extrabold" style={{ color: winner.color }}>
            {winner.totalPoints}
          </span>
          {' '}punten
        </p>
      </div>

      {/* Podium */}
      {standings.length >= 2 && (
        <div className="relative z-10 flex items-end justify-center gap-3 sm:gap-5 px-4 pb-0 max-w-xl mx-auto">
          {podiumOrder.map((player, i) => (
            <PodiumStep key={player.id} player={player} rank={podiumRanks[i]} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Audit header -------------------------------------------------------

function AuditHeader({ season, races, scoredRaces, standings }: {
  season: number;
  races: Race[];
  scoredRaces: Race[];
  standings: PlayerStanding[];
}) {
  const leader = standings[0];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.25em] text-muted-foreground uppercase mb-1">Tussenstand</p>
          <h2 className="text-3xl font-extrabold tracking-tight">{season} Seizoen</h2>
        </div>
        <div className="flex items-center gap-2 text-sm bg-secondary px-3 py-2 rounded-lg">
          <Flag className="w-4 h-4 text-primary" />
          <span className="font-semibold">{scoredRaces.length}</span>
          <span className="text-muted-foreground">/ {races.length} races</span>
        </div>
      </div>

      {leader && scoredRaces.length > 0 && (
        <div
          className="p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3"
          style={{ borderColor: `${leader.color}44`, backgroundColor: `${leader.color}0d` }}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-accent" />
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Leider</p>
              <p className="font-bold text-lg" style={{ color: leader.color }}>{leader.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold" style={{ color: leader.color }}>{leader.totalPoints}</p>
            <p className="text-xs text-muted-foreground">punten</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {standings.map((player, i) => {
          const gap = i === 0 ? null : (leader?.totalPoints ?? 0) - player.totalPoints;
          return (
            <Card key={player.id} className="transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: player.color }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      {gap !== null && gap > 0 && (
                        <p className="text-xs text-muted-foreground">−{gap} pts achterstand</p>
                      )}
                      {gap === 0 && i > 0 && (
                        <p className="text-xs text-accent">Gelijk</p>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold" style={{ color: player.color }}>
                    {player.totalPoints}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---- Main page ----------------------------------------------------------

export default function ResultsSheet() {
  const { selectedSeason: season } = useSeason();
  const players = getPlayers();
  const scores = getScores(season);

  const { data: races = [] } = useQuery({
    queryKey: ['races', season],
    queryFn: () => fetchRaces(season),
  });

  const isSeasonComplete = useMemo(() => {
    if (races.length === 0) return false;
    return new Date(races[races.length - 1].date) < new Date();
  }, [races]);

  const scoredRaces = useMemo(() => {
    const scoredRounds = new Set(scores.map(s => s.raceRound));
    return races.filter(r => scoredRounds.has(r.round));
  }, [races, scores]);

  const standings = useMemo((): PlayerStanding[] =>
    players
      .map(player => {
        const raceScores = new Map(
          scores.filter(s => s.playerId === player.id).map(s => [s.raceRound, s])
        );
        const totalPoints = Array.from(raceScores.values()).reduce((s, r) => s + r.total, 0);
        return { ...player, totalPoints, raceScores };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
  , [players, scores]);

  const chartData = useMemo(() => {
    if (scoredRaces.length === 0 || players.length === 0) return [];
    const cumulative: Record<string, number> = {};
    players.forEach(p => { cumulative[p.id] = 0; });
    return scoredRaces.map(race => {
      const point: Record<string, unknown> = { race: race.country };
      players.forEach(p => {
        const s = scores.find(s => s.playerId === p.id && s.raceRound === race.round);
        cumulative[p.id] += s?.total ?? 0;
        point[p.name] = cumulative[p.id];
      });
      return point;
    });
  }, [scoredRaces, players, scores]);

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Voeg spelers toe om het uitslagenblad te zien.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(110vh)  rotate(720deg); opacity: 0; }
        }
        @keyframes trophyBounce {
          0%, 100% { transform: translateY(0)   scale(1);    }
          50%       { transform: translateY(-8px) scale(1.06); }
        }
      `}</style>

      <div className="space-y-8">
        {isSeasonComplete ? (
          <ChampionHeader standings={standings} season={season} />
        ) : (
          <AuditHeader
            season={season}
            races={races}
            scoredRaces={scoredRaces}
            standings={standings}
          />
        )}

        {chartData.length > 0 && (
          <SeasonChart chartData={chartData} players={players} />
        )}

        {scoredRaces.length > 0 && standings.length > 0 && (
          <ScoreTable standings={standings} scoredRaces={scoredRaces} />
        )}

        {scoredRaces.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Flag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nog geen races gescoord dit seizoen.</p>
          </div>
        )}
      </div>
    </>
  );
}
