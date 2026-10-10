import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getInvoicesForClient, getJobsForClient, getSettings } from '../firebase/firestore';
import type { Client, Invoice, Job, BusinessSettings } from '../types';
import { formatINR, formatDate } from '../utils';
import {
  Building2, FileText, CheckCircle, Users, Phone, Mail, ShieldCheck
} from 'lucide-react';

const ClientPortal: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'deployments'>('overview');

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      setLoading(true);
      try {
        const clientSnap = await getDoc(doc(db, 'clients', clientId));
        if (clientSnap.exists()) {
          setClient({ id: clientSnap.id, ...clientSnap.data() } as Client);
        }
        const [invList, jobList, bizSettings] = await Promise.all([
          getInvoicesForClient(clientId),
          getJobsForClient(clientId),
          getSettings(),
        ]);
        setInvoices(invList);
        setJobs(jobList);
        setSettings(bizSettings);
      } catch (err) {
        console.error('Failed to load portal data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-dark-600 border-t-gold-400 rounded-full animate-spin mb-4" />
        <p className="text-sm text-cream-400">Loading Client Portal...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-6 text-center">
        <Building2 size={48} className="text-cream-600 mb-3" />
        <h2 className="text-xl font-bold text-cream-100 mb-1">Client Portal Not Found</h2>
        <p className="text-sm text-cream-500 max-w-sm">
          This client access link may have expired or is invalid. Please contact support.
        </p>
      </div>
    );
  }

  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const balanceDue = Math.max(0, totalBilled - totalPaid);
  const bankDetails = settings?.bankDetails;

  return (
    <div className="min-h-screen bg-dark-900 text-cream-100 font-sans pb-12">
      {/* Portal Header */}
      <header className="bg-dark-800 border-b border-dark-500 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
            <div>
              <h1 className="text-base font-extrabold text-gold-400 tracking-wide font-heading leading-tight">
                {settings?.businessName || 'MAN POWER CBE'}
              </h1>
              <p className="text-[11px] text-cream-500">Client Self-Service Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs bg-dark-700 border border-dark-400 px-3 py-1.5 rounded-full text-cream-300">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Secure Access: <strong>{client.name}</strong></span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6 space-y-6">
        {/* Welcome Hero */}
        <div className="card p-6 border-gold-500/20 bg-gradient-to-r from-dark-800 to-dark-800/90">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-gold-400 font-semibold tracking-wider uppercase">Welcome back</span>
              <h2 className="text-2xl font-black text-cream-100 font-heading mt-0.5">{client.name}</h2>
              <p className="text-xs text-cream-400 mt-1">
                GSTIN: <span className="font-mono text-cream-200">{client.gst || 'N/A'}</span> · Contact: {client.contactPerson} ({client.mobile})
              </p>
            </div>
            {bankDetails?.upiId && balanceDue > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-dark-900/80 p-3 rounded-xl border border-dark-500">
                <div>
                  <div className="text-[10px] text-cream-400 uppercase">Pay via UPI</div>
                  <div className="text-xs font-mono font-bold text-gold-400">{bankDetails.upiId}</div>
                </div>
                <a
                  href={`upi://pay?pa=${bankDetails.upiId}&pn=${encodeURIComponent(settings?.businessName || 'Manpower')}&am=${balanceDue}&cu=INR`}
                  className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                >
                  Pay Balance Online
                </a>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="kpi-card">
            <span className="stat-label">Total Invoiced</span>
            <div className="text-2xl font-bold text-cream-100 font-heading">{formatINR(totalBilled)}</div>
            <span className="text-[11px] text-cream-500">{invoices.length} invoices</span>
          </div>
          <div className="kpi-card">
            <span className="stat-label">Amount Paid</span>
            <div className="text-2xl font-bold text-emerald-400 font-heading">{formatINR(totalPaid)}</div>
            <span className="text-[11px] text-emerald-500/80 flex items-center gap-1"><CheckCircle size={11} /> Settled</span>
          </div>
          <div className="kpi-card">
            <span className="stat-label">Outstanding Balance</span>
            <div className={`text-2xl font-bold font-heading ${balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{formatINR(balanceDue)}</div>
            <span className="text-[11px] text-cream-500">{balanceDue > 0 ? 'Payment due' : 'All clear'}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dark-500 pb-2">
          {(['overview', 'invoices', 'deployments'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-gold-500 text-dark-900 font-bold' : 'text-cream-400 hover:text-cream-100 bg-dark-700'}`}>
              {tab === 'overview' ? 'Overview & Bank Info' : tab === 'invoices' ? `Invoices (${invoices.length})` : `Deployments (${jobs.length})`}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5 space-y-3">
              <div className="section-title">Bank Details for Transfer</div>
              {bankDetails ? (
                <div className="space-y-2 text-xs">
                  {[['Account Name', bankDetails.accountName || settings?.businessName], ['Account Number', bankDetails.accountNo], ['IFSC Code', bankDetails.ifsc], ['Bank & Branch', `${bankDetails.bankName} ${bankDetails.branch ? `(${bankDetails.branch})` : ''}`]].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between py-1.5 border-b border-dark-600">
                      <span className="text-cream-400">{label}</span>
                      <span className="font-bold text-cream-100">{value || 'N/A'}</span>
                    </div>
                  ))}
                  {bankDetails.upiId && (
                    <div className="flex justify-between py-1.5 border-b border-dark-600">
                      <span className="text-cream-400">UPI ID</span>
                      <span className="font-mono font-bold text-gold-400">{bankDetails.upiId}</span>
                    </div>
                  )}
                </div>
              ) : <p className="text-xs text-cream-500">Bank details not available.</p>}
            </div>
            <div className="card p-5 space-y-3">
              <div className="section-title">Support & Coordination</div>
              <p className="text-xs text-cream-400 leading-relaxed">For shift adjustments, head-count requirements, or billing inquiries:</p>
              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center gap-2 text-cream-200"><Phone size={14} className="text-gold-400" /><a href={`tel:${settings?.phone}`} className="hover:underline">{settings?.phone || '+91 90000 00000'}</a></div>
                <div className="flex items-center gap-2 text-cream-200"><Mail size={14} className="text-gold-400" /><a href={`mailto:${settings?.email}`} className="hover:underline">{settings?.email || 'manpowerofcbe@gmail.com'}</a></div>
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="card p-4 space-y-3">
            <div className="section-title mb-2">Tax Invoices & Statement</div>
            {invoices.length === 0 ? <p className="text-xs text-cream-500 text-center py-8">No invoices generated yet.</p> : (
              <div className="table-wrapper"><table className="table"><thead><tr><th>Invoice No</th><th>Date</th><th>Work Period</th><th>Total Amount</th><th>Status</th></tr></thead><tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-mono font-bold text-gold-400">{inv.invoiceNo}</td>
                    <td className="text-xs text-cream-300">{formatDate(inv.invoiceDate)}</td>
                    <td className="text-xs text-cream-400">{formatDate(inv.workPeriodFrom)} – {formatDate(inv.workPeriodTo)}</td>
                    <td className="font-bold text-cream-100">{formatINR(inv.grandTotal)}</td>
                    <td><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === 'Paid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-amber-950 text-amber-400 border border-amber-700'}`}>{inv.status || 'Pending'}</span></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        )}

        {/* Deployments Tab */}
        {activeTab === 'deployments' && (
          <div className="card p-4 space-y-3">
            <div className="section-title mb-2">Daily Workforce Deployment Log</div>
            {jobs.length === 0 ? <p className="text-xs text-cream-500 text-center py-8">No job records found.</p> : (
              <div className="table-wrapper"><table className="table"><thead><tr><th>Date</th><th>Work Type</th><th>Shift</th><th>Location</th><th>Manpower</th></tr></thead><tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td className="text-xs font-medium text-cream-200">{formatDate(job.date)}</td>
                    <td className="text-xs font-semibold text-cream-100">{job.workType}</td>
                    <td className="text-xs text-gold-400">{job.shift}</td>
                    <td className="text-xs text-cream-400">{job.location}</td>
                    <td className="text-xs font-bold text-cream-100"><span className="inline-flex items-center gap-1 bg-dark-700 px-2 py-0.5 rounded border border-dark-500"><Users size={12} className="text-gold-400" /> {job.manpower}</span></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientPortal;
