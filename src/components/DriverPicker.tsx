import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import type { Driver } from '@/types/f1';

export interface DriverPickerExtraOption {
  id: string;
  label: string;
}

interface DriverPickerProps {
  drivers: Driver[];
  value: string; // driverId or extra option id
  onSelect: (id: string) => void;
  placeholder?: string;
  // Special non-driver options (e.g. "Nobody retires") shown at the top of the list
  extraOptions?: DriverPickerExtraOption[];
}

export default function DriverPicker({ drivers, value, onSelect, placeholder = 'Type driver name...', extraOptions = [] }: DriverPickerProps) {
  const selectedDriver = drivers.find(d => d.driverId === value);
  const selectedExtra = extraOptions.find(o => o.id === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = selectedDriver
    ? `${selectedDriver.code} — ${selectedDriver.givenName} ${selectedDriver.familyName}`
    : selectedExtra
    ? selectedExtra.label
    : '';

  const q = query.toLowerCase();

  const filteredExtras = query.length === 0
    ? extraOptions
    : extraOptions.filter(o => o.label.toLowerCase().includes(q));

  const filteredDrivers = query.length === 0 ? drivers : drivers.filter(d => {
    return (
      d.familyName.toLowerCase().includes(q) ||
      d.givenName.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      `${d.givenName} ${d.familyName}`.toLowerCase().includes(q)
    );
  });

  const itemCount = filteredExtras.length + filteredDrivers.length;

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

  function handleSelect(id: string) {
    onSelect(id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  function selectByIndex(index: number) {
    if (index < filteredExtras.length) {
      handleSelect(filteredExtras[index].id);
    } else {
      const driver = filteredDrivers[index - filteredExtras.length];
      if (driver) handleSelect(driver.driverId);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, itemCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && itemCount > 0) {
      e.preventDefault();
      selectByIndex(highlightIndex);
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
          {itemCount === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No drivers found</div>
          ) : (
            <>
              {filteredExtras.map((option, i) => (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-sm italic flex items-center gap-2 hover:bg-accent transition-colors ${
                    i === highlightIndex ? 'bg-accent' : ''
                  } ${option.id === value ? 'font-semibold text-primary' : ''}`}
                  onMouseDown={() => handleSelect(option.id)}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  <span>{option.label}</span>
                </button>
              ))}
              {filteredDrivers.map((d, i) => {
                const idx = filteredExtras.length + i;
                return (
                  <button
                    key={d.driverId}
                    type="button"
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-accent transition-colors ${
                      idx === highlightIndex ? 'bg-accent' : ''
                    } ${d.driverId === value ? 'font-semibold text-primary' : ''}`}
                    onMouseDown={() => handleSelect(d.driverId)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                  >
                    <span className="font-mono text-xs text-muted-foreground w-8">{d.code}</span>
                    <span>{d.givenName} {d.familyName}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
