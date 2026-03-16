import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";
import { supabase } from "../lib/supabase"; // adjust path if needed

const Index = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    state: "",
    acres: "",
    language: "",
    password: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { name, phone, state, acres, language, password } = formData;

    try {
      const { data, error } = await supabase.rpc("signup_farmer", {
        p_name: name,
        p_phone: phone,
        p_state: state,
        p_acres: acres,
        p_language: language,
        p_password: password,
      });

      if (error) throw error;

      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };
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
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-3xl font-bold text-center">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                type="number"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>State</Label>
              <Input
                name="state"
                placeholder="Enter your state"
                value={formData.state}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>Land in Acres</Label>
              <Input
                type="number"
                name="acres"
                placeholder="Enter total acres"
                value={formData.acres}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>Preferred Language</Label>
              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="">Select Language</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                name="password"
                placeholder="Set password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Sign Up
            </Button>
          </form>

          <p className="text-center text-sm">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-primary cursor-pointer font-medium"
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
