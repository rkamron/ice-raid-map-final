import { RaidData } from "@/types";
import { getRelativeTimeString } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

interface RecentActivityListProps {
  raids: RaidData[];
  onRaidClick: (raid: RaidData) => void;
}

export default function RecentActivityList({ raids, onRaidClick }: RecentActivityListProps) {
  // If no raids, show placeholder
  if (raids.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
        <p className="text-sm text-neutral-500">No recent raids found.</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
      
      {raids.map(raid => (
        <div 
          key={raid.id}
          className="p-3 border-l-4 border-secondary mb-3 bg-neutral-100 rounded-r cursor-pointer hover:bg-neutral-200 transition"
          onClick={() => onRaidClick(raid)}
        >
          <div className="flex justify-between items-start">
            <h3 className="font-medium">{raid.location}</h3>
            <span className="text-xs text-neutral-500">{getRelativeTimeString(raid.raidDate)}</span>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            {raid.description.length > 60 
              ? raid.description.substring(0, 60) + '...' 
              : raid.description}
          </p>
        </div>
      ))}
      
      {raids.length >= 5 && (
        <Button
          variant="link"
          className="text-primary text-sm font-medium flex items-center p-0"
        >
          View all incidents
          <ArrowUpRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
