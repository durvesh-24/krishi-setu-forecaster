import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Brain, Cloud, Droplets, Wind, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <div className="bg-background p-4 flex items-center justify-between border-b">
        <Sun className="w-8 h-8 text-primary" />
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/profile")}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <User className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Good morning, Farmer</h1>
          <p className="text-primary font-medium mt-1">Farming insights for today</p>
        </div>

        {/* Crop Health Card */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="h-32 bg-gradient-to-br from-amber-200 to-amber-300 relative">
            <img 
              src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80" 
              alt="Wheat field"
              className="w-full h-full object-cover mix-blend-overlay"
            />
          </div>
          <CardHeader className="bg-gradient-to-br from-primary/20 to-transparent">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              <CardTitle>Crop Health Summary</CardTitle>
            </div>
            <CardDescription className="text-foreground">
              Your wheat fields are thriving. Season conditions are ideal.
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-2">Last updated 2 hours ago</p>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-none bg-gradient-to-br from-background to-secondary/20"
            onClick={() => navigate("/crop-recommendation")}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Crop</p>
                <p className="font-semibold">Recommendation</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-none bg-gradient-to-br from-background to-secondary/20"
            onClick={() => navigate("/weather")}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sun className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-center">Weather</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Weather */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Today's Weather</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-orange-100 flex items-center justify-center">
                  <Sun className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-2xl font-bold">28°C</p>
                <p className="text-sm text-muted-foreground">Temperature</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">65%</p>
                <p className="text-sm text-muted-foreground">Humidity</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-cyan-100 flex items-center justify-center">
                  <Wind className="w-6 h-6 text-cyan-500" />
                </div>
                <p className="text-2xl font-bold">12 km/h</p>
                <p className="text-sm text-muted-foreground">Wind Speed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-3">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          <Button variant="ghost" className="flex-col h-auto py-2" onClick={() => navigate("/dashboard")}>
            <Sun className="w-6 h-6 text-primary" />
            <span className="text-xs mt-1 text-primary font-medium">Home</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-2" onClick={() => navigate("/price-forecasting")}>
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs mt-1 text-muted-foreground">Price</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-2" onClick={() => navigate("/profile")}>
            <User className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs mt-1 text-muted-foreground">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
