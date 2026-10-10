import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, X, Download, Briefcase,
  ChevronUp, ChevronDown, Filter, FileText, Zap, CheckCircle,
  Clock, ArrowRight, CheckSquare, Square, RefreshCw,
} from 'lucide-react';
import {
  subscribeJobs, addJob, updateJob, deleteJob, subscribeClients,
  addInvoice, generateInvoiceNumber, createPaymentRecord, getSettings,
} from '../firebase/firestore';
import type { Job, Client, Shift, InvoiceLineItem } from '../types';
import { formatINR, formatDate, todayISO, exportToCSV, COIMBATORE_AREAS, calculateGST, addDays } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

const WORK_TYPES = [
  'Loading/Unloading', 'Material Shifting', 'Packing & Sorting',
  'General Labour', 'Skilled Labour', 'Civil Helper', 'Masonry',
  'Electrical Work', 'Plumbing', 'Welding & Fabrication', 'Carpentry', 'Painting',
  'Housekeeping', 'Security Guard', 'Cleaning & Sanitation', 'Gardening',
  'Driving (Heavy/Light)', 'Forklift Operation',
  'Event Staffing', 'Catering & Hospitality', 'Bouncer Service',
  'Machine Operation', 'Fitter & Assembly', 'Quality Checking',
  'Office & Store Assistant',
];

const EMPTY_FORM = {
  date: todayISO(), clientId: '', clientName: '', location: '',
  workType: '', shift: 'Day' as Shift, manpower: 1, rate: 0,
  amount: 0, remarks: '',
  workerRate: 0, workerAllowance: 0, workerPayTotal: 0, margin: 0,
};

type SortKey = keyof Pick<Job, 'date' | 'clientName' | 'workType' | 'shift' | 'manpower' | 'amount'>;

const WorkDetails: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterWorkType, setFilterWorkType] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterInvoiced, setFilterInvoiced] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ─── Batch Selection & Conversion State ─────────────────────
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [quickInvoiceSaving, setQuickInvoiceSaving] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    const u1 = subscribeJobs(setJobs);
    const u2 = subscribeClients(setClients);
    return () => { u1(); u2(); };
  }, []);

  // Auto-calculate amount, worker pay total, and margin
  useEffect(() => {
    const amount = form.manpower * form.rate;
    const workerPayTotal = form.manpower * ((form.workerRate || 0) + (form.workerAllowance || 0));
    const margin = amount - workerPayTotal;
    setForm(f => ({ ...f, amount, workerPayTotal, margin }));
  }, [form.manpower, form.rate, form.workerRate, form.workerAllowance]);

  // Auto-suggest rate from last used rate for client + workType
  const suggestRate = useCallback((clientId: string, workType: string) => {
    if (!clientId || !workType) return;
    const matching = jobs
      .filter(j => j.clientId === clientId && j.workType === workType)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (matching.length > 0) {
      setForm(f => ({ ...f, rate: matching[0].rate }));
    }
  }, [jobs]);

  const filtered = jobs.filter(j => {
    const matchSearch = j.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      j.workType.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchClient = !filterClient || j.clientId === filterClient;
    const matchWorkType = !filterWorkType || j.workType === filterWorkType;
    const matchShift = !filterShift || j.shift === filterShift;
    const matchInvoiced = !filterInvoiced || (filterInvoiced === 'Invoiced' ? j.invoiced : !j.invoiced);
    const matchDateFrom = !dateFrom || j.date >= dateFrom;
    const matchDateTo = !dateTo || j.date <= dateTo;
    return matchSearch && matchClient && matchWorkType && matchShift && matchInvoiced && matchDateFrom && matchDateTo;
  }).sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalManpower = filtered.reduce((s, j) => s + j.manpower, 0);
  const totalAmount = filtered.reduce((s, j) => s + j.amount, 0);
  const totalWorkerPay = filtered.reduce((s, j) => s + (j.workerPayTotal || 0), 0);
  const totalMargin = filtered.reduce((s, j) => s + (j.margin || 0), 0);
  const nightCount = filtered.filter(j => j.shift === 'Night').length;
  const otCount = filtered.filter(j => j.shift === 'OT').length;

  // Selected Jobs calculations
  const selectedJobs = useMemo(() => {
    return jobs.filter(j => selectedJobIds.includes(j.id));
  }, [jobs, selectedJobIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedJobs.reduce((s, j) => s + j.amount, 0);
  }, [selectedJobs]);

  const isAllSelected = filtered.length > 0 && filtered.every(j => selectedJobIds.includes(j.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(filtered.map(j => j.id));
    }
  };

  const toggleSelectJob = (id: string) => {
    setSelectedJobIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    sortKey === col
      ? (sortDir === 'asc' ? <ChevronUp size={12} className="text-gold-400" /> : <ChevronDown size={12} className="text-gold-400" />)
      : <ChevronUp size={12} className="opacity-20" />
  );

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditJob(null);
    setShowForm(true);
  };

  const openEdit = (j: Job) => {
    setForm({
      date: j.date, clientId: j.clientId, clientName: j.clientName,
      location: j.location, workType: j.workType, shift: j.shift,
      manpower: j.manpower, rate: j.rate, amount: j.amount, remarks: j.remarks,
      workerRate: j.workerRate || 0, workerAllowance: j.workerAllowance || 0,
      workerPayTotal: j.workerPayTotal || 0, margin: j.margin || 0,
    });
    setEditJob(j);
    setShowForm(true);
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setForm(f => ({ ...f, clientId, clientName: client?.name || '' }));
    suggestRate(clientId, form.workType);
  };

  const handleWorkTypeChange = (workType: string) => {
    setForm(f => ({ ...f, workType }));
    suggestRate(form.clientId, workType);
  };

  const handleSave = async () => {
    if (!form.clientId || !form.date || !form.workType) return;
    setSaving(true);
    try {
      const amount = form.manpower * form.rate;
      const workerPayTotal = form.manpower * ((form.workerRate || 0) + (form.workerAllowance || 0));
      const margin = amount - workerPayTotal;
      const data = {
        ...form, amount, workerPayTotal, margin,
        workerRate: form.workerRate || undefined,
        workerAllowance: form.workerAllowance || undefined,
      };
      if (editJob) {
        await updateJob(editJob.id, data);
      } else {
        await addJob(data);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteJob(id);
    setDeleteConfirm(null);
  };

  // ─── CONVERT WORK DETAILS TO INVOICE (EDITOR) ─────────────
  const handleConvertToInvoice = (targetJobs?: Job[]) => {
    const jobsToConvert = targetJobs || (selectedJobs.length > 0 ? selectedJobs : filtered);
    if (!jobsToConvert || jobsToConvert.length === 0) return;

    // Determine client
    const clientId = jobsToConvert[0]?.clientId;
    // Verify all belong to same client if multiple
    const clientMatch = jobsToConvert.every(j => j.clientId === clientId);
    if (!clientMatch) {
      alert('Please select jobs belonging to the same client to convert into one invoice.');
      return;
    }

    navigate('/invoices/new', {
      state: {
        preselectedJobs: jobsToConvert,
        clientId,
        fromWorkDetails: true,
      },
    });
  };

  // ─── 1-CLICK QUICK CREATE INVOICE ──────────────────────────
  const handleQuickGenerateInvoice = async () => {
    const jobsToConvert = selectedJobs.length > 0 ? selectedJobs : filtered;
    if (!jobsToConvert || jobsToConvert.length === 0) return;

    const clientId = jobsToConvert[0]?.clientId;
    const clientMatch = jobsToConvert.every(j => j.clientId === clientId);
    if (!clientMatch) {
      alert('Please select jobs belonging to the same client to generate an invoice.');
      return;
    }

    setQuickInvoiceSaving(true);
    try {
      const client = clients.find(c => c.id === clientId);
      const settings = await getSettings();
      const realInvoiceNo = await generateInvoiceNumber();

      const dates = jobsToConvert.map(j => j.date).filter(Boolean).sort();
      const workPeriodFrom = dates[0] || todayISO();
      const workPeriodTo = dates[dates.length - 1] || todayISO();

      const lineItems: InvoiceLineItem[] = jobsToConvert.map(j => ({
        id: uuidv4(),
        date: j.date,
        location: j.location,
        workType: j.workType,
        shift: j.shift,
        manpower: j.manpower,
        rate: j.rate,
        amount: j.amount,
      }));

      const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
      const totalManpower = lineItems.reduce((s, i) => s + i.manpower, 0);

      const invoiceData = {
        invoiceNo: realInvoiceNo,
        invoiceDate: todayISO(),
        clientId: clientId,
        clientName: client?.name || jobsToConvert[0].clientName || '',
        clientAddress: client?.address || '',
        workPeriodFrom,
        workPeriodTo,
        paymentTerms: 'Due on Receipt',
        dueDate: todayISO(),
        lineItems,
        totalManpower,
        subtotal,
        gstPercent: 0,
        gstAmount: 0,
        grandTotal: subtotal,
        paidAmount: 0,
        balanceDue: subtotal,
        bankDetailsSnapshot: {
          accountName: settings?.bankDetails?.accountName || settings?.businessName || 'MAN POWER',
          accountNo: settings?.bankDetails?.accountNo || '',
          ifsc: settings?.bankDetails?.ifsc || '',
          bankName: settings?.bankDetails?.bankName || '',
          branch: settings?.bankDetails?.branch || '',
          upiId: settings?.bankDetails?.upiId || '',
        },
        qrEnabled: false,
        signatureUrl: '',
        status: 'Sent' as const,
      };

      const ref = await addInvoice(invoiceData);

      await createPaymentRecord({
        invoiceId: ref.id,
        invoiceNo: realInvoiceNo,
        clientId: clientId,
        clientName: client?.name || jobsToConvert[0].clientName || '',
        invoiceAmount: subtotal,
        paidTotal: 0,
        balance: subtotal,
        dueDate: todayISO(),
        status: 'Unpaid',
        paymentLog: [],
      });

      // Mark jobs as invoiced
      for (const j of jobsToConvert) {
        if (j.id) {
          await updateJob(j.id, {
            invoiced: true,
            invoiceId: ref.id,
            invoiceNo: realInvoiceNo,
          });
        }
      }

      setSelectedJobIds([]);
      setShowConvertModal(false);
      navigate('/invoices');
    } catch (err) {
      console.error('Failed to quick generate invoice:', err);
      alert('Error creating invoice. Please try again.');
    } finally {
      setQuickInvoiceSaving(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      filtered.map(j => ({
        Date: j.date, Client: j.clientName, Location: j.location,
        'Work Type': j.workType, Shift: j.shift, Manpower: j.manpower,
        'Client Rate (₹)': j.rate, 'Billing Amount (₹)': j.amount,
        'Worker Rate (₹)': j.workerRate || '', 'Allowance (₹)': j.workerAllowance || '',
        'Worker Pay (₹)': j.workerPayTotal || '', 'Margin (₹)': j.margin || '',
        Invoiced: j.invoiced ? 'Yes' : 'No', 'Invoice No': j.invoiceNo || '',
        Remarks: j.remarks,
      })),
      'work-details'
    );
  };

  return (
    <div className="page-container animate-fade-in relative pb-20">
      <div className="page-header flex-col md:flex-row gap-4 items-start md:items-center">
        <div>
          <h1 className="page-title">Work Details</h1>
          <p className="page-subtitle">{jobs.length} job entries · {formatINR(jobs.reduce((s, j) => s + j.amount, 0))} total</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={handleExport} className="btn-secondary flex-1 md:flex-initial flex items-center justify-center gap-2 text-xs py-2">
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => handleConvertToInvoice()}
            className="btn-secondary flex-1 md:flex-initial flex items-center justify-center gap-2 text-xs py-2 text-gold-400 border-gold-500/50 hover:bg-gold-500/10"
            title="Convert entries into an official invoice"
          >
            <FileText size={14} /> Convert to Invoice
          </button>
          <button onClick={openAdd} className="btn-primary flex-1 md:flex-initial flex items-center justify-center gap-2 text-xs py-2">
            <Plus size={15} /> Add Job
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 mb-4">
          <div className="relative w-full lg:w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500" />
            <input className="input pl-9 w-full text-xs" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select w-full lg:w-44 text-xs" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select w-full lg:w-44 text-xs" value={filterWorkType} onChange={e => setFilterWorkType(e.target.value)}>
            <option value="">All Work Types</option>
            {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="select w-full lg:w-36 text-xs" value={filterShift} onChange={e => setFilterShift(e.target.value)}>
            <option value="">All Shifts</option>
            <option value="Day">Day Shift</option>
            <option value="Night">Night Shift</option>
            <option value="OT">OT (Overtime)</option>
            <option value="Morning">Morning Shift</option>
            <option value="Evening">Evening Shift</option>
            <option value="Full Day + OT">Full Day + OT</option>
            <option value="Half Day">Half Day</option>
            <option value="Special">Special / Callout</option>
          </select>
          <select className="select w-full lg:w-32 text-xs" value={filterInvoiced} onChange={e => setFilterInvoiced(e.target.value)}>
            <option value="">All Status</option>
            <option value="Uninvoiced">Uninvoiced</option>
            <option value="Invoiced">Invoiced</option>
          </select>
          <input type="date" className="input w-full lg:w-36 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="input w-full lg:w-36 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(filterClient || filterWorkType || filterShift || filterInvoiced || dateFrom || dateTo || search) && (
            <button onClick={() => { setFilterClient(''); setFilterWorkType(''); setFilterShift(''); setFilterInvoiced(''); setDateFrom(''); setDateTo(''); setSearch(''); }} className="btn-ghost text-xs flex items-center justify-center gap-1 w-full lg:w-auto">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Jobs Shown', value: filtered.length, color: 'text-gold-400' },
            { label: 'Total Manpower', value: totalManpower, color: 'text-gold-400' },
            { label: 'Client Billing', value: formatINR(totalAmount), color: 'text-gold-400' },
            { label: 'Worker Payout', value: formatINR(totalWorkerPay), color: 'text-amber-400' },
            { label: 'Your Margin', value: formatINR(totalMargin), color: 'text-emerald-400' },
            { label: 'Night/OT', value: `${nightCount} / ${otCount}`, color: 'text-cream-300' },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-cream-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-cream-500">
            <Briefcase size={48} className="mx-auto mb-3 opacity-30" />
            <p>No job entries found. Add your first job!</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10 text-center select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-dark-400 text-gold-500 focus:ring-gold-500 bg-dark-600 cursor-pointer"
                    />
                  </th>
                  <th onClick={() => handleSort('date')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">Date <SortIcon col="date" /></div>
                  </th>
                  <th onClick={() => handleSort('clientName')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">Client <SortIcon col="clientName" /></div>
                  </th>
                  <th>Location</th>
                  <th onClick={() => handleSort('workType')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">Work Type <SortIcon col="workType" /></div>
                  </th>
                  <th onClick={() => handleSort('shift')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">Shift <SortIcon col="shift" /></div>
                  </th>
                  <th onClick={() => handleSort('manpower')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">Manpower <SortIcon col="manpower" /></div>
                  </th>
                  <th>Client Rate</th>
                  <th onClick={() => handleSort('amount')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">Billing <SortIcon col="amount" /></div>
                  </th>
                  <th className="hidden xl:table-cell">Worker Pay</th>
                  <th className="hidden xl:table-cell">Margin</th>
                  <th>Invoice Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(j => {
                  const isSelected = selectedJobIds.includes(j.id);
                  return (
                    <tr key={j.id} className={isSelected ? 'bg-gold-500/10' : ''}>
                      <td className="text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectJob(j.id)}
                          className="rounded border-dark-400 text-gold-500 focus:ring-gold-500 bg-dark-600 cursor-pointer"
                        />
                      </td>
                      <td className="text-cream-300 whitespace-nowrap text-xs">{formatDate(j.date)}</td>
                      <td className="font-medium text-cream-100 text-xs">{j.clientName}</td>
                      <td className="text-cream-400 text-xs">{j.location}</td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dark-500 text-cream-300 border border-dark-400">
                          {j.workType}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-xs ${
                          j.shift === 'Day' ? 'bg-amber-900/60 text-amber-300 border border-amber-800/60' :
                          j.shift === 'Night' ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-800/60' :
                          j.shift === 'OT' ? 'bg-purple-900/60 text-purple-300 border border-purple-800/60' :
                          j.shift === 'Morning' ? 'bg-teal-900/60 text-teal-300 border border-teal-800/60' :
                          j.shift === 'Evening' ? 'bg-orange-900/60 text-orange-300 border border-orange-800/60' :
                          j.shift === 'Full Day + OT' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-800/60' :
                          j.shift === 'Half Day' ? 'bg-blue-900/60 text-blue-300 border border-blue-800/60' :
                          'bg-rose-900/60 text-rose-300 border border-rose-800/60'
                        }`}>{j.shift}</span>
                      </td>
                      <td className="text-center font-semibold text-cream-200 text-xs">{j.manpower}</td>
                      <td className="text-cream-400 text-xs">{formatINR(j.rate)}</td>
                      <td className="font-semibold text-gold-400 text-xs">{formatINR(j.amount)}</td>
                      <td className="hidden xl:table-cell text-xs">
                        {j.workerRate ? (
                          <span className="text-amber-400">{formatINR(j.workerPayTotal || 0)}</span>
                        ) : (
                          <span className="text-cream-600">—</span>
                        )}
                      </td>
                      <td className="hidden xl:table-cell text-xs">
                        {j.margin !== undefined && j.margin !== 0 ? (
                          <span className={j.margin >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>{formatINR(j.margin)}</span>
                        ) : (
                          <span className="text-cream-600">—</span>
                        )}
                      </td>
                      <td>
                        {j.invoiced ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                            <CheckCircle size={10} /> {j.invoiceNo || 'Invoiced'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cream-500 bg-dark-600 border border-dark-500 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> Uninvoiced
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleConvertToInvoice([j])}
                            className="btn-icon text-gold-400 hover:bg-gold-500/20"
                            title="Convert this job entry to Invoice"
                          >
                            <FileText size={14} />
                          </button>
                          <button onClick={() => openEdit(j)} className="btn-icon text-cream-400 hover:text-gold-400">
                            <Edit2 size={14} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteConfirm(j.id)} className="btn-icon text-red-400 hover:text-red-300">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  <td colSpan={5} className="text-right text-cream-400">Totals →</td>
                  <td className="text-center font-bold text-gold-400">{totalManpower}</td>
                  <td></td>
                  <td className="font-bold text-gold-400">{formatINR(totalAmount)}</td>
                  <td className="hidden xl:table-cell font-bold text-amber-400">{formatINR(totalWorkerPay)}</td>
                  <td className="hidden xl:table-cell font-bold text-emerald-400">{formatINR(totalMargin)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ─── FLOATING BATCH CONVERSION BAR ────────────────────── */}
      {selectedJobIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-dark-800/95 border border-gold-500/50 backdrop-blur-md rounded-2xl px-5 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex flex-col sm:flex-row items-center gap-4 animate-fade-in max-w-[95vw]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center font-bold text-dark-900 text-xs shadow-gold">
              {selectedJobIds.length}
            </div>
            <div>
              <div className="text-xs font-bold text-cream-100">{selectedJobIds.length} Jobs Selected</div>
              <div className="text-xs text-gold-400 font-semibold">Total Billing: {formatINR(selectedTotalAmount)}</div>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-dark-500" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleConvertToInvoice()}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-semibold"
            >
              <FileText size={14} /> Open in Invoice Editor
            </button>
            <button
              onClick={() => setShowConvertModal(true)}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 text-gold-400 border-gold-500/50"
            >
              <Zap size={14} /> 1-Click Invoice
            </button>
            <button
              onClick={() => setSelectedJobIds([])}
              className="btn-ghost py-1.5 px-2 text-xs text-cream-400 hover:text-cream-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ─── 1-CLICK QUICK INVOICE CONFIRMATION MODAL ──────────── */}
      {showConvertModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowConvertModal(false)}>
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100 flex items-center gap-2">
                <Zap className="text-gold-400" size={18} /> Quick Convert to Invoice
              </h2>
              <button onClick={() => setShowConvertModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-sm text-cream-300">
                Generate an official invoice immediately from the <strong className="text-gold-400">{selectedJobs.length} selected job entries</strong>?
              </p>
              
              <div className="card p-4 space-y-2 bg-dark-800 border-gold-700/30">
                <div className="flex justify-between text-xs">
                  <span className="text-cream-400">Client:</span>
                  <span className="text-cream-100 font-semibold">{selectedJobs[0]?.clientName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cream-400">Total Manpower:</span>
                  <span className="text-cream-100">{selectedJobs.reduce((s, j) => s + j.manpower, 0)} heads</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-dark-600">
                  <span className="text-cream-300 font-medium">Grand Total:</span>
                  <span className="text-gold-400 font-bold text-base">{formatINR(selectedTotalAmount)}</span>
                </div>
              </div>

              <div className="text-xs text-cream-500">
                An official invoice number will be auto-generated and saved to your Invoices & Payments ledger.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowConvertModal(false)} className="btn-ghost text-xs">Cancel</button>
              <button
                onClick={handleQuickGenerateInvoice}
                disabled={quickInvoiceSaving}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                {quickInvoiceSaving ? 'Generating...' : 'Confirm & Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100">{editJob ? 'Edit Job Entry' : 'Add Job Entry'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Client *</label>
                  <select className="select" value={form.clientId} onChange={e => handleClientChange(e.target.value)}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Location</label>
                  <input className="input" list="area-suggestions" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Job site / area..." />
                  <datalist id="area-suggestions">
                    {COIMBATORE_AREAS.map(a => <option key={a} value={a} />)}
                  </datalist>
                </div>
                <div>
                  <label className="label">Work Type *</label>
                  <select className="select" value={form.workType} onChange={e => handleWorkTypeChange(e.target.value)}>
                    <option value="">Select type...</option>
                    {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Shift</label>
                  <select className="select" value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value as Shift }))}>
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="OT">OT (Overtime)</option>
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Full Day + OT">Full Day + OT</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Special">Special / Callout</option>
                  </select>
                </div>
                <div>
                  <label className="label">Manpower Count</label>
                  <input type="number" min="1" className="input" value={form.manpower} onChange={e => setForm(f => ({ ...f, manpower: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="label">Client Rate / Head (₹)</label>
                  <input type="number" min="0" className="input" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              {/* Worker Payment Section */}
              <div className="gold-divider" />
              <div className="text-sm font-semibold text-gold-400 flex items-center gap-2 mb-1">
                <span>💰</span> Worker Payment Breakdown
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Worker Rate / Head (₹)</label>
                  <input type="number" min="0" className="input" value={form.workerRate} onChange={e => setForm(f => ({ ...f, workerRate: parseFloat(e.target.value) || 0 }))} placeholder="300" />
                </div>
                <div>
                  <label className="label">Allowance / Head (₹) <span className="text-cream-600">(food/transport)</span></label>
                  <input type="number" min="0" className="input" value={form.workerAllowance} onChange={e => setForm(f => ({ ...f, workerAllowance: parseFloat(e.target.value) || 0 }))} placeholder="50" />
                </div>
              </div>

              {/* Financial Summary Card */}
              <div className="card p-4 space-y-2 border-gold-700/30">
                <div className="flex justify-between text-sm">
                  <span className="text-cream-400">Client Billing</span>
                  <span className="text-gold-400 font-semibold">{formatINR(form.manpower * form.rate)}</span>
                </div>
                {(form.workerRate > 0) && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-cream-400">Worker Pay ({form.manpower} × ₹{(form.workerRate || 0) + (form.workerAllowance || 0)})</span>
                      <span className="text-amber-400 font-semibold">- {formatINR(form.manpower * ((form.workerRate || 0) + (form.workerAllowance || 0)))}</span>
                    </div>
                    <div className="border-t border-dark-500 pt-2 flex justify-between text-sm">
                      <span className="text-cream-300 font-medium">Your Commission / Margin</span>
                      <span className={`font-bold text-lg ${(form.manpower * form.rate - form.manpower * ((form.workerRate || 0) + (form.workerAllowance || 0))) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatINR(form.manpower * form.rate - form.manpower * ((form.workerRate || 0) + (form.workerAllowance || 0)))}
                      </span>
                    </div>
                  </>
                )}
                {form.workerRate === 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-cream-500 italic">Enter worker rate to see margin</span>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Remarks</label>
                <input className="input" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Any notes..." />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.clientId || !form.workType} className="btn-primary">
                {saving ? 'Saving...' : editJob ? 'Update Job' : 'Add Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-red-400">Delete Job Entry?</h2>
              <button onClick={() => setDeleteConfirm(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="text-cream-400 text-sm">This will permanently remove this job entry from the system.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirm(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkDetails;
