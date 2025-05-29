import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Phone, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserProfile, saveUserPhoneNumber } from "@/services/userProfileService";

interface PhoneNumberManagerProps {
  onClose: () => void;
}

const PhoneNumberManager: React.FC<PhoneNumberManagerProps> = ({ onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(true);
  const { toast } = useToast();

  // Load current phone number if it exists
  useEffect(() => {
    const loadPhoneNumber = async () => {
      try {
        console.log("Loading user profile for phone number");
        const profile = await getCurrentUserProfile();
        if (profile?.phoneNumber) {
          console.log("Loaded phone number:", profile.phoneNumber);
          setPhoneNumber(profile.phoneNumber);
        }
      } catch (error) {
        console.error("Error loading phone number:", error);
      }
    };

    loadPhoneNumber();
  }, []);

  // Validate phone number format
  useEffect(() => {
    // Check if input matches the pattern for a valid phone number
    const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    setIsValid(phoneNumber === "" || phoneRegex.test(phoneNumber));
  }, [phoneNumber]);

  // Format phone number as user types
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow digits, spaces, parentheses, plus, and hyphens
    const filteredValue = value.replace(/[^\d\s()+\-]/g, '');
    setPhoneNumber(filteredValue);
  };

  // Save phone number
  const handleSave = async () => {
    if (!isValid) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Format the phone number to a consistent format before saving
      const formattedPhoneNumber = phoneNumber.replace(/\D/g, '');
      
      const result = await saveUserPhoneNumber(formattedPhoneNumber);
      
      if (result.success) {
        toast({
          title: "Phone Number Saved",
          description: "Your phone number has been successfully updated",
        });
        onClose();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save phone number",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Manage Phone Number
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            Phone Number
          </Label>
          <Input
            id="phoneNumber"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            placeholder="(123) 456-7890"
            className={!isValid ? "border-red-500" : ""}
          />
          {!isValid && (
            <p className="text-xs text-red-500 mt-1">
              Please enter a valid phone number
            </p>
          )}
          <p className="text-xs text-gray-500">
            Your phone number is used for communication between drivers and customers
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Phone Number"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhoneNumberManager;
