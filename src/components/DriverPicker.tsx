import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import type { Driver } from '@/types/f1';

interface DriverPickerProps {
  drivers: Driver[];
  value: string; // driverId
  onSelect: (driverId: string) => void;
  placeholder?: string;
}

export default function DriverPicker({ drivers, value, onSelect, placeholder = 'Type driver name...' }: DriverPickerProps) {
  const selectedDriver = drivers.find(d => d.driverId === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = selectedDriver ? `${selectedDriver.code} — ${selectedDriver.givenName} ${selectedDriver.familyName}` : '';

  const filtered = query.length === 0 ? drivers : drivers.filter(d => {
    const q = query.toLowerCase();
    return (
      d.familyName.toLowerCase().includes(q) ||
      d.givenName.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      `${d.givenName} ${d.familyName}`.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(driverId: string) {
    onSelect(driverId);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex].driverId);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={open ? query : displayValue}
        placeholder={placeholder}
        onChange={e => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onKeyDown={handleKeyDown}
        className="h-9 text-sm"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No drivers found</div>
          ) : (
            filtered.map((d, i) => (
              <button
                key={d.driverId}
                type="button"
                className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-accent transition-colors ${
                  i === highlightIndex ? 'bg-accent' : ''
                } ${d.driverId === value ? 'font-semibold text-primary' : ''}`}
                onMouseDown={() => handleSelect(d.driverId)}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <span className="font-mono text-xs text-muted-foreground w-8">{d.code}</span>
                <span>{d.givenName} {d.familyName}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
