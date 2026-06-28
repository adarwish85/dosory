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
    Pin,
    Pencil,
    Copy,
    Download,
    Trash,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditProjectDialog } from "@/components/dashboard/projects/edit-project-dialog";
import { useState } from "react";
import { useProjects } from "@/lib/hooks/use-projects";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "@/lib/i18n";

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const params = useParams();
    const pathname = usePathname();
    const projectId = params.id as string;
    const { project, loading } = useProject(projectId);

    const tabs = [
        { name: t("projects.tabs.overview"), href: `/dashboard/projects/${projectId}`, icon: LayoutGrid, exact: true },
        { name: t("projects.tabs.tasks"), href: `/dashboard/projects/${projectId}/tasks`, icon: CheckCircle2 },
        { name: t("projects.tabs.timesheets"), href: `/dashboard/projects/${projectId}/timesheets`, icon: Clock },
        { name: t("projects.tabs.milestones"), href: `/dashboard/projects/${projectId}/milestones`, icon: Rocket },
        { name: t("projects.tabs.files"), href: `/dashboard/projects/${projectId}/files`, icon: FileText },
        { name: t("projects.tabs.discussions"), href: `/dashboard/projects/${projectId}/discussions`, icon: MessageSquare },
        { name: t("projects.tabs.gantt"), href: `/dashboard/projects/${projectId}/gantt`, icon: BarChartHorizontal },
        { name: t("projects.tabs.tickets"), href: `/dashboard/projects/${projectId}/tickets`, icon: LifeBuoy },
        { name: t("projects.tabs.contracts"), href: `/dashboard/projects/${projectId}/contracts`, icon: FileSignature },
        { name: t("projects.tabs.sales"), href: `/dashboard/projects/${projectId}/sales`, icon: Zap },
    ];

    const [isEditOpen, setIsEditOpen] = useState(false);
    const { updateProject, deleteProject, duplicateProjectDeep } = useProjects();
    const router = useRouter();

    const statusLabelKeys: Record<string, string> = {
        draft: "projects.status.draft",
        active: "projects.status.active",
        on_hold: "projects.status.onHold",
        completed: "projects.status.completed",
        archived: "projects.status.archived",
    };

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
        return <div>{t("projects.notFound")}</div>;
    }

    const handleDuplicateProject = async () => {
        if (!project) return;
        const loadingToast = toast.loading(t("projects.toast.duplicating"));
        try {
            const newId = await duplicateProjectDeep(project.id, t("projects.copyNameSuffix", { name: project.name }));
            toast.success(t("projects.toast.duplicated"), { id: loadingToast });
            router.push(`/dashboard/projects/${newId}`);
        } catch (error) {
            console.error("Deep duplication error:", error);
            toast.error(t("projects.toast.duplicateFailed"), { id: loadingToast });
        }
    };

    const handleExportProject = () => {
        if (!project) return;
        const data = JSON.stringify(project, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `project-${project.name.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t("projects.toast.exported"));
    };

    const handleDeleteProject = async () => {
        if (!confirm(t("projects.confirm.deleteWarning"))) return;

        try {
            await deleteProject(project.id);
            toast.success(t("projects.toast.deleted"));
            router.push("/dashboard/projects");
        } catch {
            toast.error(t("projects.toast.deleteFailed"));
        }
    };

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
                                project.status === "completed"
                                    ? "default" // success not available by default
                                    : project.status === "active"
                                        ? "default"
                                        : "secondary"
                            }
                        >
                            {statusLabelKeys[project.status] ? t(statusLabelKeys[project.status]) : project.status.replace("_", " ")}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <FileInput className="h-4 w-4" />
                        {t("projects.detail.invoiceProject")}
                    </Button>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t("projects.detail.newTask")}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => updateProject(project.id, { pinned: !project.pinned })}>
                                <Pin className={cn("mr-2 h-4 w-4", project.pinned && "fill-current")} />
                                {project.pinned ? t("projects.detail.unpin") : t("projects.detail.pin")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("projects.detail.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDuplicateProject}>
                                <Copy className="mr-2 h-4 w-4" />
                                {t("projects.detail.duplicate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportProject}>
                                <Download className="mr-2 h-4 w-4" />
                                {t("projects.detail.exportData")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={handleDeleteProject}>
                                <Trash className="mr-2 h-4 w-4" />
                                {t("projects.detail.delete")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b">
                <div className="flex overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

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

            {project && <EditProjectDialog project={project} open={isEditOpen} onOpenChange={setIsEditOpen} />}
        </div>
    );
}
