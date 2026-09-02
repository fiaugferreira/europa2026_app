import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

import {
  places,
  type Activity,
  type Day,
  type Place,
} from '../data/trip';

import {
  googleMaps,
  googleMapsDirections,
} from '../lib/format';

type MapViewProps = {
  day?: Day;
  compact?: boolean;
};

type CachedLocation = {
  lat?: number;
  lng?: number;
  failedAt?: number;
};

type GeocodeCache = Record<string, CachedLocation>;

type MapPoint = {
  order: number;
  place: Place;
  activity?: Activity;
  lat: number;
  lng: number;
};

const CACHE_KEY = 'europa-map-geocode-v1';
const FAILURE_RETRY_MS = 24 * 60 * 60 * 1000;

const cityAliases: Record<string, string> = {
  Copenhague: 'Copenhagen',
  Amsterdã: 'Amsterdam',
  Zurique: 'Zurich',
  Lucerna: 'Lucerne',
};

const countryAliases: Record<string, string> = {
  Dinamarca: 'Denmark',
  'Países Baixos': 'Netherlands',
  Alemanha: 'Germany',
  França: 'France',
  Suíça: 'Switzerland',
  Brasil: 'Brazil',
};

function readCache(): GeocodeCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistCache(cache: GeocodeCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Se o navegador bloquear storage, o mapa continua funcionando.
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createNumberIcon(number: number, completed = false) {
  return L.divIcon({
    className: '',
    html: `
      <div
        style="
          width:32px;
          height:32px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:${completed ? '#64748b' : '#0f172a'};
          color:white;
          border:3px solid white;
          box-shadow:0 4px 12px rgba(0,0,0,.25);
          font-size:13px;
          font-weight:800;
        "
      >
        ${completed ? '✓' : number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function FitMapToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    const coordinates = points.map(
      (point) => [point.lat, point.lng] as [number, number],
    );

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 15);
      return;
    }

    map.fitBounds(L.latLngBounds(coordinates), {
      padding: [38, 38],
      maxZoom: 15,
    });
  }, [map, points]);

  return null;
}

function buildSearchQuery(place: Place) {
  if (place.address) return place.address;

  const city = cityAliases[place.city] || place.city;
  const country = countryAliases[place.country] || place.country;

  return [place.name, city, country]
    .filter(Boolean)
    .join(', ');
}

async function geocodePlace(place: Place) {
  const query = buildSearchQuery(place);

  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=jsonv2&limit=1&addressdetails=0` +
    `&accept-language=pt-BR` +
    `&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding HTTP ${response.status}`);
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
  }>;

  if (!results.length) return undefined;

  const lat = Number(results[0].lat);
  const lng = Number(results[0].lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined;
  }

  return { lat, lng };
}

function directCoordinates(place: Place) {
  if (
    place.lat !== undefined &&
    place.lng !== undefined
  ) {
    return {
      lat: place.lat,
      lng: place.lng,
    };
  }

  return undefined;
}

function cachedCoordinates(
  place: Place,
  cache: GeocodeCache,
) {
  const cached = cache[place.id];

  if (
    cached?.lat !== undefined &&
    cached?.lng !== undefined
  ) {
    return {
      lat: cached.lat,
      lng: cached.lng,
    };
  }

  return undefined;
}

function mayRetryGeocoding(
  place: Place,
  cache: GeocodeCache,
) {
  const cached = cache[place.id];

  if (!cached?.failedAt) return true;

  return Date.now() - cached.failedAt > FAILURE_RETRY_MS;
}

export default function MapView({
  day,
  compact = false,
}: MapViewProps) {
  const [geocodeCache, setGeocodeCache] =
    useState<GeocodeCache>(() => readCache());

  const [isGeocoding, setIsGeocoding] =
    useState(false);

  /*
   * Todos os lugares que deveriam aparecer no mapa,
   * na mesma ordem das atividades do roteiro.
   */
  const requestedPlaces = useMemo(() => {
    if (!day) {
      return places.map((place) => ({
        place,
        activity: undefined as Activity | undefined,
      }));
    }

    const result: Array<{
      place: Place;
      activity?: Activity;
    }> = [];

    const used = new Set<string>();

    day.activities.forEach((activity) => {
      if (!activity.placeId) return;

      const place = places.find(
        (candidate) =>
          candidate.id === activity.placeId,
      );

      if (!place) return;

      /*
       * Evita pins duplicados quando duas atividades
       * usam exatamente o mesmo local.
       */
      if (used.has(place.id)) return;

      used.add(place.id);

      result.push({
        place,
        activity,
      });
    });

    return result;
  }, [day]);

  /*
   * Se algum ponto não possui coordenadas fixas no trip.ts,
   * tentamos resolver pelo endereço/nome.
   *
   * O resultado fica salvo em localStorage.
   */
  useEffect(() => {
    let cancelled = false;

    async function resolveMissingPlaces() {
      const missing = requestedPlaces
        .map((item) => item.place)
        .filter((place) => {
          if (directCoordinates(place)) return false;
          if (cachedCoordinates(place, geocodeCache)) {
            return false;
          }

          return mayRetryGeocoding(
            place,
            geocodeCache,
          );
        });

      if (!missing.length) {
        setIsGeocoding(false);
        return;
      }

      setIsGeocoding(true);

      for (const place of missing) {
        if (cancelled) break;

        try {
          const resolved =
            await geocodePlace(place);

          if (cancelled) break;

          setGeocodeCache((previous) => {
            const next: GeocodeCache = {
              ...previous,
              [place.id]: resolved
                ? {
                    lat: resolved.lat,
                    lng: resolved.lng,
                  }
                : {
                    failedAt: Date.now(),
                  },
            };

            persistCache(next);
            return next;
          });
        } catch {
          if (cancelled) break;

          setGeocodeCache((previous) => {
            const next: GeocodeCache = {
              ...previous,
              [place.id]: {
                failedAt: Date.now(),
              },
            };

            persistCache(next);
            return next;
          });
        }

        /*
         * Faz as consultas uma por vez.
         * Como o resultado é salvo, isso normalmente
         * acontece apenas na primeira abertura do local.
         */
        await delay(1100);
      }

      if (!cancelled) {
        setIsGeocoding(false);
      }
    }

    resolveMissingPlaces();

    return () => {
      cancelled = true;
    };
  }, [
    requestedPlaces,
    geocodeCache,
  ]);

  /*
   * Pontos que já possuem coordenadas,
   * seja no trip.ts ou no cache local.
   */
  const points = useMemo<MapPoint[]>(() => {
    const result: MapPoint[] = [];

    requestedPlaces.forEach(
      ({ place, activity }) => {
        const coordinates =
          directCoordinates(place) ||
          cachedCoordinates(
            place,
            geocodeCache,
          );

        if (!coordinates) return;

        result.push({
          order: result.length + 1,
          place,
          activity,
          lat: coordinates.lat,
          lng: coordinates.lng,
        });
      },
    );

    return result;
  }, [requestedPlaces, geocodeCache]);

  const route = points.map(
    (point) =>
      [point.lat, point.lng] as [
        number,
        number,
      ],
  );

  const initialCenter: [number, number] =
    route.length > 0
      ? route[0]
      : [50.4, 8.1];

  const unresolvedCount =
    requestedPlaces.length - points.length;

  return (
    <div
      className={`map-wrap ${
        compact
          ? 'map-wrap-compact'
          : ''
      }`}
    >
      <MapContainer
        center={initialCenter}
        zoom={day ? 13 : 5}
        scrollWheelZoom
        className="map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMapToPoints points={points} />

        {route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{
              weight: 4,
              opacity: 0.72,
              dashArray: '8 7',
            }}
          />
        )}

        {points.map(
          ({
            order,
            place,
            activity,
            lat,
            lng,
          }) => (
            <Marker
              key={`${place.id}-${order}`}
              position={[lat, lng]}
              icon={createNumberIcon(
                order,
                activity?.completed === true,
              )}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 190,
                    lineHeight: 1.4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      opacity: 0.55,
                      marginBottom: 3,
                    }}
                  >
                    PARADA {order}
                    {activity?.time
                      ? ` • ${activity.time}`
                      : ''}
                  </div>

                  <strong
                    style={{
                      fontSize: 14,
                    }}
                  >
                    {activity?.title ||
                      place.name}
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      opacity: 0.7,
                    }}
                  >
                    {place.address ||
                      place.city}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginTop: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <a
                      href={googleMaps(
                        place.name,
                        place.address,
                        lat,
                        lng,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver local
                    </a>

                    <a
                      href={googleMapsDirections(
                        place.name,
                        place.address,
                        lat,
                        lng,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Como chegar
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ),
        )}
      </MapContainer>

      {day && (
        <div className="map-day-summary">
          <strong>
            {points.length} de{' '}
            {requestedPlaces.length}{' '}
            paradas no mapa
          </strong>

          <span>
            {isGeocoding
              ? 'Localizando os pontos restantes…'
              : unresolvedCount > 0
                ? `${unresolvedCount} ponto(s) ainda sem localização.`
                : 'Todos os pontos disponíveis estão localizados.'}
          </span>
        </div>
      )}

      {!day && (
        <div className="map-legend">
          <span>
            {points.length} pontos
            localizados.
          </span>
        </div>
      )}
    </div>
  );
}
