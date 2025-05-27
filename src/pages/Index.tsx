
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, User } from "lucide-react";
import CustomerInterface from "@/components/CustomerInterface";
import DriverInterface from "@/components/DriverInterface";
import UserProfile from "@/components/UserProfile";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [userType, setUserType] = useState<'customer' | 'driver' | null>(null);

  if (userType === 'customer') {
    return <CustomerInterface onBack={() => setUserType(null)} />;
  }

  if (userType === 'driver') {
    return <DriverInterface onBack={() => setUserType(null)} />;
  }

  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {currentUser && (
        <div className="absolute top-4 right-4">
          <UserProfile />
        </div>
      )}
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TripTracker</h1>
          <p className="text-gray-600">Your ride-sharing companion</p>
          {currentUser && (
            <p className="text-sm text-gray-500 mt-2">Welcome, {currentUser.displayName}</p>
          )}
        </div>

        <div className="space-y-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setUserType('customer')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>I'm a Customer</CardTitle>
              <CardDescription>Request a ride and track your trip</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setUserType('driver')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <Car className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>I'm a Driver</CardTitle>
              <CardDescription>Accept rides and track mileage</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
