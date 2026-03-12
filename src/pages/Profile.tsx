import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  User,
  Globe,
  History,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import Footer from "@/components/Footer";

declare global {
  interface Window {
    setAppLanguage: (lang: string) => void;
  }
}

const Profile = () => {
  const navigate = useNavigate();
  const [showLang, setShowLang] = useState(false);

  const changeLanguage = (lang: "en" | "mr") => {
    if (lang === "en") {
      window.setAppLanguage("en");
    }
    window.setAppLanguage(lang);
    setShowLang(false);
  };

  return (
    <div className="min-h-screen bg-muted pb-24">
      {/* Header */}
      <div className="bg-background p-4 flex items-center gap-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-none shadow-md">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="mx-auto w-24 h-24 rounded-full bg-primary flex items-center justify-center">
                <User className="w-12 h-12 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Kabir Singh</h2>
              <p className="text-primary font-medium">Farmer, Maharashtra</p>
              <p className="text-muted-foreground text-sm">
                Wheat, Rice & Cotton • 8 Acres
              </p>
              <p className="text-xs text-muted-foreground">
                📍 Jalgaon, Maharashtra • Member since 2022
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Crops", value: "3" },
            { label: "Acres", value: "8" },
            { label: "Years", value: "12" }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-none shadow-md text-center">
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Language Section */}
        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            <button
              className="w-full flex items-center justify-between p-4"
              onClick={() => setShowLang(!showLang)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Language</p>
                  <p className="text-sm text-muted-foreground notranslate" translate="no">
                    English / मराठी
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 transition ${showLang ? "rotate-90" : ""}`} />
            </button>

            {showLang && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="border-t"
              >
                <button
                  className="w-full text-left px-6 py-3 hover:bg-muted notranslate"
                  translate="no"
                  onClick={() => changeLanguage("en")}
                >
                  English
                </button>
                <button
                  className="w-full text-left px-6 py-3 hover:bg-muted notranslate"
                  translate="no"
                  onClick={() => changeLanguage("mr")}
                >
                  मराठी
                </button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <History className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">History</p>
                  <p className="text-sm text-muted-foreground">
                    Past queries & advisories
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          </CardContent>
        </Card>
      </div>
      <Footer currentPage="/profile" />
    </div>
  );
};

export default Profile;
