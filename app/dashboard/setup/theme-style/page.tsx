"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ThemeStylePage() {
    const [activeTab, setActiveTab] = useState("admin");

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Theme Style</h1>
                <Button variant="outline">Reset</Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="admin">Admin Area</TabsTrigger>
                    <TabsTrigger value="customers">Customers Area</TabsTrigger>
                    <TabsTrigger value="buttons">Buttons</TabsTrigger>
                    <TabsTrigger value="modals">Modals</TabsTrigger>
                    <TabsTrigger value="tables">Tables</TabsTrigger>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="tags">Tags</TabsTrigger>
                    <TabsTrigger value="custom">Custom CSS</TabsTrigger>
                </TabsList>

                <TabsContent value="admin" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        {/* Sidebar Colors */}
                        <div>
                            <Label>Sidebar Menu/Setup Menu Background Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#FFFFFF' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Sidebar Menu/Setup Menu Links Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#333333" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#333333' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Sidebar Menu/Setup Active Item Background Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#F5F5F5" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#F5F5F5' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Sidebar Menu/Setup Active Item Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#000000" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#000000' }}></div>
                            </div>
                        </div>

                        {/* Top Header Colors */}
                        <div className="border-t pt-6">
                            <Label>Top Header Background Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#FFFFFF' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Top Header Links Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#333333" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#333333' }}></div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="border-t pt-6">
                            <Label>Main Content Background Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#F9FAFB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#F9FAFB' }}></div>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save
                    </Button>
                </TabsContent>

                <TabsContent value="customers" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>Navigation Background Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#FFFFFF' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Navigation Links Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#333333" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#333333' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Footer Background</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#F9FAFB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#F9FAFB' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Footer Text Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#6B7280" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#6B7280' }}></div>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save
                    </Button>
                </TabsContent>

                <TabsContent value="buttons" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>Button Default</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#E5E7EB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#E5E7EB' }}></div>
                                <Button variant="outline">Button Default</Button>
                            </div>
                        </div>

                        <div>
                            <Label>Button Primary</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#1F2937" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#1F2937' }}></div>
                                <Button className="bg-gray-900 text-white">Button Primary</Button>
                            </div>
                        </div>

                        <div>
                            <Label>Button Info</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#3B82F6" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                                <Button className="bg-blue-600 text-white">Button Info</Button>
                            </div>
                        </div>

                        <div>
                            <Label>Button Success</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#10B981" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#10B981' }}></div>
                                <Button className="bg-green-600 text-white">Button Success</Button>
                            </div>
                        </div>

                        <div>
                            <Label>Button Danger</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#EF4444" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#EF4444' }}></div>
                                <Button className="bg-red-600 text-white">Button Danger</Button>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save
                    </Button>
                </TabsContent>

                <TabsContent value="modals" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>Heading Background</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#FFFFFF' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Heading Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#111827" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#111827' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Close Button Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#6B7280" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#6B7280' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Modal Header Text Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#111827" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#111827' }}></div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="border-t pt-6">
                            <h3 className="font-medium mb-4">Example Modal Heading</h3>
                            <div className="bg-white border rounded-lg shadow-lg p-4">
                                <div className="flex items-center justify-between border-b pb-3 mb-3">
                                    <h4 className="font-semibold">Sample Text</h4>
                                    <button className="text-gray-400 hover:text-gray-600">×</button>
                                </div>
                                <p className="text-sm text-gray-600">Modal Body</p>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save
                    </Button>
                </TabsContent>

                <TabsContent value="tables" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>Table Links Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#3B82F6" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Table Links Hover/Focus Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#2563EB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#2563EB' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Table Headings Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#111827" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#111827' }}></div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="border-t pt-6">
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-medium">Example Heading 1</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium">Example Heading 2</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t">
                                            <td className="px-4 py-2 text-sm">Example Heading 1</td>
                                            <td className="px-4 py-2 text-sm">Example Heading 2</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <Label>Items Table Headings Background Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#F9FAFB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#F9FAFB' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Items Table Headings Text Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#6B7280" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#6B7280' }}></div>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save
                    </Button>
                </TabsContent>

                <TabsContent value="general" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>Links Color (href)</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#3B82F6" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Links Hover/Focus Color</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#2563EB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#2563EB' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Admin Login Background</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#FFFFFF' }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>Text Muted</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#6B7280" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#6B7280' }}></div>
                                <span className="text-gray-500 text-sm">Example Text Muted</span>
                            </div>
                        </div>

                        <div>
                            <Label>Text Danger</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#DC2626" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#DC2626' }}></div>
                                <span className="text-red-600 text-sm">Example Text Danger</span>
                            </div>
                        </div>

                        <div>
                            <Label>Text Warning</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#F59E0B" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: '#F59E0B' }}></div>
                                <span className="text-amber-600 text-sm">Example Text Warning</span>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save
                    </Button>
                </TabsContent>

                <TabsContent value="tags" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-4">
                        <p className="text-sm text-gray-600">
                            Customize tag colors for different statuses and categories
                        </p>
                        <div className="space-y-4">
                            {['Primary', 'Success', 'Info', 'Warning', 'Danger'].map((tag) => (
                                <div key={tag}>
                                    <Label>{tag} Tag Color</Label>
                                    <div className="flex gap-2 mt-2">
                                        <Input className="flex-1" placeholder="#3B82F6" />
                                        <div className="w-12 h-10 border rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save
                    </Button>
                </TabsContent>

                <TabsContent value="custom" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6">
                        <Label className="mb-2 block">Custom CSS</Label>
                        <textarea
                            className="w-full h-96 p-4 border rounded-md font-mono text-sm"
                            placeholder="/* Add your custom CSS here */"
                        />
                        <p className="text-sm text-gray-500 mt-2">
                            Add custom CSS styles to override default theme styles
                        </p>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save
                    </Button>
                </TabsContent>
            </Tabs>
        </div>
    );
}
