import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { saveUserPhoneNumber } from "@/services/userProfileService";
import { Phone, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PhoneNumberInputProps {
  onComplete?: () => void;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({ onComplete }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Validate phone number format on input change
  useEffect(() => {
    // Check if input matches the pattern for a valid phone number
    // This is a simple validation that accepts formats like:
    // +1234567890, 1234567890, 123-456-7890, (123) 456-7890
    const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    setIsValid(phoneRegex.test(phoneNumber));
  }, [phoneNumber]);

  // Format phone number as user types
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow digits, spaces, parentheses, plus, and hyphens
    const filteredValue = value.replace(/[^\d\s()+\-]/g, '');
    setPhoneNumber(filteredValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format the phone number to a consistent format before saving
      // Remove all non-digit characters
      const formattedPhoneNumber = phoneNumber.replace(/\D/g, '');
      
      const result = await saveUserPhoneNumber(formattedPhoneNumber);
      
      if (result.success) {
        toast({
          title: "Phone Number Saved",
          description: "Your phone number has been successfully saved",
        });
        
        if (onComplete) {
          onComplete();
        } else {
          // If no callback provided, redirect to home
          navigate("/");
        }
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
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Phone className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-xl text-center">Add Your Phone Number</CardTitle>
        <CardDescription className="text-center">
          Your phone number is required for communication between drivers and customers
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <div className="relative">
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className={`pr-10 ${isValid ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                {isValid && (
                  <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              <p className="text-xs text-gray-500">
                We'll use this number to enable calling between you and other app users
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Phone Number"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PhoneNumberInput;
