import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Invoice, BusinessSettings } from '../../types';
import { formatINR, formatDate, calculateGST } from '../../utils';

interface Props {
  invoice: Omit<Invoice, 'id' | 'createdAt'>;
  settings: BusinessSettings;
  gstEnabled?: boolean;
}

const InvoicePreview: React.FC<Props> = ({ invoice, settings, gstEnabled }) => {
  const { cgst, sgst } = calculateGST(invoice.subtotal, invoice.gstPercent || 0);
  const showGst = gstEnabled && (invoice.gstPercent || 0) > 0;
  const bd = invoice.bankDetailsSnapshot;
  const paid = invoice.paidAmount || 0;
  const balance = invoice.balanceDue !== undefined ? invoice.balanceDue : Math.max(0, invoice.grandTotal - paid);
  const isFullyPaid = paid >= invoice.grandTotal && invoice.grandTotal > 0;

  return (
    <div
      id="invoice-preview"
      className="bg-white text-black font-sans shadow-2xl rounded-sm"
      style={{ width: '210mm', minHeight: '297mm', padding: '14mm 16px', boxSizing: 'border-box', fontSize: '11px', lineHeight: '1.4' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #C9A227', paddingBottom: '14px', marginBottom: '16px' }}>
        <div>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '55px', maxWidth: '220px', objectFit: 'contain', marginBottom: '6px', display: 'block' }} />
          ) : (
            <div style={{
              width: '48px', height: '48px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '6px',
            }}>
              <span style={{ color: '#0A0A0A', fontWeight: 900, fontSize: '18px', fontFamily: 'Poppins, sans-serif' }}>MP</span>
            </div>
          )}
          <div style={{ fontWeight: 900, fontSize: '22px', color: '#0A0A0A', fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.5px' }}>
            {settings.businessName || 'MAN POWER'}
          </div>
          <div style={{ color: '#C9A227', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', marginTop: '2px' }}>
            {settings.tagline || 'WORKFORCE ON DEMAND — COIMBATORE'}
          </div>
          {settings.phone && <div style={{ color: '#555', marginTop: '4px', fontSize: '11px' }}>📞 {settings.phone}</div>}
          {settings.email && <div style={{ color: '#555', fontSize: '11px' }}>✉ {settings.email}</div>}
          {settings.address && <div style={{ color: '#555', fontSize: '11px', marginTop: '2px', whiteSpace: 'pre-line' }}>{settings.address}</div>}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            background: '#0A0A0A', color: '#D4AF37', padding: '8px 22px',
            borderRadius: '6px', fontSize: '22px', fontWeight: 900,
            fontFamily: 'Poppins, sans-serif', letterSpacing: '2px', display: 'inline-block',
          }}>
            INVOICE
          </div>
          <div style={{ marginTop: '12px', color: '#444', fontSize: '11px', lineHeight: '1.8' }}>
            <div><strong style={{ color: '#0A0A0A' }}>Invoice No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#C9A227', fontSize: '12px' }}>{invoice.invoiceNo}</span></div>
            <div><strong style={{ color: '#0A0A0A' }}>Date:</strong> {formatDate(invoice.invoiceDate)}</div>
            <div><strong style={{ color: '#0A0A0A' }}>Due Date:</strong> {formatDate(invoice.dueDate)}</div>
            <div><strong style={{ color: '#0A0A0A' }}>Terms:</strong> {invoice.paymentTerms || 'Due on Receipt'}</div>
          </div>
        </div>
      </div>

      {/* Billing To & Work Period */}
      <div style={{ marginBottom: '16px', background: '#FAFAFA', border: '1px solid #EEEEEE', padding: '12px 14px', borderRadius: '6px' }}>
        <div style={{ background: '#0A0A0A', color: '#D4AF37', padding: '3px 10px', display: 'inline-block', borderRadius: '4px', fontWeight: 700, fontSize: '10px', letterSpacing: '1px', marginBottom: '6px' }}>
          BILL TO
        </div>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0A0A0A' }}>{invoice.clientName || 'Client'}</div>
        {invoice.clientAddress && <div style={{ color: '#555', marginTop: '3px', fontSize: '11px', whiteSpace: 'pre-line' }}>{invoice.clientAddress}</div>}
        <div style={{ marginTop: '6px', color: '#555', fontSize: '11px', borderTop: '1px dashed #DDD', paddingTop: '6px' }}>
          Work Period: <strong style={{ color: '#0A0A0A' }}>{formatDate(invoice.workPeriodFrom)}</strong> to <strong style={{ color: '#0A0A0A' }}>{formatDate(invoice.workPeriodTo)}</strong>
        </div>
      </div>

      {/* Line Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#0A0A0A', color: '#D4AF37' }}>
            {['Date', 'Location', 'Work Type', 'Shift', 'Manpower', 'Rate/Head', 'Amount'].map(h => (
              <th key={h} style={{ padding: '9px 10px', textAlign: h === 'Amount' || h === 'Rate/Head' || h === 'Manpower' ? 'right' : 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(invoice.lineItems || []).map((item, idx) => (
            <tr key={item.id || idx} style={{ background: idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF', borderBottom: '1px solid #E5E5E5' }}>
              <td style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>{formatDate(item.date)}</td>
              <td style={{ padding: '7px 10px', fontSize: '11px' }}>{item.location || '-'}</td>
              <td style={{ padding: '7px 10px', fontSize: '11px' }}>{item.workType || '-'}</td>
              <td style={{ padding: '7px 10px', fontSize: '11px' }}>{item.shift || '-'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: '11px' }}>{item.manpower}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: '11px', whiteSpace: 'nowrap' }}>{formatINR(item.rate)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#111', fontSize: '11px', whiteSpace: 'nowrap' }}>{formatINR(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 2-Column Bottom Layout: Payment Details (Left) vs Summary & Totals (Right) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '20px', marginBottom: '24px' }}>
        {/* Left Column: Bank Payment Details + QR Code */}
        <div style={{ flex: 1, background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ background: '#0A0A0A', color: '#D4AF37', padding: '3px 10px', display: 'inline-block', borderRadius: '4px', fontWeight: 700, fontSize: '10px', letterSpacing: '1px', marginBottom: '10px' }}>
              PAYMENT / BANK DETAILS
            </div>
            {bd && (bd.accountNo || bd.upiId || bd.accountName) ? (
              <div style={{ color: '#333', lineHeight: '1.9', fontSize: '11px' }}>
                {bd.accountName && <div><strong>Account Name:</strong> {bd.accountName}</div>}
                {bd.accountNo && <div><strong>Account No:</strong> {bd.accountNo}</div>}
                {bd.ifsc && <div><strong>IFSC Code:</strong> {bd.ifsc}</div>}
                {bd.bankName && <div><strong>Bank:</strong> {bd.bankName}{bd.branch ? ` (${bd.branch})` : ''}</div>}
                {bd.upiId && <div><strong>UPI ID:</strong> <span style={{ color: '#C9A227', fontWeight: 'bold' }}>{bd.upiId}</span></div>}
              </div>
            ) : (
              <div style={{ color: '#777', fontSize: '11px', fontStyle: 'italic' }}>Bank payment details available on request.</div>
            )}
          </div>

          {invoice.qrEnabled && bd?.upiId && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #DDD', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <QRCodeSVG
                value={`upi://pay?pa=${bd.upiId}&pn=${encodeURIComponent(bd.accountName || settings.businessName)}&am=${balance > 0 ? balance : invoice.grandTotal}&cu=INR`}
                size={70}
                fgColor="#0A0A0A"
                bgColor="#FFFFFF"
              />
              <div style={{ fontSize: '10px', color: '#555' }}>
                <strong style={{ color: '#0A0A0A', display: 'block' }}>Scan to Pay via UPI</strong>
                <span>Supports GPay, PhonePe, Paytm</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Financial Summary & Balance Due */}
        <div style={{ width: '310px', background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ background: '#0A0A0A', color: '#D4AF37', padding: '3px 10px', display: 'inline-block', borderRadius: '4px', fontWeight: 700, fontSize: '10px', letterSpacing: '1px', marginBottom: '10px' }}>
            AMOUNT SUMMARY
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E5E5E5', fontSize: '11px' }}>
            <span style={{ color: '#555' }}>Total Manpower</span>
            <strong style={{ color: '#111' }}>{invoice.totalManpower || 0} workers</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E5E5E5', fontSize: '11px' }}>
            <span style={{ color: '#555' }}>Subtotal</span>
            <strong style={{ color: '#111' }}>{formatINR(invoice.subtotal)}</strong>
          </div>
          {showGst && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E5E5E5', fontSize: '11px' }}>
                <span style={{ color: '#555' }}>CGST ({invoice.gstPercent / 2}%)</span>
                <span>{formatINR(cgst)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E5E5E5', fontSize: '11px' }}>
                <span style={{ color: '#555' }}>SGST ({invoice.gstPercent / 2}%)</span>
                <span>{formatINR(sgst)}</span>
              </div>
            </>
          )}

          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
            background: '#0A0A0A', borderRadius: '6px', marginTop: '8px', alignItems: 'center',
          }}>
            <span style={{ color: '#D4AF37', fontWeight: 800, fontSize: '13px', fontFamily: 'Poppins, sans-serif' }}>GRAND TOTAL</span>
            <span style={{ color: '#D4AF37', fontWeight: 900, fontSize: '15px', fontFamily: 'Poppins, sans-serif' }}>{formatINR(invoice.grandTotal)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #E5E5E5', marginTop: '6px', fontSize: '11px' }}>
            <span style={{ color: '#15803d', fontWeight: 600 }}>Less: Paid / Advance</span>
            <strong style={{ color: '#15803d' }}>{paid > 0 ? `- ${formatINR(paid)}` : '₹0'}</strong>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
            background: isFullyPaid ? '#15803d' : '#111827',
            borderRadius: '6px', marginTop: '6px', color: '#ffffff', alignItems: 'center',
          }}>
            <span style={{ color: isFullyPaid ? '#ffffff' : '#f59e0b', fontWeight: 800, fontSize: '12px' }}>
              {isFullyPaid ? 'STATUS: PAID IN FULL' : 'BALANCE DUE'}
            </span>
            <span style={{ color: isFullyPaid ? '#ffffff' : '#f59e0b', fontWeight: 900, fontSize: '15px' }}>
              {formatINR(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Signature & Terms Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', paddingTop: '14px', borderTop: '2px solid #C9A227' }}>
        <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.7', maxWidth: '380px' }}>
          <div>• <strong>Terms & Conditions:</strong> Payment due as specified ({invoice.paymentTerms || 'Due on Receipt'}).</div>
          <div>• Work completed verified as per site manpower log entries.</div>
          <div>• Computer generated invoice from <strong>MAN POWER CBE</strong>.</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: '180px' }}>
          {invoice.signatureUrl ? (
            <img src={invoice.signatureUrl} alt="Signature" style={{ height: '48px', marginBottom: '4px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          ) : (
            <div style={{ height: '40px', borderBottom: '1px solid #888', marginBottom: '6px' }} />
          )}
          <div style={{ fontSize: '10px', color: '#555', fontWeight: 600 }}>Authorized Signatory</div>
          <div style={{ fontSize: '11px', color: '#0A0A0A', fontWeight: 800, marginTop: '1px' }}>{settings.businessName || 'MAN POWER'}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#888', borderTop: '1px solid #E5E5E5', paddingTop: '10px' }}>
        Thank you for your business! · {settings.email || 'manpowerofcbe@gmail.com'} · @manpower_cbe
      </div>
    </div>
  );
};

export default InvoicePreview;
