"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, Settings } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MenuItem {
    id: string;
    name: string;
    hasChildren?: boolean;
}

function SortableItem({ id, name, hasChildren }: { id: string; name: string; hasChildren?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

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
                <span className="text-sm font-medium">{name}</span>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
                <Settings className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function SetupMenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([
        { id: '1', name: 'Staff', hasChildren: false },
        { id: '2', name: 'Roles', hasChildren: false },
        { id: '3', name: 'Customers', hasChildren: true },
        { id: '4', name: 'Groups', hasChildren: false },
        { id: '5', name: 'Support', hasChildren: true },
        { id: '6', name: 'Departments', hasChildren: false },
        { id: '7', name: 'Predefined Replies', hasChildren: false },
        { id: '8', name: 'Ticket Priority', hasChildren: false },
        { id: '9', name: 'Ticket Statuses', hasChildren: false },
        { id: '10', name: 'Services', hasChildren: false },
        { id: '11', name: 'Spam Filters', hasChildren: false },
        { id: '12', name: 'Leads', hasChildren: true },
        { id: '13', name: 'Finance', hasChildren: true },
        { id: '14', name: 'Contracts', hasChildren: true },
        { id: '15', name: 'Estimate Request', hasChildren: true },
        { id: '16', name: 'Modules', hasChildren: false },
        { id: '17', name: 'Email Templates', hasChildren: false },
        { id: '18', name: 'Custom Fields', hasChildren: false },
        { id: '19', name: 'GDPR', hasChildren: false },
        { id: '20', name: 'Menu Setup', hasChildren: true },
        { id: '21', name: 'Theme Style', hasChildren: false },
        { id: '22', name: 'Settings', hasChildren: false },
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
                    <h1 className="text-2xl font-semibold">Setup Menu</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Drag and drop menu items to reorder them
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Reset</Button>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        Save Menu
                    </Button>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg border p-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={menuItems.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {menuItems.map((item) => (
                            <SortableItem
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                hasChildren={item.hasChildren}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}
