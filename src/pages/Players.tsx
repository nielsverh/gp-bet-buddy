import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Plus, Trash2, UserPlus } from 'lucide-react';
import { getPlayers, addPlayer, removePlayer } from '@/lib/storage';

export default function Players() {
  const [newName, setNewName] = useState('');
  const [, forceUpdate] = useState(0);
  const players = getPlayers();

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Player already exists');
      return;
    }
    addPlayer(name);
    setNewName('');
    toast.success(`${name} joined the poule!`);
    forceUpdate(n => n + 1);
  }

  function handleRemove(id: string, name: string) {
    removePlayer(id);
    toast.success(`${name} removed`);
    forceUpdate(n => n + 1);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-3xl font-extrabold tracking-tight">Players</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-5 h-5 text-primary" />
            Add Player
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => { e.preventDefault(); handleAdd(); }}
            className="flex gap-3"
          >
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Player name"
              className="flex-1"
            />
            <Button type="submit" disabled={!newName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-primary" />
            Current Players ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No players yet. Add some above!
            </p>
          ) : (
            <div className="space-y-2">
              {players.map(player => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(player.id, player.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-2">Scoring Rules</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">GP Winner bet:</strong> F1 scale based on how far off (25 exact, 18 one off, 15 two off...)</p>
            <p><strong className="text-foreground">P10 bet:</strong> Same scale, symmetric (P9 & P11 = 18pts, P8 & P12 = 15pts...)</p>
            <p><strong className="text-foreground">First to Retire:</strong> 10 bonus points if exact, 0 otherwise</p>
            <p><strong className="text-foreground">Driver retires:</strong> 0 points for your P1/P10 bet if your pick DNFs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
