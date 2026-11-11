export type Cidade = { name: string; latitude: number; longitude: number; country: string; admin1?: string; country_code?: string };
export type Clima = {
  city: Cidade;
  current: { temperature: number; apparent: number; code: number; wind: number; windDirection: number; humidity: number; uv: number; timeLabel: string; observedAt: string };
  daily: { date: string; max: number; min: number; code: number }[];
  hourly: { time: string; temperature: number; rain: number; wind: number; humidity: number; code: number }[];
};

export async function buscarCidades(name: string): Promise<Cidade[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name, count: "10", language: "pt", format: "json" }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("O serviço de busca de cidades está indisponível.");
  const data = await response.json() as { results?: Cidade[] };
  return data.results || [];
}

export async function consultarClima(city: Cidade): Promise<Clima> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(city.latitude), longitude: String(city.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
    hourly: "uv_index,temperature_2m,precipitation_probability,wind_speed_10m,relative_humidity_2m,weather_code", daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto", forecast_days: "5",
  }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("O serviço meteorológico está indisponível. Tente novamente.");
  const data = await response.json();
  const current = data.current;
  if (!current || !data.daily) throw new Error("A previsão recebida está incompleta.");
  const observed = new Date(current.time);
  const hourIndex = Math.max(0, data.hourly.time.findIndex((t: string) => t >= current.time));
  return {
    city,
    current: {
      temperature: current.temperature_2m, apparent: current.apparent_temperature,
      code: current.weather_code, wind: current.wind_speed_10m, windDirection: current.wind_direction_10m,
      humidity: current.relative_humidity_2m, uv: data.hourly.uv_index[hourIndex] || 0,
      timeLabel: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: data.timezone }).format(observed),
      observedAt: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: data.timezone }).format(observed),
    },
    daily: data.daily.time.map((date: string, i: number) => ({ date, max: data.daily.temperature_2m_max[i], min: data.daily.temperature_2m_min[i], code: data.daily.weather_code[i] })),
    hourly: data.hourly.time.map((time: string, i: number) => ({ time, temperature: data.hourly.temperature_2m[i], rain: data.hourly.precipitation_probability[i], wind: data.hourly.wind_speed_10m[i], humidity: data.hourly.relative_humidity_2m[i], code: data.hourly.weather_code[i] })).filter((hour: { time: string }) => hour.time.startsWith(data.daily.time[0])),
  };
}
