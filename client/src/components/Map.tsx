import { useState, useEffect, useRef, useCallback } from "react";
import { RaidData } from "@/types";
import { getMarkerColor } from "@/lib/mapUtils";
import { formatDateTime } from "@/lib/dateUtils";
import { Menu, MapIcon, ChevronUp, ChevronDown, Compass } from "lucide-react";
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

// Declare global types for Google Maps
declare global {
  interface Window {
    initMap: () => void;
    google: any;
  }
}

export default function Map({ 
  raids, 
  isLoading, 
  onRaidClick, 
  onToggleSidebar,
  lastUpdated,
  className = "h-screen" 
}: MapProps) {
  // Refs for map elements
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  
  // State for map loading
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  // Calculate map bounds to show all markers
  const calculateMapBounds = useCallback(() => {
    if (!raids || raids.length === 0) return null;
    
    let north = -90, south = 90, east = -180, west = 180;
    
    // Find the min/max coordinates of all raids
    raids.forEach(raid => {
      const lat = parseFloat(raid.latitude);
      const lng = parseFloat(raid.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        north = Math.max(north, lat);
        south = Math.min(south, lat);
        east = Math.max(east, lng);
        west = Math.min(west, lng);
      }
    });
    
    // Add some padding
    const latPadding = (north - south) * 0.1;
    const lngPadding = (east - west) * 0.1;
    
    return {
      north: north + latPadding,
      south: south - latPadding,
      east: east + lngPadding,
      west: west - lngPadding
    };
  }, [raids]);
  
  // Initialize Google Maps
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || googleMapRef.current) return;
    
    try {
      // Create the map
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
        zoom: 4,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        zoomControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
      
      // Create a shared info window
      const infoWindow = new window.google.maps.InfoWindow();
      
      // Store refs
      googleMapRef.current = map;
      infoWindowRef.current = infoWindow;
      
      setIsMapLoaded(true);
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }, []);
  
  // Load Google Maps API
  useEffect(() => {
    // Skip if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }
    
    // Create a function to load the Google Maps script
    const loadGoogleMapsScript = async () => {
      try {
        // First check if script already exists
        let script = document.getElementById('google-maps-script');
        if (script) {
          return; // Script is already loading
        }
        
        // Fetch the API key from our backend
        const response = await fetch('/api/maps/key');
        if (!response.ok) {
          throw new Error('Failed to fetch Maps API key');
        }
        
        const data = await response.json();
        
        // Set up the initialization callback
        window.initMap = initializeMap;
        
        // Create and add the script with the API key
        script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-script';
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };
    
    loadGoogleMapsScript();
    
    // Cleanup on unmount
    return () => {
      // Reset the initialization function
      if (window.initMap) {
        window.initMap = () => {};
      }
      
      // We won't remove the script as it can cause issues
      // Just let it be part of the page if it's already loaded
    };
  }, [initializeMap]);
  
  // Update markers when raids or map change
  useEffect(() => {
    if (!isMapLoaded || !googleMapRef.current || !raids) return;
    
    // Clear any existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Add markers for each raid
    const map = googleMapRef.current;
    const infoWindow = infoWindowRef.current;
    const bounds = calculateMapBounds();
    
    if (bounds && raids.length > 0) {
      const mapBounds = new window.google.maps.LatLngBounds(
        { lat: bounds.south, lng: bounds.west },
        { lat: bounds.north, lng: bounds.east }
      );
      
      // Add markers and info windows
      raids.forEach(raid => {
        const lat = parseFloat(raid.latitude);
        const lng = parseFloat(raid.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        // Create marker
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map,
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
        
        // Create info window content
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
        
        // Add click listener to show info window and trigger detail modal
        marker.addListener("click", () => {
          infoWindow.setContent(contentString);
          infoWindow.open(map, marker);
          onRaidClick(raid);
        });
        
        markersRef.current.push(marker);
      });
      
      // Fit map to bounds
      map.fitBounds(mapBounds);
    }
  }, [raids, isMapLoaded, onRaidClick, calculateMapBounds]);
  
  // Map control handlers
  const handleZoomIn = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() + 1);
    }
  };
  
  const handleZoomOut = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() - 1);
    }
  };
  
  const handleRecenter = () => {
    if (googleMapRef.current && raids && raids.length > 0) {
      const bounds = calculateMapBounds();
      if (bounds) {
        googleMapRef.current.fitBounds(
          new window.google.maps.LatLngBounds(
            { lat: bounds.south, lng: bounds.west },
            { lat: bounds.north, lng: bounds.east }
          )
        );
      }
    }
  };
  
  return (
    <section className={`${className} relative w-full h-full`}>
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="map-container bg-neutral-200"
        aria-label="Map showing ICE raid locations"
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
