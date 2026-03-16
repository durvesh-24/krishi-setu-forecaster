import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import StateAndDistricts from "@/data/states_and_districts.json";

const PriceForecasting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    state: "",
    district: "",
    commodity: "",
    date: "",
  });

  const stateDistricts: Record<string, string[]> = StateAndDistricts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.state ||
      !formData.district ||
      !formData.commodity ||
      !formData.date
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/predict-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: formData.state,
          district: formData.district,
          commodity: formData.commodity.charAt(0).toUpperCase() + formData.commodity.slice(1), // Capitalize first letter
          date: formData.date,
        }),
      });

      const result = await response.json();

      if (result.error) {
        toast({
          title: "Prediction Failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setPredictionResult(result);
      setShowResults(true);
      toast({
        title: "Prediction Generated",
        description: "Price forecast calculated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const predictedPrice = predictionResult?.predicted_price || 0;

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
        <h1 className="text-xl font-bold">Price Forecasting</h1>
      </div>

      <div className="p-4 space-y-4">
        {!showResults ? (
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Enter Market Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) =>
                      setFormData({ ...formData, state: value, district: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(stateDistricts).map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Select
                    value={formData.district}
                    onValueChange={(value) =>
                      setFormData({ ...formData, district: value })
                    }
                    disabled={!formData.state}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.state &&
                        stateDistricts[formData.state]?.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commodity">Commodity</Label>
                  <Select
                    value={formData.commodity}
                    onValueChange={(value) =>
                      setFormData({ ...formData, commodity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select commodity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wheat">Wheat</SelectItem>
                      <SelectItem value="rice">Rice</SelectItem>
                      <SelectItem value="jowar">Jowar</SelectItem>
                      <SelectItem value="bajra">Sugarcane</SelectItem>
                      <SelectItem value="bajra">Cotton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Prediction Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full py-6 text-lg"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Predicting..." : "Predict Price"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : predictionResult && (
          <div className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Price Prediction Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">Commodity</p>
                  <p className="text-xl font-bold capitalize">
                    {formData.commodity}
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-xl font-bold">
                    {formData.district}, {formData.state}
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Prediction Date
                  </p>
                  <p className="text-xl font-bold">
                    {new Date(formData.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border-2 border-primary">
                  <p className="text-sm text-muted-foreground mb-2">
                    Predicted Price
                  </p>
                  <p className="text-4xl font-bold text-primary">
                    ₹{predictedPrice}/quintal
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => {
                setShowResults(false);
                setPredictionResult(null);
              }}
              variant="outline"
              className="w-full"
            >
              Check Another Price
            </Button>
          </div>
        )}
      </div>
      <Footer currentPage="/price-forecasting" />
    </div>
  );
};

export default PriceForecasting;
