export interface CurrentWeather {
  time: string;
  temperatureC: number;
  humidityPercent: number;
  weatherCode: number;
  windKmh: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  highC: number;
  lowC: number;
  precipitationProbability: number | null;
}

export interface WeatherReport {
  locationName: string;
  generatedAt: string;
  current: CurrentWeather;
  forecast: DailyForecast[];
}

interface OpenMeteoCurrent {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  weather_code: number;
  wind_speed_10m: number;
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: Array<number | null>;
  };
}

const WALDMOHR_FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=49.3833&longitude=7.3333&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=Europe%2FBerlin";

/**
 * Loads current keyless Open-Meteo conditions for Waldmohr.
 *
 * @throws If the Open-Meteo response is unavailable or malformed.
 */
export async function loadWaldmohrWeather(): Promise<WeatherReport> {
  const response = await fetch(WALDMOHR_FORECAST_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load Waldmohr weather: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as OpenMeteoResponse;
  if (!payload.current) {
    throw new Error("Open-Meteo response did not include current weather.");
  }

  return {
    locationName: "Waldmohr",
    generatedAt: new Date().toISOString(),
    current: {
      time: payload.current.time,
      temperatureC: payload.current.temperature_2m,
      humidityPercent: payload.current.relative_humidity_2m,
      weatherCode: payload.current.weather_code,
      windKmh: payload.current.wind_speed_10m
    },
    forecast: parseDailyForecast(payload.daily)
  };
}

/** Converts parallel Open-Meteo daily arrays into forecast rows. */
function parseDailyForecast(daily: OpenMeteoResponse["daily"]): DailyForecast[] {
  const { time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max } = daily ?? {};
  if (!time || !weather_code || !temperature_2m_max || !temperature_2m_min || !precipitation_probability_max) {
    return [];
  }

  const count = Math.min(time.length, weather_code.length, temperature_2m_max.length, temperature_2m_min.length, precipitation_probability_max.length);
  return Array.from({ length: count }, (_, index) => ({
    date: time[index],
    weatherCode: weather_code[index],
    highC: temperature_2m_max[index],
    lowC: temperature_2m_min[index],
    precipitationProbability: precipitation_probability_max[index]
  }));
}
