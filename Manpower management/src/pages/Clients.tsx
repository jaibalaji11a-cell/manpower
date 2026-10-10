import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Eye, X, Phone, Mail, MapPin, FileText, Briefcase,
  User, ChevronRight, Building2, Share2, Copy, Check, MessageSquare, ExternalLink, ShieldCheck
} from 'lucide-react';
import { subscribeClients, addClient, updateClient, softDeleteClient, getInvoicesForClient, getJobsForClient } from '../firebase/firestore';
import type { Client, Invoice, Job } from '../types';
import { formatINR, formatDate } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const EMPTY_FORM = {
  name: '', contactPerson: '', mobile: '', email: '', gst: '', address: '',
};

const Clients: React.FC = () => {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [detailInvoices, setDetailInvoices] = useState<Invoice[]>([]);
  const [detailJobs, setDetailJobs] = useState<Job[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getPortalUrl = (clientId: string) => `${window.location.origin}/portal/${clientId}`;

  const handleCopyPortalLink = (clientId: string) => {
    navigator.clipboard.writeText(getPortalUrl(clientId));
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleWhatsAppPortal = (c: Client) => {
    const portalUrl = getPortalUrl(c.id);
    const bizName = settings?.businessName || 'MAN POWER CBE';
    const msg = `Hello ${c.contactPerson || c.name},\n\nYou can now view your live manpower deployment logs, invoices, and billing on your dedicated Client Portal from *${bizName}*:\n\n🔗 *Your Portal:* ${portalUrl}\n\nThank you for partnering with us!`;
    const mobile = c.mobile.replace(/\D/g, '');
    const fullMobile = mobile.startsWith('91') && mobile.length === 12 ? mobile : `91${mobile}`;
    window.open(`https://wa.me/${fullMobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  useEffect(() => {
    const unsub = subscribeClients(setClients);
    return unsub;
  }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile.includes(search) ||
    c.contactPerson?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditClient(null); setShowForm(true); };
  const openEdit = (c: Client) => { setForm({ name: c.name, contactPerson: c.contactPerson, mobile: c.mobile, email: c.email, gst: c.gst, address: c.address }); setEditClient(c); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editClient) {
        await updateClient(editClient.id, form);
      } else {
        await addClient({ ...form, deleted: false });
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await softDeleteClient(id);
    setDeleteConfirm(null);
    if (detailClient?.id === id) setDetailClient(null);
  };

  const openDetail = async (c: Client) => {
    setDetailClient(c);
    const [invoices, jobs] = await Promise.all([
      getInvoicesForClient(c.id),
      getJobsForClient(c.id),
    ]);
    setDetailInvoices(invoices);
    setDetailJobs(jobs);
  };

  const totalRevenue = detailJobs.reduce((s, j) => s + j.amount, 0);
  const outstanding = detailInvoices.reduce((s, inv) => {
    if (inv.status !== 'Paid') return s + inv.grandTotal;
    return s;
  }, 0);

  return (
    <div className="page-container animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div>
          <h1 className="page-title">Client Database</h1>
          <p className="page-subtitle">{clients.length} clients registered</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
          <Plus size={16} /> Add Client
        </button>
      </div>

      <div className="page-body">
        {/* Search */}
        <div className="relative mb-6 w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500" />
          <input
            className="input pl-9"
            placeholder="Search by name, mobile, contact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Client Cards Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-cream-500">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>No clients found. Add your first client!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(c => (
              <div key={c.id} className="card-hover p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-dark-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold-400 font-bold text-sm">{c.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-cream-100 font-semibold text-sm">{c.name}</div>
                      {c.contactPerson && <div className="text-cream-500 text-xs">{c.contactPerson}</div>}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  {c.mobile && (
                    <div className="flex items-center gap-2 text-xs text-cream-400">
                      <Phone size={11} className="text-gold-600" />
                      {c.mobile}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-xs text-cream-400">
                      <Mail size={11} className="text-gold-600" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2 text-xs text-cream-400">
                      <MapPin size={11} className="text-gold-600" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                  {c.gst && (
                    <div className="flex items-center gap-2 text-xs text-cream-400">
                      <FileText size={11} className="text-gold-600" />
                      GST: {c.gst}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2 border-t border-dark-400">
                  <button onClick={() => openDetail(c)} className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1">
                    <Eye size={13} /> View
                  </button>
                  <button onClick={() => openEdit(c)} className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1">
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleWhatsAppPortal(c)}
                    className="p-1.5 btn-ghost text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded-lg flex items-center justify-center"
                    title="Share Portal via WhatsApp"
                  >
                    <MessageSquare size={13} />
                  </button>
                  <button
                    onClick={() => handleCopyPortalLink(c.id)}
                    className="p-1.5 btn-ghost text-xs text-cream-300 hover:text-gold-400 rounded-lg flex items-center justify-center"
                    title={copiedId === c.id ? "Copied!" : "Copy Portal Link"}
                  >
                    {copiedId === c.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                  {isAdmin && (
                    <button onClick={() => setDeleteConfirm(c.id)} className="btn-icon text-red-400 hover:text-red-300 p-1.5">
                      <Trash2 size={13} />
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
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100">{editClient ? 'Edit Client' : 'Add Client'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">Client / Company Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. ABC Industries" />
              </div>
              <div>
                <label className="label">Contact Person</label>
                <input className="input" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="e.g. Mr. Rajan" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Mobile</label>
                  <input className="input" type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="9876543210" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" />
                </div>
              </div>
              <div>
                <label className="label">GST Number</label>
                <input className="input" value={form.gst} onChange={e => setForm(f => ({ ...f, gst: e.target.value }))} placeholder="33XXXXXX..." />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input min-h-[80px] resize-none" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address..." />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary">
                {saving ? 'Saving...' : editClient ? 'Update Client' : 'Add Client'}
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
              <h2 className="text-lg font-bold text-red-400">Delete Client?</h2>
              <button onClick={() => setDeleteConfirm(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="text-cream-400 text-sm">This will hide the client from the database. All historical invoices and jobs remain intact.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirm(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detailClient && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black bg-opacity-60" onClick={() => setDetailClient(null)} />
          <div className="w-full max-w-xl bg-dark-800 border-l border-dark-500 overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-dark-800 border-b border-dark-500 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-cream-100">{detailClient.name}</h2>
                <p className="text-xs text-cream-500">{detailClient.contactPerson}</p>
              </div>
              <button onClick={() => setDetailClient(null)} className="btn-icon"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="card p-3 text-center">
                  <div className="text-lg font-bold text-gold-400">{detailJobs.length}</div>
                  <div className="text-xs text-cream-500">Total Jobs</div>
                </div>
                <div className="card p-3 text-center">
                  <div className="text-lg font-bold text-gold-400">{formatINR(totalRevenue)}</div>
                  <div className="text-xs text-cream-500">Total Revenue</div>
                </div>
                <div className="card p-3 text-center">
                  <div className={`text-lg font-bold ${outstanding > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatINR(outstanding)}
                  </div>
                  <div className="text-xs text-cream-500">Outstanding</div>
                </div>
              </div>

              {/* Client Self-Service Portal Box */}
              <div className="card p-4 bg-dark-700/80 border-gold-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gold-400 uppercase tracking-wide">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Client Self-Service Portal</span>
                  </div>
                  <a
                    href={getPortalUrl(detailClient.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gold-400 hover:underline flex items-center gap-1"
                  >
                    Preview <ExternalLink size={12} />
                  </a>
                </div>
                <p className="text-xs text-cream-400">
                  Share this secure read-only portal with the client so they can view real-time deployments, download invoices, and see balances.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={() => handleWhatsAppPortal(detailClient)}
                    className="btn-primary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <MessageSquare size={14} /> Send via WhatsApp
                  </button>
                  <button
                    onClick={() => handleCopyPortalLink(detailClient.id)}
                    className="btn-secondary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-2"
                  >
                    {copiedId === detailClient.id ? (
                      <><Check size={14} className="text-emerald-400" /> Link Copied!</>
                    ) : (
                      <><Copy size={14} /> Copy Portal Link</>
                    )}
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div className="card p-4 space-y-2">
                <div className="section-title"><User size={14} /> Contact Details</div>
                {detailClient.mobile && <div className="flex gap-2 text-sm text-cream-300"><Phone size={14} className="text-gold-600 mt-0.5" /> {detailClient.mobile}</div>}
                {detailClient.email && <div className="flex gap-2 text-sm text-cream-300"><Mail size={14} className="text-gold-600 mt-0.5" /> {detailClient.email}</div>}
                {detailClient.address && <div className="flex gap-2 text-sm text-cream-300"><MapPin size={14} className="text-gold-600 mt-0.5" /> {detailClient.address}</div>}
                {detailClient.gst && <div className="flex gap-2 text-sm text-cream-300"><FileText size={14} className="text-gold-600 mt-0.5" /> GST: {detailClient.gst}</div>}
              </div>

              {/* Recent Invoices */}
              <div>
                <div className="section-title"><FileText size={14} /> Recent Invoices</div>
                {detailInvoices.length === 0 ? (
                  <p className="text-sm text-cream-500">No invoices yet</p>
                ) : (
                  <div className="space-y-2">
                    {detailInvoices.slice(0, 5).map(inv => (
                      <div key={inv.id} className="card p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-cream-100 font-medium">{inv.invoiceNo}</div>
                          <div className="text-xs text-cream-500">{formatDate(inv.invoiceDate)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gold-400">{formatINR(inv.grandTotal)}</div>
                          <span className={
                            inv.status === 'Paid' ? 'badge-paid' :
                            inv.status === 'Partially Paid' ? 'badge-partial' : 'badge-unpaid'
                          }>{inv.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Jobs */}
              <div>
                <div className="section-title"><Briefcase size={14} /> Recent Jobs</div>
                {detailJobs.length === 0 ? (
                  <p className="text-sm text-cream-500">No jobs yet</p>
                ) : (
                  <div className="space-y-2">
                    {detailJobs.slice(0, 5).map(job => (
                      <div key={job.id} className="card p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-cream-100">{job.workType} — {job.location}</div>
                          <div className="text-xs text-cream-500">{formatDate(job.date)} · {job.shift} shift · {job.manpower} workers</div>
                        </div>
                        <div className="text-sm font-semibold text-gold-400">{formatINR(job.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
