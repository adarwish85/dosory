import { Card } from "@/components/ui/card";

interface StatItem {
    label: string;
    amount: string;
    color?: "default" | "orange" | "green" | "red" | "blue";
}

interface StatsGroupProps {
    items: StatItem[];
}

export function StatsGroup({ items }: StatsGroupProps) {
    const getColorClass = (color?: string) => {
        switch (color) {
            case "orange": return "text-orange-600";
            case "green": return "text-green-600";
            case "red": return "text-red-600";
            case "blue": return "text-blue-600";
            default: return "text-gray-900";
        }
    };

    const gridCols = {
        1: "md:grid-cols-1",
        2: "md:grid-cols-2",
        3: "md:grid-cols-3",
        4: "md:grid-cols-4",
        5: "md:grid-cols-5",
        6: "md:grid-cols-6",
    }[items.length] || "md:grid-cols-5";

    return (
        <div className={`grid gap-4 grid-cols-1 ${gridCols}`}>
            {items.map((item, index) => (
                <div key={index} className="bg-white p-4 rounded-md border shadow-sm space-y-1">
                    <p className={`text-sm font-medium ${getColorClass(item.color)}`}>{item.label}</p>
                    <p className="text-xl font-bold text-gray-900">{item.amount}</p>
                </div>
            ))}
        </div>
    );
}
