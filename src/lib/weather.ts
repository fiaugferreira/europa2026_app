import type { Activity, Place } from '../data/trip';

export type WeatherStatus =
  | 'ready'
  | 'not-yet-available'
  | 'offline'
  | 'error';

export type EventWeather = {
  status: WeatherStatus;
  mode: 'hourly' | 'daily';
  location: string;
  date: string;
  timeLabel?: string;
  temperature?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  apparentTemperature?: number;
  precipitationProbability?: number;
  precipitationMm?: number;
  precipitationWindowHours?: number;
  windKmh?: number;
  weatherCode?: number;
  fetchedAt?: string;
  stale?: boolean;
  message?: string;
};

type ForecastPayload = {
  latitude: number;
  longitude: number;
  timezone?: string;
  hourly?: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
  };
};

type ForecastCacheItem = {
  fetchedAt: string;
  data: ForecastPayload;
};

type ForecastCache = Record<string, ForecastCacheItem>;

type GeocodeCacheItem = {
  lat: number;
  lng: number;
  label: string;
};

type GeocodeCache = Record<string, GeocodeCacheItem>;

const FORECAST_CACHE_KEY = 'europa-weather-openmeteo-v1';
const GEOCODE_CACHE_KEY = 'europa-weather-geocode-v1';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const MAX_FORECAST_DAY_OFFSET = 15;

const inFlight = new Map<string, Promise<ForecastCacheItem>>();

const cityAliases: Record<string, string> = {
  'Copenhague': 'Copenhagen',
  'Amsterdã': 'Amsterdam',
  'Zurique': 'Zurich',
  'Lucerna': 'Lucerne',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // O app continua funcionando sem cache se o navegador bloquear storage.
  }
}

function utcDayNumber(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function forecastDayOffset(date: string) {
  return utcDayNumber(date) - utcDayNumber(todayIso());
}

function baseCity(value: string) {
  const first = value.split('→')[0].split('/')[0].trim();
  return cityAliases[first] || first;
}

function normalizeLocationLabel(activity: Activity, place?: Place) {
  if (place?.city) return cityAliases[place.city] || place.city;
  return baseCity(activity.city);
}

function locationCacheKey(lat: number, lng: number) {
  // Aproximadamente 8–11 km: suficiente para previsão urbana e reduz chamadas duplicadas.
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

async function geocodeCity(city: string): Promise<GeocodeCacheItem | undefined> {
  const cache = readJson<GeocodeCache>(GEOCODE_CACHE_KEY, {});
  if (cache[city]) return cache[city];

  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(city)}` +
    '&count=1&language=pt&format=json';

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);

  const json = await response.json() as {
    results?: Array<{
      latitude: number;
      longitude: number;
      name: string;
      country?: string;
    }>;
  };

  const first = json.results?.[0];
  if (!first) return undefined;

  const item: GeocodeCacheItem = {
    lat: first.latitude,
    lng: first.longitude,
    label: first.name,
  };

  writeJson(GEOCODE_CACHE_KEY, { ...cache, [city]: item });
  return item;
}

async function resolveCoordinates(activity: Activity, place?: Place) {
  if (place?.lat !== undefined && place?.lng !== undefined) {
    return {
      lat: place.lat,
      lng: place.lng,
      label: normalizeLocationLabel(activity, place),
    };
  }

  const city = normalizeLocationLabel(activity, place);
  const geocoded = await geocodeCity(city);
  if (!geocoded) return undefined;

  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    label: city,
  };
}

function isFresh(item?: ForecastCacheItem) {
  if (!item) return false;
  return Date.now() - new Date(item.fetchedAt).getTime() < CACHE_MAX_AGE_MS;
}

async function fetchForecast(lat: number, lng: number, force = false) {
  const key = locationCacheKey(lat, lng);
  const cache = readJson<ForecastCache>(FORECAST_CACHE_KEY, {});
  const cached = cache[key];

  if (!force && isFresh(cached)) return cached;

  if (!force && inFlight.has(key)) return inFlight.get(key)!;

  const request = (async () => {
    const hourly = [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
    ].join(',');

    const daily = [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'weather_code',
      'wind_speed_10m_max',
    ].join(',');

    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lng)}` +
      `&hourly=${encodeURIComponent(hourly)}` +
      `&daily=${encodeURIComponent(daily)}` +
      '&temperature_unit=celsius' +
      '&wind_speed_unit=kmh' +
      '&precipitation_unit=mm' +
      '&timezone=auto' +
      '&forecast_days=16';

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Forecast HTTP ${response.status}`);

    const data = await response.json() as ForecastPayload;
    const item: ForecastCacheItem = {
      fetchedAt: new Date().toISOString(),
      data,
    };

    const next = readJson<ForecastCache>(FORECAST_CACHE_KEY, {});
    next[key] = item;
    writeJson(FORECAST_CACHE_KEY, next);
    return item;
  })();

  inFlight.set(key, request);

  try {
    return await request;
  } catch (error) {
    // Se a atualização falhar, devolve o último dado salvo mesmo vencido.
    if (cached) return { ...cached, stale: true } as ForecastCacheItem & { stale: boolean };
    throw error;
  } finally {
    inFlight.delete(key);
  }
}

function extractTimes(time?: string) {
  if (!time) return [];
  return [...time.matchAll(/(\d{1,2}):(\d{2})/g)].map((match) => ({
    hour: Number(match[1]),
    minute: Number(match[2]),
  }));
}

function hourlyWindow(activity: Activity) {
  const times = extractTimes(activity.time);
  if (!times.length) return undefined;

  const start = times[0];
  let hours = 3;

  if (times[1]) {
    const startMinutes = start.hour * 60 + start.minute;
    let endMinutes = times[1].hour * 60 + times[1].minute;
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    hours = Math.max(1, Math.min(8, Math.ceil((endMinutes - startMinutes) / 60)));
  }

  return {
    startHour: start.hour,
    hours,
    label: activity.time,
  };
}

function maxFinite(values: Array<number | undefined>) {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length ? Math.max(...finite) : undefined;
}

function sumFinite(values: Array<number | undefined>) {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (!finite.length) return undefined;
  return finite.reduce((sum, value) => sum + value, 0);
}

function round1(value?: number) {
  if (!Number.isFinite(value)) return undefined;
  return Math.round((value as number) * 10) / 10;
}

function buildHourlyWeather(
  activity: Activity,
  location: string,
  item: ForecastCacheItem & { stale?: boolean },
): EventWeather | undefined {
  const hourly = item.data.hourly;
  const window = hourlyWindow(activity);
  if (!hourly || !window) return undefined;

  const stamp = `${activity.date}T${String(window.startHour).padStart(2, '0')}:00`;
  const index = hourly.time.indexOf(stamp);
  if (index < 0) return undefined;

  const end = Math.min(index + window.hours, hourly.time.length);
  const probability = maxFinite(hourly.precipitation_probability.slice(index, end));
  const precipitation = sumFinite(hourly.precipitation.slice(index, end));
  const wind = maxFinite(hourly.wind_speed_10m.slice(index, end));

  return {
    status: 'ready',
    mode: 'hourly',
    location,
    date: activity.date,
    timeLabel: window.label,
    temperature: round1(hourly.temperature_2m[index]),
    apparentTemperature: round1(hourly.apparent_temperature[index]),
    precipitationProbability: probability === undefined ? undefined : Math.round(probability),
    precipitationMm: round1(precipitation),
    precipitationWindowHours: window.hours,
    windKmh: round1(wind),
    weatherCode: hourly.weather_code[index],
    fetchedAt: item.fetchedAt,
    stale: item.stale,
  };
}

function buildDailyWeather(
  activity: Activity,
  location: string,
  item: ForecastCacheItem & { stale?: boolean },
): EventWeather | undefined {
  const daily = item.data.daily;
  if (!daily) return undefined;

  const index = daily.time.indexOf(activity.date);
  if (index < 0) return undefined;

  return {
    status: 'ready',
    mode: 'daily',
    location,
    date: activity.date,
    temperatureMin: round1(daily.temperature_2m_min[index]),
    temperatureMax: round1(daily.temperature_2m_max[index]),
    precipitationProbability: Number.isFinite(daily.precipitation_probability_max[index])
      ? Math.round(daily.precipitation_probability_max[index])
      : undefined,
    precipitationMm: round1(daily.precipitation_sum[index]),
    windKmh: round1(daily.wind_speed_10m_max[index]),
    weatherCode: daily.weather_code[index],
    fetchedAt: item.fetchedAt,
    stale: item.stale,
  };
}

export async function getEventWeather(
  activity: Activity,
  place?: Place,
  options?: { force?: boolean },
): Promise<EventWeather> {
  const offset = forecastDayOffset(activity.date);

  if (offset < 0 || offset > MAX_FORECAST_DAY_OFFSET) {
    return {
      status: 'not-yet-available',
      mode: hourlyWindow(activity) ? 'hourly' : 'daily',
      location: normalizeLocationLabel(activity, place),
      date: activity.date,
      message: offset > MAX_FORECAST_DAY_OFFSET
        ? 'Previsão disponível quando o evento entrar na janela de 16 dias.'
        : 'A data deste evento já passou.',
    };
  }

  try {
    const coordinates = await resolveCoordinates(activity, place);
    if (!coordinates) {
      return {
        status: 'error',
        mode: hourlyWindow(activity) ? 'hourly' : 'daily',
        location: normalizeLocationLabel(activity, place),
        date: activity.date,
        message: 'Não foi possível localizar esta cidade para a previsão.',
      };
    }

    const item = await fetchForecast(
      coordinates.lat,
      coordinates.lng,
      options?.force === true,
    ) as ForecastCacheItem & { stale?: boolean };

    const weather = hourlyWindow(activity)
      ? buildHourlyWeather(activity, coordinates.label, item)
      : buildDailyWeather(activity, coordinates.label, item);

    if (weather) return weather;

    return {
      status: 'error',
      mode: hourlyWindow(activity) ? 'hourly' : 'daily',
      location: coordinates.label,
      date: activity.date,
      message: 'A previsão ainda não trouxe dados para este horário.',
    };
  } catch {
    return {
      status: navigator.onLine === false ? 'offline' : 'error',
      mode: hourlyWindow(activity) ? 'hourly' : 'daily',
      location: normalizeLocationLabel(activity, place),
      date: activity.date,
      message: navigator.onLine === false
        ? 'Sem internet e sem previsão salva para este evento.'
        : 'Não foi possível atualizar a previsão agora.',
    };
  }
}

export function weatherVisual(code?: number) {
  if (code === undefined) return { icon: '🌤️', label: 'Tempo' };
  if (code === 0) return { icon: '☀️', label: 'Céu limpo' };
  if ([1, 2].includes(code)) return { icon: '🌤️', label: 'Parcialmente nublado' };
  if (code === 3) return { icon: '☁️', label: 'Nublado' };
  if ([45, 48].includes(code)) return { icon: '🌫️', label: 'Neblina' };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: '🌦️', label: 'Garoa' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '🌧️', label: 'Chuva' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '🌨️', label: 'Neve' };
  if ([95, 96, 99].includes(code)) return { icon: '⛈️', label: 'Trovoadas' };
  return { icon: '🌤️', label: 'Tempo variável' };
}

export function weatherUpdatedLabel(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
