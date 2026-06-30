import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowDownLeft, ArrowUpRight, Download, FilePlus2, IndianRupee, Plus, TrendingUp, Trash2, Wallet, } from "lucide-react";
import { projects as initialProjects, transactions as initialTransactions, revenueByMonth as initialRevenueByMonth, } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";
import { canPageAction } from "@/lib/auth";
export const Route = createFileRoute("/dashboard/finance")({
    head: () => ({ meta: [{ title: "Accounts & Finance - Factrova" }] }),
    component: Finance,
});
const defaultInvoice = {
    design: "standard",
    invoiceNo: "",
    date: "",
    billToAddress: "",
    logoDataUrl: "",
    logoName: "",
    items: [],
};
export function Finance() {
    const canAdd = canPageAction("finance", "add");
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [invoice, setInvoice] = useState(defaultInvoice);
    const [projects, setProjects] = useState(initialProjects);
    const [transactions, setTransactions] = useState(initialTransactions);
    const [revenueByMonth, setRevenueByMonth] = useState(initialRevenueByMonth);
    useEffect(() => {
        const load = async () => {
            try {
                const [projectRows, transactionRows] = await Promise.all([
                    api.list("projects"),
                    api.list("transactions"),
                ]);
                setProjects((projectRows ?? []).map((row) => ({
                    id: row.code,
                    name: row.name,
                    customer: row.customerName,
                    status: row.status,
                    progress: row.progress,
                    delivery: row.delivery ?? "TBD",
                    amount: Number(row.amount),
                })));
                const rows = (transactionRows ?? []).map((row) => ({
                    id: row.id,
                    date: row.transactionDate,
                    desc: row.description,
                    type: row.type,
                    amount: Number(row.amount),
                }));
                setTransactions(rows);
                const monthTotals = rows
                    .filter((row) => row.type === "credit")
                    .reduce((totals, row) => {
                    const month = new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(row.date));
                    totals[month] = (totals[month] ?? 0) + row.amount;
                    return totals;
                }, {});
                if (Object.keys(monthTotals).length) {
                    setRevenueByMonth(Object.entries(monthTotals).map(([month, revenue]) => ({ month, revenue })));
                }
            }
            catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to load finance data");
            }
        };
        load();
    }, []);
    const invoices = projects.map((p, index) => ({
        id: `INV-${String(index + 1).padStart(3, "0")}`,
        date: p.delivery,
        customer: p.customer,
        project: p.name,
        status: p.status === "completed" ? "paid" : p.status === "hold" ? "draft" : "pending",
        amount: p.amount,
    }));
    const credit = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const debit = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    const balance = credit - debit;
    const invoiceTotals = getInvoiceTotals(invoice);
    const stats = [
        { label: "Total Income", value: credit, icon: ArrowUpRight, tone: "text-success", bg: "bg-success/10" },
        { label: "Total Expense", value: debit, icon: ArrowDownLeft, tone: "text-destructive", bg: "bg-destructive/10" },
        { label: "Net Balance", value: balance, icon: Wallet, tone: "text-primary", bg: "bg-primary/10" },
        { label: "Avg. Monthly Revenue", value: Math.round(revenueByMonth.reduce((s, m) => s + m.revenue, 0) / revenueByMonth.length), icon: TrendingUp, tone: "text-primary", bg: "bg-primary/10" },
    ];
    const downloadPdf = () => {
        const win = window.open("", "_blank", "width=900,height=700");
        if (!win)
            return;
        win.document.write(invoiceDocument(invoice));
        win.document.close();
        win.focus();
        win.print();
    };
    const updateItem = (index, updates) => {
        setInvoice({
            ...invoice,
            items: invoice.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item),
        });
    };
    const addItem = () => {
        setInvoice({
            ...invoice,
            items: [...invoice.items, { name: "", quantity: 1, price: 0, tax: 0 }],
        });
    };
    const removeItem = (index) => {
        if (invoice.items.length === 1)
            return;
        setInvoice({
            ...invoice,
            items: invoice.items.filter((_, itemIndex) => itemIndex !== index),
        });
    };
    const uploadLogo = (file) => {
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            setInvoice({
                ...invoice,
                logoDataUrl: typeof reader.result === "string" ? reader.result : "",
                logoName: file.name,
            });
        };
        reader.readAsDataURL(file);
    };
    const openInvoicePreview = (row) => {
        setInvoice({
            ...invoice,
            invoiceNo: row.id,
            date: row.date,
            billToAddress: `${row.customer}\n${row.project}`,
            items: [
                {
                    name: row.project,
                    quantity: 1,
                    price: row.amount,
                    tax: 0,
                },
            ],
        });
        setPreviewOpen(true);
    };
    return (_jsxs(DashboardLayout, { title: "Accounts & Finance", children: [_jsx("div", { className: "mb-4 flex justify-end", children: canAdd ? _jsxs(Button, { onClick: () => setInvoiceOpen(true), children: [_jsx(FilePlus2, { className: "mr-1 h-4 w-4" }), " Create Invoice"] }) : null }), _jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: stats.map((s) => {
                    const Icon = s.icon;
                    return (_jsx(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: _jsx(CardContent, { className: "p-5", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted-foreground", children: s.label }), _jsxs("p", { className: "mt-2 flex items-center text-2xl font-bold tracking-tight", children: [_jsx(IndianRupee, { className: "h-5 w-5" }), Number(s.value.toFixed(2)).toLocaleString("en-IN")] })] }), _jsx("div", { className: `flex h-10 w-10 items-center justify-center rounded-lg ${s.bg} ${s.tone}`, children: _jsx(Icon, { className: "h-5 w-5" }) })] }) }) }, s.label));
                }) }), _jsxs(Tabs, { defaultValue: "sales", className: "mt-6", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "sales", children: "Sales" }), _jsx(TabsTrigger, { value: "transactions", children: "Transactions" })] }), _jsx(TabsContent, { value: "sales", className: "mt-4", children: _jsxs(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "Invoices" }) }), _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Invoice" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Date" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Customer" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Project" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Amount" })] }) }), _jsx("tbody", { children: invoices.map((row) => (_jsxs("tr", { role: "button", tabIndex: 0, onClick: () => openInvoicePreview(row), onKeyDown: (event) => {
                                                            if (event.key === "Enter" || event.key === " ") {
                                                                event.preventDefault();
                                                                openInvoicePreview(row);
                                                            }
                                                        }, className: "cursor-pointer border-b border-border/50 outline-none last:border-0 hover:bg-muted/30 focus:bg-muted/40", children: [_jsx("td", { className: "px-4 py-3 font-medium", children: row.id }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: formatDateTimeCompact(row.date) }), _jsx("td", { className: "px-4 py-3", children: row.customer }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: row.project }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${row.status === "paid"
                                                                        ? "border-success/20 bg-success/10 text-success"
                                                                        : row.status === "pending"
                                                                            ? "border-warning/30 bg-warning/15 text-warning-foreground"
                                                                            : "border-border bg-muted/40 text-muted-foreground"}`, children: row.status }) }), _jsxs("td", { className: "px-4 py-3 text-right font-semibold", children: ["Rs.", row.amount.toLocaleString("en-IN")] })] }, row.id))) })] }) }) })] }) }), _jsx(TabsContent, { value: "transactions", className: "mt-4", children: _jsxs(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "Transactions" }) }), _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Date" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Description" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Type" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Amount" })] }) }), _jsx("tbody", { children: transactions.map((t) => (_jsxs("tr", { className: "border-b border-border/50 last:border-0 hover:bg-muted/30", children: [_jsx("td", { className: "px-4 py-3 text-muted-foreground", children: formatDateTimeCompact(t.date) }), _jsx("td", { className: "px-4 py-3 font-medium", children: t.desc }), _jsx("td", { className: "px-4 py-3", children: _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${t.type === "credit" ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"}`, children: [t.type === "credit" ? _jsx(ArrowUpRight, { className: "h-3 w-3" }) : _jsx(ArrowDownLeft, { className: "h-3 w-3" }), t.type] }) }), _jsxs("td", { className: `px-4 py-3 text-right font-semibold ${t.type === "credit" ? "text-success" : "text-destructive"}`, children: [t.type === "credit" ? "+" : "-", " Rs.", Number(t.amount.toFixed(2)).toLocaleString("en-IN")] })] }, t.id))) })] }) }) })] }) })] }), _jsx(Dialog, { open: invoiceOpen, onOpenChange: setInvoiceOpen, children: _jsxs(DialogContent, { className: "left-auto right-0 top-0 h-dvh max-h-screen max-w-5xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:rounded-none", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "New invoice" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Logo" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { type: "file", accept: "image/*", onChange: (e) => uploadLogo(e.target.files?.[0]) }), invoice.logoDataUrl ? (_jsx(Button, { type: "button", variant: "outline", onClick: () => setInvoice({ ...invoice, logoDataUrl: "", logoName: "" }), children: "Remove" })) : null] }), invoice.logoName ? (_jsx("p", { className: "text-xs text-muted-foreground", children: invoice.logoName })) : null] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Address" }), _jsx(Textarea, { value: invoice.billToAddress, onChange: (e) => setInvoice({ ...invoice, billToAddress: e.target.value }), rows: 4 })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Invoice Design" }), _jsxs(RadioGroup, { value: invoice.design, onValueChange: (v) => setInvoice({ ...invoice, design: v }), className: "grid grid-cols-2 gap-2", children: [_jsx(DesignOption, { value: "standard", label: "Standard", current: invoice.design }), _jsx(DesignOption, { value: "professional", label: "Professional", current: invoice.design })] })] }), _jsx(Field, { label: "Invoice No", value: invoice.invoiceNo, onChange: (v) => setInvoice({ ...invoice, invoiceNo: v }) }), _jsx(Field, { label: "Date", type: "date", value: invoice.date, onChange: (v) => setInvoice({ ...invoice, date: v }) })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx(Label, { children: "Items" }), _jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: addItem, children: [_jsx(Plus, { className: "mr-1 h-4 w-4" }), " Add item"] })] }), _jsx("div", { className: "overflow-x-auto rounded-lg border border-border/70", children: _jsxs("table", { className: "w-full min-w-[760px] text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("th", { className: "px-3 py-2 font-medium", children: "Name" }), _jsx("th", { className: "w-28 px-3 py-2 text-right font-medium", children: "Quantity" }), _jsx("th", { className: "w-36 px-3 py-2 text-right font-medium", children: "Price" }), _jsx("th", { className: "w-28 px-3 py-2 text-right font-medium", children: "Tax %" }), _jsx("th", { className: "w-40 px-3 py-2 text-right font-medium", children: "Total" }), _jsx("th", { className: "w-12 px-3 py-2" })] }) }), _jsx("tbody", { children: invoice.items.map((item, index) => (_jsxs("tr", { className: "border-b last:border-0", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx(Label, { className: "sr-only", children: "Item name" }), _jsx(Input, { value: item.name, onChange: (e) => updateItem(index, { name: e.target.value }) })] }), _jsxs("td", { className: "px-3 py-2", children: [_jsx(Label, { className: "sr-only", children: "Quantity" }), _jsx(Input, { type: "number", value: String(item.quantity), onChange: (e) => updateItem(index, { quantity: Number(e.target.value) || 0 }), className: "text-right" })] }), _jsxs("td", { className: "px-3 py-2", children: [_jsx(Label, { className: "sr-only", children: "Price" }), _jsx(Input, { type: "number", value: String(item.price), onChange: (e) => updateItem(index, { price: Number(e.target.value) || 0 }), className: "text-right" })] }), _jsxs("td", { className: "px-3 py-2", children: [_jsx(Label, { className: "sr-only", children: "Tax percent" }), _jsx(Input, { type: "number", value: String(item.tax), onChange: (e) => updateItem(index, { tax: Number(e.target.value) || 0 }), className: "text-right" })] }), _jsxs("td", { className: "px-3 py-2", children: [_jsx(Label, { className: "sr-only", children: "Total" }), _jsx(Input, { value: `Rs.${Number(getItemTotal(item).toFixed(2)).toLocaleString("en-IN")}`, readOnly: true, className: "text-right font-medium" })] }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsx(Button, { type: "button", size: "icon", variant: "ghost", onClick: () => removeItem(index), disabled: invoice.items.length === 1, children: _jsx(Trash2, { className: "h-4 w-4 text-muted-foreground" }) }) })] }, index))) })] }) }), _jsxs("div", { className: "ml-auto w-full max-w-sm rounded-lg border border-border/70 bg-muted/20 p-4", children: [_jsx("p", { className: "mb-3 text-sm font-medium", children: "Summary" }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between text-muted-foreground", children: [_jsx("span", { children: "Subtotal" }), _jsxs("span", { children: ["Rs.", Number(invoiceTotals.subtotal.toFixed(2)).toLocaleString("en-IN")] })] }), _jsxs("div", { className: "flex justify-between text-muted-foreground", children: [_jsx("span", { children: "Tax" }), _jsxs("span", { children: ["Rs.", Number(invoiceTotals.taxAmount.toFixed(2)).toLocaleString("en-IN")] })] }), _jsxs("div", { className: "flex justify-between border-t border-border pt-2 text-base font-semibold", children: [_jsx("span", { children: "Total" }), _jsxs("span", { children: ["Rs.", Number(invoiceTotals.total.toFixed(2)).toLocaleString("en-IN")] })] })] })] })] })] }), _jsxs(DialogFooter, { className: "gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => setInvoiceOpen(false), children: "Cancel" }), _jsx(Button, { variant: "secondary", onClick: () => setPreviewOpen(true), children: "Preview" }), _jsxs(Button, { onClick: downloadPdf, children: [_jsx(Download, { className: "mr-1 h-4 w-4" }), " Download PDF"] })] })] }) }), _jsx(Dialog, { open: previewOpen, onOpenChange: setPreviewOpen, children: _jsxs(DialogContent, { className: "left-auto right-0 top-0 h-dvh max-h-screen max-w-4xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:rounded-none", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Invoice preview" }) }), _jsx(InvoicePreview, { invoice: invoice }), _jsxs(DialogFooter, { className: "gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => setPreviewOpen(false), children: "Close" }), _jsxs(Button, { onClick: downloadPdf, children: [_jsx(Download, { className: "mr-1 h-4 w-4" }), " Download PDF"] })] })] }) })] }));
}
function DesignOption({ value, label, current, }) {
    return (_jsxs("label", { className: cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium", current === value ? "border-primary bg-[image:var(--gradient-soft)]" : "border-border bg-card"), children: [_jsx(RadioGroupItem, { value: value }), label] }));
}
function Field({ label, value, onChange, type = "text", }) {
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: label }), _jsx(Input, { type: type, value: value, onChange: (e) => onChange(e.target.value) })] }));
}
function InvoicePreview({ invoice }) {
    const totals = getInvoiceTotals(invoice);
    return (_jsxs("div", { className: cn("min-h-[520px] rounded-lg border bg-white p-6 text-slate-950 shadow-sm", invoice.design === "professional" && "border-slate-900"), children: [_jsxs("div", { className: cn("mb-8 flex items-start justify-between border-b pb-5", invoice.design === "professional" && "border-slate-900 bg-slate-950 p-5 text-white"), children: [_jsxs("div", { children: [invoice.logoDataUrl ? (_jsx("img", { src: invoice.logoDataUrl, alt: "Factrova logo", className: "mb-3 h-12 max-w-40 object-contain" })) : null, _jsx("p", { className: "text-2xl font-bold", children: "Factrova" }), _jsx("p", { className: cn("mt-1 text-sm", invoice.design === "professional" ? "text-slate-300" : "text-slate-500"), children: "Factory Operations Hub" })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-wide", children: "Invoice" }), _jsx("p", { className: "mt-1 font-semibold", children: invoice.invoiceNo }), _jsx("p", { className: cn("text-sm", invoice.design === "professional" ? "text-slate-300" : "text-slate-500"), children: formatDateTimeCompact(invoice.date) })] })] }), _jsxs("div", { className: "mb-6 grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-500", children: "Address" }), _jsx("div", { className: "mt-1 text-sm text-slate-500", children: invoice.billToAddress.split("\n").map((line, index) => (_jsx("p", { children: line }, index))) })] }), _jsxs("div", { className: "sm:text-right", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-500", children: "Status" }), _jsx("p", { className: "mt-1 font-semibold", children: "Draft" })] })] }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: cn("border-b text-left", invoice.design === "professional" && "bg-slate-100"), children: [_jsx("th", { className: "px-3 py-2 font-semibold", children: "Name" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Qty" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Price" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Tax" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Total" })] }) }), _jsx("tbody", { children: invoice.items.map((item, index) => (_jsxs("tr", { className: "border-b", children: [_jsx("td", { className: "px-3 py-3", children: item.name || "Untitled item" }), _jsx("td", { className: "px-3 py-3 text-right", children: Number(item.quantity.toFixed(2)) }), _jsxs("td", { className: "px-3 py-3 text-right", children: ["Rs.", Number(item.price.toFixed(2)).toLocaleString("en-IN")] }), _jsxs("td", { className: "px-3 py-3 text-right", children: ["Rs.", Number(getItemTax(item).toFixed(2)).toLocaleString("en-IN"), " (", Number(item.tax.toFixed(2)), "%)"] }), _jsxs("td", { className: "px-3 py-3 text-right", children: ["Rs.", Number(getItemTotal(item).toFixed(2)).toLocaleString("en-IN")] })] }, index))) })] }), _jsxs("div", { className: "ml-auto mt-6 w-full max-w-xs space-y-2 text-sm", children: [_jsx(TotalRow, { label: "Subtotal", value: totals.subtotal }), _jsx(TotalRow, { label: "Tax", value: totals.taxAmount }), _jsxs("div", { className: "flex justify-between border-t pt-2 text-base font-bold", children: [_jsx("span", { children: "Total" }), _jsxs("span", { children: ["Rs.", Number(totals.total.toFixed(2)).toLocaleString("en-IN")] })] })] })] }));
}
function TotalRow({ label, value }) {
    return (_jsxs("div", { className: "flex justify-between text-slate-600", children: [_jsx("span", { children: label }), _jsxs("span", { children: ["Rs.", Number(value.toFixed(2)).toLocaleString("en-IN")] })] }));
}
function getItemSubtotal(item) {
    return item.quantity * item.price;
}
function getItemTax(item) {
    return Math.round((getItemSubtotal(item) * item.tax) / 100);
}
function getItemTotal(item) {
    return getItemSubtotal(item) + getItemTax(item);
}
function getInvoiceTotals(invoice) {
    const subtotal = invoice.items.reduce((sum, item) => sum + getItemSubtotal(item), 0);
    const taxAmount = invoice.items.reduce((sum, item) => sum + getItemTax(item), 0);
    return {
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
    };
}
function invoiceDocument(invoice) {
    const totals = getInvoiceTotals(invoice);
    const professional = invoice.design === "professional";
    const logo = invoice.logoDataUrl
        ? `<img src="${escapeHtml(invoice.logoDataUrl)}" alt="Factrova logo" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:12px;" />`
        : "";
    const billToAddress = invoice.billToAddress
        .split("\n")
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("");
    const itemRows = invoice.items.map((item) => `
        <tr>
          <td>${escapeHtml(item.name || "Untitled item")}</td>
          <td>${item.quantity}</td>
          <td>Rs.${item.price.toLocaleString("en-IN")}</td>
          <td>Rs.${getItemTax(item).toLocaleString("en-IN")} (${item.tax}%)</td>
          <td>Rs.${getItemTotal(item).toLocaleString("en-IN")}</td>
        </tr>
      `).join("");
    return `<!doctype html>
<html>
<head>
  <title>${escapeHtml(invoice.invoiceNo)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; }
    .invoice { border: 1px solid ${professional ? "#0f172a" : "#e2e8f0"}; padding: 28px; }
    .header { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 28px; ${professional ? "background:#0f172a;color:white;padding:24px;" : ""} }
    h1 { margin: 0; font-size: 28px; }
    h2 { margin-bottom: 6px; }
    p { margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 12px; text-align: left; }
    th:nth-child(n+2), td:nth-child(n+2) { text-align: right; white-space: nowrap; }
    .muted { color: #64748b; }
    .bill-to { margin-top: 4px; line-height: 1.5; }
    .totals { margin-left: auto; width: 280px; margin-top: 24px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total { border-top: 1px solid #e2e8f0; font-weight: 700; font-size: 18px; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>${logo}<h1>Factrova</h1><p class="muted">Factory Operations Hub</p></div>
      <div style="text-align:right"><p>INVOICE</p><strong>${escapeHtml(invoice.invoiceNo)}</strong><p>${escapeHtml(formatDateTimeCompact(invoice.date))}</p></div>
    </div>
    <p class="muted">Address</p>
    <div class="muted bill-to">${billToAddress}</div>
    <table>
      <thead><tr><th>Name</th><th>Qty</th><th>Price</th><th>Tax</th><th>Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>Rs.${totals.subtotal.toLocaleString("en-IN")}</span></div>
      <div class="row"><span>Tax</span><span>Rs.${totals.taxAmount.toLocaleString("en-IN")}</span></div>
      <div class="row total"><span>Total</span><span>Rs.${totals.total.toLocaleString("en-IN")}</span></div>
    </div>
  </div>
</body>
</html>`;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
