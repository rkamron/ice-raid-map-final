import { RaidData } from "@/types";

/**
 * Calculate map bounds to fit all markers
 */
export function calculateMapBounds(raids: RaidData[]) {
  if (!raids || raids.length === 0) {
    // Default to continental US
    return {
      north: 49.3457868, // northern border with Canada
      south: 24.396308, // southern tip of Florida
      east: -66.934570, // eastern coast
      west: -124.848974, // western coast
    };
  }
  
  // Calculate bounds based on marker positions
  const bounds = {
    north: -90, // Initialize with extreme values
    south: 90,
    east: -180,
    west: 180,
  };
  
  raids.forEach((raid) => {
    const lat = parseFloat(raid.latitude);
    const lng = parseFloat(raid.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      bounds.north = Math.max(bounds.north, lat);
      bounds.south = Math.min(bounds.south, lat);
      bounds.east = Math.max(bounds.east, lng);
      bounds.west = Math.min(bounds.west, lng);
    }
  });
  
  // Add padding
  const padding = 0.5; // degrees
  bounds.north += padding;
  bounds.south -= padding;
  bounds.east += padding;
  bounds.west -= padding;
  
  return bounds;
}

/**
 * Get marker icon based on raid type
 */
export function getMarkerIcon(raidType: string): string {
  switch (raidType) {
    case 'Workplace':
      return 'business';
    case 'Residential':
      return 'home';
    case 'Checkpoint':
      return 'directions_car';
    default:
      return 'place';
  }
}

/**
 * Get marker color based on raid type
 */
export function getMarkerColor(raidType: string): string {
  switch (raidType) {
    case 'Workplace':
      return '#D32F2F'; // red
    case 'Residential':
      return '#FFA000'; // amber
    case 'Checkpoint':
      return '#1976D2'; // blue
    default:
      return '#7B1FA2'; // purple
  }
}

/**
 * Group raids by geographic proximity for clustering
 */
export function groupRaidsByProximity(raids: RaidData[], radiusKm: number = 10): RaidData[][] {
  if (!raids || raids.length === 0) return [];
  
  const groups: RaidData[][] = [];
  const processed = new Set<number>();
  
  raids.forEach((raid) => {
    if (processed.has(raid.id)) return;
    
    const group: RaidData[] = [raid];
    processed.add(raid.id);
    
    const raidLat = parseFloat(raid.latitude);
    const raidLng = parseFloat(raid.longitude);
    
    raids.forEach((otherRaid) => {
      if (otherRaid.id === raid.id || processed.has(otherRaid.id)) return;
      
      const otherLat = parseFloat(otherRaid.latitude);
      const otherLng = parseFloat(otherRaid.longitude);
      
      const distance = calculateDistance(raidLat, raidLng, otherLat, otherLng);
      
      if (distance <= radiusKm) {
        group.push(otherRaid);
        processed.add(otherRaid.id);
      }
    });
    
    groups.push(group);
  });
  
  return groups;
}

/**
 * Calculate distance between two points in kilometers (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}
