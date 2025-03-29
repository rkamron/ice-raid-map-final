import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex justify-between items-start mb-4">
          <DialogTitle className="text-xl font-medium">About This Project</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
          <p>ICE Raid Tracker is a community-driven initiative to document and map immigration enforcement actions across the United States.</p>
          
          <div>
            <h3 className="font-medium mb-2">Data Collection</h3>
            <p>Our data is collected from verified public sources including:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Local and national news reports</li>
              <li>Community alerts from verified organizations</li>
              <li>Verified social media accounts of community organizations</li>
              <li>Legal aid organizations</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">How We Verify Information</h3>
            <p>Each report undergoes a verification process that includes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Cross-referencing multiple sources when available</li>
              <li>Confirming location details</li>
              <li>Verifying dates and times</li>
              <li>Distinguishing between planned and executed operations</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Privacy &amp; Security</h3>
            <p>We take privacy seriously:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>No personal information of affected individuals is published</li>
              <li>Exact residential addresses are never displayed</li>
              <li>The site does not collect user location data</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">How To Use This Tool</h3>
            <p>This tracker can be used to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Monitor enforcement patterns</li>
              <li>Support community preparedness</li>
              <li>Connect affected communities with resources</li>
              <li>Document enforcement actions for research and advocacy</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Contributing</h3>
            <p>To report a raid or contribute to this project, please use the "Report" feature or contact us directly.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
