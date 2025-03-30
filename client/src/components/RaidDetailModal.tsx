import { RaidData } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Share2, 
  AlertTriangle,
  HelpCircle,
  X
} from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";

interface RaidDetailModalProps {
  raid: RaidData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RaidDetailModal({ raid, isOpen, onClose }: RaidDetailModalProps) {
  if (!raid) return null;
   
  // Handle sharing
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `ICE Raid in ${raid.location}`,
        text: raid.description,
        url: window.location.href
      }).catch(err => console.error('Error sharing', err));
    } else {
      // Fallback for browsers that don't support navigator.share
      const shareText = `ICE Raid in ${raid.location}: ${raid.description}`;
      const tempTextarea = document.createElement('textarea');
      tempTextarea.value = shareText;
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextarea);
      alert('Information copied to clipboard!');
    }
  };
  
  // Handle report issue
  const handleReportIssue = () => {
    // Could open a form or send an email
    window.open(`mailto:support@example.com?subject=Report Issue with Raid #${raid.id}&body=I'd like to report an issue with the following raid: ${raid.location}`, '_blank');
  };
  
  // Handle find help
  const handleFindHelp = () => {
    // Could link to resources
    window.open('https://www.immigrantdefenseproject.org/ice-home-and-community-arrests/', '_blank');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex justify-between items-start mb-4">
          <DialogTitle className="text-xl font-medium">{raid.location}</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-neutral-500">Date &amp; Time</p>
            <p className="font-medium">{formatDateTime(raid.raidDate)}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Type</p>
            <p className="font-medium">{raid.raidType}</p>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-neutral-500">Description</p>
          <p>{raid.description}</p>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-neutral-500">Source</p>
          <a 
            href={raid.sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {raid.sourceName}
          </a>
        </div>
        
        {raid.detaineeCount && (
          <div className="mb-4">
            <p className="text-sm text-neutral-500">Estimated Detainees</p>
            <p>{raid.detaineeCount}</p>
          </div>
        )}
        
        <div className="mb-6">
          <p className="text-sm text-neutral-500">Additional Information</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>This information is based on public reports</li>
            <li>Data is collected from reliable sources, but details may change as more information becomes available</li>
            <li>If you have more accurate information, please use the "Report Issue" button below</li>
          </ul>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button 
            className="flex items-center bg-primary text-white py-2 px-4 rounded hover:bg-opacity-90 transition"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          <Button 
            variant="outline"
            className="flex items-center bg-neutral-200 text-neutral-700 py-2 px-4 rounded hover:bg-neutral-300 transition"
            onClick={handleReportIssue}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Report Issue
          </Button>
          <Button
            variant="outline"
            className="flex items-center bg-neutral-200 text-neutral-700 py-2 px-4 rounded hover:bg-neutral-300 transition"
            onClick={handleFindHelp}
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            Find Help
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
