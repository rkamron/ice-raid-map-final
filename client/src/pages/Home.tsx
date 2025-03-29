import { useState } from "react";
import { useRaidData, useLastUpdated } from "@/hooks/useRaidData";
import { RaidFilters, RaidData } from "@/types";
import Header from "@/components/Header";
import FilterPanel from "@/components/FilterPanel";
import Map from "@/components/Map";
import RaidDetailModal from "@/components/RaidDetailModal";
import InfoModal from "@/components/InfoModal";
import { getDateDaysAgo } from "@/lib/dateUtils";

export default function Home() {
  // State for selected raid and modals
  const [selectedRaid, setSelectedRaid] = useState<RaidData | null>(null);
  const [showRaidDetail, setShowRaidDetail] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  
  // Default filters - past 7 days
  const [filters, setFilters] = useState<RaidFilters>({
    startDate: getDateDaysAgo(7),
    raidTypes: []
  });
  
  // Fetch raids with current filters
  const { data: raids, isLoading, error } = useRaidData(filters);
  const { data: lastUpdatedData } = useLastUpdated();
  
  // Handle raid marker click
  const handleRaidClick = (raid: RaidData) => {
    setSelectedRaid(raid);
    setShowRaidDetail(true);
  };
  
  // Handle raid click from recent activity list
  const handleRecentActivityClick = (raid: RaidData) => {
    setSelectedRaid(raid);
    setShowRaidDetail(true);
  };
  
  // Toggle filter panel on mobile
  const toggleFilterPanel = () => {
    setShowFilterPanel(!showFilterPanel);
  };
  
  // Handle filter changes
  const handleFilterChange = (newFilters: RaidFilters) => {
    setFilters(newFilters);
  };
  
  return (
    <div className="flex flex-col h-screen bg-neutral-100">
      <Header 
        onInfoClick={() => setShowInfoModal(true)}
        onSettingsClick={() => {}}
      />
      
      <main className="flex flex-col md:flex-row flex-grow overflow-hidden">
        {/* Filter Panel (hidden on mobile when map is active) */}
        <FilterPanel 
          filters={filters}
          onFilterChange={handleFilterChange}
          onRaidSelect={handleRecentActivityClick}
          raids={raids || []}
          isVisible={showFilterPanel}
          className="md:w-80 bg-white shadow-md md:h-[calc(100vh-64px)] overflow-y-auto z-10"
        />
        
        {/* Map View */}
        <Map
          raids={raids || []}
          isLoading={isLoading}
          onRaidClick={handleRaidClick}
          onToggleSidebar={toggleFilterPanel}
          lastUpdated={lastUpdatedData?.lastUpdated}
          className="flex-grow relative"
        />
      </main>
      
      {/* Modals */}
      <RaidDetailModal
        raid={selectedRaid}
        isOpen={showRaidDetail}
        onClose={() => setShowRaidDetail(false)}
      />
      
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
