import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, X, Plus, CheckCircle, AlertCircle, Clock, Search,
  MessageSquare, DollarSign, TrendingUp, AlertTriangle, Download,
  Eye, Trash2, Printer, FileText, Pencil,
} from 'lucide-react';
import { subscribePayments, recordPayment, updatePaymentLog, subscribeClients } from '../firebase/firestore';
import type { Payment, PaymentLogEntry, PaymentMode, Client } from '../types';
import { formatINR, formatDate, todayISO, isOverdue, derivePaymentStatus, buildWhatsAppLink, exportToCSV } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const STATUS_BADGE: Record<Payment['status'], string> = {
  Paid: 'badge-paid',
  'Partially Paid': 'badge-partial',
  Unpaid: 'badge-unpaid',
  Overdue: 'badge-overdue',
};

const Payments: React.FC = () => {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payEntry, setPayEntry] = useState<PaymentLogEntry>({ date: todayISO(), amount: 0, mode: 'Cash', reference: '' });
  const [saving, setSaving] = useState(false);

  // Edit log entry state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editEntry, setEditEntry] = useState<PaymentLogEntry>({ date: '', amount: 0, mode: 'Cash', reference: '' });

  // Receipt modal state
  const [receiptEntry, setReceiptEntry] = useState<{ entry: PaymentLogEntry; payment: Payment } | null>(null);

  useEffect(() => {
    const u1 = subscribePayments(setPayments);
    const u2 = subscribeClients(setClients);
    return () => { u1(); u2(); };
  }, []);

  // Update overdue status for displayed payments
  const enriched = payments.map(p => ({
    ...p,
    status: derivePaymentStatus(p.paidTotal, p.invoiceAmount, p.dueDate),
  }));

  const filtered = enriched.filter(p => {
    const matchSearch = p.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchClient = !filterClient || p.clientId === filterClient;
    return matchSearch && matchStatus && matchClient;
  });

  // Summary calculations
  const totalInvoiced = enriched.reduce((s, p) => s + p.invoiceAmount, 0);
  const totalCollected = enriched.reduce((s, p) => s + p.paidTotal, 0);
  const totalOutstanding = enriched.reduce((s, p) => s + p.balance, 0);
  const overdueCount = enriched.filter(p => p.status === 'Overdue').length;

  const openPayForm = (payment: Payment) => {
    setSelectedPayment(payment);
    setPayEntry({ date: todayISO(), amount: payment.balance > 0 ? payment.balance : 0, mode: 'Cash', reference: '' });
    setShowPayForm(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedPayment || payEntry.amount <= 0) return;
    setSaving(true);
    try {
      const newPaid = selectedPayment.paidTotal + payEntry.amount;
      const newBalance = Math.max(0, selectedPayment.invoiceAmount - newPaid);
      const newStatus = derivePaymentStatus(newPaid, selectedPayment.invoiceAmount, selectedPayment.dueDate);
      await recordPayment(selectedPayment.id, payEntry, newPaid, newBalance, newStatus);
      setShowPayForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogEntry = async (entryIdx: number) => {
    if (!selectedPayment || !selectedPayment.paymentLog) return;
    if (!window.confirm('Are you sure you want to delete this payment entry?')) return;

    setSaving(true);
    try {
      const updatedLog = selectedPayment.paymentLog.filter((_, idx) => idx !== entryIdx);
      const newPaidTotal = updatedLog.reduce((sum, item) => sum + item.amount, 0);
      const newBalance = Math.max(0, selectedPayment.invoiceAmount - newPaidTotal);
      const newStatus = derivePaymentStatus(newPaidTotal, selectedPayment.invoiceAmount, selectedPayment.dueDate);

      await updatePaymentLog(selectedPayment.id, updatedLog, newPaidTotal, newBalance, newStatus);
      
      // Update local modal state
      setSelectedPayment({
        ...selectedPayment,
        paymentLog: updatedLog,
        paidTotal: newPaidTotal,
        balance: newBalance,
        status: newStatus,
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditEntry = (idx: number) => {
    if (!selectedPayment?.paymentLog) return;
    const entry = selectedPayment.paymentLog[idx];
    setEditEntry({ date: entry.date, amount: entry.amount, mode: entry.mode, reference: entry.reference || '' });
    setEditingIdx(idx);
  };

  const handleSaveEditEntry = async () => {
    if (!selectedPayment?.paymentLog || editingIdx === null) return;
    if (editEntry.amount <= 0) return;

    setSaving(true);
    try {
      const updatedLog = selectedPayment.paymentLog.map((e, idx) =>
        idx === editingIdx ? { ...editEntry } : e
      );
      const newPaidTotal = updatedLog.reduce((sum, item) => sum + item.amount, 0);
      const newBalance = Math.max(0, selectedPayment.invoiceAmount - newPaidTotal);
      const newStatus = derivePaymentStatus(newPaidTotal, selectedPayment.invoiceAmount, selectedPayment.dueDate);

      await updatePaymentLog(selectedPayment.id, updatedLog, newPaidTotal, newBalance, newStatus);

      setSelectedPayment({
        ...selectedPayment,
        paymentLog: updatedLog,
        paidTotal: newPaidTotal,
        balance: newBalance,
        status: newStatus,
      });
      setEditingIdx(null);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(
      filtered.map(p => ({
        'Invoice No': p.invoiceNo,
        'Client Name': p.clientName,
        'Invoice Amount (₹)': p.invoiceAmount,
        'Paid Total (₹)': p.paidTotal,
        'Balance Due (₹)': p.balance,
        'Due Date': formatDate(p.dueDate),
        'Status': p.status,
        'Payment Count': p.paymentLog?.length || 0,
        'Last Payment Date': p.paymentLog?.length ? formatDate(p.paymentLog[p.paymentLog.length - 1].date) : 'None',
      })),
      `payment-tracker-${todayISO()}`
    );
  };

  const handleReminder = (payment: Payment) => {
    const client = clients.find(c => c.id === payment.clientId);
    const bankInfo = settings.bankDetails;
    
    let msg = `Hello ${payment.clientName},

This is a payment reminder from *${settings.businessName || 'MAN POWER CBE'}*.

📋 Invoice No: *${payment.invoiceNo}*
💰 Total Invoice: *${formatINR(payment.invoiceAmount)}*
✅ Received So Far: *${formatINR(payment.paidTotal)}*
🔻 Balance Due: *${formatINR(payment.balance)}*
📅 Due Date: *${formatDate(payment.dueDate)}*
${payment.status === 'Overdue' ? '⚠️ *This invoice is OVERDUE. Kindly settle the balance immediately.*' : 'Kindly arrange payment at your earliest convenience.'}`;

    if (bankInfo?.accountNo) {
      msg += `\n\n💳 *Bank Payment Details:*
Account Name: ${bankInfo.accountName || settings.businessName}
Account No: ${bankInfo.accountNo}
IFSC Code: ${bankInfo.ifsc}
Bank: ${bankInfo.bankName}${bankInfo.branch ? ` (${bankInfo.branch})` : ''}`;
    }

    if (bankInfo?.upiId) {
      msg += `\n📲 *UPI ID:* ${bankInfo.upiId}`;
    }

    msg += `\n\nContact: ${settings.email || 'manpowerofcbe@gmail.com'}
@manpower_cbe
Thank you for your business! 🙏`;

    window.open(buildWhatsAppLink(client?.mobile || '', msg), '_blank');
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div>
          <h1 className="page-title">Payment Tracker</h1>
          <p className="page-subtitle">Track invoices, collections, and outstanding payments</p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={14} /> Export Report
        </button>
      </div>

      <div className="page-body">
        {/* Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Invoiced', value: formatINR(totalInvoiced), icon: <DollarSign size={18} />, color: 'text-cream-100' },
            { label: 'Total Collected', value: formatINR(totalCollected), icon: <CheckCircle size={18} />, color: 'text-green-400' },
            { label: 'Outstanding', value: formatINR(totalOutstanding), icon: <TrendingUp size={18} />, color: 'text-amber-400' },
            { label: 'Overdue Invoices', value: overdueCount.toString(), icon: <AlertTriangle size={18} />, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="kpi-card">
              <div className="flex items-center justify-between mb-1">
                <span className={`${s.color} opacity-70`}>{s.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color} font-heading`}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500" />
            <input className="input pl-9 w-full" placeholder="Search invoice or client..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select w-full" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
          <select className="select w-full" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-cream-500">
            <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
            <p>No payment records found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Client</th>
                  <th>Invoice Amount</th>
                  <th>Paid Total</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className={`${p.status === 'Overdue' ? 'bg-red-950 bg-opacity-20' : ''} hover:bg-dark-750 transition-colors`}>
                    <td>
                      <button
                        onClick={() => navigate(`/invoices/${p.invoiceId}/edit`)}
                        className="text-gold-400 font-mono font-semibold text-sm hover:underline"
                        title="View / Edit Invoice"
                      >
                        {p.invoiceNo}
                      </button>
                    </td>
                    <td className="font-medium text-cream-100">{p.clientName}</td>
                    <td className="font-semibold text-cream-200">{formatINR(p.invoiceAmount)}</td>
                    <td className="text-green-400 font-semibold">{formatINR(p.paidTotal)}</td>
                    <td className={`font-semibold ${p.balance > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                      {formatINR(p.balance)}
                    </td>
                    <td className={`whitespace-nowrap ${p.status === 'Overdue' ? 'text-red-400' : 'text-cream-400'}`}>
                      {formatDate(p.dueDate)}
                    </td>
                    <td>
                      <span className={STATUS_BADGE[p.status]}>{p.status}</span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status !== 'Paid' && (
                          <button
                            onClick={() => openPayForm(p)}
                            className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                          >
                            <Plus size={11} /> Pay
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="btn-ghost text-xs py-1 px-2 text-cream-300 hover:text-gold-400"
                        >
                          History ({p.paymentLog?.length || 0})
                        </button>
                        {p.status !== 'Paid' && (
                          <button
                            onClick={() => handleReminder(p)}
                            className="btn-icon text-green-400 hover:text-green-300"
                            title="Send WhatsApp Reminder with Bank Details"
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/invoices/${p.invoiceId}/edit`)}
                          className="btn-icon text-cream-400 hover:text-gold-400"
                          title="View Invoice Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History Modal */}
      {selectedPayment && !showPayForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedPayment(null)}>
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <div>
                <h2 className="text-lg font-bold text-cream-100">{selectedPayment.invoiceNo}</h2>
                <p className="text-xs text-cream-500">{selectedPayment.clientName}</p>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="card p-3 text-center">
                  <div className="text-sm font-bold text-cream-100">{formatINR(selectedPayment.invoiceAmount)}</div>
                  <div className="text-xs text-cream-500">Invoice Amount</div>
                </div>
                <div className="card p-3 text-center">
                  <div className="text-sm font-bold text-green-400">{formatINR(selectedPayment.paidTotal)}</div>
                  <div className="text-xs text-cream-500">Paid Total</div>
                </div>
                <div className="card p-3 text-center">
                  <div className={`text-sm font-bold ${selectedPayment.balance > 0 ? 'text-amber-400' : 'text-green-400'}`}>{formatINR(selectedPayment.balance)}</div>
                  <div className="text-xs text-cream-500">Balance Due</div>
                </div>
              </div>

              {/* Payment Log */}
              <div>
                <div className="section-title mb-2">Payment Log History</div>
                {!selectedPayment.paymentLog?.length ? (
                  <p className="text-sm text-cream-500 py-3 text-center">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedPayment.paymentLog.map((entry, idx) => (
                      <div key={idx} className="card p-3 flex items-center justify-between border-dark-500 hover:border-dark-400 transition-colors">
                        <div>
                          <div className="text-sm text-cream-100 font-bold">{formatINR(entry.amount)}</div>
                          <div className="text-xs text-cream-400">{formatDate(entry.date)} · <span className="text-gold-400">{entry.mode}</span></div>
                          {entry.reference && <div className="text-xs text-cream-500 mt-0.5">Ref: {entry.reference}</div>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setReceiptEntry({ entry, payment: selectedPayment })}
                            className="btn-ghost text-xs py-1 px-2 flex items-center gap-1 text-gold-400"
                            title="View / Print Receipt"
                          >
                            <FileText size={12} /> Receipt
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => openEditEntry(idx)}
                              disabled={saving}
                              className="btn-icon text-blue-400 hover:text-blue-300 p-1"
                              title="Edit Payment Entry"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteLogEntry(idx)}
                              disabled={saving}
                              className="btn-icon text-red-400 hover:text-red-300 p-1"
                              title="Delete Payment Entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer flex items-center justify-between">
              {selectedPayment.status !== 'Paid' ? (
                <button onClick={() => setShowPayForm(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={14} /> Record Payment
                </button>
              ) : <div />}
              <button onClick={() => setSelectedPayment(null)} className="btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Form */}
      {showPayForm && selectedPayment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayForm(false)}>
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100">Record Payment</h2>
              <button onClick={() => setShowPayForm(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="card p-3 text-center bg-dark-700 border-gold-600/30">
                <div className="text-xs text-cream-400 mb-1">Balance Due for {selectedPayment.invoiceNo}</div>
                <div className="text-2xl font-bold text-gold-400">{formatINR(selectedPayment.balance)}</div>
              </div>
              <div>
                <label className="label">Payment Date</label>
                <input type="date" className="input" value={payEntry.date} onChange={e => setPayEntry(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Amount Received (₹)</label>
                <input type="number" className="input" value={payEntry.amount} min={1} max={selectedPayment.balance || undefined} onChange={e => setPayEntry(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="label">Payment Mode</label>
                <select className="select" value={payEntry.mode} onChange={e => setPayEntry(p => ({ ...p, mode: e.target.value as PaymentMode }))}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="label">Reference / Transaction ID</label>
                <input className="input" value={payEntry.reference} onChange={e => setPayEntry(p => ({ ...p, reference: e.target.value }))} placeholder="Transaction ID, Cheque No, etc." />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPayForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleRecordPayment} disabled={saving || payEntry.amount <= 0} className="btn-primary">
                {saving ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Entry Modal */}
      {editingIdx !== null && selectedPayment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingIdx(null)}>
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100 flex items-center gap-2">
                <Pencil size={16} className="text-blue-400" /> Edit Payment Entry
              </h2>
              <button onClick={() => setEditingIdx(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">Payment Date</label>
                <input type="date" className="input" value={editEntry.date} onChange={e => setEditEntry(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" className="input" value={editEntry.amount} min={1} onChange={e => setEditEntry(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="label">Payment Mode</label>
                <select className="select" value={editEntry.mode} onChange={e => setEditEntry(p => ({ ...p, mode: e.target.value as PaymentMode }))}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="label">Reference / Transaction ID</label>
                <input className="input" value={editEntry.reference} onChange={e => setEditEntry(p => ({ ...p, reference: e.target.value }))} placeholder="Transaction ID, Cheque No, etc." />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingIdx(null)} className="btn-ghost">Cancel</button>
              <button onClick={handleSaveEditEntry} disabled={saving || editEntry.amount <= 0} className="btn-primary flex items-center gap-2">
                {saving ? 'Saving...' : <><Pencil size={14} /> Update Entry</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {receiptEntry && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReceiptEntry(null)}>
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" /> Payment Receipt
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-ghost flex items-center gap-1 text-xs py-1.5 px-3">
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => setReceiptEntry(null)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="modal-body bg-white text-black p-6 rounded-xl space-y-4" id="printable-receipt">
              <div className="border-b-2 border-amber-600 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-lg text-black">{settings.businessName || 'MAN POWER'}</h3>
                  <p className="text-xs text-amber-700 font-semibold">{settings.tagline || 'WORKFORCE ON DEMAND — COIMBATORE'}</p>
                  <p className="text-xs text-gray-600 mt-1">{settings.email} · {settings.phone}</p>
                </div>
                <div className="text-right">
                  <span className="bg-black text-amber-400 px-3 py-1 rounded text-xs font-black tracking-wider uppercase">PAYMENT RECEIPT</span>
                  <p className="text-xs text-gray-500 mt-2">Date: {formatDate(receiptEntry.entry.date)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded border border-gray-200 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Receipt For:</span> <strong className="text-black block">{receiptEntry.payment.clientName}</strong></div>
                <div><span className="text-gray-500">Invoice No:</span> <strong className="text-black block font-mono">{receiptEntry.payment.invoiceNo}</strong></div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-600">Amount Received:</span>
                  <strong className="text-green-700 text-sm">{formatINR(receiptEntry.entry.amount)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-600">Payment Mode:</span>
                  <strong className="text-black">{receiptEntry.entry.mode}</strong>
                </div>
                {receiptEntry.entry.reference && (
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-600">Reference / Ref ID:</span>
                    <strong className="text-black">{receiptEntry.entry.reference}</strong>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-600">Invoice Total:</span>
                  <span className="text-black font-semibold">{formatINR(receiptEntry.payment.invoiceAmount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-600">Remaining Balance:</span>
                  <strong className={receiptEntry.payment.balance > 0 ? 'text-amber-700' : 'text-green-700'}>
                    {formatINR(receiptEntry.payment.balance)}
                  </strong>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
                <div>Status: <span className="font-bold text-green-700">Payment Verified</span></div>
                <div className="text-right">
                  <p className="font-bold text-black">{settings.businessName || 'MAN POWER CBE'}</p>
                  <p className="text-[10px]">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
