import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Invoice, BusinessSettings, InvoiceLineItem } from '../../types';
import { formatINR, formatDate, calculateGST } from '../../utils';

/**
 * Generates an executive-grade A4 PDF of the invoice.
 * For multi-page invoices, renders dedicated Continuation Headers (Logo, Business Name, Invoice No, Page X of Y)
 * and repeated table headers on subsequent pages.
 */
export const generateInvoicePDF = async (
  invoice: Omit<Invoice, 'id' | 'createdAt'>,
  settings: BusinessSettings
): Promise<void> => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // A4 width at 96 DPI
  container.style.background = '#ffffff';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const { gstAmount, cgst, sgst } = calculateGST(invoice.subtotal, invoice.gstPercent || 0);
  const showGst = (invoice.gstPercent || 0) > 0;
  const lineItems = invoice.lineItems || [];

  const waitImages = async (el: HTMLElement) => {
    const images = el.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(
        img =>
          new Promise(resolve => {
            if (img.complete) resolve(null);
            else {
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
            }
          })
      )
    );
  };

  const captureCanvas = async (html: string) => {
    container.innerHTML = html;
    await waitImages(container);
    return html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  };

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const ITEMS_PER_PAGE_1 = 15;

    if (lineItems.length <= ITEMS_PER_PAGE_1) {
      // ─── SINGLE PAGE INVOICE ─────────────────────────────────
      const canvas = await captureCanvas(buildSinglePageHTML(invoice, settings, showGst, gstAmount, cgst, sgst));
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    } else {
      // ─── MULTI-PAGE INVOICE (Page 1 + Page 2 Continuation) ────
      const page1Items = lineItems.slice(0, ITEMS_PER_PAGE_1);
      const page2Items = lineItems.slice(ITEMS_PER_PAGE_1);

      // Render Page 1
      const canvas1 = await captureCanvas(buildPage1HTML(invoice, page1Items, settings));
      pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');

      // Render Page 2 with Continuation Header & Full Bottom Summary
      pdf.addPage();
      const canvas2 = await captureCanvas(buildPage2HTML(invoice, page2Items, settings, showGst, gstAmount, cgst, sgst));
      pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const safeFileName = (invoice.invoiceNo || 'Invoice').replace(/[/\\?%*:|"<>]/g, '-');
    pdf.save(`${safeFileName}.pdf`);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    alert('Could not generate PDF. Please try printing directly or check your connection.');
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

// ─── LOGO HELPER ───────────────────────────────────────────────
function getLogoHTML(settings: BusinessSettings, height = 50) {
  return settings.logoUrl
    ? `<img src="${settings.logoUrl}" alt="Logo" style="max-height:${height}px; max-width:200px; object-fit:contain; margin-bottom:4px; display:block;" />`
    : `<div style="width:44px;height:44px;border-radius:6px;background:linear-gradient(135deg,#D4AF37,#F0C040);display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
        <span style="color:#0A0A0A;font-weight:900;font-size:18px;font-family:Arial,sans-serif;">MP</span>
       </div>`;
}

// ─── TABLE ROWS HELPER ─────────────────────────────────────────
function renderTableRows(items: InvoiceLineItem[]) {
  return items.map((item, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF'}; border-bottom:1px solid #E5E5E5;">
      <td style="padding:7px 10px; font-size:11px; white-space:nowrap;">${formatDate(item.date)}</td>
      <td style="padding:7px 10px; font-size:11px;">${item.location || '-'}</td>
      <td style="padding:7px 10px; font-size:11px;">${item.workType || '-'}</td>
      <td style="padding:7px 10px; font-size:11px;">${item.shift || '-'}</td>
      <td style="padding:7px 10px; text-align:right; font-size:11px;">${item.manpower}</td>
      <td style="padding:7px 10px; text-align:right; font-size:11px; white-space:nowrap;">${formatINR(item.rate)}</td>
      <td style="padding:7px 10px; text-align:right; font-weight:600; font-size:11px; color:#111; white-space:nowrap;">${formatINR(item.amount)}</td>
    </tr>
  `).join('');
}

// ─── TABLE HEADER HELPER ───────────────────────────────────────
const TABLE_HEADER_HTML = `
  <thead>
    <tr style="background:#0A0A0A; color:#D4AF37;">
      <th style="padding:9px 10px; text-align:left; font-size:11px; font-weight:700; letter-spacing:0.5px;">Date</th>
      <th style="padding:9px 10px; text-align:left; font-size:11px; font-weight:700;">Location</th>
      <th style="padding:9px 10px; text-align:left; font-size:11px; font-weight:700;">Work Type</th>
      <th style="padding:9px 10px; text-align:left; font-size:11px; font-weight:700;">Shift</th>
      <th style="padding:9px 10px; text-align:right; font-size:11px; font-weight:700;">Manpower</th>
      <th style="padding:9px 10px; text-align:right; font-size:11px; font-weight:700;">Rate/Head</th>
      <th style="padding:9px 10px; text-align:right; font-size:11px; font-weight:700;">Amount</th>
    </tr>
  </thead>
`;

// ─── 2-COLUMN BOTTOM LAYOUT ────────────────────────────────────
function renderBottomSummary(
  invoice: Omit<Invoice, 'id' | 'createdAt'>,
  settings: BusinessSettings,
  showGst: boolean,
  gstAmount: number,
  cgst: number,
  sgst: number
) {
  const bd = invoice.bankDetailsSnapshot;
  const paid = invoice.paidAmount || 0;
  const balance = invoice.balanceDue !== undefined ? invoice.balanceDue : Math.max(0, invoice.grandTotal - paid);
  const isFullyPaid = paid >= invoice.grandTotal && invoice.grandTotal > 0;

  return `
    <!-- 2-Column Bottom Layout: Payment Details (Left) vs Summary & Totals (Right) -->
    <div style="display:flex; justify-content:space-between; align-items:stretch; gap:20px; margin-bottom:20px;">
      <!-- Left Column: Bank Payment Details -->
      <div style="flex:1; background:#FAFAFA; border:1px solid #E5E5E5; border-radius:8px; padding:12px 14px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="background:#0A0A0A; color:#D4AF37; padding:3px 10px; display:inline-block; border-radius:4px; font-weight:700; font-size:10px; letter-spacing:1px; margin-bottom:8px;">
            PAYMENT / BANK DETAILS
          </div>
          ${bd && (bd.accountNo || bd.upiId || bd.accountName) ? `
            <div style="color:#333; line-height:1.8; font-size:11px;">
              ${bd.accountName ? `<div><strong>Account Name:</strong> ${bd.accountName}</div>` : ''}
              ${bd.accountNo ? `<div><strong>Account No:</strong> ${bd.accountNo}</div>` : ''}
              ${bd.ifsc ? `<div><strong>IFSC Code:</strong> ${bd.ifsc}</div>` : ''}
              ${bd.bankName ? `<div><strong>Bank:</strong> ${bd.bankName}${bd.branch ? ` (${bd.branch})` : ''}</div>` : ''}
              ${bd.upiId ? `<div><strong>UPI ID:</strong> <span style="color:#C9A227; font-weight:bold;">${bd.upiId}</span></div>` : ''}
            </div>
          ` : `
            <div style="color:#777; font-size:11px; font-style:italic;">Bank payment details available on request.</div>
          `}
        </div>
      </div>

      <!-- Right Column: Financial Summary & Balance Due -->
      <div style="width:310px; background:#FAFAFA; border:1px solid #E5E5E5; border-radius:8px; padding:12px 14px;">
        <div style="background:#0A0A0A; color:#D4AF37; padding:3px 10px; display:inline-block; border-radius:4px; font-weight:700; font-size:10px; letter-spacing:1px; margin-bottom:8px;">
          AMOUNT SUMMARY
        </div>

        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #E5E5E5; font-size:11px;">
          <span style="color:#555;">Total Manpower</span>
          <strong style="color:#111;">${invoice.totalManpower || 0} workers</strong>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #E5E5E5; font-size:11px;">
          <span style="color:#555;">Subtotal</span>
          <strong style="color:#111;">${formatINR(invoice.subtotal)}</strong>
        </div>
        ${showGst ? `
          <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #E5E5E5; font-size:11px;">
            <span style="color:#555;">CGST (${(invoice.gstPercent || 0) / 2}%)</span><span>${formatINR(cgst)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #E5E5E5; font-size:11px;">
            <span style="color:#555;">SGST (${(invoice.gstPercent || 0) / 2}%)</span><span>${formatINR(sgst)}</span>
          </div>
        ` : ''}

        <div style="display:flex; justify-content:space-between; padding:7px 10px; background:#0A0A0A; border-radius:6px; margin-top:6px; align-items:center;">
          <span style="color:#D4AF37; font-weight:800; font-size:13px;">GRAND TOTAL</span>
          <span style="color:#D4AF37; font-weight:900; font-size:15px;">${formatINR(invoice.grandTotal)}</span>
        </div>

        <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #E5E5E5; margin-top:5px; font-size:11px;">
          <span style="color:#15803d; font-weight:600;">Less: Paid / Advance</span>
          <strong style="color:#15803d;">${paid > 0 ? `- ${formatINR(paid)}` : '₹0'}</strong>
        </div>

        <div style="display:flex; justify-content:space-between; padding:7px 10px; background:${isFullyPaid ? '#15803d' : '#111827'}; border-radius:6px; margin-top:5px; color:#ffffff; align-items:center;">
          <span style="color:${isFullyPaid ? '#ffffff' : '#f59e0b'}; font-weight:800; font-size:12px;">
            ${isFullyPaid ? 'STATUS: PAID IN FULL' : 'BALANCE DUE'}
          </span>
          <span style="color:${isFullyPaid ? '#ffffff' : '#f59e0b'}; font-weight:900; font-size:14px;">
            ${formatINR(balance)}
          </span>
        </div>
      </div>
    </div>

    <!-- Signature & Terms Section -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:16px; padding-top:12px; border-top:2px solid #C9A227;">
      <div style="font-size:10px; color:#666; line-height:1.6; max-width:380px;">
        <div>• <strong>Terms & Conditions:</strong> Payment due as specified (${invoice.paymentTerms || 'Due on Receipt'}).</div>
        <div>• Work completed verified as per site manpower log entries.</div>
        <div>• Computer generated invoice from <strong>MAN POWER CBE</strong>.</div>
      </div>
      <div style="text-align:center; min-width:180px;">
        ${invoice.signatureUrl ? `
          <img src="${invoice.signatureUrl}" alt="Signature" style="max-height:44px; margin-bottom:4px; display:block; margin-left:auto; margin-right:auto;" />
        ` : `
          <div style="height:36px; border-bottom:1px solid #888; margin-bottom:4px;"></div>
        `}
        <div style="font-size:10px; color:#555; font-weight:600;">Authorized Signatory</div>
        <div style="font-size:11px; color:#0A0A0A; font-weight:800; margin-top:1px;">${settings.businessName || 'MAN POWER'}</div>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:16px; text-align:center; font-size:10px; color:#888; border-top:1px solid #E5E5E5; padding-top:8px;">
      Thank you for your business! · ${settings.email || 'manpowerofcbe@gmail.com'} · @manpower_cbe
    </div>
  `;
}

// ─── 1. SINGLE PAGE HTML ───────────────────────────────────────
function buildSinglePageHTML(
  invoice: Omit<Invoice, 'id' | 'createdAt'>,
  settings: BusinessSettings,
  showGst: boolean,
  gstAmount: number,
  cgst: number,
  sgst: number
): string {
  return `
    <div style="width:794px; min-height:1123px; padding:35px 45px; box-sizing:border-box; background:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#222222; line-height:1.4; display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <!-- Header Bar -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #C9A227; padding-bottom:14px; margin-bottom:16px;">
          <div style="max-width:450px;">
            ${getLogoHTML(settings)}
            <div style="font-weight:900; font-size:22px; color:#0A0A0A; letter-spacing:-0.5px;">${settings.businessName || 'MAN POWER'}</div>
            <div style="color:#C9A227; font-size:10px; font-weight:700; letter-spacing:1.5px; margin-top:2px;">${settings.tagline || 'WORKFORCE ON DEMAND — COIMBATORE'}</div>
            ${settings.phone ? `<div style="color:#555; margin-top:3px; font-size:11px;">📞 ${settings.phone}</div>` : ''}
            ${settings.email ? `<div style="color:#555; font-size:11px;">✉ ${settings.email}</div>` : ''}
            ${settings.address ? `<div style="color:#555; font-size:11px; margin-top:2px; white-space:pre-line;">${settings.address}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div style="background:#0A0A0A; color:#D4AF37; padding:8px 22px; border-radius:6px; font-size:22px; font-weight:900; letter-spacing:2px; display:inline-block;">INVOICE</div>
            <div style="margin-top:10px; color:#444; font-size:11px; line-height:1.8;">
              <div><strong style="color:#0A0A0A;">Invoice No:</strong> <span style="font-family:monospace; font-weight:bold; color:#C9A227; font-size:12px;">${invoice.invoiceNo}</span></div>
              <div><strong style="color:#0A0A0A;">Date:</strong> ${formatDate(invoice.invoiceDate)}</div>
              <div><strong style="color:#0A0A0A;">Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
              <div><strong style="color:#0A0A0A;">Terms:</strong> ${invoice.paymentTerms || 'Due on Receipt'}</div>
            </div>
          </div>
        </div>

        <!-- Bill To & Work Period -->
        <div style="margin-bottom:16px; background:#FAFAFA; border:1px solid #EEEEEE; padding:10px 14px; border-radius:6px;">
          <div style="background:#0A0A0A; color:#D4AF37; padding:3px 10px; display:inline-block; border-radius:4px; font-weight:700; font-size:10px; letter-spacing:1px; margin-bottom:4px;">BILL TO</div>
          <div style="font-weight:700; font-size:15px; color:#0A0A0A;">${invoice.clientName || 'Client'}</div>
          ${invoice.clientAddress ? `<div style="color:#555; margin-top:2px; font-size:11px; white-space:pre-line;">${invoice.clientAddress}</div>` : ''}
          <div style="margin-top:5px; color:#555; font-size:11px; border-top:1px dashed #DDD; padding-top:4px;">
            Work Period: <strong style="color:#0A0A0A;">${formatDate(invoice.workPeriodFrom)}</strong> to <strong style="color:#0A0A0A;">${formatDate(invoice.workPeriodTo)}</strong>
          </div>
        </div>

        <!-- Line Items Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
          ${TABLE_HEADER_HTML}
          <tbody>
            ${renderTableRows(invoice.lineItems || [])}
          </tbody>
        </table>
      </div>

      <div>
        ${renderBottomSummary(invoice, settings, showGst, gstAmount, cgst, sgst)}
      </div>
    </div>
  `;
}

// ─── 2. PAGE 1 OF MULTI-PAGE INVOICE ───────────────────────────
function buildPage1HTML(
  invoice: Omit<Invoice, 'id' | 'createdAt'>,
  items: InvoiceLineItem[],
  settings: BusinessSettings
): string {
  return `
    <div style="width:794px; min-height:1123px; padding:35px 45px; box-sizing:border-box; background:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#222222; line-height:1.4; display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <!-- Header Bar -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #C9A227; padding-bottom:14px; margin-bottom:16px;">
          <div style="max-width:450px;">
            ${getLogoHTML(settings)}
            <div style="font-weight:900; font-size:22px; color:#0A0A0A; letter-spacing:-0.5px;">${settings.businessName || 'MAN POWER'}</div>
            <div style="color:#C9A227; font-size:10px; font-weight:700; letter-spacing:1.5px; margin-top:2px;">${settings.tagline || 'WORKFORCE ON DEMAND — COIMBATORE'}</div>
            ${settings.phone ? `<div style="color:#555; margin-top:3px; font-size:11px;">📞 ${settings.phone}</div>` : ''}
            ${settings.email ? `<div style="color:#555; font-size:11px;">✉ ${settings.email}</div>` : ''}
            ${settings.address ? `<div style="color:#555; font-size:11px; margin-top:2px; white-space:pre-line;">${settings.address}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div style="background:#0A0A0A; color:#D4AF37; padding:8px 22px; border-radius:6px; font-size:22px; font-weight:900; letter-spacing:2px; display:inline-block;">INVOICE</div>
            <div style="margin-top:10px; color:#444; font-size:11px; line-height:1.8;">
              <div><strong style="color:#0A0A0A;">Invoice No:</strong> <span style="font-family:monospace; font-weight:bold; color:#C9A227; font-size:12px;">${invoice.invoiceNo}</span></div>
              <div><strong style="color:#0A0A0A;">Date:</strong> ${formatDate(invoice.invoiceDate)}</div>
              <div><strong style="color:#0A0A0A;">Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
              <div><strong style="color:#0A0A0A;">Page:</strong> <span style="font-weight:bold; color:#0A0A0A;">Page 1 of 2</span></div>
            </div>
          </div>
        </div>

        <!-- Bill To & Work Period -->
        <div style="margin-bottom:16px; background:#FAFAFA; border:1px solid #EEEEEE; padding:10px 14px; border-radius:6px;">
          <div style="background:#0A0A0A; color:#D4AF37; padding:3px 10px; display:inline-block; border-radius:4px; font-weight:700; font-size:10px; letter-spacing:1px; margin-bottom:4px;">BILL TO</div>
          <div style="font-weight:700; font-size:15px; color:#0A0A0A;">${invoice.clientName || 'Client'}</div>
          ${invoice.clientAddress ? `<div style="color:#555; margin-top:2px; font-size:11px; white-space:pre-line;">${invoice.clientAddress}</div>` : ''}
          <div style="margin-top:5px; color:#555; font-size:11px; border-top:1px dashed #DDD; padding-top:4px;">
            Work Period: <strong style="color:#0A0A0A;">${formatDate(invoice.workPeriodFrom)}</strong> to <strong style="color:#0A0A0A;">${formatDate(invoice.workPeriodTo)}</strong>
          </div>
        </div>

        <!-- Line Items Table (Part 1) -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
          ${TABLE_HEADER_HTML}
          <tbody>
            ${renderTableRows(items)}
          </tbody>
        </table>
      </div>

      <!-- Page 1 Footer Indicator -->
      <div style="border-top:2px solid #C9A227; padding-top:10px; display:flex; justify-content:space-between; items-center; font-size:11px; color:#666;">
        <div>Invoice No: <strong>${invoice.invoiceNo}</strong> · Client: <strong>${invoice.clientName}</strong></div>
        <div style="font-weight:bold; color:#C9A227;">Page 1 of 2 (Continued on Page 2) ➔</div>
      </div>
    </div>
  `;
}

// ─── 3. PAGE 2 OF MULTI-PAGE INVOICE (With Full Continuation Header) ──
function buildPage2HTML(
  invoice: Omit<Invoice, 'id' | 'createdAt'>,
  items: InvoiceLineItem[],
  settings: BusinessSettings,
  showGst: boolean,
  gstAmount: number,
  cgst: number,
  sgst: number
): string {
  return `
    <div style="width:794px; min-height:1123px; padding:35px 45px; box-sizing:border-box; background:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#222222; line-height:1.4; display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <!-- Continuation Header Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #C9A227; padding-bottom:12px; margin-bottom:16px; background:#FAFAFA; padding:10px 14px; border-radius:6px; border:1px solid #E5E5E5;">
          <div style="display:flex; items-center; gap:12px;">
            ${getLogoHTML(settings, 36)}
            <div>
              <div style="font-weight:900; font-size:18px; color:#0A0A0A;">${settings.businessName || 'MAN POWER'}</div>
              <div style="color:#C9A227; font-size:9px; font-weight:700; letter-spacing:1px;">${settings.tagline || 'WORKFORCE ON DEMAND — COIMBATORE'}</div>
            </div>
          </div>
          <div style="text-align:right; font-size:11px;">
            <div style="background:#0A0A0A; color:#D4AF37; padding:4px 14px; border-radius:4px; font-size:12px; font-weight:800; letter-spacing:1px; display:inline-block;">
              INVOICE (Page 2 of 2)
            </div>
            <div style="margin-top:4px; color:#555;">
              Invoice No: <strong style="color:#C9A227; font-family:monospace;">${invoice.invoiceNo}</strong> · Client: <strong style="color:#0A0A0A;">${invoice.clientName}</strong>
            </div>
          </div>
        </div>

        <!-- Continued Line Items Table -->
        <div style="font-size:11px; font-weight:700; color:#555; margin-bottom:6px; letter-spacing:0.5px;">CONTINUED LINE ITEMS:</div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          ${TABLE_HEADER_HTML}
          <tbody>
            ${renderTableRows(items)}
          </tbody>
        </table>
      </div>

      <div>
        ${renderBottomSummary(invoice, settings, showGst, gstAmount, cgst, sgst)}
      </div>
    </div>
  `;
}
