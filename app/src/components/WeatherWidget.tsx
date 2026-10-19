import { useEffect, useMemo, useState } from "react";
import { loadWaldmohrWeather, type WeatherReport } from "../data/loadWeather";
import { relativeDayLabel } from "../lib/dates";
import { describeWeather } from "../lib/weather";
import { WeatherForecast } from "./WeatherForecast";

const REFRESH_MS = 15 * 60 * 1000;

/**
 * Single-location current weather module for the kiosk right rail.
 */
export function WeatherWidget() {
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forecastOpen, setForecastOpen] = useState(false);

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

  const condition = report ? describeWeather(report.current.weatherCode) : null;

  const updatedLabel = useMemo(() => {
    if (!report) return "Waiting for Open-Meteo";
    const checkedDate = report.generatedAt.slice(0, 10);
    const todayDate = new Date().toISOString().slice(0, 10);
    return relativeDayLabel(checkedDate, todayDate);
  }, [report]);

  return (
    <section className="weather" aria-label="Current Waldmohr weather">
      <button
        className="weather__button"
        type="button"
        onClick={() => setForecastOpen(true)}
        disabled={!report}
        aria-haspopup="dialog"
        aria-expanded={forecastOpen}
        aria-label="Show the seven-day Waldmohr forecast"
      >
      <div className="weather__head">
        <p className="eyebrow">Weather</p>
        <span className="weather__source">Open-Meteo</span>
      </div>

      {report && condition ? (
        <>
          <div className="weather__main">
            <div>
              <strong className="weather__temp">{Math.round(report.current.temperatureC)}°</strong>
              <p className="weather__condition">{condition}</p>
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
      </button>
      {forecastOpen && report && (
        <WeatherForecast days={report.forecast} onClose={() => setForecastOpen(false)} />
      )}
    </section>
  );
}
