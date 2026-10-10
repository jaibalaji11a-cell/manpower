import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Trash2, X, Save, Printer, Download, Share2, Eye, EyeOff,
  ChevronDown, Check, AlertCircle, ArrowUpDown, FileText, Zap,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  subscribeClients, getJobsForClient,
  addInvoice, updateInvoice, createPaymentRecord,
  previewNextInvoiceNumber, generateInvoiceNumber, updateJob,
} from '../firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Client, Job, Invoice, InvoiceLineItem, Shift, BusinessSettings } from '../types';
import {
  formatINR, formatDate, todayISO, addDays, paymentTermsToDays,
  calculateGST, derivePaymentStatus, buildWhatsAppLink, buildInvoiceWhatsAppMessage,
} from '../utils';
import InvoicePreview from '../components/Invoice/InvoicePreview';
import { generateInvoicePDF } from '../components/Invoice/InvoicePDF';
import { useSettings } from '../contexts/SettingsContext';

const PAYMENT_TERMS = ['Due on Receipt', 'Net 7', 'Net 15', 'Net 30', 'Custom'];
const GST_OPTIONS = [0, 5, 12, 18];

const emptyLineItem = (): InvoiceLineItem => ({
  id: uuidv4(), date: todayISO(), location: '', workType: '', shift: 'Day', manpower: 1, rate: 0, amount: 0,
});

const InvoiceCreate: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { settings } = useSettings();

  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Invoice fields
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [workPeriodFrom, setWorkPeriodFrom] = useState('');
  const [workPeriodTo, setWorkPeriodTo] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [dueDate, setDueDate] = useState(todayISO());
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([emptyLineItem()]);
  const [gstPercent, setGstPercent] = useState(0);
  const [qrEnabled, setQrEnabled] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(settings.extras?.gstMode || false);
  const [paidAmount, setPaidAmount] = useState(0);

  const location = useLocation();
  const preselectedJobs = location.state?.preselectedJobs as Job[] | undefined;
  const fromWorkDetails = location.state?.fromWorkDetails as boolean | undefined;

  useEffect(() => {
    const u1 = subscribeClients(setClients);
    return () => u1();
  }, []);

  // Auto-fill from Work Details conversion state
  useEffect(() => {
    if (!isEdit && preselectedJobs && preselectedJobs.length > 0) {
      const clientId = location.state?.clientId || preselectedJobs[0]?.clientId;
      if (clientId) {
        setSelectedClientId(clientId);
        const client = clients.find(c => c.id === clientId);
        if (client) setClientAddress(client.address || '');
      }

      const dates = preselectedJobs.map(j => j.date).filter(Boolean).sort();
      if (dates.length > 0) {
        setWorkPeriodFrom(dates[0]);
        setWorkPeriodTo(dates[dates.length - 1]);
      }

      setLineItems(
        preselectedJobs.map(j => ({
          id: uuidv4(),
          date: j.date,
          location: j.location,
          workType: j.workType,
          shift: j.shift,
          manpower: j.manpower,
          rate: j.rate,
          amount: j.amount,
        }))
      );
    }
  }, [preselectedJobs, clients, isEdit, location.state]);

  // Load existing invoice if editing
  useEffect(() => {
    if (!isEdit || !id) return;
    const loadInvoice = async () => {
      const snap = await getDoc(doc(db, 'invoices', id));
      if (snap.exists()) {
        const inv = { id: snap.id, ...snap.data() } as Invoice;
        setInvoiceNo(inv.invoiceNo);
        setInvoiceDate(inv.invoiceDate);
        setSelectedClientId(inv.clientId);
        setClientAddress(inv.clientAddress);
        setWorkPeriodFrom(inv.workPeriodFrom);
        setWorkPeriodTo(inv.workPeriodTo);
        setPaymentTerms(inv.paymentTerms);
        setDueDate(inv.dueDate);
        setLineItems(inv.lineItems?.length ? inv.lineItems : [emptyLineItem()]);
        setGstPercent(inv.gstPercent || 0);
        setGstEnabled(inv.gstPercent > 0);
        setQrEnabled(inv.qrEnabled || false);
        setPaidAmount(inv.paidAmount || 0);
      }
    };
    loadInvoice();
  }, [isEdit, id]);

  // Preview the next invoice number on page load WITHOUT incrementing the counter.
  // The real number is only generated (and counter incremented) when Save is clicked.
  useEffect(() => {
    if (!isEdit) {
      previewNextInvoiceNumber().then(setInvoiceNo).catch(() => {
        const year = new Date().getFullYear();
        setInvoiceNo(`MP-${year}-001`);
      });
    }
  }, [isEdit]);

  // Auto-calculate due date
  useEffect(() => {
    const days = paymentTermsToDays(paymentTerms);
    setDueDate(addDays(invoiceDate, days));
  }, [invoiceDate, paymentTerms]);

  // Auto-fill client address
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) setClientAddress(client.address || '');
  };

  // Pull jobs from Work Details for selected client + period
  const pullJobsFromWorkDetails = async () => {
    if (!selectedClientId) return;
    const clientJobs = await getJobsForClient(selectedClientId);
    const inPeriod = clientJobs.filter(j => {
      if (!workPeriodFrom || !workPeriodTo) return true;
      return j.date >= workPeriodFrom && j.date <= workPeriodTo;
    });
    if (inPeriod.length > 0) {
      setLineItems(inPeriod.map(j => ({
        id: uuidv4(), date: j.date, location: j.location,
        workType: j.workType, shift: j.shift, manpower: j.manpower,
        rate: j.rate, amount: j.amount,
      })));
    }
  };

  // Line item operations
  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(items =>
      items.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'manpower' || field === 'rate') {
          updated.amount = (field === 'manpower' ? value : item.manpower) * (field === 'rate' ? value : item.rate);
        }
        return updated;
      })
    );
  };

  const addLineItem = () => setLineItems(items => [...items, emptyLineItem()]);
  
  const insertLineItemAfter = (index: number) => {
    setLineItems(items => {
      const prevDate = items[index]?.date || todayISO();
      const newItem: InvoiceLineItem = {
        ...emptyLineItem(),
        date: prevDate,
      };
      const next = [...items];
      next.splice(index + 1, 0, newItem);
      return next;
    });
  };

  const sortByDate = () => {
    setLineItems(items =>
      [...items].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    );
  };

  const removeLineItem = (id: string) => setLineItems(items => items.filter(i => i.id !== id));

  // Calculations
  const totalManpower = lineItems.reduce((s, i) => s + (i.manpower || 0), 0);
  const subtotal = lineItems.reduce((s, i) => s + (i.amount || 0), 0);
  const { gstAmount, grandTotal } = calculateGST(subtotal, gstEnabled ? gstPercent : 0);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const balanceDue = Math.max(0, grandTotal - paidAmount);

  const buildInvoiceData = (): Omit<Invoice, 'id' | 'createdAt'> => ({
    invoiceNo,
    invoiceDate,
    clientId: selectedClientId,
    clientName: selectedClient?.name || '',
    clientAddress,
    workPeriodFrom,
    workPeriodTo,
    paymentTerms,
    dueDate,
    lineItems,
    totalManpower,
    subtotal,
    gstPercent: gstEnabled ? gstPercent : 0,
    gstAmount: gstEnabled ? gstAmount : 0,
    grandTotal,
    paidAmount,
    balanceDue,
    bankDetailsSnapshot: {
      ...settings.bankDetails,
      accountName: settings.bankDetails?.accountName || settings.businessName,
    },
    qrEnabled,
    signatureUrl: '',
    status: paidAmount >= grandTotal ? 'Paid' : (paidAmount > 0 ? 'Partially Paid' : 'Sent'),
  });

  const handleSave = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      if (isEdit && id) {
        // Editing: keep the existing invoice number, just update
        const data = buildInvoiceData();
        await updateInvoice(id, data);
      } else {
        // New invoice: generate the REAL number now (increments counter exactly once)
        const realInvoiceNo = await generateInvoiceNumber();
        setInvoiceNo(realInvoiceNo);
        const data = { ...buildInvoiceData(), invoiceNo: realInvoiceNo };
        const ref = await addInvoice(data);
        // Create payment record
        await createPaymentRecord({
          invoiceId: ref.id,
          invoiceNo: realInvoiceNo,
          clientId: selectedClientId,
          clientName: selectedClient?.name || '',
          invoiceAmount: grandTotal,
          paidTotal: 0,
          balance: grandTotal,
          dueDate,
          status: 'Unpaid',
          paymentLog: [],
        });

        // Mark converted jobs as invoiced in Firestore
        if (preselectedJobs && preselectedJobs.length > 0) {
          for (const job of preselectedJobs) {
            if (job.id) {
              await updateJob(job.id, {
                invoiced: true,
                invoiceId: ref.id,
                invoiceNo: realInvoiceNo,
              });
            }
          }
        }
      }
      navigate('/invoices');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      await generateInvoicePDF(buildInvoiceData(), settings);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 500);
  };

  const handleWhatsApp = () => {
    const msg = buildInvoiceWhatsAppMessage(
      selectedClient?.name || 'Client', invoiceNo, grandTotal, dueDate
    );
    window.open(buildWhatsAppLink(selectedClient?.mobile || '', msg), '_blank');
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div>
          <h1 className="page-title">{isEdit ? `Invoice ${invoiceNo}` : 'New Invoice'}</h1>
          <p className="page-subtitle">Fill in the details and generate a professional invoice</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={() => setShowPreview(!showPreview)} className="btn-secondary flex-1 sm:flex-initial flex items-center justify-center gap-2">
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button onClick={handlePrint} className="btn-ghost flex-1 sm:flex-initial flex items-center justify-center gap-2">
            <Printer size={15} /> Print
          </button>
          <button onClick={handleGeneratePDF} disabled={generatingPDF} className="btn-secondary flex-1 sm:flex-initial flex items-center justify-center gap-2">
            <Download size={15} /> {generatingPDF ? 'Generating...' : 'PDF'}
          </button>
          <button onClick={handleWhatsApp} className="btn-ghost flex-1 sm:flex-initial flex items-center justify-center gap-2 text-green-400 hover:text-green-300">
            <Share2 size={15} /> WhatsApp
          </button>
          <button onClick={handleSave} disabled={saving || !selectedClientId} className="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2">
            <Save size={15} /> {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      <div className="page-body space-y-6">
        {fromWorkDetails && (
          <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-4 flex items-center justify-between shadow-gold">
            <div className="flex items-center gap-3">
              <Zap className="text-gold-400 flex-shrink-0" size={22} />
              <div>
                <div className="text-cream-100 font-bold text-sm">Converted from Work Details</div>
                <div className="text-cream-400 text-xs">
                  Loaded {lineItems.length} job entries for {selectedClient?.name || 'selected client'} ({formatINR(subtotal)})
                </div>
              </div>
            </div>
            <span className="badge-active text-xs">Pre-filled & Linked</span>
          </div>
        )}
        <div className={`${showPreview ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'max-w-4xl mx-auto'}`}>
          {/* Form Side */}
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="card p-5">
              <div className="section-title">Invoice Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Invoice No. *</label>
                  <input className="input font-mono" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
                </div>
                <div>
                  <label className="label">Invoice Date</label>
                  <input type="date" className="input" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Client *</label>
                  <select className="select" value={selectedClientId} onChange={e => handleClientChange(e.target.value)}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Payment Terms</label>
                  <select className="select" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                    {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="label">Client Address</label>
                  <textarea className="input min-h-[60px] resize-none" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Auto-filled from client record, editable" />
                </div>
                <div>
                  <label className="label">Work Period From</label>
                  <input type="date" className="input" value={workPeriodFrom} onChange={e => setWorkPeriodFrom(e.target.value)} />
                </div>
                <div>
                  <label className="label">Work Period To</label>
                  <input type="date" className="input" value={workPeriodTo} onChange={e => setWorkPeriodTo(e.target.value)} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="section-title mb-0">Line Items</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={sortByDate}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-gold-400 border-gold-600/30 hover:bg-gold-500/10"
                    title="Sort all items chronologically by date"
                  >
                    <ArrowUpDown size={13} /> Sort by Date
                  </button>
                  {selectedClientId && workPeriodFrom && workPeriodTo && (
                    <button onClick={pullJobsFromWorkDetails} className="btn-secondary text-xs py-1.5 px-3">
                      Pull from Work Details
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-400">
                      <th className="text-left pb-2 text-xs text-cream-500 font-medium">Date</th>
                      <th className="text-left pb-2 text-xs text-cream-500 font-medium">Location</th>
                      <th className="text-left pb-2 text-xs text-cream-500 font-medium">Work Type</th>
                      <th className="text-left pb-2 text-xs text-cream-500 font-medium">Shift</th>
                      <th className="text-center pb-2 text-xs text-cream-500 font-medium">Manpower</th>
                      <th className="text-right pb-2 text-xs text-cream-500 font-medium">Rate</th>
                      <th className="text-right pb-2 text-xs text-cream-500 font-medium">Amount</th>
                      <th className="pb-2 text-center text-xs text-cream-500 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={item.id} className="border-b border-dark-500 hover:bg-dark-750 transition-colors">
                        <td className="py-2 pr-2">
                          <input type="date" className="input-sm w-32" value={item.date} onChange={e => updateLineItem(item.id, 'date', e.target.value)} />
                        </td>
                        <td className="py-2 pr-2">
                          <input className="input-sm w-28" value={item.location} onChange={e => updateLineItem(item.id, 'location', e.target.value)} placeholder="Location" />
                        </td>
                        <td className="py-2 pr-2">
                          <input className="input-sm w-36" value={item.workType} onChange={e => updateLineItem(item.id, 'workType', e.target.value)} placeholder="Work type" />
                        </td>
                        <td className="py-2 pr-2">
                          <select className="input-sm w-28" value={item.shift} onChange={e => updateLineItem(item.id, 'shift', e.target.value as Shift)}>
                            <option value="Day">Day</option>
                            <option value="Night">Night</option>
                            <option value="OT">OT</option>
                            <option value="Morning">Morning</option>
                            <option value="Evening">Evening</option>
                            <option value="Full Day + OT">Full Day + OT</option>
                            <option value="Half Day">Half Day</option>
                            <option value="Special">Special</option>
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" className="input-sm w-20 text-center" value={item.manpower} min={1} onChange={e => updateLineItem(item.id, 'manpower', parseInt(e.target.value) || 1)} />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" className="input-sm w-24 text-right" value={item.rate} min={0} onChange={e => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <span className="text-gold-400 font-semibold text-xs">{formatINR(item.amount)}</span>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => insertLineItemAfter(idx)}
                              className="btn-icon text-gold-400 hover:bg-gold-500/20 p-1 rounded"
                              title="Insert row below this item"
                            >
                              <Plus size={14} />
                            </button>
                            {lineItems.length > 1 && (
                              <button
                                onClick={() => removeLineItem(item.id)}
                                className="btn-icon text-red-400 hover:bg-red-500/20 p-1 rounded"
                                title="Delete row"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-3">
                <button onClick={addLineItem} className="btn-ghost text-sm flex items-center gap-2 text-gold-400">
                  <Plus size={14} /> Add Row at Bottom
                </button>
                <button
                  onClick={sortByDate}
                  className="text-xs text-cream-400 hover:text-gold-400 flex items-center gap-1 transition-colors"
                >
                  <ArrowUpDown size={12} /> Auto-sort rows by date
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="card p-5">
              <div className="section-title">Totals</div>
              <div className="space-y-3 max-w-sm ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-cream-400">Total Manpower</span>
                  <span className="text-cream-200 font-semibold">{totalManpower} workers</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-cream-400">Subtotal</span>
                  <span className="text-cream-200 font-semibold">{formatINR(subtotal)}</span>
                </div>

                {/* GST Toggle */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setGstEnabled(!gstEnabled)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${gstEnabled ? 'bg-gold-600' : 'bg-dark-400'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${gstEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-cream-400">GST</span>
                  </label>
                  {gstEnabled && (
                    <select className="select w-24 text-sm py-1" value={gstPercent} onChange={e => setGstPercent(parseFloat(e.target.value))}>
                      {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
                    </select>
                  )}
                </div>

                {gstEnabled && gstPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-cream-400">GST ({gstPercent}%)</span>
                    <span className="text-cream-200">{formatINR(gstAmount)}</span>
                  </div>
                )}

                <div className="h-px bg-gold-700 opacity-30" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-cream-100">Grand Total</span>
                  <span className="text-xl font-black text-gold-400 font-heading">{formatINR(grandTotal)}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-green-400 font-medium">Advance / Amount Paid</span>
                  <input
                    type="number"
                    min={0}
                    max={grandTotal}
                    className="input-sm w-32 text-right text-green-400 font-semibold"
                    value={paidAmount || ''}
                    onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="₹0"
                  />
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-dark-500">
                  <span className="text-sm font-bold text-amber-400">Balance Due</span>
                  <span className="text-base font-bold text-amber-400 font-heading">{formatINR(balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="card p-5">
              <div className="section-title">Invoice Options</div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setQrEnabled(!qrEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${qrEnabled ? 'bg-gold-600' : 'bg-dark-400'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${qrEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-cream-300">Show UPI QR Code on invoice</span>
              </label>
            </div>
          </div>

          {/* Preview Side */}
          {showPreview && (
            <div className="sticky top-4 h-fit w-full overflow-x-auto border border-dark-500 rounded-2xl p-2 bg-dark-800">
              <div ref={previewRef} className="min-w-[210mm] max-w-full">
                <InvoicePreview
                  invoice={buildInvoiceData()}
                  settings={settings}
                  gstEnabled={gstEnabled}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreate;
