import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSeason } from '@/contexts/SeasonContext';

export default function SeasonSelector() {
  const { selectedSeason, setSelectedSeason, availableSeasons } = useSeason();

  return (
    <Select value={String(selectedSeason)} onValueChange={v => setSelectedSeason(parseInt(v))}>
      <SelectTrigger className="w-[100px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableSeasons.map(season => (
          <SelectItem key={season} value={String(season)}>
            {season}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
