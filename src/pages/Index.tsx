
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Abstract background elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      {currentUser && (
        <div className="absolute top-4 right-4 z-20">
          <UserProfile />
        </div>
      )}
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-block mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur-lg opacity-50 transform scale-110"></div>
            <div className="relative bg-white rounded-full p-5 shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto text-blue-600"><path d="M14 16c0-2.3 1.5-4 3.5-4h.5"></path><path d="M19 12c0-3.5-4-6-8-6-3.5 0-7 2-8 6"></path><path d="M10 16.5c0-1 .5-2 2-2s2 1 2 2"></path><circle cx="12" cy="12" r="10"></circle></svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-blue-900 mb-3">TripTracker</h1>
          <p className="text-blue-700 text-lg font-medium">Your ride-sharing companion</p>
          {currentUser && (
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md mt-4">
              <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <p className="text-blue-800 font-medium">Welcome, {currentUser.displayName}</p>
            </div>
          )}
        </div>

        <div className="space-y-6 mt-8">
          <Card 
            className="cursor-pointer border-0 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl bg-gradient-to-br from-white to-blue-50" 
            onClick={() => setUserType('customer')}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-bl-full"></div>
            <CardHeader className="text-center relative z-10">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg transform -rotate-6">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-blue-800">I'm a Customer</CardTitle>
              <CardDescription className="text-blue-600 font-medium mt-1">
                Request a ride and track your journey
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="flex justify-center">
                <Button 
                  variant="ghost" 
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 flex items-center gap-2 mt-2 rounded-full px-4"
                >
                  Select
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer border-0 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl bg-gradient-to-br from-white to-indigo-50" 
            onClick={() => setUserType('driver')}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 rounded-bl-full"></div>
            <CardHeader className="text-center relative z-10">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg transform rotate-6">
                <Car className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-indigo-800">I'm a Driver</CardTitle>
              <CardDescription className="text-indigo-600 font-medium mt-1">
                Accept rides and track your earnings
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="flex justify-center">
                <Button 
                  variant="ghost" 
                  className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 flex items-center gap-2 mt-2 rounded-full px-4"
                >
                  Select
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
