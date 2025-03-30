import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { RaidData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu, MapIcon } from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";

// Add Maps type to window object
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface MapProps {
  raids: RaidData[];
  isLoading: boolean;
  onRaidClick: (raid: RaidData) => void;
  onToggleSidebar: () => void;
  lastUpdated?: string;
  className?: string;
}

export default function EssentialMap({ 
  raids = [], 
  isLoading, 
  onRaidClick,
  onToggleSidebar,
  lastUpdated,
  className = '',
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Fetch API key and load Google Maps
  useEffect(() => {
    // Skip if map is already loaded
    if (map) return;
    
    async function initializeMap() {
      try {
        // Get API key
        const response = await fetch('/api/maps/key');
        if (!response.ok) throw new Error('Failed to fetch API key');
        const data = await response.json();
        const apiKey = data.apiKey;
        
        // Define init function for callback
        window.initMap = () => {
          if (!mapRef.current) return;
          
          const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: { lat: 39.8283, lng: -98.5795 }, // Center of US
            zoom: 4,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
          
          setMap(mapInstance);
          setMapLoaded(true);
        };
        
        // Check if script already exists
        if (!document.getElementById('google-maps-script')) {
          const script = document.createElement('script');
          script.id = 'google-maps-script';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
          script.defer = true;
          script.async = true;
          document.head.appendChild(script);
        } else if (window.google?.maps) {
          // Maps API already loaded, just initialize
          window.initMap();
        }
      } catch (error) {
        console.error('Error loading map:', error);
      }
    }
    
    initializeMap();
  }, [map]);
  
  // Add markers when map is loaded and raids are available
  useEffect(() => {
    if (!map || !mapLoaded || raids.length === 0) return;
    
    // Set up info window
    const infoWindow = new window.google.maps.InfoWindow();
    
    // Create bounds object to fit all markers
    const bounds = new window.google.maps.LatLngBounds();
    
    raids.forEach(raid => {
      const lat = parseFloat(raid.latitude);
      const lng = parseFloat(raid.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;
      
      const position = { lat, lng };
      bounds.extend(position);
      
      // Create marker
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: raid.title,
        icon: {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/52/Shield_Icon_Transparent.png",
          scaledSize: new window.google.maps.Size(32, 32), // Adjust the size as needed
        },
      });
      
      // Create info content
      const content = `
        <div style="max-width: 200px; padding: 10px;">
          <h3 style="font-weight: bold; margin-bottom: 5px;">${raid.title}</h3>
          <p>${raid.location}</p>
          <p>${new Date(raid.raidDate).toLocaleDateString()}</p>
        </div>
      `;
      
      // Add click listener
      marker.addListener('click', () => {
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
        onRaidClick(raid);
      });
    });
    
    // Fit map to markers
    if (raids.length > 0) {
      map.fitBounds(bounds);
    }
  }, [map, mapLoaded, raids, onRaidClick]);
  
  return (
    <section className={`${className} relative w-full h-full`}>
      {/* Map container */}
      <div 
        ref={mapRef} 
        className="w-full h-full min-h-[500px] bg-neutral-100"
      />
      
      {/* Loading overlay */}
      {(isLoading || !mapLoaded) && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
          <div className="text-center">
            <MapIcon className="h-10 w-10 mx-auto mb-2 text-neutral-500" />
            <p className="text-neutral-600">
              {!mapLoaded ? "Loading map..." : "Loading raid data..."}
            </p>
          </div>
        </div>
      )}
      
      {/* Mobile toggle button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="secondary"
          size="icon"
          onClick={onToggleSidebar}
          className="md:hidden bg-white shadow-md rounded-full"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Info footer */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded shadow-md p-3 text-xs max-w-xs">
        <p><strong>Data sources:</strong> Public news reports and verified social media</p>
        {isLoading ? (
          <Skeleton className="h-4 w-40 mt-1" />
        ) : (
          <p className="mt-1">
            Last updated: {lastUpdated ? formatDateTime(lastUpdated) : "N/A"}
          </p>
        )}
      </div>
    </section>
  );
}  