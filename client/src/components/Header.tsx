import { Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onInfoClick: () => void;
  onSettingsClick: () => void;
}

export default function Header({ onInfoClick, onSettingsClick }: HeaderProps) {
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-medium">ICE Raid Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onInfoClick}
              className="p-2 rounded-full hover:bg-primary-700 transition-colors text-white"
              aria-label="Information"
            >
              <Info className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onSettingsClick}
              className="p-2 rounded-full hover:bg-primary-700 transition-colors text-white"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
