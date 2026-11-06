import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, MapPin, Search } from 'lucide-react';
import {
  ALL_LIBREVILLE_NEIGHBORHOODS,
  getNeighborhoodAdministrativeArea,
  getNeighborhoodById
} from '../data/librevilleZones';

interface NeighborhoodPickerProps {
  value: string;
  onChange: (neighborhoodId: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const normalizeSearchText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr');

export const NeighborhoodPicker: React.FC<NeighborhoodPickerProps> = ({
  value,
  onChange,
  id,
  placeholder = 'Rechercher un quartier…',
  disabled = false,
  className = ''
}) => {
  const generatedId = useId().replace(/:/g, '');
  const inputId = id || `neighborhood-${generatedId}`;
  const listId = `${inputId}-options`;
  const selectedNeighborhood = getNeighborhoodById(value);
  const [query, setQuery] = useState(selectedNeighborhood?.name || '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const skipNextValueSyncRef = useRef(false);

  useEffect(() => {
    if (skipNextValueSyncRef.current) {
      skipNextValueSyncRef.current = false;
      return;
    }
    setQuery(selectedNeighborhood?.name || '');
  }, [value]);

  const normalizedQuery = normalizeSearchText(query.trim());
  const filteredNeighborhoods = ALL_LIBREVILLE_NEIGHBORHOODS.filter((neighborhood) => {
    if (!normalizedQuery) return true;
    return normalizeSearchText([
      neighborhood.name,
      neighborhood.id.replace(/-/g, ' '),
      neighborhood.zone,
      neighborhood.estimatedMinutes,
      getNeighborhoodAdministrativeArea(neighborhood.id)
    ].join(' ')).includes(normalizedQuery);
  });

  const selectNeighborhood = (neighborhoodId: string) => {
    const neighborhood = getNeighborhoodById(neighborhoodId);
    if (!neighborhood) return;
    onChange(neighborhoodId);
    setQuery(neighborhood.name);
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, filteredNeighborhoods.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isOpen && filteredNeighborhoods[activeIndex]) {
      event.preventDefault();
      selectNeighborhood(filteredNeighborhoods[activeIndex].id);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery(selectedNeighborhood?.name || '');
    }
  };

  const baseClassName = className || 'w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
          if (selectedNeighborhood) setQuery(selectedNeighborhood.name);
        }
      }}
    >
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen && filteredNeighborhoods[activeIndex] ? `${listId}-${filteredNeighborhoods[activeIndex].id}` : undefined}
        aria-label="Rechercher un quartier"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onFocus={() => {
          setIsOpen(true);
          if (selectedNeighborhood && query === selectedNeighborhood.name) setQuery('');
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setActiveIndex(0);
          setIsOpen(true);
          if (value) {
            skipNextValueSyncRef.current = true;
            onChange('');
          }
        }}
        onKeyDown={handleKeyDown}
        className={baseClassName}
      />

      {isOpen && !disabled && (
        <div className="absolute inset-x-0 top-full z-[80] mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {filteredNeighborhoods.length > 0 ? (
            <ul id={listId} role="listbox" aria-label="Quartiers disponibles" className="space-y-0.5">
              {filteredNeighborhoods.map((neighborhood, index) => (
                <li key={neighborhood.id} role="presentation">
                  <button
                    id={`${listId}-${neighborhood.id}`}
                    type="button"
                    role="option"
                    aria-selected={value === neighborhood.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectNeighborhood(neighborhood.id)}
                    className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left ${
                      index === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900">{neighborhood.name}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {getNeighborhoodAdministrativeArea(neighborhood.id)} · {neighborhood.zone}
                      </span>
                    </span>
                    {value === neighborhood.id && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-center text-xs text-slate-500">Aucun quartier trouvé. Essayez une autre recherche.</p>
          )}
        </div>
      )}

      {selectedNeighborhood && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-blue-800" aria-live="polite">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          Arrondissement : {getNeighborhoodAdministrativeArea(selectedNeighborhood.id)}
        </p>
      )}
    </div>
  );
};
