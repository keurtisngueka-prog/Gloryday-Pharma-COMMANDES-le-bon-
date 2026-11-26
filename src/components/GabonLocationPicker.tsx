import React, { useState } from 'react';
import { GABON_LOCALITIES, getGabonLocality, isGrandLibrevilleLocality } from '../data/gabonLocations';
import { NeighborhoodPicker } from './NeighborhoodPicker';

interface GabonLocationPickerProps {
  idPrefix: string;
  city: string;
  neighborhoodName: string;
  neighborhoodId?: string;
  onCityChange: (city: string) => void;
  onNeighborhoodNameChange: (name: string) => void;
  onNeighborhoodIdChange: (id: string) => void;
  compact?: boolean;
}

export const GabonLocationPicker: React.FC<GabonLocationPickerProps> = ({
  idPrefix,
  city,
  neighborhoodName,
  neighborhoodId = '',
  onCityChange,
  onNeighborhoodNameChange,
  onNeighborhoodIdChange,
  compact = false,
}) => {
  const [otherCityMode, setOtherCityMode] = useState(Boolean(city) && !getGabonLocality(city));
  const [otherNeighborhoodMode, setOtherNeighborhoodMode] = useState(Boolean(neighborhoodName) && !getGabonLocality(city)?.neighborhoods?.includes(neighborhoodName));
  const isMetro = isGrandLibrevilleLocality(city);
  const locality = getGabonLocality(city);
  const neighborhoodOptions = locality?.neighborhoods || ['Centre-ville', 'Autre quartier'];
  const selectClass = `mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 ${compact ? 'py-2 text-xs' : 'py-2.5 text-sm'} text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100`;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-bold text-slate-700">
        Ville / commune *
        <select
          id={`${idPrefix}-city`}
          required={!otherCityMode}
          value={otherCityMode ? '__other__' : city}
          onChange={(event) => {
            const isOther = event.target.value === '__other__';
            setOtherCityMode(isOther);
            setOtherNeighborhoodMode(false);
            onCityChange(isOther ? '' : event.target.value);
            onNeighborhoodNameChange('');
            onNeighborhoodIdChange('');
          }}
          className={selectClass}
        >
          <option value="">Choisir une ville…</option>
          {GABON_LOCALITIES.map((item) => (
            <option key={item.name} value={item.name}>{item.name} · {item.province}</option>
          ))}
          <option value="__other__">Autre ville / commune…</option>
        </select>
        {otherCityMode && (
          <input
            id={`${idPrefix}-other-city`}
            required
            maxLength={100}
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            placeholder="Saisir la ville ou la commune"
            className={selectClass}
          />
        )}
      </label>

      <label className="block text-xs font-bold text-slate-700">
        Quartier *
        {isMetro ? (
          <NeighborhoodPicker
            id={`${idPrefix}-neighborhood`}
            value={neighborhoodId}
            city={city}
            onChange={(id) => {
              onNeighborhoodIdChange(id);
              onNeighborhoodNameChange('');
            }}
            placeholder="Rechercher un quartier…"
            className={`mt-1 w-full rounded-xl border border-slate-300 bg-white ${compact ? 'py-2 pl-9 pr-3 text-xs' : 'py-2.5 pl-9 pr-3 text-sm'} text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
          />
        ) : (
          <>
            <select
              id={`${idPrefix}-neighborhood`}
              required={!otherNeighborhoodMode}
              value={otherNeighborhoodMode ? '__other__' : neighborhoodName}
              onChange={(event) => {
                const isOther = event.target.value === '__other__';
                setOtherNeighborhoodMode(isOther);
                onNeighborhoodNameChange(isOther ? '' : event.target.value);
                onNeighborhoodIdChange('');
              }}
              className={selectClass}
            >
              <option value="">Choisir un quartier…</option>
              {neighborhoodOptions.filter((name) => name !== 'Autre quartier').map((name) => <option key={name} value={name}>{name}</option>)}
              <option value="__other__">Autre quartier…</option>
            </select>
            {otherNeighborhoodMode && (
              <input
                id={`${idPrefix}-other-neighborhood`}
                required
                maxLength={100}
                value={neighborhoodName}
                onChange={(event) => onNeighborhoodNameChange(event.target.value)}
                placeholder="Saisir le nom du quartier"
                className={selectClass}
              />
            )}
          </>
        )}
      </label>
      {city && !isMetro && (
        <p className="text-[11px] leading-relaxed text-amber-800 sm:col-span-2">
          Les frais et délais automatiques sont actuellement calculés pour Libreville, Akanda et Owendo. Pour les autres villes, l’équipe confirmera la livraison et son tarif avant validation.
        </p>
      )}
    </div>
  );
};
