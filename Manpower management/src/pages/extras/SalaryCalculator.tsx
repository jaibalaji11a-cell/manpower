import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Download, Search } from 'lucide-react';
import { subscribeWorkers, subscribeJobs } from '../../firebase/firestore';
import type { Worker, Job } from '../../types';
import { formatINR, formatDate } from '../../utils';
import { generateWorkerPayslipPDF } from '../../components/Workers/PayslipPDF';

const SalaryCalculator: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [monthFrom, setMonthFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [monthTo, setMonthTo] = useState(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  });
  const [advance, setAdvance] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const u1 = subscribeWorkers(setWorkers);
    const u2 = subscribeJobs(setJobs);
    return () => { u1(); u2(); };
  }, []);

  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.mobile.includes(search)
  );

  const worker = workers.find(w => w.id === selectedWorker);

  // Jobs assigned to this worker in period
  const workerJobs = useMemo(() => {
    if (!selectedWorker) return [];
    return jobs.filter(j =>
      j.workerIds?.includes(selectedWorker) &&
      j.date >= monthFrom &&
      j.date <= monthTo
    );
  }, [selectedWorker, jobs, monthFrom, monthTo]);

  const totalEarnings = workerJobs.reduce((s, j) => s + j.rate, 0);
  const netPay = totalEarnings - advance;

  const handleDownloadPayslip = async () => {
    if (!worker) return;
    await generateWorkerPayslipPDF(worker, workerJobs, advance, monthFrom, monthTo);
  };

  // Summary across all workers for the period
  const allWorkerSummary = useMemo(() => {
    return workers.map(w => {
      const wJobs = jobs.filter(j =>
        j.workerIds?.includes(w.id) &&
        j.date >= monthFrom &&
        j.date <= monthTo
      );
      return {
        worker: w,
        jobCount: wJobs.length,
        totalDays: wJobs.reduce((s, j) => s + 1, 0),
        earnings: wJobs.reduce((s, j) => s + j.rate, 0),
      };
    }).filter(s => s.jobCount > 0);
  }, [workers, jobs, monthFrom, monthTo]);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Worker Salary Calculator</h1>
          <p className="page-subtitle">Compute earnings, advances, and net pay per worker</p>
        </div>
      </div>

      <div className="page-body">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Worker List */}
          <div className="card p-4">
            <div className="section-title mb-3">Select Worker</div>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500" />
              <input className="input pl-9 text-sm" placeholder="Search workers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {filteredWorkers.map(w => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWorker(w.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedWorker === w.id
                      ? 'bg-gold-gradient text-dark-900'
                      : 'hover:bg-dark-500 text-cream-300'
                  }`}
                >
                  <div className="font-medium text-sm">{w.name}</div>
                  <div className="text-xs opacity-70">{w.workerId} · {w.area}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Calculator */}
          <div className="lg:col-span-2 space-y-4">
            {/* Period Selection */}
            <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Period From</label>
                <input type="date" className="input" value={monthFrom} onChange={e => setMonthFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Period To</label>
                <input type="date" className="input" value={monthTo} onChange={e => setMonthTo(e.target.value)} />
              </div>
              <div>
                <label className="label">Advance Deduction (₹)</label>
                <input type="number" className="input" value={advance} min={0} onChange={e => setAdvance(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {selectedWorker && worker ? (
              <>
                {/* Worker Info */}
                <div className="card p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0">
                        <span className="text-dark-900 font-bold">{worker.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="text-cream-100 font-semibold">{worker.name}</div>
                        <div className="text-cream-500 text-xs">{worker.workerId} · {worker.mobile} · {worker.area}</div>
                      </div>
                    </div>
                    <button onClick={handleDownloadPayslip} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-sm">
                      <Download size={14} /> Download Payslip
                    </button>
                  </div>
                </div>

                {/* Job Log */}
                <div className="card p-4">
                  <div className="section-title mb-3">Jobs in Period</div>
                  {workerJobs.length === 0 ? (
                    <p className="text-cream-500 text-sm">No jobs assigned to this worker in the selected period.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Work Type</th>
                            <th>Shift</th>
                            <th className="text-right">Day Rate (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workerJobs.map(j => (
                            <tr key={j.id}>
                              <td className="text-cream-400">{formatDate(j.date)}</td>
                              <td className="text-cream-100">{j.clientName}</td>
                              <td className="text-cream-400">{j.workType}</td>
                              <td><span className="badge bg-dark-500 text-cream-400 border border-dark-400 text-xs">{j.shift}</span></td>
                              <td className="text-right text-gold-400 font-semibold">{formatINR(j.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Salary Summary */}
                <div className="card p-4">
                  <div className="section-title mb-3">Salary Summary</div>
                  <div className="space-y-3 max-w-sm ml-auto">
                    <div className="flex justify-between text-sm">
                      <span className="text-cream-400">Total Days Worked</span>
                      <span className="text-cream-200 font-semibold">{workerJobs.length} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cream-400">Gross Earnings</span>
                      <span className="text-green-400 font-semibold">{formatINR(totalEarnings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cream-400">Advance Deduction</span>
                      <span className="text-red-400 font-semibold">- {formatINR(advance)}</span>
                    </div>
                    <div className="h-px bg-gold-700 opacity-30" />
                    <div className="flex justify-between">
                      <span className="font-bold text-cream-100">Net Pay</span>
                      <span className={`text-xl font-black font-heading ${netPay >= 0 ? 'text-gold-400' : 'text-red-400'}`}>{formatINR(netPay)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-cream-500">
                <Calculator size={48} className="mx-auto mb-3 opacity-30" />
                <p>Select a worker from the left to calculate salary</p>
              </div>
            )}

            {/* All Worker Summary */}
            {allWorkerSummary.length > 0 && (
              <div className="card p-4">
                <div className="section-title mb-3">All Workers Summary (Period)</div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Worker</th>
                        <th className="text-center">Jobs</th>
                        <th className="text-right">Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allWorkerSummary.map(s => (
                        <tr key={s.worker.id}>
                          <td>
                            <div className="font-medium text-cream-100">{s.worker.name}</div>
                            <div className="text-xs text-cream-500">{s.worker.workerId}</div>
                          </td>
                          <td className="text-center text-cream-300">{s.jobCount}</td>
                          <td className="text-right text-gold-400 font-semibold">{formatINR(s.earnings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryCalculator;
