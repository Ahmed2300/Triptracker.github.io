import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, XCircle, Upload, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

// ImgBB API details
const IMGBB_API_KEY = "591f55a2f11247ad2c9dc9faf9df0836";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

interface ProfileEditorProps {
  onClose: () => void;
}

const ProfileEditor = ({ onClose }: ProfileEditorProps) => {
  const [displayName, setDisplayName] = useState<string>(auth.currentUser?.displayName || "");
  const [photoURL, setPhotoURL] = useState<string>(auth.currentUser?.photoURL || "");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle image upload to ImgBB
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Convert file to base64 string
      const base64String = await readFileAsDataURL(file);
      setUploadProgress(30);

      // ImgBB requires base64 string without the data:image/xxx;base64, prefix
      const base64Data = base64String.split(',')[1];

      // Create form data with the required parameters
      const formData = new FormData();
      formData.append("key", IMGBB_API_KEY);
      formData.append("image", base64Data);
      formData.append("expiration", "2592000"); // 30 days in seconds

      setUploadProgress(50);

      // Make the API request
      const uploadUrl = `${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`;
      console.log("Uploading to ImgBB:", uploadUrl);

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ImgBB API error response:", errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("ImgBB API response:", data);

      if (data.success && data.data) {
        // Use the display_url from the response
        setPhotoURL(data.data.display_url);
        toast({
          title: "Image uploaded",
          description: "Your profile image has been uploaded successfully.",
        });
      } else {
        console.error("Invalid ImgBB API response:", data);
        throw new Error("Upload failed: Invalid response from server");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      // Provide more detailed error information
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Helper function to convert File to base64 string
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle form submission to update profile
  const handleSubmit = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL,
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Edit Profile
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Image */}
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={photoURL} alt={displayName} />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </>
              )}
            </Button>
            
            {photoURL && (
              <Button
                variant="outline"
                onClick={() => setPhotoURL("")}
                disabled={isUploading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || !displayName.trim()}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileEditor;
