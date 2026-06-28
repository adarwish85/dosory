"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, Settings } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "@/lib/i18n";

interface MenuItem {
    id: string;
    nameKey: string;
    hasChildren?: boolean;
}

function SortableItem({ id, nameKey, hasChildren }: { id: string; nameKey: string; hasChildren?: boolean }) {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white border rounded-md p-3 flex items-center justify-between mb-2 hover:border-gray-400 transition-colors"
        >
            <div className="flex items-center gap-3">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                >
                    <GripVertical className="h-5 w-5" />
                </button>
                {hasChildren && (
                    <div className="flex gap-1">
                        <button className="text-gray-600 hover:text-gray-900 text-sm">−</button>
                        <button className="text-gray-600 hover:text-gray-900 text-sm">+</button>
                    </div>
                )}
                <span className="text-sm font-medium">{t(nameKey)}</span>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
                <Settings className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function SetupMenuPage() {
    const { t } = useTranslation();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([
        { id: "1", nameKey: "setup.setupMenu.itemStaff", hasChildren: false },
        { id: "2", nameKey: "setup.setupMenu.itemRoles", hasChildren: false },
        { id: "3", nameKey: "setup.setupMenu.itemCustomers", hasChildren: true },
        { id: "4", nameKey: "setup.setupMenu.itemGroups", hasChildren: false },
        { id: "5", nameKey: "setup.setupMenu.itemSupport", hasChildren: true },
        { id: "6", nameKey: "setup.setupMenu.itemDepartments", hasChildren: false },
        { id: "7", nameKey: "setup.setupMenu.itemPredefinedReplies", hasChildren: false },
        { id: "8", nameKey: "setup.setupMenu.itemTicketPriority", hasChildren: false },
        { id: "9", nameKey: "setup.setupMenu.itemTicketStatuses", hasChildren: false },
        { id: "10", nameKey: "setup.setupMenu.itemServices", hasChildren: false },
        { id: "11", nameKey: "setup.setupMenu.itemSpamFilters", hasChildren: false },
        { id: "12", nameKey: "setup.setupMenu.itemLeads", hasChildren: true },
        { id: "13", nameKey: "setup.setupMenu.itemFinance", hasChildren: true },
        { id: "14", nameKey: "setup.setupMenu.itemContracts", hasChildren: true },
        { id: "15", nameKey: "setup.setupMenu.itemEstimateRequest", hasChildren: true },
        { id: "16", nameKey: "setup.setupMenu.itemModules", hasChildren: false },
        { id: "17", nameKey: "setup.setupMenu.itemEmailTemplates", hasChildren: false },
        { id: "18", nameKey: "setup.setupMenu.itemCustomFields", hasChildren: false },
        { id: "19", nameKey: "setup.setupMenu.itemGdpr", hasChildren: false },
        { id: "20", nameKey: "setup.setupMenu.itemMenuSetup", hasChildren: true },
        { id: "21", nameKey: "setup.setupMenu.itemThemeStyle", hasChildren: false },
        { id: "22", nameKey: "setup.setupMenu.itemSettings", hasChildren: false },
    ]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setMenuItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">{t("setup.setupMenu.title")}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t("setup.menuSetup.dragHint")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">{t("setup.menuSetup.reset")}</Button>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("setup.menuSetup.saveMenu")}</Button>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg border p-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={menuItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        {menuItems.map((item) => (
                            <SortableItem key={item.id} id={item.id} nameKey={item.nameKey} hasChildren={item.hasChildren} />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}
