import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import PhoneNumberInput from "./PhoneNumberInput";
import { hasPhoneNumber } from "@/services/userProfileService";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface PhoneNumberRegistrationProps {
  children: React.ReactNode;
}

/**
 * This component checks if the user has registered a phone number
 * If not, it shows the phone number input form before allowing access to the main app
 */
const PhoneNumberRegistration: React.FC<PhoneNumberRegistrationProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasPhone, setHasPhone] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    // Only check phone number when auth has finished loading and we have a user
    if (authLoading) {
      return;
    }
    
    const checkPhoneNumber = async () => {
      if (currentUser) {
        try {
          console.log("Checking phone number for user:", currentUser.uid);
          const phoneExists = await hasPhoneNumber();
          console.log("Phone exists:", phoneExists);
          setHasPhone(phoneExists);
        } catch (error) {
          console.error("Error checking phone number:", error);
        } finally {
          setLoading(false);
        }
      } else {
        // No user, so don't show phone registration
        setLoading(false);
      }
    };

    checkPhoneNumber();
  }, [currentUser, authLoading]);

  // Show loading state while checking phone number
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Checking profile information...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated but doesn't have a phone number, show the phone number input
  if (currentUser && !hasPhone) {
    console.log("Showing phone number registration form");
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <PhoneNumberInput />
        </div>
      </div>
    );
  }

  // If user has a phone number or is not authenticated, proceed normally
  return <>{children}</>;
};

export default PhoneNumberRegistration;
