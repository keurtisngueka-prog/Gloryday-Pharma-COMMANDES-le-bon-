import type { Coordinates, DeliveryLocationPoint } from '../types';

interface LiveDeliveryMapProps {
  points: DeliveryLocationPoint[];
  destination?: Coordinates;
  destinationLabel?: string;
}

const WIDTH = 800;
const HEIGHT = 420;
const TILE_SIZE = 256;
const MAX_ZOOM = 16;
const MIN_ZOOM = 10;
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function project(latitude: number, longitude: number, zoom: number) {
  const boundedLatitude = Math.max(-85.0511, Math.min(85.0511, latitude));
  const worldSize = TILE_SIZE * 2 ** zoom;
  const sinLatitude = Math.sin((boundedLatitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * worldSize,
  };
}

function wrapTileX(x: number, count: number) {
  return ((x % count) + count) % count;
}

export function LiveDeliveryMap({ points, destination, destinationLabel }: LiveDeliveryMapProps) {
  if (!points.length && !destination) {
    return (
      <div className="relative h-[300px] overflow-hidden rounded-[24px] bg-[#eaf2ed] sm:h-[360px]" aria-label="Aperçu illustratif de la carte de livraison">
        <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <rect width="800" height="420" fill="#eaf2ed" />
          <path d="M0 300C105 248 116 174 212 145S373 163 444 111 621 18 800 54V0H0Z" fill="#d8ead7" />
          <path d="M0 400C130 360 198 380 310 333S525 279 800 308V420H0Z" fill="#dcebd9" />
          <path d="M-40 260C120 225 181 290 321 240S543 194 843 213" fill="none" stroke="#c9d8d1" strokeWidth="26" />
          <path d="M-40 260C120 225 181 290 321 240S543 194 843 213" fill="none" stroke="#fff" strokeWidth="19" />
          <path d="M90 -40C130 68 180 135 234 219S334 340 380 462" fill="none" stroke="#c9d8d1" strokeWidth="23" />
          <path d="M90 -40C130 68 180 135 234 219S334 340 380 462" fill="none" stroke="#fff" strokeWidth="17" />
          <path d="M450 -30C423 92 468 174 510 251S608 347 630 457" fill="none" stroke="#c9d8d1" strokeWidth="22" />
          <path d="M450 -30C423 92 468 174 510 251S608 347 630 457" fill="none" stroke="#fff" strokeWidth="16" />
          <path d="M-20 106C115 132 232 104 350 132S587 168 835 126" fill="none" stroke="#d4e0da" strokeWidth="14" />
          <path d="M-20 106C115 132 232 104 350 132S587 168 835 126" fill="none" stroke="#fff" strokeWidth="10" />
          <path d="M50 365C167 309 261 322 350 291S540 262 734 300" fill="none" stroke="#d4e0da" strokeWidth="13" />
          <path d="M50 365C167 309 261 322 350 291S540 262 734 300" fill="none" stroke="#fff" strokeWidth="9" />
          <path d="M154 89C230 120 264 170 328 191S444 193 511 244 602 286 684 245" fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M154 89C230 120 264 170 328 191S444 193 511 244 602 286 684 245" fill="none" stroke="#1677ef" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="16 11" />
          <circle cx="154" cy="89" r="16" fill="#1677ef" stroke="#fff" strokeWidth="6" />
          <circle cx="684" cy="245" r="18" fill="#fff" />
          <circle cx="684" cy="245" r="12" fill="#e34d59" />
          <path d="M684 259l-9 15h18z" fill="#e34d59" />
        </svg>
        <div className="absolute left-[8%] top-[12%] rounded-2xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-slate-900/5">
          <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Départ</div>
          <div className="mt-0.5 text-xs font-extrabold text-slate-900">Dépôt Gloryday</div>
        </div>
        <div className="absolute right-[5%] top-[52%] max-w-[54%] rounded-2xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-slate-900/5">
          <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Arrivée</div>
          <div className="mt-0.5 truncate text-xs font-extrabold text-slate-900">{destinationLabel || 'Établissement destinataire'}</div>
        </div>
        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-[10px] font-extrabold text-slate-700 shadow-md">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Aperçu illustratif · GPS précis non renseigné
        </div>
        <div className="absolute bottom-3 left-3 max-w-[72%] rounded-xl bg-white/95 px-3 py-2 text-[10px] font-medium leading-relaxed text-slate-600 shadow-md">
          Cette illustration n’est pas une carte réelle. La carte réelle s’affiche dès que la destination de cette commande a des coordonnées GPS.
        </div>
        <div className="absolute bottom-3 right-3 rounded-xl bg-white/90 p-1.5 text-slate-500 shadow-md" aria-hidden="true">
          <span className="text-base leading-none">⌖</span>
        </div>
      </div>
    );
  }
  const latest = points.length ? points[points.length - 1] : null;
  const coordinates = [
    ...points.slice(-400).map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
    ...(destination ? [{ latitude: destination.lat, longitude: destination.lng }] : []),
  ];
  let zoom = MAX_ZOOM;
  let projected = coordinates.map((point) => project(point.latitude, point.longitude, zoom));
  let bounds = {
    minX: Math.min(...projected.map((point) => point.x)),
    maxX: Math.max(...projected.map((point) => point.x)),
    minY: Math.min(...projected.map((point) => point.y)),
    maxY: Math.max(...projected.map((point) => point.y)),
  };
  while (zoom > MIN_ZOOM && (bounds.maxX - bounds.minX > WIDTH - 70 || bounds.maxY - bounds.minY > HEIGHT - 70)) {
    zoom -= 1;
    projected = coordinates.map((point) => project(point.latitude, point.longitude, zoom));
    bounds = {
      minX: Math.min(...projected.map((point) => point.x)),
      maxX: Math.max(...projected.map((point) => point.x)),
      minY: Math.min(...projected.map((point) => point.y)),
      maxY: Math.max(...projected.map((point) => point.y)),
    };
  }
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const screenPoint = (point: Pick<DeliveryLocationPoint, 'latitude' | 'longitude'>) => {
    const projected = project(point.latitude, point.longitude, zoom);
    return {
      x: projected.x - center.x + WIDTH / 2,
      y: projected.y - center.y + HEIGHT / 2,
    };
  };
  const trail = points.slice(-400).map(screenPoint);
  const trailPath = trail.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const courierPoint = latest ? screenPoint(latest) : null;
  const destinationPoint = destination ? screenPoint({ latitude: destination.lat, longitude: destination.lng }) : null;
  const destinationVisible = destinationPoint && destinationPoint.x >= 0 && destinationPoint.x <= WIDTH && destinationPoint.y >= 0 && destinationPoint.y <= HEIGHT;
  const tileCount = 2 ** zoom;
  const centerTileX = Math.floor(center.x / TILE_SIZE);
  const centerTileY = Math.floor(center.y / TILE_SIZE);
  const accuracyMetersPerPixel = latest ? 156543.03392 * Math.cos((latest.latitude * Math.PI) / 180) / 2 ** zoom : 0;
  const accuracyRadius = latest ? Math.max(8, Math.min(70, latest.accuracy / Math.max(accuracyMetersPerPixel, 0.1))) : 0;

  return (
    <div className="relative h-[300px] overflow-hidden rounded-[24px] border border-slate-200 bg-[#e9eef0] sm:h-[360px]" aria-label={latest ? 'Carte du trajet du livreur et de la destination de cette commande' : 'Carte réelle de la destination de cette commande, en attente du GPS livreur'}>
      <div className="absolute inset-0 overflow-hidden">
        {[-2, -1, 0, 1, 2].flatMap((offsetX) => [-1, 0, 1].map((offsetY) => {
          const unwrappedX = centerTileX + offsetX;
          const tileX = wrapTileX(unwrappedX, tileCount);
          const tileY = centerTileY + offsetY;
          if (tileY < 0 || tileY >= tileCount) return null;
          const left = unwrappedX * TILE_SIZE - center.x + WIDTH / 2;
          const top = tileY * TILE_SIZE - center.y + HEIGHT / 2;
          const src = TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(tileX)).replace('{y}', String(tileY));
          return (
            <img
              key={`${tileX}-${tileY}`}
              src={src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ left, top, width: TILE_SIZE, height: TILE_SIZE }}
            />
          );
        }))}
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {trail.length > 1 && <path d={trailPath} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />}
        {trail.length > 1 && <path d={trailPath} fill="none" stroke="#0d44e8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {destinationVisible && (
          <g transform={`translate(${destinationPoint!.x},${destinationPoint!.y})`}>
            <circle r="12" fill="#be123c" fillOpacity="0.2" />
            <circle r="7" fill="#be123c" stroke="white" strokeWidth="3" />
          </g>
        )}
        {courierPoint && <circle cx={courierPoint.x} cy={courierPoint.y} r={accuracyRadius} fill="#0d44e8" fillOpacity="0.12" />}
        {courierPoint && <circle cx={courierPoint.x} cy={courierPoint.y} r="13" fill="#0d44e8" fillOpacity="0.18" />}
        {courierPoint && <circle cx={courierPoint.x} cy={courierPoint.y} r="7" fill="#0d44e8" stroke="white" strokeWidth="3" />}
      </svg>
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-900 shadow">
        <span className={`h-2 w-2 rounded-full ${latest ? 'animate-pulse bg-emerald-500' : 'bg-amber-400'}`} />
        {latest ? 'Position du livreur' : 'GPS livreur en attente'}
      </div>
      {destinationVisible && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-900 shadow">
          <span className="h-2 w-2 rounded-full bg-rose-600" /> Destination de cette commande
        </div>
      )}
      {!latest && destination && (
        <div className="absolute bottom-3 left-3 max-w-[78%] rounded-xl bg-white/95 px-3 py-2 text-[10px] font-semibold leading-relaxed text-slate-700 shadow-md">
          Épingle rouge : destination GPS de ce client. Le point du livreur apparaîtra après son autorisation de partage.
        </div>
      )}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-slate-700"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
