import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { 
  Search, 
  Filter, 
  Users, 
  MapPin, 
  Briefcase, 
  Phone, 
  Eye, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  List, 
  UserCheck, 
  UserX, 
  Clock, 
  Shield, 
  GraduationCap, 
  Building,
  Sparkles
} from 'lucide-react';
import { subscribeRegisteredWorkers, updateRegisteredWorker, deleteRegisteredWorker } from '../firebase/firestore';
import { COIMBATORE_AREAS, getAreaSelectOptions, getAreaById } from '../data/coimbatoreAreas';
import { WORKER_SKILLS, EXPERIENCE_OPTIONS, AVAILABILITY_OPTIONS, GENDER_OPTIONS, getSkillSelectOptions } from '../data/skillsList';
import type { RegisteredWorker } from '../types';

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: '#171717', // bg-dark-900
    borderColor: state.isFocused ? '#fbbf24' : '#404040', // border-dark-600 / gold-400
    color: '#fef3c7', // cream-100
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#fbbf24'
    }
  }),
  menu: (base: any) => ({
    ...base,
    background: '#262626', // bg-dark-800
    border: '1px solid #404040',
    zIndex: 50
  }),
  option: (base: any, state: any) => ({
    ...base,
    background: state.isSelected ? '#fbbf24' : state.isFocused ? '#404040' : 'transparent',
    color: state.isSelected ? '#171717' : '#fef3c7',
    cursor: 'pointer',
    '&:active': {
      background: '#f59e0b'
    }
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#fef3c7'
  }),
  multiValue: (base: any) => ({
    ...base,
    background: '#404040',
    color: '#fef3c7'
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: '#fef3c7'
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: '#fef3c7',
    '&:hover': {
      background: '#ef4444',
      color: '#ffffff'
    }
  }),
  input: (base: any) => ({
    ...base,
    color: '#fef3c7'
  })
};

export default function WorkerDirectory() {
  const [workers, setWorkers] = useState<RegisteredWorker[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<'All' | 'Students' | 'Available' | 'Unavailable' | 'On Job'>('All');
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [selectedGender, setSelectedGender] = useState<any>(null);
  const [selectedExp, setSelectedExp] = useState<any>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal State
  const [selectedWorker, setSelectedWorker] = useState<RegisteredWorker | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeRegisteredWorkers((data) => {
      setWorkers(data);
      setLoading(false);
      // Update selected worker if it's currently open
      if (selectedWorker) {
        const updated = data.find(w => w.id === selectedWorker.id);
        if (updated) setSelectedWorker(updated);
      }
    });
    return () => unsubscribe();
  }, [selectedWorker?.id]);

  const isStudent = (worker: RegisteredWorker) => {
    return worker.roleType === 'student' || 
      worker.experience === 'College Student' || 
      Boolean(worker.collegeName) || 
      worker.skills.includes('college-student');
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      // Search term matching
      const searchLower = searchTerm.toLowerCase();
      const area = worker.areaName || getAreaById(worker.areaId)?.name || '';
      const college = worker.collegeName || '';
      const customArea = worker.customArea || '';
      const skills = worker.skills.map(s => WORKER_SKILLS.find(ws => ws.id === s)?.name || s).join(' ');
      
      const matchesSearch = !searchTerm || 
        worker.name.toLowerCase().includes(searchLower) ||
        worker.phone.includes(searchLower) ||
        worker.workerId.toLowerCase().includes(searchLower) ||
        area.toLowerCase().includes(searchLower) ||
        college.toLowerCase().includes(searchLower) ||
        customArea.toLowerCase().includes(searchLower) ||
        skills.toLowerCase().includes(searchLower);

      // Quick filter
      const matchesQuick = quickFilter === 'All' || 
        (quickFilter === 'Students' && isStudent(worker)) ||
        (quickFilter === 'Available' && worker.availability === 'Available') ||
        (quickFilter === 'Unavailable' && worker.availability === 'Unavailable') ||
        (quickFilter === 'On Job' && worker.availability === 'On Job');

      // Dropdown filters
      const matchesArea = !selectedArea || worker.areaId === selectedArea.value;
      const matchesSkill = !selectedSkill || worker.skills.includes(selectedSkill.value);
      const matchesGender = !selectedGender || worker.gender === selectedGender.value;
      const matchesExp = !selectedExp || worker.experience === selectedExp.value;

      return matchesSearch && matchesQuick && matchesArea && matchesSkill && matchesGender && matchesExp;
    });
  }, [workers, searchTerm, quickFilter, selectedArea, selectedSkill, selectedGender, selectedExp]);

  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);
  const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const clearFilters = () => {
    setSearchTerm('');
    setQuickFilter('All');
    setSelectedArea(null);
    setSelectedSkill(null);
    setSelectedGender(null);
    setSelectedExp(null);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this worker? This action cannot be undone.')) {
      try {
        await deleteRegisteredWorker(id);
        if (selectedWorker?.id === id) setSelectedWorker(null);
      } catch (error) {
        console.error('Error deleting worker:', error);
        alert('Failed to delete worker');
      }
    }
  };

  const handleToggleAvailability = async (worker: RegisteredWorker) => {
    const nextAvailability: import('../types').WorkerAvailability = 
      worker.availability === 'Available' ? 'Unavailable' : 
      worker.availability === 'Unavailable' ? 'On Job' : 'Available';
    try {
      await updateRegisteredWorker(worker.id!, { availability: nextAvailability });
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleToggleStatus = async (worker: RegisteredWorker) => {
    const nextStatus = worker.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateRegisteredWorker(worker.id!, { status: nextStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const renderAvailabilityBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Available</span>;
      case 'Unavailable':
        return <span className="badge bg-red-500/10 text-red-400 border border-red-500/20">Unavailable</span>;
      case 'On Job':
        return <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">On Job</span>;
      default:
        return <span className="badge bg-dark-600 text-cream-300">{status}</span>;
    }
  };

  const studentCount = workers.filter(isStudent).length;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Worker & Student Directory</h1>
          <p className="page-subtitle">Showing {filteredWorkers.length} registered candidates in Coimbatore</p>
        </div>
      </div>

      <div className="page-body space-y-6">
        {/* Search and Filters */}
        <div className="card p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, phone, ID, college, area, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-cream-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 bg-dark-800 p-1 rounded-lg border border-dark-600">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-dark-600 text-gold-400' : 'text-cream-400 hover:text-cream-200'}`}
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded ${viewMode === 'card' ? 'bg-dark-600 text-gold-400' : 'text-cream-400 hover:text-cream-200'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Quick Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              <button
                onClick={() => setQuickFilter('All')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  quickFilter === 'All'
                    ? 'bg-gold-500 text-dark-900 shadow-gold'
                    : 'bg-dark-700 text-cream-300 hover:bg-dark-600'
                }`}
              >
                All ({workers.length})
              </button>

              <button
                onClick={() => setQuickFilter('Students')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                  quickFilter === 'Students'
                    ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-gold'
                    : 'bg-gold-500/10 text-gold-400 border-gold-500/30 hover:bg-gold-500/20'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>🎓 College Students ({studentCount})</span>
              </button>

              {['Available', 'Unavailable', 'On Job'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setQuickFilter(filter as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    quickFilter === filter
                      ? 'bg-gold-500 text-dark-900 shadow-gold'
                      : 'bg-dark-700 text-cream-300 hover:bg-dark-600'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-dark-600 hidden md:block"></div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="w-40">
                <Select
                  options={getAreaSelectOptions(false)}
                  value={selectedArea}
                  onChange={setSelectedArea}
                  placeholder="Area..."
                  styles={selectStyles}
                  isClearable
                />
              </div>
              <div className="w-40">
                <Select
                  options={getSkillSelectOptions()}
                  value={selectedSkill}
                  onChange={setSelectedSkill}
                  placeholder="Role..."
                  styles={selectStyles}
                  isClearable
                />
              </div>
              <div className="w-32">
                <Select
                  options={GENDER_OPTIONS}
                  value={selectedGender}
                  onChange={setSelectedGender}
                  placeholder="Gender..."
                  styles={selectStyles}
                  isClearable
                />
              </div>
            </div>

            {(searchTerm || quickFilter !== 'All' || selectedArea || selectedSkill || selectedGender || selectedExp) && (
              <button 
                onClick={clearFilters}
                className="text-xs text-gold-400 hover:text-gold-300 whitespace-nowrap flex items-center gap-1 font-semibold"
              >
                <X className="h-4 w-4" /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Worker List/Cards */}
        {loading ? (
          <div className="card p-12 text-center text-cream-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto mb-4"></div>
            Loading workforce directory...
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="card p-12 text-center text-cream-400">
            <Users className="h-12 w-12 mx-auto text-cream-500 mb-3" />
            <p className="text-lg font-medium text-cream-200">No candidates found</p>
            <p className="text-sm mt-1">Try adjusting your search criteria or clear filters</p>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <div className="card overflow-hidden">
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Candidate Info</th>
                        <th>Location</th>
                        <th>Category / College</th>
                        <th>Work Interests</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedWorkers.map(worker => (
                        <tr key={worker.id} className="hover:bg-dark-700/50 cursor-pointer" onClick={() => setSelectedWorker(worker)}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-dark-600 flex items-center justify-center text-gold-400 font-bold shrink-0 border border-dark-500">
                                {getInitials(worker.name)}
                              </div>
                              <div>
                                <div className="font-medium text-cream-100 flex items-center gap-1.5">
                                  <span>{worker.name}</span>
                                  {isStudent(worker) && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gold-500/20 text-gold-400 font-bold border border-gold-500/30">
                                      🎓 Student
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-cream-400 flex items-center gap-1">
                                  <span>{worker.workerId}</span> • <span>{worker.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1 text-cream-300">
                              <MapPin className="h-4 w-4 text-gold-400 shrink-0" />
                              <span className="text-sm font-medium">
                                {worker.customArea || worker.areaName || getAreaById(worker.areaId)?.name || 'Coimbatore'}
                              </span>
                            </div>
                          </td>
                          <td>
                            {worker.collegeName ? (
                              <div className="flex items-center gap-1.5 text-xs text-gold-300 font-medium">
                                <Building className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                                <span className="truncate max-w-[160px]">{worker.collegeName}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-cream-400">
                                {worker.roleType === 'fresher' ? 'Fresher' : worker.roleType === 'experienced' ? 'Skilled Worker' : 'General'}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {worker.skills.slice(0, 2).map(skillId => (
                                <span key={skillId} className="px-2 py-0.5 text-[10px] rounded bg-dark-700 text-cream-200 border border-dark-600">
                                  {WORKER_SKILLS.find(s => s.id === skillId)?.name || skillId}
                                </span>
                              ))}
                              {worker.skills.length > 2 && (
                                <span className="px-2 py-0.5 text-[10px] rounded bg-dark-700 text-cream-400 border border-dark-600">
                                  +{worker.skills.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col gap-1 items-start">
                              {renderAvailabilityBadge(worker.availability)}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => setSelectedWorker(worker)}
                                className="p-2 text-cream-400 hover:text-gold-400 hover:bg-dark-600 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedWorkers.map(worker => (
                  <div 
                    key={worker.id} 
                    className="card card-hover p-5 cursor-pointer flex flex-col h-full bg-dark-800/90 border-dark-600"
                    onClick={() => setSelectedWorker(worker)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gold-gradient flex items-center justify-center text-dark-900 font-bold text-lg shadow-gold shrink-0">
                          {getInitials(worker.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-cream-100">{worker.name}</h3>
                            {isStudent(worker) && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gold-500/20 text-gold-400 font-bold border border-gold-500/30">
                                🎓 Student
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gold-400">{worker.workerId}</div>
                        </div>
                      </div>
                      <div>
                        {renderAvailabilityBadge(worker.availability)}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex items-center gap-2 text-sm text-cream-300">
                        <Phone className="h-4 w-4 text-cream-500" />
                        {worker.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-cream-300">
                        <MapPin className="h-4 w-4 text-cream-500" />
                        {worker.customArea || worker.areaName || getAreaById(worker.areaId)?.name || 'Coimbatore'}
                      </div>
                      {worker.collegeName && (
                        <div className="flex items-center gap-2 text-xs text-gold-300 font-medium bg-dark-700/60 p-2 rounded-lg border border-dark-600">
                          <Building className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                          <span className="truncate">{worker.collegeName}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-dark-700">
                      <div className="flex flex-wrap gap-1.5">
                        {worker.skills.map(skillId => (
                          <span key={skillId} className="px-2 py-1 text-xs rounded bg-dark-700 text-cream-200 border border-dark-600">
                            {WORKER_SKILLS.find(s => s.id === skillId)?.name || skillId}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-dark-800 p-4 rounded-xl border border-dark-600">
                <div className="text-sm text-cream-400">
                  Showing <span className="font-medium text-cream-100">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-cream-100">{Math.min(currentPage * itemsPerPage, filteredWorkers.length)}</span> of <span className="font-medium text-cream-100">{filteredWorkers.length}</span> candidates
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded border border-dark-500 text-cream-300 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-gold-500 text-dark-900 font-bold'
                                : 'text-cream-300 hover:bg-dark-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded border border-dark-500 text-cream-300 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Worker Detail Modal */}
      {selectedWorker && (
        <div className="modal-overlay" onClick={() => setSelectedWorker(null)}>
          <div className="modal-content max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header flex justify-between items-center">
              <h2 className="text-xl font-bold text-cream-100">Candidate Profile</h2>
              <button onClick={() => setSelectedWorker(null)} className="text-cream-400 hover:text-cream-100">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="modal-body p-6 space-y-8">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="h-24 w-24 rounded-full bg-gold-gradient flex items-center justify-center text-dark-900 font-bold text-3xl shadow-gold shrink-0">
                  {getInitials(selectedWorker.name)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-cream-100">{selectedWorker.name}</h3>
                    {isStudent(selectedWorker) && (
                      <span className="px-2.5 py-1 rounded-full text-xs bg-gold-500/20 text-gold-400 font-bold border border-gold-500/30 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>College Student</span>
                      </span>
                    )}
                    {renderAvailabilityBadge(selectedWorker.availability)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-cream-300">
                    <span className="flex items-center gap-1 font-mono bg-dark-700 px-2 py-1 rounded text-gold-400">
                      <Shield className="h-4 w-4" />
                      {selectedWorker.workerId}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {selectedWorker.phone}
                    </span>
                  </div>
                </div>
                
                {/* Admin Actions */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => handleToggleAvailability(selectedWorker)}
                    className="btn-secondary whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Change Availability
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(selectedWorker)}
                    className="btn-secondary whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {selectedWorker.status === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    Mark {selectedWorker.status === 'Active' ? 'Inactive' : 'Active'}
                  </button>
                </div>
              </div>
              
              <div className="gold-divider"></div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal & Location */}
                <div className="space-y-6">
                  <div>
                    <h4 className="section-title flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-gold-400" />
                      Personal & Education
                    </h4>
                    <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-cream-400 text-sm">Age</span>
                        <span className="text-cream-100 font-medium">{selectedWorker.age} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cream-400 text-sm">Gender</span>
                        <span className="text-cream-100 font-medium">{selectedWorker.gender}</span>
                      </div>
                      {selectedWorker.collegeName && (
                        <div className="flex justify-between items-center pt-2 border-t border-dark-700">
                          <span className="text-cream-400 text-sm">College / University</span>
                          <span className="text-gold-300 font-semibold text-right">{selectedWorker.collegeName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="section-title flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-gold-400" />
                      Location Details
                    </h4>
                    <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-cream-400 text-sm">Locality</span>
                        <span className="text-cream-100 font-medium text-right">
                          {selectedWorker.customArea || selectedWorker.areaName || getAreaById(selectedWorker.areaId)?.name || 'Coimbatore'}
                        </span>
                      </div>
                      {selectedWorker.customArea && (
                        <div className="flex justify-between text-xs pt-1 border-t border-dark-700">
                          <span className="text-cream-400">Custom Area Type</span>
                          <span className="text-gold-400 font-medium">Custom User Input</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills & Work */}
                <div className="space-y-6">
                  <div>
                    <h4 className="section-title flex items-center gap-2 mb-4">
                      <Briefcase className="h-5 w-5 text-gold-400" />
                      Work Interests & Skills
                    </h4>
                    <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 space-y-4">
                      <div>
                        <span className="text-cream-400 text-sm block mb-2">Category</span>
                        <span className="text-cream-100 font-medium bg-dark-700 px-3 py-1 rounded inline-block">
                          {selectedWorker.roleType === 'student' ? 'College Student' : selectedWorker.experience || 'General Candidate'}
                        </span>
                      </div>
                      <div>
                        <span className="text-cream-400 text-sm block mb-2">Selected Roles</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedWorker.skills.map(skillId => (
                            <span key={skillId} className="px-3 py-1 text-sm rounded bg-dark-700 text-cream-200 border border-dark-500">
                              {WORKER_SKILLS.find(s => s.id === skillId)?.name || skillId}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Danger Zone */}
                  <div className="mt-8 pt-6 border-t border-red-500/20">
                    <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Danger Zone
                    </h4>
                    <button
                      onClick={() => handleDelete(selectedWorker.id)}
                      className="btn-danger flex items-center gap-2 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Candidate Record
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
