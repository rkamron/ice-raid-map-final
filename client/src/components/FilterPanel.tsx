import { useState, useEffect } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RaidFilters, RaidData, US_STATES, RaidType } from "@/types";
import { getDateDaysAgo, dateRangeOptions } from "@/lib/dateUtils";
import RecentActivityList from "./RecentActivityList";

interface FilterPanelProps {
  filters: RaidFilters;
  onFilterChange: (filters: RaidFilters) => void;
  onRaidSelect: (raid: RaidData) => void;
  raids: RaidData[];
  isVisible: boolean;
  className?: string;
}

export default function FilterPanel({ 
  filters, 
  onFilterChange, 
  onRaidSelect,
  raids,
  isVisible,
  className = ""
}: FilterPanelProps) {
  // Local state for filter form
  const [dateRange, setDateRange] = useState("past7days");
  const [startDate, setStartDate] = useState(filters.startDate || "");
  const [endDate, setEndDate] = useState(filters.endDate || "");
  const [state, setState] = useState(filters.state || "ALL");
  const [raidTypes, setRaidTypes] = useState<string[]>(filters.raidTypes || []);
  const [showCustomDates, setShowCustomDates] = useState(false);
  
  // Apply date range changes
  useEffect(() => {
    if (dateRange !== "custom") {
      const option = dateRangeOptions.find(o => o.value === dateRange);
      if (option && option.days) {
        setStartDate(getDateDaysAgo(option.days));
        setEndDate(""); // No end date means up to now
        setShowCustomDates(false);
      }
    } else {
      setShowCustomDates(true);
    }
  }, [dateRange]);
  
  // Handle raid type checkbox change
  const handleRaidTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setRaidTypes([...raidTypes, type]);
    } else {
      setRaidTypes(raidTypes.filter(t => t !== type));
    }
  };
  
  // Apply filters
  const applyFilters = () => {
    const newFilters: RaidFilters = {
      startDate,
      endDate: endDate || undefined,
      state: state === "ALL" ? undefined : state,
      raidTypes: raidTypes.length > 0 ? raidTypes : undefined
    };
    
    onFilterChange(newFilters);
  };
  
  // Get recent raids (up to 5)
  const recentRaids = raids
    .sort((a, b) => new Date(b.raidDate).getTime() - new Date(a.raidDate).getTime())
    .slice(0, 5);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <aside className={className}>
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-4">Filters</h2>
          
          <div className="mb-4">
            <Label className="block text-neutral-500 text-sm mb-2" htmlFor="dateRange">
              Date Range
            </Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="dateRange" className="w-full">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {showCustomDates && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="block text-neutral-500 text-sm mb-2" htmlFor="startDate">
                    Start Date
                  </Label>
                  <Input 
                    type="date" 
                    id="startDate" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full" 
                  />
                </div>
                <div>
                  <Label className="block text-neutral-500 text-sm mb-2" htmlFor="endDate">
                    End Date
                  </Label>
                  <Input 
                    type="date" 
                    id="endDate" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full" 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <Label className="block text-neutral-500 text-sm mb-2" htmlFor="stateFilter">
              State
            </Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger id="stateFilter" className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(state => (
                  <SelectItem key={state.abbreviation} value={state.abbreviation}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="mb-4">
            <Label className="block text-neutral-500 text-sm mb-2">
              Raid Type
            </Label>
            <div className="space-y-2">
              <div className="flex items-center">
                <Checkbox 
                  id="workplaceRaid" 
                  checked={raidTypes.includes(RaidType.WORKPLACE)}
                  onCheckedChange={(checked) => handleRaidTypeChange(RaidType.WORKPLACE, checked as boolean)}
                  className="h-4 w-4 text-primary border-neutral-300 rounded" 
                />
                <label htmlFor="workplaceRaid" className="ml-2 text-sm text-neutral-700">
                  Workplace
                </label>
              </div>
              <div className="flex items-center">
                <Checkbox 
                  id="homeRaid" 
                  checked={raidTypes.includes(RaidType.RESIDENTIAL)}
                  onCheckedChange={(checked) => handleRaidTypeChange(RaidType.RESIDENTIAL, checked as boolean)}
                  className="h-4 w-4 text-primary border-neutral-300 rounded" 
                />
                <label htmlFor="homeRaid" className="ml-2 text-sm text-neutral-700">
                  Residential
                </label>
              </div>
              <div className="flex items-center">
                <Checkbox 
                  id="checkpointRaid" 
                  checked={raidTypes.includes(RaidType.CHECKPOINT)}
                  onCheckedChange={(checked) => handleRaidTypeChange(RaidType.CHECKPOINT, checked as boolean)}
                  className="h-4 w-4 text-primary border-neutral-300 rounded" 
                />
                <label htmlFor="checkpointRaid" className="ml-2 text-sm text-neutral-700">
                  Checkpoint
                </label>
              </div>
              <div className="flex items-center">
                <Checkbox 
                  id="otherRaid" 
                  checked={raidTypes.includes(RaidType.OTHER)}
                  onCheckedChange={(checked) => handleRaidTypeChange(RaidType.OTHER, checked as boolean)}
                  className="h-4 w-4 text-primary border-neutral-300 rounded" 
                />
                <label htmlFor="otherRaid" className="ml-2 text-sm text-neutral-700">
                  Other
                </label>
              </div>
            </div>
          </div>
          
          <Button
            onClick={applyFilters}
            className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-opacity-90 transition"
          >
            Apply Filters
          </Button>
        </div>
        
        <RecentActivityList raids={recentRaids} onRaidClick={onRaidSelect} />
      </div>
    </aside>
  );
}
