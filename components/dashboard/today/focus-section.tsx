import { TodayItem } from "@/lib/types/today";
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FocusSectionProps {
    items: TodayItem[];
}

export function FocusSection({ items }: FocusSectionProps) {
    if (items.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">All Caught Up!</h3>
                    <p className="text-muted-foreground mt-1">You have no urgent focus items for today.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                My Focus Today
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
                {items.map((item) => (
                    <Card
                        key={item.id}
                        className="relative overflow-hidden border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <span
                                    className={cn(
                                        "text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                                        item.status === "overdue"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-blue-100 text-blue-700"
                                    )}
                                >
                                    {item.status}
                                </span>
                                {item.priority === "critical" && (
                                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Urgent
                                    </span>
                                )}
                            </div>
                            <CardTitle className="text-base font-bold leading-tight mt-2 line-clamp-2">
                                {item.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-gray-500 mb-4 space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="capitalize text-gray-700 font-medium">{item.type}</span>
                                    {item.relatedEntity && (
                                        <>
                                            <span className="text-gray-300">•</span>
                                            <span>{item.relatedEntity.name}</span>
                                        </>
                                    )}
                                </div>
                                {item.dueDate && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                                        <Clock className="h-3 w-3" />
                                        Due {item.dueDate.toDate().toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                            <Button
                                asChild
                                className="w-full"
                                size="sm"
                                variant={item.status === "overdue" ? "destructive" : "default"}
                            >
                                <Link href={item.actionUrl}>
                                    Take Action <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
