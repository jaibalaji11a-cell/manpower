import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeSettings } from '../firebase/firestore';
import type { BusinessSettings } from '../types';

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'MAN POWER CBE',
  tagline: 'Workforce On Demand — Coimbatore',
  email: 'manpowerofcbe@gmail.com',
  phone: '',
  address: 'Coimbatore, Tamil Nadu',
  logoUrl: '',
  bankDetails: {
    accountName: 'MAN POWER',
    accountNo: '',
    ifsc: '',
    bankName: '',
    branch: '',
    upiId: '',
  },
  defaultGstPercent: 0,
  invoiceCounter: {},
  extras: {
    gstMode: false,
    whatsappShare: true,
    profitTracker: true,
    workerSalaryCalc: true,
    reminderTracker: true,
    coordinatorCommission: true,
  },
};

interface SettingsContextType {
  settings: BusinessSettings;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeSettings((s) => {
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
