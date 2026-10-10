import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Plus, Trash2, X, DollarSign, ArrowUpCircle, ArrowDownCircle,
  PieChart as PieChartIcon, Download, Filter, Building2, Wallet, Layers, AlertCircle, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { subscribeInvoices, subscribePayments, subscribeExpenses, subscribeJobs, addExpense, deleteExpense } from '../../firebase/firestore';
import type { Invoice, Payment, Expense, Job } from '../../types';
import { formatINR, abbreviateINR, getMonthYear, monthLabel, getLast12Months, todayISO } from '../../utils';

const EXPENSE_CATEGORIES = ['Worker Wages', 'Transport', 'Equipment & Tools', 'Office & Admin', 'Misc'];
const CATEGORY_COLORS: Record<string, string> = {
  'Worker Wages': '#3B82F6',
  'Transport': '#F59E0B',
  'Equipment & Tools': '#EC4899',
  'Office & Admin': '#8B5CF6',
  'Misc': '#6B7280',
};

const ProfitTracker: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expForm, setExpForm] = useState({ date: todayISO(), description: '', amount: 0, category: 'Worker Wages' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterTimeframe, setFilterTimeframe] = useState<'all' | '12m' | '6m'>('all');

  useEffect(() => {
    const u1 = subscribeInvoices(setInvoices);
    const u2 = subscribePayments(setPayments);
    const u3 = subscribeExpenses(setExpenses);
    const u4 = subscribeJobs(setJobs);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const last12 = getLast12Months();

  // Monthly Revenue & Expense Aggregation (combining Job Worker Wages + Manual Expenses)
  const monthlyData = useMemo(() => {
    return last12.map(ym => {
      const monthInvoices = invoices.filter(inv => getMonthYear(inv.invoiceDate || '') === ym);
      const revenue = monthInvoices.reduce((s, inv) => s + inv.grandTotal, 0);

      const monthPayments = payments.filter(p => p.paymentLog?.some(l => getMonthYear(l.date) === ym));
      const collected = payments.reduce((s, p) => {
        const monthLogs = (p.paymentLog || []).filter(l => getMonthYear(l.date) === ym);
        return s + monthLogs.reduce((sum, item) => sum + item.amount, 0);
      }, 0);

      const monthManualExp = expenses.filter(e => getMonthYear(e.date) === ym).reduce((s, e) => s + (e.amount || 0), 0);
      const monthJobWages = jobs.filter(j => getMonthYear(j.date) === ym).reduce((s, j) => s + (j.workerPayTotal || 0), 0);

      const expenseTotal = monthManualExp + monthJobWages;

      return {
        month: monthLabel(ym),
        Invoiced: revenue,
        Collected: collected,
        Expenses: expenseTotal,
        NetProfit: revenue - expenseTotal,
      };
    });
  }, [invoices, payments, expenses, jobs]);

  // Overall Financial Totals
  const totalInvoiced = useMemo(() => invoices.reduce((s, inv) => s + inv.grandTotal, 0), [invoices]);
  const totalCollected = useMemo(() => payments.reduce((s, p) => s + p.paidTotal, 0), [payments]);
  const totalManualExpenses = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const totalJobWorkerWages = useMemo(() => jobs.reduce((s, j) => s + (j.workerPayTotal || 0), 0), [jobs]);

  const totalAllExpenses = totalManualExpenses + totalJobWorkerWages;
  const netAccruedProfit = totalInvoiced - totalAllExpenses;
  const netRealizedProfit = totalCollected - totalAllExpenses;
  const profitMarginPct = totalInvoiced > 0 ? Math.round((netAccruedProfit / totalInvoiced) * 100) : 0;

  const missingWorkerRatesCount = useMemo(() => {
    return jobs.filter(j => !j.workerRate || j.workerRate === 0).length;
  }, [jobs]);

  // Expense Breakdown by Category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    if (totalJobWorkerWages > 0) {
      map['Worker Wages'] = totalJobWorkerWages;
    }
    for (const e of expenses) {
      const cat = e.category || 'Misc';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    }
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#6B7280',
    }));
  }, [expenses, totalJobWorkerWages]);

  // Client-wise Profitability Breakdown
  const clientProfitability = useMemo(() => {
    const map: Record<string, { clientName: string; invoiced: number; collected: number; count: number }> = {};
    for (const inv of invoices) {
      const name = inv.clientName || 'Unknown Client';
      if (!map[name]) {
        map[name] = { clientName: name, invoiced: 0, collected: 0, count: 0 };
      }
      map[name].invoiced += inv.grandTotal;
      map[name].count += 1;

      const matchingPayment = payments.find(p => p.invoiceId === inv.id || p.invoiceNo === inv.invoiceNo);
      if (matchingPayment) {
        map[name].collected += matchingPayment.paidTotal;
      }
    }
    return Object.values(map);
  }, [invoices, payments]);

  const handleAddExpense = async () => {
    if (!expForm.description || expForm.amount <= 0) return;
    setSaving(true);
    try {
      await addExpense({
        date: expForm.date,
        description: expForm.description,
        amount: Number(expForm.amount),
        category: expForm.category,
      });
      setExpForm({ date: todayISO(), description: '', amount: 0, category: 'Worker Wages' });
      setShowAddExpense(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="page-container animate-fade-in relative pb-20">
      <div className="page-header flex-col md:flex-row gap-4 items-start md:items-center">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <TrendingUp className="text-gold-400" /> Profit & Expense Tracker
          </h1>
          <p className="page-subtitle">Realized & Accrued P&L analytics across client billing, worker payouts & expenses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddExpense(true)} className="btn-primary text-xs flex items-center gap-1.5">
            <Plus size={15} /> Add Business Expense
          </button>
        </div>
      </div>

      <div className="page-body space-y-6">
        {/* Missing Worker Rates Alert */}
        {missingWorkerRatesCount > 0 && (
          <div className="card p-4 border-amber-500/40 bg-amber-950/20 flex items-start gap-3">
            <Info className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-cream-300">
              <strong className="text-amber-400 font-semibold">Worker Pay Rates Notice:</strong> {missingWorkerRatesCount} job entries in Work Details do not have worker pay rates entered yet. To calculate your exact net profit margin (Client Rate minus Worker Rate), edit those jobs in <strong className="text-gold-400">Work Details</strong> to enter worker pay rates.
            </div>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="flex items-center justify-between text-cream-400 text-xs mb-1">
              <span>Total Invoiced</span>
              <ArrowUpCircle size={16} className="text-gold-400" />
            </div>
            <div className="text-2xl font-bold text-gold-400 font-heading">{formatINR(totalInvoiced)}</div>
            <div className="text-[11px] text-cream-500 mt-1">{invoices.length} total invoices</div>
          </div>

          <div className="kpi-card">
            <div className="flex items-center justify-between text-cream-400 text-xs mb-1">
              <span>Total Expenses & Wages</span>
              <ArrowDownCircle size={16} className="text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400 font-heading">{formatINR(totalAllExpenses)}</div>
            <div className="text-[11px] text-cream-500 mt-1">Wages: {formatINR(totalJobWorkerWages)} · Overhead: {formatINR(totalManualExpenses)}</div>
          </div>

          <div className="kpi-card border-emerald-500/40 bg-emerald-950/10">
            <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
              <span>Net Accrued Profit</span>
              <DollarSign size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-heading">{formatINR(netAccruedProfit)}</div>
            <div className="text-[11px] text-emerald-500 font-medium mt-1">{profitMarginPct}% Profit Margin</div>
          </div>

          <div className="kpi-card">
            <div className="flex items-center justify-between text-cream-400 text-xs mb-1">
              <span>Cash Realized Profit</span>
              <Wallet size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400 font-heading">{formatINR(netRealizedProfit)}</div>
            <div className="text-[11px] text-cream-500 mt-1">From {formatINR(totalCollected)} collected</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly P&L Trend */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="section-title"><TrendingUp size={14} /> Monthly Invoiced vs Expenses vs Net Profit</div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" />
                <XAxis dataKey="month" tick={{ fill: '#B8B090', fontSize: 11 }} />
                <YAxis tick={{ fill: '#B8B090', fontSize: 11 }} tickFormatter={v => abbreviateINR(v)} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Invoiced" name="Invoiced Revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" name="Total Expenses & Wages" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetProfit" name="Net Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Category Breakdown */}
          <div className="card p-5">
            <div className="section-title mb-4"><PieChartIcon size={14} /> Expense Breakdown</div>
            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-12 text-cream-500 text-xs">
                No expenses logged yet. Worker payouts and added business expenses will appear here.
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={40}>
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {categoryBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-cream-200">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gold-400">{formatINR(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expenses List & Client Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overhead Expenses List */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="section-title"><Wallet size={14} /> Logged Overhead Expenses</div>
              <span className="text-xs text-cream-500">{expenses.length} entries</span>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-10 text-cream-500 text-xs">
                No custom overhead expenses logged (e.g. transport, equipment, office rent). Click "Add Business Expense" above to add one.
              </div>
            ) : (
              <div className="table-wrapper max-h-72 overflow-y-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="text-cream-400 text-xs">{e.date}</td>
                        <td><span className="badge bg-dark-600 text-cream-200 border border-dark-400">{e.category}</span></td>
                        <td className="text-cream-100 text-xs font-medium">{e.description}</td>
                        <td className="text-right text-red-400 font-semibold text-xs">{formatINR(e.amount)}</td>
                        <td className="text-center">
                          <button onClick={() => setDeleteConfirm(e.id)} className="btn-icon text-red-400 hover:text-red-300">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Client Invoiced vs Collected */}
          <div className="card p-5">
            <div className="section-title mb-4"><Building2 size={14} /> Client Invoiced vs Collected</div>
            {clientProfitability.length === 0 ? (
              <div className="text-center py-10 text-cream-500 text-xs">No client invoice data</div>
            ) : (
              <div className="table-wrapper max-h-72 overflow-y-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th className="text-center">Invoices</th>
                      <th className="text-right">Invoiced</th>
                      <th className="text-right">Collected</th>
                      <th className="text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientProfitability.map((c) => (
                      <tr key={c.clientName}>
                        <td className="font-medium text-cream-100 text-xs">{c.clientName}</td>
                        <td className="text-center text-cream-400 text-xs">{c.count}</td>
                        <td className="text-right text-gold-400 font-semibold text-xs">{formatINR(c.invoiced)}</td>
                        <td className="text-right text-green-400 font-medium text-xs">{formatINR(c.collected)}</td>
                        <td className="text-right text-red-400 font-medium text-xs">{formatINR(Math.max(0, c.invoiced - c.collected))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddExpense(false)}>
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100 flex items-center gap-2">
                <Plus size={18} className="text-gold-400" /> Log Business Expense
              </h2>
              <button onClick={() => setShowAddExpense(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="select" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="e.g. Transport for TIDEL PARK site" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" className="input" placeholder="e.g. 1500" value={expForm.amount || ''} onChange={e => setExpForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAddExpense(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleAddExpense} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-red-400">Delete Expense?</h2>
              <button onClick={() => setDeleteConfirm(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body text-cream-400 text-sm">
              Are you sure you want to delete this expense entry?
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirm(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => handleDeleteExpense(deleteConfirm)} className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitTracker;
