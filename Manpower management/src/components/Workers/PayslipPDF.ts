import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Worker, Job } from '../../types';
import { formatINR, formatDate } from '../../utils';

export const generateWorkerPayslipPDF = async (
  worker: Worker,
  jobs: Job[],
  advance: number,
  periodFrom: string,
  periodTo: string
): Promise<void> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '794px';
  container.style.background = 'white';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const totalEarnings = jobs.reduce((s, j) => s + j.rate, 0);
  const netPay = totalEarnings - advance;

  const jobsHTML = jobs.map((j, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#FAFAFA' : '#FFF'}; border-bottom:1px solid #E5E5E5;">
      <td style="padding:7px 8px;">${formatDate(j.date)}</td>
      <td style="padding:7px 8px;">${j.clientName}</td>
      <td style="padding:7px 8px;">${j.workType}</td>
      <td style="padding:7px 8px;">${j.shift}</td>
      <td style="padding:7px 8px; text-align:right;">${formatINR(j.rate)}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="width:794px;min-height:500px;padding:40px 60px;box-sizing:border-box;background:#fff;font-family:Arial,sans-serif;font-size:12px;color:#333;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C9A227;padding-bottom:16px;margin-bottom:20px;">
        <div>
          <div style="width:50px;height:50px;border-radius:8px;background:linear-gradient(135deg,#D4AF37,#F0C040);display:flex;align-items:center;justify-content:center;margin-bottom:6px;">
            <span style="color:#0A0A0A;font-weight:900;font-size:20px;">MP</span>
          </div>
          <div style="font-weight:900;font-size:22px;color:#0A0A0A;">MAN POWER CBE</div>
          <div style="color:#C9A227;font-size:10px;font-weight:700;letter-spacing:2px;">PAYSLIP</div>
        </div>
        <div style="text-align:right;color:#555;line-height:1.8;">
          <div><strong style="color:#0A0A0A;">Worker:</strong> ${worker.name}</div>
          <div><strong style="color:#0A0A0A;">Worker ID:</strong> ${worker.workerId}</div>
          <div><strong style="color:#0A0A0A;">Period:</strong> ${formatDate(periodFrom)} to ${formatDate(periodTo)}</div>
          <div><strong style="color:#0A0A0A;">Mobile:</strong> ${worker.mobile}</div>
        </div>
      </div>
      
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#0A0A0A;color:#D4AF37;">
            <th style="padding:8px;text-align:left;font-size:11px;">Date</th>
            <th style="padding:8px;text-align:left;font-size:11px;">Client</th>
            <th style="padding:8px;text-align:left;font-size:11px;">Work Type</th>
            <th style="padding:8px;text-align:left;font-size:11px;">Shift</th>
            <th style="padding:8px;text-align:right;font-size:11px;">Day Rate</th>
          </tr>
        </thead>
        <tbody>${jobsHTML}</tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;">
        <div style="min-width:250px;">
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #E5E5E5;">
            <span style="color:#555;">Total Days: ${jobs.length}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #E5E5E5;">
            <span style="color:#555;">Gross Earnings</span><strong style="color:#22C55E;">${formatINR(totalEarnings)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #E5E5E5;">
            <span style="color:#555;">Advance Deducted</span><strong style="color:#EF4444;">- ${formatINR(advance)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 16px;background:#0A0A0A;border-radius:8px;margin-top:8px;">
            <span style="color:#D4AF37;font-weight:800;font-size:14px;">NET PAY</span>
            <span style="color:#D4AF37;font-weight:900;font-size:16px;">${formatINR(netPay)}</span>
          </div>
        </div>
      </div>

      ${worker.bankDetails?.accountNo ? `
        <div style="margin-top:20px;padding:12px;background:#F9F9F9;border-radius:8px;border:1px solid #E5E5E5;">
          <div style="font-weight:700;margin-bottom:6px;color:#0A0A0A;">Bank Details</div>
          <div style="color:#555;line-height:1.8;font-size:11px;">
            <div>Account No: ${worker.bankDetails.accountNo}</div>
            <div>IFSC: ${worker.bankDetails.ifsc}</div>
            <div>Bank: ${worker.bankDetails.bankName}</div>
            ${worker.upi ? `<div>UPI: ${worker.upi}</div>` : ''}
          </div>
        </div>
      ` : ''}

      <div style="margin-top:30px;display:flex;justify-content:flex-end;">
        <div style="text-align:center;min-width:160px;">
          <div style="height:40px;border-bottom:1px solid #999;margin-bottom:6px;"></div>
          <div style="font-size:11px;color:#555;font-weight:600;">Authorized Signatory</div>
          <div style="font-size:12px;color:#0A0A0A;font-weight:700;">MAN POWER CBE</div>
        </div>
      </div>
    </div>
  `;

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Payslip-${worker.name}-${periodFrom}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};
