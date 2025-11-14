import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sun, Cloud, Droplets, Wind, Eye, Gauge } from "lucide-react";
import { useNavigate } from "react-router-dom";

type WeatherResponse = {
  weather_forecast: {
    location: {
      latitude: number;
      longitude: number;
      elevation: number;
      timezone: string;
      timezone_abbreviation: string;
    };
    current: {
      time: string;
      temperature_2m: number;
      rain: number;
      wind_speed_10m: number;
    };
    daily: {
      date: string;
      temperature_2m_max: number;
      temperature_2m_min: number;
      precipitation_sum?: number;
      rain_sum?: number;
    }[];
  };
};

const Weather = () => {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<WeatherResponse["weather_forecast"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // You can make this dynamic (e.g., from user input)
  const city = "mumbai";

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:8000/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    })
      .then((res) => res.json())
      .then((data: WeatherResponse) => {
        setWeather(data.weather_forecast);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch weather data.");
        setLoading(false);
      });
  }, [city]);

  // Helper to get condition icon and label
  const getCondition = (rain: number, temp: number) => {
    if (rain > 0) return { icon: <Droplets className="w-5 h-5 text-blue-500" />, label: "Rainy" };
    if (temp > 32) return { icon: <Sun className="w-5 h-5 text-yellow-500" />, label: "Sunny" };
    if (temp > 25) return { icon: <Cloud className="w-5 h-5 text-gray-400" />, label: "Partly Cloudy" };
    return { icon: <Cloud className="w-5 h-5 text-gray-500" />, label: "Cloudy" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-[hsl(58,76%,50%)] pb-4">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 text-primary-foreground">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Weather Forecast</h1>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center text-lg">Loading weather...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : weather ? (
          <>
            {/* Current Weather */}
            <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <Sun className="w-24 h-24 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-6xl font-bold">
                      {weather.current.temperature_2m.toFixed(2)}°C
                    </p>
                    <p className="text-xl text-muted-foreground mt-2">
                      {getCondition(weather.current.rain, weather.current.temperature_2m).label}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wind: {weather.current.wind_speed_10m.toFixed(2)} km/h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weather Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center space-y-2">
                    <Droplets className="w-8 h-8 text-blue-500" />
                    <p className="text-xl font-bold">
                      {weather.current.rain} mm
                    </p>
                    <p className="text-sm text-muted-foreground">Rain</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center space-y-2">
                    <Wind className="w-8 h-8 text-cyan-500" />
                    <p className="text-xl font-bold">
                      {weather.current.wind_speed_10m.toFixed(2)} km/h
                    </p>
                    <p className="text-sm text-muted-foreground">Wind Speed</p>
                  </div>
                </CardContent>
              </Card>

              {/* You can add more cards for other details if available */}
              {/* <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center space-y-2">
                    <Eye className="w-8 h-8 text-gray-500" />
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-sm text-muted-foreground">Visibility</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center space-y-2">
                    <Gauge className="w-8 h-8 text-purple-500" />
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-sm text-muted-foreground">Pressure</p>
                  </div>
                </CardContent>
              </Card> */}
            </div>

            {/* 7-Day Forecast */}
            <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle>Weekly Forecast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {weather.daily.slice(2, 8).map((day, index) => {
                  const cond = getCondition(day.rain_sum ?? 0, day.temperature_2m_max);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium w-20">{day.date}</p>
                      <div className="flex items-center gap-2 flex-1 justify-center">
                        {cond.icon}
                        <p className="text-sm text-muted-foreground">{cond.label}</p>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="font-semibold">{day.temperature_2m_max.toFixed(2)}°</span>
                        <span className="text-muted-foreground">{day.temperature_2m_min.toFixed(2)}°</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Farming Tips */}
            <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle>Farming Tips for Today</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Good conditions for irrigation in the morning</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Check rainfall and wind before spraying pesticides</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Monitor temperature for crop stress</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Weather;
