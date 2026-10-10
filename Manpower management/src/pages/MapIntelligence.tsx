import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Select from 'react-select';
import { 
  Map as MapIcon, 
  Users, 
  Filter, 
  MapPin, 
  X, 
  RefreshCw, 
  Search, 
  Briefcase, 
  Activity, 
  Compass, 
  Navigation, 
  ExternalLink,
  ChevronDown,
  Sparkles,
  UserCheck,
  MessageSquare,
  Send,
  Copy,
  CheckCheck,
  ChevronUp
} from 'lucide-react';
import { subscribeRegisteredWorkers } from '../firebase/firestore';
import { 
  COIMBATORE_AREAS, 
  getAreaById, 
  getAreaSelectOptions, 
  COIMBATORE_CENTER, 
  COIMBATORE_ZOOM,
  type AreaData 
} from '../data/coimbatoreAreas';
import { 
  WORKER_SKILLS, 
  EXPERIENCE_OPTIONS, 
  AVAILABILITY_OPTIONS, 
  GENDER_OPTIONS, 
  getSkillSelectOptions 
} from '../data/skillsList';
import type { RegisteredWorker } from '../types';

// ─── WhatsApp Message Templates ───
const MESSAGE_TEMPLATES = [
  {
    id: 'job_alert',
    label: '💼 Job Alert',
    template: `🔔 *Job Alert from ManPower CBE*

📍 Location: {{area}}
📅 Date: {{date}}

{{message}}

Reply "YES" to confirm your availability.
Contact: ManPower CBE Team`,
  },
  {
    id: 'duty_call',
    label: '📋 Duty Report',
    template: `📋 *Duty Reporting Notice*

Hi {{name}},
Please report to the below location:

📍 Area: {{area}}
📅 Date: {{date}}
⏰ Time: {{message}}

Bring your ID card. Contact us for any queries.
— ManPower CBE`,
  },
  {
    id: 'payment',
    label: '💰 Payment Update',
    template: `💰 *Payment Update*

Hi {{name}},
{{message}}

📍 Area: {{area}}
📅 Date: {{date}}

Thank you for your service.
— ManPower CBE`,
  },
  {
    id: 'general',
    label: '📢 General Announcement',
    template: `📢 *ManPower CBE — Announcement*

{{message}}

📍 Area: {{area}}
📅 Date: {{date}}

— ManPower CBE Team`,
  },
  {
    id: 'custom',
    label: '✏️ Custom Message',
    template: `{{message}}`,
  },
];

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: '#111827',
    borderColor: state.isFocused ? '#c9a84c' : '#374151',
    boxShadow: state.isFocused ? '0 0 0 1px #c9a84c' : 'none',
    color: '#fdfbf7',
    minHeight: 40,
    borderRadius: '0.5rem',
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#111827',
    border: '1px solid #374151',
    zIndex: 9999,
    borderRadius: '0.5rem',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#c9a84c'
      : state.isFocused
      ? '#1f2937'
      : 'transparent',
    color: state.isSelected ? '#111827' : '#fdfbf7',
    padding: '8px 12px',
    fontSize: '13px',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#fdfbf7',
    fontSize: '13px',
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: '#374151',
    borderRadius: '0.375rem',
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: '#fdfbf7',
    fontSize: '12px',
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: '#fdfbf7',
    '&:hover': {
      backgroundColor: '#ef4444',
      color: 'white',
    },
  }),
  input: (base: any) => ({
    ...base,
    color: '#fdfbf7',
  }),
};

// Official Google Maps Tile Layer (Clean & Minimalist)
const GOOGLE_MAPS_TILES = {
  url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  attribution: '&copy; Google Maps',
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  maxZoom: 21,
};

// Helper: Open Google Maps directions in a new tab
const openDirectionsInGoogleMaps = (lat: number, lng: number, areaName?: string) => {
  const destination = areaName ? `${encodeURIComponent(areaName)}, Coimbatore, Tamil Nadu` : `${lat},${lng}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// Map Controller: Registers map reference and handles smooth flight
function MapController({ 
  center, 
  zoom, 
  onMapReady 
}: { 
  center: [number, number]; 
  zoom: number; 
  onMapReady: (map: any) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
  }, [center, zoom, map]);

  return null;
}

const MapIntelligence: React.FC = () => {
  const [workers, setWorkers] = useState<RegisteredWorker[]>([]);
  const [loading, setLoading] = useState(true);

  // Map Instance Ref
  const mapInstanceRef = useRef<any>(null);

  // Floating Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [selectedSkills, setSelectedSkills] = useState<any[]>([]);
  const [availability, setAvailability] = useState<string>('All');
  const [gender, setGender] = useState<string>('All');
  const [experience, setExperience] = useState<string>('All');

  const [activeAreaDetail, setActiveAreaDetail] = useState<string | null>(null);

  // ─── Messaging State ───
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('job_alert');
  const [messageInput, setMessageInput] = useState('');
  const [sendingIndex, setSendingIndex] = useState(-1);
  const [sentCount, setSentCount] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);

  // Compute map center and zoom level based on area selection
  const { currentCenter, currentZoom } = useMemo(() => {
    if (selectedArea && selectedArea.value && selectedArea.value !== 'all') {
      const area = getAreaById(selectedArea.value);
      if (area) {
        return { currentCenter: [area.latitude, area.longitude] as [number, number], currentZoom: 15 };
      }
    }
    return { currentCenter: COIMBATORE_CENTER, currentZoom: COIMBATORE_ZOOM };
  }, [selectedArea]);

  useEffect(() => {
    const unsubscribe = subscribeRegisteredWorkers((data) => {
      setWorkers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      // Area filter
      if (selectedArea && selectedArea.value !== 'all' && worker.areaId !== selectedArea.value) return false;
      
      // Skills filter
      if (selectedSkills.length > 0) {
        const skillValues = selectedSkills.map(s => s.value);
        if (!worker.skills.some(skill => skillValues.includes(skill))) return false;
      }

      // Availability filter
      if (availability !== 'All') {
        if (availability === 'Available' && worker.availability !== 'Available') return false;
        if (availability === 'Unavailable' && worker.availability !== 'Unavailable') return false;
        if (availability === 'On Job' && worker.availability !== 'On Job') return false;
      }

      // Gender filter
      if (gender !== 'All' && worker.gender !== gender) return false;

      // Experience filter
      if (experience !== 'All' && worker.experience !== experience) return false;

      return true;
    });
  }, [workers, selectedArea, selectedSkills, availability, gender, experience]);

  // Aggregation by Area
  const areaAggregations = useMemo(() => {
    const aggs: Record<string, { total: number, available: number, unavailable: number, onJob: number, skills: Record<string, number>, workers: RegisteredWorker[] }> = {};
    
    filteredWorkers.forEach(worker => {
      if (!aggs[worker.areaId]) {
        aggs[worker.areaId] = { total: 0, available: 0, unavailable: 0, onJob: 0, skills: {}, workers: [] };
      }
      const agg = aggs[worker.areaId];
      agg.total++;
      if (worker.availability === 'Available') agg.available++;
      else if (worker.availability === 'Unavailable') agg.unavailable++;
      else if (worker.availability === 'On Job') agg.onJob++;

      worker.skills.forEach(skill => {
        agg.skills[skill] = (agg.skills[skill] || 0) + 1;
      });
      agg.workers.push(worker);
    });
    return aggs;
  }, [filteredWorkers]);

  // Search Results (also matches aliases like Kavundampalayam → Koundampalayam)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return COIMBATORE_AREAS.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.id.toLowerCase().includes(q) ||
      (a.aliases && a.aliases.some(alias => alias.toLowerCase().includes(q)))
    ).slice(0, 8);
  }, [searchQuery]);

  const handleSelectSearchResult = (area: AreaData) => {
    setSelectedArea({ value: area.id, label: area.name });
    setSearchQuery('');
    setIsSearchFocused(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([area.latitude, area.longitude], 15, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  };

  const handleRecenter = useCallback(() => {
    setSelectedArea(null);
    setSearchQuery('');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(COIMBATORE_CENTER, COIMBATORE_ZOOM, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, []);

  const resetFilters = () => {
    setSelectedArea(null);
    setSelectedSkills([]);
    setAvailability('All');
    setGender('All');
    setExperience('All');
    setSearchQuery('');
    setFiltersOpen(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(COIMBATORE_CENTER, COIMBATORE_ZOOM, { duration: 1.2 });
    }
  };

  const hasActiveFilters = Boolean(
    selectedArea || 
    selectedSkills.length > 0 || 
    availability !== 'All' || 
    gender !== 'All' || 
    experience !== 'All'
  );

  // ─── WhatsApp Message Helpers ───
  const buildMessage = (worker: RegisteredWorker, areaName: string) => {
    const tpl = MESSAGE_TEMPLATES.find(t => t.id === selectedTemplateId) || MESSAGE_TEMPLATES[0];
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return tpl.template
      .replace(/\{\{name\}\}/g, worker.name)
      .replace(/\{\{area\}\}/g, areaName)
      .replace(/\{\{date\}\}/g, today)
      .replace(/\{\{message\}\}/g, messageInput || '—');
  };

  const openWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleSendToWorker = (worker: RegisteredWorker, index: number) => {
    const areaName = getAreaById(activeAreaDetail || '')?.name || 'Coimbatore';
    const msg = buildMessage(worker, areaName);
    openWhatsApp(worker.phone, msg);
    setSendingIndex(index);
    setSentCount(prev => prev + 1);
    setTimeout(() => setSendingIndex(-1), 1500);
  };

  const handleSendToAll = () => {
    if (!activeAreaDetail || !areaAggregations[activeAreaDetail]) return;
    const areaName = getAreaById(activeAreaDetail)?.name || 'Coimbatore';
    const workers = areaAggregations[activeAreaDetail].workers;
    // Open WhatsApp for first worker immediately, rest at 1.5s intervals
    workers.forEach((worker, i) => {
      setTimeout(() => {
        const msg = buildMessage(worker, areaName);
        openWhatsApp(worker.phone, msg);
        setSentCount(i + 1);
      }, i * 1500);
    });
  };

  const handleCopyAllNumbers = () => {
    if (!activeAreaDetail || !areaAggregations[activeAreaDetail]) return;
    const numbers = areaAggregations[activeAreaDetail].workers
      .map(w => `+91${w.phone}`)
      .join(', ');
    navigator.clipboard.writeText(numbers);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const getMessagePreview = () => {
    const tpl = MESSAGE_TEMPLATES.find(t => t.id === selectedTemplateId) || MESSAGE_TEMPLATES[0];
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const areaName = activeAreaDetail ? (getAreaById(activeAreaDetail)?.name || 'Coimbatore') : 'Coimbatore';
    return tpl.template
      .replace(/\{\{name\}\}/g, 'Worker Name')
      .replace(/\{\{area\}\}/g, areaName)
      .replace(/\{\{date\}\}/g, today)
      .replace(/\{\{message\}\}/g, messageInput || '(Your message here)');
  };

  const resetMessagePanel = () => {
    setShowMessagePanel(false);
    setMessageInput('');
    setSentCount(0);
    setSendingIndex(-1);
    setCopiedAll(false);
  };

  const getMarkerColor = (count: number) => {
    if (count < 10) return '#10b981'; // emerald
    if (count < 30) return '#eab308'; // yellow
    if (count < 60) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getMarkerRadius = (count: number) => {
    return Math.min(Math.max(count * 0.6 + 8, 9), 32);
  };

  // KPIs
  const totalFiltered = filteredWorkers.length;
  const availableFiltered = filteredWorkers.filter(w => w.availability === 'Available').length;
  const areasCovered = Object.keys(areaAggregations).length;

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col relative bg-dark-900 overflow-hidden font-sans">
      
      {/* ─── Modern Floating Top Header Bar ─── */}
      <div className="absolute top-3 left-3 right-3 z-[500] pointer-events-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        
        {/* Left: Title & Quick Search Bar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          
          {/* Brand Chip */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-dark-900/95 backdrop-blur-md border border-dark-600 shadow-xl text-cream-100">
            <div className="w-6 h-6 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center">
              <MapIcon className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-wide text-cream-100">Area Intel</span>
          </div>

          {/* Floating Search Input */}
          <div className="relative flex-1 sm:w-80">
            <div className="flex items-center bg-dark-900/95 backdrop-blur-md border border-dark-500 focus-within:border-gold-500 rounded-xl px-3 py-2 shadow-xl transition-all">
              <Search className="w-4 h-4 text-cream-400 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search area (e.g. Chinniyampalayam)..."
                className="w-full bg-transparent border-none outline-none text-cream-100 text-xs sm:text-sm placeholder-cream-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchFocused(false);
                  }}
                  className="text-cream-400 hover:text-cream-100 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Auto-suggestions Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-dark-900/95 backdrop-blur-md border border-dark-500 rounded-xl overflow-hidden shadow-2xl z-50 animate-fade-in">
                {searchResults.map((area) => {
                  const count = areaAggregations[area.id]?.total || 0;
                  return (
                    <div
                      key={area.id}
                      className="flex items-center justify-between px-3.5 py-2.5 hover:bg-dark-800 border-b border-dark-700/50 last:border-b-0 cursor-pointer transition-colors"
                      onClick={() => handleSelectSearchResult(area)}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-cream-100">{area.name}</p>
                          <p className="text-[10px] text-cream-400">Coimbatore</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dark-700 text-cream-200 border border-dark-600">
                          {count} {count === 1 ? 'Worker' : 'Workers'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDirectionsInGoogleMaps(area.latitude, area.longitude, area.name);
                          }}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                          title="Open Google Maps Directions"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border shadow-xl transition-all ${
              filtersOpen || hasActiveFilters
                ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-gold/20'
                : 'bg-dark-900/95 backdrop-blur-md text-cream-200 border-dark-600 hover:border-dark-400 hover:bg-dark-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* Right: Live Stat Badges */}
        <div className="flex items-center gap-2 pointer-events-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/95 backdrop-blur-md border border-dark-600 shadow-xl text-xs whitespace-nowrap">
            <Users className="w-3.5 h-3.5 text-cream-400" />
            <span className="text-cream-400 font-medium">Total:</span>
            <span className="font-bold text-cream-100">{totalFiltered}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/95 backdrop-blur-md border border-dark-600 shadow-xl text-xs whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-cream-400 font-medium">Available:</span>
            <span className="font-bold text-emerald-400">{availableFiltered}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/95 backdrop-blur-md border border-dark-600 shadow-xl text-xs whitespace-nowrap">
            <MapPin className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-cream-400 font-medium">Areas:</span>
            <span className="font-bold text-gold-400">{areasCovered}</span>
          </div>
        </div>
      </div>

      {/* ─── Floating Filter Card Drawer (Non-intrusive) ─── */}
      {filtersOpen && (
        <div className="absolute top-16 left-3 z-[550] w-80 sm:w-96 bg-dark-900/95 backdrop-blur-xl border border-dark-500 rounded-2xl p-4 shadow-2xl animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-dark-700 pb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gold-400" />
              <h3 className="font-bold text-sm text-cream-100">Filter Workers</h3>
            </div>
            <button 
              onClick={() => setFiltersOpen(false)}
              className="p-1 text-cream-400 hover:text-cream-100 rounded-lg hover:bg-dark-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Area Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-cream-400 uppercase tracking-wider">Locality</label>
            <Select
              styles={selectStyles}
              options={[{ value: 'all', label: 'All Coimbatore Areas' }, ...getAreaSelectOptions()]}
              value={selectedArea}
              onChange={setSelectedArea}
              placeholder="All Areas..."
              isClearable
            />
          </div>

          {/* Work / Skill Roles */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-cream-400 uppercase tracking-wider">Work Roles</label>
            <Select
              isMulti
              styles={selectStyles}
              options={getSkillSelectOptions()}
              value={selectedSkills}
              onChange={(val) => setSelectedSkills(val as any[])}
              placeholder="Select work types..."
            />
          </div>

          {/* Availability */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-cream-400 uppercase tracking-wider">Availability</label>
            <div className="grid grid-cols-2 gap-1.5">
              {['All', 'Available', 'Unavailable', 'On Job'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAvailability(status)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    availability === status
                      ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-sm'
                      : 'bg-dark-800 text-cream-300 border-dark-600 hover:border-dark-400'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-cream-400 uppercase tracking-wider">Gender</label>
            <div className="flex gap-1.5">
              {['All', 'Male', 'Female'].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    gender === g
                      ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-sm'
                      : 'bg-dark-800 text-cream-300 border-dark-600 hover:border-dark-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-dark-700 flex items-center justify-between">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>

            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="btn-primary py-1.5 px-4 text-xs font-bold rounded-lg shadow-gold"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* ─── Full-Canvas Google Maps Container ─── */}
      <div className="flex-1 w-full h-full relative z-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900/50 backdrop-blur z-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500" />
          </div>
        )}

        <MapContainer 
          center={COIMBATORE_CENTER} 
          zoom={COIMBATORE_ZOOM} 
          className="w-full h-full"
          zoomControl={false}
        >
          <MapController 
            center={currentCenter} 
            zoom={currentZoom} 
            onMapReady={(map) => {
              mapInstanceRef.current = map;
            }} 
          />

          <TileLayer
            attribution={GOOGLE_MAPS_TILES.attribution}
            url={GOOGLE_MAPS_TILES.url}
            subdomains={GOOGLE_MAPS_TILES.subdomains}
            maxZoom={GOOGLE_MAPS_TILES.maxZoom}
          />
          
          {/* Clean Map Tooltip & Popup Styles */}
          <style>
            {`
              .leaflet-container {
                background: #e5e3df;
                font-family: inherit;
              }
              .leaflet-popup-content-wrapper {
                background: #111827;
                color: #f8fafc;
                border: 1px solid #374151;
                border-radius: 1rem;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                padding: 4px;
              }
              .leaflet-popup-tip {
                background: #111827;
                border: 1px solid #374151;
              }
              .leaflet-popup-close-button {
                color: #9ca3af !important;
                padding: 8px !important;
              }
              .leaflet-tooltip {
                background: #111827;
                color: #f8fafc;
                border: 1px solid #374151;
                border-radius: 0.5rem;
                padding: 4px 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
              }
              .leaflet-tooltip-top:before {
                border-top-color: #111827;
              }
            `}
          </style>

          {Object.entries(areaAggregations).map(([areaId, data]) => {
            const area = getAreaById(areaId);
            if (!area) return null;
            return (
              <CircleMarker
                key={areaId}
                center={[area.latitude, area.longitude]}
                radius={getMarkerRadius(data.total)}
                pathOptions={{ 
                  color: getMarkerColor(data.total),
                  fillColor: getMarkerColor(data.total),
                  fillOpacity: 0.75,
                  weight: 2
                }}
                eventHandlers={{
                  click: () => setActiveAreaDetail(areaId)
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div className="text-xs font-semibold">
                    <span className="text-amber-400 font-bold">{area.name}</span>
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-dark-800 text-cream-100 text-[10px]">
                      {data.total} {data.total === 1 ? 'worker' : 'workers'}
                    </span>
                  </div>
                </Tooltip>

                <Popup className="custom-popup">
                  <div className="p-2 min-w-[220px]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-base text-gold-400">{area.name}</h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-dark-800 text-cream-100 border border-dark-600">
                        {data.total} Total
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-dark-800 p-2 rounded-lg border border-dark-700">
                      <div>
                        <span className="text-cream-400 block text-[10px]">Available</span>
                        <span className="font-bold text-emerald-400">{data.available}</span>
                      </div>
                      <div>
                        <span className="text-cream-400 block text-[10px]">On Job / Other</span>
                        <span className="font-bold text-blue-400">{data.onJob + data.unavailable}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5">
                      <button 
                        type="button"
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirectionsInGoogleMaps(area.latitude, area.longitude, area.name);
                        }}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Get Directions (Google Maps)</span>
                      </button>

                      <button 
                        type="button"
                        className="w-full text-center text-gold-400 hover:text-gold-300 text-xs font-semibold py-1.5 rounded-lg hover:bg-dark-800 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAreaDetail(areaId);
                        }}
                      >
                        View Workers in {area.name} &rarr;
                      </button>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* ─── Floating Recenter Map Button (Bottom-Right) ─── */}
        <div className="absolute bottom-6 right-6 z-[500] pointer-events-auto">
          <button
            type="button"
            onClick={handleRecenter}
            className="bg-dark-900/95 hover:bg-dark-800 text-cream-100 hover:text-gold-400 border border-dark-500 rounded-2xl px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-2xl transition-all hover:scale-105"
            title="Reset View to Coimbatore Center"
          >
            <Compass className="w-4 h-4 text-gold-400" />
            <span>Recenter Map</span>
          </button>
        </div>
      </div>

      {/* ─── Area Detail Slide-Over Drawer ─── */}
      {activeAreaDetail && areaAggregations[activeAreaDetail] && (
        <div className="fixed inset-0 z-[1000] overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
            onClick={() => setActiveAreaDetail(null)} 
          />
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-dark-900 border-l border-dark-600 shadow-2xl pointer-events-auto flex flex-col transform transition-transform duration-300 ease-in-out">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-700 bg-dark-800">
              <div>
                <h2 className="text-xl font-extrabold text-cream-100">
                  {getAreaById(activeAreaDetail)?.name}
                </h2>
                <p className="text-cream-400 text-xs mt-0.5">Locality Workforce Overview</p>
              </div>
              <button 
                onClick={() => setActiveAreaDetail(null)}
                className="p-2 text-cream-400 hover:text-cream-100 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Quick Action Buttons Row */}
              <div className="grid grid-cols-2 gap-2.5">
                {getAreaById(activeAreaDetail) && (
                  <button
                    type="button"
                    onClick={() => {
                      const a = getAreaById(activeAreaDetail);
                      if (a) openDirectionsInGoogleMaps(a.latitude, a.longitude, a.name);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Directions</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowMessagePanel(!showMessagePanel);
                    setSentCount(0);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all ${
                    showMessagePanel
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send WhatsApp</span>
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                  <p className="text-cream-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Workers</p>
                  <p className="text-2xl font-black text-cream-100">{areaAggregations[activeAreaDetail].total}</p>
                </div>
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                  <p className="text-cream-400 text-xs font-semibold uppercase tracking-wider mb-1">Available Now</p>
                  <p className="text-2xl font-black text-emerald-400">{areaAggregations[activeAreaDetail].available}</p>
                </div>
              </div>

              {/* ════════════ WhatsApp MESSAGE BROADCAST PANEL ════════════ */}
              {showMessagePanel && (
                <div className="bg-dark-800 rounded-2xl border border-emerald-500/30 overflow-hidden animate-fade-in shadow-xl">
                  
                  {/* Panel Header */}
                  <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white">
                        WhatsApp Broadcast to {getAreaById(activeAreaDetail)?.name}
                      </span>
                    </div>
                    <button
                      onClick={resetMessagePanel}
                      className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    
                    {/* Step 1: Template Selection */}
                    <div>
                      <label className="text-[11px] font-bold text-cream-300 uppercase tracking-wider block mb-2">
                        Step 1: Choose Message Template
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {MESSAGE_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(tpl.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              selectedTemplateId === tpl.id
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                                : 'bg-dark-900 text-cream-300 border-dark-600 hover:border-emerald-500/50'
                            }`}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Your Message Content */}
                    <div>
                      <label className="text-[11px] font-bold text-cream-300 uppercase tracking-wider block mb-2">
                        Step 2: Type Your Message / Details
                      </label>
                      <textarea
                        rows={3}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={
                          selectedTemplateId === 'job_alert'
                            ? 'e.g. 10 helpers needed at XYZ Factory, ₹600/day, 8AM - 6PM shift'
                            : selectedTemplateId === 'duty_call'
                            ? 'e.g. 7:00 AM - Report to ABC Site, Gate 2'
                            : selectedTemplateId === 'payment'
                            ? 'e.g. Your payment of ₹3,600 has been processed via UPI'
                            : 'Type your message here...'
                        }
                        className="w-full px-3 py-2.5 bg-dark-900 border border-dark-600 focus:border-emerald-500 rounded-xl text-xs text-cream-100 placeholder-cream-400 outline-none resize-none transition-colors"
                      />
                    </div>

                    {/* Live Message Preview */}
                    <div>
                      <label className="text-[11px] font-bold text-cream-300 uppercase tracking-wider block mb-2">
                        Preview (How it appears on WhatsApp)
                      </label>
                      <div className="bg-[#e5ddd5] p-3 rounded-xl text-dark-900 text-xs leading-relaxed font-sans whitespace-pre-wrap max-h-36 overflow-y-auto shadow-inner">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          {getMessagePreview()}
                        </div>
                      </div>
                    </div>

                    {/* Copy All Numbers */}
                    <button
                      type="button"
                      onClick={handleCopyAllNumbers}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-dark-700 hover:bg-dark-600 text-cream-200 text-xs font-semibold border border-dark-600 transition-colors"
                    >
                      {copiedAll ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied {areaAggregations[activeAreaDetail].total} Phone Numbers!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy All Phone Numbers ({areaAggregations[activeAreaDetail].total})</span>
                        </>
                      )}
                    </button>

                    {/* Send to All Button */}
                    <button
                      type="button"
                      onClick={handleSendToAll}
                      disabled={!messageInput.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {sentCount > 0
                          ? `Sent to ${sentCount} of ${areaAggregations[activeAreaDetail].total} workers...`
                          : `Send to All ${areaAggregations[activeAreaDetail].total} Workers via WhatsApp`
                        }
                      </span>
                    </button>

                    {sentCount > 0 && sentCount >= areaAggregations[activeAreaDetail].total && (
                      <div className="text-center text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 animate-fade-in">
                        <CheckCheck className="w-4 h-4" />
                        <span>All messages sent successfully!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Roles Breakdown */}
              <div>
                <h3 className="text-sm font-bold text-cream-100 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-gold-400" />
                  <span>Work Roles in this Area</span>
                </h3>
                <div className="space-y-2">
                  {Object.entries(areaAggregations[activeAreaDetail].skills)
                    .sort(([,a], [,b]) => b - a)
                    .map(([skillId, count]) => {
                      const skillObj = WORKER_SKILLS.find(s => s.id === skillId);
                      const skillName = skillObj?.name || skillId;
                      const percentage = Math.round((count / areaAggregations[activeAreaDetail!].total) * 100);
                      return (
                        <div key={skillId} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-cream-200 font-medium">{skillName}</span>
                            <span className="text-cream-400">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gold-gradient rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Worker List with Individual WhatsApp Send Buttons */}
              <div>
                <h3 className="text-sm font-bold text-cream-100 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold-400" />
                  <span>Workers in {getAreaById(activeAreaDetail)?.name}</span>
                  <span className="ml-auto text-[10px] font-semibold bg-dark-700 px-2 py-0.5 rounded-full text-cream-300 border border-dark-600">
                    {areaAggregations[activeAreaDetail].total}
                  </span>
                </h3>
                <div className="space-y-2">
                  {areaAggregations[activeAreaDetail].workers.map((worker, idx) => (
                    <div key={worker.id} className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-cream-100 truncate">{worker.name}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                            worker.availability === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            worker.availability === 'Unavailable' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {worker.availability}
                          </span>
                        </div>
                        <p className="text-[11px] text-cream-400 mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono">{worker.phone}</span>
                          <span>•</span>
                          <span className="truncate">{(worker.skillNames || worker.skills).slice(0, 2).join(', ')}</span>
                        </p>
                      </div>
                      
                      {/* Individual WhatsApp Send Button */}
                      {showMessagePanel && messageInput.trim() && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToWorker(worker, idx);
                          }}
                          className={`shrink-0 p-2 rounded-xl transition-all ${
                            sendingIndex === idx
                              ? 'bg-emerald-500 text-white scale-110'
                              : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30'
                          }`}
                          title={`Send WhatsApp to ${worker.name}`}
                        >
                          {sendingIndex === idx ? (
                            <CheckCheck className="w-4 h-4" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MapIntelligence;
