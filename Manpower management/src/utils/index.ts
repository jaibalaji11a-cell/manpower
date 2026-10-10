// ─── Indian Number Formatting ────────────────────────────────

/**
 * Format a number as Indian Rupees (e.g., ₹1,25,000)
 */
export const formatINR = (amount: number): string => {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format a number with Indian comma separators (no ₹ symbol)
 */
export const formatIndianNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN').format(num);
};

// ─── Date Utilities ──────────────────────────────────────────

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const toISODate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const todayISO = (): string => toISODate(new Date());

export const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export const paymentTermsToDays = (terms: string): number => {
  switch (terms) {
    case 'Due on Receipt': return 0;
    case 'Net 7': return 7;
    case 'Net 15': return 15;
    case 'Net 30': return 30;
    default: return 0;
  }
};

export const isOverdue = (dueDateStr: string, balance: number): boolean => {
  if (balance <= 0) return false;
  return new Date(dueDateStr) < new Date();
};

// ─── Month Utilities ─────────────────────────────────────────

export const getMonthYear = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (ym: string): string => {
  const [year, month] = ym.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

export const getLast12Months = (): string[] => {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
};

// ─── WhatsApp Share ──────────────────────────────────────────

export const buildWhatsAppLink = (phone: string, message: string): string => {
  const encodedMsg = encodeURIComponent(message);
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone) {
    return `https://wa.me/91${cleanPhone}?text=${encodedMsg}`;
  }
  return `https://wa.me/?text=${encodedMsg}`;
};

export const buildInvoiceWhatsAppMessage = (
  clientName: string,
  invoiceNo: string,
  grandTotal: number,
  dueDate: string
): string => {
  return `Hello ${clientName},

This is a payment reminder from *MAN POWER CBE*.

📋 Invoice No: *${invoiceNo}*
💰 Amount Due: *${formatINR(grandTotal)}*
📅 Due Date: *${formatDate(dueDate)}*

Kindly arrange the payment at your earliest convenience.

For queries, contact: manpowerofcbe@gmail.com
@manpower_cbe

Thank you for your business! 🙏`;
};

// ─── Worker ID Generation ─────────────────────────────────────

export const generateWorkerId = (workers: { workerId?: string }[]): string => {
  const maxNum = workers.reduce((max, w) => {
    const num = parseInt(w.workerId?.replace('WK-', '') || '0', 10);
    return num > max ? num : max;
  }, 0);
  return `WK-${String(maxNum + 1).padStart(3, '0')}`;
};

// ─── GST Calculation ─────────────────────────────────────────

export const calculateGST = (subtotal: number, gstPercent: number) => {
  const gstAmount = (subtotal * gstPercent) / 100;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const grandTotal = subtotal + gstAmount;
  return { gstAmount, cgst, sgst, grandTotal };
};

// ─── Payment Status ───────────────────────────────────────────

export const derivePaymentStatus = (
  paidTotal: number,
  invoiceAmount: number,
  dueDate: string
): 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue' => {
  if (paidTotal >= invoiceAmount) return 'Paid';
  const balance = invoiceAmount - paidTotal;
  if (isOverdue(dueDate, balance)) return 'Overdue';
  if (paidTotal > 0) return 'Partially Paid';
  return 'Unpaid';
};

// ─── CSV Export ───────────────────────────────────────────────

export const exportToCSV = (data: Record<string, any>[], filename: string) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ─── Number Abbreviation ──────────────────────────────────────

export const abbreviateINR = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
};

// ─── Area Presets ─────────────────────────────────────────────

export const COIMBATORE_AREAS = [
  'Gandhipuram',
  'RS Puram',
  'Peelamedu',
  'Saravanampatti',
  'Saibaba Colony',
  'Singanallur',
  'Ukkadam',
  'Avinashi Road',
  'Trichy Road',
  'Pollachi Road',
  'Mettupalayam Road',
  'Sivananda Colony',
  'Ramanathapuram',
  'Race Course',
  'Vadavalli',
  'Ganapathy',
  'Kurichi (SIDCO)',
  'Sulur',
  'Thudiyalur',
  'Kovaipudur',
  'Kuniyamuthur',
  'Podanur',
  'Sundarapuram',
  'Thondamuthur',
  'Perur',
  'Kovilpalayam',
  'Karamadai',
  'Pollachi',
];
