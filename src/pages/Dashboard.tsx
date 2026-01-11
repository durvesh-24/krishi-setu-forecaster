import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sun,
  Brain,
  Wind,
  User,
  Sprout,
  CloudSun,
  Home,
  LineChart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type WeatherResponse = {
  weather_forecast: {
    current: {
      temperature_2m: number;
      rain: number;
      wind_speed_10m: number;
    };
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [weather, setWeather] =
    useState<WeatherResponse["weather_forecast"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      })
      .catch(() => {
        setError("Failed to fetch weather data.");
        setLoading(false);
      });
  }, [city]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-4 flex items-center justify-between border-b"
      >
        <div className="flex items-center gap-2">
          <Sprout className="w-8 h-8 text-emerald-600" />
          <span className="font-bold text-lg">Smart Farmer</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <User className="w-5 h-5" />
        </Button>
      </motion.div>

      <div className="p-4 space-y-6">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Good Morning, Farmer 🌾
          </h1>
          <p className="text-emerald-700 font-medium mt-1">
            Today’s farming insights at a glance
          </p>
        </motion.div>

        {/* Crop Health Card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-emerald-400 to-lime-400" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-emerald-600" />
                <CardTitle>Crop Health Summary</CardTitle>
              </div>
              <CardDescription>
                Wheat crops are healthy. Climate conditions are favorable.
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-2">
                Last updated 2 hours ago
              </p>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card
              onClick={() => navigate("/crop-recommendation")}
              className="cursor-pointer border-none shadow-md bg-white"
            >
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Sprout className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-semibold text-center">
                  Crop Recommendation
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card
              onClick={() => navigate("/weather")}
              className="cursor-pointer border-none shadow-md bg-white"
            >
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center">
                  <CloudSun className="w-8 h-8 text-sky-600" />
                </div>
                <p className="font-semibold text-center">Weather Forecast</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Today's Weather */}
        {loading ? (
          <p className="text-center">Loading weather…</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : weather ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Today’s Weather</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <Sun className="w-10 h-10 mx-auto text-orange-500" />
                    <p className="text-2xl font-bold">
                      {weather.current.temperature_2m.toFixed(1)}°C
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Temperature
                    </p>
                  </div>

                  <div>
                    <Wind className="w-10 h-10 mx-auto text-cyan-500" />
                    <p className="text-2xl font-bold">
                      {weather.current.wind_speed_10m.toFixed(1)} km/h
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Wind Speed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="flex justify-around py-3">
          <Button
            variant="ghost"
            className="flex flex-col"
            onClick={() => navigate("/dashboard")}
          >
            <Home className="w-6 h-6 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-600">
              Home
            </span>
          </Button>

          <Button
            variant="ghost"
            className="flex flex-col"
            onClick={() => navigate("/price-forecasting")}
          >
            <LineChart className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs">Prices</span>
          </Button>

          <Button
            variant="ghost"
            className="flex flex-col"
            onClick={() => navigate("/profile")}
          >
            <User className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
