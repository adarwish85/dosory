"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Bold,
    Italic,
    Underline,
    Link,
    Image as ImageIcon,
    MoreHorizontal,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Plus,
} from "lucide-react";

export default function NewArticlePage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Add New Article</h2>

            <div className="bg-white border rounded-md p-6 shadow-sm space-y-6">
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                        <span className="text-red-500 mr-1">*</span>Subject
                    </label>
                    <Input className="border-blue-500 ring-1 ring-blue-500" />
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                        <span className="text-red-500 mr-1">*</span>Group
                    </label>
                    <div className="flex gap-2">
                        <Select>
                            <SelectTrigger className="w-full bg-gray-50 text-gray-400">
                                <SelectValue placeholder="Nothing selected" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Group 1</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" className="shrink-0">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="internal" />
                        <label
                            htmlFor="internal"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Internal Article
                        </label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="disabled" />
                        <label
                            htmlFor="disabled"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Disabled
                        </label>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Article description</label>
                    <div className="border rounded-md">
                        <div className="border-b p-2 bg-gray-50 flex items-center gap-2 text-gray-600">
                            <span className="text-xs mr-2">File Edit View Insert Format Tools Table</span>
                        </div>
                        <div className="border-b p-2 flex items-center gap-4 text-gray-600">
                            <Select defaultValue="system">
                                <SelectTrigger className="w-[120px] h-8 text-sm">
                                    <SelectValue placeholder="System Font" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="system">System Font</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select defaultValue="12">
                                <SelectTrigger className="w-[80px] h-8 text-sm">
                                    <SelectValue placeholder="12pt" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12">12pt</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="h-4 w-px bg-gray-300 mx-2"></div>
                            <Bold className="w-4 h-4 cursor-pointer" />
                            <Italic className="w-4 h-4 cursor-pointer" />
                            <Underline className="w-4 h-4 cursor-pointer" />
                            <div className="h-4 w-px bg-gray-300 mx-2"></div>
                            <AlignLeft className="w-4 h-4 cursor-pointer" />
                            <AlignCenter className="w-4 h-4 cursor-pointer" />
                            <AlignRight className="w-4 h-4 cursor-pointer" />
                            <div className="h-4 w-px bg-gray-300 mx-2"></div>
                            <ImageIcon className="w-4 h-4 cursor-pointer" />
                            <Link className="w-4 h-4 cursor-pointer" />
                            <MoreHorizontal className="w-4 h-4 cursor-pointer ml-auto" />
                        </div>
                        <div className="p-4 min-h-[200px] text-gray-400"></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button className="bg-gray-900 text-white hover:bg-gray-800">Save</Button>
            </div>
        </div>
    );
}
