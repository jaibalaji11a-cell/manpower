import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
  Briefcase, Users, TrendingUp, Activity, Moon, Clock,
  DollarSign, Percent, Wallet, ArrowUpRight,
} from 'lucide-react';
import { subscribeJobs } from '../firebase/firestore';
import type { Job } from '../types';
import { formatINR, abbreviateINR, getMonthYear, monthLabel, getLast12Months } from '../utils';

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F0C040';
const GREEN_EMERALD = '#10B981';
const AMBER_PAYOUT = '#F59E0B';
const DARK_LINE = '#3A3A3A';

type DateRange = 'month' | 'last_month' | 'quarter' | 'year' | 'all';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-700 border border-dark-400 rounded-lg p-3 shadow-dark">
      <p className="text-gold-400 font-semibold text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-cream-200 text-xs">
          {p.name}: <span className="font-bold" style={{ color: p.color || GOLD }}>{typeof p.value === 'number' && p.value > 100 ? abbreviateINR(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('month');

  useEffect(() => {
    const u1 = subscribeJobs(setJobs);
    return () => { u1(); };
  }, []);

  const filterJobs = (jobs: Job[], range: DateRange): Job[] => {
    const now = new Date();
    const startOf = (d: Date) => d.toISOString().split('T')[0];

    switch (range) {
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return jobs.filter(j => j.date >= startOf(start));
      }
      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return jobs.filter(j => j.date >= startOf(start) && j.date <= startOf(end));
      }
      case 'quarter': {
        const start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return jobs.filter(j => j.date >= startOf(start));
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1);
        return jobs.filter(j => j.date >= startOf(start));
      }
      default:
        return jobs;
    }
  };

  const filtered = useMemo(() => filterJobs(jobs, dateRange), [jobs, dateRange]);

  // KPI calculations
  const totalJobs = filtered.length;
  const totalManpower = filtered.reduce((s, j) => s + j.manpower, 0);
  const totalRevenue = filtered.reduce((s, j) => s + j.amount, 0);
  const totalWorkerPay = filtered.reduce((s, j) => s + (j.workerPayTotal || 0), 0);
  const totalProfit = filtered.reduce((s, j) => s + (j.margin !== undefined ? j.margin : (j.amount - (j.workerPayTotal || 0))), 0);
  const profitMarginPct = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const avgManpower = totalJobs > 0 ? Math.round(totalManpower / totalJobs) : 0;
  const nightCount = filtered.filter(j => j.shift === 'Night').length;
  const otCount = filtered.filter(j => j.shift === 'OT').length;

  // Monthly Revenue & Manpower & Profit (last 12 months)
  const last12 = getLast12Months();
  const monthlyData = useMemo(() => {
    return last12.map(ym => {
      const monthJobs = jobs.filter(j => getMonthYear(j.date) === ym);
      const revenue = monthJobs.reduce((s, j) => s + j.amount, 0);
      const workerPay = monthJobs.reduce((s, j) => s + (j.workerPayTotal || 0), 0);
      const profit = monthJobs.reduce((s, j) => s + (j.margin !== undefined ? j.margin : (j.amount - (j.workerPayTotal || 0))), 0);
      return {
        month: monthLabel(ym),
        Revenue: revenue,
        'Worker Payout': workerPay,
        'Net Profit': profit,
        Manpower: monthJobs.reduce((s, j) => s + j.manpower, 0),
        Jobs: monthJobs.length,
      };
    });
  }, [jobs]);

  // Client-wise Revenue & Profit
  const clientSummary = useMemo(() => {
    const map: Record<string, { name: string; jobs: number; manpower: number; revenue: number; workerPay: number; profit: number; lastJob: string }> = {};
    filtered.forEach(j => {
      if (!map[j.clientId]) map[j.clientId] = { name: j.clientName, jobs: 0, manpower: 0, revenue: 0, workerPay: 0, profit: 0, lastJob: '' };
      map[j.clientId].revenue += j.amount;
      map[j.clientId].workerPay += (j.workerPayTotal || 0);
      map[j.clientId].profit += (j.margin !== undefined ? j.margin : (j.amount - (j.workerPayTotal || 0)));
      map[j.clientId].jobs += 1;
      map[j.clientId].manpower += j.manpower;
      if (!map[j.clientId].lastJob || j.date > map[j.clientId].lastJob) {
        map[j.clientId].lastJob = j.date;
      }
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const clientRevenue = useMemo(() => clientSummary.slice(0, 8), [clientSummary]);

  // Work Type Distribution
  const workTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(j => { map[j.workType] = (map[j.workType] || 0) + j.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filtered]);

  const PIE_COLORS = [GOLD, '#F0C040', '#A8841F', '#6B5214', '#E8B820', '#C9A227', '#876A19', '#FDF8E7'];

  const KPICard = ({ label, value, icon, sub, highlight }: { label: string; value: string | number; icon: React.ReactNode; sub?: string; highlight?: boolean }) => (
    <div className={`kpi-card transition-all duration-200 ${highlight ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'hover:border-gold-700 hover:shadow-gold'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={highlight ? 'text-emerald-400' : 'text-gold-600 opacity-80'}>{icon}</span>
      </div>
      <div className={`stat-value ${highlight ? 'text-emerald-400' : ''}`}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className={`text-xs mt-0.5 font-medium ${highlight ? 'text-emerald-400' : 'text-cream-500'}`}>{sub}</div>}
    </div>
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex-col md:flex-row gap-4 items-start md:items-center">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time revenue, worker payouts & profit analysis</p>
        </div>
        {/* Date Range Filter */}
        <div className="flex gap-1 bg-dark-700 p-1 rounded-lg border border-dark-400 w-full md:w-auto overflow-x-auto whitespace-nowrap scrollbar-none">
          {(['month', 'last_month', 'quarter', 'year', 'all'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                dateRange === r ? 'bg-gold-gradient text-dark-900' : 'text-cream-400 hover:text-cream-100'
              }`}
            >
              {r === 'month' ? 'This Month' : r === 'last_month' ? 'Last Month' : r === 'quarter' ? 'Quarter' : r === 'year' ? 'This Year' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <KPICard label="Total Revenue" value={abbreviateINR(totalRevenue)} icon={<TrendingUp size={18} />} sub="Client Billing" />
          <KPICard label="Worker Payouts" value={abbreviateINR(totalWorkerPay)} icon={<Wallet size={18} />} sub="Total Wages" />
          <KPICard label="Net Profit (Margin)" value={abbreviateINR(totalProfit)} icon={<DollarSign size={18} />} sub={`${profitMarginPct}% Profit Margin`} highlight />
          <KPICard label="Total Jobs" value={totalJobs} icon={<Briefcase size={18} />} />
          <KPICard label="Total Manpower" value={totalManpower} icon={<Users size={18} />} />
          <KPICard label="Night Shifts" value={nightCount} icon={<Moon size={18} />} />
          <KPICard label="OT Jobs" value={otCount} icon={<Clock size={18} />} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Financial Performance */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="section-title"><TrendingUp size={14} /> Revenue vs Payout vs Net Profit</div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gold-400 inline-block" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Payout</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Profit</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={DARK_LINE} />
                <XAxis dataKey="month" tick={{ fill: '#B8B090', fontSize: 11 }} />
                <YAxis tick={{ fill: '#B8B090', fontSize: 11 }} tickFormatter={v => abbreviateINR(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Revenue" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, r: 3 }} />
                <Line type="monotone" dataKey="Worker Payout" stroke={AMBER_PAYOUT} strokeWidth={2} dot={{ fill: AMBER_PAYOUT, r: 2.5 }} />
                <Line type="monotone" dataKey="Net Profit" stroke={GREEN_EMERALD} strokeWidth={2.5} dot={{ fill: GREEN_EMERALD, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Manpower & Jobs Bar Chart */}
          <div className="card p-5">
            <div className="section-title mb-4"><Users size={14} /> Monthly Manpower & Job Volume</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={DARK_LINE} />
                <XAxis dataKey="month" tick={{ fill: '#B8B090', fontSize: 11 }} />
                <YAxis tick={{ fill: '#B8B090', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Manpower" name="Manpower (Heads)" fill={GOLD} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Jobs" name="Total Jobs" fill="#F0C040" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Revenue */}
          <div className="card p-5">
            <div className="section-title mb-4"><TrendingUp size={14} /> Client-wise Revenue</div>
            {clientRevenue.length === 0 ? (
              <div className="text-center py-8 text-cream-500 text-sm">No data for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={clientRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={DARK_LINE} />
                  <XAxis type="number" tick={{ fill: '#B8B090', fontSize: 11 }} tickFormatter={v => abbreviateINR(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#B8B090', fontSize: 11 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill={GOLD} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Work Type Distribution */}
          <div className="card p-5">
            <div className="section-title mb-4"><Activity size={14} /> Work Type Distribution</div>
            {workTypeData.length === 0 ? (
              <div className="text-center py-8 text-cream-500 text-sm">No data for selected period</div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-[55%] flex justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={workTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                        {workTypeData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 w-full sm:flex-1 grid grid-cols-2 sm:grid-cols-1 gap-2">
                  {workTypeData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-cream-400 truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client Summary Table with Profit Breakdown */}
        <div className="card p-5">
          <div className="section-title mb-4"><Users size={14} /> Client Performance & Profitability Breakdown</div>
          {clientSummary.length === 0 ? (
            <div className="text-center py-8 text-cream-500 text-sm">No client data for selected period</div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th className="text-center">Total Jobs</th>
                    <th className="text-center">Total Manpower</th>
                    <th className="text-right">Client Billing</th>
                    <th className="text-right">Worker Payout</th>
                    <th className="text-right">Net Profit (Margin)</th>
                    <th>Last Job</th>
                  </tr>
                </thead>
                <tbody>
                  {clientSummary.map((c) => {
                    const margin = c.profit;
                    const marginPct = c.revenue > 0 ? Math.round((margin / c.revenue) * 100) : 0;
                    return (
                      <tr key={c.name}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-dark-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-gold-400 text-xs font-bold">{c.name.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-cream-100">{c.name}</span>
                          </div>
                        </td>
                        <td className="text-center text-cream-300">{c.jobs}</td>
                        <td className="text-center text-cream-300">{c.manpower}</td>
                        <td className="text-right font-semibold text-gold-400">{formatINR(c.revenue)}</td>
                        <td className="text-right font-medium text-amber-400">{formatINR(c.workerPay)}</td>
                        <td className="text-right font-bold text-emerald-400">
                          {formatINR(margin)} <span className="text-[10px] text-emerald-500 font-normal">({marginPct}%)</span>
                        </td>
                        <td className="text-cream-500 text-sm">{c.lastJob ? new Date(c.lastJob).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
