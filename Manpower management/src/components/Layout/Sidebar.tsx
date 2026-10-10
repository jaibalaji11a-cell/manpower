import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  HardHat,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Bell,
  Calculator,
  Award,
  Map,
  QrCode,
  BarChart2,
  UserSearch,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/invoices', icon: <FileText size={18} />, label: 'Invoices' },
  { to: '/work-details', icon: <Briefcase size={18} />, label: 'Work Details' },
  { to: '/clients', icon: <Users size={18} />, label: 'Client Database' },
  { to: '/workers', icon: <HardHat size={18} />, label: 'Worker Database' },
  { to: '/payments', icon: <CreditCard size={18} />, label: 'Payment Tracker' },
];

const EXTRA_ITEMS: NavItem[] = [
  { to: '/profit-tracker', icon: <TrendingUp size={18} />, label: 'Profit Tracker', adminOnly: true },
  { to: '/salary-calc', icon: <Calculator size={18} />, label: 'Salary Calculator' },
  { to: '/reminders', icon: <Bell size={18} />, label: 'Payment Reminders' },
  { to: '/commission', icon: <Award size={18} />, label: 'Commission Calc', adminOnly: true },
];

const INTELLIGENCE_ITEMS: NavItem[] = [
  { to: '/map', icon: <Map size={18} />, label: 'Area Map', adminOnly: true },
  { to: '/worker-directory', icon: <UserSearch size={18} />, label: 'Worker Directory', adminOnly: true },
  { to: '/worker-analytics', icon: <BarChart2 size={18} />, label: 'Analytics', adminOnly: true },
  { to: '/qr-manager', icon: <QrCode size={18} />, label: 'QR Registration', adminOnly: true },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleExtras = EXTRA_ITEMS.filter(item => !item.adminOnly || isAdmin);
  const visibleIntelligence = INTELLIGENCE_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-70 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 flex flex-col h-screen bg-dark-800 border-r border-dark-500 transition-all duration-300 md:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-16' : 'md:w-64'} w-64 flex-shrink-0`}
      >
        {/* Toggle Button (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-dark-600 border border-dark-400 rounded-full p-1 z-10 hover:border-gold-600 transition-colors hidden md:block"
        >
          {collapsed ? <ChevronRight size={12} className="text-gold-500" /> : <ChevronLeft size={12} className="text-gold-500" />}
        </button>

        {/* Close Button (mobile only) */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="absolute right-4 top-4 text-cream-500 hover:text-gold-500 md:hidden"
          >
            <ChevronLeft size={24} />
          </button>
        )}

      {/* Logo / Brand */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-dark-500 ${collapsed ? 'justify-center' : ''}`}>
        <img src="/logo.png" alt="MAN POWER Logo" className="w-10 h-10 object-contain rounded-md" />
        {!collapsed && (
          <div>
            <div className="text-gold-400 font-bold text-sm font-heading leading-tight tracking-wider">MAN POWER</div>
            <div className="text-cream-500 text-xs tracking-widest">COIMBATORE</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onMobileClose}
            className={({ isActive }) =>
              isActive
                ? `sidebar-item-active ${collapsed ? 'justify-center px-2' : ''}`
                : `sidebar-item ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Extras section */}
        {visibleExtras.length > 0 && (
          <>
            <div className="gold-divider" />
            {!collapsed && (
              <div className="px-4 pb-1">
                <span className="text-xs text-cream-500 uppercase tracking-wider">Extras</span>
              </div>
            )}
            {visibleExtras.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  isActive
                    ? `sidebar-item-active ${collapsed ? 'justify-center px-2' : ''}`
                    : `sidebar-item ${collapsed ? 'justify-center px-2' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}

        {/* Worker Intelligence section */}
        {visibleIntelligence.length > 0 && (
          <>
            <div className="gold-divider" />
            {!collapsed && (
              <div className="px-4 pb-1">
                <span className="text-xs text-gold-500 uppercase tracking-wider font-semibold">⚡ Worker Intel</span>
              </div>
            )}
            {visibleIntelligence.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  isActive
                    ? `sidebar-item-active ${collapsed ? 'justify-center px-2' : ''}`
                    : `sidebar-item ${collapsed ? 'justify-center px-2' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-dark-500 py-3 px-2 space-y-1">
        <NavLink
          to="/settings"
          onClick={onMobileClose}
          className={({ isActive }) =>
            isActive
              ? `sidebar-item-active ${collapsed ? 'justify-center px-2' : ''}`
              : `sidebar-item ${collapsed ? 'justify-center px-2' : ''}`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {!collapsed && user && (
          <div 
            onClick={() => {
              if (onMobileClose) onMobileClose();
              navigate('/settings?tab=profile');
            }}
            className="px-4 py-2.5 hover:bg-dark-700 rounded-xl cursor-pointer transition-all border border-transparent hover:border-dark-400 group"
            title="Open My Profile & Settings"
          >
            <div className="text-xs text-cream-100 font-bold truncate flex items-center justify-between group-hover:text-gold-400">
              <span>{user.displayName}</span>
              <span className="text-[10px] text-gold-500 font-normal opacity-80">View</span>
            </div>
            <div className="text-xs text-cream-500 truncate mt-0.5">{user.email}</div>
            <span className={`mt-1 inline-block ${user.role === 'Admin' ? 'badge-paid' : 'badge-inactive'} text-[10px] py-0.5 px-2`}>
              {user.role}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-950 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  </>
  );
};

export default Sidebar;
