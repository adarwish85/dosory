import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ContractsList() {
    return (
        <Card className="h-full flex flex-col border border-gray-100 shadow-sm rounded-xl overflow-hidden py-0 gap-0">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-gray-50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Contracts Expiring Soon
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2 text-xs font-medium">View All</Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 p-4">
                <div className="flex gap-2">
                    <Select defaultValue="25">
                        <SelectTrigger className="w-[70px] h-9 text-xs">
                            <SelectValue placeholder="25" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-9">Export</Button>
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search..." className="pl-8 h-9 text-xs" />
                    </div>
                </div>

                <div className="border border-gray-100 rounded-lg overflow-hidden flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                <TableHead className="py-2 h-9 text-xs font-medium">Subject #</TableHead>
                                <TableHead className="py-2 h-9 text-xs font-medium">Customer</TableHead>
                                <TableHead className="py-2 h-9 text-xs font-medium">Start Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground h-32 text-sm">
                                    No contracts expiring soon
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <div>Showing 1 to 1 of 1 entries</div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled>{"<"}</Button>
                        <Button variant="secondary" size="icon" className="h-7 w-7 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800">1</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled>{">"}</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
