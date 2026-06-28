"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Settings, Plus, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useTranslation } from "@/lib/i18n";
import type { InvoiceFormData } from "@/lib/schemas";

interface Client {
    id: string;
    company: string;
    billingAddress?: string;
    shippingAddress?: string;
    email?: string;
}

interface Project {
    id: string;
    name: string;
}

interface StaffMember {
    id: string;
    name: string;
}

interface LineItem {
    id: string;
    description: string;
    longDescription?: string;
    quantity: number;
    rate: number;
    tax?: number;
    taxRate?: number; // Normalized to taxRate
    amount: number; // Calculated
}

export default function CreateInvoicePage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { createInvoice } = useInvoices();

    // Data Sources
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);

    // Form State
    const [selectedClient, setSelectedClient] = useState(searchParams.get("customerId") || "");
    const [selectedProject, setSelectedProject] = useState("");

    // Dates
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date());

    // Meta Fields
    const [tags, setTags] = useState("");
    const [paymentModes, setPaymentModes] = useState("Bank, Paypal");
    const [currency, setCurrency] = useState("EGP");
    const [saleAgent, setSaleAgent] = useState("");
    const [recurring, setRecurring] = useState("No");
    const [discountType, setDiscountType] = useState("No discount");
    const [adminNote, setAdminNote] = useState("");
    const [preventOverdueReminders, setPreventOverdueReminders] = useState(false);

    // Footer Fields
    const [clientNote, setClientNote] = useState("Thank you for doing business with us");
    const [termsConditions, setTermsConditions] = useState("");

    // Items
    const [qtyType, setQtyType] = useState<"qty" | "hours" | "qty_hours">("qty");
    const [items, setItems] = useState<LineItem[]>([
        { id: "1", description: "", longDescription: "", quantity: 1, rate: 0, amount: 0 },
    ]);

    // Totals
    const [discountValue, setDiscountValue] = useState(0);
    const [discountKind, setDiscountKind] = useState<"percentage" | "fixed">("percentage");
    const [adjustment, setAdjustment] = useState(0);

    const [loading, setLoading] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        async function fetchData() {
            if (!profile?.orgId) return;

            // Clients
            const qClients = query(collection(db, "customers"), where("orgId", "==", profile.orgId));
            const clientsSnap = await getDocs(qClients);
            const clientList: Client[] = [];
            clientsSnap.forEach((doc) =>
                clientList.push({ id: doc.id, company: doc.data().company, ...doc.data() } as Client)
            );
            setClients(clientList);

            // Fetch Staff (Assuming 'staff' collection exists, using profile as fallback)
            setStaff([{ id: profile.uid, name: `${profile.firstName} ${profile.lastName}` }]);
        }
        fetchData();
    }, [profile?.orgId, profile?.uid, profile?.firstName, profile?.lastName]);

    // Fetch Projects when Client Changes
    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
        if (selectedClient && profile?.orgId) {
            const fetchProjects = async () => {
                try {
                    const qProjects = query(
                        collection(db, "projects"),
                        where("orgId", "==", profile.orgId),
                        where("customerId", "==", selectedClient)
                    );
                    const projectSnap = await getDocs(qProjects);
                    const projectList: Project[] = [];
                    projectSnap.forEach((doc) => projectList.push({ id: doc.id, name: doc.data().name } as Project));
                    setProjects(projectList);
                } catch (e) {
                    console.log("Error fetching projects", e);
                }
            };
            fetchProjects();
        } else {
            setProjects([]);
        }
    }, [selectedClient, profile?.orgId]);

    // Handlers
    const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    // Recalculate amount
                    updated.amount = updated.quantity * updated.rate;
                    return updated;
                }
                return item;
            })
        );
    };

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), description: "", quantity: 1, rate: 0, amount: 0 }]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    // Calculations
    const calculateSubTotal = () => {
        return items.reduce((acc, item) => acc + item.amount, 0);
    };

    const calculateDiscountAmount = (subTotal: number) => {
        if (discountType === "No discount") return 0;
        if (discountKind === "percentage") {
            return subTotal * (discountValue / 100);
        }
        return discountValue;
    };

    const calculateTotal = () => {
        const subTotal = calculateSubTotal();
        const discAmount = calculateDiscountAmount(subTotal);
        return subTotal - discAmount + adjustment;
    };

    const handleSubmit = async (action: "draft" | "send" | "send_later" | "record_payment") => {
        if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
        if (!profile?.orgId || !selectedClient) {
            toast.error(t("invoices.new.toast.selectClient"));
            return;
        }

        if (!date || !dueDate) {
            toast.error(t("invoices.new.toast.selectDates"));
            return;
        }

        setLoading(true);
        try {
            // Map items to schema format
            const lineItems = items.map((item) => ({
                id: item.id,
                description: item.description,
                longDescription: item.longDescription,
                quantity: item.quantity,
                rate: item.rate,
                amount: item.amount,
                taxRate: item.tax ? parseFloat(String(item.tax)) : 0,
                unit: "qty",
            }));

            // Construct payload matching InvoiceFormData
            const invoiceData: InvoiceFormData = {
                customerId: selectedClient,
                projectId: selectedProject || undefined,
                date: date,
                dueDate: dueDate,
                currency,
                items: lineItems,
                discount:
                    discountType !== "No discount"
                        ? {
                            type: discountKind,
                            value: discountValue,
                        }
                        : undefined,
                notes: clientNote,
                terms: termsConditions,
                tags: tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
            };

            const invoiceId = await createInvoice(invoiceData);

            if (action === "draft") {
                toast.success(t("invoices.new.toast.draftCreated"));
            } else {
                toast.success(t("invoices.new.toast.created"));
                // In real app, trigger send/email logic here
            }

            router.push("/dashboard/invoices");
        } catch (error) {
            console.error("Error creating invoice:", error);
            toast.error(t("invoices.new.toast.failed"));
        } finally {
            setLoading(false);
        }
    };

    const clientDetails = clients.find((c) => c.id === selectedClient);

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6 pb-20">
            <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6 space-y-8">
                    {/* Top Section: Two Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            {/* Customer */}
                            <div className="space-y-2">
                                <Label className="text-red-500 font-medium">{t("invoices.new.customerRequired")}</Label>
                                <Select onValueChange={setSelectedClient} value={selectedClient}>
                                    <SelectTrigger className="bg-gray-50 border-gray-200">
                                        <SelectValue placeholder={t("invoices.new.selectCustomer")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.company}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Project */}
                            <div className="space-y-2">
                                <Label>{t("invoices.new.project")}</Label>
                                <Select onValueChange={setSelectedProject} value={selectedProject}>
                                    <SelectTrigger className="bg-gray-50 border-gray-200">
                                        <SelectValue placeholder={t("invoices.new.selectProject")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((project) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Addresses */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-blue-600 cursor-pointer hover:underline text-sm font-medium">
                                        <span className="h-4 w-4 border border-blue-600 rounded flex items-center justify-center text-[10px]">
                                            ✎
                                        </span>
                                        {t("invoices.new.billTo")}
                                    </div>
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap min-h-[80px]">
                                        {clientDetails?.billingAddress || t("invoices.new.noBillingAddress")}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                                        {t("invoices.new.shipTo")}
                                    </div>
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap min-h-[80px]">
                                        {clientDetails?.shippingAddress || t("invoices.new.noShippingAddress")}
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Number & Dates */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-red-500 font-medium">
                                        {t("invoices.new.invoiceNumberRequired")}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-100 border border-gray-200 px-3 py-2 rounded-md text-sm text-gray-500">
                                            INV-
                                        </div>
                                        <Input disabled placeholder={t("invoices.new.autoGenerated")} className="bg-gray-50" />
                                        <Settings className="h-4 w-4 text-gray-400 cursor-pointer" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-red-500 font-medium">
                                            {t("invoices.new.invoiceDateRequired")}
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal border-gray-200",
                                                        !date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date ? (
                                                        format(date, "dd/MM/yyyy")
                                                    ) : (
                                                        <span>{t("invoices.new.pickDate")}</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={date}
                                                    onSelect={setDate}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("invoices.new.dueDate")}</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal border-gray-200",
                                                        !dueDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {dueDate ? (
                                                        format(dueDate, "dd/MM/yyyy")
                                                    ) : (
                                                        <span>{t("invoices.new.pickDate")}</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={dueDate}
                                                    onSelect={setDueDate}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="preventOverdue"
                                    checked={preventOverdueReminders}
                                    onCheckedChange={(c) => setPreventOverdueReminders(c === true)}
                                />
                                <Label htmlFor="preventOverdue" className="text-gray-600 font-normal">
                                    {t("invoices.new.preventOverdueReminders")}
                                </Label>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <span className="h-4 w-4 rotate-45">🏷️</span> {t("invoices.new.tags")}
                                </Label>
                                <Input
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder={t("invoices.new.tagPlaceholder")}
                                    className="border-gray-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("invoices.new.allowedPaymentModes")}</Label>
                                <div className="relative">
                                    <Input
                                        value={paymentModes}
                                        onChange={(e) => setPaymentModes(e.target.value)}
                                        className="border-gray-200 pr-8"
                                    />
                                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-red-500 font-medium">
                                        {t("invoices.new.currencyRequired")}
                                    </Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EGP">EGP EGP</SelectItem>
                                            <SelectItem value="USD">USD $</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("invoices.new.saleAgent")}</Label>
                                    <Select value={saleAgent} onValueChange={setSaleAgent}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200">
                                            <SelectValue placeholder={t("invoices.new.selectAgent")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staff.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("invoices.new.recurringInvoice")}</Label>
                                    <Select value={recurring} onValueChange={setRecurring}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="No">{t("invoices.new.recurring.no")}</SelectItem>
                                            <SelectItem value="Daily">{t("invoices.new.recurring.daily")}</SelectItem>
                                            <SelectItem value="Weekly">{t("invoices.new.recurring.weekly")}</SelectItem>
                                            <SelectItem value="Monthly">
                                                {t("invoices.new.recurring.monthly")}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("invoices.new.discountType")}</Label>
                                    <Select value={discountType} onValueChange={setDiscountType}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="No discount">
                                                {t("invoices.new.discount.none")}
                                            </SelectItem>
                                            <SelectItem value="Before Tax">
                                                {t("invoices.new.discount.beforeTax")}
                                            </SelectItem>
                                            <SelectItem value="After Tax">
                                                {t("invoices.new.discount.afterTax")}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("invoices.new.adminNote")}</Label>
                                <Textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    className="resize-none border-gray-200 min-h-[100px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ITEMS SECTION */}
                    <div className="space-y-4 pt-8">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Select defaultValue="add_item">
                                    <SelectTrigger className="w-[140px] border-gray-200 h-9">
                                        <SelectValue placeholder={t("invoices.new.addItem")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="add_item">{t("invoices.new.addItem")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={addItem}>
                                    <Plus className="h-4 w-4" />
                                </Button>

                                <Select defaultValue="bill_tasks">
                                    <SelectTrigger className="w-[140px] border-gray-200 h-9 bg-gray-50">
                                        <SelectValue placeholder={t("invoices.new.billTasks")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bill_tasks">{t("invoices.new.billTasks")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">{t("invoices.new.showQuantityAs")}</span>
                                <RadioGroup
                                    defaultValue="qty"
                                    value={qtyType}
                                    onValueChange={(v: any) => setQtyType(v)}
                                    className="flex items-center gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="qty" id="qty" />
                                        <Label htmlFor="qty" className="font-normal text-gray-600">
                                            {t("invoices.new.qty")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="hours" id="hours" />
                                        <Label htmlFor="hours" className="font-normal text-gray-600">
                                            {t("invoices.new.hours")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="qty_hours" id="qty_hours" />
                                        <Label htmlFor="qty_hours" className="font-normal text-gray-600">
                                            {t("invoices.new.qtyHours")}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {/* Items Table Header */}
                        <div className="grid grid-cols-12 gap-4 bg-gray-50 p-2 text-sm font-semibold text-gray-700 border-y border-gray-200">
                            <div className="col-span-12 md:col-span-5 pl-2">{t("invoices.new.colItem")}</div>
                            <div className="col-span-12 md:col-span-2">{t("invoices.new.colQty")}</div>
                            <div className="col-span-12 md:col-span-2">{t("invoices.new.colRate")}</div>
                            <div className="col-span-12 md:col-span-1">{t("invoices.new.colTax")}</div>
                            <div className="col-span-12 md:col-span-1 text-right">{t("invoices.new.colAmount")}</div>
                            <div className="col-span-12 md:col-span-1 text-center">
                                <Settings className="h-4 w-4 mx-auto" />
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-0 divide-y divide-gray-100">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-12 gap-4 py-4 px-2 items-start group hover:bg-gray-50/50 transition-colors"
                                >
                                    <div className="col-span-12 md:col-span-5 space-y-2">
                                        <Input
                                            placeholder={t("invoices.new.descriptionPlaceholder")}
                                            className="border-gray-200 h-9"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                                        />
                                        <Textarea
                                            placeholder={t("invoices.new.longDescriptionPlaceholder")}
                                            className="border-gray-200 min-h-[60px] resize-none text-sm"
                                            value={item.longDescription}
                                            onChange={(e) =>
                                                handleItemChange(item.id, "longDescription", e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-2 space-y-1">
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="number"
                                                className="border-gray-200 h-9"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.id,
                                                        "quantity",
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                            />
                                            <span className="text-xs text-gray-400">{t("invoices.new.unit")}</span>
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <Input
                                            type="number"
                                            className="border-gray-200 h-9"
                                            value={item.rate}
                                            onChange={(e) =>
                                                handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-1">
                                        <Select
                                            defaultValue="0"
                                            onValueChange={(val) => handleItemChange(item.id, "tax", val)}
                                        >
                                            <SelectTrigger className="border-gray-200 h-9">
                                                <SelectValue placeholder={t("invoices.new.colTax")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">0%</SelectItem>
                                                <SelectItem value="14">14%</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-12 md:col-span-1 text-right pt-2 font-medium text-gray-700">
                                        {(item.quantity * item.rate).toFixed(2)}
                                    </div>
                                    <div className="col-span-12 md:col-span-1 flex justify-center pt-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-gray-400 hover:text-red-500"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <span className="h-4 w-4 flex items-center justify-center">x</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FOOTER TOTALS SECTION */}
                    <div className="flex flex-col md:flex-row gap-8 pt-8 border-t border-gray-100">
                        {/* Left Side: Notes */}
                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <Label>{t("invoices.new.clientNote")}</Label>
                                <Textarea
                                    className="border-gray-200 min-h-[80px]"
                                    value={clientNote}
                                    onChange={(e) => setClientNote(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("invoices.new.termsConditions")}</Label>
                                <Textarea
                                    className="border-gray-200 min-h-[80px]"
                                    value={termsConditions}
                                    onChange={(e) => setTermsConditions(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Right Side: Calculation */}
                        <div className="w-full md:w-[400px] space-y-4">
                            <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                                <span className="font-semibold text-gray-700">{t("invoices.new.subTotal")}</span>
                                <span className="text-gray-700">
                                    {currency} {calculateSubTotal().toFixed(2)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-50">
                                <span className="font-semibold text-gray-700 w-24">{t("invoices.new.discount")}</span>
                                <div className="flex gap-2 flex-1">
                                    <Input
                                        type="number"
                                        className="h-8 text-sm"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                    />
                                    <Select value={discountKind} onValueChange={(v: any) => setDiscountKind(v)}>
                                        <SelectTrigger className="h-8 w-[70px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">%</SelectItem>
                                            <SelectItem value="fixed">{currency}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <span className="text-gray-700 text-sm">
                                    -{currency} {calculateDiscountAmount(calculateSubTotal()).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-50">
                                <span className="font-semibold text-gray-700 w-24">{t("invoices.new.adjustment")}</span>
                                <div className="flex-1">
                                    <Input
                                        type="number"
                                        className="h-8 text-sm"
                                        value={adjustment}
                                        onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <span className="text-gray-700 text-sm">
                                    {currency} {adjustment.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between text-base py-2">
                                <span className="font-bold text-gray-800">{t("invoices.new.total")}</span>
                                <span className="font-bold text-gray-800">
                                    {currency} {calculateTotal().toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sticky/Fixed Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-2 z-10 shadow-lg">
                <Button variant="outline" className="border-gray-200" onClick={() => handleSubmit("draft")}>
                    {t("invoices.new.saveAsDraft")}
                </Button>

                <div className="flex">
                    <Button
                        className="rounded-r-none bg-slate-900 text-white hover:bg-slate-800"
                        onClick={() => handleSubmit("send")}
                    >
                        {t("common.save")}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="rounded-l-none border-l border-slate-700 bg-slate-900 text-white hover:bg-slate-800 px-2">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSubmit("send")}>
                                {t("invoices.new.saveAndSend")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSubmit("send_later")}>
                                {t("invoices.new.saveAndSendLater")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSubmit("record_payment")}>
                                {t("invoices.new.saveAndRecordPayment")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
