import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Pages after login are loaded on demand to keep the first load small
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CropRecommendation = lazy(() => import("./pages/CropRecommendation"));
const LeafDiseaseDetection = lazy(() => import("./pages/LeafDiseaseDetection"));
const Weather = lazy(() => import("./pages/Weather"));
const PriceForecasting = lazy(() => import("./pages/PriceForecasting"));
const Profile = lazy(() => import("./pages/Profile"));

const queryClient = new QueryClient();

const protectedRoutes = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/crop-recommendation", element: <CropRecommendation /> },
  { path: "/leaf-disease-detection", element: <LeafDiseaseDetection /> },
  { path: "/weather", element: <Weather /> },
  { path: "/price-forecasting", element: <PriceForecasting /> },
  { path: "/profile", element: <Profile /> },
];

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="krishisetu-theme">
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <Routes>
                <Route path="/" element={<Index />} />
                {protectedRoutes.map(({ path, element }) => (
                  <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
                ))}
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
