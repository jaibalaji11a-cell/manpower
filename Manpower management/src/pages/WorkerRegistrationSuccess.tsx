import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Shield, MapPin, Briefcase, Clock, Phone, User, Copy, Check, AlertCircle, Sparkles } from 'lucide-react';
import { getRegisteredWorkerById } from '../firebase/firestore';
import type { RegisteredWorker } from '../types';

const WorkerRegistrationSuccess: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const [worker, setWorker] = useState<RegisteredWorker | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchWorker = async () => {
      if (!docId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getRegisteredWorkerById(docId);
        if (isMounted) {
          setWorker(data);
        }
      } catch (err) {
        console.error('Error loading worker registration data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWorker();

    return () => {
      isMounted = false;
    };
  }, [docId]);

  const handleCopyId = () => {
    if (!worker?.workerId) return;
    navigator.clipboard.writeText(worker.workerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ─── LOADING STATE ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-dark-600 border-t-gold-400 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-6 h-6 text-gold-400/80 animate-pulse" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-cream-100 font-heading">Retrieving Registration Data...</h2>
        <p className="text-xs text-cream-400 mt-1 max-w-xs">
          Please wait a moment while we fetch your worker verification details.
        </p>
      </div>
    );
  }

  // ─── NOT FOUND STATE ─────────────────────────────────────────
  if (!worker) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col justify-between text-cream-100 animate-fade-in">
        {/* Branding Header */}
        <header className="bg-dark-800 border-b border-dark-500 px-4 py-3.5 sm:px-6">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain rounded-lg" />
              <div>
                <h1 className="text-sm font-black text-gold-400 tracking-wider font-heading leading-tight">
                  MAN POWER CBE
                </h1>
                <p className="text-[10px] text-cream-500">Worker Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] bg-dark-700 border border-dark-500 px-2.5 py-1 rounded-full text-cream-300">
              <Shield size={12} className="text-gold-400" />
              <span>Self Registration</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="card w-full max-w-md p-6 sm:p-8 text-center border-red-500/30 bg-dark-800/90 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-cream-100 font-heading mb-2">Registration Not Found</h2>
            <p className="text-xs text-cream-400 leading-relaxed mb-6">
              We could not locate a worker registration record for this link. The link may be incomplete or invalid.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                to="/register"
                className="btn-primary w-full text-xs py-2.5 text-center flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                Register New Worker
              </Link>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-[11px] text-cream-500 border-t border-dark-600">
          © {new Date().getFullYear()} Manpower CBE. All rights reserved.
        </footer>
      </div>
    );
  }

  // ─── SUCCESS VIEW ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-900 text-cream-100 flex flex-col justify-between font-sans animate-fade-in selection:bg-gold-500/20 selection:text-gold-300">
      {/* Branding Header */}
      <header className="bg-dark-800 border-b border-dark-500 px-4 py-3.5 sm:px-6 sticky top-0 z-20 backdrop-blur-md bg-dark-800/90">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain rounded-lg" />
            <div>
              <h1 className="text-sm font-black text-gold-400 tracking-wider font-heading leading-tight">
                MAN POWER CBE
              </h1>
              <p className="text-[10px] text-cream-500">Worker Registration Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] bg-dark-700 border border-dark-500 px-2.5 py-1 rounded-full text-cream-300">
            <Shield size={12} className="text-emerald-400" />
            <span className="font-medium">Verified Profile</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-2">
        <div className="w-full max-w-lg">
          {/* Card Container */}
          <div className="card p-6 sm:p-8 border-gold-500/30 bg-gradient-to-b from-dark-800 via-dark-800 to-dark-700 shadow-2xl relative overflow-hidden">
            
            {/* Top decorative glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Checkmark Animation Header */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-950/60 border-2 border-emerald-500/60 flex items-center justify-center p-3 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-pulse">
                  <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 text-emerald-400 transition-transform duration-500 hover:scale-110" />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-cream-100 font-heading tracking-tight">
                Registration Successful!
              </h2>
              <p className="text-xs sm:text-sm text-cream-400 mt-1 max-w-xs">
                Welcome to Manpower CBE. Your worker profile has been created and verified.
              </p>
            </div>

            {/* Gold Divider */}
            <div className="gold-divider my-5" />

            {/* Worker ID Badge */}
            <div className="text-center space-y-2 relative z-10">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-400/90 block">
                Official Worker ID
              </span>
              <div className="inline-flex items-center gap-3 bg-gold-gradient p-[1px] rounded-2xl shadow-gold">
                <div className="bg-dark-900/90 hover:bg-dark-900 transition-colors rounded-2xl px-5 py-2.5 flex items-center gap-3">
                  <span className="font-mono text-xl sm:text-2xl font-black text-gold-400 tracking-wider">
                    {worker.workerId || 'MW-00000'}
                  </span>
                  <button
                    onClick={handleCopyId}
                    type="button"
                    title="Copy Worker ID"
                    className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-cream-300 hover:text-gold-400 transition-all active:scale-90 flex items-center gap-1 text-[11px] font-semibold border border-dark-400"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Summary Details */}
            <div className="mt-6 bg-dark-900/60 rounded-xl p-4 border border-dark-500 space-y-3 relative z-10">
              {/* Name & Phone */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-dark-600">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-dark-700 border border-dark-400 flex items-center justify-center text-gold-400 shrink-0">
                    <User size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-cream-100">{worker.name}</div>
                    <div className="text-[11px] text-cream-400 font-mono flex items-center gap-1 mt-0.5">
                      <Phone size={11} className="text-gold-400/80" />
                      {worker.phone}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="badge-active text-[10px] uppercase tracking-wider font-bold">
                    {worker.availability || 'Available'}
                  </span>
                </div>
              </div>

              {/* Area */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-cream-400 flex items-center gap-1.5">
                  <MapPin size={13} className="text-gold-400" /> Primary Area:
                </span>
                <span className="font-semibold text-cream-100">
                  {worker.areaName || 'Coimbatore'}
                </span>
              </div>

              {/* Skills */}
              <div className="pt-1">
                <span className="text-xs text-cream-400 flex items-center gap-1.5 mb-2">
                  <Briefcase size={13} className="text-gold-400" /> Registered Skills:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {worker.skillNames && worker.skillNames.length > 0 ? (
                    worker.skillNames.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-dark-700 border border-dark-400 text-gold-300"
                      >
                        {skill}
                      </span>
                    ))
                  ) : worker.skills && worker.skills.length > 0 ? (
                    worker.skills.map((skillId, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-dark-700 border border-dark-400 text-gold-300 capitalize"
                      >
                        {skillId}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-cream-500 italic">General Labor</span>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions Notice */}
            <div className="mt-4 p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-cream-300 flex items-start gap-2.5 text-xs relative z-10">
              <Shield size={16} className="text-gold-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-gold-400 font-semibold">Important:</strong> Your Worker ID is your unique identifier. Please save or screenshot it for future job assignments and payment tracking.
              </p>
            </div>

            {/* Edit Profile Action */}
            <div className="mt-6 pt-2 relative z-10">
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 rounded-xl bg-dark-700 border border-dark-400 text-cream-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed opacity-75 select-none"
              >
                <Clock size={14} className="text-gold-400" />
                <span>Edit My Profile</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-cream-400 border border-dark-500 ml-1">
                  Disabled
                </span>
              </button>
              <p className="text-[11px] text-cream-500 text-center mt-2 flex items-center justify-center gap-1">
                <Clock size={11} className="text-cream-400" />
                Edit option available for 24 hours
              </p>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-cream-500 border-t border-dark-600/80 px-4">
        © {new Date().getFullYear()} Manpower CBE Workforce Management. For support, call our helpdesk.
      </footer>
    </div>
  );
};

export default WorkerRegistrationSuccess;
