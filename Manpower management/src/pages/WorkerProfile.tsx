import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { subscribeJobs, updateWorker } from '../firebase/firestore';
import type { Worker, Job } from '../types';
import {
  ArrowLeft, Phone, MapPin, Shield, CreditCard, Briefcase,
  Heart, Calendar, IndianRupee, Droplets, User, HardHat,
  Edit, Loader2, UserCheck, UserX, AlertTriangle, X, CheckCircle2, Power,
} from 'lucide-react';

const WorkerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    const fetchWorker = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const docRef = doc(db, 'workers', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setWorker({ id: docSnap.id, ...docSnap.data() } as Worker);
        } else {
          setError('Team member not found');
        }
      } catch (err) {
        console.error('Error fetching worker:', err);
        setError('Failed to load team member profile');
      } finally {
        setLoading(false);
      }
    };

    fetchWorker();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeJobs((allJobs) => {
      const workerJobs = allJobs.filter(job => job.workerIds?.includes(id));
      workerJobs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setJobs(workerJobs);
    });

    return () => unsubscribe();
  }, [id]);

  const handleConfirmToggleStatus = async () => {
    if (!worker || !id || statusUpdating) return;
    try {
      setStatusUpdating(true);
      const newStatus = worker.status === 'Active' ? 'Inactive' : 'Active';
      await updateWorker(id, { status: newStatus });
      setWorker({ ...worker, status: newStatus });
      setShowStatusModal(false);
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const maskAadhaar = (aadhaar?: string) => {
    if (!aadhaar) return '-';
    const clean = aadhaar.replace(/\D/g, '');
    if (clean.length === 12) {
      return `XXXX XXXX ${clean.slice(8, 12)}`;
    }
    return aadhaar;
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={48} className="text-gold-500 animate-spin mb-4" />
        <p className="text-cream-400">Loading team member profile...</p>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="page-container">
        <button onClick={() => navigate('/workers')} className="btn-ghost mb-6 flex items-center gap-2">
          <ArrowLeft size={18} /> Back to Worker Database
        </button>
        <div className="card p-8 text-center border-red-500/30">
          <Shield size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-cream-100 mb-2">{error || 'Team member not found'}</h2>
          <p className="text-cream-400 mb-6">The team member record might have been deleted or doesn't exist.</p>
        </div>
      </div>
    );
  }

  const isActive = worker.status === 'Active';

  return (
    <div className="page-container animate-fade-in relative pb-20">
      <div className="page-header mb-6 flex flex-wrap items-center justify-between gap-4">
        <button onClick={() => navigate('/workers')} className="btn-ghost flex items-center gap-2 text-xs">
          <ArrowLeft size={16} /> Back to Worker Database
        </button>
        
        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <a href={`tel:${worker.mobile}`} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
            <Phone size={14} /> Call Member
          </a>
          
          {/* Professional Activate / Deactivate Action Button */}
          {isActive ? (
            <button
              onClick={() => setShowStatusModal(true)}
              className="btn-secondary text-xs flex items-center gap-1.5 text-red-400 border-red-500/40 hover:bg-red-500/10 py-1.5 px-3"
            >
              <UserX size={15} /> Deactivate Workforce ID
            </button>
          ) : (
            <button
              onClick={() => setShowStatusModal(true)}
              className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-3"
            >
              <UserCheck size={15} /> Activate Workforce ID
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Section */}
      <div className="card mb-8 p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gold-gradient flex items-center justify-center text-dark-900 text-4xl font-extrabold uppercase shadow-lg border-4 border-dark-900 ring-2 ring-gold-500/50">
            {getInitials(worker.name)}
          </div>
          
          <div className="flex-1 text-center md:text-left pt-1 space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-cream-100">{worker.name}</h1>
              
              {/* Professional Status Badge */}
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active Workforce ID
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-red-400 border border-red-700/60">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Deactivated ID
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-cream-300 text-xs">
              <span className="flex items-center gap-1.5 bg-dark-600 px-3 py-1.5 rounded-md border border-dark-500">
                <Shield size={14} className="text-gold-500" /> 
                <span className="text-cream-400">ID:</span> <strong className="text-cream-100 font-mono">{worker.workerId}</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-dark-600 px-3 py-1.5 rounded-md border border-dark-500">
                <MapPin size={14} className="text-gold-500" /> 
                {worker.area || 'Coimbatore Area'}
              </span>
              <span className="flex items-center gap-1.5 bg-dark-600 px-3 py-1.5 rounded-md border border-dark-500">
                <Briefcase size={14} className="text-gold-500" /> 
                {jobs.length} Total Assignments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Personal Details */}
        <div className="card p-5 h-full">
          <h3 className="section-title mb-5 flex items-center gap-2 border-b border-dark-600 pb-3">
            <User size={18} className="text-gold-500" /> Personal Details
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400 flex items-center gap-2"><Phone size={14}/> Mobile</span>
              <span className="text-cream-100 font-medium">{worker.mobile}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400 flex items-center gap-2"><Shield size={14}/> Aadhaar</span>
              <span className="text-cream-100 font-medium">{maskAadhaar(worker.aadhaar)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400 flex items-center gap-2"><Droplets size={14}/> Blood Group</span>
              <span className="text-cream-100 font-medium">{worker.bloodGroup || '-'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400 flex items-center gap-2"><Calendar size={14}/> Joined Date</span>
              <span className="text-cream-100 font-medium">{formatDate(worker.dateOfJoining)}</span>
            </div>
            
            {worker.emergencyContact && (
              <div className="pt-2 bg-dark-600/30 p-3 rounded-lg border border-dark-500">
                <p className="text-cream-400 flex items-center gap-2 mb-2"><Heart size={14} className="text-red-400"/> Emergency Contact</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <span className="text-xs text-cream-500 block">Name</span>
                    <span className="text-cream-200">{worker.emergencyContact.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-cream-500 block">Phone</span>
                    <span className="text-cream-200">{worker.emergencyContact.phone || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bank & Payment Details */}
        <div className="card p-5 h-full">
          <h3 className="section-title mb-5 flex items-center gap-2 border-b border-dark-600 pb-3">
            <CreditCard size={18} className="text-gold-500" /> Bank & UPI Information
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400">Account No</span>
              <span className="text-cream-100 font-mono font-medium">{worker.bankDetails?.accountNo || '-'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400">IFSC Code</span>
              <span className="text-cream-100 font-mono font-medium">{worker.bankDetails?.ifsc || '-'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400">Bank Name</span>
              <span className="text-cream-100 font-medium">{worker.bankDetails?.bankName || '-'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400">Branch</span>
              <span className="text-cream-100 font-medium">{worker.bankDetails?.branch || '-'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
              <span className="text-cream-400">UPI ID</span>
              <span className="text-gold-400 font-medium">{worker.upi || '-'}</span>
            </div>
          </div>
        </div>

        {/* Work & ID Status Controls Card */}
        <div className="card p-5 h-full flex flex-col justify-between">
          <div>
            <h3 className="section-title mb-5 flex items-center gap-2 border-b border-dark-600 pb-3">
              <HardHat size={18} className="text-gold-500" /> Work & ID Status Management
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
                <span className="text-cream-400 flex items-center gap-2"><IndianRupee size={14}/> Daily Base Wage</span>
                <span className="text-gold-400 font-bold">{formatCurrency(worker.dailyWage)} / day</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-dark-600/50 pb-2">
                <span className="text-cream-400">ID Status</span>
                {isActive ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 size={14}/> Active</span>
                ) : (
                  <span className="text-red-400 font-semibold flex items-center gap-1"><X size={14}/> Deactivated</span>
                )}
              </div>

              <div>
                <span className="text-cream-400 text-xs block mb-2">Registered Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {(worker.skills && worker.skills.length > 0) ? (
                    worker.skills.map((skill) => (
                      <span key={skill} className="px-2 py-0.5 rounded text-xs bg-dark-600 text-gold-400 border border-dark-500">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-cream-500 text-xs">No skills listed</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Status Action Button */}
          <div className="mt-6 pt-4 border-t border-dark-600">
            {isActive ? (
              <button
                onClick={() => setShowStatusModal(true)}
                className="w-full btn-secondary py-2 text-xs flex items-center justify-center gap-2 text-red-400 border-red-500/40 hover:bg-red-500/10"
              >
                <UserX size={16} /> Deactivate Workforce ID
              </button>
            ) : (
              <button
                onClick={() => setShowStatusModal(true)}
                className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <UserCheck size={16} /> Activate Workforce ID
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Job Assignment History */}
      <div className="card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-gold-500" /> Assignment History ({jobs.length})
        </h3>
        
        {jobs.length === 0 ? (
          <div className="text-center py-10 bg-dark-600/30 rounded-lg border border-dark-500 border-dashed">
            <Briefcase size={32} className="text-dark-400 mx-auto mb-3" />
            <p className="text-cream-400 text-xs">No job assignments recorded for this team member.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Location</th>
                  <th>Work Type</th>
                  <th>Shift</th>
                  <th className="text-right">Billing Rate</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="text-xs text-cream-300">{formatDate(job.date)}</td>
                    <td className="font-medium text-cream-100 text-xs">{job.clientName}</td>
                    <td className="text-cream-400 text-xs">{job.location}</td>
                    <td>
                      <span className="bg-dark-600 px-2 py-0.5 rounded text-xs border border-dark-500 text-cream-300">
                        {job.workType}
                      </span>
                    </td>
                    <td className="text-xs">{job.shift}</td>
                    <td className="text-right text-gold-400 font-medium text-xs">
                      {formatCurrency(job.rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Professional Activate / Deactivate ID Confirmation Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowStatusModal(false)}>
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100 flex items-center gap-2">
                {isActive ? (
                  <>
                    <AlertTriangle className="text-red-400" size={20} /> Deactivate Workforce ID
                  </>
                ) : (
                  <>
                    <UserCheck className="text-emerald-400" size={20} /> Activate Workforce ID
                  </>
                )}
              </h2>
              <button onClick={() => setShowStatusModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            
            <div className="modal-body space-y-4 text-sm text-cream-300">
              <p>
                You are about to change the active workforce status for <strong className="text-cream-100">{worker.name}</strong> (ID: <code className="text-gold-400 font-mono">{worker.workerId}</code>).
              </p>
              
              {isActive ? (
                <div className="card p-3 border-red-500/40 bg-red-950/20 text-xs text-cream-300 space-y-1">
                  <strong className="text-red-400 block font-semibold">Status Action: Deactivation</strong>
                  <p>Deactivating this ID will set the team member status to <span className="text-red-400 font-semibold">Inactive</span>. Inactive members are excluded from active job dispatch lists.</p>
                </div>
              ) : (
                <div className="card p-3 border-emerald-500/40 bg-emerald-950/20 text-xs text-cream-300 space-y-1">
                  <strong className="text-emerald-400 block font-semibold">Status Action: Activation</strong>
                  <p>Activating this ID will restore the team member status to <span className="text-emerald-400 font-semibold">Active</span>. Active members are available for job dispatches and scheduling.</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowStatusModal(false)} className="btn-ghost text-xs">Cancel</button>
              <button
                onClick={handleConfirmToggleStatus}
                disabled={statusUpdating}
                className={`text-xs py-2 px-4 rounded-lg font-semibold flex items-center gap-2 ${
                  isActive 
                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {statusUpdating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Updating Status...
                  </>
                ) : isActive ? (
                  <>
                    <UserX size={14} /> Confirm Deactivation
                  </>
                ) : (
                  <>
                    <UserCheck size={14} /> Confirm Activation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerProfile;
