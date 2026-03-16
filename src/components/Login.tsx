import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Login = ({
  setTab,
}: {
  setTab: (tab: "signup" | "login") => void;
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ phone: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { phone, password } = formData;
    try {
      const { data, error } = await supabase.rpc("signin_farmer", {
        p_phone: phone,
        p_password: password,
      });
      if (error) throw error;

      if (typeof data === "string" && data.toLowerCase().includes("invalid")) {
        alert("Invalid phone number or password.");
        return;
      }

      localStorage.setItem("farmer", JSON.stringify(data[0]));
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <h2 className="text-3xl font-bold text-center">Login</h2>

      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div>
          <Label className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
            Phone Number
          </Label>
          <Input
            type="number"
            name="phone"
            placeholder="9876543210"
            value={formData.phone}
            onChange={handleChange}
            required
            className="mt-1 border-stone-200 focus:border-green-500 focus:ring-green-500/20 rounded-xl bg-stone-50"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
            Password
          </Label>
          <Input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
            className="mt-1 border-stone-200 focus:border-green-500 focus:ring-green-500/20 rounded-xl bg-stone-50"
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-5 font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-green-600/20"
        >
          Login <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <p className="text-center text-sm">
        Do not have an account?{" "}
        <span
          onClick={() => setTab("signup")}
          className="text-primary cursor-pointer font-medium"
        >
          Sign Up
        </span>
      </p>
    </div>
  );
};

export default Login;
