import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, User, Settings, Users, LogOut, ChevronDown, KeyRound, Shield, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopBarProps {
  onToggleMenu: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Business performance at a glance' },
  '/invoices': { title: 'Invoice Generator', subtitle: 'Create and manage invoices' },
  '/invoices/new': { title: 'New Invoice', subtitle: 'Create a professional invoice' },
  '/work-details': { title: 'Work Details', subtitle: 'Daily job log and tracking' },
  '/clients': { title: 'Client Database', subtitle: 'Manage your client relationships' },
  '/workers': { title: 'Worker Database', subtitle: 'Manage your workforce' },
  '/payments': { title: 'Payment Tracker', subtitle: 'Track invoices and collections' },
  '/profit-tracker': { title: 'Profit Tracker', subtitle: 'Revenue vs expenses analysis' },
  '/salary-calc': { title: 'Salary Calculator', subtitle: 'Worker earnings and payslips' },
  '/reminders': { title: 'Payment Reminders', subtitle: 'Overdue invoice alerts' },
  '/commission': { title: 'Commission Calculator', subtitle: 'Coordinator commission reports' },
  '/settings': { title: 'Settings', subtitle: 'Business profile and preferences' },
};

const TopBar: React.FC<TopBarProps> = ({ onToggleMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'ManPower CBE', subtitle: '' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/login');
  };

  const navigateToTab = (tab: string) => {
    setShowProfileMenu(false);
    navigate(`/settings?tab=${tab}`);
  };

  return (
    <div className="h-16 bg-dark-800 border-b border-dark-500 flex items-center justify-between px-4 md:px-6 flex-shrink-0 relative z-30">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleMenu}
          className="btn-icon p-1.5 md:hidden text-cream-400 hover:text-gold-500"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-cream-100 font-heading leading-tight truncate max-w-[200px] sm:max-w-none">
            {pageInfo.title}
          </h1>
          {pageInfo.subtitle && (
            <p className="text-xs text-cream-500 hidden sm:block">{pageInfo.subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-cream-500 hidden md:block">{dateStr}</span>

        {/* Notification bell */}
        <button 
          onClick={() => navigate('/reminders')}
          className="btn-icon relative text-cream-400 hover:text-gold-400"
          title="Notifications & Payment Reminders"
        >
          <Bell size={16} />
        </button>

        {/* Interactive Top Right User Profile Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowProfileMenu(prev => !prev);
            }}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-dark-700 transition-colors focus:outline-none ring-1 ring-gold-500/30 hover:ring-gold-500/60 cursor-pointer"
            title="My Profile & Settings"
          >
            <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0 shadow-gold">
              <span className="text-dark-900 text-xs font-bold font-heading">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden sm:flex flex-col text-left mr-1">
              <span className="text-xs font-bold text-cream-100 leading-none">{user?.displayName || 'User'}</span>
              <span className="text-[10px] text-gold-400 leading-none mt-0.5">{user?.role || 'Operator'}</span>
            </div>
            <ChevronDown size={14} className="text-cream-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-dark-700 border border-dark-400 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
              {/* User Header */}
              <div className="px-4 py-3 border-b border-dark-500 bg-dark-800/50">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center font-bold text-dark-900 text-sm">
                    {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-bold text-cream-100 truncate">{user?.displayName}</div>
                    <div className="text-xs text-cream-400 truncate">{user?.email}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${user?.role === 'Admin' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-dark-500 text-cream-300'}`}>
                    {user?.role || 'Operator'} Account
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={10} /> Active
                  </span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1">
                <button
                  onClick={() => { setShowProfileMenu(false); setShowProfileModal(true); }}
                  className="w-full text-left px-4 py-2 text-xs text-cream-200 hover:bg-dark-600 hover:text-gold-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <User size={14} className="text-gold-500" /> My Profile Card
                </button>
                <button
                  onClick={() => navigateToTab('profile')}
                  className="w-full text-left px-4 py-2 text-xs text-cream-200 hover:bg-dark-600 hover:text-gold-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Settings size={14} className="text-gold-500" /> Business Profile & Settings
                </button>
                <button
                  onClick={() => navigateToTab('users')}
                  className="w-full text-left px-4 py-2 text-xs text-cream-200 hover:bg-dark-600 hover:text-gold-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Users size={14} className="text-gold-500" /> Team Member Management
                </button>
                <button
                  onClick={() => navigateToTab('users')}
                  className="w-full text-left px-4 py-2 text-xs text-cream-200 hover:bg-dark-600 hover:text-gold-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <KeyRound size={14} className="text-gold-500" /> Security & Password
                </button>
              </div>

              {/* Sign Out */}
              <div className="pt-1 border-t border-dark-500">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-950/40 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                >
                  <LogOut size={14} /> Sign Out / Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Profile Quick Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowProfileModal(false)}>
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-cream-100 flex items-center gap-2">
                <User size={18} className="text-gold-400" /> My Profile Card
              </h2>
              <button onClick={() => setShowProfileModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            
            <div className="modal-body space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-700 border border-dark-500">
                <div className="w-14 h-14 rounded-full bg-gold-gradient flex items-center justify-center font-extrabold text-dark-900 text-2xl shadow-gold">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-cream-100">{user?.displayName}</h3>
                  <p className="text-xs text-cream-400">{user?.email}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/40">
                    {user?.role || 'Operator'} Account
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-cream-300">
                <div className="flex justify-between p-2.5 rounded-lg bg-dark-800 border border-dark-600">
                  <span className="text-cream-400">Account Role</span>
                  <strong className="text-gold-400">{user?.role}</strong>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-dark-800 border border-dark-600">
                  <span className="text-cream-400">Account Status</span>
                  <strong className="text-emerald-400 flex items-center gap-1"><CheckCircle size={12}/> Active & Verified</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer flex gap-2">
              <button
                onClick={() => { setShowProfileModal(false); navigate('/settings?tab=users'); }}
                className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <KeyRound size={14} /> Change Password
              </button>
              <button
                onClick={() => { setShowProfileModal(false); navigate('/settings?tab=profile'); }}
                className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <Settings size={14} /> Edit Profile Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;
