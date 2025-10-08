import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const PriceForecasting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    state: "",
    district: "",
    commodity: "",
    date: ""
  });

  const stateDistricts: Record<string, string[]> = {
    "Maharashtra": ["Jalgaon", "Mumbai", "Pune", "Satara"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Korba"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"]
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.state || !formData.district || !formData.commodity || !formData.date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    setShowResults(true);
    toast({
      title: "Prediction Generated",
      description: "Price forecast calculated successfully",
    });
  };

  const predictedPrice = 2450;
  const currentPrice = 2200;
  const priceChange = ((predictedPrice - currentPrice) / currentPrice * 100).toFixed(1);
  const isIncrease = predictedPrice > currentPrice;

  return (
    <div className="min-h-screen bg-muted pb-20">
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
                  <Select value={formData.state} onValueChange={(value) => setFormData({...formData, state: value, district: ""})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                      <SelectItem value="Punjab">Punjab</SelectItem>
                      <SelectItem value="Chhattisgarh">Chhattisgarh</SelectItem>
                      <SelectItem value="Kerala">Kerala</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Select 
                    value={formData.district} 
                    onValueChange={(value) => setFormData({...formData, district: value})}
                    disabled={!formData.state}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.state && stateDistricts[formData.state]?.map((district) => (
                        <SelectItem key={district} value={district}>{district}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commodity">Commodity</Label>
                  <Select value={formData.commodity} onValueChange={(value) => setFormData({...formData, commodity: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select commodity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wheat">Wheat</SelectItem>
                      <SelectItem value="rice">Rice</SelectItem>
                      <SelectItem value="apple">Apple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Prediction Date</Label>
                  <Input 
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <Button type="submit" className="w-full py-6 text-lg" size="lg">
                  Predict Price
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Price Prediction Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">Commodity</p>
                  <p className="text-xl font-bold capitalize">{formData.commodity}</p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-xl font-bold">{formData.district}, {formData.state}</p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">Prediction Date</p>
                  <p className="text-xl font-bold">{new Date(formData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>

                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border-2 border-primary">
                  <p className="text-sm text-muted-foreground mb-2">Predicted Price</p>
                  <p className="text-4xl font-bold text-primary">₹{predictedPrice}/quintal</p>
                  <div className={`flex items-center gap-2 mt-3 ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncrease ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    <span className="font-semibold">{isIncrease ? '+' : ''}{priceChange}% from current price</span>
                  </div>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Market Insights</p>
                    <ul className="text-sm space-y-1 text-blue-800">
                      <li>• Current market price: ₹{currentPrice}/quintal</li>
                      <li>• Expected demand is high for selected period</li>
                      <li>• Weather conditions favorable for good harvest</li>
                      <li>• Consider selling {isIncrease ? 'after' : 'before'} the predicted date</li>
                    </ul>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Button 
              onClick={() => setShowResults(false)} 
              variant="outline" 
              className="w-full"
            >
              Check Another Price
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceForecasting;
