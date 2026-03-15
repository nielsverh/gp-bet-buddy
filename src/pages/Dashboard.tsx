import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Flag, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getPlayers, getBets, getScores, getCurrentSeason } from '@/lib/storage';
import { fetchRaces } from '@/lib/f1api';
import { downloadCSV, importFromCSV } from '@/lib/csv';
import type { Player } from '@/types/f1';

export default function Dashboard() {
  const season = getCurrentSeason();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, forceUpdate] = useState(0);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = importFromCSV(reader.result as string);
        toast.success(`Geïmporteerd: ${result.players} spelers, ${result.bets} bets, ${result.scores} scores`);
        forceUpdate(n => n + 1);
      } catch {
        toast.error('Fout bij importeren van CSV');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  const players = getPlayers();
  const bets = getBets(season);
  const scores = getScores(season);

  const { data: races = [] } = useQuery({
    queryKey: ['races', season],
    queryFn: () => fetchRaces(season),
  });

  const chartData = useMemo(() => {
    if (races.length === 0 || players.length === 0) return [];

    const racesWithScores = races.filter(race =>
      scores.some(s => s.raceRound === race.round)
    );

    let cumulativeScores: Record<string, number> = {};
    players.forEach(p => { cumulativeScores[p.id] = 0; });

    return racesWithScores.map(race => {
      const point: any = { race: race.raceName.replace(' Grand Prix', '') };
      players.forEach(player => {
        const raceScore = scores.find(
          s => s.playerId === player.id && s.raceRound === race.round
        );
        cumulativeScores[player.id] += raceScore?.total || 0;
        point[player.name] = cumulativeScores[player.id];
      });
      return point;
    });
  }, [races, players, scores]);

  const standings = useMemo(() => {
    return players
      .map(player => {
        const totalPoints = scores
          .filter(s => s.playerId === player.id)
          .reduce((sum, s) => sum + s.total, 0);
        return { ...player, totalPoints };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [players, scores]);

  const racesCompleted = new Set(scores.map(s => s.raceRound)).size;

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Welcome to F1 Poule!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Start by adding players in the Players tab, then place your bets on each race.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-3xl font-extrabold tracking-tight">{season} Season</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" />
            Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
            <Flag className="w-4 h-4" />
            {racesCompleted} / {races.length} races
          </div>
        </div>
      </div>

      {/* Standings cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {standings.map((player, i) => (
          <Card key={player.id} className={`relative overflow-hidden ${i === 0 ? 'border-primary/50 bg-primary/5' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: player.color, color: '#fff' }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{player.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {scores.filter(s => s.playerId === player.id).length} races scored
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold" style={{ color: player.color }}>
                    {player.totalPoints}
                  </p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Season Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
                  <XAxis
                    dataKey="race"
                    tick={{ fill: 'hsl(215 14% 50%)', fontSize: 12 }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: 'hsl(215 14% 50%)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220 18% 10%)',
                      border: '1px solid hsl(220 14% 18%)',
                      borderRadius: '8px',
                      color: 'hsl(210 20% 92%)',
                    }}
                  />
                  <Legend />
                  {players.map(player => (
                    <Line
                      key={player.id}
                      type="monotone"
                      dataKey={player.name}
                      stroke={player.color}
                      strokeWidth={3}
                      dot={{ r: 4, fill: player.color }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
