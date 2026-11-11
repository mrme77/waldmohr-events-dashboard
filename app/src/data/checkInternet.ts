const CHECK_URL = "https://api.open-meteo.com/v1/forecast?latitude=49.3833&longitude=7.3333&current=temperature_2m&forecast_days=1";

/** Verifies external HTTPS access using the dashboard's existing weather provider.
 * @throws If the request fails or the response is not weather data.
 */
export async function checkInternet(signal: AbortSignal): Promise<void> {
  const response = await fetch(CHECK_URL, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Internet check returned HTTP ${response.status}.`);

  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("current" in payload) ||
      typeof payload.current !== "object" || payload.current === null ||
      !("temperature_2m" in payload.current) || typeof payload.current.temperature_2m !== "number") {
    throw new Error("Internet check did not receive the expected response.");
  }
}
