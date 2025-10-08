import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary via-primary to-[hsl(58,76%,50%)] text-primary-foreground px-4">
      <div className="flex flex-col items-center space-y-8 text-center max-w-md">
        <div className="w-40 h-40 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
          <Leaf className="w-20 h-20 text-white" strokeWidth={2} />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight">KrishiSetu</h1>
          <p className="text-2xl font-light">Your Smart Farming Companion</p>
          <p className="text-xl font-light opacity-90">Empowering Farmers</p>
        </div>

        <Button 
          onClick={() => navigate("/dashboard")}
          size="lg"
          className="mt-8 bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 rounded-full shadow-lg"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
