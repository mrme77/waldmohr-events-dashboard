export interface CurrentWeather {
  time: string;
  temperatureC: number;
  humidityPercent: number;
  weatherCode: number;
  windKmh: number;
}

export interface WeatherReport {
  locationName: string;
  generatedAt: string;
  current: CurrentWeather;
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
}

const WALDMOHR_FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=49.3833&longitude=7.3333&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe%2FBerlin";

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
    }
  };
}
