import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  GraduationCap, 
  Clock, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Building,
  PlusCircle
} from 'lucide-react';
import { 
  getAreaSelectOptions, 
  getAreaById, 
  COIMBATORE_AREAS, 
  OTHER_AREA_ID 
} from '../data/coimbatoreAreas';
import { 
  WORKER_SKILLS, 
  WORKER_ROLE_TYPES, 
  AVAILABILITY_OPTIONS, 
  GENDER_OPTIONS 
} from '../data/skillsList';
import { addRegisteredWorker, getRegisteredWorkerByPhone } from '../firebase/firestore';

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: '#1a1a2e',
    borderColor: state.isFocused ? '#c9a84c' : '#2d2d44',
    boxShadow: state.isFocused ? '0 0 0 1px #c9a84c' : 'none',
    color: '#e8e0d0',
    minHeight: 48,
    borderRadius: '0.75rem',
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#1a1a2e',
    border: '1px solid #2d2d44',
    zIndex: 9999,
    borderRadius: '0.75rem',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#c9a84c'
      : state.isFocused
      ? '#2d2d44'
      : 'transparent',
    color: state.isSelected ? '#0f0f1a' : '#e8e0d0',
    padding: '10px 14px',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#e8e0d0',
    fontWeight: 500,
  }),
  input: (base: any) => ({
    ...base,
    color: '#e8e0d0',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#8a8a9a',
  }),
};

const WorkerRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    altPhone: '',
    roleType: 'student', // 'student' | 'fresher' | 'experienced'
    collegeName: '',     // optional college name for students
    gender: 'Male',
    age: '20',
    areaId: '',
    customArea: '',      // custom area name if not in list
    nearestAreaId: '',   // nearest main area if custom area chosen
    selectedSkills: ['college-student'] as string[],
    availability: 'Available',
  });

  const areaOptions = getAreaSelectOptions(true);
  const mainCoimbatoreAreaOptions = COIMBATORE_AREAS.map(a => ({ value: a.id, label: a.name }));

  const handleRoleTypeSelect = (typeId: string) => {
    let defaultSkill = 'college-student';
    if (typeId === 'fresher') defaultSkill = 'helper';
    if (typeId === 'experienced') defaultSkill = 'any-work';

    setFormData(prev => ({
      ...prev,
      roleType: typeId,
      selectedSkills: prev.selectedSkills.length > 0 ? prev.selectedSkills : [defaultSkill]
    }));
  };

  const handleToggleSkill = (skillId: string) => {
    setFormData(prev => {
      const exists = prev.selectedSkills.includes(skillId);
      if (exists) {
        if (prev.selectedSkills.length === 1) return prev; // keep at least 1
        return { ...prev, selectedSkills: prev.selectedSkills.filter(s => s !== skillId) };
      } else {
        return { ...prev, selectedSkills: [...prev.selectedSkills, skillId] };
      }
    });
    setError(null);
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (!formData.phone || formData.phone.length !== 10 || !/^\d{10}$/.test(formData.phone)) {
        setError('Please enter a valid 10-digit WhatsApp phone number');
        return;
      }
      if (!formData.areaId) {
        setError('Please select your area / locality in Coimbatore');
        return;
      }
      if (formData.areaId === OTHER_AREA_ID && !formData.customArea.trim()) {
        setError('Please type your exact area or village name');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedSkills.length === 0) {
      setError('Please select at least one work interest or skill');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Duplicate phone check
      const existingWorker = await getRegisteredWorkerByPhone(formData.phone);
      if (existingWorker) {
        setError(`This phone number is already registered with Worker ID: ${existingWorker.workerId}`);
        setLoading(false);
        return;
      }

      let finalAreaId = formData.areaId;
      let finalAreaName = '';

      if (formData.areaId === OTHER_AREA_ID) {
        // Custom area entered by user
        finalAreaName = formData.customArea.trim();
        finalAreaId = formData.nearestAreaId || 'gandhipuram'; // Map coordinates to nearest area or center
      } else {
        const selectedArea = getAreaById(formData.areaId);
        finalAreaName = selectedArea?.name || formData.areaId;
      }

      const selectedSkillNames = formData.selectedSkills.map(
        (id: string) => WORKER_SKILLS.find(s => s.id === id)?.name || id
      );

      const newWorkerData: Record<string, any> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender as any,
        age: Number(formData.age) || 20,
        areaId: finalAreaId,
        areaName: finalAreaName,
        skills: formData.selectedSkills,
        skillNames: selectedSkillNames,
        experience: formData.roleType === 'student' ? 'College Student' : formData.roleType === 'fresher' ? 'Fresher' : 'Experienced',
        roleType: formData.roleType,
        availability: formData.availability as any,
        preferredAreas: [finalAreaId],
        source: 'qr_registration',
        status: 'Active',
      };

      if (formData.roleType === 'student' && formData.collegeName.trim()) {
        newWorkerData.collegeName = formData.collegeName.trim();
      }

      if (formData.areaId === OTHER_AREA_ID && formData.customArea.trim()) {
        newWorkerData.customArea = formData.customArea.trim();
      }

      if (formData.altPhone) {
        newWorkerData.altPhone = formData.altPhone.trim();
      }

      const docId = await addRegisteredWorker(newWorkerData as any);
      navigate(`/register/success/${docId}`);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err?.message || 'Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-cream-100 flex flex-col justify-between py-6 px-4 sm:px-6 animate-fade-in font-sans">
      
      {/* ─── Top Header & Brand ─── */}
      <div className="max-w-xl w-full mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 mb-3 shadow-gold/10 shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream-100 tracking-tight">
            Worker & Student Registration
          </h1>
          <p className="text-cream-400 text-xs sm:text-sm mt-1">
            Manpower Workforce Portal • Coimbatore
          </p>
        </div>

        {/* ─── Step Indicator (2 Simple Steps) ─── */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            currentStep === 1 
              ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-gold' 
              : 'bg-dark-800 text-emerald-400 border-emerald-500/40'
          }`}>
            <span className="w-5 h-5 rounded-full bg-dark-900/30 flex items-center justify-center text-[11px]">1</span>
            <span>Your Info</span>
          </div>

          <div className="w-8 h-0.5 bg-dark-600" />

          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            currentStep === 2 
              ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-gold' 
              : 'bg-dark-800 text-cream-400 border-dark-600'
          }`}>
            <span className="w-5 h-5 rounded-full bg-dark-900/30 flex items-center justify-center text-[11px]">2</span>
            <span>Work Preferences</span>
          </div>
        </div>

        {/* ─── Error Notification ─── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-start gap-3 animate-fade-in shadow-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-200">Registration Note</p>
              <p className="text-red-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ─── Registration Form Card ─── */}
        <div className="card p-6 sm:p-8 bg-dark-800/90 border border-dark-500 shadow-2xl backdrop-blur rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ════════════ STEP 1: PERSONAL INFO ════════════ */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fade-in">
                
                {/* Profile Type Selector (Student vs Fresher vs Skilled) */}
                <div>
                  <label className="text-xs font-semibold text-cream-300 uppercase tracking-wider block mb-2">
                    I am registering as:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {WORKER_ROLE_TYPES.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleTypeSelect(role.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          formData.roleType === role.id
                            ? 'bg-gold-500/15 border-gold-500 text-gold-300 shadow-gold/10 shadow-md ring-1 ring-gold-500/40'
                            : 'bg-dark-700/60 border-dark-600 text-cream-300 hover:border-dark-400 hover:bg-dark-700'
                        }`}
                      >
                        <span className="font-bold text-xs sm:text-sm">{role.label}</span>
                        <span className="text-[10px] text-cream-400 mt-1">{role.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* College Student Section (Shown when Student is selected) */}
                {formData.roleType === 'student' && (
                  <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/30 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-gold-300">
                      <GraduationCap className="w-4 h-4 text-gold-400" />
                      <span>College Student Details</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-cream-300 uppercase tracking-wider block mb-1">
                        College / University Name (Optional)
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
                        <input
                          type="text"
                          placeholder="e.g. PSG, CIT, Sri Krishna, KPR, Dr. NGP, Rathinam..."
                          value={formData.collegeName}
                          onChange={(e) => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
                          className="input pl-10 w-full h-11 text-xs sm:text-sm bg-dark-900 border-dark-600 focus:border-gold-500 text-cream-100 rounded-xl"
                        />
                      </div>
                      <p className="text-[10px] text-cream-400 mt-1">Helps us assign weekend, event & campus-friendly job shifts</p>
                    </div>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="text-xs font-semibold text-cream-300 uppercase tracking-wider block mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input pl-10 w-full h-12 text-sm bg-dark-900 border-dark-600 focus:border-gold-500 text-cream-100 rounded-xl"
                    />
                  </div>
                </div>

                {/* WhatsApp Phone Number */}
                <div>
                  <label className="text-xs font-semibold text-cream-300 uppercase tracking-wider block mb-1.5">
                    WhatsApp Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                      className="input pl-10 w-full h-12 text-sm bg-dark-900 border-dark-600 focus:border-gold-500 text-cream-100 rounded-xl font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-cream-400 mt-1">We will send job alerts and duty details via WhatsApp</p>
                </div>

                {/* Locality / Area in Coimbatore */}
                <div>
                  <label className="text-xs font-semibold text-cream-300 uppercase tracking-wider block mb-1.5">
                    Your Main Area in Coimbatore *
                  </label>
                  <Select
                    styles={selectStyles}
                    options={areaOptions}
                    value={areaOptions.find(o => o.value === formData.areaId) || null}
                    onChange={(val: any) => setFormData(prev => ({ ...prev, areaId: val?.value || '' }))}
                    placeholder="Search your area (or select 'Other Area' if not listed)..."
                    isClearable
                  />
                  <p className="text-[11px] text-cream-400 mt-1">
                    If your exact street/village is not in the list, choose <strong className="text-gold-400">"➕ Other Area"</strong> below.
                  </p>
                </div>

                {/* Unlisted / Custom Area Input Section */}
                {formData.areaId === OTHER_AREA_ID && (
                  <div className="p-4 rounded-xl bg-dark-900/90 border border-gold-500/40 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-gold-300">
                      <PlusCircle className="w-4 h-4 text-gold-400" />
                      <span>Custom Area / Village Details</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-cream-300 uppercase tracking-wider block mb-1">
                        Enter Your Exact Area or Village Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vellakinar, Kurumbapalayam, Madampatti, Pachapalayam..."
                        value={formData.customArea}
                        onChange={(e) => setFormData(prev => ({ ...prev, customArea: e.target.value }))}
                        className="input w-full h-11 text-xs sm:text-sm bg-dark-800 border-dark-600 focus:border-gold-500 text-cream-100 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-cream-300 uppercase tracking-wider block mb-1">
                        Nearest Main Coimbatore Landmark (For job routing)
                      </label>
                      <Select
                        styles={selectStyles}
                        options={mainCoimbatoreAreaOptions}
                        value={mainCoimbatoreAreaOptions.find(a => a.value === formData.nearestAreaId) || null}
                        onChange={(val: any) => setFormData(prev => ({ ...prev, nearestAreaId: val?.value || '' }))}
                        placeholder="Select nearest main hub (e.g. Saravanampatti, Peelamedu, Thudiyalur)..."
                      />
                    </div>
                  </div>
                )}

                {/* Gender & Age Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-cream-300 uppercase tracking-wider block mb-1.5">
                      Gender
                    </label>
                    <div className="flex gap-2">
                      {GENDER_OPTIONS.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, gender: g.value }))}
                          className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                            formData.gender === g.value
                              ? 'bg-gold-500 text-dark-900 border-gold-500'
                              : 'bg-dark-900 text-cream-300 border-dark-600'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-cream-300 uppercase tracking-wider block mb-1.5">
                      Age
                    </label>
                    <input
                      type="number"
                      min={18}
                      max={65}
                      value={formData.age}
                      onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                      className="input w-full h-10 text-sm bg-dark-900 border-dark-600 focus:border-gold-500 text-cream-100 rounded-xl"
                      placeholder="18 - 60"
                    />
                  </div>
                </div>

                {/* Next Step Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full btn-primary h-12 flex items-center justify-center gap-2 text-sm font-bold shadow-gold mt-4 rounded-xl"
                >
                  <span>Continue to Work Preferences</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ════════════ STEP 2: WORK PREFERENCES ════════════ */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Work Type & Interests (Tap to Select Chips) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-cream-300 uppercase tracking-wider">
                      Work Interests & Roles (Select all that apply) *
                    </label>
                    <span className="text-[11px] text-gold-400 font-semibold">
                      {formData.selectedSkills.length} selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1 py-1">
                    {WORKER_SKILLS.map((skill) => {
                      const isSelected = formData.selectedSkills.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handleToggleSkill(skill.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-gold/20 font-bold'
                              : 'bg-dark-900 text-cream-200 border-dark-600 hover:border-gold-500/40 hover:bg-dark-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{skill.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Availability Options */}
                <div>
                  <label className="text-xs font-semibold text-cream-300 uppercase tracking-wider block mb-2">
                    When are you available for work? *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABILITY_OPTIONS.map((avail) => (
                      <button
                        key={avail.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, availability: avail.value }))}
                        className={`p-3 rounded-xl text-xs font-semibold border flex items-center gap-2.5 transition-all text-left ${
                          formData.availability === avail.value
                            ? 'bg-gold-500/15 border-gold-500 text-gold-300 shadow-md ring-1 ring-gold-500/30'
                            : 'bg-dark-900 text-cream-300 border-dark-600 hover:border-dark-400'
                        }`}
                      >
                        <Clock className="w-4 h-4 text-gold-400 shrink-0" />
                        <span>{avail.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alternate Phone (Optional) */}
                <div>
                  <label className="text-xs font-semibold text-cream-400 uppercase tracking-wider block mb-1">
                    Alternate Phone / Emergency Contact (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Optional 10-digit number"
                    value={formData.altPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, altPhone: e.target.value.replace(/\D/g, '') }))}
                    className="input w-full h-11 text-sm bg-dark-900 border-dark-600 text-cream-100 rounded-xl font-mono"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="btn-secondary h-12 px-5 flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary h-12 flex items-center justify-center gap-2 text-sm font-bold shadow-gold rounded-xl disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Completing Registration...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Complete Registration</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* ─── Footer note ─── */}
        <p className="text-center text-xs text-cream-500 mt-6">
          🛡️ Your information is strictly used for manpower work allocation in Coimbatore.
        </p>
      </div>

    </div>
  );
};

export default WorkerRegistration;
