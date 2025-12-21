"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Save, User } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, storage, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const { user } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        displayName: "",
        email: "",
        phone: "",
        jobTitle: "",
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [photoURL, setPhotoURL] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState("");

    // Load current profile data
    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || "",
                email: user.email || "",
                phone: profile?.phone || "",
                jobTitle: profile?.jobTitle || "",
            });
            setPhotoURL(user.photoURL || profile?.photoURL || null);
        }
    }, [user, profile]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be less than 5MB");
            return;
        }

        setUploading(true);
        try {
            // Upload to Firebase Storage
            const path = `users/${user.uid}/avatar-${Date.now()}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            // Update Firebase Auth profile
            await updateProfile(user, { photoURL: url });

            // Update Firestore user document
            await updateDoc(doc(db, "users", user.uid), {
                photoURL: url,
                updatedAt: serverTimestamp(),
            });

            setPhotoURL(url);
            setSuccessMessage("Profile picture updated!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        try {
            // Update Firebase Auth display name
            if (formData.displayName !== user.displayName) {
                await updateProfile(user, { displayName: formData.displayName });
            }

            // Update Firestore user document
            await updateDoc(doc(db, "users", user.uid), {
                displayName: formData.displayName,
                phone: formData.phone,
                jobTitle: formData.jobTitle,
                updatedAt: serverTimestamp(),
            });

            setSuccessMessage("Profile updated successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {successMessage}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                    <div className="relative group">
                        <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                            <AvatarImage src={photoURL || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl">
                                {formData.displayName?.charAt(0)?.toUpperCase() ||
                                    formData.email?.charAt(0)?.toUpperCase() ||
                                    <User className="h-12 w-12" />}
                            </AvatarFallback>
                        </Avatar>

                        <button
                            onClick={handleAvatarClick}
                            disabled={uploading}
                            className={cn(
                                "absolute bottom-0 right-0 p-2.5 rounded-full bg-blue-600 text-white shadow-lg",
                                "hover:bg-blue-700 transition-colors",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            {uploading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Camera className="h-5 w-5" />
                            )}
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                    <p className="mt-3 text-sm text-gray-500">
                        Click the camera icon to upload a profile picture
                    </p>
                </div>

                {/* Profile Form */}
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <Label htmlFor="displayName">Full Name</Label>
                            <Input
                                id="displayName"
                                value={formData.displayName}
                                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                placeholder="Your full name"
                                className="mt-1.5"
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                value={formData.email}
                                disabled
                                className="mt-1.5 bg-gray-50"
                            />
                            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+1 (555) 000-0000"
                                className="mt-1.5"
                            />
                        </div>

                        <div>
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input
                                id="jobTitle"
                                value={formData.jobTitle}
                                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                                placeholder="e.g. Sales Manager"
                                className="mt-1.5"
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
