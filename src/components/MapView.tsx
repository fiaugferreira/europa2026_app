import { useEffect, useMemo } from 'react';
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

type MapPoint = {
  order: number;
  place: Place;
  activity?: Activity;
};

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
      ({ place }) => [place.lat!, place.lng!] as [number, number],
    );

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 15);
      return;
    }

    const bounds = L.latLngBounds(coordinates);

    map.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 15,
    });
  }, [map, points]);

  return null;
}

export default function MapView({
  day,
  compact = false,
}: MapViewProps) {
  const points = useMemo<MapPoint[]>(() => {
    /*
     * Quando um dia é informado:
     * mostra somente os pontos daquele dia,
     * respeitando a ordem das atividades.
     */
    if (day) {
      const result: MapPoint[] = [];
      const usedPlaces = new Set<string>();

      day.activities.forEach((activity) => {
        if (!activity.placeId) return;

        const place = places.find(
          (item) => item.id === activity.placeId,
        );

        if (
          !place ||
          place.lat === undefined ||
          place.lng === undefined
        ) {
          return;
        }

        /*
         * Se duas atividades apontarem para o mesmo local,
         * o pin aparece apenas uma vez para não poluir o mapa.
         */
        if (usedPlaces.has(place.id)) return;

        usedPlaces.add(place.id);

        result.push({
          order: result.length + 1,
          place,
          activity,
        });
      });

      return result;
    }

    /*
     * Compatibilidade temporária com a versão antiga do App:
     * enquanto ainda existir uma tela geral de mapa,
     * mostra todos os lugares que possuem coordenadas.
     *
     * Essa visualização geral será removida quando
     * atualizarmos App.tsx.
     */
    return places
      .filter(
        (place) =>
          place.lat !== undefined &&
          place.lng !== undefined,
      )
      .map((place, index) => ({
        order: index + 1,
        place,
      }));
  }, [day]);

  const route = points.map(
    ({ place }) =>
      [place.lat!, place.lng!] as [number, number],
  );

  const initialCenter: [number, number] =
    route.length > 0
      ? route[0]
      : [50.4, 8.1];

  return (
    <div
      className={`map-wrap ${
        compact ? 'map-wrap-compact' : ''
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
              opacity: 0.7,
              dashArray: '8 7',
            }}
          />
        )}

        {points.map(
          ({ order, place, activity }) => (
            <Marker
              key={`${place.id}-${order}`}
              position={[place.lat!, place.lng!]}
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
                    {activity?.title || place.name}
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      opacity: 0.7,
                    }}
                  >
                    {place.address || place.city}
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
                        place.lat,
                        place.lng,
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
                        place.lat,
                        place.lng,
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
          <strong>{points.length} paradas no mapa</strong>
          <span>
            Os números seguem a ordem do roteiro do dia.
          </span>
        </div>
      )}

      {!day && (
        <div className="map-legend">
          <span>
            {points.length} pontos do roteiro com
            coordenadas disponíveis.
          </span>
        </div>
      )}
    </div>
  );
}
