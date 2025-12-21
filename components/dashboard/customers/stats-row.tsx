import { cn } from "@/lib/utils";

interface StatsRowProps {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    activeContacts: number;
    inactiveContacts: number;
}

export function StatsRow({
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    activeContacts,
    inactiveContacts
}: StatsRowProps) {
    const stats = [
        {
            label: "Total Customers",
            value: totalCustomers,
            labelColor: "text-gray-600"
        },
        {
            label: "Active Customers",
            value: activeCustomers,
            labelColor: "text-green-600"
        },
        {
            label: "Inactive Customers",
            value: inactiveCustomers,
            labelColor: "text-red-500"
        },
        {
            label: "Active Contacts",
            value: activeContacts,
            labelColor: "text-blue-600"
        },
        {
            label: "Inactive Contacts",
            value: inactiveContacts,
            labelColor: "text-red-500"
        },
        {
            label: "Contacts Logged In",
            value: 0, // Placeholder as we don't track login session state in real-time yet
            labelColor: "text-gray-600"
        }
    ];

    return (
        <div className="flex flex-wrap items-center gap-3">
            {stats.map((stat, i) => (
                <div
                    key={i}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm whitespace-nowrap"
                >
                    <span className="font-bold text-gray-900">{stat.value}</span>
                    <span className={cn("text-sm font-medium", stat.labelColor)}>
                        {stat.label}
                    </span>
                </div>
            ))}
        </div>
    );
}
