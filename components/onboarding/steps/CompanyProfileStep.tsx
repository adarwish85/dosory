"use client";

import React, { useState, useRef } from "react";
import { Building2, Phone, MapPin, Upload, X, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWizard } from "../OnboardingWizard";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export default function CompanyProfileStep() {
    const { goNext, useDummyData } = useWizard();
    const { profile } = useUserProfile();
    const orgId = profile?.orgId;

    const [companyName, setCompanyName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pre-fill with dummy data if selected
    React.useEffect(() => {
        if (useDummyData) {
            setCompanyName("Acme Corporation");
            setPhone("+1 (555) 123-4567");
            setAddress("123 Business Avenue, Suite 100\nNew York, NY 10001");
        }
    }, [useDummyData]);

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setLogoPreview(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        setLogoFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSave = async () => {
        setError(null);

        if (!orgId) {
            console.error("CompanyProfileStep: No orgId available, skipping to next step");
            // Allow user to proceed even if orgId not ready
            goNext();
            return;
        }

        setIsSaving(true);
        try {
            let logoUrl = null;

            // Upload logo if selected
            if (logoFile) {
                const logoRef = ref(storage, `organizations/${orgId}/logo`);
                await uploadBytes(logoRef, logoFile);
                logoUrl = await getDownloadURL(logoRef);
            }

            // Update organization document
            const orgRef = doc(db, "organizations", orgId);
            await updateDoc(orgRef, {
                name: companyName || undefined,
                phone: phone || undefined,
                address: address || undefined,
                ...(logoUrl && { logoUrl }),
                updatedAt: new Date().toISOString(),
            });

            goNext();
        } catch (error) {
            console.error("Error saving company profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Set Up Your Company</h2>
                <p className="text-sm text-gray-500 mt-1">Add your business details (you can update these later)</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="companyName" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            Company Name
                        </Label>
                        <Input
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Your Company Ltd."
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="phone" className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            Phone Number
                        </Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="address" className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            Address
                        </Label>
                        <Textarea
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="123 Main Street&#10;City, State 12345"
                            className="mt-1 min-h-[80px]"
                        />
                    </div>
                </div>

                {/* Right Column - Logo Upload */}
                <div className="space-y-4">
                    <Label>Company Logo</Label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                        {logoPreview ? (
                            <div className="relative inline-block">
                                <img
                                    src={logoPreview}
                                    alt="Logo preview"
                                    className="max-h-32 max-w-full mx-auto rounded-lg"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveLogo();
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Click to upload logo</p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                            </>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 gap-2">
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            Continue
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
