"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    MoreHorizontal,
    Plus,
    FileText,
    ChevronDown,
    CheckSquare,
    Clock,
    Flag,
    Folder,
    MessageSquare,
    Ticket,
    Scroll,
    Loader2,
    ArrowLeft,
} from "lucide-react";

interface Project {
    id: string;
    name: string;
    shortName?: string;
    customer?: {
        id: string;
        name: string;
    };
    status: string;
    billingType?: string;
    totalRate?: number;
    progress?: number;
    startDate?: any;
    deadline?: any;
    completedDate?: any;
    totalLoggedHours?: number;
    description?: string;
    totalTasks?: number;
    openTasks?: number;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        async function loadProject() {
            try {
                const docRef = doc(db, "projects", projectId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProject({ id: docSnap.id, ...docSnap.data() } as Project);
                } else {
                    console.error("Project not found");
                }
            } catch (error) {
                console.error("Error loading project:", error);
            } finally {
                setLoading(false);
            }
        }

        loadProject();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!project) {
        return <div className="p-8">Project not found</div>;
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString();
        } catch {
            return "-";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "finished":
                return "text-green-600 bg-green-50 border-green-200";
            case "in_progress":
            case "in progress":
                return "text-blue-600 bg-blue-50 border-blue-200";
            case "not_started":
            case "not started":
                return "text-gray-600 bg-gray-50 border-gray-200";
            case "on_hold":
            case "on hold":
                return "text-orange-600 bg-orange-50 border-orange-200";
            default:
                return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    const progress = project.progress || 0;
    const totalTasks = project.totalTasks || 0;
    const openTasks = project.openTasks || 0;
    const completedTasks = totalTasks - openTasks;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/dashboard/projects")}
                    className="w-fit gap-2 text-gray-600 hover:text-gray-900 -ml-2"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Projects
                </Button>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {project.shortName || project.name}
                            {project.customer?.name && (
                                <span className="text-gray-400 font-normal text-lg">- {project.customer.name}</span>
                            )}
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-gray-100 rounded-full text-gray-400">
                                <UserIcon className="h-4 w-4" />
                            </span>
                            <Badge variant="outline" className={getStatusColor(project.status)}>
                                {project.status}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">
                            <Plus className="mr-2 h-4 w-4" /> New Task
                        </Button>
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">
                            <FileText className="mr-2 h-4 w-4" /> Invoice Project
                        </Button>
                        <Button variant="outline" className="text-gray-700 bg-white">
                            More <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 border-b overflow-x-auto pb-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="bg-white border rounded-md shadow-sm text-gray-900 font-medium gap-2"
                    >
                        <div className="grid grid-cols-3 gap-0.5 w-3 h-3">
                            <div className="bg-gray-900 rounded-[1px]"></div>
                            <div className="bg-gray-900 rounded-[1px]"></div>
                            <div className="bg-gray-900 rounded-[1px]"></div>
                            <div className="bg-gray-900 rounded-[1px]"></div>
                        </div>{" "}
                        Overview
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2 hover:bg-gray-50">
                        <CheckSquare className="h-4 w-4" /> Tasks
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2 hover:bg-gray-50">
                        <Clock className="h-4 w-4" /> Timesheets
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2 hover:bg-gray-50">
                        <Flag className="h-4 w-4" /> Milestones
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2 hover:bg-gray-50">
                        <Folder className="h-4 w-4" /> Files
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2 hover:bg-gray-50">
                        <MessageSquare className="h-4 w-4" /> Discussions
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2 hover:bg-gray-50">
                        <span className="rotate-90">⎍</span> Gantt
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2 hover:bg-gray-50">
                        <Ticket className="h-4 w-4" /> Tickets
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2 hover:bg-gray-50">
                        <Scroll className="h-4 w-4" /> Contracts
                    </Button>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-gray-700">
                            Project Progress <span className="font-normal text-gray-500">{progress}%</span>
                        </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${progress >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Details */}
                <div className="bg-white rounded-lg p-6 border shadow-sm space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-900">Overview</h3>
                        <Button variant="ghost" className="text-gray-500 text-sm gap-2">
                            <FileText className="h-4 w-4" /> Export Project Data
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div>
                            <label className="text-xs text-gray-500 font-semibold uppercase">Project #</label>
                            <p className="text-gray-900 font-medium">{projectId?.slice(0, 6)}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold uppercase">Customer</label>
                            <p className="text-blue-600 font-medium cursor-pointer hover:underline">
                                {project.customer?.name || "-"}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold uppercase">Billing Type</label>
                            <p className="text-gray-900 font-medium">{project.billingType || "Fixed Rate"}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold uppercase">Total Rate</label>
                            <p className="text-gray-900 font-medium">${project.totalRate?.toFixed(2) || "0.00"}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold uppercase">Status</label>
                            <p className="text-gray-900 font-medium">{project.status}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold uppercase">Start Date</label>
                            <p className="text-gray-900 font-medium">{formatDate(project.startDate)}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold uppercase">Deadline</label>
                            <p className="text-gray-900 font-medium">{formatDate(project.deadline)}</p>
                        </div>
                        {project.completedDate && (
                            <div>
                                <label className="text-xs text-gray-500 font-semibold uppercase">Completed Date</label>
                                <p className="text-green-600 font-medium">{formatDate(project.completedDate)}</p>
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 font-semibold uppercase">Total Logged Hours</label>
                            <p className="text-gray-900 font-medium">{project.totalLoggedHours || "00:00"}</p>
                        </div>
                    </div>

                    {project.description && (
                        <div className="pt-4 border-t">
                            <label className="text-xs text-gray-500 font-semibold uppercase block mb-2">
                                Description
                            </label>
                            <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Widgets */}
                <div className="space-y-6">
                    <h3 className="font-bold text-lg text-gray-900">{project.shortName || project.name}</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-700 font-bold">
                                    {openTasks} / {totalTasks} Open Tasks
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">
                                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                            </p>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500"
                                    style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="bg-white border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-700 font-bold">Days Left</span>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">
                                {project.deadline ? `Deadline: ${formatDate(project.deadline)}` : "No deadline set"}
                            </p>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-300 w-0"></div>
                            </div>
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h4 className="flex items-center gap-2 text-gray-600 font-semibold mb-4">
                            <FileText className="h-4 w-4" /> Expenses
                        </h4>
                        <div className="grid grid-cols-3 gap-4 border-t pt-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
                                <p className="font-bold text-gray-900">$0.00</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-500 mb-1">Billable Expenses</p>
                                <p className="font-bold text-gray-900">$0.00</p>
                            </div>
                            <div>
                                <p className="text-xs text-green-600 mb-1">Billed Expenses</p>
                                <p className="font-bold text-gray-900">$0.00</p>
                            </div>
                        </div>
                    </div>

                    {/* Logged Hours */}
                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="flex items-center gap-2 text-gray-600 font-semibold">
                                <span className="rotate-90">⧗</span> Total Logged Hours
                            </h4>
                            <Button variant="ghost" size="sm" className="text-gray-500 text-xs gap-1">
                                This Week <ChevronDown className="h-3 w-3" />
                            </Button>
                        </div>

                        <div className="text-center py-8 text-gray-500">
                            <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>No logged hours yet</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
            />
        </svg>
    );
}
