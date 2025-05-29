import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserPhoneNumber } from '@/services/userProfileService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CallButtonProps {
  userId: string;
  name?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const CallButton: React.FC<CallButtonProps> = ({ 
  userId, 
  name, 
  className = "", 
  variant = "outline",
  size = "icon" 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCallClick = async () => {
    setIsLoading(true);
    
    try {
      // Get the phone number for the user
      const number = await getUserPhoneNumber(userId);
      
      if (!number) {
        toast({
          title: "No Phone Number",
          description: `${name || 'This user'} hasn't added their phone number yet`,
          variant: "destructive",
        });
        return;
      }
      
      setPhoneNumber(number);
      setShowDialog(true);
    } catch (error) {
      console.error('Error fetching phone number:', error);
      toast({
        title: "Error",
        description: "Couldn't retrieve phone number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initiateCall = () => {
    if (!phoneNumber) return;
    
    // Create phone call URL
    const callUrl = `tel:${phoneNumber}`;
    
    // Close dialog
    setShowDialog(false);
    
    // Open in a new window (which will trigger the phone's call app)
    window.open(callUrl, '_blank');
    
    toast({
      title: "Initiating Call",
      description: `Calling ${name || 'user'}...`,
    });
  };

  return (
    <>
      <Button
        onClick={handleCallClick}
        variant={variant}
        size={size}
        className={`${className}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <Phone className="h-4 w-4" />
        )}
        <span className="sr-only">Call {name || 'user'}</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call {name || 'User'}</DialogTitle>
            <DialogDescription>
              You're about to make a phone call to {name || 'this user'}. Your device's calling app will be opened.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={initiateCall} className="bg-green-600 hover:bg-green-700">
              Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CallButton;
