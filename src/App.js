import React from "react";
import { useEffect } from "react";

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

export default class App extends React.Component {
  state = {
    location: "",
    isLoading: false,
    error: "",
    country: "",
    weather: {},
  };

  fetchCleaner = () => {};

  componentDidMount() {
    this.setState({ location: localStorage.getItem("location") || "" });
    this.fetchCleaner = this.fetchWeather();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.location !== prevState.location) {
      this.fetchCleaner();
      this.fetchCleaner = this.fetchWeather();
      localStorage.setItem("location", this.state.location);
    }
  }

  fetchWeather = () => {
    const { location } = this.state;
    const controller = new AbortController();

    if (!location) {
      this.setState({ weather: {} });
    } else {
      (async () => {
        this.setState({ isLoading: true });
        this.setState({ error: "" });
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
          this.setState({ country: `${name} ${convertToFlag(country_code)}` });

          // 2) Getting actual weather
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`,
            { signal: controller.signal }
          );
          const weatherData = await weatherRes.json();
          this.setState({ weather: weatherData.daily });
          this.setState({ isLoading: false });
        } catch (err) {
          console.log(err.name);
          if (err.name !== "AbortError") {
            this.setState({ error: err.message });
            this.setState({ isLoading: false });
          }
        }
      })();
    }
    return () => {
      controller.abort();
    };
  };

  render() {
    const { location, isLoading, error, country, weather } = this.state;
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
    return (
      <div className="app">
        <h1>Classy weather</h1>
        <input
          type="text"
          value={location}
          onChange={(e) => this.setState({ location: e.target.value })}
          placeholder="Search from loaction"
        />
        {isLoading && <p>Loading...</p>}
        {!isLoading && error && <p>🚫{error}</p>}
        {!isLoading && !error && dailyWeather.length !== 0 && (
          <>
            <h2>Weather {country}</h2>
            <ul className="weather">
              {dailyWeather.map((el, i) => (
                <Weather data={el} key={el.day} isToday={i === 0} />
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }
}

class Weather extends React.Component {
  render() {
    const { day, min, max, code } = this.props.data;
    return (
      <li className="day">
        <span>{getWeatherIcon(code)}</span>
        <p>{this.props.isToday ? "Today" : formatDay(day)}</p>
        <p>
          {min}&deg; &mdash; <strong>{max}&deg;</strong>
        </p>
      </li>
    );
  }
}
