import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, User, Globe, History, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <div className="bg-background p-4 flex items-center gap-4 border-b">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Card */}
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center">
                <User className="w-12 h-12 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Kabir Singh</h2>
                <p className="text-primary font-medium">Farmer, Maharashtra</p>
              </div>
              <p className="text-muted-foreground">
                Growing wheat, rice, and cotton on 8 acres
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <span>📍</span>
                Jalgaon, Maharashtra
              </p>
              <p className="text-sm text-muted-foreground">Member since 2022</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">3</p>
              <p className="text-sm text-muted-foreground mt-1">Crops Grown</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">8</p>
              <p className="text-sm text-muted-foreground mt-1">acres</p>
              <p className="text-xs text-muted-foreground">Farm Size</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">12</p>
              <p className="text-sm text-muted-foreground mt-1">years</p>
              <p className="text-xs text-muted-foreground">Experience</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold px-2">Account</h3>
          <Card className="border-none shadow-md">
            <CardContent className="p-0">
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Language</p>
                    <p className="text-sm text-muted-foreground">English</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Activity Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold px-2">Activity</h3>
          <Card className="border-none shadow-md">
            <CardContent className="p-0">
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">History</p>
                    <p className="text-sm text-muted-foreground">View your past queries and advisories</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-3">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          <Button variant="ghost" className="flex-col h-auto py-2" onClick={() => navigate("/dashboard")}>
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 text-muted-foreground">Home</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-2" onClick={() => navigate("/price-forecasting")}>
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs mt-1 text-muted-foreground">Price</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-2">
            <User className="w-6 h-6 text-primary" />
            <span className="text-xs mt-1 text-primary font-medium">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
