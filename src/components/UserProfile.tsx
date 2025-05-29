import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Settings, Edit, Camera } from "lucide-react";
import ProfileEditor from "./ProfileEditor";

const UserProfile = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  const handleSignOut = async () => {
    if (!currentUser) return;
    
    setIsSigningOut(true);
    try {
      const result = await signOut();
      if (result.success) {
        toast({
          title: "Signed Out",
          description: "You have been successfully signed out",
        });
        navigate("/login");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to sign out",
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
      setIsSigningOut(false);
    }
  };

  const handleEditProfile = () => {
    setShowProfileEditor(true);
  };

  if (!currentUser) return null;

  const userInitials = currentUser.displayName
    ? currentUser.displayName.split(" ").map(n => n[0]).join("").toUpperCase()
    : "U";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || "User"} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleEditProfile}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? (
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-200 rounded-full border-t-gray-600"></div>
                <span>Signing Out...</span>
              </div>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ProfileEditor onClose={() => setShowProfileEditor(false)} />
        </div>
      )}
    </>
  );
};

export default UserProfile;
