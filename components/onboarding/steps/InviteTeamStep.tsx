"use client";

import React, { useState } from "react";
import { Users, Mail, ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useWizard } from "../OnboardingWizard";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TeamMember {
    email: string;
    role: string;
}

export default function InviteTeamStep() {
    const { goNext, skipStep, useDummyData } = useWizard();
    const { profile } = useUserProfile();
    const orgId = profile?.orgId;
    const userId = profile?.uid;

    const [members, setMembers] = useState<TeamMember[]>([
        { email: "", role: "staff" }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill with dummy data if selected
    React.useEffect(() => {
        if (useDummyData) {
            setMembers([
                { email: "sarah@example.com", role: "admin" },
                { email: "mike@example.com", role: "staff" },
            ]);
        }
    }, [useDummyData]);

    const addMember = () => {
        setMembers([...members, { email: "", role: "staff" }]);
    };

    const removeMember = (index: number) => {
        if (members.length > 1) {
            setMembers(members.filter((_, i) => i !== index));
        }
    };

    const updateMember = (index: number, field: keyof TeamMember, value: string) => {
        const updated = [...members];
        updated[index] = { ...updated[index], [field]: value };
        setMembers(updated);
    };

    const handleSave = async () => {
        // If no orgId, skip to next step gracefully
        if (!orgId) {
            console.warn("InviteTeamStep: No orgId, skipping to next step");
            goNext();
            return;
        }

        const validMembers = members.filter(m => m.email && m.email.includes("@"));
        if (validMembers.length === 0) {
            goNext();
            return;
        }

        setIsSaving(true);
        try {
            // Create invitations in Firestore
            for (const member of validMembers) {
                await addDoc(collection(db, "invitations"), {
                    email: member.email.toLowerCase(),
                    role: member.role,
                    orgId,
                    status: "pending",
                    isOnboardingDemo: useDummyData,
                    createdAt: serverTimestamp(),
                    invitedBy: userId,
                });
            }

            goNext();
        } catch (error) {
            console.error("Error sending invitations:", error);
            // Still proceed to next step even on error
            goNext();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Invite Your Team</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Add team members to collaborate with you
                </p>
            </div>

            {/* Team Members */}
            <div className="space-y-3 max-w-lg mx-auto">
                {members.map((member, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                            <Input
                                type="email"
                                value={member.email}
                                onChange={(e) => updateMember(index, "email", e.target.value)}
                                placeholder="colleague@company.com"
                            />
                        </div>
                        <Select
                            value={member.role}
                            onValueChange={(value) => updateMember(index, "role", value)}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-gray-400 hover:text-red-500"
                            onClick={() => removeMember(index)}
                            disabled={members.length === 1}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={addMember}
                    className="gap-1 text-gray-600"
                >
                    <Mail className="h-4 w-4" />
                    Add Another
                </Button>
            </div>

            {/* Note */}
            <p className="text-xs text-center text-gray-400 max-w-md mx-auto">
                Team members will receive an email invitation to join your workspace.
            </p>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={skipStep} className="text-gray-500">
                    Skip for now
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            Send Invites
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
