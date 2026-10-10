import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, UserX, Clock, TrendingUp, MapPin, Briefcase, Calendar } from 'lucide-react';
import { subscribeRegisteredWorkers } from '../firebase/firestore';
import { COIMBATORE_AREAS } from '../data/coimbatoreAreas';
import { WORKER_SKILLS } from '../data/skillsList';
import type { RegisteredWorker } from '../types';

const SKILL_COLORS = ['#c9a84c', '#e6c968', '#8b7335', '#d4af37', '#f0d878', '#a0874e', '#b8941f', '#dcc570'];
const GENDER_COLORS = { Male: '#3b82f6', Female: '#ec4899', Other: '#d4af37' };
const AVAILABILITY_COLORS = { Available: '#10b981', Unavailable: '#ef4444', 'On Job': '#f59e0b' };

const CHART_THEME = {
  axisTick: '#8a8a9a',
  gridStroke: '#2d2d44',
  tooltipContentStyle: { backgroundColor: '#1a1a2e', border: '1px solid #2d2d44', color: '#e5e5e5' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-800 border border-dark-600 p-3 rounded shadow-lg text-cream-100 text-sm">
        <p className="font-semibold text-gold-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color || '#d4af37' }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const WorkerAnalytics: React.FC = () => {
  const [workers, setWorkers] = useState<RegisteredWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'All Time' | 'This Month' | 'This Week' | 'Today'>('All Time');

  useEffect(() => {
    const unsubscribe = subscribeRegisteredWorkers((data) => {
      setWorkers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredWorkers = useMemo(() => {
    if (timeFilter === 'All Time') return workers;
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return workers.filter(worker => {
      const ts = (worker.createdAt as any)?.seconds ? (worker.createdAt as any).seconds * 1000 : 0;
      if (timeFilter === 'Today') return ts >= startOfToday;
      if (timeFilter === 'This Week') return ts >= startOfWeek.getTime();
      if (timeFilter === 'This Month') return ts >= startOfMonth;
      return true;
    });
  }, [workers, timeFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let available = 0;
    let unavailable = 0;
    let newToday = 0;
    let newThisWeek = 0;
    let newThisMonth = 0;
    const areas = new Set<string>();
    const skillsCount: Record<string, number> = {};

    workers.forEach(w => {
      if (w.availability === 'Available') available++;
      else if (w.availability === 'Unavailable') unavailable++;

      const ts = (w.createdAt as any)?.seconds ? (w.createdAt as any).seconds * 1000 : 0;
      if (ts >= startOfToday) newToday++;
      if (ts >= startOfWeek.getTime()) newThisWeek++;
      if (ts >= startOfMonth) newThisMonth++;

      if (w.areaId) areas.add(w.areaId);
      (w.skills || []).forEach(skill => {
        skillsCount[skill] = (skillsCount[skill] || 0) + 1;
      });
    });

    let topSkill = 'N/A';
    let maxSkill = 0;
    Object.entries(skillsCount).forEach(([skill, count]) => {
      if (count > maxSkill) {
        maxSkill = count;
        topSkill = skill;
      }
    });

    return {
      total: workers.length,
      available,
      unavailable,
      newToday,
      newThisWeek,
      newThisMonth,
      areasCovered: areas.size,
      topSkill
    };
  }, [workers]);

  const chartData = useMemo(() => {
    const areaMap: Record<string, number> = {};
    const skillMap: Record<string, number> = {};
    const genderMap: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    const expMap: Record<string, number> = {};
    const availMap: Record<string, number> = { Available: 0, Unavailable: 0, 'On Job': 0 };
    const trendMap: Record<string, number> = {};

    // For trend, initialize last 30 days
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      trendMap[dateStr] = 0;
    }

    filteredWorkers.forEach(w => {
      // Area
      const area = COIMBATORE_AREAS.find(a => a.id === w.areaId)?.name || w.areaId || 'Unknown';
      areaMap[area] = (areaMap[area] || 0) + 1;

      // Skills (array)
      (w.skills || []).forEach(skill => {
        const skillName = WORKER_SKILLS.find(s => s.id === skill)?.name || skill;
        skillMap[skillName] = (skillMap[skillName] || 0) + 1;
      });

      // Gender
      if (w.gender && genderMap[w.gender] !== undefined) {
        genderMap[w.gender]++;
      }

      // Experience
      if (w.experience) {
        expMap[w.experience] = (expMap[w.experience] || 0) + 1;
      }

      // Availability
      if (w.availability && availMap[w.availability] !== undefined) {
        availMap[w.availability]++;
      }

      // Trend - handle Firestore Timestamp
      if (w.createdAt) {
        const ts = (w.createdAt as any)?.seconds ? (w.createdAt as any).seconds * 1000 : Number(w.createdAt);
        const d = new Date(ts);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        if (trendMap[dateStr] !== undefined) {
          trendMap[dateStr]++;
        }
      }
    });

    const topAreas = Object.entries(areaMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const skills = Object.entries(skillMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const genders = Object.entries(genderMap)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const experiences = Object.entries(expMap)
      .map(([name, count]) => ({ name, count }));
    
    // Sort experience intuitively if possible
    const expOrder = ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'];
    experiences.sort((a, b) => expOrder.indexOf(a.name) - expOrder.indexOf(b.name));

    const availabilities = Object.entries(availMap)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const trends = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

    return { topAreas, skills, genders, experiences, availabilities, trends };
  }, [filteredWorkers]);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
  
    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh] animate-fade-in">
        <div className="text-gold-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Worker Analytics</h1>
          <p className="page-subtitle">Comprehensive insights into registered workforce</p>
        </div>
        <div>
          <select 
            className="input bg-dark-800 w-40"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
          >
            <option value="All Time">All Time</option>
            <option value="This Month">This Month</option>
            <option value="This Week">This Week</option>
            <option value="Today">Today</option>
          </select>
        </div>
      </div>

      <div className="page-body space-y-6">
        {/* KPI Grid 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kpi-card bg-dark-800 p-4 rounded-lg border border-dark-600 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-dark-700 rounded-full text-cream-100">
                <Users size={24} />
              </div>
              <div>
                <p className="stat-label text-cream-400 text-sm">Total Workers</p>
                <p className="text-2xl font-bold text-cream-100">{kpis.total}</p>
              </div>
            </div>
          </div>
          
          <div className="kpi-card bg-dark-800 p-4 rounded-lg border border-dark-600 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-dark-700 rounded-full text-emerald-500">
                <UserCheck size={24} />
              </div>
              <div>
                <p className="stat-label text-cream-400 text-sm">Available</p>
                <p className="text-2xl font-bold text-emerald-500">{kpis.available}</p>
              </div>
            </div>
          </div>

          <div className="kpi-card bg-dark-800 p-4 rounded-lg border border-dark-600 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-dark-700 rounded-full text-red-500">
                <UserX size={24} />
              </div>
              <div>
                <p className="stat-label text-cream-400 text-sm">Unavailable</p>
                <p className="text-2xl font-bold text-red-500">{kpis.unavailable}</p>
              </div>
            </div>
          </div>

          <div className="kpi-card bg-dark-800 p-4 rounded-lg border border-dark-600 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-dark-700 rounded-full text-blue-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="stat-label text-cream-400 text-sm">New Today</p>
                <p className="text-2xl font-bold text-blue-400">{kpis.newToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Grid 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kpi-card bg-dark-800 p-4 rounded-lg border border-dark-600 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-dark-700 rounded-full text-blue-300">
                <Calendar size={24} />
              </div>
              <div>
                <p className="stat-label text-cream-400 text-sm">New This Week</p>
                <p className="text-xl font-bold text-cream-100">{kpis.newThisWeek}</p>
              </div>
            </div>
          </div>
          
          <div className="kpi-card bg-dark-800 p-4 rounded-lg border border-dark-600 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-dark-700 rounded-full text-blue-200">
                <Calendar size={24} />
              </div>
              <div>
                <p className="stat-label text-cream-400 text-sm">New This Month</p>
                <p className="text-xl font-bold text-cream-100">{kpis.newThisMonth}</p>
              </div>
            </div>
          </div>

          <div className="kpi-card bg-dark-800 p-4 rounded-lg border border-dark-600 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-dark-700 rounded-full text-purple-400">
                <MapPin size={24} />
              </div>
              <div>
                <p className="stat-label text-cream-400 text-sm">Areas Covered</p>
                <p className="text-xl font-bold text-cream-100">{kpis.areasCovered}</p>
              </div>
            </div>
          </div>

          <div className="kpi-card bg-dark-800 p-4 rounded-lg border border-dark-600 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-dark-700 rounded-full text-gold-400">
                <Briefcase size={24} />
              </div>
              <div>
                <p className="stat-label text-cream-400 text-sm">Top Skill</p>
                <p className="text-lg font-bold text-cream-100 truncate w-24 md:w-32" title={kpis.topSkill}>{kpis.topSkill}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Registration Trend */}
          <div className="card bg-dark-800 p-5 rounded-lg border border-dark-600 shadow-md">
            <h3 className="section-title text-gold-400 font-semibold mb-4 text-lg">Registration Trend (Last 30 Days)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridStroke} vertical={false} />
                  <XAxis dataKey="date" stroke={CHART_THEME.axisTick} tick={{ fill: CHART_THEME.axisTick }} tickLine={false} />
                  <YAxis stroke={CHART_THEME.axisTick} tick={{ fill: CHART_THEME.axisTick }} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" name="Registrations" stroke="#d4af37" strokeWidth={3} dot={{ r: 3, fill: '#d4af37', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area Distribution */}
          <div className="card bg-dark-800 p-5 rounded-lg border border-dark-600 shadow-md">
            <h3 className="section-title text-gold-400 font-semibold mb-4 text-lg">Top Areas by Worker Count</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData.topAreas} margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridStroke} horizontal={false} />
                  <XAxis type="number" stroke={CHART_THEME.axisTick} tick={{ fill: CHART_THEME.axisTick }} />
                  <YAxis dataKey="name" type="category" stroke={CHART_THEME.axisTick} tick={{ fill: CHART_THEME.axisTick, fontSize: 11 }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Workers" fill="#d4af37" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Skill Distribution */}
          <div className="card bg-dark-800 p-5 rounded-lg border border-dark-600 shadow-md">
            <h3 className="section-title text-gold-400 font-semibold mb-4 text-lg">Skill Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.skills}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.skills.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SKILL_COLORS[index % SKILL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#e5e5e5', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gender & Availability Combined */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Gender */}
            <div className="card bg-dark-800 p-5 rounded-lg border border-dark-600 shadow-md">
              <h3 className="section-title text-gold-400 font-semibold mb-4 text-lg">Gender</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.genders}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                    >
                      {chartData.genders.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={GENDER_COLORS[entry.name as keyof typeof GENDER_COLORS] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Availability */}
            <div className="card bg-dark-800 p-5 rounded-lg border border-dark-600 shadow-md">
              <h3 className="section-title text-gold-400 font-semibold mb-4 text-lg">Availability</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.availabilities}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={30}
                      dataKey="value"
                    >
                      {chartData.availabilities.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={AVAILABILITY_COLORS[entry.name as keyof typeof AVAILABILITY_COLORS] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Experience Breakdown */}
          <div className="card bg-dark-800 p-5 rounded-lg border border-dark-600 shadow-md md:col-span-2">
            <h3 className="section-title text-gold-400 font-semibold mb-4 text-lg">Experience Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.experiences} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridStroke} vertical={false} />
                  <XAxis dataKey="name" stroke={CHART_THEME.axisTick} tick={{ fill: CHART_THEME.axisTick }} angle={-15} textAnchor="end" />
                  <YAxis stroke={CHART_THEME.axisTick} tick={{ fill: CHART_THEME.axisTick }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Workers" fill="#a0874e" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WorkerAnalytics;
