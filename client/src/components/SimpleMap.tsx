import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Compass, MapIcon, Menu } from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";
import { getMarkerColor } from "@/lib/mapUtils";
import { RaidData } from "@/types";

// Add Google Maps to window object
declare global {
  interface Window {
    initMap: () => void;
    google: any;
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

export default function SimpleMap({ 
  raids = [],
  isLoading = false,
  onRaidClick,
  onToggleSidebar,
  lastUpdated,
  className = ""
}: MapProps) {
  // Map container & refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [googleMap, setGoogleMap] = useState<any>(null);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  // Calculate map bounds
  const calculateMapBounds = useCallback(() => {
    if (!raids || raids.length === 0) return null;
    
    // Find min/max coordinates
    const validRaids = raids.filter(r => {
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      return !isNaN(lat) && !isNaN(lng);
    });
    
    if (validRaids.length === 0) return null;
    
    let north = -90, south = 90, east = -180, west = 180;
    
    validRaids.forEach(raid => {
      const lat = parseFloat(raid.latitude);
      const lng = parseFloat(raid.longitude);
      
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    });
    
    // Add padding
    const latPadding = (north - south) * 0.1;
    const lngPadding = (east - west) * 0.1;
    
    return {
      north: north + latPadding,
      south: south - latPadding,
      east: east + lngPadding,
      west: west - lngPadding
    };
  }, [raids]);

  // Fetch API key from server
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/maps/key');
        if (!response.ok) {
          throw new Error('Failed to fetch Maps API key');
        }
        
        const data = await response.json();
        setApiKey(data.apiKey);
      } catch (error) {
        console.error('Error fetching Maps API key:', error);
      }
    };
    
    fetchApiKey();
  }, []);
  
  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return; // Wait for API key
    
    // Initialize map function
    const initializeMap = () => {
      if (!mapContainerRef.current) return;
      
      try {
        // Create map
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: 39.8283, lng: -98.5795 }, // Center of US
          zoom: 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
        });
        
        // Create info window
        const info = new window.google.maps.InfoWindow();
        
        setGoogleMap(map);
        setInfoWindow(info);
        setIsMapLoaded(true);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    // Handle script loading
    if (window.google?.maps) {
      // Google Maps already loaded, initialize map directly
      initializeMap();
    } else {
      // Need to load Google Maps
      window.initMap = initializeMap;
      
      const existingScript = document.getElementById('google-maps-script');
      if (!existingScript) {
        // Add script only if it doesn't already exist
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-script';
        document.head.appendChild(script);
      }
    }
    
    // Cleanup
    return () => {
      // Cleanup only if we added the initMap function
      if (window.initMap === initializeMap) {
        window.initMap = () => {}; // Reset to empty function
      }
    };
  }, [apiKey]);
  
  // Update markers when raids change
  useEffect(() => {
    if (!isMapLoaded || !googleMap || !raids || raids.length === 0) return;
    
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    // Create new markers
    const newMarkers: any[] = [];
    
    // Get map bounds
    const bounds = calculateMapBounds();
    if (!bounds) return;
    
    const mapBounds = new window.google.maps.LatLngBounds(
      { lat: bounds.south, lng: bounds.west },
      { lat: bounds.north, lng: bounds.east }
    );
    
    // Add markers
    raids.forEach(raid => {
      const lat = parseFloat(raid.latitude);
      const lng = parseFloat(raid.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;
      
      // Create marker
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMap,
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
      
      // Info window content
      const contentString = `
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
      `;
      
      // Click event
      marker.addListener("click", () => {
        if (infoWindow) {
          infoWindow.setContent(contentString);
          infoWindow.open(googleMap, marker);
        }
        onRaidClick(raid);
      });
      
      newMarkers.push(marker);
    });
    
    // Update markers state
    setMarkers(newMarkers);
    
    // Fit map to bounds
    googleMap.fitBounds(mapBounds);
  }, [raids, isMapLoaded, googleMap, infoWindow, onRaidClick, calculateMapBounds]);
  
  // Map control handlers
  const handleZoomIn = () => {
    if (googleMap) {
      googleMap.setZoom(googleMap.getZoom() + 1);
    }
  };
  
  const handleZoomOut = () => {
    if (googleMap) {
      googleMap.setZoom(googleMap.getZoom() - 1);
    }
  };
  
  const handleRecenter = () => {
    if (googleMap && raids.length > 0) {
      const bounds = calculateMapBounds();
      if (bounds) {
        const mapBounds = new window.google.maps.LatLngBounds(
          { lat: bounds.south, lng: bounds.west },
          { lat: bounds.north, lng: bounds.east }
        );
        googleMap.fitBounds(mapBounds);
      }
    }
  };
  
  return (
    <section className={`${className} relative w-full h-full`}>
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="map-container bg-neutral-200 w-full h-full"
        aria-label="Map showing ICE raid locations"
        style={{ minHeight: "500px" }}
      >
        {/* Show loader until map or raid data loads */}
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