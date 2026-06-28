import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Users, Plus, Trash2, UserPlus, Download, Upload, Archive, Check } from 'lucide-react';
import { getPlayers, addPlayer, removePlayer, setPlayerColor, importData } from '@/lib/storage';
import { downloadCSV, parseCSV } from '@/lib/csv';
import type { ParsedCSVSummary } from '@/lib/csv';
import type { StoredData } from '@/lib/storage';
import { PLAYER_COLORS } from '@/types/f1';
import { useSeason } from '@/contexts/SeasonContext';

export default function Players() {
  const { setSelectedSeason, refreshAvailableSeasons } = useSeason();
  const [newName, setNewName] = useState('');
  const [, forceUpdate] = useState(0);
  const [pendingImport, setPendingImport] = useState<{ data: StoredData; summary: ParsedCSVSummary } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  function handleColorChange(id: string, color: string) {
    setPlayerColor(id, color);
    forceUpdate(n => n + 1);
  }

  function handleRemove(id: string, name: string) {
    removePlayer(id);
    toast.success(`${name} removed`);
    forceUpdate(n => n + 1);
  }

  function handleExport() {
    downloadCSV();
    toast.success('Poule geëxporteerd naar CSV');
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const csv = evt.target?.result as string;
        const parsed = parseCSV(csv);
        if (parsed.summary.players === 0) {
          toast.error('Geen spelers gevonden in dit CSV-bestand');
          return;
        }
        setPendingImport(parsed);
      } catch {
        toast.error('Ongeldig CSV-bestand');
      }
    };
    reader.readAsText(file);
  }

  function handleConfirmImport() {
    if (!pendingImport) return;
    importData(pendingImport.data);
    refreshAvailableSeasons();
    if (pendingImport.summary.seasons.length > 0) {
      setSelectedSeason(pendingImport.summary.seasons[pendingImport.summary.seasons.length - 1]);
    }
    setPendingImport(null);
    forceUpdate(n => n + 1);
    toast.success(
      `Poule geïmporteerd: ${pendingImport.summary.players} spelers, ${pendingImport.summary.bets} bets, ${pendingImport.summary.scores} scores`
    );
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          title="Kies een kleur"
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/40"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3">
                        <p className="text-xs text-muted-foreground mb-2">Kies een kleur voor {player.name}</p>
                        <div className="grid grid-cols-5 gap-2">
                          {PLAYER_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              title={color}
                              onClick={() => handleColorChange(player.id, color)}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-foreground/40"
                              style={{ backgroundColor: color }}
                            >
                              {player.color === color && <Check className="w-4 h-4 text-white drop-shadow" />}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
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

      {/* CSV Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Archive className="w-5 h-5 text-primary" />
            Poule Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Exporteer de volledige poule (spelers, bets en scores) naar CSV, of importeer een eerder opgeslagen CSV.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport} disabled={players.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exporteer CSV
            </Button>
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="w-4 h-4 mr-2" />
              Importeer CSV
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">
            Importeren voegt de spelers, bets en scores uit het bestand toe aan je huidige poule
            (spelers worden gematcht op naam; bestaande bets/scores voor dezelfde speler, ronde
            en seizoen worden bijgewerkt). Niets wordt verwijderd.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-2">Scoring Rules</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">GP Winner bet:</strong> F1 scale based on how far off (25 exact, 18 one off, 15 two off...)</p>
            <p><strong className="text-foreground">P10 bet:</strong> Same scale, symmetric (P9 &amp; P11 = 18pts, P8 &amp; P12 = 15pts...)</p>
            <p><strong className="text-foreground">First to Retire:</strong> 10 bonus points if exact, or if you pick "Niemand valt uit" and the race finishes with zero retirements, 0 otherwise</p>
            <p><strong className="text-foreground">Driver retires:</strong> 0 points for your P1/P10 bet if your pick DNFs</p>
          </div>
        </CardContent>
      </Card>

      {/* Import confirmation dialog */}
      <AlertDialog open={!!pendingImport} onOpenChange={open => !open && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poule importeren?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Het CSV-bestand bevat:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><strong>{pendingImport?.summary.players}</strong> spelers</li>
                  <li><strong>{pendingImport?.summary.bets}</strong> bets</li>
                  <li><strong>{pendingImport?.summary.scores}</strong> scores</li>
                  {pendingImport && pendingImport.summary.seasons.length > 0 && (
                    <li>seizoen{pendingImport.summary.seasons.length > 1 ? 'en' : ''}:{' '}
                      <strong>{pendingImport.summary.seasons.join(', ')}</strong>
                    </li>
                  )}
                </ul>
                <p className="pt-1">
                  Dit wordt toegevoegd aan je huidige poule (spelers gematcht op naam; bestaande
                  bets/scores voor dezelfde speler, ronde en seizoen worden bijgewerkt). Niets wordt verwijderd.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleer</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              Importeer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
