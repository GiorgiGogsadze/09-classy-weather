import { useEffect, useState } from "react";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

const convertToFlag = (countryCode) => {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

export default function App() {
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState("");
  const [weather, setWeather] = useState({});

  const dailyWeather = Array.from(
    { length: weather.time?.length || 0 },
    (_, i) => {
      return {
        day: weather.time[i],
        min: Math.floor(weather.temperature_2m_min[i]),
        max: Math.ceil(weather.temperature_2m_max[i]),
        code: weather.weathercode[i],
      };
    }
  );

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      if (!location) return setWeather({});
      setIsLoading(true);
      setError("");
      try {
        // 1) Getting location (geocoding)
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${location}`,
          { signal: controller.signal }
        );
        const geoData = await geoRes.json();
        if (!geoData.results) throw new Error("Location not found");

        const { latitude, longitude, timezone, name, country_code } =
          geoData.results.at(0);
        setCountry(`${name} ${convertToFlag(country_code)}`);

        // 2) Getting actual weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`,
          { signal: controller.signal }
        );
        const weatherData = await weatherRes.json();
        setWeather(weatherData.daily);
        setIsLoading(false);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
        setIsLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [location]);

  return (
    <div className="app">
      <h1>Classy weather</h1>
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Search from loaction"
      />
      {isLoading && <p>Loading...</p>}
      {!isLoading && error && <p>🚫{error}</p>}
      {!isLoading && !error && dailyWeather.length !== 0 && (
        <>
          <h2>Weather {country}</h2>
          <ul className="weather">
            {dailyWeather.map((el) => (
              <Weather data={el} key={el.day} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Weather({ data: { day, min, max, code } }) {
  return (
    <li className="day">
      <span>{getWeatherIcon(code)}</span>
      <p>{formatDay(day)}</p>
      <p>
        {min}° — <strong>{max}°</strong>
      </p>
    </li>
  );
}
