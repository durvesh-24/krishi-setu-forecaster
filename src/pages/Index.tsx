import { useState } from "react";
import { Signup } from "@/components/Signup";
import { Login } from "@/components/Login";
import { Leaf } from "lucide-react";

const Index = () => {
  const [tab, setTab] = useState<"signup" | "login">("login");

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-primary via-primary to-[hsl(58,76%,50%)] text-primary-foreground">
      {/* LEFT SIDE - Branding */}
      <div className="hidden md:flex w-1/2 flex-col items-center justify-center px-8 text-center">
        <div className="flex flex-col items-center space-y-8 max-w-md">
          <div className="w-40 h-40 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
            <Leaf className="w-20 h-20 text-white" strokeWidth={2} />
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight">KrishiSetu</h1>
            <p className="text-2xl font-light">Your Smart Farming Companion</p>
            <p className="text-xl font-light opacity-90">Empowering Farmers</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Sign Up Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white text-black px-6">
        {tab === "signup" ? (<Signup setTab={setTab} />) : (<Login setTab={setTab} />)}
      </div>
    </div>
  );
};

export default Index;
