import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Compass, MapIcon, Menu } from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";
import { getMarkerColor } from "@/lib/mapUtils";
import { RaidData } from "@/types";

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

export default function BasicMap({ 
  raids = [], 
  isLoading = false,
  onRaidClick,
  onToggleSidebar,
  lastUpdated,
  className = ""
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Fetch Google Maps API key
  useEffect(() => {
    let isMounted = true;
    
    async function loadMapScript() {
      try {
        // Get API key from server
        const response = await fetch('/api/maps/key');
        if (!response.ok) throw new Error('Failed to fetch Maps API key');
        const { apiKey } = await response.json();
        
        if (!isMounted) return;
        
        // Check if Google Maps is already loaded
        if (window.google?.maps) {
          setIsMapLoaded(true);
          return;
        }
        
        // Set up callback to initialize map
        window.initMap = () => {
          if (isMounted && mapRef.current) {
            const map = new window.google.maps.Map(mapRef.current, {
              center: { lat: 39.8283, lng: -98.5795 }, // Center of US
              zoom: 4,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              zoomControl: false,
            });
            
            setMapInstance(map);
            setIsMapLoaded(true);
          }
        };
        
        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-script';
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    }
    
    loadMapScript();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Add map markers when raids change or map loads
  useEffect(() => {
    if (!isMapLoaded || !mapInstance || !raids.length) return;
    
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    // Create bounds object to fit map to markers
    const bounds = new window.google.maps.LatLngBounds();
    const newMarkers = [];
    
    // Add markers for each raid
    for (const raid of raids) {
      const lat = parseFloat(raid.latitude);
      const lng = parseFloat(raid.longitude);
      
      if (isNaN(lat) || isNaN(lng)) continue;
      
      const position = { lat, lng };
      bounds.extend(position);
      
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstance,
        title: raid.title,
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: getMarkerColor(raid.raidType),
          fillOpacity: 0.9,
          strokeWeight: 1.5,
          strokeColor: '#ffffff',
          scale: 10
        }
      });
      
      // Info window for this marker
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="max-width: 200px; padding: 8px;">
            <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">${raid.title}</h3>
            <p style="margin: 0 0 5px; font-size: 13px;">
              <strong>Location:</strong> ${raid.location}
            </p>
            <p style="margin: 0 0 5px; font-size: 13px;">
              <strong>Type:</strong> ${raid.raidType}
            </p>
            <p style="margin: 0; font-size: 13px;">
              <strong>Date:</strong> ${new Date(raid.raidDate).toLocaleDateString()}
            </p>
          </div>
        `
      });
      
      // Click handler
      marker.addListener('click', () => {
        // Close any open info windows
        newMarkers.forEach(m => m.infoWindow.close());
        
        // Open this info window and trigger raid click
        infoWindow.open(mapInstance, marker);
        onRaidClick(raid);
      });
      
      // Store infoWindow with marker for later access
      marker.infoWindow = infoWindow;
      newMarkers.push(marker);
    }
    
    // Fit map to markers if we have any
    if (newMarkers.length > 0) {
      mapInstance.fitBounds(bounds);
      
      // Add slight zoom out to show context
      const listener = mapInstance.addListener('idle', () => {
        if (mapInstance.getZoom() > 12) {
          mapInstance.setZoom(12);
        }
        window.google.maps.event.removeListener(listener);
      });
    }
    
    setMarkers(newMarkers);
  }, [isMapLoaded, mapInstance, raids, onRaidClick]);
  
  // Map control handlers
  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() + 1);
    }
  };
  
  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() - 1);
    }
  };
  
  const handleRecenter = () => {
    if (mapInstance && markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(marker => bounds.extend(marker.getPosition()));
      mapInstance.fitBounds(bounds);
    }
  };
  
  return (
    <section className={`${className} relative w-full h-full`}>
      {/* Map container */}
      <div 
        ref={mapRef}
        className="map-container bg-neutral-100 w-full h-full" 
        style={{ minHeight: "500px" }}
      >
        {/* Loading indicator */}
        {(!isMapLoaded || isLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
            <div className="text-neutral-500 text-center">
              <MapIcon className="h-12 w-12 mx-auto mb-4" />
              <p>{!isMapLoaded ? "Loading map..." : "Loading raid data..."}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile sidebar toggle button */}
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
      
      {/* Map zoom controls */}
      {isMapLoaded && (
        <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleZoomIn}
            className="bg-white p-2 rounded-full shadow-md" 
            aria-label="Zoom in"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleZoomOut}
            className="bg-white p-2 rounded-full shadow-md" 
            aria-label="Zoom out"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleRecenter}
            className="bg-white p-2 rounded-full shadow-md" 
            aria-label="Recenter map"
          >
            <Compass className="h-5 w-5" />
          </Button>
        </div>
      )}
      
      {/* Data source info footer */}
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