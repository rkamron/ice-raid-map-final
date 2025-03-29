import { useState } from "react";
import { RaidData } from "@/types";
import { getMarkerColor } from "@/lib/mapUtils";
import { formatDateTime } from "@/lib/dateUtils";
import { Menu, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MapProps {
  raids: RaidData[];
  isLoading: boolean;
  onRaidClick: (raid: RaidData) => void;
  onToggleSidebar: () => void;
  lastUpdated?: string;
  className?: string;
}

export default function Map({ 
  raids, 
  isLoading, 
  onRaidClick, 
  onToggleSidebar,
  lastUpdated,
  className = "h-screen" 
}: MapProps) {
  // State for selected raid
  const [, setSelectedRaid] = useState<RaidData | null>(null);
  
  // Generate a simple static map URL with the center point of the US
  const mapUrl = "https://maps.google.com/maps?q=United+States&t=&z=4&ie=UTF8&iwloc=&output=embed";
  
  // Handle raid selection
  const handleRaidClick = (raid: RaidData) => {
    setSelectedRaid(raid);
    onRaidClick(raid);
  };
  
  return (
    <section className={`${className} relative w-full h-full`}>
      {/* Google Maps iframe - simple solution that avoids script loading issues */}
      <div className="w-full h-full bg-neutral-200 relative">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          title="Map showing ICE raid locations"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
        
        {/* Overlay markers on top of the map */}
        <div className="absolute inset-0 pointer-events-none">
          {raids.map((raid) => {
            // Calculate position based on lat/long
            // This is a simplified approach for demonstration
            const lat = parseFloat(raid.latitude);
            const lng = parseFloat(raid.longitude);
            
            if (isNaN(lat) || isNaN(lng)) return null;
            
            // Convert to simple percent-based positioning
            // US mainland is roughly between 24-49°N latitude and 66-125°W longitude
            const latRange = 49 - 24; // US mainland lat range
            const lngRange = 125 - 66; // US mainland lng range
            
            const top = ((49 - lat) / latRange) * 100;
            const left = ((lng - 66) / lngRange) * 100;
            
            // Only show markers that would reasonably be within the map viewport
            if (top < 0 || top > 100 || left < 0 || left > 100) return null;
            
            return (
              <div
                key={raid.id}
                className="absolute w-4 h-4 rounded-full cursor-pointer pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-md"
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  backgroundColor: getMarkerColor(raid.raidType),
                  zIndex: 1000,
                }}
                onClick={() => handleRaidClick(raid)}
                title={raid.title}
              />
            );
          })}
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="text-neutral-500">
            <MapIcon className="h-12 w-12 mx-auto mb-4" />
            <p>Loading raid data...</p>
          </div>
        </div>
      )}
      
      {/* Mobile sidebar toggle */}
      <div className="absolute top-4 right-4 z-10">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={onToggleSidebar}
          className="md:hidden bg-white p-2 rounded-full shadow-md" 
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Data source info */}
      <div className="absolute bottom-6 left-4 z-10 bg-white rounded shadow-md p-3 text-xs text-neutral-600 max-w-xs">
        <p><strong>Data sources:</strong> Public news reports, community alerts, and verified social media accounts.</p>
        {isLoading ? (
          <Skeleton className="h-4 w-48 mt-1" />
        ) : (
          <p className="mt-1">
            Last updated: {lastUpdated ? formatDateTime(lastUpdated) : "N/A"}
          </p>
        )}
      </div>
    </section>
  );
}
