import { Button } from "@/components/ui/button";
import {
  Home,
  LineChart,
  User,
  Leaf,
  CloudSun,
  Bug,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FooterProps {
  currentPage?: string;
}

const Footer = ({ currentPage }: FooterProps) => {
  const navigate = useNavigate();

  const pages = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/crop-recommendation", label: "Crops", icon: Leaf },
    { path: "/leaf-disease-detection", label: "Disease", icon: Bug },
    { path: "/weather", label: "Weather", icon: CloudSun },
    { path: "/price-forecasting", label: "Prices", icon: LineChart },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <div className="flex justify-around py-3 overflow-x-auto">
        {pages.map((page) => {
          const isActive = currentPage === page.path;
          const IconComponent = page.icon;

          if (isActive) return null;

          return (
            <Button
              key={page.path}
              variant="ghost"
              className="flex flex-col min-w-max m-2 hover:bg-emerald-200 rounded-lg"
              onClick={() => navigate(page.path)}
            >
              <IconComponent className="w-6 h-6 text-emerald-600" />
              <span className="text-xs font-medium text-gray-700">
                {page.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default Footer;
