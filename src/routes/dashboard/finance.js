import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { PaginationControls } from "@/components/pagination-controls.js";
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
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api, apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { formatDateTimeCompact, formatDateToDDMMYYYY } from "@/lib/date-format";
import { canPageAction, getActiveFactoryId } from "@/lib/auth";

const PAGE_LIMIT = 20;
const emptyCompanyProfile = {
  companyName: "",
  gstin: "",
  countryCode: "+91",
  phone: "",
  email: "",
  city: "",
  state: "",
  pincode: "",
  address: "",
  logoUrl: "",
};

const defaultInvoice = {
  id: "",
  projectId: "",
  design: "standard",
  invoiceNo: "",
  issueDate: "",
  dueDate: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  projectName: "",
  projectCode: "",
  billToAddress: "",
  logoDataUrl: "",
  logoName: "",
  status: "draft",
  paymentStatus: "pending",
  notes: "",
  discountType: "amount",
  discountValue: 0,
  discountAmount: 0,
  tax: 0,
  taxRate: 0,
  subtotal: 0,
  total: 0,
  lines: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
};

function formatPhoneDisplay(countryCode, phone) {
  const normalizedPhone = String(phone || "").trim();
  const normalizedCountryCode = String(countryCode || "").trim();
  if (normalizedCountryCode && normalizedPhone) {
    return `${normalizedCountryCode} ${normalizedPhone}`;
  }
  return normalizedPhone || "";
}

export function Finance() {
  const canAdd = canPageAction("finance", "add");
  const canEdit = canPageAction("finance", "edit");
  const [activeTab, setActiveTab] = useState("sales");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoice, setInvoice] = useState(defaultInvoice);

  const [invoices, setInvoices] = useState([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePagination, setInvoicePagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [transactions, setTransactions] = useState([]);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPagination, setTransactionPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [summaryTransactions, setSummaryTransactions] = useState([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [companyProfile, setCompanyProfile] = useState(emptyCompanyProfile);

  useEffect(() => {
    const activeFactoryId = getActiveFactoryId();
    if (!activeFactoryId) return;

    const loadCompanyProfile = async () => {
      try {
        const data = await apiRootRequest(API_PATHS.factories.settings(activeFactoryId));
        setCompanyProfile({
          ...emptyCompanyProfile,
          ...(data?.companyProfile ?? {}),
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to load factory company profile",
        );
      }
    };

    void loadCompanyProfile();
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const rows = await api.list("transactions");
        setSummaryTransactions(Array.isArray(rows) ? rows : (rows?.items ?? []));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load finance summary");
      }
    };

    loadSummary();
  }, [refreshToken]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await api.list("invoices", {
          page: invoicePage,
          limit: PAGE_LIMIT,
          search: invoiceSearch.trim() || undefined,
        });
        setInvoices(Array.isArray(data) ? data : (data?.items ?? []));
        setInvoicePagination(
          Array.isArray(data)
            ? {
                page: invoicePage,
                limit: PAGE_LIMIT,
                total: data.length,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
              }
            : (data?.pagination ?? {
                page: invoicePage,
                limit: PAGE_LIMIT,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              }),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load invoices");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [invoicePage, invoiceSearch, refreshToken]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await api.list("transactions", {
          page: transactionPage,
          limit: PAGE_LIMIT,
          search: transactionSearch.trim() || undefined,
        });
        setTransactions(Array.isArray(data) ? data : (data?.items ?? []));
        setTransactionPagination(
          Array.isArray(data)
            ? {
                page: transactionPage,
                limit: PAGE_LIMIT,
                total: data.length,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
              }
            : (data?.pagination ?? {
                page: transactionPage,
                limit: PAGE_LIMIT,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              }),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load transactions");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [transactionPage, transactionSearch, refreshToken]);

  const summaryRows = useMemo(
    () =>
      summaryTransactions.map((row) => ({
        ...row,
        amount: Number(row.amount ?? 0),
      })),
    [summaryTransactions],
  );

  const credit = summaryRows
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const debit = summaryRows.filter((t) => t.type === "debit").reduce((sum, t) => sum + t.amount, 0);
  const balance = credit - debit;

  const revenueByMonth = useMemo(() => {
    const monthTotals = summaryRows
      .filter((row) => row.type === "credit")
      .reduce((totals, row) => {
        const month = new Intl.DateTimeFormat("en", { month: "short" }).format(
          new Date(row.transactionDate ?? row.date ?? Date.now()),
        );
        totals[month] = (totals[month] ?? 0) + row.amount;
        return totals;
      }, {});

    return Object.entries(monthTotals).map(([month, revenue]) => ({ month, revenue }));
  }, [summaryRows]);

  const stats = [
    {
      label: "Total Income",
      value: credit,
      icon: ArrowUpRight,
      tone: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Total Expense",
      value: debit,
      icon: ArrowDownLeft,
      tone: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Net Balance",
      value: balance,
      icon: Wallet,
      tone: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Avg. Monthly Revenue",
      value: revenueByMonth.length
        ? Math.round(
            revenueByMonth.reduce((sum, row) => sum + row.revenue, 0) / revenueByMonth.length,
          )
        : 0,
      icon: TrendingUp,
      tone: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  const invoiceTotals = getInvoiceTotals(invoice);
  const isEditingInvoice = Boolean(invoice.id);
  const isDraftInvoice = invoice.status === "draft";
  const isInvoiceEditable = isDraftInvoice && canEdit;

  const resetInvoice = () => {
    setInvoice({
      ...defaultInvoice,
      issueDate: new Date().toISOString().slice(0, 10),
      lines: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    });
  };

  const openCreateInvoice = () => {
    resetInvoice();
    setInvoiceOpen(true);
  };

  const openEditInvoice = (row = invoice) => {
    const mappedInvoice = mapInvoiceRecordToEditor(row);
    setInvoice(mappedInvoice);
    setPreviewOpen(false);
    setInvoiceOpen(true);
  };

  const waitForPrintAssets = async (rootElement) => {
    if (!rootElement) return;
    const images = Array.from(rootElement.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      }),
    );
  };

  const downloadPdf = async () => {
    try {
      const html = invoiceDocument(invoice, companyProfile);
      const iframe = document.createElement("iframe");
      let hasPrinted = false;
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");

      const cleanup = () => {
        window.setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      };

      iframe.onload = async () => {
        const frameWindow = iframe.contentWindow;
        const frameDocument = iframe.contentDocument || frameWindow?.document;
        if (!frameWindow || !frameDocument) {
          cleanup();
          toast.error("Unable to open invoice print view");
          return;
        }
        if (hasPrinted) {
          return;
        }
        if (!frameDocument.body?.innerHTML?.trim()) {
          return;
        }
        hasPrinted = true;

        // Add extra CSS to remove headers/footers
        const style = frameDocument.createElement("style");
        style.textContent = `
        @page {
          margin: 0;
          @top-center { content: none !important; }
          @bottom-center { content: none !important; }
        }
        body {
          margin: 0;
          padding: 0;
        }
      `;
        frameDocument.head.appendChild(style);

        await waitForPrintAssets(frameDocument.body);
        await new Promise((resolve) => setTimeout(resolve, 120));

        // Try to print with no headers
        frameWindow.print();
        cleanup();
      };

      document.body.appendChild(iframe);
      const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
      if (!frameDocument) {
        cleanup();
        toast.error("Unable to prepare invoice print view");
        return;
      }
      frameDocument.open();
      frameDocument.write(html);
      frameDocument.close();
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Unable to open invoice print view");
    }
  };
  const updateLine = (index, updates) => {
    setInvoice((current) => {
      const updatedLines = current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...updates } : line,
      );
      const linesWithTotal = updatedLines.map((line) => ({
        ...line,
        total: (line.quantity || 0) * (line.unitPrice || 0),
      }));
      return {
        ...current,
        lines: linesWithTotal,
        subtotal: null,
        tax: null,
        total: null,
      };
    });
  };

  const addLine = () => {
    setInvoice((current) => ({
      ...current,
      subtotal: null,
      tax: null,
      total: null,
      lines: [...current.lines, { description: "", quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const removeLine = (index) => {
    setInvoice((current) => ({
      ...current,
      subtotal: null,
      tax: null,
      total: null,
      lines:
        current.lines.length === 1
          ? current.lines
          : current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const uploadLogo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInvoice((current) => ({
        ...current,
        logoDataUrl: typeof reader.result === "string" ? reader.result : "",
        logoName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const openInvoicePreview = (row) => {
    const mappedInvoice = mapInvoiceRecordToEditor(row);
    setInvoice(mappedInvoice);
    setPreviewOpen(true);
  };

  const saveInvoice = async () => {
    if (!invoice.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!invoice.issueDate) {
      toast.error("Invoice date is required");
      return;
    }
    if (!invoice.lines.some((line) => line.description.trim())) {
      toast.error("Add at least one invoice line item");
      return;
    }

    const payload = {
      design: invoice.design,
      invoiceNumber: invoice.invoiceNo.trim() || undefined,
      customerName: invoice.customerName.trim(),
      customerEmail: invoice.customerEmail.trim() || null,
      customerPhone: invoice.customerPhone.trim() || null,
      billToAddress: invoice.billToAddress.trim() || null,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate || null,
      status: invoice.status || "draft",
      paymentStatus: invoice.paymentStatus || "pending",
      notes: invoice.notes.trim() || null,
      projectId: invoice.projectId || null,
      projectCode: invoice.projectCode.trim() || null,
      projectName: invoice.projectName.trim() || null,
      logoDataUrl: invoice.logoDataUrl || null,
      logoName: invoice.logoName || null,
      lines: invoice.lines
        .filter((line) => line.description.trim())
        .map((line) => ({
          description: line.description.trim(),
          quantity: Number(line.quantity) || 0,
          unitPrice: Number(line.unitPrice) || 0,
          total: (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
        })),
      subtotal: invoiceTotals.subtotal,
      discountType: invoice.discountType || "amount",
      discountValue: Number(invoice.discountValue) || 0,
      discountAmount: invoiceTotals.discountAmount,
      tax: invoiceTotals.taxAmount,
      taxRate: Number(invoice.taxRate) || 0,
      total: invoiceTotals.total,
    };

    setSavingInvoice(true);
    try {
      const saved = isEditingInvoice
        ? await api.update("invoices", invoice.id, payload)
        : await api.create("invoices", payload);
      toast.success(isEditingInvoice ? "Invoice updated" : "Invoice created");
      setInvoice(mapInvoiceRecordToEditor(saved));
      setInvoiceOpen(false);
      setPreviewOpen(true);
      setInvoicePage(1);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create invoice");
    } finally {
      setSavingInvoice(false);
    }
  };

  const updatePaymentStatus = async (invoiceId, newStatus) => {
    try {
      await api.update("invoices", invoiceId, {
        paymentStatus: newStatus,
      });
      toast.success("Payment status updated");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update payment status");
    }
  };

  return (
    <DashboardLayout title="Accounts & Finance">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
        {canAdd ? (
          <Button className="w-full sm:w-auto" onClick={openCreateInvoice}>
            <FilePlus2 className="mr-1 h-4 w-4" /> Create Invoice
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 flex items-center text-2xl font-bold tracking-tight">
                      <IndianRupee className="h-5 w-5" />
                      {Number(stat.value.toFixed(2)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg} ${stat.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <Card className="border-border/60 shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Invoices</CardTitle>
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoicePage(1);
                    setInvoiceSearch(e.target.value);
                  }}
                  placeholder="Search invoice, customer, project"
                  className="pl-9"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="space-y-3 p-4 md:hidden">
                {invoices.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openInvoicePreview(row)}
                    className="w-full rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm transition hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{row.invoiceNumber}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{row.customerName}</p>
                      </div>
                      <InvoiceStatusBadge status={row.status} />
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <MobileInfoRow
                        label="Project"
                        value={row.projectName || row.projectCode || "-"}
                      />
                      <MobileInfoRow label="Date" value={formatDateTimeCompact(row.issueDate)} />
                      <MobileInfoRow
                        label="Amount"
                        value={`Rs.${Number(row.total ?? 0).toLocaleString("en-IN")}`}
                      />
                    </div>
                  </button>
                ))}

                {invoices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    No invoices found.
                  </div>
                ) : null}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Invoice</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
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
                        <td className="px-4 py-3 font-medium">{row.invoiceNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTimeCompact(row.issueDate)}
                        </td>
                        <td className="px-4 py-3">{row.customerName}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.projectName || row.projectCode || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3">
                          <PaymentStatusBadge status={row.paymentStatus || "pending"} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          Rs.{Number(row.total ?? 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}

                    {invoices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          No invoices found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="px-4 pb-4 pt-2">
                <PaginationControls
                  page={invoicePagination.page}
                  totalPages={invoicePagination.totalPages}
                  total={invoicePagination.total}
                  label="invoices"
                  loading={false}
                  onPrevious={() => setInvoicePage((current) => Math.max(1, current - 1))}
                  onNext={() =>
                    setInvoicePage((current) =>
                      Math.min(invoicePagination.totalPages || 1, current + 1),
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="border-border/60 shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Transactions</CardTitle>
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={transactionSearch}
                  onChange={(e) => {
                    setTransactionPage(1);
                    setTransactionSearch(e.target.value);
                  }}
                  placeholder="Search description or category"
                  className="pl-9"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="space-y-3 p-4 md:hidden">
                {transactions.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          {row.description || row.category}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDateTimeCompact(row.transactionDate ?? row.date)}
                        </p>
                      </div>
                      <TransactionTypeBadge type={row.type} />
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <MobileInfoRow label="Category" value={row.category || "-"} />
                      <MobileInfoRow
                        label="Amount"
                        value={`${row.type === "credit" ? "+" : "-"} Rs.${Number(row.amount ?? 0).toLocaleString("en-IN")}`}
                      />
                    </div>
                  </div>
                ))}

                {transactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    No transactions found.
                  </div>
                ) : null}
              </div>

              <div className="hidden overflow-x-auto md:block">
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
                    {transactions.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTimeCompact(row.transactionDate ?? row.date)}
                        </td>
                        <td className="px-4 py-3 font-medium">{row.description || row.category}</td>
                        <td className="px-4 py-3">
                          <TransactionTypeBadge type={row.type} />
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${row.type === "credit" ? "text-success" : "text-destructive"}`}
                        >
                          {row.type === "credit" ? "+" : "-"} Rs.
                          {Number(row.amount ?? 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}

                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          No transactions found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="px-4 pb-4 pt-2">
                <PaginationControls
                  page={transactionPagination.page}
                  totalPages={transactionPagination.totalPages}
                  total={transactionPagination.total}
                  label="transactions"
                  loading={false}
                  onPrevious={() => setTransactionPage((current) => Math.max(1, current - 1))}
                  onNext={() =>
                    setTransactionPage((current) =>
                      Math.min(transactionPagination.totalPages || 1, current + 1),
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={invoiceOpen}
        onOpenChange={(nextOpen) => {
          setInvoiceOpen(nextOpen);
          if (!nextOpen) resetInvoice();
        }}
      >
        <DialogContent className="left-auto right-0 top-0 h-dvh max-h-screen max-w-5xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:rounded-none">
          <DialogHeader>
            <DialogTitle>{isEditingInvoice ? "Edit invoice" : "New invoice"}</DialogTitle>
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
                      disabled={!isInvoiceEditable}
                    />
                    {invoice.logoDataUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setInvoice((current) => ({ ...current, logoDataUrl: "", logoName: "" }))
                        }
                        disabled={!isInvoiceEditable}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  {invoice.logoName ? (
                    <p className="text-xs text-muted-foreground">{invoice.logoName}</p>
                  ) : null}
                </div>

                <Field
                  label="Customer Name"
                  value={invoice.customerName}
                  onChange={(value) =>
                    setInvoice((current) => ({ ...current, customerName: value }))
                  }
                  disabled={!isInvoiceEditable}
                />
                <Field
                  label="Customer Email"
                  type="email"
                  value={invoice.customerEmail}
                  onChange={(value) =>
                    setInvoice((current) => ({ ...current, customerEmail: value }))
                  }
                  disabled={!isInvoiceEditable}
                />
                <Field
                  label="Customer Phone"
                  value={invoice.customerPhone}
                  onChange={(value) =>
                    setInvoice((current) => ({ ...current, customerPhone: value }))
                  }
                  disabled={!isInvoiceEditable}
                />
                <Field
                  label="Project Name"
                  value={invoice.projectName}
                  onChange={(value) =>
                    setInvoice((current) => ({ ...current, projectName: value }))
                  }
                  disabled={!isInvoiceEditable}
                />

                <div className="space-y-1.5">
                  <Label>Bill To Address</Label>
                  <Textarea
                    value={invoice.billToAddress}
                    onChange={(e) =>
                      setInvoice((current) => ({ ...current, billToAddress: e.target.value }))
                    }
                    rows={4}
                    disabled={!isInvoiceEditable}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Invoice Design</Label>
                  <RadioGroup
                    value={invoice.design}
                    onValueChange={(value) =>
                      setInvoice((current) => ({ ...current, design: value }))
                    }
                    className="grid grid-cols-2 gap-2"
                    disabled={!isInvoiceEditable}
                  >
                    <DesignOption value="standard" label="Standard" current={invoice.design} />
                    <DesignOption
                      value="professional"
                      label="Professional"
                      current={invoice.design}
                    />
                  </RadioGroup>
                </div>

                <Field
                  label="Invoice No"
                  value={invoice.invoiceNo}
                  onChange={(value) => setInvoice((current) => ({ ...current, invoiceNo: value }))}
                  disabled={!isInvoiceEditable}
                />
                <Field
                  label="Issue Date"
                  type="date"
                  value={invoice.issueDate}
                  onChange={(value) => setInvoice((current) => ({ ...current, issueDate: value }))}
                  disabled={!isInvoiceEditable}
                />
                <Field
                  label="Due Date"
                  type="date"
                  value={invoice.dueDate}
                  onChange={(value) => setInvoice((current) => ({ ...current, dueDate: value }))}
                  disabled={!isInvoiceEditable}
                />

                {isEditingInvoice && (
                  <div className="space-y-1.5">
                    <Label>Invoice Status</Label>
                    <select
                      value={invoice.status || "draft"}
                      onChange={(e) =>
                        setInvoice((current) => ({ ...current, status: e.target.value }))
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      disabled={!isInvoiceEditable}
                    >
                      <option value="draft">Draft</option>
                      <option value="issued">Issued</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Payment Status</Label>
                  <select
                    value={invoice.paymentStatus || "pending"}
                    onChange={(e) =>
                      setInvoice((current) => ({ ...current, paymentStatus: e.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <Field
                  label="Project Code"
                  value={invoice.projectCode}
                  onChange={(value) =>
                    setInvoice((current) => ({ ...current, projectCode: value }))
                  }
                  disabled={!isInvoiceEditable}
                />
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    value={invoice.notes}
                    onChange={(e) =>
                      setInvoice((current) => ({ ...current, notes: e.target.value }))
                    }
                    rows={4}
                    disabled={!isInvoiceEditable}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Line Items</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addLine}
                  disabled={!isInvoiceEditable}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add line
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="w-36 px-3 py-2 text-right font-medium">Unit Price</th>
                      <th className="w-28 px-3 py-2 text-right font-medium">Quantity</th>
                      <th className="w-40 px-3 py-2 text-right font-medium">Total</th>
                      <th className="w-12 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines && invoice.lines.length > 0 ? (
                      invoice.lines.map((line, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <Input
                              value={line.description || ""}
                              onChange={(e) => updateLine(index, { description: e.target.value })}
                              disabled={!isInvoiceEditable}
                              placeholder="Item description"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={String(line.unitPrice || 0)}
                              onChange={(e) =>
                                updateLine(index, { unitPrice: Number(e.target.value) || 0 })
                              }
                              className="text-right"
                              disabled={!isInvoiceEditable}
                              step="0.01"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={String(line.quantity || 0)}
                              onChange={(e) =>
                                updateLine(index, { quantity: Number(e.target.value) || 0 })
                              }
                              className="text-right"
                              disabled={!isInvoiceEditable}
                              step="1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={`Rs.${Number((line.quantity || 0) * (line.unitPrice || 0))
                                .toFixed(2)
                                .toLocaleString("en-IN")}`}
                              readOnly
                              className="text-right font-medium"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeLine(index)}
                              disabled={!isInvoiceEditable || invoice.lines.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                          No line items added yet. Click "Add line" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto w-full max-w-sm rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="mb-3 text-sm font-medium">Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Discount Type</Label>
                      <select
                        value={invoice.discountType || "amount"}
                        onChange={(e) =>
                          setInvoice((current) => ({
                            ...current,
                            discountType: e.target.value,
                            total: null,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        disabled={!isInvoiceEditable}
                      >
                        <option value="amount">Amount</option>
                        <option value="percent">Percent</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Discount Value</Label>
                      <Input
                        type="number"
                        value={String(Number(invoice.discountValue ?? 0))}
                        onChange={(e) =>
                          setInvoice((current) => ({
                            ...current,
                            discountValue: Number(e.target.value) || 0,
                            total: null,
                          }))
                        }
                        disabled={!isInvoiceEditable}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tax Rate %</Label>
                      <Input
                        type="number"
                        value={String(Number(invoice.taxRate ?? 0))}
                        onChange={(e) =>
                          setInvoice((current) => ({
                            ...current,
                            taxRate: Number(e.target.value) || 0,
                            total: null,
                          }))
                        }
                        disabled={!isInvoiceEditable}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tax Amount</Label>
                      <Input
                        type="number"
                        value={String(Number(invoiceTotals.taxAmount ?? 0).toFixed(2))}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>
                      Rs.{Number(invoiceTotals.subtotal.toFixed(2)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {invoiceTotals.discountAmount > 0 ? (
                    <div className="flex justify-between text-emerald-700">
                      <span>
                        Discount
                        {invoice.discountType === "percent"
                          ? ` (${Number(invoice.discountValue || 0)}%)`
                          : ""}
                      </span>
                      <span>
                        -Rs.
                        {Number(invoiceTotals.discountAmount.toFixed(2)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>
                      Rs.{Number(invoiceTotals.taxAmount.toFixed(2)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span>Rs.{Number(invoiceTotals.total.toFixed(2)).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
            {isInvoiceEditable && (
              <Button onClick={saveInvoice} disabled={savingInvoice}>
                {savingInvoice ? "Saving..." : isEditingInvoice ? "Update Invoice" : "Save Invoice"}
              </Button>
            )}
            <Button onClick={downloadPdf}>
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="left-auto right-0 top-0 h-dvh max-h-screen max-w-4xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:rounded-none print:overflow-visible print:h-auto print:max-h-none print:border-0 print:shadow-none print:bg-white print:p-0">
          <DialogHeader className="print:hidden">
            <DialogTitle>Invoice preview</DialogTitle>
          </DialogHeader>
          <div className="print:p-0">
            <InvoicePreview invoice={invoice} companyProfile={companyProfile} />
          </div>
          <DialogFooter className="gap-2 print:hidden">
            {isInvoiceEditable ? (
              <Button variant="secondary" onClick={() => openEditInvoice()}>
                Edit Draft
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Payment Status:</span>
                <select
                  value={invoice.paymentStatus || "pending"}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    updatePaymentStatus(invoice.id, newStatus);
                    setInvoice((current) => ({ ...current, paymentStatus: newStatus }));
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={downloadPdf}>
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function InvoiceStatusBadge({ status }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
        status === "issued"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : status === "draft"
            ? "border-slate-200 bg-slate-100 text-slate-700"
            : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
        status === "paid"
          ? "border-success/20 bg-success/10 text-success"
          : status === "overdue"
            ? "border-destructive/30 bg-destructive/15 text-destructive"
            : status === "cancelled"
              ? "border-border bg-muted/40 text-muted-foreground"
              : "border-warning/30 bg-warning/15 text-warning-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function TransactionTypeBadge({ type }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
        type === "credit"
          ? "border-success/20 bg-success/10 text-success"
          : "border-destructive/20 bg-destructive/10 text-destructive"
      }`}
    >
      {type === "credit" ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownLeft className="h-3 w-3" />
      )}
      {type}
    </span>
  );
}

function MobileInfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}

function DesignOption({ value, label, current }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium",
        current === value
          ? "border-primary bg-[image:var(--gradient-soft)]"
          : "border-border bg-card",
      )}
    >
      <RadioGroupItem value={value} />
      {label}
    </label>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function InvoicePreview({ invoice, companyProfile }) {
  const totals = getInvoiceTotals(invoice);
  const companyPhone = formatPhoneDisplay(companyProfile?.countryCode, companyProfile?.phone);
  const companyLines = [
    ...(companyProfile?.address ? companyProfile.address.split("\n") : []),
    [companyProfile?.city, companyProfile?.state, companyProfile?.pincode]
      .filter(Boolean)
      .join(", "),
  ].filter((line) => line?.trim() !== "");
  const headerLogo = companyProfile?.logoUrl || invoice.logoDataUrl || "";
  const companyName = companyProfile?.companyName || "Factrova";

  return (
    <div
      id="print-wrapper"
      className="min-h-[520px] border bg-white p-6 text-slate-950 shadow-sm print:border-0 print:shadow-none print:p-8"
    >
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          #print-wrapper {
            margin: 0;
            padding: 20px !important;
            min-height: auto !important;
          }
          ::-webkit-scrollbar {
            display: none;
          }
          .no-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Header with Logo and Invoice Info */}
      <div className="mb-6 flex flex-col items-start justify-between border-b pb-4 print:border-b-2 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <div>
            {headerLogo ? (
              <img
                src={headerLogo}
                alt="Company logo"
                className="h-28 w-28 object-contain p-1 print:h-20 print:w-20"
                style={{ filter: 'none', color: 'initial' }}
              />
            ) : null}
            <p className="font-semibold">{companyName}</p>
            {companyLines.map((line, index) => (
              <p key={index} className="text-sm text-slate-500 print:text-xs">
                {line}
              </p>
            ))}
            {companyPhone ? (
              <p className="text-sm text-slate-500 print:text-xs">{companyPhone}</p>
            ) : null}
            {companyProfile?.email ? (
              <p className="text-sm text-slate-500 print:text-xs">{companyProfile.email}</p>
            ) : null}
            {companyProfile?.gstin ? (
              <p className="text-sm text-slate-500 print:text-xs">GSTIN: {companyProfile.gstin}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 sm:mt-0 text-left sm:text-right">
          <h1 className="text-2xl font-bold text-slate-800 print:text-xl">INVOICE</h1>
          <p className="text-sm font-medium text-slate-600">{invoice.invoiceNo || ""}</p>
          <div className="mt-2 space-y-0.5 text-sm print:text-xs">
            <p>
              <span className="text-slate-500">Status:</span>{" "}
              <span className="font-medium capitalize">{invoice.status || "draft"}</span>
            </p>
            <p>
              <span className="text-slate-500">Payment:</span>{" "}
              <span className="font-medium capitalize">{invoice.paymentStatus || "pending"}</span>
            </p>
            {invoice.issueDate && (
              <p>
                <span className="text-slate-500">Date:</span>{" "}
                <span className="font-medium">{formatDateToDDMMYYYY(invoice.issueDate)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bill To</p>
        <p className="mt-1 font-semibold">{invoice.customerName || "-"}</p>
        <div className="mt-1 text-sm text-slate-600">
          {(invoice.billToAddress || "")
            .split("\n")
            .filter(Boolean)
            .map((line, index) => (
              <p key={index}>{line}</p>
            ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm print:text-xs">
          <thead>
            <tr className="border-y bg-slate-50 print:bg-gray-100">
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Description</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Unit Price</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines && invoice.lines.length > 0 ? (
              invoice.lines.map((line, index) => (
                <tr key={index} className="border-b print:border-b-2">
                  <td className="px-3 py-3">{line.description || "Untitled item"}</td>
                  <td className="px-3 py-3 text-right">
                    Rs.{Number(line.unitPrice || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3 text-right">{Number(line.quantity || 0)}</td>
                  <td className="px-3 py-3 text-right">
                    Rs.
                    {Number((line.quantity || 0) * (line.unitPrice || 0)).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No line items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="ml-auto mt-6 w-full max-w-xs space-y-1.5 text-sm print:text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-medium">
            Rs.{Number(totals.subtotal.toFixed(2)).toLocaleString("en-IN")}
          </span>
        </div>
        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount</span>
            <span>-Rs.{Number(totals.discountAmount.toFixed(2)).toLocaleString("en-IN")}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Tax</span>
          <span className="font-medium">
            Rs.{Number(totals.taxAmount.toFixed(2)).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold print:text-sm">
          <span>Total</span>
          <span>Rs.{Number(totals.total.toFixed(2)).toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}

function getInvoiceTotals(invoice) {
  const subtotal = (invoice.lines || []).reduce(
    (sum, line) => sum + (line.total ?? (line.quantity || 0) * (line.unitPrice || 0)),
    0,
  );
  const discountValue = Number(invoice.discountValue ?? 0);
  const discountAmount =
    invoice.discountType === "percent" ? (subtotal * discountValue) / 100 : discountValue;
  const taxBase = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(invoice.taxRate ?? 0);
  const taxAmount = taxRate > 0 ? (taxBase * taxRate) / 100 : Number(invoice.tax ?? 0);
  const total = taxBase + taxAmount;
  return {
    subtotal,
    discountValue,
    discountAmount,
    taxBase,
    taxRate,
    taxAmount,
    total,
  };
}

function mapInvoiceRecordToEditor(row) {
  const lines =
    row.lines && row.lines.length > 0
      ? row.lines.map((line) => ({
          description: line.description || "",
          quantity: Number(line.quantity ?? 1),
          unitPrice: Number(line.unitPrice ?? 0),
          total: Number(line.total ?? 0),
        }))
      : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }];

  return {
    id: row.id || "",
    projectId: row.projectId || "",
    design: row.design || "standard",
    invoiceNo: row.invoiceNumber || "",
    issueDate: row.issueDate ? new Date(row.issueDate).toISOString().slice(0, 10) : "",
    dueDate: row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : "",
    customerName: row.customerName || "",
    customerEmail: row.customerEmail || "",
    customerPhone: row.customerPhone || "",
    projectName: row.projectName || "",
    projectCode: row.projectCode || "",
    billToAddress: row.billToAddress || "",
    logoDataUrl: row.logoDataUrl || "",
    logoName: row.logoName || "",
    status: row.status || "draft",
    paymentStatus: row.paymentStatus || "pending",
    notes: row.notes || "",
    discountType: row.discountType || "amount",
    discountValue: Number(row.discountValue ?? 0),
    discountAmount: Number(row.discountAmount ?? 0),
    tax: Number(row.tax ?? 0),
    taxRate: Number(row.taxRate ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    total: Number(row.total ?? 0),
    lines: lines,
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function invoiceDocument(invoice, companyProfile) {
  const totals = getInvoiceTotals(invoice);
  const companyPhone = formatPhoneDisplay(companyProfile?.countryCode, companyProfile?.phone);
  const companyName = companyProfile?.companyName || "Factrova";
  const headerLogo = companyProfile?.logoUrl || invoice.logoDataUrl || "";
  const companyLines = [
    ...(companyProfile?.address ? companyProfile.address.split("\n") : []),
    [companyProfile?.city, companyProfile?.state, companyProfile?.pincode]
      .filter(Boolean)
      .join(", "),
  ].filter((line) => line?.trim() !== "");

  const lineRows = (invoice.lines || [])
    .filter(line => line.description?.trim())
    .map(
      (line) => `
        <tr>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${escapeHtml(line.description || "Untitled item")}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top;">Rs.${Number(line.unitPrice || 0).toLocaleString("en-IN")}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top;">${Number(line.quantity || 0)}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top; font-weight: 500;">Rs.${Number((line.quantity || 0) * (line.unitPrice || 0)).toLocaleString("en-IN")}</td>
        </tr>
      `,
    )
    .join("");

  const billToAddress = (invoice.billToAddress || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p style="margin: 0; line-height: 1.5;">${escapeHtml(line)}</p>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(invoice.invoiceNo || "Invoice")}</title>
  <style>
    /* Remove browser default headers and footers */
    @page {
      size: A4;
      margin: 10mm;
      @top-center {
        content: none !important;
      }
      @bottom-center {
        content: none !important;
      }
      @top-left {
        content: none !important;
      }
      @top-right {
        content: none !important;
      }
      @bottom-left {
        content: none !important;
      }
      @bottom-right {
        content: none !important;
      }
    }
    
    /* Hide browser print headers/footers */
    @page :first {
      margin-top: 10mm;
    }
    
    @page :left {
      margin-left: 10mm;
    }
    
    @page :right {
      margin-right: 10mm;
    }
    
    /* Reset all page margins and headers */
    @page {
      margin-top: 1cm;
      margin-bottom: 1cm;
      margin-left: 1cm;
      margin-right: 1cm;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      overflow: visible;
      padding: 0;
      margin: 0;
    }
    
    .invoice {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      box-sizing: border-box;
      background: #ffffff;
      color: #0f172a;
      padding: 20px 20px 20px 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    
    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    
    .header-right {
      text-align: right;
      flex-shrink: 0;
    }
    
    .logo {
      width: 112px;
      height: 112px;
      object-fit: contain;
      display: block;
      filter: none !important;
      -webkit-filter: none !important;
      color: initial !important;
      background: transparent !important;
    }
    
    h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #1e293b;
    }
    
    p {
      margin: 0;
      line-height: 1.5;
    }
    
    .muted {
      color: #64748b;
    }
    
    .company-name {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    
    .invoice-no {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }
    
    .section {
      margin-bottom: 24px;
    }
    
    .section-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    
    th, td {
      padding: 12px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
      vertical-align: top;
    }
    
    th {
      text-align: left;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      border-top: 2px solid #e2e8f0;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .text-right {
      text-align: right;
    }
    
    .totals {
      margin-left: auto;
      width: 320px;
      max-width: 100%;
      margin-top: 24px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 6px 0;
      font-size: 14px;
    }
    
    .discount {
      color: #047857;
    }
    
    .grand-total {
      border-top: 2px solid #e2e8f0;
      margin-top: 4px;
      padding-top: 10px;
      font-size: 18px;
      font-weight: 700;
    }
    
    tr, td, th {
      page-break-inside: avoid;
    }
    
    /* Hide page numbers and other print artifacts */
    .no-print {
      display: none !important;
    }
    
    /* Ensure no extra spacing */
    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-left">
      <div>
          ${headerLogo ? `<img src="${escapeHtml(headerLogo)}" alt="Company logo" class="logo" style="filter: none !important; -webkit-filter: none !important;" />` : ""}
          <p class="company-name">${escapeHtml(companyName)}</p>
          ${companyLines.map((line) => `<p class="muted" style="font-size: 14px;">${escapeHtml(line)}</p>`).join("")}
          ${companyPhone ? `<p class="muted" style="font-size: 14px;">${escapeHtml(companyPhone)}</p>` : ""}
          ${companyProfile?.email ? `<p class="muted" style="font-size: 14px;">${escapeHtml(companyProfile.email)}</p>` : ""}
          ${companyProfile?.gstin ? `<p class="muted" style="font-size: 14px;">GSTIN: ${escapeHtml(companyProfile.gstin)}</p>` : ""}
        </div>
      </div>
      <div class="header-right">
        <h1>INVOICE</h1>
        <p class="invoice-no">${escapeHtml(invoice.invoiceNo || "")}</p>
        <div style="margin-top: 8px;">
          <p style="font-size: 14px;"><span class="muted">Status:</span> <strong style="text-transform: capitalize;">${escapeHtml(invoice.status || "draft")}</strong></p>
          <p style="font-size: 14px;"><span class="muted">Payment:</span> <strong style="text-transform: capitalize;">${escapeHtml(invoice.paymentStatus || "pending")}</strong></p>
          ${invoice.issueDate ? `<p style="font-size: 14px;"><span class="muted">Date:</span> <strong>${escapeHtml(formatDateToDDMMYYYY(invoice.issueDate))}</strong></p>` : ""}
          ${invoice.dueDate ? `<p style="font-size: 14px;"><span class="muted">Due:</span> <strong>${escapeHtml(formatDateToDDMMYYYY(invoice.dueDate))}</strong></p>` : ""}
        </div>
      </div>
    </div>

    <div class="section">
      <p class="section-label">Bill To</p>
      <p style="font-size: 16px; font-weight: 700; margin-top: 4px;">${escapeHtml(invoice.customerName || "-")}</p>
      <div style="margin-top: 6px; font-size: 14px; color: #475569;">
        ${billToAddress || '<p class="muted">No billing address</p>'}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="padding: 12px 10px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; color: #475569; font-weight: 700; text-align: left;">Description</th>
          <th style="padding: 12px 10px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; color: #475569; font-weight: 700; text-align: right;">Unit Price</th>
          <th style="padding: 12px 10px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; color: #475569; font-weight: 700; text-align: right;">Qty</th>
          <th style="padding: 12px 10px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; color: #475569; font-weight: 700; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows || '<tr><td colspan="4" style="padding: 20px 10px; text-align: center; color: #94a3b8;">No line items</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span class="muted">Subtotal</span>
        <span style="font-weight: 500;">Rs.${Number(totals.subtotal.toFixed(2)).toLocaleString("en-IN")}</span>
      </div>
      ${totals.discountAmount > 0 ? `<div class="totals-row discount"><span>Discount</span><span>-Rs.${Number(totals.discountAmount.toFixed(2)).toLocaleString("en-IN")}</span></div>` : ""}
      <div class="totals-row">
        <span class="muted">Tax</span>
        <span style="font-weight: 500;">Rs.${Number(totals.taxAmount.toFixed(2)).toLocaleString("en-IN")}</span>
      </div>
      <div class="totals-row grand-total">
        <span>Total</span>
        <span>Rs.${Number(totals.total.toFixed(2)).toLocaleString("en-IN")}</span>
      </div>
    </div>
  </div>
  
  <script>
    // Remove any browser-generated header/footer content
    if (window.matchMedia) {
      const mediaQueryList = window.matchMedia('print');
      mediaQueryList.addListener(function(mql) {
        if (mql.matches) {
          // Hide any extra elements that might appear
          const style = document.createElement('style');
          style.innerHTML = \`
            * { 
              margin: 0; 
              padding: 0; 
            }
            body { 
              margin: 0; 
              padding: 0; 
            }
            img {
              filter: none !important;
              -webkit-filter: none !important;
            }
          \`;
          document.head.appendChild(style);
        }
      });
    }
  </script>
</body>
</html>`;
}
// import { useEffect, useMemo, useState } from "react";
// import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
// import { PaginationControls } from "@/components/pagination-controls.js";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Dialog,
//   DialogContent,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import {
//   ArrowDownLeft,
//   ArrowUpRight,
//   Download,
//   FilePlus2,
//   IndianRupee,
//   Plus,
//   Search,
//   Trash2,
//   TrendingUp,
//   Wallet,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";
// import { api, apiRootRequest } from "@/lib/api";
// import { API_PATHS } from "@/lib/api-paths";
// import { formatDateTimeCompact, formatDateToDDMMYYYY } from "@/lib/date-format";
// import { canPageAction, getActiveFactoryId } from "@/lib/auth";

// const PAGE_LIMIT = 20;
// const emptyCompanyProfile = {
//   companyName: "",
//   gstin: "",
//   countryCode: "+91",
//   phone: "",
//   email: "",
//   city: "",
//   state: "",
//   pincode: "",
//   address: "",
//   logoUrl: "",
// };

// const defaultInvoice = {
//   id: "",
//   projectId: "",
//   design: "standard",
//   invoiceNo: "",
//   issueDate: "",
//   dueDate: "",
//   customerName: "",
//   customerEmail: "",
//   customerPhone: "",
//   projectName: "",
//   projectCode: "",
//   billToAddress: "",
//   logoDataUrl: "",
//   logoName: "",
//   status: "draft",
//   paymentStatus: "pending",
//   notes: "",
//   discountType: "amount",
//   discountValue: 0,
//   discountAmount: 0,
//   tax: 0,
//   taxRate: 0,
//   subtotal: 0,
//   total: 0,
//   lines: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
// };

// function formatPhoneDisplay(countryCode, phone) {
//   const normalizedPhone = String(phone || "").trim();
//   const normalizedCountryCode = String(countryCode || "").trim();
//   if (normalizedCountryCode && normalizedPhone) {
//     return `${normalizedCountryCode} ${normalizedPhone}`;
//   }
//   return normalizedPhone || "";
// }

// export function Finance() {
//   const canAdd = canPageAction("finance", "add");
//   const canEdit = canPageAction("finance", "edit");
//   const [activeTab, setActiveTab] = useState("sales");
//   const [invoiceOpen, setInvoiceOpen] = useState(false);
//   const [previewOpen, setPreviewOpen] = useState(false);
//   const [savingInvoice, setSavingInvoice] = useState(false);
//   const [invoice, setInvoice] = useState(defaultInvoice);

//   const [invoices, setInvoices] = useState([]);
//   const [invoiceSearch, setInvoiceSearch] = useState("");
//   const [invoicePage, setInvoicePage] = useState(1);
//   const [invoicePagination, setInvoicePagination] = useState({
//     page: 1,
//     limit: PAGE_LIMIT,
//     total: 0,
//     totalPages: 0,
//     hasNext: false,
//     hasPrev: false,
//   });

//   const [transactions, setTransactions] = useState([]);
//   const [transactionSearch, setTransactionSearch] = useState("");
//   const [transactionPage, setTransactionPage] = useState(1);
//   const [transactionPagination, setTransactionPagination] = useState({
//     page: 1,
//     limit: PAGE_LIMIT,
//     total: 0,
//     totalPages: 0,
//     hasNext: false,
//     hasPrev: false,
//   });

//   const [summaryTransactions, setSummaryTransactions] = useState([]);
//   const [refreshToken, setRefreshToken] = useState(0);
//   const [companyProfile, setCompanyProfile] = useState(emptyCompanyProfile);

//   useEffect(() => {
//     const activeFactoryId = getActiveFactoryId();
//     if (!activeFactoryId) return;

//     const loadCompanyProfile = async () => {
//       try {
//         const data = await apiRootRequest(API_PATHS.factories.settings(activeFactoryId));
//         setCompanyProfile({
//           ...emptyCompanyProfile,
//           ...(data?.companyProfile ?? {}),
//         });
//       } catch (error) {
//         toast.error(
//           error instanceof Error ? error.message : "Unable to load factory company profile",
//         );
//       }
//     };

//     void loadCompanyProfile();
//   }, []);

//   useEffect(() => {
//     const loadSummary = async () => {
//       try {
//         const rows = await api.list("transactions");
//         setSummaryTransactions(Array.isArray(rows) ? rows : (rows?.items ?? []));
//       } catch (error) {
//         toast.error(error instanceof Error ? error.message : "Unable to load finance summary");
//       }
//     };

//     loadSummary();
//   }, [refreshToken]);

//   useEffect(() => {
//     const timer = setTimeout(async () => {
//       try {
//         const data = await api.list("invoices", {
//           page: invoicePage,
//           limit: PAGE_LIMIT,
//           search: invoiceSearch.trim() || undefined,
//         });
//         setInvoices(Array.isArray(data) ? data : (data?.items ?? []));
//         setInvoicePagination(
//           Array.isArray(data)
//             ? {
//                 page: invoicePage,
//                 limit: PAGE_LIMIT,
//                 total: data.length,
//                 totalPages: 1,
//                 hasNext: false,
//                 hasPrev: false,
//               }
//             : (data?.pagination ?? {
//                 page: invoicePage,
//                 limit: PAGE_LIMIT,
//                 total: 0,
//                 totalPages: 0,
//                 hasNext: false,
//                 hasPrev: false,
//               }),
//         );
//       } catch (error) {
//         toast.error(error instanceof Error ? error.message : "Unable to load invoices");
//       }
//     }, 300);

//     return () => clearTimeout(timer);
//   }, [invoicePage, invoiceSearch, refreshToken]);

//   useEffect(() => {
//     const timer = setTimeout(async () => {
//       try {
//         const data = await api.list("transactions", {
//           page: transactionPage,
//           limit: PAGE_LIMIT,
//           search: transactionSearch.trim() || undefined,
//         });
//         setTransactions(Array.isArray(data) ? data : (data?.items ?? []));
//         setTransactionPagination(
//           Array.isArray(data)
//             ? {
//                 page: transactionPage,
//                 limit: PAGE_LIMIT,
//                 total: data.length,
//                 totalPages: 1,
//                 hasNext: false,
//                 hasPrev: false,
//               }
//             : (data?.pagination ?? {
//                 page: transactionPage,
//                 limit: PAGE_LIMIT,
//                 total: 0,
//                 totalPages: 0,
//                 hasNext: false,
//                 hasPrev: false,
//               }),
//         );
//       } catch (error) {
//         toast.error(error instanceof Error ? error.message : "Unable to load transactions");
//       }
//     }, 300);

//     return () => clearTimeout(timer);
//   }, [transactionPage, transactionSearch, refreshToken]);

//   const summaryRows = useMemo(
//     () =>
//       summaryTransactions.map((row) => ({
//         ...row,
//         amount: Number(row.amount ?? 0),
//       })),
//     [summaryTransactions],
//   );

//   const credit = summaryRows
//     .filter((t) => t.type === "credit")
//     .reduce((sum, t) => sum + t.amount, 0);
//   const debit = summaryRows.filter((t) => t.type === "debit").reduce((sum, t) => sum + t.amount, 0);
//   const balance = credit - debit;

//   const revenueByMonth = useMemo(() => {
//     const monthTotals = summaryRows
//       .filter((row) => row.type === "credit")
//       .reduce((totals, row) => {
//         const month = new Intl.DateTimeFormat("en", { month: "short" }).format(
//           new Date(row.transactionDate ?? row.date ?? Date.now()),
//         );
//         totals[month] = (totals[month] ?? 0) + row.amount;
//         return totals;
//       }, {});

//     return Object.entries(monthTotals).map(([month, revenue]) => ({ month, revenue }));
//   }, [summaryRows]);

//   const stats = [
//     {
//       label: "Total Income",
//       value: credit,
//       icon: ArrowUpRight,
//       tone: "text-success",
//       bg: "bg-success/10",
//     },
//     {
//       label: "Total Expense",
//       value: debit,
//       icon: ArrowDownLeft,
//       tone: "text-destructive",
//       bg: "bg-destructive/10",
//     },
//     {
//       label: "Net Balance",
//       value: balance,
//       icon: Wallet,
//       tone: "text-primary",
//       bg: "bg-primary/10",
//     },
//     {
//       label: "Avg. Monthly Revenue",
//       value: revenueByMonth.length
//         ? Math.round(
//             revenueByMonth.reduce((sum, row) => sum + row.revenue, 0) / revenueByMonth.length,
//           )
//         : 0,
//       icon: TrendingUp,
//       tone: "text-primary",
//       bg: "bg-primary/10",
//     },
//   ];

//   const invoiceTotals = getInvoiceTotals(invoice);
//   const isEditingInvoice = Boolean(invoice.id);
//   const isDraftInvoice = invoice.status === "draft";
//   const isInvoiceEditable = isDraftInvoice && canEdit;

//   const resetInvoice = () => {
//     setInvoice({
//       ...defaultInvoice,
//       issueDate: new Date().toISOString().slice(0, 10),
//       lines: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
//     });
//   };

//   const openCreateInvoice = () => {
//     resetInvoice();
//     setInvoiceOpen(true);
//   };

//   const openEditInvoice = (row = invoice) => {
//     const mappedInvoice = mapInvoiceRecordToEditor(row);
//     setInvoice(mappedInvoice);
//     setPreviewOpen(false);
//     setInvoiceOpen(true);
//   };

//   const waitForPrintAssets = async (rootElement) => {
//     if (!rootElement) return;
//     const images = Array.from(rootElement.querySelectorAll("img"));
//     await Promise.all(
//       images.map((img) => {
//         if (img.complete) return Promise.resolve();
//         return new Promise((resolve) => {
//           const done = () => resolve();
//           img.addEventListener("load", done, { once: true });
//           img.addEventListener("error", done, { once: true });
//         });
//       }),
//     );
//   };

//   const downloadPdf = async () => {
//     try {
//       const html = invoiceDocument(invoice, companyProfile);
//       const iframe = document.createElement("iframe");
//       let hasPrinted = false;
//       iframe.style.position = "fixed";
//       iframe.style.right = "0";
//       iframe.style.bottom = "0";
//       iframe.style.width = "0";
//       iframe.style.height = "0";
//       iframe.style.border = "0";
//       iframe.setAttribute("aria-hidden", "true");

//       const cleanup = () => {
//         window.setTimeout(() => {
//           if (iframe.parentNode) {
//             iframe.parentNode.removeChild(iframe);
//           }
//         }, 1000);
//       };

//       iframe.onload = async () => {
//         const frameWindow = iframe.contentWindow;
//         const frameDocument = iframe.contentDocument || frameWindow?.document;
//         if (!frameWindow || !frameDocument) {
//           cleanup();
//           toast.error("Unable to open invoice print view");
//           return;
//         }
//         if (hasPrinted) {
//           return;
//         }
//         if (!frameDocument.body?.innerHTML?.trim()) {
//           return;
//         }
//         hasPrinted = true;

//         // Add extra CSS to remove headers/footers
//         const style = frameDocument.createElement("style");
//         style.textContent = `
//         @page {
//           margin: 0;
//           @top-center { content: none !important; }
//           @bottom-center { content: none !important; }
//         }
//         body {
//           margin: 0;
//           padding: 0;
//         }
//       `;
//         frameDocument.head.appendChild(style);

//         await waitForPrintAssets(frameDocument.body);
//         await new Promise((resolve) => setTimeout(resolve, 120));

//         // Try to print with no headers
//         frameWindow.print();
//         cleanup();
//       };

//       document.body.appendChild(iframe);
//       const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
//       if (!frameDocument) {
//         cleanup();
//         toast.error("Unable to prepare invoice print view");
//         return;
//       }
//       frameDocument.open();
//       frameDocument.write(html);
//       frameDocument.close();
//     } catch (error) {
//       console.error("Failed to generate PDF:", error);
//       toast.error("Unable to open invoice print view");
//     }
//   };
//   const updateLine = (index, updates) => {
//     setInvoice((current) => {
//       const updatedLines = current.lines.map((line, lineIndex) =>
//         lineIndex === index ? { ...line, ...updates } : line,
//       );
//       const linesWithTotal = updatedLines.map((line) => ({
//         ...line,
//         total: (line.quantity || 0) * (line.unitPrice || 0),
//       }));
//       return {
//         ...current,
//         lines: linesWithTotal,
//         subtotal: null,
//         tax: null,
//         total: null,
//       };
//     });
//   };

//   const addLine = () => {
//     setInvoice((current) => ({
//       ...current,
//       subtotal: null,
//       tax: null,
//       total: null,
//       lines: [...current.lines, { description: "", quantity: 1, unitPrice: 0, total: 0 }],
//     }));
//   };

//   const removeLine = (index) => {
//     setInvoice((current) => ({
//       ...current,
//       subtotal: null,
//       tax: null,
//       total: null,
//       lines:
//         current.lines.length === 1
//           ? current.lines
//           : current.lines.filter((_, lineIndex) => lineIndex !== index),
//     }));
//   };

//   const uploadLogo = (file) => {
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = () => {
//       setInvoice((current) => ({
//         ...current,
//         logoDataUrl: typeof reader.result === "string" ? reader.result : "",
//         logoName: file.name,
//       }));
//     };
//     reader.readAsDataURL(file);
//   };

//   const openInvoicePreview = (row) => {
//     const mappedInvoice = mapInvoiceRecordToEditor(row);
//     setInvoice(mappedInvoice);
//     setPreviewOpen(true);
//   };

//   const saveInvoice = async () => {
//     if (!invoice.customerName.trim()) {
//       toast.error("Customer name is required");
//       return;
//     }
//     if (!invoice.issueDate) {
//       toast.error("Invoice date is required");
//       return;
//     }
//     if (!invoice.lines.some((line) => line.description.trim())) {
//       toast.error("Add at least one invoice line item");
//       return;
//     }

//     const payload = {
//       design: invoice.design,
//       invoiceNumber: invoice.invoiceNo.trim() || undefined,
//       customerName: invoice.customerName.trim(),
//       customerEmail: invoice.customerEmail.trim() || null,
//       customerPhone: invoice.customerPhone.trim() || null,
//       billToAddress: invoice.billToAddress.trim() || null,
//       issueDate: invoice.issueDate,
//       dueDate: invoice.dueDate || null,
//       status: invoice.status || "draft",
//       paymentStatus: invoice.paymentStatus || "pending",
//       notes: invoice.notes.trim() || null,
//       projectId: invoice.projectId || null,
//       projectCode: invoice.projectCode.trim() || null,
//       projectName: invoice.projectName.trim() || null,
//       logoDataUrl: invoice.logoDataUrl || null,
//       logoName: invoice.logoName || null,
//       lines: invoice.lines
//         .filter((line) => line.description.trim())
//         .map((line) => ({
//           description: line.description.trim(),
//           quantity: Number(line.quantity) || 0,
//           unitPrice: Number(line.unitPrice) || 0,
//           total: (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
//         })),
//       subtotal: invoiceTotals.subtotal,
//       discountType: invoice.discountType || "amount",
//       discountValue: Number(invoice.discountValue) || 0,
//       discountAmount: invoiceTotals.discountAmount,
//       tax: invoiceTotals.taxAmount,
//       taxRate: Number(invoice.taxRate) || 0,
//       total: invoiceTotals.total,
//     };

//     setSavingInvoice(true);
//     try {
//       const saved = isEditingInvoice
//         ? await api.update("invoices", invoice.id, payload)
//         : await api.create("invoices", payload);
//       toast.success(isEditingInvoice ? "Invoice updated" : "Invoice created");
//       setInvoice(mapInvoiceRecordToEditor(saved));
//       setInvoiceOpen(false);
//       setPreviewOpen(true);
//       setInvoicePage(1);
//       setRefreshToken((value) => value + 1);
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Unable to create invoice");
//     } finally {
//       setSavingInvoice(false);
//     }
//   };

//   const updatePaymentStatus = async (invoiceId, newStatus) => {
//     try {
//       await api.update("invoices", invoiceId, {
//         paymentStatus: newStatus,
//       });
//       toast.success("Payment status updated");
//       setRefreshToken((value) => value + 1);
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Unable to update payment status");
//     }
//   };

//   return (
//     <DashboardLayout title="Accounts & Finance">
//       <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
//         {canAdd ? (
//           <Button className="w-full sm:w-auto" onClick={openCreateInvoice}>
//             <FilePlus2 className="mr-1 h-4 w-4" /> Create Invoice
//           </Button>
//         ) : null}
//       </div>

//       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
//         {stats.map((stat) => {
//           const Icon = stat.icon;
//           return (
//             <Card key={stat.label} className="border-border/60 shadow-[var(--shadow-card)]">
//               <CardContent className="p-5">
//                 <div className="flex items-start justify-between">
//                   <div>
//                     <p className="text-sm text-muted-foreground">{stat.label}</p>
//                     <p className="mt-2 flex items-center text-2xl font-bold tracking-tight">
//                       <IndianRupee className="h-5 w-5" />
//                       {Number(stat.value.toFixed(2)).toLocaleString("en-IN")}
//                     </p>
//                   </div>
//                   <div
//                     className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg} ${stat.tone}`}
//                   >
//                     <Icon className="h-5 w-5" />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           );
//         })}
//       </div>

//       <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
//         <TabsList>
//           <TabsTrigger value="sales">Sales</TabsTrigger>
//           <TabsTrigger value="transactions">Transactions</TabsTrigger>
//         </TabsList>

//         <TabsContent value="sales" className="mt-4">
//           <Card className="border-border/60 shadow-[var(--shadow-card)]">
//             <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//               <CardTitle className="text-base">Invoices</CardTitle>
//               <div className="relative w-full sm:max-w-sm">
//                 <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                 <Input
//                   value={invoiceSearch}
//                   onChange={(e) => {
//                     setInvoicePage(1);
//                     setInvoiceSearch(e.target.value);
//                   }}
//                   placeholder="Search invoice, customer, project"
//                   className="pl-9"
//                 />
//               </div>
//             </CardHeader>

//             <CardContent className="p-0">
//               <div className="space-y-3 p-4 md:hidden">
//                 {invoices.map((row) => (
//                   <button
//                     key={row.id}
//                     type="button"
//                     onClick={() => openInvoicePreview(row)}
//                     className="w-full rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm transition hover:border-primary/30"
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="min-w-0">
//                         <p className="font-semibold text-foreground">{row.invoiceNumber}</p>
//                         <p className="mt-1 text-sm text-muted-foreground">{row.customerName}</p>
//                       </div>
//                       <InvoiceStatusBadge status={row.status} />
//                     </div>
//                     <div className="mt-4 space-y-2 text-sm">
//                       <MobileInfoRow
//                         label="Project"
//                         value={row.projectName || row.projectCode || "-"}
//                       />
//                       <MobileInfoRow label="Date" value={formatDateTimeCompact(row.issueDate)} />
//                       <MobileInfoRow
//                         label="Amount"
//                         value={`Rs.${Number(row.total ?? 0).toLocaleString("en-IN")}`}
//                       />
//                     </div>
//                   </button>
//                 ))}

//                 {invoices.length === 0 ? (
//                   <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
//                     No invoices found.
//                   </div>
//                 ) : null}
//               </div>

//               <div className="hidden overflow-x-auto md:block">
//                 <table className="w-full text-sm">
//                   <thead>
//                     <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
//                       <th className="px-4 py-3 font-medium">Invoice</th>
//                       <th className="px-4 py-3 font-medium">Date</th>
//                       <th className="px-4 py-3 font-medium">Customer</th>
//                       <th className="px-4 py-3 font-medium">Project</th>
//                       <th className="px-4 py-3 font-medium">Status</th>
//                       <th className="px-4 py-3 font-medium">Payment</th>
//                       <th className="px-4 py-3 text-right font-medium">Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {invoices.map((row) => (
//                       <tr
//                         key={row.id}
//                         role="button"
//                         tabIndex={0}
//                         onClick={() => openInvoicePreview(row)}
//                         onKeyDown={(event) => {
//                           if (event.key === "Enter" || event.key === " ") {
//                             event.preventDefault();
//                             openInvoicePreview(row);
//                           }
//                         }}
//                         className="cursor-pointer border-b border-border/50 outline-none last:border-0 hover:bg-muted/30 focus:bg-muted/40"
//                       >
//                         <td className="px-4 py-3 font-medium">{row.invoiceNumber}</td>
//                         <td className="px-4 py-3 text-muted-foreground">
//                           {formatDateTimeCompact(row.issueDate)}
//                         </td>
//                         <td className="px-4 py-3">{row.customerName}</td>
//                         <td className="px-4 py-3 text-muted-foreground">
//                           {row.projectName || row.projectCode || "-"}
//                         </td>
//                         <td className="px-4 py-3">
//                           <InvoiceStatusBadge status={row.status} />
//                         </td>
//                         <td className="px-4 py-3">
//                           <PaymentStatusBadge status={row.paymentStatus || "pending"} />
//                         </td>
//                         <td className="px-4 py-3 text-right font-semibold">
//                           Rs.{Number(row.total ?? 0).toLocaleString("en-IN")}
//                         </td>
//                       </tr>
//                     ))}

//                     {invoices.length === 0 ? (
//                       <tr>
//                         <td
//                           colSpan={7}
//                           className="px-4 py-10 text-center text-sm text-muted-foreground"
//                         >
//                           No invoices found.
//                         </td>
//                       </tr>
//                     ) : null}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="px-4 pb-4 pt-2">
//                 <PaginationControls
//                   page={invoicePagination.page}
//                   totalPages={invoicePagination.totalPages}
//                   total={invoicePagination.total}
//                   label="invoices"
//                   loading={false}
//                   onPrevious={() => setInvoicePage((current) => Math.max(1, current - 1))}
//                   onNext={() =>
//                     setInvoicePage((current) =>
//                       Math.min(invoicePagination.totalPages || 1, current + 1),
//                     )
//                   }
//                 />
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="transactions" className="mt-4">
//           <Card className="border-border/60 shadow-[var(--shadow-card)]">
//             <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//               <CardTitle className="text-base">Transactions</CardTitle>
//               <div className="relative w-full sm:max-w-sm">
//                 <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                 <Input
//                   value={transactionSearch}
//                   onChange={(e) => {
//                     setTransactionPage(1);
//                     setTransactionSearch(e.target.value);
//                   }}
//                   placeholder="Search description or category"
//                   className="pl-9"
//                 />
//               </div>
//             </CardHeader>

//             <CardContent className="p-0">
//               <div className="space-y-3 p-4 md:hidden">
//                 {transactions.map((row) => (
//                   <div
//                     key={row.id}
//                     className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="min-w-0">
//                         <p className="font-semibold text-foreground">
//                           {row.description || row.category}
//                         </p>
//                         <p className="mt-1 text-sm text-muted-foreground">
//                           {formatDateTimeCompact(row.transactionDate ?? row.date)}
//                         </p>
//                       </div>
//                       <TransactionTypeBadge type={row.type} />
//                     </div>
//                     <div className="mt-4 space-y-2 text-sm">
//                       <MobileInfoRow label="Category" value={row.category || "-"} />
//                       <MobileInfoRow
//                         label="Amount"
//                         value={`${row.type === "credit" ? "+" : "-"} Rs.${Number(row.amount ?? 0).toLocaleString("en-IN")}`}
//                       />
//                     </div>
//                   </div>
//                 ))}

//                 {transactions.length === 0 ? (
//                   <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
//                     No transactions found.
//                   </div>
//                 ) : null}
//               </div>

//               <div className="hidden overflow-x-auto md:block">
//                 <table className="w-full text-sm">
//                   <thead>
//                     <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
//                       <th className="px-4 py-3 font-medium">Date</th>
//                       <th className="px-4 py-3 font-medium">Description</th>
//                       <th className="px-4 py-3 font-medium">Type</th>
//                       <th className="px-4 py-3 text-right font-medium">Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {transactions.map((row) => (
//                       <tr
//                         key={row.id}
//                         className="border-b border-border/50 last:border-0 hover:bg-muted/30"
//                       >
//                         <td className="px-4 py-3 text-muted-foreground">
//                           {formatDateTimeCompact(row.transactionDate ?? row.date)}
//                         </td>
//                         <td className="px-4 py-3 font-medium">{row.description || row.category}</td>
//                         <td className="px-4 py-3">
//                           <TransactionTypeBadge type={row.type} />
//                         </td>
//                         <td
//                           className={`px-4 py-3 text-right font-semibold ${row.type === "credit" ? "text-success" : "text-destructive"}`}
//                         >
//                           {row.type === "credit" ? "+" : "-"} Rs.
//                           {Number(row.amount ?? 0).toLocaleString("en-IN")}
//                         </td>
//                       </tr>
//                     ))}

//                     {transactions.length === 0 ? (
//                       <tr>
//                         <td
//                           colSpan={4}
//                           className="px-4 py-10 text-center text-sm text-muted-foreground"
//                         >
//                           No transactions found.
//                         </td>
//                       </tr>
//                     ) : null}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="px-4 pb-4 pt-2">
//                 <PaginationControls
//                   page={transactionPagination.page}
//                   totalPages={transactionPagination.totalPages}
//                   total={transactionPagination.total}
//                   label="transactions"
//                   loading={false}
//                   onPrevious={() => setTransactionPage((current) => Math.max(1, current - 1))}
//                   onNext={() =>
//                     setTransactionPage((current) =>
//                       Math.min(transactionPagination.totalPages || 1, current + 1),
//                     )
//                   }
//                 />
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>

//       <Dialog
//         open={invoiceOpen}
//         onOpenChange={(nextOpen) => {
//           setInvoiceOpen(nextOpen);
//           if (!nextOpen) resetInvoice();
//         }}
//       >
//         <DialogContent className="left-auto right-0 top-0 h-dvh max-h-screen max-w-5xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:rounded-none">
//           <DialogHeader>
//             <DialogTitle>{isEditingInvoice ? "Edit invoice" : "New invoice"}</DialogTitle>
//           </DialogHeader>

//           <div className="space-y-4">
//             <div className="grid gap-4 lg:grid-cols-2">
//               <div className="space-y-3">
//                 <div className="space-y-1.5">
//                   <Label>Logo</Label>
//                   <div className="flex items-center gap-2">
//                     <Input
//                       type="file"
//                       accept="image/*"
//                       onChange={(e) => uploadLogo(e.target.files?.[0])}
//                       disabled={!isInvoiceEditable}
//                     />
//                     {invoice.logoDataUrl ? (
//                       <Button
//                         type="button"
//                         variant="outline"
//                         onClick={() =>
//                           setInvoice((current) => ({ ...current, logoDataUrl: "", logoName: "" }))
//                         }
//                         disabled={!isInvoiceEditable}
//                       >
//                         Remove
//                       </Button>
//                     ) : null}
//                   </div>
//                   {invoice.logoName ? (
//                     <p className="text-xs text-muted-foreground">{invoice.logoName}</p>
//                   ) : null}
//                 </div>

//                 <Field
//                   label="Customer Name"
//                   value={invoice.customerName}
//                   onChange={(value) =>
//                     setInvoice((current) => ({ ...current, customerName: value }))
//                   }
//                   disabled={!isInvoiceEditable}
//                 />
//                 <Field
//                   label="Customer Email"
//                   type="email"
//                   value={invoice.customerEmail}
//                   onChange={(value) =>
//                     setInvoice((current) => ({ ...current, customerEmail: value }))
//                   }
//                   disabled={!isInvoiceEditable}
//                 />
//                 <Field
//                   label="Customer Phone"
//                   value={invoice.customerPhone}
//                   onChange={(value) =>
//                     setInvoice((current) => ({ ...current, customerPhone: value }))
//                   }
//                   disabled={!isInvoiceEditable}
//                 />
//                 <Field
//                   label="Project Name"
//                   value={invoice.projectName}
//                   onChange={(value) =>
//                     setInvoice((current) => ({ ...current, projectName: value }))
//                   }
//                   disabled={!isInvoiceEditable}
//                 />

//                 <div className="space-y-1.5">
//                   <Label>Bill To Address</Label>
//                   <Textarea
//                     value={invoice.billToAddress}
//                     onChange={(e) =>
//                       setInvoice((current) => ({ ...current, billToAddress: e.target.value }))
//                     }
//                     rows={4}
//                     disabled={!isInvoiceEditable}
//                   />
//                 </div>
//               </div>

//               <div className="space-y-3">
//                 <div className="space-y-2">
//                   <Label>Invoice Design</Label>
//                   <RadioGroup
//                     value={invoice.design}
//                     onValueChange={(value) =>
//                       setInvoice((current) => ({ ...current, design: value }))
//                     }
//                     className="grid grid-cols-2 gap-2"
//                     disabled={!isInvoiceEditable}
//                   >
//                     <DesignOption value="standard" label="Standard" current={invoice.design} />
//                     <DesignOption
//                       value="professional"
//                       label="Professional"
//                       current={invoice.design}
//                     />
//                   </RadioGroup>
//                 </div>

//                 <Field
//                   label="Invoice No"
//                   value={invoice.invoiceNo}
//                   onChange={(value) => setInvoice((current) => ({ ...current, invoiceNo: value }))}
//                   disabled={!isInvoiceEditable}
//                 />
//                 <Field
//                   label="Issue Date"
//                   type="date"
//                   value={invoice.issueDate}
//                   onChange={(value) => setInvoice((current) => ({ ...current, issueDate: value }))}
//                   disabled={!isInvoiceEditable}
//                 />
//                 <Field
//                   label="Due Date"
//                   type="date"
//                   value={invoice.dueDate}
//                   onChange={(value) => setInvoice((current) => ({ ...current, dueDate: value }))}
//                   disabled={!isInvoiceEditable}
//                 />

//                 {isEditingInvoice && (
//                   <div className="space-y-1.5">
//                     <Label>Invoice Status</Label>
//                     <select
//                       value={invoice.status || "draft"}
//                       onChange={(e) =>
//                         setInvoice((current) => ({ ...current, status: e.target.value }))
//                       }
//                       className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
//                       disabled={!isInvoiceEditable}
//                     >
//                       <option value="draft">Draft</option>
//                       <option value="issued">Issued</option>
//                     </select>
//                   </div>
//                 )}

//                 <div className="space-y-1.5">
//                   <Label>Payment Status</Label>
//                   <select
//                     value={invoice.paymentStatus || "pending"}
//                     onChange={(e) =>
//                       setInvoice((current) => ({ ...current, paymentStatus: e.target.value }))
//                     }
//                     className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
//                   >
//                     <option value="pending">Pending</option>
//                     <option value="paid">Paid</option>
//                     <option value="overdue">Overdue</option>
//                     <option value="cancelled">Cancelled</option>
//                   </select>
//                 </div>

//                 <Field
//                   label="Project Code"
//                   value={invoice.projectCode}
//                   onChange={(value) =>
//                     setInvoice((current) => ({ ...current, projectCode: value }))
//                   }
//                   disabled={!isInvoiceEditable}
//                 />
//                 <div className="space-y-1.5">
//                   <Label>Notes</Label>
//                   <Textarea
//                     value={invoice.notes}
//                     onChange={(e) =>
//                       setInvoice((current) => ({ ...current, notes: e.target.value }))
//                     }
//                     rows={4}
//                     disabled={!isInvoiceEditable}
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="space-y-3">
//               <div className="flex items-center justify-between gap-3">
//                 <Label>Line Items</Label>
//                 <Button
//                   type="button"
//                   size="sm"
//                   variant="outline"
//                   onClick={addLine}
//                   disabled={!isInvoiceEditable}
//                 >
//                   <Plus className="mr-1 h-4 w-4" /> Add line
//                 </Button>
//               </div>

//               <div className="overflow-x-auto rounded-lg border border-border/70">
//                 <table className="w-full min-w-[760px] text-sm">
//                   <thead>
//                     <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
//                       <th className="px-3 py-2 font-medium">Description</th>
//                       <th className="w-36 px-3 py-2 text-right font-medium">Unit Price</th>
//                       <th className="w-28 px-3 py-2 text-right font-medium">Quantity</th>
//                       <th className="w-40 px-3 py-2 text-right font-medium">Total</th>
//                       <th className="w-12 px-3 py-2"></th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {invoice.lines && invoice.lines.length > 0 ? (
//                       invoice.lines.map((line, index) => (
//                         <tr key={index} className="border-b last:border-0">
//                           <td className="px-3 py-2">
//                             <Input
//                               value={line.description || ""}
//                               onChange={(e) => updateLine(index, { description: e.target.value })}
//                               disabled={!isInvoiceEditable}
//                               placeholder="Item description"
//                             />
//                           </td>
//                           <td className="px-3 py-2">
//                             <Input
//                               type="number"
//                               value={String(line.unitPrice || 0)}
//                               onChange={(e) =>
//                                 updateLine(index, { unitPrice: Number(e.target.value) || 0 })
//                               }
//                               className="text-right"
//                               disabled={!isInvoiceEditable}
//                               step="0.01"
//                             />
//                           </td>
//                           <td className="px-3 py-2">
//                             <Input
//                               type="number"
//                               value={String(line.quantity || 0)}
//                               onChange={(e) =>
//                                 updateLine(index, { quantity: Number(e.target.value) || 0 })
//                               }
//                               className="text-right"
//                               disabled={!isInvoiceEditable}
//                               step="1"
//                             />
//                           </td>
//                           <td className="px-3 py-2">
//                             <Input
//                               value={`Rs.${Number((line.quantity || 0) * (line.unitPrice || 0))
//                                 .toFixed(2)
//                                 .toLocaleString("en-IN")}`}
//                               readOnly
//                               className="text-right font-medium"
//                             />
//                           </td>
//                           <td className="px-3 py-2 text-right">
//                             <Button
//                               type="button"
//                               size="icon"
//                               variant="ghost"
//                               onClick={() => removeLine(index)}
//                               disabled={!isInvoiceEditable || invoice.lines.length === 1}
//                             >
//                               <Trash2 className="h-4 w-4 text-muted-foreground" />
//                             </Button>
//                           </td>
//                         </tr>
//                       ))
//                     ) : (
//                       <tr>
//                         <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
//                           No line items added yet. Click "Add line" to get started.
//                         </td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="ml-auto w-full max-w-sm rounded-lg border border-border/70 bg-muted/20 p-4">
//                 <p className="mb-3 text-sm font-medium">Summary</p>
//                 <div className="space-y-2 text-sm">
//                   <div className="grid gap-2 sm:grid-cols-2">
//                     <div className="space-y-1">
//                       <Label className="text-xs text-muted-foreground">Discount Type</Label>
//                       <select
//                         value={invoice.discountType || "amount"}
//                         onChange={(e) =>
//                           setInvoice((current) => ({
//                             ...current,
//                             discountType: e.target.value,
//                             total: null,
//                           }))
//                         }
//                         className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
//                         disabled={!isInvoiceEditable}
//                       >
//                         <option value="amount">Amount</option>
//                         <option value="percent">Percent</option>
//                       </select>
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-xs text-muted-foreground">Discount Value</Label>
//                       <Input
//                         type="number"
//                         value={String(Number(invoice.discountValue ?? 0))}
//                         onChange={(e) =>
//                           setInvoice((current) => ({
//                             ...current,
//                             discountValue: Number(e.target.value) || 0,
//                             total: null,
//                           }))
//                         }
//                         disabled={!isInvoiceEditable}
//                       />
//                     </div>
//                   </div>
//                   <div className="grid gap-2 sm:grid-cols-2">
//                     <div className="space-y-1">
//                       <Label className="text-xs text-muted-foreground">Tax Rate %</Label>
//                       <Input
//                         type="number"
//                         value={String(Number(invoice.taxRate ?? 0))}
//                         onChange={(e) =>
//                           setInvoice((current) => ({
//                             ...current,
//                             taxRate: Number(e.target.value) || 0,
//                             total: null,
//                           }))
//                         }
//                         disabled={!isInvoiceEditable}
//                       />
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-xs text-muted-foreground">Tax Amount</Label>
//                       <Input
//                         type="number"
//                         value={String(Number(invoiceTotals.taxAmount ?? 0).toFixed(2))}
//                         readOnly
//                         disabled
//                       />
//                     </div>
//                   </div>
//                   <div className="flex justify-between text-muted-foreground">
//                     <span>Subtotal</span>
//                     <span>
//                       Rs.{Number(invoiceTotals.subtotal.toFixed(2)).toLocaleString("en-IN")}
//                     </span>
//                   </div>
//                   {invoiceTotals.discountAmount > 0 ? (
//                     <div className="flex justify-between text-emerald-700">
//                       <span>
//                         Discount
//                         {invoice.discountType === "percent"
//                           ? ` (${Number(invoice.discountValue || 0)}%)`
//                           : ""}
//                       </span>
//                       <span>
//                         -Rs.
//                         {Number(invoiceTotals.discountAmount.toFixed(2)).toLocaleString("en-IN")}
//                       </span>
//                     </div>
//                   ) : null}
//                   <div className="flex justify-between text-muted-foreground">
//                     <span>Tax</span>
//                     <span>
//                       Rs.{Number(invoiceTotals.taxAmount.toFixed(2)).toLocaleString("en-IN")}
//                     </span>
//                   </div>
//                   <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
//                     <span>Total</span>
//                     <span>Rs.{Number(invoiceTotals.total.toFixed(2)).toLocaleString("en-IN")}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <DialogFooter className="gap-2">
//             <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
//               Cancel
//             </Button>
//             <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
//               Preview
//             </Button>
//             {isInvoiceEditable && (
//               <Button onClick={saveInvoice} disabled={savingInvoice}>
//                 {savingInvoice ? "Saving..." : isEditingInvoice ? "Update Invoice" : "Save Invoice"}
//               </Button>
//             )}
//             <Button onClick={downloadPdf}>
//               <Download className="mr-1 h-4 w-4" /> Download PDF
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
//         <DialogContent className="left-auto right-0 top-0 h-dvh max-h-screen max-w-4xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:rounded-none print:overflow-visible print:h-auto print:max-h-none print:border-0 print:shadow-none print:bg-white print:p-0">
//           <DialogHeader className="print:hidden">
//             <DialogTitle>Invoice preview</DialogTitle>
//           </DialogHeader>
//           <div className="print:p-0">
//             <InvoicePreview invoice={invoice} companyProfile={companyProfile} />
//           </div>
//           <DialogFooter className="gap-2 print:hidden">
//             {isInvoiceEditable ? (
//               <Button variant="secondary" onClick={() => openEditInvoice()}>
//                 Edit Draft
//               </Button>
//             ) : (
//               <div className="flex items-center gap-2">
//                 <span className="text-sm text-muted-foreground">Payment Status:</span>
//                 <select
//                   value={invoice.paymentStatus || "pending"}
//                   onChange={(e) => {
//                     const newStatus = e.target.value;
//                     updatePaymentStatus(invoice.id, newStatus);
//                     setInvoice((current) => ({ ...current, paymentStatus: newStatus }));
//                   }}
//                   className="h-9 rounded-md border border-input bg-background px-3 text-sm"
//                 >
//                   <option value="pending">Pending</option>
//                   <option value="paid">Paid</option>
//                   <option value="overdue">Overdue</option>
//                   <option value="cancelled">Cancelled</option>
//                 </select>
//               </div>
//             )}
//             <Button variant="outline" onClick={() => setPreviewOpen(false)}>
//               Close
//             </Button>
//             <Button onClick={downloadPdf}>
//               <Download className="mr-1 h-4 w-4" /> Download PDF
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </DashboardLayout>
//   );
// }

// function InvoiceStatusBadge({ status }) {
//   return (
//     <span
//       className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
//         status === "issued"
//           ? "border-blue-200 bg-blue-50 text-blue-700"
//           : status === "draft"
//             ? "border-slate-200 bg-slate-100 text-slate-700"
//             : "border-border bg-muted/40 text-muted-foreground"
//       }`}
//     >
//       {status}
//     </span>
//   );
// }

// function PaymentStatusBadge({ status }) {
//   return (
//     <span
//       className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
//         status === "paid"
//           ? "border-success/20 bg-success/10 text-success"
//           : status === "overdue"
//             ? "border-destructive/30 bg-destructive/15 text-destructive"
//             : status === "cancelled"
//               ? "border-border bg-muted/40 text-muted-foreground"
//               : "border-warning/30 bg-warning/15 text-warning-foreground"
//       }`}
//     >
//       {status}
//     </span>
//   );
// }

// function TransactionTypeBadge({ type }) {
//   return (
//     <span
//       className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
//         type === "credit"
//           ? "border-success/20 bg-success/10 text-success"
//           : "border-destructive/20 bg-destructive/10 text-destructive"
//       }`}
//     >
//       {type === "credit" ? (
//         <ArrowUpRight className="h-3 w-3" />
//       ) : (
//         <ArrowDownLeft className="h-3 w-3" />
//       )}
//       {type}
//     </span>
//   );
// }

// function MobileInfoRow({ label, value }) {
//   return (
//     <div className="flex flex-col gap-1 rounded-lg bg-muted/30 px-3 py-2">
//       <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
//         {label}
//       </span>
//       <span className="break-words text-foreground">{value}</span>
//     </div>
//   );
// }

// function DesignOption({ value, label, current }) {
//   return (
//     <label
//       className={cn(
//         "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium",
//         current === value
//           ? "border-primary bg-[image:var(--gradient-soft)]"
//           : "border-border bg-card",
//       )}
//     >
//       <RadioGroupItem value={value} />
//       {label}
//     </label>
//   );
// }

// function Field({ label, value, onChange, type = "text", disabled = false }) {
//   return (
//     <div className="space-y-1.5">
//       <Label>{label}</Label>
//       <Input
//         type={type}
//         value={value || ""}
//         onChange={(e) => onChange(e.target.value)}
//         disabled={disabled}
//       />
//     </div>
//   );
// }

// function InvoicePreview({ invoice, companyProfile }) {
//   const totals = getInvoiceTotals(invoice);
//   const companyPhone = formatPhoneDisplay(companyProfile?.countryCode, companyProfile?.phone);
//   const companyLines = [
//     ...(companyProfile?.address ? companyProfile.address.split("\n") : []),
//     [companyProfile?.city, companyProfile?.state, companyProfile?.pincode]
//       .filter(Boolean)
//       .join(", "),
//   ].filter((line) => line?.trim() !== "");
//   const headerLogo = companyProfile?.logoUrl || invoice.logoDataUrl || "";
//   const companyName = companyProfile?.companyName || "Factrova";

//   return (
//     <div
//       id="print-wrapper"
//       className="min-h-[520px] border bg-white p-6 text-slate-950 shadow-sm print:border-0 print:shadow-none print:p-8"
//     >
//       <style>{`
//         @media print {
//           body {
//             margin: 0;
//             padding: 0;
//           }
//           #print-wrapper {
//             margin: 0;
//             padding: 20px !important;
//             min-height: auto !important;
//           }
//           ::-webkit-scrollbar {
//             display: none;
//           }
//           .no-break {
//             page-break-inside: avoid;
//           }
//         }
//       `}</style>

//       {/* Header with Logo and Invoice Info */}
//       <div className="mb-6 flex flex-col items-start justify-between border-b pb-4 print:border-b-2 sm:flex-row sm:items-start">
//         <div className="flex items-center gap-4">
//           <div>
//             {headerLogo ? (
//               <img
//                 src={headerLogo}
//                 alt="Company logo"
//                 className="h-28 w-28 object-contain p-1 print:h-20 print:w-20"
//               />
//             ) : null}
//             <p className="font-semibold">{companyName}</p>
//             {companyLines.map((line, index) => (
//               <p key={index} className="text-sm text-slate-500 print:text-xs">
//                 {line}
//               </p>
//             ))}
//             {companyPhone ? (
//               <p className="text-sm text-slate-500 print:text-xs">{companyPhone}</p>
//             ) : null}
//             {companyProfile?.email ? (
//               <p className="text-sm text-slate-500 print:text-xs">{companyProfile.email}</p>
//             ) : null}
//             {companyProfile?.gstin ? (
//               <p className="text-sm text-slate-500 print:text-xs">GSTIN: {companyProfile.gstin}</p>
//             ) : null}
//           </div>
//         </div>
//         <div className="mt-4 sm:mt-0 text-left sm:text-right">
//           <h1 className="text-2xl font-bold text-slate-800 print:text-xl">INVOICE</h1>
//           <p className="text-sm font-medium text-slate-600">{invoice.invoiceNo || ""}</p>
//           <div className="mt-2 space-y-0.5 text-sm print:text-xs">
//             <p>
//               <span className="text-slate-500">Status:</span>{" "}
//               <span className="font-medium capitalize">{invoice.status || "draft"}</span>
//             </p>
//             <p>
//               <span className="text-slate-500">Payment:</span>{" "}
//               <span className="font-medium capitalize">{invoice.paymentStatus || "pending"}</span>
//             </p>
//             {invoice.issueDate && (
//               <p>
//                 <span className="text-slate-500">Date:</span>{" "}
//                 <span className="font-medium">{formatDateToDDMMYYYY(invoice.issueDate)}</span>
//               </p>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Bill To Section */}
//       <div className="mb-6">
//         <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bill To</p>
//         <p className="mt-1 font-semibold">{invoice.customerName || "-"}</p>
//         <div className="mt-1 text-sm text-slate-600">
//           {(invoice.billToAddress || "")
//             .split("\n")
//             .filter(Boolean)
//             .map((line, index) => (
//               <p key={index}>{line}</p>
//             ))}
//         </div>
//       </div>

//       {/* Items Table */}
//       <div className="overflow-x-auto print:overflow-visible">
//         <table className="w-full text-sm print:text-xs">
//           <thead>
//             <tr className="border-y bg-slate-50 print:bg-gray-100">
//               <th className="px-3 py-2 text-left font-semibold text-slate-600">Description</th>
//               <th className="px-3 py-2 text-right font-semibold text-slate-600">Unit Price</th>
//               <th className="px-3 py-2 text-right font-semibold text-slate-600">Qty</th>
//               <th className="px-3 py-2 text-right font-semibold text-slate-600">Total</th>
//             </tr>
//           </thead>
//           <tbody>
//             {invoice.lines && invoice.lines.length > 0 ? (
//               invoice.lines.map((line, index) => (
//                 <tr key={index} className="border-b print:border-b-2">
//                   <td className="px-3 py-3">{line.description || "Untitled item"}</td>
//                   <td className="px-3 py-3 text-right">
//                     Rs.{Number(line.unitPrice || 0).toLocaleString("en-IN")}
//                   </td>
//                   <td className="px-3 py-3 text-right">{Number(line.quantity || 0)}</td>
//                   <td className="px-3 py-3 text-right">
//                     Rs.
//                     {Number((line.quantity || 0) * (line.unitPrice || 0)).toLocaleString("en-IN")}
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
//                   No line items
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Totals */}
//       <div className="ml-auto mt-6 w-full max-w-xs space-y-1.5 text-sm print:text-xs">
//         <div className="flex justify-between">
//           <span className="text-slate-500">Subtotal</span>
//           <span className="font-medium">
//             Rs.{Number(totals.subtotal.toFixed(2)).toLocaleString("en-IN")}
//           </span>
//         </div>
//         {totals.discountAmount > 0 && (
//           <div className="flex justify-between text-emerald-700">
//             <span>Discount</span>
//             <span>-Rs.{Number(totals.discountAmount.toFixed(2)).toLocaleString("en-IN")}</span>
//           </div>
//         )}
//         <div className="flex justify-between">
//           <span className="text-slate-500">Tax</span>
//           <span className="font-medium">
//             Rs.{Number(totals.taxAmount.toFixed(2)).toLocaleString("en-IN")}
//           </span>
//         </div>
//         <div className="flex justify-between border-t pt-2 text-base font-bold print:text-sm">
//           <span>Total</span>
//           <span>Rs.{Number(totals.total.toFixed(2)).toLocaleString("en-IN")}</span>
//         </div>
//       </div>
//     </div>
//   );
// }

// function getInvoiceTotals(invoice) {
//   const subtotal = (invoice.lines || []).reduce(
//     (sum, line) => sum + (line.total ?? (line.quantity || 0) * (line.unitPrice || 0)),
//     0,
//   );
//   const discountValue = Number(invoice.discountValue ?? 0);
//   const discountAmount =
//     invoice.discountType === "percent" ? (subtotal * discountValue) / 100 : discountValue;
//   const taxBase = Math.max(0, subtotal - discountAmount);
//   const taxRate = Number(invoice.taxRate ?? 0);
//   const taxAmount = taxRate > 0 ? (taxBase * taxRate) / 100 : Number(invoice.tax ?? 0);
//   const total = taxBase + taxAmount;
//   return {
//     subtotal,
//     discountValue,
//     discountAmount,
//     taxBase,
//     taxRate,
//     taxAmount,
//     total,
//   };
// }

// function mapInvoiceRecordToEditor(row) {
//   const lines =
//     row.lines && row.lines.length > 0
//       ? row.lines.map((line) => ({
//           description: line.description || "",
//           quantity: Number(line.quantity ?? 1),
//           unitPrice: Number(line.unitPrice ?? 0),
//           total: Number(line.total ?? 0),
//         }))
//       : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }];

//   return {
//     id: row.id || "",
//     projectId: row.projectId || "",
//     design: row.design || "standard",
//     invoiceNo: row.invoiceNumber || "",
//     issueDate: row.issueDate ? new Date(row.issueDate).toISOString().slice(0, 10) : "",
//     dueDate: row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : "",
//     customerName: row.customerName || "",
//     customerEmail: row.customerEmail || "",
//     customerPhone: row.customerPhone || "",
//     projectName: row.projectName || "",
//     projectCode: row.projectCode || "",
//     billToAddress: row.billToAddress || "",
//     logoDataUrl: row.logoDataUrl || "",
//     logoName: row.logoName || "",
//     status: row.status || "draft",
//     paymentStatus: row.paymentStatus || "pending",
//     notes: row.notes || "",
//     discountType: row.discountType || "amount",
//     discountValue: Number(row.discountValue ?? 0),
//     discountAmount: Number(row.discountAmount ?? 0),
//     tax: Number(row.tax ?? 0),
//     taxRate: Number(row.taxRate ?? 0),
//     subtotal: Number(row.subtotal ?? 0),
//     total: Number(row.total ?? 0),
//     lines: lines,
//   };
// }

// function escapeHtml(value = "") {
//   return String(value)
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#039;");
// }

// function invoiceDocument(invoice, companyProfile) {
//   const totals = getInvoiceTotals(invoice);
//   const companyPhone = formatPhoneDisplay(companyProfile?.countryCode, companyProfile?.phone);
//   const companyName = companyProfile?.companyName || "Factrova";
//   const headerLogo = companyProfile?.logoUrl || invoice.logoDataUrl || "";
//   const companyLines = [
//     ...(companyProfile?.address ? companyProfile.address.split("\n") : []),
//     [companyProfile?.city, companyProfile?.state, companyProfile?.pincode]
//       .filter(Boolean)
//       .join(", "),
//   ].filter((line) => line?.trim() !== "");

//   const lineRows = (invoice.lines || [])
//     .map(
//       (line) => `
//         <tr>
//           <td>${escapeHtml(line.description || "Untitled item")}</td>
//           <td class="text-right">Rs.${Number(line.unitPrice || 0).toLocaleString("en-IN")}</td>
//           <td class="text-right">${Number(line.quantity || 0)}</td>
//           <td class="text-right">Rs.${Number((line.quantity || 0) * (line.unitPrice || 0)).toLocaleString("en-IN")}</td>
//         </tr>
//       `,
//     )
//     .join("");

//   const billToAddress = (invoice.billToAddress || "")
//     .split("\n")
//     .filter(Boolean)
//     .map((line) => `<p>${escapeHtml(line)}</p>`)
//     .join("");

//   return `<!doctype html>
// <html>
// <head>
//   <meta charset="utf-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1" />
//   <title>${escapeHtml(invoice.invoiceNo || "Invoice")}</title>
//   <style>
//     /* Remove browser default headers and footers */
//     @page {
//       size: A4;
//       margin: 10mm;
//       @top-center {
//         content: none !important;
//       }
//       @bottom-center {
//         content: none !important;
//       }
//       @top-left {
//         content: none !important;
//       }
//       @top-right {
//         content: none !important;
//       }
//       @bottom-left {
//         content: none !important;
//       }
//       @bottom-right {
//         content: none !important;
//       }
//     }
    
//     /* Hide browser print headers/footers */
//     @page :first {
//       margin-top: 10mm;
//     }
    
//     @page :left {
//       margin-left: 10mm;
//     }
    
//     @page :right {
//       margin-right: 10mm;
//     }
    
//     /* Reset all page margins and headers */
//     @page {
//       margin-top: 1cm;
//       margin-bottom: 1cm;
//       margin-left: 1cm;
//       margin-right: 1cm;
//     }
    
//     html, body {
//       margin: 0;
//       padding: 0;
//       background: #ffffff;
//       color: #0f172a;
//       font-family: Arial, Helvetica, sans-serif;
//       -webkit-print-color-adjust: exact !important;
//       print-color-adjust: exact !important;
//     }
    
//     body {
//       overflow: visible;
//       padding: 0;
//       margin: 0;
//     }
    
//     .invoice {
//       width: 100%;
//       max-width: 190mm;
//       margin: 0 auto;
//       box-sizing: border-box;
//       background: #ffffff;
//       color: #0f172a;
//       padding: 20px 0px 20px 0px;
//     }
    
//     .header {
//       display: flex;
//       justify-content: space-between;
//       align-items: flex-start;
//       gap: 24px;
//       border-bottom: 1px solid #e2e8f0;
//       padding-bottom: 16px;
//       margin-bottom: 24px;
//     }
    
//     .header-left {
//       display: flex;
//       align-items: flex-start;
//       gap: 16px;
//     }
    
//     .header-right {
//       text-align: right;
//     }
    
//     .logo {
//       width: 112px;
//       height: 112px;
//       object-fit: contain;
//       display: block;
//     }
    
//     h1 {
//       margin: 0;
//       font-size: 30px;
//       font-weight: 700;
//       letter-spacing: 0.04em;
//     }
    
//     p {
//       margin: 0;
//       line-height: 1.5;
//     }
    
//     .muted {
//       color: #64748b;
//     }
    
//     .company-name {
//       font-size: 18px;
//       font-weight: 700;
//     }
    
//     .invoice-no {
//       font-size: 14px;
//       font-weight: 600;
//     }
    
//     .section {
//       margin-bottom: 24px;
//     }
    
//     .section-label {
//       font-size: 12px;
//       font-weight: 700;
//       text-transform: uppercase;
//       letter-spacing: 0.08em;
//       color: #64748b;
//       margin-bottom: 4px;
//     }
    
//     table {
//       width: 100%;
//       border-collapse: collapse;
//       margin-top: 16px;
//     }
    
//     th, td {
//       padding: 12px 10px;
//       border-bottom: 1px solid #e2e8f0;
//       font-size: 14px;
//       vertical-align: top;
//     }
    
//     th {
//       text-align: left;
//       background: #f8fafc;
//       color: #475569;
//       font-weight: 700;
//       border-top: 1px solid #e2e8f0;
//     }
    
//     .text-right {
//       text-align: right;
//     }
    
//     .totals {
//       margin-left: auto;
//       width: 320px;
//       max-width: 100%;
//       margin-top: 24px;
//     }
    
//     .totals-row {
//       display: flex;
//       justify-content: space-between;
//       gap: 16px;
//       padding: 6px 0;
//       font-size: 14px;
//     }
    
//     .discount {
//       color: #047857;
//     }
    
//     .grand-total {
//       border-top: 1px solid #e2e8f0;
//       margin-top: 4px;
//       padding-top: 10px;
//       font-size: 18px;
//       font-weight: 700;
//     }
    
//     tr, td, th {
//       page-break-inside: avoid;
//     }
    
//     /* Hide page numbers and other print artifacts */
//     .no-print {
//       display: none !important;
//     }
    
//     /* Ensure no extra spacing */
//     * {
//       box-sizing: border-box;
//     }
//   </style>
// </head>
// <body>
//   <div class="invoice">
//     <div class="header">
//       <div class="header-left">
//         ${headerLogo ? `<img src="${escapeHtml(headerLogo)}" alt="Company logo" class="logo" />` : ""}
//         <div>
//           <p class="company-name">${escapeHtml(companyName)}</p>
//           ${companyLines.map((line) => `<p class="muted">${escapeHtml(line)}</p>`).join("")}
//           ${companyPhone ? `<p class="muted">${escapeHtml(companyPhone)}</p>` : ""}
//           ${companyProfile?.email ? `<p class="muted">${escapeHtml(companyProfile.email)}</p>` : ""}
//           ${companyProfile?.gstin ? `<p class="muted">GSTIN: ${escapeHtml(companyProfile.gstin)}</p>` : ""}
//         </div>
//       </div>
//       <div class="header-right">
//         <h1>INVOICE</h1>
//         <p class="invoice-no">${escapeHtml(invoice.invoiceNo || "")}</p>
//         <div style="margin-top: 8px;">
//           <p><span class="muted">Status:</span> <strong>${escapeHtml(invoice.status || "draft")}</strong></p>
//           <p><span class="muted">Payment:</span> <strong>${escapeHtml(invoice.paymentStatus || "pending")}</strong></p>
//           ${invoice.issueDate ? `<p><span class="muted">Date:</span> <strong>${escapeHtml(formatDateToDDMMYYYY(invoice.issueDate))}</strong></p>` : ""}
//           ${invoice.dueDate ? `<p><span class="muted">Due:</span> <strong>${escapeHtml(formatDateToDDMMYYYY(invoice.dueDate))}</strong></p>` : ""}
//         </div>
//       </div>
//     </div>

//     <div class="section">
//       <p class="section-label">Bill To</p>
//       <p style="font-size: 16px; font-weight: 700;">${escapeHtml(invoice.customerName || "-")}</p>
//       <div style="margin-top: 6px;">
//         ${billToAddress || '<p class="muted">No billing address</p>'}
//       </div>
//     </div>

//     <table>
//       <thead>
//         <tr>
//           <th>Description</th>
//           <th class="text-right">Unit Price</th>
//           <th class="text-right">Qty</th>
//           <th class="text-right">Total</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${lineRows || '<tr><td colspan="4" class="text-right muted">No line items</td></tr>'}
//       </tbody>
//     </table>

//     <div class="totals">
//       <div class="totals-row">
//         <span class="muted">Subtotal</span>
//         <span>Rs.${Number(totals.subtotal.toFixed(2)).toLocaleString("en-IN")}</span>
//       </div>
//       ${totals.discountAmount > 0 ? `<div class="totals-row discount"><span>Discount</span><span>-Rs.${Number(totals.discountAmount.toFixed(2)).toLocaleString("en-IN")}</span></div>` : ""}
//       <div class="totals-row">
//         <span class="muted">Tax</span>
//         <span>Rs.${Number(totals.taxAmount.toFixed(2)).toLocaleString("en-IN")}</span>
//       </div>
//       <div class="totals-row grand-total">
//         <span>Total</span>
//         <span>Rs.${Number(totals.total.toFixed(2)).toLocaleString("en-IN")}</span>
//       </div>
//     </div>
//   </div>
  
//   <script>
//     // Remove any browser-generated header/footer content
//     if (window.matchMedia) {
//       const mediaQueryList = window.matchMedia('print');
//       mediaQueryList.addListener(function(mql) {
//         if (mql.matches) {
//           // Hide any extra elements that might appear
//           const style = document.createElement('style');
//           style.innerHTML = \`
//             * { 
//               margin: 0; 
//               padding: 0; 
//             }
//             body { 
//               margin: 0; 
//               padding: 0; 
//             }
//           \`;
//           document.head.appendChild(style);
//         }
//       });
//     }
//   </script>
// </body>
// </html>`;
// }
