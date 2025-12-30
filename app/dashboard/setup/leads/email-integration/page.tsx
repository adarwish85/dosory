"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";

export default function EmailIntegrationPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Email Integration</h1>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/setup/support/spam-filters">Spam Filters</Link>
                </Button>
            </div>

            <div className="bg-white rounded-md border shadow-sm p-6">
                <div className="space-y-6">
                    {/* Active Toggle */}
                    <div className="flex items-center space-x-2">
                        <Checkbox id="active" defaultChecked />
                        <Label htmlFor="active" className="font-medium">
                            Active
                        </Label>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-red-500">* IMAP Server</Label>
                                <Input defaultValue="imap.zoho.com" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">* Email address (Login)</Label>
                                <Input type="email" placeholder="sales@example.com" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">* Password</Label>
                                <Input type="password" />
                            </div>

                            <div className="space-y-2">
                                <Label>Encryption</Label>
                                <RadioGroup defaultValue="ssl" className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="tls" id="tls" />
                                        <Label htmlFor="tls" className="font-normal">
                                            TLS
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="ssl" id="ssl" />
                                        <Label htmlFor="ssl" className="font-normal">
                                            SSL
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="none" id="none" />
                                        <Label htmlFor="none" className="font-normal">
                                            No Encryption
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">
                                    * Folder{" "}
                                    <Link href="#" className="text-blue-600 hover:underline">
                                        Retrieve Folders
                                    </Link>
                                </Label>
                                <Select defaultValue="inbox">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inbox">INBOX</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">* Check Every (minutes)</Label>
                                <Input type="number" defaultValue="60" />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start space-x-2">
                                    <Checkbox id="non-opened" defaultChecked />
                                    <Label htmlFor="non-opened" className="font-normal leading-tight">
                                        Only check non opened emails
                                    </Label>
                                </div>

                                <div className="flex items-start space-x-2">
                                    <Checkbox id="create-task" defaultChecked />
                                    <Label htmlFor="create-task" className="font-normal leading-tight">
                                        Create task if email sender is already customer and assign to responsible staff
                                        member.
                                    </Label>
                                </div>

                                <div className="flex items-start space-x-2">
                                    <Checkbox id="delete-import" />
                                    <Label htmlFor="delete-import" className="font-normal leading-tight">
                                        Delete mail after import?
                                    </Label>
                                </div>

                                <div className="flex items-start space-x-2">
                                    <Checkbox id="auto-public" />
                                    <Label htmlFor="auto-public" className="font-normal leading-tight">
                                        Auto mark as public
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-red-500">* Default Status</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Select defaultValue="sql">
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sql">SQL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="outline" size="icon">
                                        +
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">* Default Source</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Select defaultValue="referral">
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="referral">Referral</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="outline" size="icon">
                                        +
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">* Responsible for new lead</Label>
                                <Select defaultValue="ahmed">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ahmed">Ahmed Darwish</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3 pt-4">
                                <Label className="font-medium">Notification settings</Label>

                                <div className="flex items-start space-x-2">
                                    <Checkbox id="notify-imported" defaultChecked />
                                    <Label htmlFor="notify-imported" className="font-normal leading-tight">
                                        Notify when lead imported
                                    </Label>
                                </div>

                                <div className="flex items-start space-x-2">
                                    <Checkbox id="notify-multiple" defaultChecked />
                                    <Label htmlFor="notify-multiple" className="font-normal leading-tight">
                                        Notify if lead send email multiple times
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4">
                                <RadioGroup defaultValue="responsible" className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="roles" id="roles" />
                                        <Label htmlFor="roles" className="font-normal">
                                            Staff members with roles
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="responsible" id="responsible" />
                                        <Label htmlFor="responsible" className="font-normal">
                                            Responsible person
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="specific" id="specific" />
                                        <Label htmlFor="specific" className="font-normal">
                                            Specific Staff Members
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline">Test IMAP Connection</Button>
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">Save</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
