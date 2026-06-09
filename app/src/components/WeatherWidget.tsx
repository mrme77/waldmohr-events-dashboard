import { useEffect, useMemo, useState } from "react";
import { loadWaldmohrWeather, type WeatherReport } from "../data/loadWeather";
import { relativeDayLabel } from "../lib/dates";

interface WeatherCondition {
  label: string;
}

const REFRESH_MS = 15 * 60 * 1000;

/**
 * Maps Open-Meteo WMO weather codes into compact kiosk labels.
 *
 * @param code WMO weather code.
 * @returns Display label and symbol.
 */
function describeWeather(code: number): WeatherCondition {
  if (code === 0) return { label: "Sunny" };
  if ([1, 2, 3].includes(code)) return { label: "Cloud mix" };
  if ([45, 48].includes(code)) return { label: "Fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow" };
  if ([95, 96, 99].includes(code)) return { label: "Storm" };
  return { label: "Weather" };
}

/**
 * Single-location current weather module for the kiosk right rail.
 */
export function WeatherWidget() {
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refreshWeather(): Promise<void> {
      try {
        const nextReport = await loadWaldmohrWeather();
        if (cancelled) return;
        setReport(nextReport);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    void refreshWeather();
    const id = window.setInterval(() => void refreshWeather(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const condition = useMemo(() => {
    return report ? describeWeather(report.current.weatherCode) : null;
  }, [report]);

  const updatedLabel = useMemo(() => {
    if (!report) return "Waiting for Open-Meteo";
    const checkedDate = report.generatedAt.slice(0, 10);
    const todayDate = new Date().toISOString().slice(0, 10);
    return relativeDayLabel(checkedDate, todayDate);
  }, [report]);

  return (
    <section className="weather" aria-label="Current Waldmohr weather">
      <div className="weather__head">
        <p className="eyebrow">Weather</p>
        <span className="weather__source">Open-Meteo</span>
      </div>

      {report && condition ? (
        <>
          <div className="weather__main">
            <div>
              <strong className="weather__temp">{Math.round(report.current.temperatureC)}°</strong>
              <p className="weather__condition">{condition.label}</p>
            </div>
          </div>

          <dl className="weather__metrics">
            <div>
              <dt>Wind</dt>
              <dd>{Math.round(report.current.windKmh)} km/h</dd>
            </div>
            <div>
              <dt>Humidity</dt>
              <dd>{Math.round(report.current.humidityPercent)}%</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="weather__empty">{error ? "Weather unavailable" : "Loading Waldmohr weather..."}</p>
      )}

      <p className={error ? "weather__status weather__status--error" : "weather__status"}>
        {error ?? updatedLabel}
      </p>
    </section>
  );
}
