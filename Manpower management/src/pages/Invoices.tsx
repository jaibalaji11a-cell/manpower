import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, FileText, Eye, Edit2, Trash2, X, Download, Share2,
  CheckCircle, Clock, AlertCircle, Printer,
} from 'lucide-react';
import { subscribeInvoices, deleteInvoice, subscribePayments } from '../firebase/firestore';
import type { Invoice, Payment } from '../types';
import { formatINR, formatDate, buildWhatsAppLink, buildInvoiceWhatsAppMessage } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import InvoicePreview from '../components/Invoice/InvoicePreview';
import { generateInvoicePDF } from '../components/Invoice/InvoicePDF';

const StatusBadge: React.FC<{ status: Invoice['status'] }> = ({ status }) => {
  const map: Record<string, string> = {
    Draft: 'badge bg-dark-400 text-cream-400 border border-dark-300',
    Sent: 'badge bg-blue-900 text-blue-300 border border-blue-800',
    Paid: 'badge-paid',
    'Partially Paid': 'badge-partial',
    Overdue: 'badge-overdue',
  };
  const icons: Record<string, React.ReactNode> = {
    Draft: <Clock size={10} />,
    Sent: <FileText size={10} />,
    Paid: <CheckCircle size={10} />,
    'Partially Paid': <Clock size={10} />,
    Overdue: <AlertCircle size={10} />,
  };
  return (
    <span className={map[status] || 'badge'}>
      {icons[status]} {status}
    </span>
  );
};

const Invoices: React.FC = () => {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    const u1 = subscribeInvoices(setInvoices);
    const u2 = subscribePayments(setPayments);
    return () => { u1(); u2(); };
  }, []);

  const enrichedInvoices = invoices.map(inv => {
    const matchingPayment = payments.find(p => p.invoiceId === inv.id || p.invoiceNo === inv.invoiceNo);
    const paidAmount = inv.paidAmount !== undefined ? inv.paidAmount : (matchingPayment ? matchingPayment.paidTotal : 0);
    const balanceDue = inv.balanceDue !== undefined ? inv.balanceDue : (matchingPayment ? matchingPayment.balance : Math.max(0, inv.grandTotal - paidAmount));
    return {
      ...inv,
      paidAmount,
      balanceDue,
    };
  });

  const filtered = enrichedInvoices.filter(inv => {
    const matchSearch =
      inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalInvoiced = filtered.reduce((s, inv) => s + inv.grandTotal, 0);

  const handleDelete = async (id: string) => {
    await deleteInvoice(id);
    setDeleteConfirm(null);
    if (previewInvoice?.id === id) setPreviewInvoice(null);
  };

  const handleWhatsApp = (inv: Invoice) => {
    const msg = buildInvoiceWhatsAppMessage(inv.clientName, inv.invoiceNo, inv.grandTotal, inv.dueDate);
    window.open(buildWhatsAppLink('', msg), '_blank');
  };

  const handleDownloadPDF = async (inv: Invoice) => {
    setGeneratingPDF(true);
    try {
      await generateInvoicePDF(inv, settings);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePrintModal = () => {
    window.print();
  };

  return (
    <div className="page-container animate-fade-in relative">
      <div className="page-header flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} invoices · {formatINR(totalInvoiced)} total</p>
        </div>
        <Link to="/invoices/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500" />
            <input className="input pl-9 w-full sm:w-56" placeholder="Search invoice or client..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Invoices', value: invoices.length, color: 'text-cream-100' },
            { label: 'Total Value', value: formatINR(invoices.reduce((s, i) => s + i.grandTotal, 0)), color: 'text-gold-400' },
            { label: 'Paid Invoices', value: invoices.filter(i => i.status === 'Paid').length, color: 'text-green-400' },
            { label: 'Overdue', value: invoices.filter(i => i.status === 'Overdue').length, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="kpi-card">
              <div className={`text-2xl font-bold ${s.color} font-heading`}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-cream-500">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>No invoices found. Create your first invoice!</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Work Period</th>
                  <th>Grand Total</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-dark-750 transition-colors">
                    <td>
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="text-gold-400 hover:underline font-mono font-semibold text-sm text-left"
                      >
                        {inv.invoiceNo}
                      </button>
                    </td>
                    <td className="text-cream-400 whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
                    <td className="font-medium text-cream-100">{inv.clientName}</td>
                    <td className="text-cream-500 text-xs whitespace-nowrap">
                      {formatDate(inv.workPeriodFrom)} – {formatDate(inv.workPeriodTo)}
                    </td>
                    <td className="font-bold text-gold-400">{formatINR(inv.grandTotal)}</td>
                    <td className="text-cream-400 whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="btn-icon text-cream-400 hover:text-gold-400"
                          title="View Formatted Invoice"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                          className="btn-icon text-cream-400 hover:text-gold-400"
                          title="Edit Invoice"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          disabled={generatingPDF}
                          className="btn-icon text-cream-400 hover:text-gold-400"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(inv)}
                          className="btn-icon text-green-400 hover:text-green-300"
                          title="Share on WhatsApp"
                        >
                          <Share2 size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirm(inv.id)}
                            className="btn-icon text-red-400 hover:text-red-300"
                            title="Delete"
                          >
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
        )}
      </div>

      {/* Invoice View Modal */}
      {previewInvoice && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewInvoice(null)}>
          <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="modal-header sticky top-0 bg-dark-800 z-10 py-3 px-4 border-b border-dark-500 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-cream-100 flex items-center gap-2">
                  <span>Invoice {previewInvoice.invoiceNo}</span>
                  <StatusBadge status={previewInvoice.status} />
                </h2>
                <p className="text-xs text-cream-500">{previewInvoice.clientName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <button
                  onClick={handlePrintModal}
                  className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <Printer size={14} /> <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF(previewInvoice)}
                  disabled={generatingPDF}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <Download size={14} /> <span className="hidden sm:inline">{generatingPDF ? 'Downloading...' : 'PDF'}</span>
                </button>
                <button
                  onClick={() => handleWhatsApp(previewInvoice)}
                  className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 text-green-400 hover:text-green-300"
                >
                  <Share2 size={14} /> <span className="hidden sm:inline">WhatsApp</span>
                </button>
                <button
                  onClick={() => navigate(`/invoices/${previewInvoice.id}/edit`)}
                  className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <Edit2 size={14} /> <span className="hidden sm:inline">Edit</span>
                </button>
                <button onClick={() => setPreviewInvoice(null)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="modal-body p-4 bg-dark-900 overflow-x-auto flex justify-center">
              <div className="scale-90 sm:scale-100 origin-top">
                <InvoicePreview
                  invoice={previewInvoice}
                  settings={settings}
                  gstEnabled={(previewInvoice.gstPercent || 0) > 0}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-red-400">Delete Invoice?</h2>
              <button onClick={() => setDeleteConfirm(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="text-cream-400 text-sm">This will permanently delete the invoice and its payment record.</p>
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

export default Invoices;
