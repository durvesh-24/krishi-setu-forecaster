import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Leaf, Zap, TrendingUp, Droplets } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import Footer from "@/components/Footer";

const CropRecommendation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    temp: "",
    humidity: "",
    ph: "",
    rainfall: ""
  });
  const [loading, setLoading] = useState(false);
  const [suitableCrops, setSuitableCrops] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Prepare payload for FastAPI
    const payload = {
      N: parseFloat(formData.nitrogen),
      P: parseFloat(formData.phosphorus),
      K: parseFloat(formData.potassium),
      temperature: parseFloat(formData.temp),
      humidity: parseFloat(formData.humidity),
      ph: parseFloat(formData.ph),
      rainfall: parseFloat(formData.rainfall),
    };

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND}/predict`, payload);
      // If your backend returns a single crop:
      setSuitableCrops([
        {
          name: res.data.predicted_crop,
          reason: "This crop is recommended based on your soil and weather parameters."
        }
      ]);
      setShowResults(true);
      toast({
        title: "Analysis Complete",
        description: "Crop recommendations generated based on soil parameters",
      });
    } catch (err: any) {
      setError("Failed to get recommendation. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  // const suitableCrops = [
  //   {
  //     name: "Wheat",
  //     reason: "Optimal NPK levels and pH range (6.5-7.5) match your soil conditions perfectly. Current moisture levels are ideal for wheat cultivation."
  //   },
  //   {
  //     name: "Cotton",
  //     reason: "Good potassium levels support cotton growth. The pH and moisture content are within acceptable range for cotton cultivation."
  //   },
  //   {
  //     name: "Sugarcane",
  //     reason: "High nitrogen content and adequate moisture make your soil suitable for sugarcane. pH levels are optimal for this crop."
  //   }
  // ];

  // const notSuitableCrops = [
  //   {
  //     name: "Rice",
  //     reason: "Requires higher moisture content (80-85%) than current levels. Consider improving water retention before rice cultivation."
  //   },
  //   {
  //     name: "Tea",
  //     reason: "Needs acidic soil (pH 4.5-5.5). Your current pH levels are too high for tea plantation."
  //   }
  // ];

  return (
    <div className="min-h-screen bg-muted pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Crop Recommendation</h1>
      </div>

      <div className="p-4 space-y-4">
        {!showResults ? (
          <>
            <p className="text-center text-muted-foreground">
              Enter soil parameters for analysis
            </p>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Soil Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Leaf className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="nitrogen">Nitrogen (N)</Label>
                        <Input 
                          id="nitrogen"
                          placeholder="Enter N value (kg/ha)"
                          value={formData.nitrogen}
                          onChange={(e) => setFormData({...formData, nitrogen: e.target.value})}
                          required
                          type="number"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="phosphorus">Phosphorus (P)</Label>
                        <Input 
                          id="phosphorus"
                          placeholder="Enter P value (kg/ha)"
                          value={formData.phosphorus}
                          onChange={(e) => setFormData({...formData, phosphorus: e.target.value})}
                          required
                          type="number"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="potassium">Potassium (K)</Label>
                        <Input 
                          id="potassium"
                          placeholder="Enter K value (kg/ha)"
                          value={formData.potassium}
                          onChange={(e) => setFormData({...formData, potassium: e.target.value})}
                          required
                          type="number"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-gray-600">T</span>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="temp">Temperature</Label>
                        <Input 
                          id="temp"
                          placeholder="Enter Temperature (in Celsius)"
                          value={formData.temp}
                          onChange={(e) => setFormData({...formData, temp: e.target.value})}
                          required
                          type="number"
                          step="0.1"
                          min="-100"
                          max="100"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-gray-600">H</span>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="humidity">Humidity</Label>
                        <Input 
                          id="humidity"
                          placeholder="Enter Humidity"
                          value={formData.humidity}
                          onChange={(e) => setFormData({...formData, humidity: e.target.value})}
                          required
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-gray-600">pH</span>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="ph">pH Level</Label>
                        <Input 
                          id="ph"
                          placeholder="Enter pH value (0-14)"
                          value={formData.ph}
                          onChange={(e) => setFormData({...formData, ph: e.target.value})}
                          required
                          type="number"
                          step="0.1"
                          min="0"
                          max="14"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Droplets className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="rainfall">Rainfall (in mm)</Label>
                        <Input 
                          id="rainfall"
                          placeholder="Enter rainfall (in mm)"
                          value={formData.rainfall}
                          onChange={(e) => setFormData({...formData, rainfall: e.target.value})}
                          required
                          type="number"
                          min="0"
                          max="1000"
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full py-6 text-lg" size="lg" disabled={loading}>
                    {loading ? "Analyzing..." : "Get Prediction"}
                  </Button>
                  {error && <p className="text-red-600 text-center">{error}</p>}
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-4">
            <Card className="border-none shadow-md bg-green-50 border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="text-green-700">Most Suitable Crop</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {suitableCrops.map((crop, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg">
                    <h3 className="font-bold text-lg text-green-700 mb-2">{crop.name}</h3>
                    <p className="text-sm text-gray-700">{crop.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button 
              onClick={() => setShowResults(false)} 
              variant="outline" 
              className="w-full"
            >
              Try Different Parameters
            </Button>
          </div>
        )}
      </div>
      <Footer currentPage="/crop-recommendation" />
    </div>
  );
};

export default CropRecommendation;
