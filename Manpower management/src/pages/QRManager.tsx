import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Share2,
  MessageSquare,
  Users,
  Clock,
  ExternalLink,
  Sparkles,
  MapPin,
  FileCheck,
  Smartphone,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { subscribeRegisteredWorkers } from '../firebase/firestore';
import { useSettings } from '../contexts/SettingsContext';
import type { RegisteredWorker } from '../types';

export default function QRManager() {
  const { settings } = useSettings();
  const [workers, setWorkers] = useState<RegisteredWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  // Compute registration URL based on window location origin
  const registrationUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/register` 
    : '/register';

  const companyName = settings?.businessName || 'MAN POWER CBE';
  const tagline = settings?.tagline || 'Workforce On Demand — Coimbatore';

  useEffect(() => {
    const unsubscribe = subscribeRegisteredWorkers((data) => {
      setWorkers(data);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Helper for relative time
  const getTimeAgo = (timestamp?: any): string => {
    if (!timestamp) return 'No registrations yet';
    let date: Date;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 45) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    return `${Math.floor(diffInDays / 365)}y ago`;
  };

  // Download QR Code as PNG
  const handleDownloadQR = () => {
    if (!qrContainerRef.current) return;
    const canvas = qrContainerRef.current.querySelector('canvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const safeFilename = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_registration_qr.png`;
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = safeFilename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Print QR Code with print styles
  const handlePrint = () => {
    window.print();
  };

  // Copy registration link with feedback
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(registrationUrl);
      } else {
        // Fallback for older browsers / non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = registrationUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    const message = `*${companyName} - Worker Self Registration*\n\nWorkers can register directly using this link:\n👉 ${registrationUrl}\n\nScan QR code or click link to register with your skills and area.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const latestWorker = workers.length > 0 ? workers[0] : null;
  const totalCount = workers.length;
  const activeCount = workers.filter((w) => w.status === 'Active').length;

  return (
    <div className="page-container animate-fade-in text-cream-100">
      {/* ─── Page Header ────────────────────────────────────────── */}
      <header className="page-header no-print flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-dark-700 border border-gold-600/30 text-gold-400 shadow-gold/10">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="page-title text-2xl sm:text-3xl font-bold tracking-tight">
              QR Registration Manager
            </h1>
            <p className="page-subtitle text-cream-400 text-sm">
              Generate and distribute QR codes for worker self-registration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-active flex items-center gap-1.5 py-1 px-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Portal Active
          </span>
        </div>
      </header>

      {/* ─── Printable Document (Only visible when printing) ────── */}
      <div className="hidden print:block text-black p-8 text-center bg-white">
        <div className="max-w-md mx-auto border-4 border-black p-8 rounded-2xl">
          <h1 className="text-3xl font-black uppercase tracking-wider mb-2">{companyName}</h1>
          <p className="text-sm font-semibold text-gray-700 mb-6">{tagline}</p>
          
          <div className="flex justify-center my-6">
            <QRCodeCanvas
              value={registrationUrl}
              size={280}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="mt-6 border-t-2 border-dashed border-gray-400 pt-4">
            <p className="text-lg font-bold uppercase tracking-wide mb-1">Scan to Register as Worker</p>
            <p className="text-xs text-gray-600 font-mono break-all">{registrationUrl}</p>
            {settings?.phone && (
              <p className="text-sm font-semibold mt-3 text-gray-800">Support / Helpline: {settings.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Page Body (Hidden during print) ───────────────────── */}
      <div className="page-body no-print max-w-7xl mx-auto space-y-6">
        
        {/* Main Grid: QR Display & Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ─── Center / Main QR Display Card ─────────────────── */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
            <div className="card p-6 sm:p-8 flex-1 flex flex-col items-center text-center justify-between relative overflow-hidden bg-gradient-to-b from-dark-700 via-dark-800 to-dark-900 border-dark-400">
              
              {/* Subtle Ambient Gold Glow in Background */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Company Info Header */}
              <div className="relative z-10 w-full mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gold-500/10 text-gold-400 border border-gold-500/20 mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Self-Registration Gateway
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-cream-100 tracking-wide font-heading">
                  {companyName}
                </h2>
                <p className="text-xs sm:text-sm text-cream-400 mt-1 max-w-md mx-auto">
                  {tagline}
                </p>
              </div>

              {/* QR Code Container */}
              <div 
                ref={qrContainerRef}
                className="relative z-10 p-4 sm:p-5 rounded-2xl bg-white border-2 border-gold-500/40 shadow-xl shadow-gold/10 inline-block transition-transform hover:scale-[1.01] duration-300"
              >
                <div className="rounded-xl overflow-hidden bg-white flex items-center justify-center p-2">
                  <QRCodeCanvas
                    value={registrationUrl}
                    size={300}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>

              {/* Registration URL Link */}
              <div className="relative z-10 mt-6 w-full max-w-md">
                <a
                  href={registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-dark-600/80 hover:bg-dark-600 border border-dark-400 hover:border-gold-500/50 text-gold-400 text-xs sm:text-sm font-mono transition-all duration-200"
                  title="Open registration portal in a new tab"
                >
                  <span className="truncate">{registrationUrl}</span>
                  <ExternalLink className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>

              {/* Action Buttons Row */}
              <div className="relative z-10 mt-8 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="btn-primary flex items-center justify-center gap-2 py-3 text-sm shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR as PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn-secondary flex items-center justify-center gap-2 py-3 text-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`btn-ghost flex items-center justify-center gap-2 py-3 text-sm border transition-all duration-200 ${
                    copied
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-dark-600 border-dark-400 text-cream-200 hover:bg-dark-500'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gold-400" />
                      <span>Copy Registration Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all duration-200 active:scale-95 shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </button>
              </div>

            </div>
          </div>

          {/* ─── Right Column: Instructions & Strategy ─────────── */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-6">
            
            {/* Instructions Card */}
            <div className="card p-6 flex-1 flex flex-col justify-between border-dark-400 bg-dark-800">
              <div>
                <h3 className="section-title text-lg font-bold text-gold-400 mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-gold-400" />
                  How to Use
                </h3>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-dark-700/60 border border-dark-500">
                    <div className="w-7 h-7 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-cream-100">Print or share this QR code</h4>
                      <p className="text-xs text-cream-400 mt-0.5">
                        Posters at work sites, tea stalls, worker hubs, or broadcast via WhatsApp groups.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-dark-700/60 border border-dark-500">
                    <div className="w-7 h-7 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-cream-100">Workers scan with phone camera</h4>
                      <p className="text-xs text-cream-400 mt-0.5">
                        Directly opens mobile-friendly onboarding form without requiring app installs.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-dark-700/60 border border-dark-500">
                    <div className="w-7 h-7 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-cream-100">They fill registration form</h4>
                      <p className="text-xs text-cream-400 mt-0.5">
                        Captures name, phone, area in Coimbatore, multi-skills, and experience level.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-dark-700/60 border border-dark-500">
                    <div className="w-7 h-7 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-cream-100">Worker ID generated automatically</h4>
                      <p className="text-xs text-cream-400 mt-0.5">
                        Instantly issues unique identifier (<span className="font-mono text-gold-400">MW-00001</span> series) with digital badge.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-dark-700/60 border border-dark-500">
                    <div className="w-7 h-7 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      5
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-cream-100">Data appears on Map Intelligence</h4>
                      <p className="text-xs text-cream-400 mt-0.5">
                        Real-time live sync to Coimbatore area heatmaps, skill rosters, and dispatch boards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Verification Note */}
              <div className="mt-6 pt-4 border-t border-dark-500 flex items-center gap-3 text-xs text-cream-400">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  Anti-duplicate phone protection enabled. Workers can securely edit their info once.
                </span>
              </div>
            </div>

            {/* Quick Tips Box */}
            <div className="card p-5 border-gold-600/20 bg-gradient-to-r from-dark-700 to-dark-800">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gold-500/10 text-gold-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400">
                    Coimbatore Deployment Tip
                  </h4>
                  <p className="text-xs text-cream-300 mt-1 leading-relaxed">
                    Place laminated QR printouts at Gandhipuram Bus Stand, Ukkadam, Singanallur, and SIDCO industrial areas for maximum daily footfall registrations.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── Bottom Stats Section ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Registrations KPI */}
          <div className="kpi-card bg-dark-700 border-dark-400">
            <div className="flex items-center justify-between">
              <span className="stat-label">Total QR Registrations</span>
              <div className="p-2 rounded-lg bg-gold-500/10 text-gold-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="stat-value text-3xl font-black text-gold-400">
                {loading ? '...' : totalCount}
              </div>
              <p className="text-xs text-cream-400 mt-1 flex items-center gap-1">
                <span>Self-registered workforce</span>
              </p>
            </div>
          </div>

          {/* Active Workers KPI */}
          <div className="kpi-card bg-dark-700 border-dark-400">
            <div className="flex items-center justify-between">
              <span className="stat-label">Active Workers</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="stat-value text-3xl font-black text-cream-100">
                {loading ? '...' : activeCount}
              </div>
              <p className="text-xs text-cream-400 mt-1">
                {totalCount > 0
                  ? `${Math.round((activeCount / totalCount) * 100)}% verified ready`
                  : 'Awaiting first registrant'}
              </p>
            </div>
          </div>

          {/* Latest Registration KPI */}
          <div className="kpi-card bg-dark-700 border-dark-400 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="stat-label">Latest Registration</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 flex flex-col justify-between">
              {loading ? (
                <div className="text-sm text-cream-400">Loading registrations...</div>
              ) : latestWorker ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-lg font-bold text-cream-100 flex items-center gap-2">
                      <span>{latestWorker.name}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-600 text-gold-400 border border-dark-400">
                        {latestWorker.workerId}
                      </span>
                    </div>
                    <div className="text-xs text-cream-400 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gold-400" />
                        {latestWorker.areaName || 'Coimbatore'}
                      </span>
                      <span>•</span>
                      <span>{latestWorker.skills?.length || 0} skills</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-dark-600 text-cream-300 border border-dark-400">
                      {getTimeAgo(latestWorker.createdAt)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-cream-400 italic">
                  No registrations recorded yet. Share your QR code to get started!
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ─── Recent Registrations Preview Table ──────────────── */}
        {workers.length > 0 && (
          <div className="card p-6 border-dark-400 bg-dark-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title text-base font-bold text-cream-100 flex items-center gap-2 mb-0">
                <Users className="w-4 h-4 text-gold-400" />
                Recent QR Registrations
              </h3>
              <span className="text-xs text-cream-400">
                Showing latest {Math.min(workers.length, 5)} of {workers.length} workers
              </span>
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Worker ID</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Primary Area</th>
                    <th>Skills</th>
                    <th>Registered</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.slice(0, 5).map((w) => (
                    <tr key={w.id}>
                      <td className="font-mono font-bold text-gold-400">{w.workerId}</td>
                      <td className="font-medium text-cream-100">{w.name}</td>
                      <td className="font-mono text-cream-300">{w.phone}</td>
                      <td>{w.areaName || '—'}</td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {w.skillNames && w.skillNames.length > 0 ? (
                            w.skillNames.slice(0, 2).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[11px] rounded bg-dark-600 text-cream-300 border border-dark-500"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-cream-500">—</span>
                          )}
                          {w.skillNames && w.skillNames.length > 2 && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-dark-500 text-gold-400">
                              +{w.skillNames.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-cream-400 text-xs">{getTimeAgo(w.createdAt)}</td>
                      <td>
                        <span
                          className={
                            w.status === 'Active'
                              ? 'badge-active'
                              : w.status === 'Inactive'
                              ? 'badge-inactive'
                              : 'badge-partial'
                          }
                        >
                          {w.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
