import { TodayItem } from "@/lib/types/today";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckSquare, Calendar, Phone, MessageSquare, FileText, ArrowUpRight } from "lucide-react";

interface ActionsListProps {
    items: TodayItem[];
}

export function ActionsList({ items }: ActionsListProps) {
    const overdue = items.filter((i) => i.status === "overdue");
    const today = items.filter((i) => i.status === "today");
    const upcoming = items.filter((i) => i.status === "upcoming");

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-blue-500" />
                Today&apos;s Actions
            </h2>

            <Tabs defaultValue="today" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 space-x-6">
                    <TabsTrigger
                        value="today"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-0 pb-2 bg-transparent"
                    >
                        Today{" "}
                        <Badge variant="secondary" className="ml-2">
                            {today.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="overdue"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-700 rounded-none px-0 pb-2 bg-transparent text-red-600"
                    >
                        Overdue{" "}
                        <Badge variant="destructive" className="ml-2">
                            {overdue.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="upcoming"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-gray-600 data-[state=active]:text-gray-900 rounded-none px-0 pb-2 bg-transparent"
                    >
                        Upcoming{" "}
                        <Badge variant="outline" className="ml-2">
                            {upcoming.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <div className="mt-4 space-y-1 min-h-[300px]">
                    <TabsContent value="today">
                        <ItemList items={today} emptyMessage="No actions scheduled for today." />
                    </TabsContent>
                    <TabsContent value="overdue">
                        <ItemList items={overdue} emptyMessage="No overdue actions. Great job!" />
                    </TabsContent>
                    <TabsContent value="upcoming">
                        <ItemList items={upcoming} emptyMessage="No upcoming actions." />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function ItemList({ items, emptyMessage }: { items: TodayItem[]; emptyMessage: string }) {
    if (items.length === 0) {
        return <div className="text-center py-10 text-gray-500 italic">{emptyMessage}</div>;
    }

    return (
        <div className="space-y-2">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all"
                >
                    <div className="flex items-center gap-4">
                        <TypeIcon type={item.type} />
                        <div className="flex flex-col">
                            <span
                                className={cn("font-medium text-gray-900", item.status === "overdue" && "text-red-700")}
                            >
                                {item.title}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                {item.relatedEntity && <span>{item.relatedEntity.name}</span>}
                                {item.dueDate && (
                                    <span>
                                        • Due{" "}
                                        {item.dueDate
                                            .toDate()
                                            .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Link href={item.actionUrl} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="gap-1 text-blue-600">
                            Open <ArrowUpRight className="h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            ))}
        </div>
    );
}

function TypeIcon({ type }: { type: string }) {
    switch (type) {
        case "call":
            return (
                <div className="p-2 bg-green-50 rounded-full text-green-600">
                    <Phone className="h-4 w-4" />
                </div>
            );
        case "meeting":
            return (
                <div className="p-2 bg-purple-50 rounded-full text-purple-600">
                    <Calendar className="h-4 w-4" />
                </div>
            );
        case "ticket":
            return (
                <div className="p-2 bg-orange-50 rounded-full text-orange-600">
                    <MessageSquare className="h-4 w-4" />
                </div>
            );
        case "invoice":
            return (
                <div className="p-2 bg-yellow-50 rounded-full text-yellow-600">
                    <FileText className="h-4 w-4" />
                </div>
            );
        default:
            return (
                <div className="p-2 bg-gray-50 rounded-full text-gray-600">
                    <CheckSquare className="h-4 w-4" />
                </div>
            );
    }
}
