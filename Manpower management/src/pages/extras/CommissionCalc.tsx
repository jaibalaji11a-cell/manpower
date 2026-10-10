import React, { useState, useEffect, useMemo } from 'react';
import { Award, Plus, Trash2, X, Download } from 'lucide-react';
import { subscribeJobs, subscribeClients } from '../../firebase/firestore';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Job, Client } from '../../types';
import { formatINR, formatDate, todayISO, exportToCSV } from '../../utils';

interface Coordinator {
  id: string;
  name: string;
  mobile: string;
  commissionPct: number;
}

const CommissionCalc: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<string>('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dateTo, setDateTo] = useState(todayISO());
  const [showAddCoord, setShowAddCoord] = useState(false);
  const [coordForm, setCoordForm] = useState({ name: '', mobile: '', commissionPct: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = subscribeJobs(setJobs);
    const u2 = subscribeClients(setClients);
    const coordRef = collection(db, 'coordinators');
    const u3 = onSnapshot(coordRef, snap => {
      setCoordinators(snap.docs.map(d => ({ id: d.id, ...d.data() } as Coordinator)));
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  const coordinator = coordinators.find(c => c.id === selectedCoord);

  const coordJobs = useMemo(() => {
    if (!selectedCoord) return [];
    return jobs.filter(j =>
      j.coordinatorId === selectedCoord &&
      j.date >= dateFrom &&
      j.date <= dateTo
    );
  }, [selectedCoord, jobs, dateFrom, dateTo]);

  const totalJobValue = coordJobs.reduce((s, j) => s + j.amount, 0);
  const commissionEarned = coordinator
    ? (totalJobValue * coordinator.commissionPct) / 100
    : 0;

  const allCoordSummary = useMemo(() => {
    return coordinators.map(coord => {
      const cJobs = jobs.filter(j =>
        j.coordinatorId === coord.id &&
        j.date >= dateFrom &&
        j.date <= dateTo
      );
      const value = cJobs.reduce((s, j) => s + j.amount, 0);
      return {
        coordinator: coord,
        jobCount: cJobs.length,
        totalValue: value,
        commission: (value * coord.commissionPct) / 100,
      };
    }).filter(s => s.jobCount > 0);
  }, [coordinators, jobs, dateFrom, dateTo]);

  const handleAddCoord = async () => {
    if (!coordForm.name) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'coordinators'), { ...coordForm, createdAt: serverTimestamp() });
      setShowAddCoord(false);
      setCoordForm({ name: '', mobile: '', commissionPct: 5 });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      allCoordSummary.map(s => ({
        Coordinator: s.coordinator.name,
        Mobile: s.coordinator.mobile,
        'Commission %': s.coordinator.commissionPct,
        'Total Jobs': s.jobCount,
        'Total Job Value (₹)': s.totalValue,
        'Commission Earned (₹)': s.commission,
      })),
      `commission-report-${dateFrom}-to-${dateTo}`
    );
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div>
          <h1 className="page-title">Coordinator Commission</h1>
          <p className="page-subtitle">Track job sourcing commissions per coordinator</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleExport} className="btn-secondary flex-1 sm:flex-initial flex items-center justify-center gap-2 text-sm">
            <Download size={14} /> Export Report
          </button>
          <button onClick={() => setShowAddCoord(true)} className="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2">
            <Plus size={16} /> Add Coordinator
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Date Range + Coordinator Select */}
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="label">Period From</label>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Period To</label>
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="label">Select Coordinator</label>
            <select className="select" value={selectedCoord} onChange={e => setSelectedCoord(e.target.value)}>
              <option value="">Select coordinator...</option>
              {coordinators.map(c => <option key={c.id} value={c.id}>{c.name} ({c.commissionPct}%)</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Individual Report */}
          {selectedCoord && coordinator ? (
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="kpi-card">
                  <div className="stat-value text-gold-400">{coordJobs.length}</div>
                  <div className="stat-label">Jobs Sourced</div>
                </div>
                <div className="kpi-card">
                  <div className="stat-value text-cream-100">{formatINR(totalJobValue)}</div>
                  <div className="stat-label">Total Job Value</div>
                </div>
                <div className="kpi-card">
                  <div className="stat-value text-green-400">{formatINR(commissionEarned)}</div>
                  <div className="stat-label">Commission ({coordinator.commissionPct}%)</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="section-title mb-3">Jobs Attributed</div>
                {coordJobs.length === 0 ? (
                  <p className="text-cream-500 text-sm">No jobs attributed to this coordinator in the period.</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Client</th>
                          <th>Work Type</th>
                          <th className="text-right">Job Value</th>
                          <th className="text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coordJobs.map(j => (
                          <tr key={j.id}>
                            <td className="text-cream-400">{formatDate(j.date)}</td>
                            <td className="text-cream-100">{j.clientName}</td>
                            <td className="text-cream-400">{j.workType}</td>
                            <td className="text-right text-cream-200">{formatINR(j.amount)}</td>
                            <td className="text-right text-green-400 font-semibold">
                              {formatINR(j.amount * (coordinator.commissionPct / 100))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3}>Total</td>
                          <td className="text-right text-gold-400 font-bold">{formatINR(totalJobValue)}</td>
                          <td className="text-right text-green-400 font-bold">{formatINR(commissionEarned)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 text-center py-16 text-cream-500">
              <Award size={48} className="mx-auto mb-3 opacity-30" />
              <p>Select a coordinator to view their commission report</p>
            </div>
          )}

          {/* All Coordinators Summary */}
          <div className="card p-4">
            <div className="section-title mb-3">All Coordinators</div>
            {coordinators.length === 0 ? (
              <p className="text-cream-500 text-sm">No coordinators added yet.</p>
            ) : (
              <div className="space-y-2">
                {coordinators.map(c => {
                  const summary = allCoordSummary.find(s => s.coordinator.id === c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCoord(c.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedCoord === c.id ? 'border-gold-600 bg-dark-600' : 'border-dark-400 hover:border-dark-300'
                      }`}
                    >
                      <div className="font-medium text-cream-100 text-sm">{c.name}</div>
                      <div className="text-xs text-cream-500">{c.commissionPct}% commission</div>
                      {summary && (
                        <div className="mt-1 flex justify-between text-xs">
                          <span className="text-cream-500">{summary.jobCount} jobs</span>
                          <span className="text-green-400 font-semibold">{formatINR(summary.commission)}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Coordinator Modal */}
      {showAddCoord && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddCoord(false)}>
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100">Add Coordinator</h2>
              <button onClick={() => setShowAddCoord(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" value={coordForm.name} onChange={e => setCoordForm(f => ({ ...f, name: e.target.value }))} placeholder="Coordinator name" />
              </div>
              <div>
                <label className="label">Mobile</label>
                <input className="input" type="tel" value={coordForm.mobile} onChange={e => setCoordForm(f => ({ ...f, mobile: e.target.value }))} placeholder="9876543210" />
              </div>
              <div>
                <label className="label">Commission Percentage (%)</label>
                <input type="number" className="input" value={coordForm.commissionPct} min={0} max={100} step={0.5} onChange={e => setCoordForm(f => ({ ...f, commissionPct: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAddCoord(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleAddCoord} disabled={saving || !coordForm.name} className="btn-primary">
                {saving ? 'Saving...' : 'Add Coordinator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionCalc;
