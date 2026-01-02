export interface ReportKpi {
    value: number;
    change?: number; // percent change
    label: string;
    trend?: "up" | "down" | "neutral";
    prefix?: string; // e.g., "$"
    suffix?: string; // e.g., "%"
}

export interface ReportChartSeries {
    date: string; // ISO date or "MMM YYYY" label
    [key: string]: string | number;
}

export interface ReportBreakdownItem {
    label: string;
    value: number;
    color?: string;
}

export interface ReportTableColumn {
    key: string;
    label: string;
    type?: "text" | "number" | "currency" | "date" | "status" | "percent";
}

export interface ReportTable {
    headers: ReportTableColumn[];
    rows: Record<string, unknown>[];
    total: number;
}

export interface ReportResponse<T = unknown> {
    kpis: Record<string, ReportKpi>;
    series: ReportChartSeries[];
    breakdowns: ReportBreakdownItem[];
    table: {
        columns: ReportTableColumn[];
        rows: T[];
        total: number;
    };
}

export type ReportDateRange = "today" | "week" | "month" | "quarter" | "year" | "all" | "custom";

export interface ReportFilter {
    dateRange: ReportDateRange;
    startDate?: Date;
    endDate?: Date;
    orgId: string;
    [key: string]: unknown;
}
