"use client";

import { useProject } from "@/lib/hooks/use-projects";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    LayoutGrid,
    CheckCircle2,
    Clock,
    Rocket,
    FileText,
    MessageSquare,
    BarChartHorizontal,
    LifeBuoy,
    FileSignature,
    Zap,
    Plus,
    MoreHorizontal,
    FileInput,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const projectId = params.id as string;
    const { project, loading } = useProject(projectId);

    const tabs = [
        { name: "Overview", href: `/dashboard/projects/${projectId}`, icon: LayoutGrid, exact: true },
        { name: "Tasks", href: `/dashboard/projects/${projectId}/tasks`, icon: CheckCircle2 },
        { name: "Timesheets", href: `/dashboard/projects/${projectId}/timesheets`, icon: Clock },
        { name: "Milestones", href: `/dashboard/projects/${projectId}/milestones`, icon: Rocket },
        { name: "Files", href: `/dashboard/projects/${projectId}/files`, icon: FileText },
        { name: "Discussions", href: `/dashboard/projects/${projectId}/discussions`, icon: MessageSquare },
        { name: "Gantt", href: `/dashboard/projects/${projectId}/gantt`, icon: BarChartHorizontal },
        { name: "Tickets", href: `/dashboard/projects/${projectId}/tickets`, icon: LifeBuoy },
        { name: "Contracts", href: `/dashboard/projects/${projectId}/contracts`, icon: FileSignature },
        { name: "Sales", href: `/dashboard/projects/${projectId}/sales`, icon: Zap },
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-12 w-full" />
                <div className="pt-4">{children}</div>
            </div>
        );
    }

    if (!project) {
        return <div>Project not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
                        <span className="text-muted-foreground">- {project.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={
                                project.status === "finished"
                                    ? "default" // success not available by default
                                    : project.status === "in_progress"
                                        ? "default"
                                        : "secondary"
                            }
                        >
                            {project.status.replace("_", " ")}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <FileInput className="h-4 w-4" />
                        Invoice Project
                    </Button>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Task
                    </Button>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b">
                <div className="flex overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.exact
                            ? pathname === tab.href
                            : pathname.startsWith(tab.href);

                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.name}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">{children}</div>
        </div>
    );
}
