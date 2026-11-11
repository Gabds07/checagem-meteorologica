import { useEffect, useMemo, useState } from "react";
import {
    buscarCidades,
    consultarClima,
    type Cidade,
    type Clima,
} from "../api/meteoApi";

const labels: Record<number, string> = {
    0: "Céu limpo",
    1: "Predominantemente limpo",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Nevoeiro",
    48: "Nevoeiro com geada",
    51: "Garoa leve",
    53: "Garoa moderada",
    55: "Garoa intensa",
    61: "Chuva fraca",
    63: "Chuva moderada",
    65: "Chuva forte",
    71: "Neve fraca",
    73: "Neve moderada",
    75: "Neve intensa",
    80: "Pancadas fracas",
    81: "Pancadas moderadas",
    82: "Pancadas fortes",
    95: "Trovoadas",
    96: "Trovoadas com granizo",
    99: "Trovoadas intensas",
};
const icon = (code: number) =>
    code >= 95
        ? "⛈"
        : code >= 71
          ? "❄"
          : code >= 51 || code >= 80
            ? "🌧"
            : code === 45 || code === 48
              ? "🌫"
              : code <= 1
                ? "☀"
                : "⛅";
const dayLabel = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit" })
        .format(new Date(`${date}T12:00:00`))
        .replace(".", "");
type MetricKey = "temperature" | "rain" | "wind" | "humidity";
const metricOptions: { key: MetricKey; label: string; unit: string }[] = [
    { key: "temperature", label: "Temperatura", unit: "°" },
    { key: "rain", label: "Chuva", unit: "%" },
    { key: "wind", label: "Vento", unit: "km/h" },
    { key: "humidity", label: "Umidade", unit: "%" },
];
function uvLabel(value: number) {
    return value < 3
        ? "Baixo"
        : value < 6
          ? "Moderado"
          : value < 8
            ? "Alto"
            : "Muito alto";
}

export default function MainPage() {
    const [query, setQuery] = useState("Salvador");
    const [cities, setCities] = useState<Cidade[]>([]);
    const [selectedCity, setSelectedCity] = useState<Cidade | null>(null);
    const [weather, setWeather] = useState<Clima | null>(null);
    const [recent, setRecent] = useState<Cidade[]>(() =>
        JSON.parse(localStorage.getItem("meteo-recent") || "[]"),
    );
    const [theme, setTheme] = useState(
        () => localStorage.getItem("meteo-theme") || "light",
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [firstCompare, setFirstCompare] = useState("");
    const [secondCompare, setSecondCompare] = useState("");
    const [comparison, setComparison] = useState<[Clima, Clima] | null>(null);
    const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature");

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("meteo-theme", theme);
    }, [theme]);
    useEffect(() => {
        void searchCity("Salvador");
    }, []);

    async function searchCity(name = query) {
        if (!name.trim()) {
            setError("Digite o nome de uma cidade para continuar.");
            return;
        }
        setLoading(true);
        setError("");
        setWeather(null);
        setCities([]);
        try {
            const found = await buscarCidades(name.trim());
            if (!found.length)
                throw new Error(
                    "Nenhuma cidade encontrada. Confira o nome e tente novamente.",
                );
            setCities(found);
            setSelectedCity(found[0]);
            await loadWeather(found[0]);
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Não foi possível consultar a cidade.",
            );
        } finally {
            setLoading(false);
        }
    }
    async function loadWeather(city: Cidade) {
        setLoading(true);
        setError("");
        try {
            const data = await consultarClima(city);
            setSelectedCity(city);
            setWeather(data);
            const next = [
                city,
                ...recent.filter(
                    (item) =>
                        item.latitude !== city.latitude ||
                        item.longitude !== city.longitude,
                ),
            ].slice(0, 5);
            setRecent(next);
            localStorage.setItem("meteo-recent", JSON.stringify(next));
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Falha ao obter a previsão.",
            );
        } finally {
            setLoading(false);
        }
    }
    async function compareCities() {
        if (!firstCompare || !secondCompare) return;
        setLoading(true);
        setError("");
        try {
            const [a, b] = await Promise.all([
                consultarClima(JSON.parse(firstCompare)),
                consultarClima(JSON.parse(secondCompare)),
            ]);
            setComparison([a, b]);
        } catch {
            setError("Não foi possível comparar as cidades agora.");
        } finally {
            setLoading(false);
        }
    }
    const chart = useMemo(() => {
        if (!weather)
            return { points: "", values: [] as number[], min: 0, max: 0 };
        const values = weather.hourly.map((hour) => hour[activeMetric]);
        const min = Math.min(...values);
        const max = Math.max(...values, 1);
        const pad = (max - min) * 0.14 || 1;
        const lower = Math.max(0, min - pad);
        const upper = max + pad;
        const points = values
            .map(
                (value, i) =>
                    `${42 + i * (870 / Math.max(values.length - 1, 1))},${185 - ((value - lower) / (upper - lower || 1)) * 145}`,
            )
            .join(" ");
        return { points, values, min: lower, max: upper };
    }, [weather, activeMetric]);
    const compareOptions = [...recent, ...cities].filter(
        (city, i, list) =>
            list.findIndex(
                (item) =>
                    item.latitude === city.latitude &&
                    item.longitude === city.longitude,
            ) === i,
    );
    const selectedOption = metricOptions.find(
        (option) => option.key === activeMetric,
    )!;
    const today = weather?.daily[0];

    return (
        <div className="app-shell">
            <header className="topbar">
                <a className="brand" href="#inicio">
                    Condições climáticas
                </a>
                <nav>
                    <a href="#hoje">Hoje</a>
                    <a href="#horas">Por hora</a>
                    <a href="#comparacao">Comparar</a>
                </nav>
                <button
                    className="theme-toggle"
                    onClick={() =>
                        setTheme(theme === "light" ? "dark" : "light")
                    }
                    aria-label="Alternar tema"
                >
                    <span>{theme === "light" ? "☾" : "☀"}</span>
                    {theme === "light" ? "Tema escuro" : "Tema claro"}
                </button>
            </header>
            <main id="inicio">
                <section className="search-row">
                    <div>
                        <p className="eyebrow">PAINEL DO TEMPO</p>
                        <h1>Previsão para hoje</h1>
                    </div>
                    <form
                        className="search-card"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void searchCity();
                        }}
                    >
                        <div className="search-line">
                            <input
                                aria-label="Buscar uma cidade"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar cidade"
                            />
                            <button
                                className="button primary"
                                disabled={loading}
                            >
                                {loading ? "Buscando…" : "Buscar"}
                            </button>
                        </div>
                        {cities.length > 1 && (
                            <select
                                aria-label="Escolher localidade"
                                value={
                                    selectedCity
                                        ? JSON.stringify(selectedCity)
                                        : ""
                                }
                                onChange={(e) => {
                                    const city = JSON.parse(
                                        e.target.value,
                                    ) as Cidade;
                                    setSelectedCity(city);
                                    void loadWeather(city);
                                }}
                            >
                                {cities.map((c, i) => (
                                    <option
                                        key={`${c.latitude}-${c.longitude}-${i}`}
                                        value={JSON.stringify(c)}
                                    >
                                        {c.name}
                                        {c.admin1 ? `, ${c.admin1}` : ""},{" "}
                                        {c.country}
                                    </option>
                                ))}
                            </select>
                        )}
                    </form>
                </section>
                {error && (
                    <div className="notice error" role="alert">
                        {error}
                    </div>
                )}
                {loading && !weather && (
                    <div className="loading-card">Carregando a previsão…</div>
                )}
                {weather && selectedCity && today && (
                    <>
                        <section id="hoje" className="today-panel panel">
                            <div className="today-heading">
                                <div>
                                    <p className="eyebrow">
                                        {new Intl.DateTimeFormat("pt-BR", {
                                            weekday: "long",
                                            day: "numeric",
                                            month: "long",
                                        }).format(
                                            new Date(`${today.date}T12:00:00`),
                                        )}
                                    </p>
                                    <h2>
                                        Em {selectedCity.name}
                                        {selectedCity.admin1
                                            ? `, ${selectedCity.admin1}`
                                            : ""}
                                    </h2>
                                    <p className="muted">
                                        {selectedCity.country} · atualizado às{" "}
                                        {weather.current.timeLabel}
                                    </p>
                                </div>
                                <button
                                    className="button outline"
                                    onClick={() =>
                                        void loadWeather(selectedCity)
                                    }
                                    disabled={loading}
                                >
                                    ↻ Atualizar
                                </button>
                            </div>
                            <div className="today-overview">
                                <div className="today-temp">
                                    <span className="weather-glyph">
                                        {icon(weather.current.code)}
                                    </span>
                                    <div>
                                        <strong>
                                            {Math.round(
                                                weather.current.temperature,
                                            )}
                                            °
                                        </strong>
                                        <span>
                                            {labels[weather.current.code] ||
                                                "Condição variável"}
                                        </span>
                                        <small>
                                            Máx. {Math.round(today.max)}° <i />{" "}
                                            Mín. {Math.round(today.min)}°
                                        </small>
                                    </div>
                                </div>
                                <div className="day-outlook">
                                    <p className="eyebrow">PRÓXIMOS DIAS</p>
                                    <div className="outlook-list">
                                        {weather.daily.slice(1).map((day) => (
                                            <div
                                                className="outlook-day"
                                                key={day.date}
                                            >
                                                <span>
                                                    {dayLabel(day.date)}
                                                </span>
                                                <b>{icon(day.code)}</b>
                                                <strong>
                                                    {Math.round(day.max)}°{" "}
                                                    <i>
                                                        {Math.round(day.min)}°
                                                    </i>
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="metric-grid">
                                <Metric
                                    icon="◌"
                                    label="Sensação térmica"
                                    value={`${Math.round(weather.current.apparent)}°`}
                                />
                                <Metric
                                    icon="⌁"
                                    label="Vento"
                                    value={`${Math.round(weather.current.wind)} km/h`}
                                    detail={`${weather.current.windDirection}° direção`}
                                />
                                <Metric
                                    icon="◉"
                                    label="Umidade do ar"
                                    value={`${weather.current.humidity}%`}
                                />
                                <Metric
                                    icon="☼"
                                    label="Índice UV"
                                    value={`${weather.current.uv.toFixed(1)} · ${uvLabel(weather.current.uv)}`}
                                />
                            </div>
                            <p className="coords">
                                Coordenadas {selectedCity.latitude.toFixed(3)}°,{" "}
                                {selectedCity.longitude.toFixed(3)}°{" "}
                                <span>·</span> Observação{" "}
                                {weather.current.observedAt}
                            </p>
                        </section>
                        <section id="horas" className="hourly-panel panel">
                            <div className="hourly-head">
                                <div>
                                    <p className="eyebrow">
                                        ACOMPANHE AS MUDANÇAS
                                    </p>
                                    <h2>Previsão hora a hora</h2>
                                    <p className="muted">
                                        Condições previstas para{" "}
                                        {selectedCity.name} ao longo do dia.
                                    </p>
                                </div>
                                <div
                                    className="chart-tabs"
                                    role="tablist"
                                    aria-label="Variável do gráfico"
                                >
                                    {metricOptions.map((option) => (
                                        <button
                                            role="tab"
                                            aria-selected={
                                                activeMetric === option.key
                                            }
                                            className={
                                                activeMetric === option.key
                                                    ? "active"
                                                    : ""
                                            }
                                            key={option.key}
                                            onClick={() =>
                                                setActiveMetric(option.key)
                                            }
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="hourly-icons">
                                {weather.hourly
                                    .filter((_, i) => i % 3 === 0)
                                    .map((hour) => (
                                        <div key={hour.time}>
                                            <span>{icon(hour.code)}</span>
                                            <b>
                                                {Math.round(hour.temperature)}°
                                            </b>
                                        </div>
                                    ))}
                            </div>
                            <div className="chart-wrap">
                                <svg
                                    className="hourly-chart"
                                    viewBox="0 0 960 235"
                                    role="img"
                                    aria-label={`Gráfico de ${selectedOption.label.toLowerCase()} por hora`}
                                >
                                    <defs>
                                        <linearGradient
                                            id="chartFill"
                                            x1="0"
                                            x2="0"
                                            y1="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="var(--accent)"
                                                stopOpacity=".2"
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="var(--accent)"
                                                stopOpacity="0"
                                            />
                                        </linearGradient>
                                    </defs>
                                    {[0, 1, 2, 3].map((i) => {
                                        const y = 32 + i * 48;
                                        const value =
                                            chart.max -
                                            (i * (chart.max - chart.min)) / 3;
                                        return (
                                            <g key={i}>
                                                <line
                                                    className="chart-grid"
                                                    x1="40"
                                                    y1={y}
                                                    x2="930"
                                                    y2={y}
                                                />
                                                <text
                                                    className="axis-label"
                                                    x="4"
                                                    y={y + 4}
                                                >
                                                    {Math.round(value)}
                                                    {selectedOption.unit}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    <polygon
                                        className="chart-area"
                                        points={`42,224 ${chart.points} 912,224`}
                                    />
                                    <polyline
                                        className="hourly-line"
                                        points={chart.points}
                                    />
                                    {weather.hourly
                                        .filter((_, i) => i % 3 === 0)
                                        .map((hour) => {
                                            const index =
                                                weather.hourly.indexOf(hour);
                                            const x =
                                                42 +
                                                index *
                                                    (870 /
                                                        Math.max(
                                                            weather.hourly
                                                                .length - 1,
                                                            1,
                                                        ));
                                            const y =
                                                185 -
                                                ((hour[activeMetric] -
                                                    chart.min) /
                                                    (chart.max - chart.min ||
                                                        1)) *
                                                    145;
                                            return (
                                                <g key={hour.time}>
                                                    <circle
                                                        className="chart-dot"
                                                        cx={x}
                                                        cy={y}
                                                        r="3.5"
                                                    />
                                                    <text
                                                        className="hour-label"
                                                        x={x}
                                                        y="228"
                                                    >
                                                        {hour.time.slice(
                                                            11,
                                                            16,
                                                        )}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                </svg>
                            </div>
                        </section>
                    </>
                )}
                <section className="bottom-grid">
                    <section className="panel recent-card">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">ACESSO RÁPIDO</p>
                                <h3>Cidades recentes</h3>
                            </div>
                        </div>
                        {recent.length ? (
                            <div className="recent-list">
                                {recent.map((city) => (
                                    <button
                                        key={`${city.latitude}-${city.longitude}`}
                                        onClick={() => void loadWeather(city)}
                                    >
                                        <span>
                                            {city.name}
                                            <small>
                                                {city.admin1 || city.country}
                                            </small>
                                        </span>
                                        <b>→</b>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="muted empty-copy">
                                Suas cidades consultadas aparecerão aqui.
                            </p>
                        )}
                    </section>
                    <section id="comparacao" className="panel compare-card">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">LADO A LADO</p>
                                <h3>Comparar cidades</h3>
                            </div>
                        </div>
                        <p className="muted">
                            Compare as condições atuais de dois lugares.
                        </p>
                        <div className="compare-fields">
                            <label>
                                Primeira cidade
                                <select
                                    value={firstCompare}
                                    onChange={(e) =>
                                        setFirstCompare(e.target.value)
                                    }
                                >
                                    <option value="">Selecione</option>
                                    {compareOptions.map((c, i) => (
                                        <option
                                            key={`${c.latitude}-${i}`}
                                            value={JSON.stringify(c)}
                                        >
                                            {c.name}, {c.country}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Segunda cidade
                                <select
                                    value={secondCompare}
                                    onChange={(e) =>
                                        setSecondCompare(e.target.value)
                                    }
                                >
                                    <option value="">Selecione</option>
                                    {compareOptions.map((c, i) => (
                                        <option
                                            key={`${c.latitude}-${i}`}
                                            value={JSON.stringify(c)}
                                        >
                                            {c.name}, {c.country}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <button
                            className="button primary compare-button"
                            disabled={
                                !firstCompare || !secondCompare || loading
                            }
                            onClick={() => void compareCities()}
                        >
                            Comparar
                        </button>
                        {comparison && (
                            <div className="comparison-results">
                                {comparison.map((item) => (
                                    <div
                                        key={`${item.city.latitude}-${item.city.longitude}`}
                                    >
                                        <span>{item.city.name}</span>
                                        <strong>
                                            {Math.round(
                                                item.current.temperature,
                                            )}
                                            °
                                        </strong>
                                        <small>
                                            {icon(item.current.code)}{" "}
                                            {labels[item.current.code] ||
                                                "Tempo variável"}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </section>
                <footer>
                    <span>Condições climáticas</span>
                    <span>Previsão fornecida por Open-Meteo</span>
                    <a href="#inicio">Voltar ao início ↑</a>
                </footer>
            </main>
        </div>
    );
}
function Metric({
    icon: symbol,
    label,
    value,
    detail,
}: {
    icon: string;
    label: string;
    value: string;
    detail?: string;
}) {
    return (
        <div className="metric">
            <span className="metric-icon">{symbol}</span>
            <div>
                <small>{label}</small>
                <strong>{value}</strong>
                {detail && <small>{detail}</small>}
            </div>
        </div>
    );
}
