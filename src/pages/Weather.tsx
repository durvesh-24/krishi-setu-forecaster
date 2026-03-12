import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Sun,
  Cloud,
  Droplets,
  Wind,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";

type WeatherResponse = {
  weather_forecast: {
    current: {
      temperature_2m: number;
      rain: number;
      wind_speed_10m: number;
    };
    daily: {
      date: string;
      temperature_2m_max: number;
      temperature_2m_min: number;
      rain_sum?: number;
    }[];
  };
};

const Weather = () => {
  const navigate = useNavigate();
  const [weather, setWeather] =
    useState<WeatherResponse["weather_forecast"] | null>(null);
  const [loading, setLoading] = useState(true);

  const city = "mumbai";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND}/weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    })
      .then((res) => res.json())
      .then((data: WeatherResponse) => {
        setWeather(data.weather_forecast);
        setLoading(false);
      });
  }, [city]);

  const getCondition = (rain: number, temp: number) => {
    if (rain > 0)
      return {
        icon: <Droplets className="w-8 h-8 text-blue-400" />,
        label: "Rainy",
      };
    if (temp > 32)
      return {
        icon: <Sun className="w-8 h-8 text-yellow-400" />,
        label: "Sunny",
      };
    return {
      icon: <Cloud className="w-8 h-8 text-slate-300" />,
      label: "Cloudy",
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-cyan-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <Sun className="w-16 h-16 text-yellow-300" />
        </motion.div>
      </div>
    );
  }

  if (!weather) return null;

  const condition = getCondition(
    weather.current.rain,
    weather.current.temperature_2m
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-sky-500 to-emerald-400 text-white pb-24">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold tracking-wide">Weather Forecast</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Weather */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/20 backdrop-blur-xl border-none shadow-2xl">
            <CardContent className="pt-8 text-center space-y-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex justify-center"
              >
                {condition.icon}
              </motion.div>

              <p className="text-6xl font-extrabold">
                {weather.current.temperature_2m.toFixed(1)}°
              </p>
              <p className="text-lg opacity-80">{condition.label}</p>

              <div className="flex justify-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-cyan-200" />
                  <span>{weather.current.wind_speed_10m.toFixed(1)} km/h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-300" />
                  <span>{weather.current.rain} mm</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Forecast */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/15 backdrop-blur-xl border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">
                7-Day Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weather.daily.slice(2, 8).map((day, index) => {
                const cond = getCondition(
                  day.rain_sum ?? 0,
                  day.temperature_2m_max
                );
                return (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.03 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/20"
                  >
                    <span className="w-24 text-sm">{day.date}</span>
                    <div className="flex items-center gap-2">
                      {cond.icon}
                      <span className="text-sm opacity-80">
                        {cond.label}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">
                        {day.temperature_2m_max.toFixed(1)}°
                      </span>
                      <span className="opacity-70 ml-2">
                        {day.temperature_2m_min.toFixed(1)}°
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Farming Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/15 backdrop-blur-xl border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">
                🌱 Farming Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 opacity-90">
              <p>• Best time for irrigation is early morning</p>
              <p>• Avoid pesticide spraying during wind</p>
              <p>• Monitor heat stress on crops</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer currentPage="/weather" />
    </div>
  );
};

export default Weather;
