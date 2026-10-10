import { Timestamp } from 'firebase/firestore';

// ─── CLIENT ──────────────────────────────────────────────────
export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;
  gst: string;
  address: string;
  deleted: boolean;
  createdAt: Timestamp;
}

// ─── WORKER ──────────────────────────────────────────────────
export interface BankDetails {
  accountNo: string;
  ifsc: string;
  bankName: string;
  branch: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Worker {
  id: string;
  workerId: string;
  name: string;
  mobile: string;
  area: string;
  skills: string[];
  bankDetails: BankDetails;
  upi: string;
  status: 'Active' | 'Inactive';
  createdAt: Timestamp;
  // Extended fields
  aadhaar?: string;
  address?: string;
  bloodGroup?: string;
  dailyWage?: number;
  dateOfJoining?: string;
  emergencyContact?: EmergencyContact;
}

// ─── JOB ─────────────────────────────────────────────────────
export type Shift = 'Day' | 'Night' | 'OT' | 'Morning' | 'Evening' | 'Full Day + OT' | 'Half Day' | 'Special';

export interface Job {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  clientId: string;
  clientName: string;
  location: string;
  workType: string;
  shift: Shift;
  manpower: number;
  rate: number;          // Client billing rate per head
  amount: number;        // Total client billing (manpower × rate)
  remarks: string;
  // Worker payment breakdown
  workerRate?: number;      // Pay rate per worker
  workerAllowance?: number; // Extra allowance per worker (food/transport)
  workerPayTotal?: number;  // Total payout to workers = manpower × (workerRate + workerAllowance)
  margin?: number;          // Profit margin = amount - workerPayTotal
  // Invoice linkage
  invoiced?: boolean;
  invoiceId?: string;
  invoiceNo?: string;
  workerIds?: string[];
  coordinatorId?: string;
  coordinatorCommissionPct?: number;
  createdAt: Timestamp;
}

// ─── INVOICE ─────────────────────────────────────────────────
export interface InvoiceLineItem {
  id: string;
  date: string;
  location: string;
  workType: string;
  shift: Shift;
  manpower: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  workPeriodFrom: string;
  workPeriodTo: string;
  paymentTerms: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  totalManpower: number;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  paidAmount?: number;
  balanceDue?: number;
  bankDetailsSnapshot: BankDetails & { accountName: string; upiId?: string };
  qrEnabled: boolean;
  signatureUrl: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Partially Paid' | 'Overdue';
  createdAt: Timestamp;
}

// ─── PAYMENT ─────────────────────────────────────────────────
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';

export interface PaymentLogEntry {
  date: string;
  amount: number;
  mode: PaymentMode;
  reference?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  clientId: string;
  clientName: string;
  invoiceAmount: number;
  paidTotal: number;
  balance: number;
  dueDate: string;
  status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
  paymentLog: PaymentLogEntry[];
  createdAt: Timestamp;
}

// ─── SETTINGS ────────────────────────────────────────────────
export interface BusinessBankDetails {
  accountName: string;
  accountNo: string;
  ifsc: string;
  bankName: string;
  branch: string;
  upiId: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  logoUrl: string;
  bankDetails: BusinessBankDetails;
  defaultGstPercent: number;
  invoiceCounter: Record<number, number>;
  extras: {
    gstMode: boolean;
    whatsappShare: boolean;
    profitTracker: boolean;
    workerSalaryCalc: boolean;
    reminderTracker: boolean;
    coordinatorCommission: boolean;
  };
}

// ─── USER / AUTH ─────────────────────────────────────────────
export type UserRole = 'Admin' | 'Operator' | 'Supervisor' | 'Coordinator';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  status?: 'Active' | 'Inactive';
}

// ─── EXPENSE (Profit Tracker) ─────────────────────────────────
export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  createdAt: Timestamp;
}

// ─── COORDINATOR ─────────────────────────────────────────────
export interface Coordinator {
  id: string;
  name: string;
  mobile: string;
  commissionPct: number;
  createdAt: Timestamp;
}

// ─── REGISTERED WORKER (QR Self-Registration) ────────────────
export type WorkerAvailability = 'Available' | 'Unavailable' | 'On Job';
export type WorkerGender = 'Male' | 'Female' | 'Other';

export interface RegisteredWorker {
  id: string;
  workerId: string;             // MW-00001 format
  name: string;
  phone: string;
  altPhone?: string;
  gender: WorkerGender;
  age: number;
  areaId: string;
  areaName: string;
  skills: string[];             // skill IDs from skillsList
  skillNames: string[];         // skill display names
  experience: string;           // 'fresher', '0-1', '1-3', '3-5', '5-10', '10+'
  availability: WorkerAvailability;
  preferredAreas: string[];     // area IDs
  profilePhoto?: string;        // base64 or URL
  collegeName?: string;         // optional college/institution name for student workers
  customArea?: string;          // custom area/street if not in predefined list
  roleType?: string;            // 'student' | 'fresher' | 'experienced'
  status: 'Active' | 'Inactive' | 'Pending';
  source: 'qr_registration';
  editToken?: string;           // one-time edit token
  edited?: boolean;             // true after first edit
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
