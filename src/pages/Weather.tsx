import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sun, Cloud, Droplets, Wind, Eye, Gauge } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Weather = () => {
  const navigate = useNavigate();

  const weeklyForecast = [
    { day: "Mon", high: 32, low: 24, condition: "Sunny" },
    { day: "Tue", high: 30, low: 23, condition: "Partly Cloudy" },
    { day: "Wed", high: 28, low: 22, condition: "Cloudy" },
    { day: "Thu", high: 27, low: 21, condition: "Rainy" },
    { day: "Fri", high: 29, low: 22, condition: "Sunny" },
    { day: "Sat", high: 31, low: 24, condition: "Sunny" },
    { day: "Sun", high: 30, low: 23, condition: "Partly Cloudy" },
  ];

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
        {/* Current Weather */}
        <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Sun className="w-24 h-24 text-yellow-500" />
              </div>
              <div>
                <p className="text-6xl font-bold">28°C</p>
                <p className="text-xl text-muted-foreground mt-2">Partly Cloudy</p>
                <p className="text-sm text-muted-foreground mt-1">Feels like 30°C</p>
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
                <p className="text-2xl font-bold">65%</p>
                <p className="text-sm text-muted-foreground">Humidity</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Wind className="w-8 h-8 text-cyan-500" />
                <p className="text-2xl font-bold">12 km/h</p>
                <p className="text-sm text-muted-foreground">Wind Speed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Eye className="w-8 h-8 text-gray-500" />
                <p className="text-2xl font-bold">10 km</p>
                <p className="text-sm text-muted-foreground">Visibility</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Gauge className="w-8 h-8 text-purple-500" />
                <p className="text-2xl font-bold">1013 mb</p>
                <p className="text-sm text-muted-foreground">Pressure</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 7-Day Forecast */}
        <Card className="border-none shadow-lg bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle>7-Day Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weeklyForecast.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <p className="font-medium w-12">{day.day}</p>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  {day.condition === "Sunny" && <Sun className="w-5 h-5 text-yellow-500" />}
                  {day.condition === "Cloudy" && <Cloud className="w-5 h-5 text-gray-500" />}
                  {day.condition === "Partly Cloudy" && <Cloud className="w-5 h-5 text-gray-400" />}
                  {day.condition === "Rainy" && <Droplets className="w-5 h-5 text-blue-500" />}
                  <p className="text-sm text-muted-foreground">{day.condition}</p>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold">{day.high}°</span>
                  <span className="text-muted-foreground">{day.low}°</span>
                </div>
              </div>
            ))}
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
                <span>Moderate humidity is ideal for most crops</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Consider applying fertilizers before evening</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Weather;
