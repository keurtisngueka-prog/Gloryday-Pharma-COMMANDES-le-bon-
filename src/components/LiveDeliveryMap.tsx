import { useEffect, useMemo, useRef, useState } from 'react';
import type { Coordinates, DeliveryLocationPoint } from '../types';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

interface LiveDeliveryMapProps {
  points: DeliveryLocationPoint[];
  destination?: Coordinates;
  destinationLabel?: string;
}

type GeoJsonLine = {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
};

type MapInstance = import('maplibre-gl').Map;
type MarkerInstance = import('maplibre-gl').Marker;

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const ROUTING_BASE_URL = (import.meta.env.VITE_ROUTING_API_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const LIBREVILLE_CENTER: [number, number] = [9.4536, 0.3924];
const EMPTY_LINE: GeoJsonLine = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
};

function distanceMeters(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const startLatitude = radians(from.lat);
  const endLatitude = radians(to.lat);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function markerElement(kind: 'courier' | 'destination') {
  const element = document.createElement('div');
  element.style.width = kind === 'courier' ? '30px' : '24px';
  element.style.height = kind === 'courier' ? '30px' : '32px';
  element.style.position = 'relative';
  element.setAttribute('aria-label', kind === 'courier' ? 'Position actuelle du coursier' : 'Destination du client');
  element.innerHTML = kind === 'courier'
    ? '<span style="position:absolute;inset:0;border:2px solid #2563eb;border-radius:9999px;background:#2563eb26"></span><span style="position:absolute;inset:5px;border:2px solid #fff;border-radius:9999px;background:#1d4ed8;color:white;display:grid;place-items:center;font:700 12px/1 Arial;box-shadow:0 2px 8px #0f172a55">➤</span>'
    : '<span style="position:absolute;left:3px;top:1px;width:18px;height:18px;border:3px solid #fff;border-radius:50% 50% 50% 0;background:#e11d48;transform:rotate(-45deg);box-shadow:0 2px 8px #0f172a66"></span><span style="position:absolute;left:9px;top:7px;width:6px;height:6px;border-radius:50%;background:#fff"></span>';
  return element;
}

function fitToLatest(map: MapInstance, latest: DeliveryLocationPoint | null, destination?: Coordinates) {
  const coordinates: [number, number][] = [];
  if (latest) coordinates.push([latest.longitude, latest.latitude]);
  if (destination) coordinates.push([destination.lng, destination.lat]);
  if (!coordinates.length) return;
  if (coordinates.length === 1) {
    map.easeTo({ center: coordinates[0], zoom: 14, duration: 500 });
    return;
  }
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  if (east - west < 0.0001 && north - south < 0.0001) {
    map.easeTo({ center: [west, south], zoom: 14, duration: 500 });
    return;
  }
  map.fitBounds([
    [west, south],
    [east, north],
  ], { padding: { top: 70, right: 70, bottom: 85, left: 70 }, maxZoom: 14, duration: 600 });
}

export function LiveDeliveryMap({ points, destination, destinationLabel }: LiveDeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const courierMarkerRef = useRef<MarkerInstance | null>(null);
  const destinationMarkerRef = useRef<MarkerInstance | null>(null);
  const userMovedMapRef = useRef(false);
  const routeControllerRef = useRef<AbortController | null>(null);
  const lastRouteRequestRef = useRef<{ start: Coordinates; destination: Coordinates; at: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState('');
  const [routeLine, setRouteLine] = useState<GeoJsonLine>(EMPTY_LINE);
  const [routeSummary, setRouteSummary] = useState<{ distance: number; duration: number } | null>(null);
  const [routeState, setRouteState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const latest = points.length ? points[points.length - 1] : null;
  const trailLine = useMemo<GeoJsonLine>(() => ({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.slice(-400).map((point) => [point.longitude, point.latitude]),
    },
  }), [points]);
  const destinationIsApproximate = destination?.source === 'neighborhood';

  useEffect(() => {
    const mapContainer = containerRef.current;
    if (!mapContainer) return;
    let disposed = false;
    let styleReady = false;
    let instance: MapInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const loadTimeout = window.setTimeout(() => {
      if (!disposed && !styleReady) setMapError('Le fond de carte ne répond pas. Vérifie la connexion puis ouvre la carte externe.');
    }, 15_000);
    setMapError('');

    void import('maplibre-gl').then(({ Map, Marker, NavigationControl, AttributionControl, setWorkerUrl }) => {
      if (disposed || !containerRef.current) return;
      setWorkerUrl(maplibreWorkerUrl);
      const center: [number, number] = latest
        ? [latest.longitude, latest.latitude]
        : destination
          ? [destination.lng, destination.lat]
          : LIBREVILLE_CENTER;
      instance = new Map({
        container: mapContainer,
        style: OPENFREEMAP_STYLE,
        center,
        zoom: 12,
        minZoom: 3,
        maxZoom: 19,
        attributionControl: false,
        renderWorldCopies: false,
        cooperativeGestures: true,
      });
      mapRef.current = instance;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (!disposed && instance) window.requestAnimationFrame(() => instance?.resize());
        });
        resizeObserver.observe(mapContainer);
      }
      instance.on('error', (event) => {
        if (!disposed && !styleReady && event.error) {
          setMapError('Le fond de carte n’a pas pu être chargé. Vérifie la connexion puis ouvre la carte externe.');
        }
      });
      instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      instance.addControl(new AttributionControl({ compact: true, customAttribution: '© OpenFreeMap' }), 'bottom-right');
      instance.on('dragstart', () => { userMovedMapRef.current = true; });
      instance.on('zoomstart', (event) => {
        if ((event as { originalEvent?: unknown }).originalEvent) userMovedMapRef.current = true;
      });
      courierMarkerRef.current = new Marker({ element: markerElement('courier'), anchor: 'center' });
      destinationMarkerRef.current = new Marker({ element: markerElement('destination'), anchor: 'bottom' });

      instance.on('load', () => {
        if (disposed || !instance) return;
        styleReady = true;
        window.clearTimeout(loadTimeout);
        setMapError('');
        instance.addSource('delivery-route', { type: 'geojson', data: EMPTY_LINE as never });
        instance.addSource('courier-trail', { type: 'geojson', data: EMPTY_LINE as never });
        instance.addLayer({
          id: 'delivery-route-casing',
          type: 'line',
          source: 'delivery-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.96 },
        });
        instance.addLayer({
          id: 'delivery-route-line',
          type: 'line',
          source: 'delivery-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#15803d', 'line-width': 5, 'line-opacity': 0.98 },
        });
        instance.addLayer({
          id: 'courier-trail-line',
          type: 'line',
          source: 'courier-trail',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#1d4ed8', 'line-width': 4, 'line-opacity': 0.78, 'line-dasharray': [1.5, 1] },
        });
        setMapLoaded(true);
        window.requestAnimationFrame(() => instance?.resize());
        fitToLatest(instance, latest, destination);
      });
    }).catch(() => {
      if (!disposed) setMapError('La carte n’a pas pu démarrer. Vérifie la connexion puis ouvre la carte externe.');
    });

    return () => {
      disposed = true;
      window.clearTimeout(loadTimeout);
      resizeObserver?.disconnect();
      setMapLoaded(false);
      routeControllerRef.current?.abort();
      routeControllerRef.current = null;
      courierMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      courierMarkerRef.current = null;
      destinationMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      instance = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map) return;
    const routeSource = map.getSource('delivery-route') as import('maplibre-gl').GeoJSONSource | undefined;
    const trailSource = map.getSource('courier-trail') as import('maplibre-gl').GeoJSONSource | undefined;
    routeSource?.setData(routeLine as never);
    trailSource?.setData(trailLine as never);

    if (latest) courierMarkerRef.current?.setLngLat([latest.longitude, latest.latitude]).addTo(map);
    else courierMarkerRef.current?.remove();
    if (destination) destinationMarkerRef.current?.setLngLat([destination.lng, destination.lat]).addTo(map);
    else destinationMarkerRef.current?.remove();

    if (!userMovedMapRef.current) fitToLatest(map, latest, destination);
  }, [mapLoaded, latest?.latitude, latest?.longitude, destination?.lat, destination?.lng, routeLine, trailLine]);

  useEffect(() => {
    if (!latest || !destination) {
      setRouteLine(EMPTY_LINE);
      setRouteSummary(null);
      setRouteState('idle');
      return;
    }
    const start = { lat: latest.latitude, lng: latest.longitude };
    const previous = lastRouteRequestRef.current;
    const sameDestination = previous && Math.abs(previous.destination.lat - destination.lat) < 0.0001
      && Math.abs(previous.destination.lng - destination.lng) < 0.0001;
    if (previous && sameDestination && Date.now() - previous.at < 45_000 && distanceMeters(previous.start, start) < 250) return;

    routeControllerRef.current?.abort();
    const controller = new AbortController();
    routeControllerRef.current = controller;
    const timer = window.setTimeout(async () => {
      setRouteState('loading');
      try {
        const coordinates = `${start.lng},${start.lat};${destination.lng},${destination.lat}`;
        const response = await fetch(`${ROUTING_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Routing request failed');
        const result = await response.json();
        const route = result?.code === 'Ok' ? result.routes?.[0] : undefined;
        const routeCoordinates = route?.geometry?.coordinates;
        if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) throw new Error('No road route found');
        const validCoordinates = routeCoordinates.filter((coordinate: unknown) => Array.isArray(coordinate)
          && coordinate.length >= 2
          && Number.isFinite(Number(coordinate[0]))
          && Number.isFinite(Number(coordinate[1]))) as [number, number][];
        if (validCoordinates.length < 2) throw new Error('Invalid road route');
        setRouteLine({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: validCoordinates } });
        setRouteSummary({ distance: Number(route.distance) || 0, duration: Number(route.duration) || 0 });
        setRouteState('ready');
        lastRouteRequestRef.current = { start, destination, at: Date.now() };
      } catch (error) {
        if (controller.signal.aborted) return;
        lastRouteRequestRef.current = { start, destination, at: Date.now() };
        setRouteState('unavailable');
      }
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [latest?.latitude, latest?.longitude, destination?.lat, destination?.lng]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    userMovedMapRef.current = false;
    fitToLatest(map, latest, destination);
  };

  if (!points.length && !destination) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center sm:h-[360px]" aria-label="Coordonnées de livraison absentes">
        <div className="max-w-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl text-emerald-800" aria-hidden="true">⌖</div>
          <h3 className="mt-3 text-sm font-extrabold text-slate-900">Localisation GPS indisponible</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">Aucune coordonnée réelle n’est enregistrée pour cette livraison. Ajoutez la position de destination ou démarrez le partage GPS du coursier pour afficher le suivi sur la carte.</p>
          <p className="mt-2 text-[10px] font-semibold text-slate-400">{destinationLabel || 'Destination de la commande non géolocalisée'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[320px] overflow-hidden rounded-[24px] border border-slate-200 bg-[#e9eef0] shadow-sm sm:h-[400px]" aria-label="Carte vectorielle et trajet réel du coursier">
      <div ref={containerRef} className="absolute inset-0" />
      {!mapLoaded && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/95 p-5 text-center text-xs font-semibold text-slate-600">
        <div className="max-w-sm">
          {mapError || 'Chargement de la carte…'}
          {mapError && destination && <a href={`https://www.openstreetmap.org/?mlat=${destination.lat}&mlon=${destination.lng}#map=16/${destination.lat}/${destination.lng}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">Ouvrir dans OpenStreetMap</a>}
        </div>
      </div>}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-extrabold text-slate-900 shadow-md backdrop-blur">
          <span className={`h-2.5 w-2.5 rounded-full ${latest ? 'animate-pulse bg-emerald-500' : 'bg-amber-400'}`} />
          {latest ? 'Position GPS du coursier' : 'GPS coursier en attente'}
        </span>
        {destination && <span className={`rounded-full border border-white/80 px-3 py-2 text-[10px] font-extrabold shadow-md backdrop-blur ${destinationIsApproximate ? 'bg-amber-50/95 text-amber-900' : 'bg-emerald-50/95 text-emerald-900'}`}>{destinationIsApproximate ? 'Quartier indicatif' : 'GPS du client'}</span>}
      </div>
      <div className="absolute bottom-3 left-3 z-10 max-w-[78%] rounded-2xl border border-white/80 bg-white/95 px-3 py-2.5 text-[10px] font-semibold leading-relaxed text-slate-700 shadow-lg backdrop-blur">
        {routeState === 'loading' && 'Calcul du trajet routier…'}
        {routeState === 'ready' && routeSummary && <><strong className="text-emerald-900">{destinationIsApproximate ? 'Trajet indicatif vers le quartier' : 'Trajet vers le point GPS relevé'}</strong> · {(routeSummary.distance / 1000).toFixed(1)} km · {Math.max(1, Math.round(routeSummary.duration / 60))} min estimées · OSRM</>}
        {routeState === 'unavailable' && 'Trajet routier indisponible pour le moment. Les positions GPS réelles restent affichées.'}
        {routeState === 'idle' && latest && !destination && 'Position GPS réelle du coursier.'}
        {routeState === 'idle' && !latest && destination && `${destinationIsApproximate ? 'Quartier indicatif' : 'Point GPS relevé'}${destinationLabel ? ` · ${destinationLabel}` : ''} · en attente du coursier`}
        {latest && <span className="mt-0.5 block text-[9px] text-slate-500">Dernière position {new Date(latest.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{typeof latest.accuracy === 'number' ? ` · précision ±${Math.round(latest.accuracy)} m` : ''} · estimation sans trafic en direct</span>}
        <span className="mt-0.5 block text-[9px] text-slate-500">Fond : OpenFreeMap · données OpenStreetMap</span>
        {destinationIsApproximate && <span className="block text-[9px] font-semibold text-amber-800">Le repère correspond au quartier, pas à l’entrée exacte. Le GPS du téléphone peut préciser l’adresse.</span>}
        {destination?.source === 'checkout' && <span className="block text-[9px] font-semibold text-emerald-800">Point GPS relevé sur le téléphone à la commande; vérifiez qu’il se trouvait bien à l’adresse de livraison.</span>}
      </div>
      <button type="button" onClick={recenter} aria-label="Recentrer la carte sur le coursier et la destination" className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-lg font-black text-emerald-800 shadow-lg transition hover:bg-emerald-50">⌖</button>
    </div>
  );
}
