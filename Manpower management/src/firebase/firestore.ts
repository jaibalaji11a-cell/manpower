import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Client,
  Worker,
  Job,
  Invoice,
  Payment,
  BusinessSettings,
  PaymentLogEntry,
  RegisteredWorker,
} from '../types';

// ─── CLIENTS ────────────────────────────────────────────────

export const clientsRef = () => collection(db, 'clients');

export const addClient = async (data: Omit<Client, 'id' | 'createdAt'>) => {
  return addDoc(clientsRef(), { ...data, deleted: false, createdAt: serverTimestamp() });
};

export const updateClient = async (id: string, data: Partial<Client>) => {
  return updateDoc(doc(db, 'clients', id), { ...data, updatedAt: serverTimestamp() });
};

export const softDeleteClient = async (id: string) => {
  return updateDoc(doc(db, 'clients', id), { deleted: true, updatedAt: serverTimestamp() });
};

export const getClients = async (): Promise<Client[]> => {
  try {
    const snap = await getDocs(clientsRef());
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Client))
      .filter(c => !c.deleted)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (err) {
    console.error('Error fetching clients:', err);
    return [];
  }
};

export const subscribeClients = (cb: (clients: Client[]) => void) => {
  return onSnapshot(
    clientsRef(),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Client))
        .filter(c => !c.deleted)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      cb(list);
    },
    err => console.error('Error subscribing to clients:', err)
  );
};

// ─── WORKERS ────────────────────────────────────────────────

export const workersRef = () => collection(db, 'workers');

export const addWorker = async (data: Omit<Worker, 'id' | 'createdAt'>) => {
  return addDoc(workersRef(), { ...data, createdAt: serverTimestamp() });
};

export const updateWorker = async (id: string, data: Partial<Worker>) => {
  return updateDoc(doc(db, 'workers', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteWorker = async (id: string) => {
  return deleteDoc(doc(db, 'workers', id));
};

export const subscribeWorkers = (cb: (workers: Worker[]) => void) => {
  return onSnapshot(
    workersRef(),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Worker))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      cb(list);
    },
    err => console.error('Error subscribing to workers:', err)
  );
};

export const getWorkerById = async (id: string): Promise<Worker | null> => {
  const snap = await getDoc(doc(db, 'workers', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Worker) : null;
};

// ─── JOBS ────────────────────────────────────────────────────

export const jobsRef = () => collection(db, 'jobs');

export const addJob = async (data: Omit<Job, 'id' | 'createdAt'>) => {
  return addDoc(jobsRef(), { ...data, createdAt: serverTimestamp() });
};

export const updateJob = async (id: string, data: Partial<Job>) => {
  return updateDoc(doc(db, 'jobs', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteJob = async (id: string) => {
  return deleteDoc(doc(db, 'jobs', id));
};

export const subscribeJobs = (cb: (jobs: Job[]) => void) => {
  return onSnapshot(
    jobsRef(),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Job))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      cb(list);
    },
    err => console.error('Error subscribing to jobs:', err)
  );
};

export const getJobsForClient = async (clientId: string): Promise<Job[]> => {
  try {
    const snap = await getDocs(jobsRef());
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Job))
      .filter(j => j.clientId === clientId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (err) {
    console.error('Error fetching jobs for client:', err);
    return [];
  }
};

// ─── INVOICES ────────────────────────────────────────────────

export const invoicesRef = () => collection(db, 'invoices');

export const addInvoice = async (data: Omit<Invoice, 'id' | 'createdAt'>) => {
  return addDoc(invoicesRef(), { ...data, createdAt: serverTimestamp() });
};

export const syncPaymentForInvoice = async (invoiceId: string, invoiceData: Partial<Invoice>) => {
  try {
    const snap = await getDocs(paymentsRef());
    const matching = snap.docs.filter(d => d.data().invoiceId === invoiceId);
    for (const paymentDoc of matching) {
      const p = paymentDoc.data() as Payment;
      const newInvoiceAmount = invoiceData.grandTotal !== undefined ? invoiceData.grandTotal : p.invoiceAmount;
      const paidTotal = p.paidTotal || 0;
      const newBalance = Math.max(0, newInvoiceAmount - paidTotal);
      const dueDate = invoiceData.dueDate || p.dueDate;

      const isOverdue = newBalance > 0 && new Date(dueDate) < new Date();
      let newStatus: Payment['status'] = 'Unpaid';
      if (paidTotal >= newInvoiceAmount) newStatus = 'Paid';
      else if (isOverdue) newStatus = 'Overdue';
      else if (paidTotal > 0) newStatus = 'Partially Paid';

      const updatePayload: Record<string, any> = {
        invoiceAmount: newInvoiceAmount,
        balance: newBalance,
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      if (invoiceData.invoiceNo) updatePayload.invoiceNo = invoiceData.invoiceNo;
      if (invoiceData.clientId) updatePayload.clientId = invoiceData.clientId;
      if (invoiceData.clientName) updatePayload.clientName = invoiceData.clientName;
      if (invoiceData.dueDate) updatePayload.dueDate = invoiceData.dueDate;

      await updateDoc(doc(db, 'payments', paymentDoc.id), updatePayload);
    }
  } catch (err) {
    console.error('Error syncing payment for invoice:', err);
  }
};

export const updateInvoice = async (id: string, data: Partial<Invoice>) => {
  await updateDoc(doc(db, 'invoices', id), { ...data, updatedAt: serverTimestamp() });
  await syncPaymentForInvoice(id, data);
};

export const deleteInvoice = async (id: string) => {
  await deleteDoc(doc(db, 'invoices', id));
  try {
    const snap = await getDocs(paymentsRef());
    const matching = snap.docs.filter(d => d.data().invoiceId === id);
    for (const d of matching) {
      await deleteDoc(doc(db, 'payments', d.id));
    }
  } catch (err) {
    console.error('Error deleting associated payment:', err);
  }
};

export const subscribeInvoices = (cb: (invoices: Invoice[]) => void) => {
  return onSnapshot(
    invoicesRef(),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Invoice))
        .sort((a, b) => {
          const tA = (a.createdAt as any)?.seconds || 0;
          const tB = (b.createdAt as any)?.seconds || 0;
          return tB - tA;
        });
      cb(list);
    },
    err => console.error('Error subscribing to invoices:', err)
  );
};

export const getInvoicesForClient = async (clientId: string): Promise<Invoice[]> => {
  try {
    const snap = await getDocs(invoicesRef());
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Invoice))
      .filter(inv => inv.clientId === clientId);
  } catch (err) {
    console.error('Error fetching invoices for client:', err);
    return [];
  }
};

// ─── PAYMENTS ────────────────────────────────────────────────

export const paymentsRef = () => collection(db, 'payments');

export const createPaymentRecord = async (data: Omit<Payment, 'id' | 'createdAt'>) => {
  return addDoc(paymentsRef(), { ...data, paymentLog: [], createdAt: serverTimestamp() });
};

export const recordPayment = async (
  paymentId: string,
  entry: PaymentLogEntry,
  newPaidTotal: number,
  newBalance: number,
  newStatus: Payment['status']
) => {
  const ref = doc(db, 'payments', paymentId);
  const snap = await getDoc(ref);
  const existing = snap.data() as Payment;
  const updatedLog = [...(existing.paymentLog || []), entry];
  
  await updateDoc(ref, {
    paymentLog: updatedLog,
    paidTotal: newPaidTotal,
    balance: newBalance,
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  if (existing?.invoiceId) {
    try {
      await updateDoc(doc(db, 'invoices', existing.invoiceId), {
        paidAmount: newPaidTotal,
        balanceDue: newBalance,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to sync invoice with payment:', err);
    }
  }
};

export const updatePaymentLog = async (
  paymentId: string,
  updatedLog: PaymentLogEntry[],
  newPaidTotal: number,
  newBalance: number,
  newStatus: Payment['status']
) => {
  const ref = doc(db, 'payments', paymentId);
  const snap = await getDoc(ref);
  const existing = snap.data() as Payment;

  await updateDoc(ref, {
    paymentLog: updatedLog,
    paidTotal: newPaidTotal,
    balance: newBalance,
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  if (existing?.invoiceId) {
    try {
      await updateDoc(doc(db, 'invoices', existing.invoiceId), {
        paidAmount: newPaidTotal,
        balanceDue: newBalance,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to sync invoice with payment update:', err);
    }
  }
};

export const subscribePayments = (cb: (payments: Payment[]) => void) => {
  return onSnapshot(
    paymentsRef(),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Payment))
        .sort((a, b) => {
          const tA = (a.createdAt as any)?.seconds || 0;
          const tB = (b.createdAt as any)?.seconds || 0;
          return tB - tA;
        });
      cb(list);
    },
    err => console.error('Error subscribing to payments:', err)
  );
};

// ─── SETTINGS ────────────────────────────────────────────────

export const settingsRef = () => doc(db, 'settings', 'business');

export const getSettings = async (): Promise<BusinessSettings | null> => {
  const snap = await getDoc(settingsRef());
  return snap.exists() ? (snap.data() as BusinessSettings) : null;
};

export const updateSettings = async (data: Partial<BusinessSettings>) => {
  return setDoc(settingsRef(), data, { merge: true });
};

export const subscribeSettings = (cb: (s: BusinessSettings) => void) => {
  return onSnapshot(settingsRef(), snap => {
    if (snap.exists()) cb(snap.data() as BusinessSettings);
  });
};

// ─── INVOICE NUMBER GENERATION ───────────────────────────────

/** Read-only: returns what the NEXT invoice number would be, WITHOUT incrementing the counter.
 *  Use this when the New Invoice page loads so navigation away does not waste a number. */
export const previewNextInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const settingsSnap = await getDoc(settingsRef());
  if (!settingsSnap.exists()) return `MP-${year}-001`;
  const settings = settingsSnap.data() as BusinessSettings;
  const nextCount = (settings.invoiceCounter?.[year] || 0) + 1;
  return `MP-${year}-${String(nextCount).padStart(3, '0')}`;
};

/** Increments the counter AND returns the new number.
 *  Call this ONLY when the invoice is actually being saved. */
export const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const settingsSnap = await getDoc(settingsRef());
  
  if (!settingsSnap.exists()) {
    await setDoc(settingsRef(), { invoiceCounter: { [year]: 1 } }, { merge: true });
    return `MP-${year}-001`;
  }
  
  const settings = settingsSnap.data() as BusinessSettings;
  const currentCount = (settings.invoiceCounter?.[year] || 0) + 1;
  
  await updateDoc(settingsRef(), {
    [`invoiceCounter.${year}`]: currentCount,
  });
  
  return `MP-${year}-${String(currentCount).padStart(3, '0')}`;
};

// ─── EXPENSES (for Profit Tracker) ───────────────────────────

export const expensesRef = () => collection(db, 'expenses');

export const addExpense = async (data: { date: string; description: string; amount: number; category: string; }) => {
  return addDoc(expensesRef(), { ...data, createdAt: serverTimestamp() });
};

export const subscribeExpenses = (cb: (expenses: any[]) => void) => {
  return onSnapshot(
    expensesRef(),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
      cb(list);
    },
    err => console.error('Error subscribing to expenses:', err)
  );
};

export const deleteExpense = async (id: string) => {
  return deleteDoc(doc(db, 'expenses', id));
};

// ─── REGISTERED WORKERS (QR Self-Registration) ──────────────

export const registeredWorkersRef = () => collection(db, 'registered_workers');

// Generate unique Worker ID: MW-00001
export const generateWorkerId = async (): Promise<string> => {
  const snap = await getDocs(registeredWorkersRef());
  const nextNum = snap.size + 1;
  return `MW-${String(nextNum).padStart(5, '0')}`;
};

// Check duplicate phone
export const getRegisteredWorkerByPhone = async (phone: string): Promise<RegisteredWorker | null> => {
  try {
    const snap = await getDocs(registeredWorkersRef());
    const match = snap.docs.find(d => d.data().phone === phone);
    if (match) return { id: match.id, ...match.data() } as RegisteredWorker;
    return null;
  } catch (err) {
    console.error('Error checking phone duplicate:', err);
    return null;
  }
};

// Add new registered worker
export const addRegisteredWorker = async (data: Omit<RegisteredWorker, 'id' | 'createdAt' | 'updatedAt' | 'workerId'>): Promise<string> => {
  const workerId = await generateWorkerId();
  const docRef = await addDoc(registeredWorkersRef(), {
    ...data,
    workerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// Subscribe to all registered workers (real-time)
export const subscribeRegisteredWorkers = (cb: (workers: RegisteredWorker[]) => void) => {
  return onSnapshot(
    registeredWorkersRef(),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as RegisteredWorker))
        .sort((a, b) => {
          const tA = (a.createdAt as any)?.seconds || 0;
          const tB = (b.createdAt as any)?.seconds || 0;
          return tB - tA;
        });
      cb(list);
    },
    err => console.error('Error subscribing to registered workers:', err)
  );
};

// Update registered worker
export const updateRegisteredWorker = async (id: string, data: Partial<RegisteredWorker>) => {
  return updateDoc(doc(db, 'registered_workers', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Delete registered worker
export const deleteRegisteredWorker = async (id: string) => {
  return deleteDoc(doc(db, 'registered_workers', id));
};

// Get single registered worker by doc ID
export const getRegisteredWorkerById = async (id: string): Promise<RegisteredWorker | null> => {
  try {
    const snap = await getDoc(doc(db, 'registered_workers', id));
    if (snap.exists()) return { id: snap.id, ...snap.data() } as RegisteredWorker;
    return null;
  } catch (err) {
    console.error('Error fetching registered worker:', err);
    return null;
  }
};

// Get all registered workers (one-shot)
export const getAllRegisteredWorkers = async (): Promise<RegisteredWorker[]> => {
  try {
    const snap = await getDocs(registeredWorkersRef());
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RegisteredWorker));
  } catch (err) {
    console.error('Error fetching all registered workers:', err);
    return [];
  }
};

