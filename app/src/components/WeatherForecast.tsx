import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DailyForecast } from "../data/loadWeather";
import { describeWeather } from "../lib/weather";

interface WeatherForecastProps {
  days: DailyForecast[];
  onClose: () => void;
}

/** Seven-day Waldmohr forecast in a touch-friendly, dismissible panel. */
export function WeatherForecast({ days, onClose }: WeatherForecastProps): JSX.Element {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="overlay" role="presentation" onClick={onClose}>
      <section
        className="popover weather-forecast"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weather-forecast-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="popover__head">
          <div>
            <h2 id="weather-forecast-title">Waldmohr forecast</h2>
            <p className="weather-forecast__subtitle">Next seven days · Open-Meteo</p>
          </div>
          <button type="button" className="popover__close" aria-label="Close forecast" onClick={onClose}>
            ×
          </button>
        </header>
        {days.length === 0 ? (
          <p className="popover__empty">The forecast is unavailable right now. Try again shortly.</p>
        ) : (
          <ul className="weather-forecast__days">
            {days.map((day, index) => (
              <li key={day.date} className="weather-forecast__day">
                <time dateTime={day.date}>
                  {index === 0 ? "Today" : new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Berlin" }).format(new Date(`${day.date}T12:00:00`))}
                </time>
                <span className="weather-forecast__condition">{describeWeather(day.weatherCode)}</span>
                <span className="weather-forecast__temperatures">
                  <strong>{Math.round(day.highC)}°</strong> / {Math.round(day.lowC)}°
                </span>
                <span className="weather-forecast__rain">
                  {day.precipitationProbability === null ? "—" : `${day.precipitationProbability}% rain`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>,
    document.body
  );
}
