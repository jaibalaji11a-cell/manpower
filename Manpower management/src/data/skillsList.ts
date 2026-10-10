export interface SkillData {
  id: string;
  name: string;
  category?: 'student' | 'general' | 'technical';
  icon?: string;
}

export const WORKER_SKILLS: SkillData[] = [
  // Student & Part-Time Friendly Roles
  { id: 'college-student', name: 'Student Part-Time Work', category: 'student' },
  { id: 'event-staff', name: 'Event & Catering Helper', category: 'student' },
  { id: 'office-assistant', name: 'Office / Computer / Data Entry', category: 'student' },
  { id: 'delivery', name: 'Delivery / Courier', category: 'student' },
  { id: 'promoter', name: 'Marketing & Field Promotions', category: 'student' },
  { id: 'packing', name: 'Packing & Labeling', category: 'general' },
  { id: 'warehouse', name: 'Warehouse & Store Helper', category: 'general' },
  { id: 'helper', name: 'General Helper', category: 'general' },
  { id: 'loader', name: 'Loading & Unloading', category: 'general' },
  { id: 'cleaner', name: 'Cleaning & Housekeeping', category: 'general' },
  { id: 'driver', name: 'Driver (2W / 4W)', category: 'general' },
  { id: 'security', name: 'Security Guard', category: 'general' },
  { id: 'electrician', name: 'Electrician', category: 'technical' },
  { id: 'plumber', name: 'Plumber', category: 'technical' },
  { id: 'painter', name: 'Painter', category: 'technical' },
  { id: 'welder', name: 'Welder / Fitter', category: 'technical' },
  { id: 'carpenter', name: 'Carpenter', category: 'technical' },
  { id: 'mason', name: 'Mason / Construction', category: 'technical' },
  { id: 'machine-operator', name: 'Machine Operator', category: 'technical' },
  { id: 'ac-technician', name: 'AC & Appliance Technician', category: 'technical' },
  { id: 'cook', name: 'Cook / Catering Chef', category: 'general' },
  { id: 'supervisor', name: 'Site Supervisor', category: 'general' },
  { id: 'any-work', name: 'Any General Work Available', category: 'general' },
];

export const EXPERIENCE_OPTIONS = [
  { value: 'student', label: 'College Student (Part-Time / Fresher)' },
  { value: 'fresher', label: 'Fresher (No Experience Needed)' },
  { value: '1-3', label: '1 – 3 Years Experience' },
  { value: '3+', label: '3+ Years Experienced' },
];

export const AVAILABILITY_OPTIONS = [
  { value: 'Available', label: 'Any Time / Full-Time' },
  { value: 'Part-Time', label: 'Part-Time (Morning / Evening)' },
  { value: 'Weekends', label: 'Weekends Only (Sat / Sun)' },
  { value: 'Unavailable', label: 'Not Available Currently' },
];

export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export const WORKER_ROLE_TYPES = [
  { id: 'student', label: '🎓 College Student', description: 'Looking for part-time, weekend, or event work' },
  { id: 'fresher', label: '💼 Job Seeker / Fresher', description: 'Looking for entry-level / general work' },
  { id: 'experienced', label: '🛠️ Skilled Worker', description: 'Experienced in specific trade or craft' },
];

// Helper: Get skill options for select
export const getSkillSelectOptions = () =>
  WORKER_SKILLS.map(s => ({ value: s.id, label: s.name }));
