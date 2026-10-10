import React, { useState, useEffect, useMemo } from 'react';
import { Bell, MessageSquare, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { subscribePayments, subscribeClients } from '../../firebase/firestore';
import type { Payment, Client } from '../../types';
import { formatINR, formatDate, isOverdue, derivePaymentStatus, buildWhatsAppLink } from '../../utils';

const PaymentReminders: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due_soon'>('all');

  useEffect(() => {
    const u1 = subscribePayments(setPayments);
    const u2 = subscribeClients(setClients);
    return () => { u1(); u2(); };
  }, []);

  const enriched = payments
    .filter(p => p.balance > 0)
    .map(p => ({
      ...p,
      status: derivePaymentStatus(p.paidTotal, p.invoiceAmount, p.dueDate),
      daysUntilDue: Math.ceil((new Date(p.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));

  const filtered = enriched.filter(p => {
    if (filter === 'overdue') return p.status === 'Overdue';
    if (filter === 'due_soon') return p.daysUntilDue >= 0 && p.daysUntilDue <= 7;
    return true;
  });

  const overdueCount = enriched.filter(p => p.status === 'Overdue').length;
  const dueSoonCount = enriched.filter(p => p.daysUntilDue >= 0 && p.daysUntilDue <= 7).length;
  const totalPending = enriched.reduce((s, p) => s + p.balance, 0);

  const sendReminder = (p: typeof enriched[0]) => {
    const client = clients.find(c => c.id === p.clientId);
    const isOvd = p.status === 'Overdue';
    const msg = `Hello ${p.clientName},

${isOvd ? '🚨 OVERDUE PAYMENT ALERT 🚨' : '📅 Payment Reminder'}

*MAN POWER CBE*

Invoice: *${p.invoiceNo}*
Amount Due: *${formatINR(p.balance)}*
Due Date: *${formatDate(p.dueDate)}*
${isOvd ? `\n⚠️ This payment is ${Math.abs(p.daysUntilDue)} days overdue. Please arrange payment immediately.\n` : p.daysUntilDue <= 3 ? `\n⚠️ Due in ${p.daysUntilDue} day(s). Please arrange payment soon.\n` : ''}
Payment can be made via:
💳 Bank Transfer / UPI

Contact: manpowerofcbe@gmail.com
@manpower_cbe

Thank you! 🙏`;
    window.open(buildWhatsAppLink(client?.mobile || '', msg), '_blank');
  };

  const sendBulkReminders = () => {
    filtered.forEach((p, idx) => {
      setTimeout(() => sendReminder(p), idx * 2000);
    });
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Reminder Tracker</h1>
          <p className="page-subtitle">Auto-flag overdue invoices and send WhatsApp reminders</p>
        </div>
        {filtered.length > 0 && (
          <button onClick={sendBulkReminders} className="btn-primary flex items-center gap-2">
            <MessageSquare size={15} /> Send All Reminders
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="kpi-card border-red-800">
            <AlertTriangle size={18} className="text-red-400" />
            <div className="text-2xl font-bold text-red-400 font-heading">{overdueCount}</div>
            <div className="stat-label">Overdue Invoices</div>
          </div>
          <div className="kpi-card border-amber-800">
            <Clock size={18} className="text-amber-400" />
            <div className="text-2xl font-bold text-amber-400 font-heading">{dueSoonCount}</div>
            <div className="stat-label">Due Within 7 Days</div>
          </div>
          <div className="kpi-card border-dark-400">
            <Bell size={18} className="text-gold-400" />
            <div className="text-2xl font-bold text-gold-400 font-heading">{formatINR(totalPending)}</div>
            <div className="stat-label">Total Pending</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-dark-700 p-1 rounded-lg border border-dark-400 mb-4 w-fit">
          {[
            { id: 'all', label: `All Pending (${enriched.length})` },
            { id: 'overdue', label: `Overdue (${overdueCount})` },
            { id: 'due_soon', label: `Due Soon (${dueSoonCount})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === f.id ? 'bg-gold-gradient text-dark-900' : 'text-cream-400 hover:text-cream-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Invoice List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-cream-500">
            <CheckCircle size={48} className="mx-auto mb-3 opacity-30 text-green-500" />
            <p className="text-green-400 font-medium">All clear! No pending reminders.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered
              .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
              .map(p => (
                <div
                  key={p.id}
                  className={`card p-4 flex items-center justify-between border ${
                    p.status === 'Overdue' ? 'border-red-800 bg-red-950 bg-opacity-20' :
                    p.daysUntilDue <= 3 ? 'border-amber-800' : 'border-dark-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${p.status === 'Overdue' ? 'bg-red-900' : 'bg-amber-900'}`}>
                      {p.status === 'Overdue' ? <AlertTriangle size={16} className="text-red-300" /> : <Clock size={16} className="text-amber-300" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-cream-100">{p.invoiceNo}</span>
                        <span className={p.status === 'Overdue' ? 'badge-overdue' : 'badge-partial'}>{p.status}</span>
                      </div>
                      <div className="text-sm text-cream-400">{p.clientName}</div>
                      <div className="text-xs text-cream-500 mt-0.5">
                        Due: {formatDate(p.dueDate)} · {
                          p.daysUntilDue < 0
                            ? <span className="text-red-400">{Math.abs(p.daysUntilDue)} days overdue</span>
                            : <span className="text-amber-400">Due in {p.daysUntilDue} days</span>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gold-400">{formatINR(p.balance)}</div>
                      <div className="text-xs text-cream-500">balance due</div>
                    </div>
                    <button
                      onClick={() => sendReminder(p)}
                      className="btn-primary flex items-center gap-2 text-sm py-2"
                    >
                      <MessageSquare size={14} /> Remind
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReminders;
