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
          style={{ 
            border: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1 // Lower z-index so markers appear above
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
        
        {/* Overlay markers on top of the map */}
        <div className="absolute inset-0 pointer-events-none z-10">
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
                className="absolute group cursor-pointer pointer-events-auto"
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                }}
                onClick={() => handleRaidClick(raid)}
                title={raid.title}
              >
                {/* Marker dot */}
                <div 
                  className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                  style={{ 
                    backgroundColor: getMarkerColor(raid.raidType),
                    zIndex: 15
                  }}
                />
                
                {/* Permanent label with basic info */}
                <div className="absolute left-full ml-1 bg-white shadow-md rounded px-1.5 py-0.5 text-xs -mt-1 whitespace-nowrap z-20 border border-gray-200">
                  {raid.raidType}
                </div>
                
                {/* Detailed label that appears on hover */}
                <div className="hidden group-hover:block absolute left-1/2 bottom-full mb-1 -translate-x-1/2 w-max max-w-xs bg-white shadow-lg rounded p-2 text-xs z-20">
                  <p className="font-bold">{raid.title}</p>
                  <p className="text-xs text-gray-600">{raid.location}</p>
                  <p className="text-xs mt-0.5">
                    <span 
                      className="inline-block h-2 w-2 rounded-full mr-1"
                      style={{ backgroundColor: getMarkerColor(raid.raidType) }}
                    ></span>
                    {raid.raidType}
                  </p>
                </div>
              </div>
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
      
      {/* Map legend */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded shadow-md p-3 text-xs text-neutral-600">
        <p className="font-bold mb-1">ICE Raid Types:</p>
        <div className="grid gap-1">
          <div className="flex items-center">
            <span 
              className="inline-block h-3 w-3 rounded-full mr-2 border border-white shadow-sm"
              style={{ backgroundColor: getMarkerColor("Workplace") }}
            ></span>
            <span>Workplace Raids</span>
          </div>
          <div className="flex items-center">
            <span 
              className="inline-block h-3 w-3 rounded-full mr-2 border border-white shadow-sm"
              style={{ backgroundColor: getMarkerColor("Residential") }}
            ></span>
            <span>Residential Raids</span>
          </div>
          <div className="flex items-center">
            <span 
              className="inline-block h-3 w-3 rounded-full mr-2 border border-white shadow-sm"
              style={{ backgroundColor: getMarkerColor("Checkpoint") }}
            ></span>
            <span>Checkpoint Operations</span>
          </div>
          <div className="flex items-center">
            <span 
              className="inline-block h-3 w-3 rounded-full mr-2 border border-white shadow-sm"
              style={{ backgroundColor: getMarkerColor("Other") }}
            ></span>
            <span>Other Enforcement</span>
          </div>
        </div>
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
