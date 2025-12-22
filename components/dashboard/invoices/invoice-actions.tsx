import { Button } from "@/components/ui/button";
import { Plus, Filter, FileText, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface InvoiceActionsProps {
    onDeleteAll?: () => void;
    showDebug?: boolean;
}

export function InvoiceActions({ onDeleteAll, showDebug }: InvoiceActionsProps) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link href="/dashboard/invoices/new">
                    <Button className="bg-[#1c2e4a] text-white hover:bg-[#15233b]">
                        <Plus className="mr-2 h-4 w-4" /> Create New Invoice
                    </Button>
                </Link>
                {/* Debug Button */}
                {showDebug && onDeleteAll && (
                    <Button
                        variant="destructive"
                        onClick={onDeleteAll}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete All (Debug)
                    </Button>
                )}
                <Button variant="outline" className="bg-white text-gray-700 border-gray-300">
                    <Plus className="mr-2 h-4 w-4" /> Batch Payments
                </Button>
                <Button variant="outline" size="icon" className="bg-white border-gray-300 w-10 px-0">
                    <FileText className="h-4 w-4 text-gray-600" />
                </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="flex items-center mr-2">
                    <Button variant="outline" size="icon" className="rounded-r-none h-9 w-9 border-r-0">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-l-none h-9 w-9">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-white text-gray-700 border-gray-300 h-9">
                            <Filter className="mr-2 h-4 w-4" /> Filters
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                        <div className="p-2 text-sm text-gray-500">Filter options coming soon...</div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
