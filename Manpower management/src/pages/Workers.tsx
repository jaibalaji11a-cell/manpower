import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, X, HardHat,
  Phone, MapPin, CreditCard, CheckCircle, XCircle,
  Download, LayoutGrid, LayoutList, Users, UserCheck, UserX,
  Briefcase, Eye, Calendar, IndianRupee, Heart,
} from 'lucide-react';
import Select from 'react-select';
import { subscribeWorkers, addWorker, updateWorker, deleteWorker } from '../firebase/firestore';
import type { Worker, BankDetails, EmergencyContact } from '../types';
import { generateWorkerId, COIMBATORE_AREAS } from '../utils';
import { useAuth } from '../contexts/AuthContext';

const SKILL_OPTIONS = [
  'Loading', 'Unloading', 'Material Shifting', 'Packing', 'Sorting',
  'General Labour', 'Skilled Labour', 'Civil Helper', 'Masonry',
  'Electrical Work', 'Plumbing', 'Welding & Fabrication', 'Carpentry', 'Painting',
  'Security Guard', 'Housekeeping', 'Cleaning', 'Gardening & Landscaping',
  'Driving (Heavy)', 'Driving (Light)', 'Forklift Operator',
  'Event Staff', 'Catering Helper', 'Steward / Waiter', 'Bouncer',
  'Machine Operator', 'Fitter', 'Assembly Worker', 'Quality Inspector',
  'Office Helper', 'Data Entry Clerk', 'Store Keeper',
].map(s => ({ value: s, label: s }));

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const AREA_OPTIONS = COIMBATORE_AREAS;

const EMPTY_BANK: BankDetails = { accountNo: '', ifsc: '', bankName: '', branch: '' };
const EMPTY_EMERGENCY: EmergencyContact = { name: '', phone: '', relation: '' };

interface WorkerForm {
  name: string;
  mobile: string;
  area: string;
  skills: string[];
  bankDetails: BankDetails;
  upi: string;
  status: 'Active' | 'Inactive';
  aadhaar: string;
  address: string;
  bloodGroup: string;
  dailyWage: string;
  dateOfJoining: string;
  emergencyContact: EmergencyContact;
}

const EMPTY_FORM: WorkerForm = {
  name: '', mobile: '', area: '', skills: [],
  bankDetails: { ...EMPTY_BANK }, upi: '', status: 'Active',
  aadhaar: '', address: '', bloodGroup: '', dailyWage: '',
  dateOfJoining: '', emergencyContact: { ...EMPTY_EMERGENCY },
};

const Workers: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [search, setSearch] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState<WorkerForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  useEffect(() => {
    const unsub = subscribeWorkers(setWorkers);
    return unsub;
  }, []);

  // ─── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = workers.filter(w => w.status === 'Active').length;
    const inactive = workers.length - active;
    // Top skill
    const skillCount: Record<string, number> = {};
    workers.forEach(w => (w.skills || []).forEach(s => { skillCount[s] = (skillCount[s] || 0) + 1; }));
    const topSkill = Object.entries(skillCount).sort((a, b) => b[1] - a[1])[0];
    return { total: workers.length, active, inactive, topSkill: topSkill ? `${topSkill[0]} (${topSkill[1]})` : '—' };
  }, [workers]);

  // ─── Filter ────────────────────────────────────────────────
  const filtered = workers.filter(w => {
    const q = search.toLowerCase();
    const matchSearch = w.name.toLowerCase().includes(q) || w.mobile.includes(search) || (w.workerId || '').toLowerCase().includes(q);
    const matchSkill = !filterSkill || w.skills.includes(filterSkill);
    const matchArea = !filterArea || w.area === filterArea;
    const matchStatus = !filterStatus || w.status === filterStatus;
    return matchSearch && matchSkill && matchArea && matchStatus;
  });

  // ─── Form Handlers ─────────────────────────────────────────
  const handleToggleWorkerStatus = async (w: Worker, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const newStatus = w.status === 'Active' ? 'Inactive' : 'Active';
      await updateWorker(w.id, { status: newStatus });
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, skills: [], bankDetails: { ...EMPTY_BANK }, emergencyContact: { ...EMPTY_EMERGENCY } });
    setEditWorker(null);
    setShowForm(true);
  };

  const openEdit = (w: Worker) => {
    setForm({
      name: w.name, mobile: w.mobile, area: w.area, skills: w.skills || [],
      bankDetails: { ...EMPTY_BANK, ...(w.bankDetails || {}) },
      upi: w.upi || '', status: w.status,
      aadhaar: w.aadhaar || '', address: w.address || '',
      bloodGroup: w.bloodGroup || '',
      dailyWage: w.dailyWage ? String(w.dailyWage) : '',
      dateOfJoining: w.dateOfJoining || '',
      emergencyContact: { ...EMPTY_EMERGENCY, ...(w.emergencyContact || {}) },
    });
    setEditWorker(w);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        dailyWage: form.dailyWage ? Number(form.dailyWage) : undefined,
      };
      // Remove empty optional fields
      if (!payload.aadhaar) delete payload.aadhaar;
      if (!payload.address) delete payload.address;
      if (!payload.bloodGroup) delete payload.bloodGroup;
      if (!payload.dailyWage) delete payload.dailyWage;
      if (!payload.dateOfJoining) delete payload.dateOfJoining;
      if (!payload.emergencyContact?.name) delete payload.emergencyContact;

      if (editWorker) {
        await updateWorker(editWorker.id, payload);
      } else {
        const workerId = generateWorkerId(workers);
        await addWorker({ ...payload, workerId });
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteWorker(id);
    setDeleteConfirm(null);
  };

  // ─── CSV Export ────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Worker ID', 'Name', 'Mobile', 'Area', 'Skills', 'Status', 'Daily Wage', 'Date of Joining', 'Aadhaar', 'Blood Group', 'Address', 'Bank Account', 'IFSC', 'Bank Name', 'Branch', 'UPI', 'Emergency Name', 'Emergency Phone', 'Emergency Relation'];
    const rows = filtered.map(w => [
      w.workerId, w.name, w.mobile, w.area,
      (w.skills || []).join('; '), w.status,
      w.dailyWage || '', w.dateOfJoining || '', w.aadhaar || '', w.bloodGroup || '', w.address || '',
      w.bankDetails?.accountNo || '', w.bankDetails?.ifsc || '', w.bankDetails?.bankName || '', w.bankDetails?.branch || '', w.upi || '',
      w.emergencyContact?.name || '', w.emergencyContact?.phone || '', w.emergencyContact?.relation || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `workers_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div>
          <h1 className="page-title">Worker Database</h1>
          <p className="page-subtitle">{stats.active} active of {stats.total} workers</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-1.5 text-sm" title="Export CSV">
            <Download size={14} /> CSV
          </button>
          <button onClick={openAdd} className="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2">
            <Plus size={16} /> Add Worker
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-cream-500">
              <Users size={16} className="text-gold-500" />
              <span className="stat-label">Total Workers</span>
            </div>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-cream-500">
              <UserCheck size={16} className="text-emerald-400" />
              <span className="stat-label">Active</span>
            </div>
            <span className="stat-value text-emerald-400">{stats.active}</span>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-cream-500">
              <UserX size={16} className="text-red-400" />
              <span className="stat-label">Inactive</span>
            </div>
            <span className="stat-value text-red-400">{stats.inactive}</span>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-cream-500">
              <Briefcase size={16} className="text-gold-500" />
              <span className="stat-label">Top Skill</span>
            </div>
            <span className="text-lg font-bold text-cream-100 font-heading">{stats.topSkill}</span>
          </div>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 flex-1">
            <div className="relative w-full lg:w-56">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500" />
              <input className="input pl-9 w-full" placeholder="Search ID, name, or mobile..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select w-full lg:w-44" value={filterSkill} onChange={e => setFilterSkill(e.target.value)}>
              <option value="">All Skills</option>
              {SKILL_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="select w-full lg:w-44" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="">All Areas</option>
              {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className="select w-full lg:w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-1 bg-dark-700 rounded-lg p-1 border border-dark-400 self-start">
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-dark-500 text-gold-400' : 'text-cream-500 hover:text-cream-300'}`} title="Table view">
              <LayoutList size={16} />
            </button>
            <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-dark-500 text-gold-400' : 'text-cream-500 hover:text-cream-300'}`} title="Card view">
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Workers List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-cream-500">
            <HardHat size={48} className="mx-auto mb-3 opacity-30" />
            <p>No workers found. Add your first worker!</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ─── TABLE VIEW ─── */
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Worker ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Area</th>
                  <th className="hidden lg:table-cell">Daily Wage</th>
                  <th>Skills</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id} className="cursor-pointer" onClick={() => navigate(`/workers/${w.id}`)}>
                    <td><span className="text-gold-400 font-mono text-xs">{w.workerId}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-dark-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-gold-400 text-xs font-bold">{w.name.charAt(0)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-cream-100">{w.name}</span>
                          {w.bloodGroup && <span className="ml-2 text-[10px] text-red-400 font-mono">{w.bloodGroup}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-cream-400">
                        <Phone size={12} className="text-gold-600" />
                        {w.mobile}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-cream-400">
                        <MapPin size={12} className="text-gold-600" />
                        {w.area}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell">
                      {w.dailyWage ? (
                        <span className="text-cream-200 font-medium">₹{w.dailyWage.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-cream-500">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(w.skills || []).slice(0, 3).map(skill => (
                          <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dark-500 text-gold-400 border border-dark-400">
                            {skill}
                          </span>
                        ))}
                        {(w.skills || []).length > 3 && (
                          <span className="text-xs text-cream-500">+{w.skills.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={w.status === 'Active' ? 'badge-active inline-flex items-center gap-1' : 'badge-inactive inline-flex items-center gap-1'}>
                        <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        {w.status === 'Active' ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/workers/${w.id}`)} className="btn-icon text-cream-400 hover:text-gold-400" title="View Profile">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEdit(w)} className="btn-icon text-cream-400 hover:text-gold-400" title="Edit Profile">
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleToggleWorkerStatus(w, e)} 
                          className={`btn-icon ${w.status === 'Active' ? 'text-amber-400 hover:text-red-400' : 'text-emerald-400 hover:text-emerald-300'}`}
                          title={w.status === 'Active' ? 'Deactivate Workforce ID' : 'Activate Workforce ID'}
                        >
                          {w.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        {isAdmin && (
                          <button onClick={() => setDeleteConfirm(w.id)} className="btn-icon text-red-400 hover:text-red-300" title="Delete Record">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── CARD VIEW ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(w => (
              <div key={w.id} className="card-hover p-5 cursor-pointer" onClick={() => navigate(`/workers/${w.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0 shadow-gold">
                      <span className="text-dark-900 font-bold text-sm font-heading">{w.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-cream-100 font-semibold text-sm">{w.name}</h3>
                      <span className="text-gold-500 font-mono text-xs">{w.workerId}</span>
                    </div>
                  </div>
                  <span className={w.status === 'Active' ? 'badge-active' : 'badge-inactive'}>
                    {w.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-cream-400">
                    <Phone size={13} className="text-gold-600" />
                    <span>{w.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2 text-cream-400">
                    <MapPin size={13} className="text-gold-600" />
                    <span>{w.area || '—'}</span>
                  </div>
                  {w.dailyWage && (
                    <div className="flex items-center gap-2 text-cream-400">
                      <IndianRupee size={13} className="text-gold-600" />
                      <span>₹{w.dailyWage.toLocaleString('en-IN')} / day</span>
                    </div>
                  )}
                  {w.dateOfJoining && (
                    <div className="flex items-center gap-2 text-cream-400">
                      <Calendar size={13} className="text-gold-600" />
                      <span>Joined {new Date(w.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(w.skills || []).slice(0, 4).map(skill => (
                    <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dark-500 text-gold-400 border border-dark-400">
                      {skill}
                    </span>
                  ))}
                  {(w.skills || []).length > 4 && (
                    <span className="text-xs text-cream-500">+{w.skills.length - 4}</span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-dark-500 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(w)} className="btn-ghost text-xs flex items-center gap-1 py-1 px-2">
                    <Edit2 size={12} /> Edit
                  </button>
                  <a href={`tel:${w.mobile}`} className="btn-ghost text-xs flex items-center gap-1 py-1 px-2">
                    <Phone size={12} /> Call
                  </a>
                  {isAdmin && (
                    <button onClick={() => setDeleteConfirm(w.id)} className="btn-ghost text-xs text-red-400 flex items-center gap-1 py-1 px-2 ml-auto">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100">{editWorker ? 'Edit Worker' : 'Add Worker'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">

              {/* ─── Personal Info ─── */}
              <div className="section-title"><HardHat size={14} /> Personal Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Worker's name" />
                </div>
                <div>
                  <label className="label">Mobile</label>
                  <input className="input" type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="9876543210" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Area (Locality)</label>
                  <select className="select" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}>
                    <option value="">Select area</option>
                    {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Aadhaar Number</label>
                  <input className="input" value={form.aadhaar} onChange={e => setForm(f => ({ ...f, aadhaar: e.target.value.replace(/[^0-9]/g, '').slice(0, 12) }))} placeholder="1234 5678 9012" maxLength={12} />
                </div>
                <div>
                  <label className="label">Blood Group</label>
                  <select className="select" value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date of Joining</label>
                  <input className="input" type="date" value={form.dateOfJoining} onChange={e => setForm(f => ({ ...f, dateOfJoining: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
              </div>

              {/* ─── Skills & Wage ─── */}
              <div className="gold-divider" />
              <div className="section-title"><Briefcase size={14} /> Skills & Wage</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Skills</label>
                  <Select
                    isMulti
                    options={SKILL_OPTIONS}
                    value={SKILL_OPTIONS.filter(o => form.skills.includes(o.value))}
                    onChange={(selected) => setForm(f => ({ ...f, skills: selected.map(s => s.value) }))}
                    classNamePrefix="rs"
                    placeholder="Select skills..."
                  />
                </div>
                <div>
                  <label className="label">Daily Wage (₹)</label>
                  <input className="input" type="number" value={form.dailyWage} onChange={e => setForm(f => ({ ...f, dailyWage: e.target.value }))} placeholder="500" />
                </div>
              </div>

              {/* ─── Emergency Contact ─── */}
              <div className="gold-divider" />
              <div className="section-title"><Heart size={14} /> Emergency Contact</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Contact Name</label>
                  <input className="input" value={form.emergencyContact.name} onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, name: e.target.value } }))} placeholder="Name" />
                </div>
                <div>
                  <label className="label">Contact Phone</label>
                  <input className="input" type="tel" value={form.emergencyContact.phone} onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, phone: e.target.value } }))} placeholder="9876543210" />
                </div>
                <div>
                  <label className="label">Relation</label>
                  <input className="input" value={form.emergencyContact.relation} onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, relation: e.target.value } }))} placeholder="Father / Spouse" />
                </div>
              </div>

              {/* ─── Bank Details ─── */}
              <div className="gold-divider" />
              <div className="section-title"><CreditCard size={14} /> Bank Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Account No.</label>
                  <input className="input" value={form.bankDetails.accountNo} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, accountNo: e.target.value } }))} placeholder="Account number" />
                </div>
                <div>
                  <label className="label">IFSC Code</label>
                  <input className="input" value={form.bankDetails.ifsc} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, ifsc: e.target.value.toUpperCase() } }))} placeholder="SBIN0001234" />
                </div>
                <div>
                  <label className="label">Bank Name</label>
                  <input className="input" value={form.bankDetails.bankName} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, bankName: e.target.value } }))} placeholder="State Bank of India" />
                </div>
                <div>
                  <label className="label">Branch</label>
                  <input className="input" value={form.bankDetails.branch} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, branch: e.target.value } }))} placeholder="Gandhipuram Branch" />
                </div>
                <div>
                  <label className="label">UPI ID</label>
                  <input className="input" value={form.upi} onChange={e => setForm(f => ({ ...f, upi: e.target.value }))} placeholder="worker@upi" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary">
                {saving ? 'Saving...' : editWorker ? 'Update Worker' : 'Add Worker'}
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
              <h2 className="text-lg font-bold text-red-400">Delete Worker?</h2>
              <button onClick={() => setDeleteConfirm(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="text-cream-400 text-sm">This will permanently delete the worker record.</p>
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

export default Workers;
