import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FilePlus2,
  IndianRupee,
  Plus,
  TrendingUp,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  projects as initialProjects,
  transactions as initialTransactions,
  revenueByMonth as initialRevenueByMonth,
  type Project,
  type ProjectStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";
import { canPageAction } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/finance")({
  head: () => ({ meta: [{ title: "Accounts & Finance - Factrova" }] }),
  component: Finance,
});

type InvoiceDesign = "standard" | "professional";

type InvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  tax: number;
};

type InvoiceForm = {
  design: InvoiceDesign;
  invoiceNo: string;
  date: string;
  billToAddress: string;
  logoDataUrl: string;
  logoName: string;
  items: InvoiceItem[];
};

const defaultInvoice: InvoiceForm = {
  design: "standard",
  invoiceNo: "",
  date: "",
  billToAddress: "",
  logoDataUrl: "",
  logoName: "",
  items: [],
};

function Finance() {
  const canAdd = canPageAction("finance", "add");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceForm>(defaultInvoice);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [revenueByMonth, setRevenueByMonth] = useState(initialRevenueByMonth);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectRows, transactionRows] = await Promise.all([
          api.list<{
            id: string;
            code: string;
            name: string;
            customerName: string;
            status: ProjectStatus;
            progress: number;
            delivery?: string | null;
            amount: number;
          }>("projects"),
          api.list<{
            id: string;
            transactionDate: string;
            description: string;
            type: "credit" | "debit";
            amount: number;
          }>("transactions"),
        ]);
        setProjects(
          (projectRows ?? []).map((row) => ({
            id: row.code,
            name: row.name,
            customer: row.customerName,
            status: row.status as ProjectStatus,
            progress: row.progress,
            delivery: row.delivery ?? "TBD",
            amount: Number(row.amount),
          })),
        );
        const rows = (transactionRows ?? []).map((row) => ({
          id: row.id,
          date: row.transactionDate,
          desc: row.description,
          type: row.type as "credit" | "debit",
          amount: Number(row.amount),
        }));
        setTransactions(rows);
        const monthTotals = rows
          .filter((row) => row.type === "credit")
          .reduce<Record<string, number>>((totals, row) => {
            const month = new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(row.date));
            totals[month] = (totals[month] ?? 0) + row.amount;
            return totals;
          }, {});
        if (Object.keys(monthTotals).length) {
          setRevenueByMonth(Object.entries(monthTotals).map(([month, revenue]) => ({ month, revenue })));
        }
      } catch (error) {
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
    if (!win) return;
    win.document.write(invoiceDocument(invoice));
    win.document.close();
    win.focus();
    win.print();
  };

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setInvoice({
      ...invoice,
      items: invoice.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    });
  };

  const addItem = () => {
    setInvoice({
      ...invoice,
      items: [...invoice.items, { name: "", quantity: 1, price: 0, tax: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (invoice.items.length === 1) return;
    setInvoice({
      ...invoice,
      items: invoice.items.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const uploadLogo = (file?: File) => {
    if (!file) return;

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

  const openInvoicePreview = (row: (typeof invoices)[number]) => {
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

  return (
    <DashboardLayout title="Accounts & Finance">
      <div className="mb-4 flex justify-end">
        {canAdd ? <Button onClick={() => setInvoiceOpen(true)}>
          <FilePlus2 className="mr-1 h-4 w-4" /> Create Invoice
        </Button> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-2 flex items-center text-2xl font-bold tracking-tight">
                      <IndianRupee className="h-5 w-5" />
                      {Number(s.value.toFixed(2)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg} ${s.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="sales" className="mt-6">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <Card className="border-border/60 shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base">Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Invoice</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((row) => (
                      <tr
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openInvoicePreview(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openInvoicePreview(row);
                          }
                        }}
                        className="cursor-pointer border-b border-border/50 outline-none last:border-0 hover:bg-muted/30 focus:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-medium">{row.id}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTimeCompact(row.date)}</td>
                        <td className="px-4 py-3">{row.customer}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.project}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                            row.status === "paid"
                              ? "border-success/20 bg-success/10 text-success"
                              : row.status === "pending"
                                ? "border-warning/30 bg-warning/15 text-warning-foreground"
                                : "border-border bg-muted/40 text-muted-foreground"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          Rs.{row.amount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="border-border/60 shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base">Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTimeCompact(t.date)}</td>
                        <td className="px-4 py-3 font-medium">{t.desc}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                            t.type === "credit" ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"
                          }`}>
                            {t.type === "credit" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                            {t.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${t.type === "credit" ? "text-success" : "text-destructive"}`}>{t.type === "credit" ? "+" : "-"} Rs.{Number(t.amount.toFixed(2)).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="left-auto right-0 top-0 h-dvh max-h-screen max-w-5xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:rounded-none">
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => uploadLogo(e.target.files?.[0])}
                    />
                    {invoice.logoDataUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInvoice({ ...invoice, logoDataUrl: "", logoName: "" })}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  {invoice.logoName ? (
                    <p className="text-xs text-muted-foreground">{invoice.logoName}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Textarea
                    value={invoice.billToAddress}
                    onChange={(e) => setInvoice({ ...invoice, billToAddress: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Invoice Design</Label>
                  <RadioGroup
                    value={invoice.design}
                    onValueChange={(v) => setInvoice({ ...invoice, design: v as InvoiceDesign })}
                    className="grid grid-cols-2 gap-2"
                  >
                    <DesignOption value="standard" label="Standard" current={invoice.design} />
                    <DesignOption value="professional" label="Professional" current={invoice.design} />
                  </RadioGroup>
                </div>
                <Field label="Invoice No" value={invoice.invoiceNo} onChange={(v) => setInvoice({ ...invoice, invoiceNo: v })} />
                <Field label="Date" type="date" value={invoice.date} onChange={(v) => setInvoice({ ...invoice, date: v })} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-4 w-4" /> Add item
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="w-28 px-3 py-2 text-right font-medium">Quantity</th>
                      <th className="w-36 px-3 py-2 text-right font-medium">Price</th>
                      <th className="w-28 px-3 py-2 text-right font-medium">Tax %</th>
                      <th className="w-40 px-3 py-2 text-right font-medium">Total</th>
                      <th className="w-12 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <Label className="sr-only">Item name</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(index, { name: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Label className="sr-only">Quantity</Label>
                          <Input
                            type="number"
                            value={String(item.quantity)}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Label className="sr-only">Price</Label>
                          <Input
                            type="number"
                            value={String(item.price)}
                            onChange={(e) => updateItem(index, { price: Number(e.target.value) || 0 })}
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Label className="sr-only">Tax percent</Label>
                          <Input
                            type="number"
                            value={String(item.tax)}
                            onChange={(e) => updateItem(index, { tax: Number(e.target.value) || 0 })}
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Label className="sr-only">Total</Label>
                          <Input
                            value={`Rs.${Number(getItemTotal(item).toFixed(2)).toLocaleString("en-IN")}`}
                            readOnly
                            className="text-right font-medium"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeItem(index)}
                            disabled={invoice.items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto w-full max-w-sm rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="mb-3 text-sm font-medium">Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>Rs.{Number(invoiceTotals.subtotal.toFixed(2)).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span><span>Rs.{Number(invoiceTotals.taxAmount.toFixed(2)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                    <span>Total</span><span>Rs.{Number(invoiceTotals.total.toFixed(2)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => setPreviewOpen(true)}>Preview</Button>
            <Button onClick={downloadPdf}>
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="left-auto right-0 top-0 h-dvh max-h-screen max-w-4xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:rounded-none">
          <DialogHeader>
            <DialogTitle>Invoice preview</DialogTitle>
          </DialogHeader>

          <InvoicePreview invoice={invoice} />

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={downloadPdf}>
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function DesignOption({
  value,
  label,
  current,
}: {
  value: InvoiceDesign;
  label: string;
  current: InvoiceDesign;
}) {
  return (
    <label className={cn(
      "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium",
      current === value ? "border-primary bg-[image:var(--gradient-soft)]" : "border-border bg-card",
    )}>
      <RadioGroupItem value={value} />
      {label}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function InvoicePreview({ invoice }: { invoice: InvoiceForm }) {
  const totals = getInvoiceTotals(invoice);
  return (
    <div className={cn(
      "min-h-[520px] rounded-lg border bg-white p-6 text-slate-950 shadow-sm",
      invoice.design === "professional" && "border-slate-900",
    )}>
      <div className={cn(
        "mb-8 flex items-start justify-between border-b pb-5",
        invoice.design === "professional" && "border-slate-900 bg-slate-950 p-5 text-white",
      )}>
        <div>
          {invoice.logoDataUrl ? (
            <img src={invoice.logoDataUrl} alt="Factrova logo" className="mb-3 h-12 max-w-40 object-contain" />
          ) : null}
          <p className="text-2xl font-bold">Factrova</p>
          <p className={cn("mt-1 text-sm", invoice.design === "professional" ? "text-slate-300" : "text-slate-500")}>
            Factory Operations Hub
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide">Invoice</p>
          <p className="mt-1 font-semibold">{invoice.invoiceNo}</p>
          <p className={cn("text-sm", invoice.design === "professional" ? "text-slate-300" : "text-slate-500")}>
            {formatDateTimeCompact(invoice.date)}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Address</p>
          <div className="mt-1 text-sm text-slate-500">
            {invoice.billToAddress.split("\n").map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-1 font-semibold">Draft</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className={cn("border-b text-left", invoice.design === "professional" && "bg-slate-100")}>
            <th className="px-3 py-2 font-semibold">Name</th>
            <th className="px-3 py-2 text-right font-semibold">Qty</th><th className="px-3 py-2 text-right font-semibold">Price</th><th className="px-3 py-2 text-right font-semibold">Tax</th>
            <th className="px-3 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index} className="border-b">
              <td className="px-3 py-3">{item.name || "Untitled item"}</td>
              <td className="px-3 py-3 text-right">{Number(item.quantity.toFixed(2))}</td>
              <td className="px-3 py-3 text-right">Rs.{Number(item.price.toFixed(2)).toLocaleString("en-IN")}</td>
              <td className="px-3 py-3 text-right">
                Rs.{Number(getItemTax(item).toFixed(2)).toLocaleString("en-IN")} ({Number(item.tax.toFixed(2))}%)
              </td>
              <td className="px-3 py-3 text-right">Rs.{Number(getItemTotal(item).toFixed(2)).toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
        <TotalRow label="Subtotal" value={totals.subtotal} />
        <TotalRow label="Tax" value={totals.taxAmount} />
        <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>Rs.{Number(totals.total.toFixed(2)).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>Rs.{Number(value.toFixed(2)).toLocaleString("en-IN")}</span>
    </div>
  );
}

function getItemSubtotal(item: InvoiceItem) {
  return item.quantity * item.price;
}

function getItemTax(item: InvoiceItem) {
  return Math.round((getItemSubtotal(item) * item.tax) / 100);
}

function getItemTotal(item: InvoiceItem) {
  return getItemSubtotal(item) + getItemTax(item);
}

function getInvoiceTotals(invoice: InvoiceForm) {
  const subtotal = invoice.items.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const taxAmount = invoice.items.reduce((sum, item) => sum + getItemTax(item), 0);
  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

function invoiceDocument(invoice: InvoiceForm) {
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
