import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon, Upload, Save, Eye, EyeOff, User,
  CreditCard, Building2, Zap, Bell, Calculator, Award, TrendingUp, X,
  Plus, Trash2, CheckCircle, UserCheck, UserX, ShieldCheck,
} from 'lucide-react';
import { getSettings, updateSettings } from '../firebase/firestore';
import { createUserWithEmailAndPassword, updatePassword, updateEmail, signOut } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { auth, secondaryAuth, db } from '../firebase/config';
import type { BusinessSettings, AppUser, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const Settings: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<BusinessSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoSuccess, setLogoSuccess] = useState(false);
  const initialTab = (searchParams.get('tab') as any) || 'profile';
  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'extras' | 'users'>(initialTab);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'bank', 'extras', 'users'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // User management
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Operator');
  const [newUserName, setNewUserName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState('');

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    setChangingPassword(true);
    setPasswordStatus(null);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
        setNewPassword('');
      } else {
        throw new Error("No user currently logged in.");
      }
    } catch (err: any) {
      setPasswordStatus({ type: 'error', message: err.message || 'Failed to update password. Try logging out and logging back in first.' });
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({
        uid: d.id,
        status: 'Active', // default fallback
        ...d.data(),
      } as AppUser)));
    } catch (err) {
      console.error("Failed to load team members:", err);
    }
  };

  // Compress image to base64 using canvas (max 300x300, quality 0.85)
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 300;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas context failed')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = ev.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    setLogoSuccess(false);

    if (!file.type.startsWith('image/')) {
      setLogoError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setLogoUploading(true);
    try {
      const compressedDataUrl = await compressImage(file);
      setForm(prev => ({ ...prev, logoUrl: compressedDataUrl }));
      await updateSettings({ logoUrl: compressedDataUrl });
      setLogoSuccess(true);
      setTimeout(() => setLogoSuccess(false), 3000);
    } catch (err: any) {
      setLogoError('Failed to process image: ' + (err.message || 'Unknown error'));
    } finally {
      setLogoUploading(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) return;
    setCreatingUser(true);
    setUserError('');
    try {
      // Use secondaryAuth so creating user does NOT alter active Admin session
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      const newUser: AppUser = {
        uid: cred.user.uid,
        email: newUserEmail,
        displayName: newUserName,
        role: newUserRole,
        status: 'Active',
      };
      await setDoc(doc(db, 'users', cred.user.uid), newUser);
      await signOut(secondaryAuth);
      setUsers(u => [...u, newUser]);
      setNewUserEmail(''); setNewUserPassword(''); setNewUserName('');
      alert(`User ID created successfully for ${newUserName} (${newUserRole})!`);
    } catch (err: any) {
      setUserError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: <Building2 size={15} /> },
    { id: 'bank', label: 'Bank & Payment', icon: <CreditCard size={15} /> },
    { id: 'extras', label: 'Extra Modules', icon: <Zap size={15} /> },
    { id: 'users', label: 'User Management', icon: <User size={15} /> },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Business profile and preferences</p>
        </div>
        {isAdmin && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saved ? <CheckCircle size={15} /> : <Save size={15} />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div className="flex gap-1 bg-dark-700 p-1 rounded-xl border border-dark-400 mb-6 w-full sm:w-fit overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-gold-gradient text-dark-900' : 'text-cream-400 hover:text-cream-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl">
          {/* Business Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="card p-5">
                <div className="section-title">Logo</div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-dark-400 overflow-hidden flex items-center justify-center bg-dark-600">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gold-gradient flex items-center justify-center">
                        <span className="text-dark-900 font-bold text-xl font-heading">MP</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => logoRef.current?.click()}
                      disabled={logoUploading}
                      className="btn-secondary flex items-center gap-2 text-sm"
                    >
                      <Upload size={14} /> {logoUploading ? 'Uploading...' : 'Upload Logo'}
                    </button>
                    <p className="text-xs text-cream-500 mt-1">PNG, JPG — max 2MB</p>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    {logoSuccess && (
                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle size={12} /> Logo saved successfully!
                      </p>
                    )}
                    {logoError && (
                      <p className="text-xs text-red-400 mt-1">{logoError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="card p-5 space-y-4">
                <div className="section-title">Business Info</div>
                <div>
                  <label className="label">Business Name</label>
                  <input className="input" value={form.businessName || ''} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="MAN POWER CBE" />
                </div>
                <div>
                  <label className="label">Tagline</label>
                  <input className="input" value={form.tagline || ''} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Workforce On Demand — Coimbatore" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Contact number" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="manpowerofcbe@gmail.com" />
                  </div>
                </div>
                <div>
                  <label className="label">Address</label>
                  <textarea className="input min-h-[70px] resize-none" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Business address" />
                </div>
              </div>
            </div>
          )}

          {/* Bank & Payment Tab */}
          {activeTab === 'bank' && (
            <div className="card p-5 space-y-4">
              <div className="section-title">Bank Account Details</div>
              <div>
                <label className="label">Account Holder Name</label>
                <input className="input" value={form.bankDetails?.accountName || ''} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, accountName: e.target.value } }))} placeholder="Account name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Account Number</label>
                  <input className="input" value={form.bankDetails?.accountNo || ''} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, accountNo: e.target.value } }))} placeholder="Account number" />
                </div>
                <div>
                  <label className="label">IFSC Code</label>
                  <input className="input" value={form.bankDetails?.ifsc || ''} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, ifsc: e.target.value.toUpperCase() } }))} placeholder="SBIN0001234" />
                </div>
                <div>
                  <label className="label">Bank Name</label>
                  <input className="input" value={form.bankDetails?.bankName || ''} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, bankName: e.target.value } }))} placeholder="State Bank of India" />
                </div>
                <div>
                  <label className="label">Branch</label>
                  <input className="input" value={form.bankDetails?.branch || ''} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, branch: e.target.value } }))} placeholder="Branch name" />
                </div>
              </div>
              <div>
                <label className="label">UPI ID</label>
                <input className="input" value={form.bankDetails?.upiId || ''} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, upiId: e.target.value } }))} placeholder="manpower@upi" />
              </div>
              <div>
                <label className="label">Default GST Percentage</label>
                <select className="select" value={form.defaultGstPercent || 0} onChange={e => setForm(f => ({ ...f, defaultGstPercent: parseFloat(e.target.value) }))}>
                  <option value={0}>0% (GST Disabled by default)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                </select>
              </div>
            </div>
          )}

          {/* Extras Tab */}
          {activeTab === 'extras' && (
            <div className="card p-5">
              <div className="section-title">Extra Module Toggles</div>
              <p className="text-xs text-cream-500 mb-4">Enable or disable additional modules. They will appear in the sidebar when enabled.</p>
              <div className="space-y-3">
                {[
                  { key: 'gstMode', label: 'GST Mode', desc: 'Enable GST fields on invoices (CGST/SGST)', icon: <CreditCard size={15} /> },
                  { key: 'whatsappShare', label: 'WhatsApp Share', desc: 'Share invoices and reminders via WhatsApp', icon: <Bell size={15} /> },
                  { key: 'profitTracker', label: 'Profit Tracker', desc: 'Revenue minus expenses — monthly profit view', icon: <TrendingUp size={15} /> },
                  { key: 'workerSalaryCalc', label: 'Worker Salary Calculator', desc: 'Calculate worker earnings and generate payslips', icon: <Calculator size={15} /> },
                  { key: 'reminderTracker', label: 'Payment Reminder Tracker', desc: 'Auto-flag overdue invoices and queue WhatsApp reminders', icon: <Bell size={15} /> },
                  { key: 'coordinatorCommission', label: 'Coordinator Commission', desc: 'Track and compute coordinator commissions per job', icon: <Award size={15} /> },
                ].map(extra => (
                  <div key={extra.key} className="flex items-center justify-between p-3 rounded-lg border border-dark-400 hover:border-dark-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-gold-600 mt-0.5">{extra.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-cream-100">{extra.label}</div>
                        <div className="text-xs text-cream-500">{extra.desc}</div>
                      </div>
                    </div>
                    <div
                      onClick={() => isAdmin && setForm(f => ({ ...f, extras: { ...f.extras, [extra.key]: !f.extras?.[extra.key as keyof typeof f.extras] } }))}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                        form.extras?.[extra.key as keyof typeof form.extras] ? 'bg-gold-600' : 'bg-dark-400'
                      } ${isAdmin ? 'cursor-pointer' : 'opacity-50'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        form.extras?.[extra.key as keyof typeof form.extras] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              {/* Change My Password */}
              <div className="card p-5 space-y-4">
                <div className="section-title">Change My Password</div>
                {passwordStatus && (
                  <div className={`text-sm px-4 py-3 rounded-lg border ${
                    passwordStatus.type === 'success' 
                      ? 'bg-green-950 border-green-800 text-green-300' 
                      : 'bg-red-950 border-red-800 text-red-300'
                  }`}>
                    {passwordStatus.message}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="label">New Password</label>
                    <input 
                      type="password" 
                      className="input" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="Min 6 characters" 
                    />
                  </div>
                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !newPassword}
                    className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto h-[42px]"
                  >
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>

              {/* Team Members List */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="section-title mb-0">Team Members ({users.length})</div>
                  <span className="text-xs text-cream-500">Staff & Admin Accounts</span>
                </div>
                
                {users.length === 0 ? (
                  <div className="text-center py-6 text-cream-500 text-xs">No team member accounts found.</div>
                ) : (
                  <div className="space-y-3">
                    {users.map(u => {
                      const userIsActive = u.status !== 'Inactive';
                      return (
                        <div key={u.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-dark-400 bg-dark-800/60 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0 shadow-gold">
                              <span className="text-dark-900 font-extrabold text-sm">{u.displayName?.charAt(0).toUpperCase() || 'U'}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-cream-100">{u.displayName}</span>
                                <span className={u.role === 'Admin' ? 'badge-paid text-[10px] py-0.5 px-2' : 'badge-inactive text-[10px] py-0.5 px-2'}>
                                  {u.role}
                                </span>
                              </div>
                              <div className="text-xs text-cream-400">{u.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-dark-600">
                            {/* Status Badge */}
                            {userIsActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active Account
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-400 border border-red-700/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                Deactivated Account
                              </span>
                            )}

                            {/* Actions for Non-Admin accounts */}
                            {isAdmin && u.role !== 'Admin' ? (
                              <div className="flex items-center gap-2">
                                {userIsActive ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const updatedUser = { ...u, status: 'Inactive' as const };
                                        await setDoc(doc(db, 'users', u.uid), { status: 'Inactive' }, { merge: true });
                                        setUsers(prev => prev.map(usr => usr.uid === u.uid ? updatedUser : usr));
                                      } catch (err: any) {
                                        alert('Failed to deactivate account: ' + err.message);
                                      }
                                    }}
                                    className="btn-secondary text-xs py-1 px-3 text-red-400 border-red-500/30 hover:bg-red-500/10 flex items-center gap-1 cursor-pointer"
                                    title="Deactivate User ID"
                                  >
                                    <UserX size={13} /> Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const updatedUser = { ...u, status: 'Active' as const };
                                        await setDoc(doc(db, 'users', u.uid), { status: 'Active' }, { merge: true });
                                        setUsers(prev => prev.map(usr => usr.uid === u.uid ? updatedUser : usr));
                                      } catch (err: any) {
                                        alert('Failed to activate account: ' + err.message);
                                      }
                                    }}
                                    className="btn-primary text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer"
                                    title="Activate User ID"
                                  >
                                    <UserCheck size={13} /> Activate
                                  </button>
                                )}

                                {/* Delete Option for Operator/User ID */}
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to delete the user ID for ${u.displayName} (${u.email})?`)) {
                                      try {
                                        await deleteDoc(doc(db, 'users', u.uid));
                                        setUsers(prev => prev.filter(usr => usr.uid !== u.uid));
                                      } catch (err: any) {
                                        alert('Failed to delete user ID: ' + err.message);
                                      }
                                    }
                                  }}
                                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/60 rounded-lg border border-red-500/30 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                                  title="Delete User ID"
                                >
                                  <Trash2 size={13} /> Delete ID
                                </button>
                              </div>
                            ) : u.role === 'Admin' ? (
                              <span className="text-xs text-gold-400 font-semibold px-2 py-1 bg-gold-500/10 rounded-lg border border-gold-500/20">
                                Protected Admin ID
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add User */}
              {isAdmin && (
                <div className="card p-5 space-y-4">
                  <div className="section-title">Add New User ID</div>
                  {userError && (
                    <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">{userError}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Display Name</label>
                      <input className="input" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="label">User Role</label>
                      <select className="select" value={newUserRole} onChange={e => setNewUserRole(e.target.value as UserRole)}>
                        <option value="Operator">Operator</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Coordinator">Coordinator</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input className="input" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@email.com" />
                    </div>
                    <div>
                      <label className="label">Password</label>
                      <input className="input" type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Min 6 characters" />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateUser}
                    disabled={creatingUser || !newUserEmail || !newUserPassword || !newUserName}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus size={15} /> {creatingUser ? 'Creating...' : 'Create User ID'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
