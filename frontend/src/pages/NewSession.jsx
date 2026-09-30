import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { normalizeTimeString, getNextAvailableSlotTime } from './SessionConfigure';

const API = import.meta.env.VITE_API_URL || '';

// Helper functions for user avatars
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].length >= 2 ? parts[0].slice(0, 2).toUpperCase() : parts[0].toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
  const gradients = [
    'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', // Blue
    'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', // Teal
    'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', // Purple
    'linear-gradient(135deg, #D97706 0%, #B45309 100%)', // Amber
    'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)', // Rose
    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', // Indigo
  ];
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return gradients[Math.abs(hash) % gradients.length];
}

// Renders user-uploaded image if present; otherwise renders initials fallback (NO fake photos)
const UserAvatar = ({ src, name, size = 32, className = '', style = {} }) => {
  const [imgError, setImgError] = useState(false);

  const hasRealUserImage = src &&
    typeof src === 'string' &&
    src.trim().length > 0 &&
    !src.includes('unsplash.com') &&
    !src.includes('1500648767791');

  if (hasRealUserImage && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          ...style
        }}
        onError={() => setImgError(true)}
      />
    );
  }

  const initials = getInitials(name);
  const bg = getAvatarColor(name);
  const fontSize = size <= 26 ? 10 : size <= 28 ? 11 : size <= 32 ? 12 : 14;

  return (
    <div
      className={`${className} ns-avatar-fallback`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: bg,
        color: '#FFFFFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        letterSpacing: '0.2px',
        flexShrink: 0,
        userSelect: 'none',
        ...style
      }}
      title={name}
    >
      {initials}
    </div>
  );
};

// Default slots matching Session Configuration (/sessions/configure)
const DEFAULT_CONFIGURED_SLOTS = [
  { id: 1, time: "08:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true },
  { id: 2, time: "10:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], active: true },
  { id: 3, time: "11:30 AM", duration: "60", maxStudents: 6, days: ["Mon", "Tue", "Wed"], active: true },
  { id: 4, time: "01:00 PM", duration: "120", maxStudents: 4, days: ["Tue", "Thu", "Sat", "Sun"], active: true },
  { id: 5, time: "03:30 PM", duration: "90", maxStudents: 4, days: ["Fri", "Sat", "Sun"], active: false },
  { id: 6, time: "04:00 PM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
];

const SLOT_THEMES = [
  {
    name: 'Neutral',
    primary: '#0F172A',
    dark: '#0F172A',
    light: '#F8FAFC',
    border: '#CBD5E1',
    badgeBg: '#F1F5F9',
    pillActiveBg: '#0F172A',
    text: '#0F172A'
  }
];

function getSlotTheme(idx) {
  return SLOT_THEMES[Math.abs(idx) % SLOT_THEMES.length];
}

function formatSlotRange(timeStr, duration) {
  if (!timeStr) return '';
  if (timeStr.includes(' - ')) return timeStr;

  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return timeStr;

  let [_, hStr, mStr, meridiem] = m;
  let hours = parseInt(hStr, 10);
  let minutes = parseInt(mStr, 10);
  if (meridiem) {
    const med = meridiem.toUpperCase();
    if (med === 'PM' && hours < 12) hours += 12;
    if (med === 'AM' && hours === 12) hours = 0;
  }

  const dur = parseInt(duration || 90, 10);
  const totalMinutes = hours * 60 + minutes + dur;

  const endH24 = Math.floor((totalMinutes / 60) % 24);
  const endM = totalMinutes % 60;
  const endMeridiem = endH24 >= 12 ? 'PM' : 'AM';
  const endH12 = endH24 % 12 === 0 ? 12 : endH24 % 12;

  const pad = (n) => String(n).padStart(2, '0');
  const endFormatted = `${pad(endH12)}:${pad(endM)} ${endMeridiem}`;

  return `${timeStr} - ${endFormatted}`;
}

function getSlotSubtitle(slot) {
  if (slot.title && !slot.title.startsWith('Slot ')) return slot.title;

  const dur = slot.duration ? `${slot.duration} min` : '90 min';
  const days = slot.days && slot.days.length > 0
    ? (slot.days.length === 7 ? 'Daily' : slot.days.join(', '))
    : 'Mon - Fri';

  return `${dur} · (${days})`;
}

function normalizeConfiguredSlots(rawSlots) {
  if (!Array.isArray(rawSlots) || rawSlots.length === 0) {
    rawSlots = DEFAULT_CONFIGURED_SLOTS;
  }
  const seen = new Set();
  const uniqueRaw = [];
  for (const s of rawSlots) {
    const rawTime = s.startTime || s.time || '08:30 AM';
    const norm = normalizeTimeString(rawTime);
    if (!norm || !seen.has(norm)) {
      if (norm) seen.add(norm);
      uniqueRaw.push(s);
    }
  }
  return uniqueRaw.map((s, idx) => {
    const rawTime = s.startTime || s.time || '08:30 AM';
    const formattedRange = formatSlotRange(rawTime, s.duration || 90);
    return {
      id: s.id || (idx + 1),
      startTime: s.time && !s.time.includes(' - ') ? s.time : rawTime.split(' - ')[0].trim(),
      duration: s.duration || 90,
      maxStudents: s.maxStudents || 4,
      days: s.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      active: s.active !== false,
      time: formattedRange,
      title: s.title || getSlotSubtitle({ ...s, startTime: rawTime }),
    };
  });
}

function loadConfiguredSlots() {
  try {
    const raw = localStorage.getItem('session_slots');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeConfiguredSlots(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load session_slots:', e);
  }
  return normalizeConfiguredSlots(DEFAULT_CONFIGURED_SLOTS);
}

function getStudentCourseDayInfo(s, idx = 0) {
  let totalDays = 3;
  const durStr = s.course_duration || s.course || s.waitlistGroup || '3 Days Course';
  const match = String(durStr).match(/(\d+)\s*Day/i);
  if (match) {
    totalDays = parseInt(match[1], 10);
  } else if (s.total_days) {
    totalDays = parseInt(s.total_days, 10);
  }

  let whichDay = 1;
  if (s.which_day !== undefined && s.which_day !== null && !isNaN(parseInt(s.which_day, 10))) {
    whichDay = parseInt(s.which_day, 10);
  } else if (s.current_day !== undefined && s.current_day !== null && !isNaN(parseInt(s.current_day, 10))) {
    whichDay = parseInt(s.current_day, 10);
  } else if (s.day_number !== undefined && s.day_number !== null && !isNaN(parseInt(s.day_number, 10))) {
    whichDay = parseInt(s.day_number, 10);
  } else if (s.start_date) {
    try {
      const parts = String(s.start_date).trim().split(/[-/]/);
      let sYear, sMonth, sDay;
      if (parts.length === 3) {
        if (parts[0].length === 4) { sYear = parseInt(parts[0]); sMonth = parseInt(parts[1]) - 1; sDay = parseInt(parts[2]); }
        else if (parts[2].length === 4) { sYear = parseInt(parts[2]); sMonth = parseInt(parts[1]) - 1; sDay = parseInt(parts[0]); }
      }
      if (sYear && !isNaN(sYear)) {
        const sDate = new Date(sYear, sMonth, sDay);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
        whichDay = Math.max(1, Math.min(totalDays, diffDays + 1));
      }
    } catch (e) {}
  } else {
    whichDay = (idx % totalDays) + 1;
  }

  return { whichDay, totalDays, courseDuration: durStr };
}

const NewSession = ({ isModal = false, onClose, initialDate, onSessionCreated, editSession = null } = {}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // User Context and Permission Control
  const currentUser = (() => {
    try {
      const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })();

  const activeSchoolName = (() => {
    try {
      const savedSchool = sessionStorage.getItem('activeSchool');
      if (savedSchool) {
        const parsed = JSON.parse(savedSchool);
        if (parsed.name) {
          return typeof parsed.name === 'string' ? parsed.name : (parsed.name?.name || null);
        }
      }
      if (currentUser?.school) {
        return typeof currentUser.school === 'string' ? currentUser.school : (currentUser.school?.name || null);
      }
      if (currentUser?.school_name) {
        return typeof currentUser.school_name === 'string' ? currentUser.school_name : (currentUser.school_name?.name || null);
      }
    } catch (e) {}
    return null;
  })();

  const schoolLower = (activeSchoolName || '').toLowerCase().trim();
  const isSuperAdmin = currentUser?.role === 'superadmin' || schoolLower === 'super admin';
  const isAdminOrSuperAdmin = isSuperAdmin || currentUser?.role === 'admin' || currentUser?.role === 'school_admin' || currentUser?.role === 'schooladmin' || schoolLower === 'school admin';

  const isCoach = currentUser?.role === 'coach' || currentUser?.role === 'instructor';
  const isIndividualSurfer = (
    (currentUser?.school || currentUser?.school_name || '').toLowerCase().trim().includes('individual') ||
    (currentUser?.school || currentUser?.school_name || '').toLowerCase().trim().includes('freelance') ||
    currentUser?.is_individual === true ||
    schoolLower.includes('individual') ||
    schoolLower.includes('freelance')
  );

  const isCoachFreelance = isCoach && (
    (currentUser?.school || currentUser?.school_name || '').toLowerCase().trim().includes('individual') ||
    (currentUser?.school || currentUser?.school_name || '').toLowerCase().trim().includes('freelance') ||
    schoolLower.includes('individual') ||
    schoolLower.includes('freelance') ||
    isIndividualSurfer
  );

  // Only School Admins and Individual/Freelance Surfers/Coaches can Schedule sessions
  // Coaches assigned to a school cannot schedule sessions
  const canManageSessions = Boolean(isAdminOrSuperAdmin || isIndividualSurfer || isCoachFreelance);

  useEffect(() => {
    if (currentUser && !canManageSessions) {
      if (isModal) {
        if (onClose) onClose();
      } else {
        navigate('/sessions', { replace: true });
      }
    }
  }, [currentUser, canManageSessions, isModal, onClose, navigate]);

  // Wizard Step State: 1 | 2 | 3
  const [currentStep, setCurrentStep] = useState(1);

  // ─── Step 1 State: Session Setup ───
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  const [selectedDayNumber, setSelectedDayNumber] = useState(() => new Date().getDate());
  const [capacity, setCapacity] = useState(30);
  const [slotCapacityMap, setSlotCapacityMap] = useState({});

  // Initialize from initialDate or searchParams
  useEffect(() => {
    const targetDateStr = initialDate || searchParams.get('date');
    if (targetDateStr) {
      const parts = targetDateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          setCurrentCalendarDate(new Date(y, m, 1));
          setSelectedDayNumber(d);
        }
      }
    }
  }, [initialDate, searchParams]);

  // Dynamic slots loaded directly from Session Configuration
  const [slots, setSlots] = useState(() => loadConfiguredSlots());
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const getSlotCapacity = (slot) => {
    if (!slot) return capacity || 4;
    if (slotCapacityMap[slot.id] !== undefined && slotCapacityMap[slot.id] !== '') {
      return slotCapacityMap[slot.id];
    }
    const defaultMax = parseInt(slot.maxStudents, 10);
    return (!isNaN(defaultMax) && defaultMax > 0) ? defaultMax : 4;
  };

  const handleUpdateSlotCapacity = (slotId, newVal) => {
    setSlotCapacityMap(prev => ({
      ...prev,
      [slotId]: newVal
    }));
    if (slotId === selectedSlotId) {
      if (newVal !== '' && !isNaN(parseInt(newVal, 10))) {
        setCapacity(Math.max(1, parseInt(newVal, 10)));
      }
    }
  };

  const handleSelectSlot = (slot) => {
    if (!slot) return;
    setSelectedSlotId(slot.id);
    const cap = getSlotCapacity(slot);
    setCapacity(cap);
  };

  // Auto-sync capacity when selected slot changes so each slot retains its own capacity limit
  useEffect(() => {
    if (selectedSlotId) {
      if (slotCapacityMap[selectedSlotId] !== undefined) {
        setCapacity(slotCapacityMap[selectedSlotId]);
      } else {
        const selSlot = slots.find(s => s.id === selectedSlotId);
        if (selSlot) {
          const defaultMax = parseInt(selSlot.maxStudents, 10);
          const capNum = (!isNaN(defaultMax) && defaultMax > 0) ? defaultMax : 4;
          setCapacity(capNum);
          setSlotCapacityMap(prev => ({ ...prev, [selectedSlotId]: capNum }));
        }
      }
    }
  }, [selectedSlotId]);

  const handleUpdateCapacity = (newVal) => {
    setCapacity(newVal);
    if (selectedSlotId && newVal !== '' && !isNaN(parseInt(newVal, 10))) {
      const parsedNum = Math.max(1, parseInt(newVal, 10));
      setSlotCapacityMap(prev => ({
        ...prev,
        [selectedSlotId]: parsedNum
      }));
    }
  };

  const [spotName, setSpotName] = useState('');
  const [editingSlotModal, setEditingSlotModal] = useState(null);

  const modalTimeIsDuplicate = useMemo(() => {
    if (!editingSlotModal || !editingSlotModal.time) return false;
    const targetNorm = normalizeTimeString(editingSlotModal.time);
    if (!targetNorm) return false;
    return slots.some(s => s.id !== editingSlotModal.id && normalizeTimeString(s.startTime || s.time) === targetNorm);
  }, [editingSlotModal, slots]);

  // ─── Step 2 State: Roster Selector Pool (Real School Students) ───
  const [dbStudents, setDbStudents] = useState([]);
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'Beginner' | 'Intermediate' | 'Advanced'
  const [courseDayFilter, setCourseDayFilter] = useState('all'); // 'all' | '1' | '2' | '3' | ... | '7'
  const [genderFilterStep2, setGenderFilterStep2] = useState('all'); // 'all' | 'male' | 'female'
  const [swimmingFilterStep2, setSwimmingFilterStep2] = useState('all'); // 'all' | 'swimmer' | 'non-swimmer'
  const [dayFilter, setDayFilter] = useState('all');
  const [selectedSlotStep2, setSelectedSlotStep2] = useState(1);
  const [studentSearchStep2, setStudentSearchStep2] = useState('');
  const [showMoreFiltersMobile, setShowMoreFiltersMobile] = useState(false);

  // ─── Step 2 State: Per-Slot Student Selection Mapping ───
  // Map of slotId -> array of studentIds selected for that specific slot
  const [slotStudentMap, setSlotStudentMap] = useState({});

  // ─── Step 3 State: Instructor Groups Matching (Real School Instructors) ───
  const [dbInstructors, setDbInstructors] = useState([]);
  const [step3DayFilter, setStep3DayFilter] = useState('all'); // 'all' | '1' | '2' | '3'...
  const [step3StatusFilter, setStep3StatusFilter] = useState('all'); // 'all' | 'unassigned' | 'assigned'
  const [step3LevelFilter, setStep3LevelFilter] = useState('all'); // 'all' | 'beginner' | 'intermediate' | 'advanced'
  const [step3GenderFilter, setStep3GenderFilter] = useState('all'); // 'all' | 'male' | 'female'
  const [step3SwimmingFilter, setStep3SwimmingFilter] = useState('all'); // 'all' | 'swimmer' | 'non-swimmer'
  const [step3CoachGenderFilter, setStep3CoachGenderFilter] = useState('all'); // 'all' | 'male' | 'female'
  const [step3SlotFilter, setStep3SlotFilter] = useState(() => slots[0]?.id || 1);
  const [studentSearch, setStudentSearch] = useState('');
  const [step3CheckedStudentIds, setStep3CheckedStudentIds] = useState([]);

  const [trainingGroups, setTrainingGroups] = useState([]);
  const [activeDropGroupId, setActiveDropGroupId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [draggingType, setDraggingType] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uiAlert, setUiAlert] = useState(null);
  const [existingDbSessions, setExistingDbSessions] = useState([]);

  // Formatted Date String
  const formattedSessionDate = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const monthName = currentCalendarDate.toLocaleString('default', { month: 'short' });
    const dayName = new Date(year, currentCalendarDate.getMonth(), selectedDayNumber).toLocaleString('default', { weekday: 'long' });
    return `${dayName}, ${monthName} ${selectedDayNumber}, ${year}`;
  }, [currentCalendarDate, selectedDayNumber]);

  // Match existing DB sessions on selected session date
  const existingScheduledStudentNamesOnDate = useMemo(() => {
    if (!existingDbSessions || existingDbSessions.length === 0) return new Set();
    const setNames = new Set();
    const currentYear = currentCalendarDate.getFullYear();
    const currentMonth = currentCalendarDate.getMonth();
    const selectedDateObj = new Date(currentYear, currentMonth, selectedDayNumber);
    const selectedISO = selectedDateObj.toISOString().split('T')[0];

    existingDbSessions.forEach(sess => {
      const sessDateStr = (sess.date || '').toString();
      let isMatch = false;

      if (sessDateStr.toLowerCase().includes(formattedSessionDate.toLowerCase()) || formattedSessionDate.toLowerCase().includes(sessDateStr.toLowerCase())) {
        isMatch = true;
      } else {
        try {
          const dObj = new Date(sessDateStr);
          if (!isNaN(dObj.getTime())) {
            const dISO = dObj.toISOString().split('T')[0];
            if (dISO === selectedISO) isMatch = true;
          }
        } catch (e) {}
      }

      if (isMatch) {
        if (sess.student) setNames.add(sess.student.toLowerCase().trim());
        if (sess.student_name) setNames.add(sess.student_name.toLowerCase().trim());
        if (Array.isArray(sess.sessions)) {
          sess.sessions.forEach(sub => {
            if (sub.student) setNames.add(sub.student.toLowerCase().trim());
            if (sub.student_name) setNames.add(sub.student_name.toLowerCase().trim());
          });
        }
      }
    });
    return setNames;
  }, [existingDbSessions, formattedSessionDate, currentCalendarDate, selectedDayNumber]);

  const isStudentScheduledInDbOnDate = (student) => {
    if (!student || !student.name) return false;
    return existingScheduledStudentNamesOnDate.has(student.name.toLowerCase().trim());
  };

  // Fetch real students & instructors from active school
  useEffect(() => {
    const activeSchoolStr = sessionStorage.getItem('activeSchool');
    let schoolName = '';
    if (activeSchoolStr) {
      try {
        const parsed = JSON.parse(activeSchoolStr);
        if (parsed && typeof parsed === 'object') {
          schoolName = typeof parsed.name === 'string' ? parsed.name : parsed.name?.name;
        } else if (typeof parsed === 'string') {
          schoolName = parsed;
        }
        const loc = parsed?.city || parsed?.location || schoolName;
        if (loc) setSpotName(`${loc} Beach`);
      } catch (e) {
        schoolName = activeSchoolStr;
      }
    }
    if (!schoolName && currentUser?.school) {
      schoolName = typeof currentUser.school === 'string' ? currentUser.school : currentUser.school?.name;
    }
    if (isCoachFreelance) {
      schoolName = 'Individual / Freelance Coach';
    }
    const schoolParam = schoolName ? `?school=${encodeURIComponent(schoolName)}` : '';

    // Fetch existing sessions for checking date collisions
    fetch(`${API}/api/sessions${schoolParam}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setExistingDbSessions(data);
      })
      .catch(() => {});

    fetch(`${API}/api/students${schoolParam}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const filteredStudents = data.filter(s => {
            const sSchool = (s.school || s.school_name || '').toLowerCase().trim();
            if (isCoachFreelance) {
              return sSchool === 'individual / freelance coach' || (!sSchool && String(s.created_by_user_id) === String(currentUser?.instructor_id || currentUser?.id));
            }
            return true;
          });
          const mapped = [];
          filteredStudents.forEach((s, idx) => {
            const dayInfo = getStudentCourseDayInfo(s, idx);
            // 1. Primary Student
            mapped.push({
              id: s.id,
              name: s.name,
              gender: s.gender || (s.division && s.division.toLowerCase().includes('women') ? 'Female' : 'Male'),
              level: s.level || 'Beginner',
              day: idx % 2 === 0 ? 'day1' : 'day2',
              whichDay: s.which_day || s.whichDay || dayInfo.whichDay,
              totalDays: s.total_days || s.totalDays || dayInfo.totalDays,
              courseDuration: s.course_duration || dayInfo.courseDuration,
              waitlistGroup: s.course_duration || `${dayInfo.totalDays} Days Course`,
              avatar: (s.image && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791')) ? s.image : '',
              swimming_ability: s.swimming_ability || 'Swimmer',
              whatsapp_number: s.whatsapp_number || '',
              email: s.email || '',
              isReal: true,
              isGuest: false,
              parentStudentId: null,
              parentStudentName: null
            });

            // 2. Accompanying Guests registered with this student
            let guestList = [];
            if (Array.isArray(s.guests_details)) {
              guestList = s.guests_details;
            } else if (typeof s.guests_details === 'string') {
              try {
                guestList = JSON.parse(s.guests_details || '[]');
              } catch (e) {
                guestList = [];
              }
            }
            if (Array.isArray(guestList) && guestList.length > 0) {
              guestList.forEach((g, gIdx) => {
                const guestName = g.name && g.name.trim() ? g.name.trim() : `Guest #${gIdx + 1}`;
                mapped.push({
                  id: `guest-${s.id}-${gIdx}`,
                  name: guestName,
                  gender: g.gender || s.gender || 'Male',
                  level: g.level || s.level || 'Beginner',
                  day: idx % 2 === 0 ? 'day1' : 'day2',
                  whichDay: s.which_day || s.whichDay || dayInfo.whichDay,
                  totalDays: s.total_days || s.totalDays || dayInfo.totalDays,
                  courseDuration: s.course_duration || dayInfo.courseDuration,
                  waitlistGroup: s.course_duration || `${dayInfo.totalDays} Days Course`,
                  avatar: '',
                  swimming_ability: g.swimming_ability || s.swimming_ability || 'Swimmer',
                  whatsapp_number: g.whatsapp_number || g.phone || s.whatsapp_number || '',
                  email: g.email || s.email || '',
                  isReal: true,
                  isGuest: true,
                  guestIndex: gIdx + 1,
                  parentStudentId: s.id,
                  parentStudentName: s.name
                });
              });
            }
          });
          setDbStudents(mapped);
        }
      })
      .catch(() => {});

    fetch(`${API}/api/instructors${schoolParam}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((i, idx) => {
            let roleStr = 'Instructor';
            if (i.specializations) {
              if (Array.isArray(i.specializations) && i.specializations.length > 0) {
                roleStr = i.specializations[0];
              } else if (typeof i.specializations === 'string') {
                try {
                  const p = JSON.parse(i.specializations);
                  if (Array.isArray(p) && p.length > 0) roleStr = p[0];
                } catch(e) {}
              }
            }
            return {
              id: i.id,
              name: i.name,
              gender: i.gender || 'Male',
              role: roleStr,
              status: i.status || 'Available',
              avatar: (i.image && !i.image.includes('unsplash.com') && !i.image.includes('1500648767791')) ? i.image : '',
              isReal: true
            };
          });

          if (isCoach && currentUser) {
            const myCoachId = currentUser.instructor_id || currentUser.id;
            const hasSelf = mapped.some(i => String(i.id) === String(myCoachId));
            if (!hasSelf) {
              mapped.unshift({
                id: myCoachId || 1,
                name: currentUser.name || 'Coach',
                gender: currentUser.gender || 'Male',
                role: 'Head Coach',
                status: 'Available',
                avatar: currentUser.image || '',
                isReal: true
              });
            }
          }

          setDbInstructors(mapped);
        }
      })
      .catch(() => {});
  }, [isCoachFreelance]);

  // Real Students Pool (Excludes students already scheduled on selected date)
  // In edit mode: ONLY show students who belong to the session/group being edited!
  const allPoolStudents = useMemo(() => {
    if (editSession) {
      const editStudentIds = new Set();
      const editStudentNames = new Set();
      const sessList = Array.isArray(editSession.sessions) && editSession.sessions.length > 0
        ? editSession.sessions
        : (editSession.id ? [editSession] : []);
      sessList.forEach(s => {
        if (s.student_id != null) editStudentIds.add(String(s.student_id));
        if (s.student) editStudentNames.add(s.student.toLowerCase().trim());
        if (s.student_name) editStudentNames.add(s.student_name.toLowerCase().trim());
      });

      const matched = dbStudents.filter(s => {
        if (editStudentIds.has(String(s.id))) return true;
        const nameLow = (s.name || '').toLowerCase().trim();
        return Boolean(nameLow && editStudentNames.has(nameLow));
      });

      // Fallback: if any session student is not in dbStudents, synthesize from sessList
      sessList.forEach(sess => {
        const sid = sess.student_id;
        const sname = sess.student || sess.student_name;
        if (!sname) return;
        const exists = matched.some(m => (sid != null && String(m.id) === String(sid)) || m.name.toLowerCase().trim() === sname.toLowerCase().trim());
        if (!exists) {
          matched.push({
            id: sid || `session-st-${sname}`,
            name: sname,
            gender: sess.gender || 'Male',
            level: sess.type || sess.level || 'Beginner',
            day: 'day1',
            whichDay: 1,
            totalDays: 3,
            courseDuration: '3 Days Course',
            waitlistGroup: '3 Days Course',
            avatar: sess.image || '',
            isReal: true
          });
        }
      });

      return matched;
    }
    // Normal Create Mode: Exclude students already scheduled on selected date
    return dbStudents.filter(s => !isStudentScheduledInDbOnDate(s));
  }, [dbStudents, isStudentScheduledInDbOnDate, editSession]);

  // Real Instructors (NO fake data)
  const allInstructors = dbInstructors;

  // Filtered Instructors for Step 3 (Coach Gender Filter)
  const filteredInstructors = useMemo(() => {
    return allInstructors.filter(inst => {
      if (step3CoachGenderFilter === 'all') return true;
      const g = (inst.gender || 'male').toLowerCase();
      return g === step3CoachGenderFilter.toLowerCase();
    });
  }, [allInstructors, step3CoachGenderFilter]);

  // ─── Pre-fill from editSession (edit mode) ───
  // When editSession is passed, pre-select date, slot, and students and jump to Step 3.
  const [editSessionPreloaded, setEditSessionPreloaded] = useState(false);

  useEffect(() => {
    if (!editSession || editSessionPreloaded) return;

    // 1. Pre-fill the date
    const rawDate = editSession.date || '';
    const dateStr = String(rawDate).trim();
    // Try YYYY-MM-DD
    const ymd = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    // Try DD-MM-YYYY
    const dmy = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (ymd) {
      setCurrentCalendarDate(new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, 1));
      setSelectedDayNumber(parseInt(ymd[3], 10));
    } else if (dmy) {
      setCurrentCalendarDate(new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, 1));
      setSelectedDayNumber(parseInt(dmy[1], 10));
    } else if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        setCurrentCalendarDate(new Date(d.getFullYear(), d.getMonth(), 1));
        setSelectedDayNumber(d.getDate());
      }
    }

    setEditSessionPreloaded(true);
  }, [editSession, editSessionPreloaded]);

  // After dbStudents load AND editSession is set: pre-select students and jump to Step 3
  useEffect(() => {
    if (!editSession || !editSessionPreloaded) return;
    if (dbStudents.length === 0) return; // wait for students to load

    const sessionList = Array.isArray(editSession.sessions) && editSession.sessions.length > 0
      ? editSession.sessions
      : (editSession.id ? [editSession] : []);

    const sessionStudentNames = sessionList
      .map(s => (s.student || s.student_name || '').toLowerCase().trim())
      .filter(Boolean);
    const sessionStudentIds = sessionList
      .map(s => s.student_id)
      .filter(id => id != null);

    // Find matching students from the pool (match by name or id)
    const matchedStudents = dbStudents.filter(st => {
      if (sessionStudentIds.length > 0 && (sessionStudentIds.includes(st.id) || sessionStudentIds.includes(String(st.id)))) return true;
      const nameLow = (st.name || '').toLowerCase().trim();
      return sessionStudentNames.some(n => n === nameLow || n.includes(nameLow) || nameLow.includes(n));
    });

    const matchedIds = matchedStudents.map(s => s.id);

    // 2. Find the matching configured slot by time
    const editTime = (editSession.time || '').trim().toLowerCase();
    let targetSlot = slots.find(s => {
      const t = (s.time || s.startTime || '').trim().toLowerCase();
      return t === editTime || editTime.startsWith(t) || t.startsWith(editTime.split(' - ')[0]);
    });
    if (!targetSlot) targetSlot = slots[0];
    const targetSlotId = targetSlot?.id || slots[0]?.id;

    if (targetSlotId) {
      setSelectedSlotId(targetSlotId);
      setStep3SlotFilter(targetSlotId);
    }

    // 3. Pre-populate slotStudentMap
    if (matchedIds.length > 0 && targetSlotId) {
      setSlotStudentMap({ [targetSlotId]: matchedIds });
    }

    // 4. Pre-populate trainingGroups with existing group name and instructor
    const existingGroupName = editSession.groupName || editSession.group_name || 'Group A';
    const existingInstructor = editSession.instructor || '';
    const existingInstructorId = editSession.instructor_id || null;
    const matchedInstructor = dbInstructors.find(i =>
      String(i.id) === String(existingInstructorId) ||
      (i.name || '').toLowerCase().trim() === existingInstructor.toLowerCase().trim()
    );

    if (matchedIds.length > 0 || sessionList.length > 0) {
      setTrainingGroups([
        {
          id: 'group-edit-1',
          name: existingGroupName,
          day: 'Day 1',
          level: 'General',
          slotId: targetSlotId || null,
          studentIds: matchedIds,
          assignedInstructorId: matchedInstructor?.id || existingInstructorId || null,
          assignedInstructorIds: matchedInstructor ? [matchedInstructor.id] : (existingInstructorId ? [existingInstructorId] : []),
        }
      ]);
      setActiveDropGroupId('group-edit-1');
    }

    // 5. Jump directly to Step 3
    setCurrentStep(3);
  }, [editSession, editSessionPreloaded, dbStudents, dbInstructors, slots]);

  // Sync with Session Configuration changes (live in same tab or across tabs)
  useEffect(() => {
    const handleSlotsSync = () => {
      setSlots(loadConfiguredSlots());
    };
    window.addEventListener('storage', handleSlotsSync);
    window.addEventListener('session_slots_updated', handleSlotsSync);
    return () => {
      window.removeEventListener('storage', handleSlotsSync);
      window.removeEventListener('session_slots_updated', handleSlotsSync);
    };
  }, []);

  // Selected Slot details (null if user has not picked a slot yet)
  const selectedSlot = useMemo(() => {
    if (!selectedSlotId) return null;
    return slots.find(s => s.id === selectedSlotId) || null;
  }, [slots, selectedSlotId]);

  // Selected Day of Week (e.g. 'Sun', 'Mon', 'Sat')
  const selectedDayOfWeek = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    return new Date(year, month, selectedDayNumber).toLocaleDateString('en-US', { weekday: 'short' });
  }, [currentCalendarDate, selectedDayNumber]);

  // Active slots for the selected day of week & active setting
  const activeSlotsForDay = useMemo(() => {
    return slots.filter(s => {
      const isActiveInSettings = s.active !== false;
      const isDayMatch = !s.days || s.days.length === 0 || s.days.includes(selectedDayOfWeek);
      return isActiveInSettings && isDayMatch;
    });
  }, [slots, selectedDayOfWeek]);

  // Auto-reset selectedSlotId & step3SlotFilter if the selected slot is off on the current selected day of week
  useEffect(() => {
    if (activeSlotsForDay.length > 0) {
      const isCurrentActive = activeSlotsForDay.some(s => s.id === selectedSlotId);
      if (!isCurrentActive) {
        setSelectedSlotId(activeSlotsForDay[0].id);
      }
      if (step3SlotFilter === 'ALL' || !activeSlotsForDay.some(s => s.id === step3SlotFilter)) {
        setStep3SlotFilter(activeSlotsForDay[0].id);
      }
    }
  }, [selectedDayOfWeek, activeSlotsForDay, selectedSlotId, step3SlotFilter]);

  // Unify slot theme across the entire UI so top Select Time Slot pills,
  // student roster rows, sticky footer tags, and group cards match identically!
  const getSlotThemeForSlot = (slotOrId) => {
    if (!slotOrId) return getSlotTheme(0);
    const slotId = typeof slotOrId === 'object' ? slotOrId.id : slotOrId;

    const activeIdx = activeSlotsForDay.findIndex(s => s.id === slotId);
    if (activeIdx !== -1) {
      return getSlotTheme(activeIdx);
    }

    const allIdx = slots.findIndex(s => s.id === slotId);
    if (allIdx !== -1) {
      return getSlotTheme(allIdx);
    }

    return getSlotTheme(0);
  };

  // Helper: Find which slot a student is assigned to
  const getStudentSlotAssignment = (studentId) => {
    for (let idx = 0; idx < slots.length; idx++) {
      const s = slots[idx];
      const assignedIds = slotStudentMap[s.id] || [];
      if (assignedIds.includes(studentId)) {
        const theme = getSlotThemeForSlot(s.id);
        const activeIdx = activeSlotsForDay.findIndex(x => x.id === s.id);
        return { slot: s, slotIdx: activeIdx !== -1 ? activeIdx : idx, theme };
      }
    }
    return null;
  };

  // Union of all selected student IDs across all slots
  const allSelectedStudentIds = useMemo(() => {
    const ids = new Set();
    Object.values(slotStudentMap).forEach(list => {
      if (Array.isArray(list)) list.forEach(id => ids.add(id));
    });
    return Array.from(ids);
  }, [slotStudentMap]);

  // Backward compatibility alias for selectedStudentIds
  const selectedStudentIds = allSelectedStudentIds;

  // Toggle student selection for currently active slot tab (Strictly enforces slot capacity)
  const toggleSelectStudent = (studentId) => {
    const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
    if (!activeSlotId) return;

    const activeSlot = slots.find(s => s.id === activeSlotId) || selectedSlot;
    const slotCap = getSlotCapacity(activeSlot);
    const currentSlotList = slotStudentMap[activeSlotId] || [];
    const isAlreadyInCurrentSlot = currentSlotList.includes(studentId);

    // If trying to select a new student, check whether capacity is already reached
    if (!isAlreadyInCurrentSlot) {
      if (currentSlotList.length >= slotCap) {
        const slotTimeName = activeSlot ? (activeSlot.startTime || activeSlot.time) : 'this time slot';
        setUiAlert({
          title: 'Slot Capacity Limit Reached',
          message: `The capacity limit for ${slotTimeName} is ${slotCap} students. You cannot select more than ${slotCap} students. Please deselect another student first or increase the capacity in Step 1.`,
          type: 'warning',
          icon: '⚠️'
        });
        return;
      }
    }

    setSlotStudentMap(prevMap => {
      const prevList = prevMap[activeSlotId] || [];
      const alreadyIn = prevList.includes(studentId);

      const newMap = { ...prevMap };

      // Remove student from ALL slots first (so student belongs to only 1 slot at a time)
      Object.keys(newMap).forEach(sId => {
        if (Array.isArray(newMap[sId])) {
          newMap[sId] = newMap[sId].filter(id => id !== studentId);
        }
      });

      if (!alreadyIn) {
        newMap[activeSlotId] = [...(newMap[activeSlotId] || []), studentId];
      }

      return newMap;
    });
  };



  // Handle Save from Slot Modal (persists to localStorage so Session Configuration is synced)
  const handleSaveSlotModal = (modalData) => {
    if (!modalData?.time || !modalData.time.trim()) {
      alert("Please enter a valid time for the session slot.");
      return;
    }

    let rawConfigSlots = [];
    try {
      const raw = localStorage.getItem('session_slots');
      rawConfigSlots = raw ? JSON.parse(raw) : DEFAULT_CONFIGURED_SLOTS;
      if (!Array.isArray(rawConfigSlots) || rawConfigSlots.length === 0) {
        rawConfigSlots = DEFAULT_CONFIGURED_SLOTS;
      }
    } catch (e) {
      rawConfigSlots = DEFAULT_CONFIGURED_SLOTS;
    }

    const targetNorm = normalizeTimeString(modalData.time);
    const isDuplicate = rawConfigSlots.some(s => s.id !== modalData.id && normalizeTimeString(s.startTime || s.time) === targetNorm);
    if (isDuplicate) {
      alert(`Cannot save duplicate time slot!\n\nA session slot with start time "${modalData.time}" already exists.\n\nDuplicate start times are not allowed (e.g. 08:30 AM and 08:31 AM are allowed, but duplicate identical times are not allowed).`);
      return;
    }

    if (modalData.mode === 'edit') {
      rawConfigSlots = rawConfigSlots.map(s => s.id === modalData.id ? {
        ...s,
        time: modalData.time,
        duration: String(modalData.duration),
        maxStudents: parseInt(modalData.maxStudents, 10) || 4,
        days: modalData.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        active: modalData.active !== false,
      } : s);
    } else {
      rawConfigSlots.push({
        id: modalData.id || Date.now(),
        time: modalData.time,
        duration: String(modalData.duration),
        maxStudents: parseInt(modalData.maxStudents, 10) || 4,
        days: modalData.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        active: modalData.active !== false,
      });
    }

    localStorage.setItem('session_slots', JSON.stringify(rawConfigSlots));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('session_slots_updated', { detail: rawConfigSlots }));
    setSlots(normalizeConfiguredSlots(rawConfigSlots));
    setEditingSlotModal(null);
  };

  // Calendar Helpers
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const prevMonthDays = daysInMonth(year, month - 1);

    const days = [];
    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    // Next month padding to fill rows of 7
    const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length);
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }
    return days;
  }, [currentCalendarDate]);

  // Next / Prev Month
  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };



  // Select all for Day 1 or Day 2
  const selectAllPool = (dayKey) => {
    const poolIds = allPoolStudents.filter(s => s.day === dayKey).map(s => s.id);
    const allSelected = poolIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !poolIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...poolIds])));
    }
  };

  // Step 2 Available Course Days (e.g. Day 1, Day 2, Day 3, ... Day 7)
  const availableDays = useMemo(() => {
    const dayNumbers = allPoolStudents.map(s => s.whichDay || 1);
    const totalDayNumbers = allPoolStudents.map(s => s.totalDays || 3);
    const maxDay = Math.min(10, Math.max(7, ...dayNumbers, ...totalDayNumbers));
    const days = [];
    for (let d = 1; d <= maxDay; d++) {
      days.push(d);
    }
    return days;
  }, [allPoolStudents]);

  // Step 2 Filtered & Sorted students from database:
  // Active slot's assigned students on TOP (0), Unassigned in MIDDLE (1), Other slots' students at BOTTOM (2)
  const filteredStudents = useMemo(() => {
    const activeSlotIdStep2 = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
    const currentSlotStudentIds = new Set(slotStudentMap[activeSlotIdStep2] || []);
    const allSelectedSet = new Set(allSelectedStudentIds);

    const getStudentPriority = (id) => {
      if (currentSlotStudentIds.has(id)) return 0; // Top: In this active slot
      if (!allSelectedSet.has(id)) return 1;       // Middle: Unassigned / available
      return 2;                                    // Bottom: Assigned in another slot
    };

    const getFamilyPriority = (student) => {
      const familyId = student.parentStudentId || student.id;
      const related = allPoolStudents.filter(s => (s.parentStudentId || s.id) === familyId);
      if (related.length === 0) return getStudentPriority(student.id);
      return Math.min(...related.map(s => getStudentPriority(s.id)));
    };

    return allPoolStudents
      .filter(s => levelFilter === 'all' || s.level.toLowerCase() === levelFilter.toLowerCase())
      .filter(s => genderFilterStep2 === 'all' || (s.gender || 'male').toLowerCase() === genderFilterStep2.toLowerCase())
      .filter(s => {
        if (swimmingFilterStep2 === 'all') return true;
        const sSwim = (s.swimming_ability || 'Swimmer').toLowerCase();
        if (swimmingFilterStep2 === 'swimmer') return !sSwim.includes('non') && sSwim !== 'no';
        if (swimmingFilterStep2 === 'non-swimmer') return sSwim.includes('non') || sSwim === 'no';
        return true;
      })
      .filter(s => !studentSearchStep2 || s.name.toLowerCase().includes(studentSearchStep2.toLowerCase()) || (s.parentStudentName && s.parentStudentName.toLowerCase().includes(studentSearchStep2.toLowerCase())))
      .slice()
      .sort((a, b) => {
        // Keep parent student and their guests grouped together
        const familyIdA = a.parentStudentId || a.id;
        const familyIdB = b.parentStudentId || b.id;

        if (String(familyIdA) !== String(familyIdB)) {
          // 1. Priority sort: active slot students on TOP, unassigned in MIDDLE, other slots at BOTTOM
          const prioA = getFamilyPriority(a);
          const prioB = getFamilyPriority(b);
          if (prioA !== prioB) return prioA - prioB;

          // 2. If day filter is active
          if (courseDayFilter !== 'all') {
            const aMatch = String(a.whichDay) === String(courseDayFilter);
            const bMatch = String(b.whichDay) === String(courseDayFilter);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
          }

          // 3. Natural day order
          const dayA = parseInt(a.whichDay, 10) || 1;
          const dayB = parseInt(b.whichDay, 10) || 1;
          if (dayA !== dayB) return dayA - dayB;

          // 4. Alphabetical by parent name
          const parentNameA = a.parentStudentName || a.name;
          const parentNameB = b.parentStudentName || b.name;
          return parentNameA.localeCompare(parentNameB);
        }

        // Within the same family / booking: Parent student FIRST (0), then Guest 1, Guest 2...
        const subA = a.isGuest ? (a.guestIndex || 1) : 0;
        const subB = b.isGuest ? (b.guestIndex || 1) : 0;
        return subA - subB;
      });
  }, [allPoolStudents, levelFilter, courseDayFilter, genderFilterStep2, swimmingFilterStep2, studentSearchStep2, allSelectedStudentIds, slotStudentMap, selectedSlotId, activeSlotsForDay, slots]);

  // Transition from Step 2 to Step 3: Multi-slot aware group initialization
  const proceedToStep3 = () => {
    // Validate that no slot has exceeded its capacity
    for (const s of slots) {
      const assignedCount = (slotStudentMap[s.id] || []).length;
      const sCap = getSlotCapacity(s);
      if (assignedCount > sCap) {
        setUiAlert({
          title: 'Slot Capacity Exceeded',
          message: `Slot "${s.startTime || s.time}" has ${assignedCount} students selected, which exceeds the limit of ${sCap} students. Please deselect extra students before proceeding.`,
          type: 'error',
          icon: '⚠️'
        });
        return;
      }
    }

    if (selectedSlotId) {
      setStep3SlotFilter(selectedSlotId);
    }
    if (trainingGroups.length === 0) {
      const activeSlotsWithStudents = slots.filter(s => (slotStudentMap[s.id] || []).length > 0);
      const initialSlot = activeSlotsWithStudents.length > 0 ? activeSlotsWithStudents[0] : (selectedSlot || slots[0]);

      const targetIds = allSelectedStudentIds.length > 0 ? allSelectedStudentIds : selectedStudentIds;

      if (targetIds && targetIds.length > 0) {
        if (activeSlotsWithStudents.length > 1) {
          const newGroups = activeSlotsWithStudents.map(slot => {
            const slotStudents = slotStudentMap[slot.id] || [];
            return {
              id: `group-${slot.id}-A`,
              name: `Group A`,
              day: `Day 1`,
              level: 'General',
              slotId: slot.id,
              studentIds: slotStudents,
              assignedInstructorId: (isCoachFreelance && (currentUser?.instructor_id || currentUser?.id)) ? (currentUser?.instructor_id || currentUser?.id) : null,
              assignedInstructorIds: (isCoachFreelance && (currentUser?.instructor_id || currentUser?.id)) ? [(currentUser?.instructor_id || currentUser?.id)] : [],
            };
          });
          setTrainingGroups(newGroups);
          setActiveDropGroupId(newGroups[0]?.id || null);
        } else {
          setTrainingGroups([
            {
              id: `group-1`,
              name: `Group A`,
              day: `Day 1`,
              level: 'General',
              slotId: initialSlot?.id || null,
              studentIds: targetIds,
              assignedInstructorId: (isCoachFreelance && (currentUser?.instructor_id || currentUser?.id)) ? (currentUser?.instructor_id || currentUser?.id) : null,
              assignedInstructorIds: (isCoachFreelance && (currentUser?.instructor_id || currentUser?.id)) ? [(currentUser?.instructor_id || currentUser?.id)] : [],
            }
          ]);
          setActiveDropGroupId('group-1');
        }
      } else {
        setTrainingGroups([]);
        setActiveDropGroupId(null);
      }
    } else if (editSession) {
      // In edit mode: sync the group's slotId and studentIds if user adjusted slots/students in Step 2
      const activeSlotsWithStudents = slots.filter(s => (slotStudentMap[s.id] || []).length > 0);
      const chosenSlot = activeSlotsWithStudents.length > 0 ? activeSlotsWithStudents[0] : (selectedSlot || slots[0]);
      const chosenSlotId = chosenSlot?.id || null;
      const targetIds = allSelectedStudentIds.length > 0 ? allSelectedStudentIds : selectedStudentIds;

      setTrainingGroups(prev => prev.map(grp => {
        if (grp.id === 'group-edit-1' || prev.length === 1) {
          return {
            ...grp,
            slotId: chosenSlotId || grp.slotId,
            studentIds: (chosenSlotId && slotStudentMap[chosenSlotId]) ? slotStudentMap[chosenSlotId] : (targetIds.length > 0 ? targetIds : grp.studentIds),
          };
        }
        return grp;
      }));
      if (chosenSlotId) {
        setStep3SlotFilter(chosenSlotId);
        setSelectedSlotId(chosenSlotId);
      }
    }
    setCurrentStep(3);
  };

  // Step 3: Students in Column 1 (All selected students across all slots)
  const importedStudents = useMemo(() => {
    if (editSession) {
      // In edit mode: allPoolStudents is already strictly the group's students
      return allPoolStudents;
    }
    const targetIds = allSelectedStudentIds.length > 0 ? allSelectedStudentIds : selectedStudentIds;
    return allPoolStudents.filter(s => targetIds.includes(s.id));
  }, [allPoolStudents, allSelectedStudentIds, selectedStudentIds, editSession]);

  // Step 3: Available Days for Imported Students
  const step3AvailableDays = useMemo(() => {
    const daysSet = new Set();
    importedStudents.forEach(s => {
      const d = parseInt(s.whichDay, 10);
      if (d) daysSet.add(d);
    });
    if (daysSet.size === 0) {
      return (availableDays && availableDays.length > 0) ? availableDays.slice(0, 7) : [1, 2, 3];
    }
    return Array.from(daysSet).sort((a, b) => a - b);
  }, [importedStudents, availableDays]);

  // Students in active slot (for option counts)
  const slotImportedStudents = useMemo(() => {
    if (editSession || step3SlotFilter === 'ALL') return importedStudents;
    const slotAssignedIds = slotStudentMap[step3SlotFilter] || [];
    return importedStudents.filter(s => slotAssignedIds.includes(s.id));
  }, [importedStudents, step3SlotFilter, slotStudentMap, editSession]);

  const hasActiveStep3Filters = step3DayFilter !== 'all' || step3StatusFilter !== 'all' || step3LevelFilter !== 'all' || step3GenderFilter !== 'all' || step3SwimmingFilter !== 'all' || Boolean(studentSearch);

  const resetStep3Filters = () => {
    setStep3DayFilter('all');
    setStep3StatusFilter('all');
    setStep3LevelFilter('all');
    setStep3GenderFilter('all');
    setStep3SwimmingFilter('all');
    setStudentSearch('');
  };

  const filteredColumn1Students = useMemo(() => {
    return importedStudents
      .filter(s => {
        // Slot filtering in Step 3 (bypassed in edit mode so group students never disappear)
        if (!editSession && step3SlotFilter !== 'ALL') {
          const slotAssignedIds = slotStudentMap[step3SlotFilter] || [];
          if (!slotAssignedIds.includes(s.id)) return false;
        }

        // Day filtering
        if (step3DayFilter !== 'all' && String(s.whichDay) !== String(step3DayFilter)) {
          return false;
        }

        // Status filtering (All Active / Unassigned / Assigned)
        const isAssigned = trainingGroups.some(g => g.studentIds.includes(s.id));
        if (step3StatusFilter === 'unassigned' && isAssigned) return false;
        if (step3StatusFilter === 'assigned' && !isAssigned) return false;

        // Level filtering (All / Beginner / Intermediate / Advanced)
        if (step3LevelFilter !== 'all') {
          if ((s.level || '').toLowerCase() !== step3LevelFilter.toLowerCase()) return false;
        }

        // Gender filtering (All / Male / Female)
        if (step3GenderFilter !== 'all') {
          const sGender = (s.gender || 'male').toLowerCase();
          if (sGender !== step3GenderFilter.toLowerCase()) return false;
        }

        // Swimming Ability filtering (All / Swimmer / Non-Swimmer)
        if (step3SwimmingFilter !== 'all') {
          const sSwim = (s.swimming_ability || 'Swimmer').toLowerCase();
          if (step3SwimmingFilter === 'swimmer' && (sSwim.includes('non') || sSwim === 'no')) return false;
          if (step3SwimmingFilter === 'non-swimmer' && (!sSwim.includes('non') && sSwim !== 'no')) return false;
        }

        return true;
      })
      .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.parentStudentName && s.parentStudentName.toLowerCase().includes(studentSearch.toLowerCase())))
      .slice()
      .sort((a, b) => {
        // Unassigned on top, assigned to groups at bottom
        const aAssigned = trainingGroups.some(g => g.studentIds.includes(a.id));
        const bAssigned = trainingGroups.some(g => g.studentIds.includes(b.id));
        if (!aAssigned && bAssigned) return -1;
        if (aAssigned && !bAssigned) return 1;

        const familyIdA = a.parentStudentId || a.id;
        const familyIdB = b.parentStudentId || b.id;
        if (String(familyIdA) !== String(familyIdB)) {
          const dayA = parseInt(a.whichDay, 10) || 1;
          const dayB = parseInt(b.whichDay, 10) || 1;
          if (dayA !== dayB) return dayA - dayB;
          const parentNameA = a.parentStudentName || a.name;
          const parentNameB = b.parentStudentName || b.name;
          return parentNameA.localeCompare(parentNameB);
        }
        const subA = a.isGuest ? (a.guestIndex || 1) : 0;
        const subB = b.isGuest ? (b.guestIndex || 1) : 0;
        return subA - subB;
      });
  }, [importedStudents, step3DayFilter, step3StatusFilter, step3LevelFilter, step3GenderFilter, step3SwimmingFilter, step3SlotFilter, slotStudentMap, studentSearch, trainingGroups, editSession]);

  // Step 3: Training groups filtered by slot
  const displayedTrainingGroups = useMemo(() => {
    if (editSession || step3SlotFilter === 'ALL') return trainingGroups;
    return trainingGroups.filter(g => String(g.slotId || slots[0]?.id) === String(step3SlotFilter));
  }, [trainingGroups, step3SlotFilter, slots, editSession]);

  // Step 3: Toggle check in Column 1
  const toggleStep3StudentCheck = (id) => {
    setStep3CheckedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Create Group from checked students or create a fresh empty group card with assigned slot
  const handleCreateGroup = () => {
    const checkedStudents = importedStudents.filter(s => step3CheckedStudentIds.includes(s.id));
    const levelLabel = checkedStudents.length > 0 ? (checkedStudents[0]?.level || 'General') : 'General';
    
    // Determine default slot for the group
    let defaultSlotId = step3SlotFilter !== 'ALL' ? step3SlotFilter : null;
    if (!defaultSlotId && checkedStudents.length > 0) {
      const assignment = getStudentSlotAssignment(checkedStudents[0].id);
      if (assignment) defaultSlotId = assignment.slot.id;
    }
    if (!defaultSlotId) defaultSlotId = selectedSlot?.id || slots[0]?.id;

    // Filter existing groups for this specific time slot
    const slotGroups = trainingGroups.filter(
      g => String(g.slotId || slots[0]?.id) === String(defaultSlotId)
    );

    // Find used letters in this slot so each time slot starts from Group A, Group B, Group C...
    const usedLetters = new Set();
    slotGroups.forEach(g => {
      const match = (g.name || '').match(/Group\s+([A-Za-z])/i);
      if (match) usedLetters.add(match[1].toUpperCase());
    });

    let charCode = 65; // 'A'
    while (usedLetters.has(String.fromCharCode(charCode))) {
      charCode++;
    }
    const newGroupLetter = String.fromCharCode(charCode);

    const dayLabel = (checkedStudents.length > 0 && checkedStudents[0]?.whichDay)
      ? `Day ${checkedStudents[0].whichDay}`
      : `Day ${slotGroups.length + 1}`;

    const newGroup = {
      id: `group-${Date.now()}`,
      name: `Group ${newGroupLetter}`,
      day: dayLabel,
      level: levelLabel,
      slotId: defaultSlotId,
      studentIds: [...step3CheckedStudentIds],
      assignedInstructorId: (isCoachFreelance && (currentUser?.instructor_id || currentUser?.id)) ? (currentUser?.instructor_id || currentUser?.id) : null,
      assignedInstructorIds: (isCoachFreelance && (currentUser?.instructor_id || currentUser?.id)) ? [(currentUser?.instructor_id || currentUser?.id)] : [],
    };
    setTrainingGroups(prev => [...prev, newGroup]);
    setActiveDropGroupId(newGroup.id);
    setStep3CheckedStudentIds([]);
  };

  // Delete group card
  const deleteGroup = (groupId) => {
    setTrainingGroups(prev => prev.filter(g => g.id !== groupId));
    if (activeDropGroupId === groupId) {
      const remaining = trainingGroups.filter(g => g.id !== groupId);
      setActiveDropGroupId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Clear all groups for fresh manual creation
  const clearAllGroups = () => {
    setTrainingGroups([]);
    setActiveDropGroupId(null);
  };

  // Remove individual student from a group
  const removeStudentFromGroup = (groupId, studentId) => {
    setTrainingGroups(prev =>
      prev.map(g => g.id === groupId ? { ...g, studentIds: g.studentIds.filter(id => id !== studentId) } : g)
    );
  };

  // Helper: Find conflicting group if coach is already assigned at the same slot time
  const getCoachSlotConflict = (targetGroupId, instructorId, proposedSlotId = null) => {
    const targetGroup = trainingGroups.find(g => g.id === targetGroupId);
    const effectiveSlotId = proposedSlotId !== null ? proposedSlotId : (targetGroup?.slotId || slots[0]?.id);

    // Find the slot time string for the target group
    const targetSlot = slots.find(s => String(s.id) === String(effectiveSlotId)) || slots[0];
    const targetTime = (targetSlot?.startTime || targetSlot?.time || '').trim().toLowerCase();
    if (!targetTime) return null;

    // Check all other groups
    for (const otherGroup of trainingGroups) {
      if (otherGroup.id === targetGroupId) continue;

      const otherSlot = slots.find(s => String(s.id) === String(otherGroup.slotId)) || slots[0];
      const otherTime = (otherSlot?.startTime || otherSlot?.time || '').trim().toLowerCase();

      // If other group runs at the same time slot
      if (otherTime && otherTime === targetTime) {
        const otherCoachIds = otherGroup.assignedInstructorIds || (otherGroup.assignedInstructorId ? [otherGroup.assignedInstructorId] : []);
        if (otherCoachIds.map(String).includes(String(instructorId))) {
          return {
            conflictingGroup: otherGroup,
            time: otherSlot?.startTime || otherSlot?.time || targetSlot?.time || 'same time'
          };
        }
      }
    }
    return null;
  };

  // Assign Instructor to Group (Supports Multiple Coaches with Same-Time Conflict Prevention)
  const assignInstructorToGroup = (groupId, instructorId) => {
    const conflict = getCoachSlotConflict(groupId, instructorId);
    if (conflict) {
      const coach = allInstructors.find(i => String(i.id) === String(instructorId));
      const coachName = coach ? coach.name : 'This coach';
      setUiAlert({
        title: 'Coach Schedule Conflict',
        message: `${coachName} is already assigned to ${conflict.conflictingGroup.name} at ${conflict.time}. The same coach cannot be assigned to multiple groups at the same time. You can assign them to groups in different time slots.`,
        type: 'warning',
        icon: '⚠️'
      });
      return false;
    }

    setTrainingGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const currentIds = g.assignedInstructorIds || (g.assignedInstructorId ? [g.assignedInstructorId] : []);
        const mergedIds = Array.from(new Set([...currentIds, instructorId]));
        return {
          ...g,
          assignedInstructorIds: mergedIds,
          assignedInstructorId: mergedIds[0] || instructorId
        };
      })
    );
    return true;
  };

  const removeInstructorFromGroup = (groupId, instructorId) => {
    setTrainingGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const currentIds = g.assignedInstructorIds || (g.assignedInstructorId ? [g.assignedInstructorId] : []);
        const nextIds = instructorId
          ? currentIds.filter(id => String(id) !== String(instructorId))
          : [];
        return {
          ...g,
          assignedInstructorIds: nextIds,
          assignedInstructorId: nextIds[0] || null
        };
      })
    );
  };

  // Drag and Drop Handler on Group Cards
  const handleDropOnGroup = (e, targetGroupId) => {
    e.preventDefault();
    setDragOverGroupId(null);
    setDraggingType(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.type === 'instructor') {
        assignInstructorToGroup(targetGroupId, data.id);
      } else if (data.type === 'student') {
        const sIds = data.studentIds || [];
        setTrainingGroups(prev => prev.map(g => {
          if (g.id === targetGroupId) {
            const merged = Array.from(new Set([...g.studentIds, ...sIds]));
            return { ...g, studentIds: merged };
          }
          if (data.fromGroupId && g.id === data.fromGroupId) {
            return { ...g, studentIds: g.studentIds.filter(id => !sIds.includes(id)) };
          }
          return g;
        }));
        setStep3CheckedStudentIds([]);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Drag and Drop Handler to Unassign Students back to Column 1
  const handleDropOnColumn1 = (e) => {
    e.preventDefault();
    setDraggingType(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.type === 'student' && data.fromGroupId) {
        const sIds = data.studentIds || [];
        setTrainingGroups(prev => prev.map(g =>
          g.id === data.fromGroupId ? { ...g, studentIds: g.studentIds.filter(id => !sIds.includes(id)) } : g
        ));
      }
    } catch (err) {}
  };

  // Finalize & Publish to Backend API
  const handleFinalizeAndPublish = async () => {
    if (!trainingGroups || trainingGroups.length === 0) {
      setUiAlert({
        title: 'No Training Groups Created',
        message: 'Please create at least one training group and assign students before publishing.',
        type: 'warning',
        icon: '📋'
      });
      return;
    }

    const validGroups = trainingGroups.filter(grp => grp.studentIds && grp.studentIds.length > 0);
    if (validGroups.length === 0) {
      setUiAlert({
        title: 'No Students Assigned',
        message: 'Please drag or assign students into your training group cards before publishing.',
        type: 'warning',
        icon: '👥'
      });
      return;
    }

    const unassignedCoachGroup = validGroups.find(grp => !grp.assignedInstructorId && (!grp.assignedInstructorIds || grp.assignedInstructorIds.length === 0));
    if (unassignedCoachGroup) {
      setUiAlert({
        title: 'Coach Assignment Required',
        message: `Please assign a coach to ${unassignedCoachGroup.name} before publishing. Only groups with an assigned coach can be scheduled.`,
        type: 'warning',
        icon: '🏄‍♂️'
      });
      return;
    }

    // Check for same-time coach conflict across all groups
    for (let i = 0; i < validGroups.length; i++) {
      for (let j = i + 1; j < validGroups.length; j++) {
        const g1 = validGroups[i];
        const g2 = validGroups[j];
        const s1 = slots.find(s => String(s.id) === String(g1.slotId)) || slots[0];
        const s2 = slots.find(s => String(s.id) === String(g2.slotId)) || slots[0];
        const t1 = (s1?.startTime || s1?.time || '').trim().toLowerCase();
        const t2 = (s2?.startTime || s2?.time || '').trim().toLowerCase();
        if (t1 && t2 && t1 === t2) {
          const c1 = g1.assignedInstructorIds || (g1.assignedInstructorId ? [g1.assignedInstructorId] : []);
          const c2 = g2.assignedInstructorIds || (g2.assignedInstructorId ? [g2.assignedInstructorId] : []);
          const duplicateCoachId = c1.find(id => c2.map(String).includes(String(id)));
          if (duplicateCoachId) {
            const coach = allInstructors.find(ins => String(ins.id) === String(duplicateCoachId));
            const coachName = coach ? coach.name : 'A coach';
            setUiAlert({
              title: 'Same-Time Coach Conflict',
              message: `${coachName} cannot be assigned to both ${g1.name} and ${g2.name} at the same time (${s1?.startTime || s1?.time}). Please assign different coaches for concurrent groups or move one group to a different time slot.`,
              type: 'warning',
              icon: '⚠️'
            });
            return;
          }
        }
      }
    }

    setIsPublishing(true);
    let publishedCount = 0;
    try {
      for (const grp of validGroups) {
        const numericStudentIds = grp.studentIds
          .map(sid => {
            if (typeof sid === 'number') return sid;
            const str = String(sid);
            if (str.startsWith('guest-')) {
              const parts = str.split('-');
              return parseInt(parts[1], 10);
            }
            return parseInt(str.replace(/\D/g, ''), 10);
          })
          .filter(id => !isNaN(id) && id > 0);

        if (numericStudentIds.length === 0) continue;

        const studentsData = grp.studentIds
          .map(sid => {
            const found = dbStudents.find(s => String(s.id) === String(sid));
            if (found) {
              const pId = found.parentStudentId || (typeof found.id === 'number' ? found.id : parseInt(String(found.id).replace(/\D/g, ''), 10));
              return {
                student_id: pId,
                student_name: found.name,
                is_guest: Boolean(found.isGuest),
                guest_name: found.isGuest ? found.name : null,
                parent_student_name: found.parentStudentName || null,
              };
            }
            const numId = typeof sid === 'number' ? sid : parseInt(String(sid).replace(/\D/g, ''), 10);
            return {
              student_id: numId,
              student_name: '',
              is_guest: false,
              guest_name: null
            };
          })
          .filter(item => !isNaN(item.student_id) && item.student_id > 0);

        const coachIds = (grp.assignedInstructorIds && grp.assignedInstructorIds.length > 0)
          ? grp.assignedInstructorIds
          : (grp.assignedInstructorId ? [grp.assignedInstructorId] : []);
        const numericCoachIds = coachIds
          .map(cid => typeof cid === 'number' ? cid : parseInt(String(cid).replace(/\D/g, ''), 10))
          .filter(id => !isNaN(id) && id > 0);

        const assignedCoachId = grp.assignedInstructorId || coachIds[0];
        const numericCoachId = typeof assignedCoachId === 'number' ? assignedCoachId : parseInt(String(assignedCoachId).replace(/\D/g, ''), 10);
        const myCoachId = currentUser?.instructor_id || currentUser?.id;
        const primaryInstructorId = (isCoachFreelance && myCoachId)
          ? myCoachId
          : (numericCoachIds[0] || (!isNaN(numericCoachId) ? numericCoachId : (allInstructors[0]?.id || 1)));

        const assignedCoachObjs = allInstructors.filter(i => coachIds.map(String).includes(String(i.id)));
        const assignedCoachObj = allInstructors.find(i => String(i.id) === String(assignedCoachId));
        const coachName = assignedCoachObj?.name || 'Instructor';
        const assignedInstNames = assignedCoachObjs.length > 0
          ? assignedCoachObjs.map(i => i.name).join(', ')
          : coachName;

        const grpSlot = slots.find(s => s.id === grp.slotId) || selectedSlot;
        const slotTimeStr = grpSlot ? (grpSlot.time || grpSlot.startTime) : '08:30 AM - 10:00 AM';
        const slotDuration = grpSlot?.duration ? parseInt(grpSlot.duration, 10) : 90;

        const payload = {
          date: formattedSessionDate,
          time: slotTimeStr,
          duration_mins: slotDuration,
          student_ids: numericStudentIds,
          students_data: studentsData,
          instructor_id: primaryInstructorId,
          location: spotName || 'Main Beach',
          condition: 'Moderate',
          type: grp.level || 'Intermediate',
          status: 'Upcoming',
          notes: `${grp.name} (${slotTimeStr}) - Coaches: ${assignedInstNames || 'Staff'} - ${numericStudentIds.length} students`,
          group_name: grp.name || '',
        };

        // ── EDIT MODE: Update existing sessions via PUT ──
        const existingSessions = editSession ? (Array.isArray(editSession.sessions) && editSession.sessions.length > 0 ? editSession.sessions : (editSession.id ? [editSession] : [])) : [];
        if (existingSessions.length > 0) {
          const grpSlot = slots.find(s => s.id === grp.slotId) || selectedSlot;
          const slotTimeStr = grpSlot ? (grpSlot.time || grpSlot.startTime) : (editSession.time || '08:30 AM');
          const slotDuration = grpSlot?.duration ? parseInt(grpSlot.duration, 10) : 90;
          const coachIds = (grp.assignedInstructorIds && grp.assignedInstructorIds.length > 0)
            ? grp.assignedInstructorIds
            : (grp.assignedInstructorId ? [grp.assignedInstructorId] : []);
          const assignedCoachObjs = allInstructors.filter(i => coachIds.map(String).includes(String(i.id)));
          const assignedCoachObj = allInstructors.find(i => String(i.id) === String(grp.assignedInstructorId || coachIds[0]));
          const coachName = assignedCoachObj?.name || editSession.instructor || 'Instructor';
          const assignedInstNames = assignedCoachObjs.length > 0 ? assignedCoachObjs.map(i => i.name).join(', ') : coachName;
          const primaryInstructorId = coachIds[0] || null;

          const updatePayload = {
            date: formattedSessionDate,
            time: slotTimeStr,
            duration_mins: slotDuration,
            instructor_id: primaryInstructorId,
            instructor: assignedInstNames || coachName,
            location: spotName || editSession.location || 'Main Beach',
            group_name: grp.name || editSession.groupName || '',
          };

          await Promise.all(
            existingSessions.map(sess =>
              fetch(`${API}/api/sessions/${sess.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
              }).catch(err => console.error('Failed updating session', sess.id, err))
            )
          );
          publishedCount++;
          continue;
        }

        // ── CREATE MODE: Bulk create new sessions ──
        const res = await fetch(`${API}/api/sessions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          publishedCount++;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error("Bulk save error:", errData);
        }
      }

      if (publishedCount > 0) {
        if (editSession) {
          if (onSessionCreated) onSessionCreated();
          if (onClose) onClose();
          return;
        }
        setShowSuccessModal(true);
      } else {
        setUiAlert({
          title: 'Publishing Incomplete',
          message: 'No valid groups with assigned students were found to publish.',
          type: 'error',
          icon: '⚠️'
        });
      }
    } catch (e) {
      console.error(e);
      setUiAlert({
        title: 'Save Failed',
        message: 'Error saving session. Please check your connection and try again.',
        type: 'error',
        icon: '⚠️'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Level Badge Color Helper
  const getBadgeStyle = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'beginner') return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
    if (l === 'intermediate') return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    return { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' }; // Advanced
  };

  const renderContent = () => (
    <>
      {/* Top Header & Breadcrumb Stepper */}
      <header className="ns-header" style={isModal ? { padding: '16px 24px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', flexShrink: 0 } : {}}>
        <div className="ns-header-main-row">
          <div className="ns-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentStep > 1 && (
              <button
                type="button"
                className="ns-header-back-btn"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                title={`Back to Step ${currentStep - 1}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1E293B',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span>Back</span>
              </button>
            )}
            <h1 className="ns-title" style={isModal ? { fontSize: '20px' } : {}}>
              {editSession ? 'Edit Session' : (
                currentStep === 1 ? 'Schedule Surf Session' :
                currentStep === 2 ? 'Roster Selector Pool' :
                'Instructor Groups Matching'
              )}
            </h1>
            <span className={`ns-status-tag ${currentStep === 3 ? 'review' : 'upcoming'}`}>
              {currentStep === 3 ? 'Review' : 'Upcoming'}
            </span>
          </div>

          {isModal && (
            <div className="ns-header-close-wrap" style={{ display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                className="ses-modal-close"
                onClick={onClose}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Stepper Navigation */}
        <div className="ns-stepper">
          <div
            className={`ns-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <div className="ns-step-circle">
              {currentStep > 1 ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : '1'}
            </div>
            <span className="ns-step-text">1. Session Setup</span>
            <span className="ns-step-chevron">&gt;</span>
          </div>

          <div
            className={`ns-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(2)}
          >
            <div className="ns-step-circle">
              {currentStep > 2 ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : '2'}
            </div>
            <span className="ns-step-text">2. Select Students</span>
            <span className="ns-step-chevron">&gt;</span>
          </div>

          <div
            className={`ns-step-item ${currentStep === 3 ? 'active' : ''}`}
            onClick={() => setCurrentStep(3)}
          >
            <div className="ns-step-circle">3</div>
            <span className="ns-step-text">3. Assign Instructors</span>
          </div>
        </div>
      </header>

      {/* Main Form Scrollable Container */}
      <div className={isModal ? "ns-modal-body-scroll" : ""} style={isModal ? { padding: '24px 28px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 85px)' } : {}}>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: SESSION SETUP                                           */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="ns-step-content ns-step1-wrap">
            <div className="ns-step1-grid">
              {/* Row 1, Col 1: 1. Select Date */}
              <section className="ns-card ns-step1-date-card">
                <h3 className="ns-card-heading">1. Select Date</h3>
                  <div className="ns-calendar-widget">
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isPrevMonthDisabled = currentCalendarDate.getFullYear() < today.getFullYear() ||
                        (currentCalendarDate.getFullYear() === today.getFullYear() && currentCalendarDate.getMonth() <= today.getMonth());

                      return (
                        <div className="ns-cal-header">
                          <span className="ns-cal-month-title">
                            {currentCalendarDate.toLocaleString('default', { month: 'long' })} {currentCalendarDate.getFullYear()}
                          </span>
                          <div className="ns-cal-arrows">
                            <button
                              type="button"
                              className="ns-cal-arrow-btn"
                              onClick={handlePrevMonth}
                              disabled={isPrevMonthDisabled}
                              style={{ opacity: isPrevMonthDisabled ? 0.35 : 1, cursor: isPrevMonthDisabled ? 'not-allowed' : 'pointer' }}
                              title={isPrevMonthDisabled ? "Cannot navigate to past months" : "Previous Month"}
                            >
                              &larr;
                            </button>
                            <button type="button" className="ns-cal-arrow-btn" onClick={handleNextMonth} title="Next Month">&rarr;</button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="ns-cal-weekdays">
                      <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                    </div>

                    <div className="ns-cal-days-grid">
                      {calendarDays.map((cd, idx) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const year = currentCalendarDate.getFullYear();
                        const month = currentCalendarDate.getMonth();
                        const cellDate = new Date(year, month, cd.day);
                        cellDate.setHours(0, 0, 0, 0);

                        const isPast = cd.isCurrentMonth && cellDate < today;
                        const isSelected = cd.isCurrentMonth && cd.day === selectedDayNumber;

                        return (
                          <div
                            key={idx}
                            className={`ns-cal-day-cell ${!cd.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'disabled-past' : ''}`}
                            style={{
                              opacity: isPast ? 0.3 : (cd.isCurrentMonth ? 1 : 0.4),
                              cursor: (isPast || !cd.isCurrentMonth) ? 'not-allowed' : 'pointer',
                              background: isPast ? '#F1F5F9' : undefined,
                              color: isPast ? '#94A3B8' : undefined,
                              pointerEvents: isPast ? 'none' : 'auto'
                            }}
                            title={isPast ? 'Past dates cannot be selected' : undefined}
                            onClick={() => {
                              if (cd.isCurrentMonth && !isPast) setSelectedDayNumber(cd.day);
                            }}
                          >
                            <span className="ns-cal-day-num" style={isPast ? { textDecoration: 'line-through' } : {}}>{cd.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

              {/* Row 1, Col 2: Available Students Pool */}
              <div className="ns-pool-card ns-step1-pool-card">
                <div>
                  <h3 className="ns-pool-heading">Available Students Pool</h3>
                  <div className="ns-pool-stat-row">
                    <span className="ns-pool-label">Total Registered Students:</span>
                    <span className="ns-pool-val">{allPoolStudents.length}</span>
                  </div>
                  <div className="ns-pool-breakdown">
                    <div className="ns-pool-item">
                      <span className="ns-pool-bullet">&bull;</span>
                      <span className="ns-pool-item-name">Beginner Students</span>
                      <span className="ns-pool-item-num">
                        {allPoolStudents.filter(s => s.level?.toLowerCase() === 'beginner').length}
                      </span>
                    </div>
                    <div className="ns-pool-item">
                      <span className="ns-pool-bullet">&bull;</span>
                      <span className="ns-pool-item-name">Intermediate Students</span>
                      <span className="ns-pool-item-num">
                        {allPoolStudents.filter(s => s.level?.toLowerCase() === 'intermediate').length}
                      </span>
                    </div>
                    <div className="ns-pool-item">
                      <span className="ns-pool-bullet">&bull;</span>
                      <span className="ns-pool-item-name">Advanced Students</span>
                      <span className="ns-pool-item-num">
                        {allPoolStudents.filter(s => s.level?.toLowerCase() === 'advanced').length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ns-pool-footer" style={{ marginTop: '16px' }}>
                  <span>Selected Roster Count:</span>
                  <span className="ns-pool-space">{allSelectedStudentIds.length}/{capacity || 30} Students Selected</span>
                </div>
              </div>

              {/* Row 2 (Full Width): 2. Choose Time Slot */}
              <section className="ns-card ns-step1-slots-card" style={{ gridColumn: '1 / -1' }}>
                <div className="ns-slots-header-row">
                  <h3 className="ns-card-heading" style={{ margin: 0 }}>2. Choose Time Slot & Capacity</h3>
                  <button
                    type="button"
                    className="ns-config-link-btn"
                    onClick={() => navigate('/sessions/configure?from=new_session')}
                    title="Manage daily time slots, durations, and operational days in Session Configuration"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Session Configuration</span>
                  </button>
                </div>

                <div className="ns-slots-list">
                  {slots.map(slot => {
                    const isSelected = slot.id === selectedSlotId;
                    const isDayMatch = slot.days && slot.days.includes(selectedDayOfWeek);
                    const slotCap = getSlotCapacity(slot);
                    return (
                      <div
                        key={slot.id}
                        className={`ns-slot-card ${isSelected ? 'selected' : ''} ${!slot.active ? 'is-inactive' : ''}`}
                        onClick={() => handleSelectSlot(slot)}
                      >
                        <div className="ns-slot-left">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h4 className="ns-slot-time">{slot.time}</h4>
                            {!slot.active ? (
                              <span className="ns-slot-pill inactive">Inactive in Settings</span>
                            ) : isDayMatch ? (
                              <span className="ns-slot-pill active-day">✓ Active ({selectedDayOfWeek})</span>
                            ) : (
                              <span className="ns-slot-pill off-day">Off today ({selectedDayOfWeek})</span>
                            )}
                          </div>
                          <p className="ns-slot-sub">{slot.title}</p>
                        </div>

                        {/* Set Session Capacity directly on each slot card */}
                        <div
                          className="ns-slot-capacity-control"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSlot(slot);
                          }}
                          title="Set session capacity for this time slot"
                        >
                          <div className="ns-slot-cap-text">
                            <span className="ns-slot-cap-label">Capacity</span>
                            <span className="ns-slot-cap-count">
                              <strong>{slotCap || 0}</strong> Students
                            </span>
                          </div>
                          <div className="ns-slot-cap-stepper">
                            <button
                              type="button"
                              className="ns-slot-stepper-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSlot(slot);
                                const cur = parseInt(slotCap, 10) || 1;
                                handleUpdateSlotCapacity(slot.id, Math.max(1, cur - 1));
                              }}
                              title="Decrease capacity"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={slotCap}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleSelectSlot(slot);
                                if (val === '') {
                                  handleUpdateSlotCapacity(slot.id, '');
                                } else {
                                  const num = parseInt(val, 10);
                                  handleUpdateSlotCapacity(slot.id, isNaN(num) ? '' : Math.max(1, num));
                                }
                              }}
                              onBlur={() => {
                                if (!slotCap || parseInt(slotCap, 10) < 1) {
                                  handleUpdateSlotCapacity(slot.id, parseInt(slot.maxStudents, 10) || 4);
                                }
                              }}
                              className="ns-slot-stepper-input"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSlot(slot);
                              }}
                              title="Type slot capacity directly"
                            />
                            <button
                              type="button"
                              className="ns-slot-stepper-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSlot(slot);
                                const cur = parseInt(slotCap, 10) || 0;
                                handleUpdateSlotCapacity(slot.id, cur + 1);
                              }}
                              title="Increase capacity"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className="ns-add-slot-card"
                    onClick={() => {
                      const nextTime = getNextAvailableSlotTime(slots);
                      setEditingSlotModal({
                        mode: 'add',
                        id: Date.now(),
                        time: nextTime,
                        duration: 90,
                        maxStudents: 4,
                        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                        active: true,
                      });
                    }}
                  >
                    + Add Slot
                  </div>
                </div>
              </section>
            </div>

          {/* Sticky Floating Bottom Action Bar for Step 1 */}
          <div className="ns-sticky-bar" style={{ position: 'sticky', bottom: '0px', zIndex: 99, marginTop: '24px' }}>
            <div className="ns-sb-left">
              <span className="ns-sb-target-label" style={{ background: '#0D9488', color: '#FFF', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                SESSION SETUP
              </span>
              <span className="ns-sb-capacity" style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>
                📅 {formattedSessionDate} &bull; ⏰ {selectedSlot ? (selectedSlot.startTime || selectedSlot.time) : 'Select Time Slot'} &bull; 🎯 Capacity: {capacity} Students
              </span>
            </div>

            <div className="ns-sb-right">
              <button
                type="button"
                className="ns-primary-btn"
                onClick={() => {
                  const isSelectedActiveForToday = selectedSlotId && activeSlotsForDay.some(s => s.id === selectedSlotId);
                  if (!isSelectedActiveForToday) {
                    const firstActive = activeSlotsForDay[0] || slots.find(s => s.active !== false) || slots[0];
                    if (firstActive) setSelectedSlotId(firstActive.id);
                  }
                  setCurrentStep(2);
                }}
                style={{
                  background: '#00D2B4',
                  color: '#0F172A',
                  border: 'none',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 210, 180, 0.4)',
                  transition: 'all 0.15s ease'
                }}
              >
                {editSession ? 'Confirm Date & Slot → Review Groups' : 'Save configuration and Next: Import Students »'}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: IMPORT STUDENTS IN SPECIFIC SLOTS                      */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="ns-step-content ns-step2-wrap">
            {/* Selected Session Info Banner */}
            <div className="ns-selected-banner">
              <span className="ns-banner-icon">📅</span>
              <span className="ns-banner-text">
                Selected Session: <strong>{formattedSessionDate}</strong> | Time Slot: <strong>{selectedSlot ? (selectedSlot.startTime || selectedSlot.time) : 'Not Selected'}</strong>
              </span>
            </div>

            {/* Filter & Slot Selection Bar */}
            <div className="ns-filters-card">
              {/* Slot Selection Row (Moved to Top for High Visibility) */}
              <div className="ns-filter-row ns-slot-filter-row">
                <span className="ns-filter-label" style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⏰</span> Select Time Slot:
                </span>
                <div className="ns-slot-pills-wrap">
                  {activeSlotsForDay.map((s, idx) => {
                    const isSelected = selectedSlotId === s.id;
                    const theme = getSlotThemeForSlot(s.id);
                    const count = (slotStudentMap[s.id] || []).length;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`ns-slot-pill-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedSlotId(s.id);
                          setSelectedSlotStep2(idx + 1);
                        }}
                        style={isSelected ? {
                          background: '#0F172A',
                          borderColor: '#0F172A',
                          borderWidth: '1.5px',
                          color: '#FFFFFF',
                          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
                        } : {
                          background: '#FFFFFF',
                          borderColor: count > 0 ? '#94A3B8' : '#CBD5E1',
                          color: count > 0 ? '#0F172A' : '#475569'
                        }}
                        title={`${s.time} (${count} ${count === 1 ? 'Student' : 'Students'} assigned)`}
                      >
                        <span className="ns-slot-pill-num" style={{
                          background: isSelected ? 'rgba(255,255,255,0.2)' : count > 0 ? '#0F172A' : '#94A3B8',
                          color: '#FFFFFF'
                        }}>
                          {idx + 1}
                        </span>
                        <span className="ns-slot-pill-time" style={{ fontWeight: 700 }}>
                          {s.startTime || s.time || `Slot ${idx + 1}`}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isSelected ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                          color: isSelected ? '#FFFFFF' : '#475569'
                        }}>
                          {count} {count === 1 ? 'Student' : 'Students'}
                        </span>
                      </button>
                    );
                  })}
                  {activeSlotsForDay.length === 0 && (
                    <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600 }}>
                      ⚠️ No active time slots for {selectedDayOfWeek}
                    </span>
                  )}
                </div>
              </div>

              {/* Filter by Level */}
              <div className="ns-filter-row" style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                <span className="ns-filter-label">Filter by Level:</span>
                <div className="ns-pill-group">
                  <button
                    className={`ns-pill ${levelFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('all')}
                  >
                    All Students ({allPoolStudents.length})
                  </button>
                  <button
                    className={`ns-pill ${levelFilter === 'beginner' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('beginner')}
                  >
                    Beginner ({allPoolStudents.filter(s => s.level.toLowerCase() === 'beginner').length})
                  </button>
                  <button
                    className={`ns-pill ${levelFilter === 'intermediate' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('intermediate')}
                  >
                    Intermediate ({allPoolStudents.filter(s => s.level.toLowerCase() === 'intermediate').length})
                  </button>
                  <button
                    className={`ns-pill ${levelFilter === 'advanced' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('advanced')}
                  >
                    Advanced ({allPoolStudents.filter(s => s.level.toLowerCase() === 'advanced').length})
                  </button>
                </div>
              </div>

              {/* Mobile More Filters Toggle Button */}
              <div className="ns-more-filters-bar">
                <button
                  type="button"
                  className="ns-more-filters-toggle"
                  onClick={() => setShowMoreFiltersMobile(prev => !prev)}
                >
                  <span>{showMoreFiltersMobile ? '▲ Fewer Filters' : '▼ More Filters (Day, Gender, Swimming)'}</span>
                  {(courseDayFilter !== 'all' || genderFilterStep2 !== 'all' || swimmingFilterStep2 !== 'all') && (
                    <span className="ns-active-filter-badge">Active</span>
                  )}
                </button>
              </div>

              {/* Filter by Day (Which Day Athlete is Attending) */}
              <div className={`ns-filter-row ns-extra-filter ${showMoreFiltersMobile ? 'show' : ''}`} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                <span className="ns-filter-label">Filter by Day:</span>
                <div className="ns-pill-group" style={{ flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    className={`ns-pill ${courseDayFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setCourseDayFilter('all')}
                  >
                    All Days ({allPoolStudents.length})
                  </button>
                  {availableDays.map(d => {
                    const count = allPoolStudents.filter(s => String(s.whichDay) === String(d)).length;
                    return (
                      <button
                        key={d}
                        className={`ns-pill ${String(courseDayFilter) === String(d) ? 'active' : ''}`}
                        onClick={() => setCourseDayFilter(String(d))}
                      >
                        Day {d} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter by Gender */}
              <div className={`ns-filter-row ns-extra-filter ${showMoreFiltersMobile ? 'show' : ''}`} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                <span className="ns-filter-label">Filter by Gender:</span>
                <div className="ns-pill-group" style={{ flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    className={`ns-pill ${genderFilterStep2 === 'all' ? 'active' : ''}`}
                    onClick={() => setGenderFilterStep2('all')}
                  >
                    All Genders ({allPoolStudents.length})
                  </button>
                  <button
                    className={`ns-pill ${genderFilterStep2 === 'male' ? 'active' : ''}`}
                    onClick={() => setGenderFilterStep2('male')}
                  >
                    Male ({allPoolStudents.filter(s => (s.gender || 'male').toLowerCase() === 'male').length})
                  </button>
                  <button
                    className={`ns-pill ${genderFilterStep2 === 'female' ? 'active' : ''}`}
                    onClick={() => setGenderFilterStep2('female')}
                  >
                    Female ({allPoolStudents.filter(s => (s.gender || '').toLowerCase() === 'female').length})
                  </button>
                </div>
              </div>

              {/* Filter by Swimming Ability */}
              <div className={`ns-filter-row ns-extra-filter ${showMoreFiltersMobile ? 'show' : ''}`} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                <span className="ns-filter-label">Swimming Ability:</span>
                <div className="ns-pill-group" style={{ flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    className={`ns-pill ${swimmingFilterStep2 === 'all' ? 'active' : ''}`}
                    onClick={() => setSwimmingFilterStep2('all')}
                  >
                    All ({allPoolStudents.length})
                  </button>
                  <button
                    className={`ns-pill ${swimmingFilterStep2 === 'swimmer' ? 'active' : ''}`}
                    onClick={() => setSwimmingFilterStep2('swimmer')}
                  >
                    🏊 Swimmer ({allPoolStudents.filter(s => !(s.swimming_ability || '').toLowerCase().includes('non') && (s.swimming_ability || '').toLowerCase() !== 'no').length})
                  </button>
                  <button
                    className={`ns-pill ${swimmingFilterStep2 === 'non-swimmer' ? 'active' : ''}`}
                    onClick={() => setSwimmingFilterStep2('non-swimmer')}
                  >
                    🤿 Non-Swimmer ({allPoolStudents.filter(s => (s.swimming_ability || '').toLowerCase().includes('non') || (s.swimming_ability || '').toLowerCase() === 'no').length})
                  </button>
                </div>
              </div>

              {/* Search Student */}
              <div className="ns-filter-row" style={{ marginTop: '12px' }}>
                <span className="ns-filter-label">Search Student:</span>
                <input
                  type="text"
                  className="ns-search-student-input"
                  placeholder="Filter by student name..."
                  value={studentSearchStep2}
                  onChange={(e) => setStudentSearchStep2(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    minWidth: '260px'
                  }}
                />
              </div>
            </div>

            {/* Real School Student Roster (NO fake data) */}
            <div className="ns-pool-section">
              {(() => {
                const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
                const activeSlot = slots.find(s => s.id === activeSlotId) || selectedSlot;
                const slotCap = getSlotCapacity(activeSlot);
                const currentSlotList = slotStudentMap[activeSlotId] || [];
                const visibleIds = filteredStudents.map(s => s.id);
                const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => currentSlotList.includes(id));
                const isSlotFull = currentSlotList.length >= slotCap;

                return (
                  <div className="ns-pool-section-header">
                    <div className="ns-ps-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="ns-ps-icon">📋</span>
                      <span className="ns-ps-title">School Student Roster</span>
                      <span className="ns-ps-count">({filteredStudents.length} available)</span>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: isSlotFull ? '#FEE2E2' : '#E0F2FE',
                        color: isSlotFull ? '#DC2626' : '#0284C7',
                        border: `1px solid ${isSlotFull ? '#FECACA' : '#BAE6FD'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        🎯 Slot Capacity: {currentSlotList.length}/{slotCap} {isSlotFull ? '(FULL)' : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`ns-select-all-btn ${isAllSelected ? 'deselect' : ''}`}
                      onClick={() => {
                        if (!activeSlotId) return;
                        if (isAllSelected) {
                          setSlotStudentMap(prevMap => {
                            const newMap = { ...prevMap };
                            newMap[activeSlotId] = (newMap[activeSlotId] || []).filter(id => !visibleIds.includes(id));
                            return newMap;
                          });
                        } else {
                          if (currentSlotList.length >= slotCap) {
                            setUiAlert({
                              title: 'Slot Capacity Limit Reached',
                              message: `This slot (${activeSlot?.startTime || activeSlot?.time || 'selected'}) has already reached its capacity limit of ${slotCap} students. You cannot add more students.`,
                              type: 'warning',
                              icon: '⚠️'
                            });
                            return;
                          }

                          const remainingSpots = slotCap - currentSlotList.length;
                          const idsToAdd = visibleIds.filter(id => !currentSlotList.includes(id)).slice(0, remainingSpots);
                          if (idsToAdd.length === 0) return;

                          setSlotStudentMap(prevMap => {
                            const newMap = { ...prevMap };
                            Object.keys(newMap).forEach(sId => {
                              if (Array.isArray(newMap[sId])) {
                                newMap[sId] = newMap[sId].filter(id => !idsToAdd.includes(id));
                              }
                            });
                            newMap[activeSlotId] = Array.from(new Set([...(newMap[activeSlotId] || []), ...idsToAdd]));
                            return newMap;
                          });

                          if (visibleIds.filter(id => !currentSlotList.includes(id)).length > remainingSpots) {
                            setUiAlert({
                              title: 'Slot Capacity Reached',
                              message: `Selected ${remainingSpots} student(s) to reach the maximum capacity of ${slotCap} for this slot.`,
                              type: 'info',
                              icon: 'ℹ️'
                            });
                          }
                        }
                      }}
                    >
                      {isAllSelected ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          <span>Select All</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}

              {filteredStudents.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  No students found matching your criteria.
                </div>
              ) : (
                <div className="ns-student-grid">
                  {filteredStudents.map(student => {
                    const badge = getBadgeStyle(student.level);
                    const isSelectedFilterMatch = courseDayFilter !== 'all' && String(student.whichDay) === String(courseDayFilter);
                    const assignment = getStudentSlotAssignment(student.id);
                    const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
                    const isCurrentSlotStudent = assignment && String(assignment.slot.id) === String(activeSlotId);
                    const isOtherSlotStudent = assignment && String(assignment.slot.id) !== String(activeSlotId);
                    const isChecked = isCurrentSlotStudent;
                    const isScheduledInDb = isStudentScheduledInDbOnDate(student);

                    const cardStyle = () => {
                      return {
                        background: student.isGuest
                          ? (isCurrentSlotStudent ? '#F0F9FF' : isOtherSlotStudent ? '#F8FAFC' : '#F8FAFC')
                          : (isCurrentSlotStudent ? '#FFFFFF' : isOtherSlotStudent ? '#F8FAFC' : '#FFFFFF'),
                        border: isCurrentSlotStudent
                          ? (student.isGuest ? '1.5px solid #0284C7' : '1.5px solid #0F172A')
                          : isOtherSlotStudent
                          ? '1.5px dashed #CBD5E1'
                          : student.isGuest
                          ? '1.5px solid #BAE6FD'
                          : '1.5px solid #E2E8F0',
                        borderLeft: student.isGuest
                          ? (isCurrentSlotStudent ? '4px solid #0284C7' : '4px solid #38BDF8')
                          : undefined,
                        boxShadow: isCurrentSlotStudent ? '0 1px 4px rgba(15, 23, 42, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                        opacity: isOtherSlotStudent ? 0.72 : 1,
                        transition: 'all 0.15s ease',
                        cursor: 'pointer'
                      };
                    };

                    return (
                      <div
                        key={student.id}
                        className={`ns-student-row ${isChecked ? 'selected' : ''} ${student.isGuest ? 'ns-guest-row' : ''}`}
                        onClick={() => toggleSelectStudent(student.id)}
                        style={cardStyle()}
                      >
                        {/* Left Side: Checkbox + Avatar + Student Name */}
                        <div className="ns-student-row-left">
                          {student.isGuest && (
                            <span
                              className="ns-guest-arrow"
                              style={{
                                fontSize: '12px',
                                color: '#0284C7',
                                fontWeight: 800,
                                lineHeight: 1,
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                              title={`Accompanying Guest of ${student.parentStudentName}`}
                            >
                              ↳
                            </span>
                          )}

                          {/* Checkbox Icon */}
                          <div
                            className="ns-student-check-circle"
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: isCurrentSlotStudent
                                ? (student.isGuest ? '2px solid #0284C7' : '2px solid #0F172A')
                                : isOtherSlotStudent
                                ? '2px solid #94A3B8'
                                : isScheduledInDb
                                ? '2px solid #D97706'
                                : student.isGuest
                                ? '2px solid #7DD3FC'
                                : '2px solid #CBD5E1',
                              background: isCurrentSlotStudent
                                ? (student.isGuest ? '#0284C7' : '#0F172A')
                                : isOtherSlotStudent
                                ? '#E2E8F0'
                                : isScheduledInDb
                                ? '#D97706'
                                : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isCurrentSlotStudent && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {isOtherSlotStudent && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {!isCurrentSlotStudent && !isOtherSlotStudent && isScheduledInDb && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>

                          <UserAvatar src={student.avatar} name={student.name} size={student.isGuest ? 24 : 28} className="ns-student-avatar" />

                          <div className="ns-student-name-box">
                            <span className="ns-student-name" style={{
                              fontWeight: (isChecked || isScheduledInDb) ? 800 : 600,
                              color: '#0F172A',
                              fontSize: student.isGuest ? '13px' : '13.5px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {student.name}
                            </span>
                            {student.isGuest && (
                              <span
                                className="ns-guest-tag"
                                title={`Accompanying Guest of ${student.parentStudentName}`}
                              >
                                👥 Guest {student.guestIndex} ({student.parentStudentName})
                              </span>
                            )}
                          </div>

                          {/* Desktop Only: Swimming Ability Badge */}
                          <span className="ns-hide-mobile" style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: student.swimming_ability?.toLowerCase() === 'non-swimmer' ? '#D97706' : '#0D9488',
                            background: student.swimming_ability?.toLowerCase() === 'non-swimmer' ? '#FEF3C7' : '#ECFDF5',
                            border: `1px solid ${student.swimming_ability?.toLowerCase() === 'non-swimmer' ? '#FDE68A' : '#A7F3D0'}`,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            flexShrink: 0
                          }}>
                            {student.swimming_ability?.toLowerCase() === 'non-swimmer' ? '🤿 Non-Swimmer' : '🏊 Swimmer'}
                          </span>

                          {/* Desktop Only: Day Target Badge */}
                          {isSelectedFilterMatch && (
                            <span className="ns-hide-mobile" style={{
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              color: '#FFFFFF',
                              padding: '2px 7px',
                              borderRadius: '20px',
                              fontSize: '9.5px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ⚡ DAY {courseDayFilter} TARGET
                            </span>
                          )}
                        </div>

                        {/* Right Columns Container */}
                        <div className="ns-student-row-right">
                          {/* Column 1: Slot Status (on mobile: HIDE if Not Selected to keep it simple & compact) */}
                          <div className={`ns-student-col-slot ${(!isCurrentSlotStudent && !isOtherSlotStudent && !isScheduledInDb) ? 'ns-hide-mobile' : ''}`}>
                            {isCurrentSlotStudent && assignment ? (
                              <span className="ns-slot-badge-assigned" style={{
                                background: '#0F172A',
                                color: '#FFFFFF',
                                border: '1px solid #0F172A',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}>
                                ✓ {assignment.slot.startTime || assignment.slot.time}
                              </span>
                            ) : isOtherSlotStudent && assignment ? (
                              <span className="ns-slot-badge-other" style={{
                                background: '#F1F5F9',
                                color: '#64748B',
                                border: '1px dashed #CBD5E1',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }} title="Assigned to another time slot. Click row to move to this slot.">
                                ⏰ {assignment.slot.startTime || assignment.slot.time}
                              </span>
                            ) : isScheduledInDb ? (
                              <span className="ns-slot-badge-scheduled" style={{
                                background: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}>
                                ✓ Sched
                              </span>
                            ) : (
                              <span className="ns-slot-badge-empty ns-hide-mobile" style={{
                                background: '#F8FAFC',
                                color: '#94A3B8',
                                padding: '4px 10px',
                                borderRadius: '14px',
                                fontSize: '11px',
                                fontWeight: 600,
                                border: '1px dashed #CBD5E1',
                                whiteSpace: 'nowrap'
                              }}>
                                Not Selected
                              </span>
                            )}
                          </div>

                          {/* Column 2: Day Badge */}
                          <div className="ns-student-col-day">
                            <span
                              className="ns-day-progress-badge"
                              style={{
                                background: '#F1F5F9',
                                color: '#475569',
                                fontWeight: 600,
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '10px',
                                border: '1px solid #E2E8F0',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span className="ns-hide-mobile">📅 </span>Day {student.whichDay}/{student.totalDays}
                            </span>
                          </div>

                          {/* Column 3: Course Duration (Desktop Only) */}
                          <div className="ns-student-col-course ns-hide-mobile">
                            <span
                              className="ns-student-group-label"
                              style={{
                                fontSize: '12.5px',
                                color: '#64748B',
                                fontWeight: 500,
                                margin: 0,
                                whiteSpace: 'nowrap',
                                textAlign: 'center'
                              }}
                            >
                              {student.courseDuration || student.waitlistGroup || `${student.totalDays} Days Course`}
                            </span>
                          </div>

                          {/* Column 4: Level Badge */}
                          <div className="ns-student-col-level">
                            <span
                              className="ns-level-badge"
                              style={{
                                backgroundColor: badge.bg,
                                color: badge.text,
                                borderColor: badge.border,
                                margin: 0,
                                textAlign: 'center',
                                display: 'inline-block'
                              }}
                            >
                              {student.level}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Sticky Target Bar */}
            <div className="ns-sticky-bar">
              {(() => {
                const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
                const activeSlot = slots.find(s => s.id === activeSlotId) || selectedSlot;
                const slotCap = getSlotCapacity(activeSlot);
                const currentSlotCount = (slotStudentMap[activeSlotId] || []).length;
                const isOver = currentSlotCount > slotCap;

                return (
                  <div className="ns-sb-left">
                    <span className="ns-sb-target-label ns-hide-mobile" style={isOver ? { background: '#EF4444', color: '#FFFFFF' } : {}}>
                      {isOver ? 'CAPACITY EXCEEDED' : 'SELECTED ROSTER'}
                    </span>
                    <span className="ns-sb-capacity" style={{ fontSize: '14px', fontWeight: 800, color: isOver ? '#FCA5A5' : '#FFFFFF' }}>
                      <span className="ns-hide-mobile">Total </span>
                      {allSelectedStudentIds.length}/{slotCap}
                      <span className="ns-hide-mobile"> Students Selected</span>
                      <span className="ns-show-mobile"> Selected</span>
                    </span>
                  </div>
                );
              })()}

              <div className="ns-sb-center ns-hide-mobile">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {slots.filter(s => (slotStudentMap[s.id] || []).length > 0).map((s) => {
                    const theme = getSlotThemeForSlot(s.id);
                    const count = slotStudentMap[s.id].length;
                    return (
                      <span key={s.id} style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        background: 'rgba(255, 255, 255, 0.14)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.22)',
                        padding: '4px 12px',
                        borderRadius: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        ⏰ {s.startTime || s.time}: <strong>{count} {count === 1 ? 'Student' : 'Students'}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="ns-sb-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="ns-sb-back-btn"
                  onClick={() => setCurrentStep(1)}
                  title="Back to Session Setup"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                >
                  <span className="ns-hide-mobile">← Back to Session Setup</span>
                  <span className="ns-show-mobile">← Back</span>
                </button>
                <button
                  className="ns-primary-btn"
                  onClick={proceedToStep3}
                >
                  <span className="ns-hide-mobile">Import Selected in &amp; Next</span>
                  <span className="ns-show-mobile">Next →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* STEP 3: ASSIGN INSTRUCTORS (INSTRUCTOR GROUPS MATCHING)         */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="ns-step-content ns-step3-wrap">
            {/* Selected Session Info Banner */}
            <div className="ns-selected-banner">
              <span className="ns-banner-icon">📅</span>
              <span className="ns-banner-text">
                Selected Session: <strong>{formattedSessionDate}</strong> | Active Filter: <strong>{slots.find(s => s.id === step3SlotFilter)?.startTime || slots.find(s => s.id === step3SlotFilter)?.time || 'Selected Slot'}</strong>
              </span>
            </div>

            {/* Stat Summary Cards */}
            <div className="ns-step3-stats-grid">
              <div className="ns-stat-card">
                <h2 className="ns-sc-value">{importedStudents.length}</h2>
                <span className="ns-sc-label">Students Imported</span>
              </div>
              <div className="ns-stat-card">
                <h2 className="ns-sc-value">{allInstructors.length}</h2>
                <span className="ns-sc-label">Active Instructors</span>
              </div>
            </div>

            {/* Slot Selection Row (Identical to Step 2) */}
            <div className="ns-filters-card" style={{ marginBottom: '20px' }}>
              <div className="ns-filter-row ns-slot-filter-row">
                <span className="ns-filter-label" style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⏰</span> Select Time Slot:
                </span>
                <div className="ns-slot-pills-wrap">
                  {/* Individual Active Slots */}
                  {activeSlotsForDay.map((s, idx) => {
                    const isSelected = step3SlotFilter === s.id;
                    const theme = getSlotThemeForSlot(s.id);
                    const count = (slotStudentMap[s.id] || []).length;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`ns-slot-pill-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setStep3SlotFilter(s.id);
                          setSelectedSlotId(s.id);
                          if (editSession) {
                            setTrainingGroups(prev => prev.map(g => (g.id === 'group-edit-1' || prev.length === 1) ? { ...g, slotId: s.id } : g));
                            setSlotStudentMap(prev => {
                              const newMap = { ...prev };
                              const allGroupStudents = trainingGroups[0]?.studentIds || [];
                              Object.keys(newMap).forEach(k => {
                                if (Array.isArray(newMap[k])) {
                                  newMap[k] = newMap[k].filter(id => !allGroupStudents.includes(id));
                                }
                              });
                              newMap[s.id] = allGroupStudents;
                              return newMap;
                            });
                          }
                          // Auto-target the group belonging to the new slot so coach clicks assign to this slot
                          const groupsInNewSlot = trainingGroups.filter(g => String(g.slotId || slots[0]?.id) === String(s.id));
                          if (groupsInNewSlot.length > 0) {
                            setActiveDropGroupId(groupsInNewSlot[0].id);
                          } else {
                            setActiveDropGroupId(null);
                          }
                        }}
                        style={isSelected ? {
                          background: '#0F172A',
                          borderColor: '#0F172A',
                          borderWidth: '1.5px',
                          color: '#FFFFFF',
                          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
                        } : {
                          background: '#FFFFFF',
                          borderColor: count > 0 ? '#94A3B8' : '#CBD5E1',
                          color: count > 0 ? '#0F172A' : '#475569'
                        }}
                        title={`${s.time} (${count} ${count === 1 ? 'Student' : 'Students'} assigned)`}
                      >
                        <span className="ns-slot-pill-num" style={{
                          background: isSelected ? 'rgba(255,255,255,0.2)' : count > 0 ? '#0F172A' : '#94A3B8',
                          color: '#FFFFFF'
                        }}>
                          {idx + 1}
                        </span>
                        <span className="ns-slot-pill-time" style={{ fontWeight: 700 }}>
                          {s.startTime || s.time || `Slot ${idx + 1}`}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isSelected ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                          color: isSelected ? '#FFFFFF' : '#475569'
                        }}>
                          {count} {count === 1 ? 'Student' : 'Students'}
                        </span>
                      </button>
                    );
                  })}
                  {activeSlotsForDay.length === 0 && (
                    <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600 }}>
                      ⚠️ No active time slots for {selectedDayOfWeek}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3-Column Workspace */}
            <div className="ns-step3-workspace">
              {/* Column 1: Students List (Draggable Source + Dropzone to unassign) */}
              <div
                className="ns-ws-col ns-ws-col-students"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={handleDropOnColumn1}
              >
                <div className="ns-col-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="ns-col-title">Students List</h3>
                    <span className="ns-col-badge">{filteredColumn1Students.length} Students</span>
                  </div>
                  {hasActiveStep3Filters && (
                    <button
                      type="button"
                      onClick={resetStep3Filters}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284C7',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Reset all filters"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                      Reset
                    </button>
                  )}
                </div>

                {/* Filter Toolbar: Day, Status, Level, Gender, Swimming */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '6px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Day Filter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      <span>📅</span> Day
                    </label>
                    <select
                      value={step3DayFilter}
                      onChange={(e) => setStep3DayFilter(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 4px',
                        fontSize: '11px',
                        fontWeight: step3DayFilter !== 'all' ? 700 : 500,
                        color: step3DayFilter !== 'all' ? '#0284C7' : '#0F172A',
                        background: step3DayFilter !== 'all' ? '#F0F9FF' : '#F8FAFC',
                        border: `1.5px solid ${step3DayFilter !== 'all' ? '#0284C7' : '#CBD5E1'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="all">All ({slotImportedStudents.length})</option>
                      {step3AvailableDays.map(d => {
                        const count = slotImportedStudents.filter(s => String(s.whichDay) === String(d)).length;
                        return (
                          <option key={d} value={String(d)}>
                            Day {d} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      <span>⚡</span> Status
                    </label>
                    <select
                      value={step3StatusFilter}
                      onChange={(e) => setStep3StatusFilter(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 4px',
                        fontSize: '11px',
                        fontWeight: step3StatusFilter !== 'all' ? 700 : 500,
                        color: step3StatusFilter !== 'all' ? '#0284C7' : '#0F172A',
                        background: step3StatusFilter !== 'all' ? '#F0F9FF' : '#F8FAFC',
                        border: `1.5px solid ${step3StatusFilter !== 'all' ? '#0284C7' : '#CBD5E1'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="all">All ({slotImportedStudents.length})</option>
                      <option value="unassigned">
                        Unassigned ({slotImportedStudents.filter(s => !trainingGroups.some(g => g.studentIds.includes(s.id))).length})
                      </option>
                      <option value="assigned">
                        Assigned ({slotImportedStudents.filter(s => trainingGroups.some(g => g.studentIds.includes(s.id))).length})
                      </option>
                    </select>
                  </div>

                  {/* Level Filter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      <span>🎯</span> Level
                    </label>
                    <select
                      value={step3LevelFilter}
                      onChange={(e) => setStep3LevelFilter(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 4px',
                        fontSize: '11px',
                        fontWeight: step3LevelFilter !== 'all' ? 700 : 500,
                        color: step3LevelFilter !== 'all' ? '#0284C7' : '#0F172A',
                        background: step3LevelFilter !== 'all' ? '#F0F9FF' : '#F8FAFC',
                        border: `1.5px solid ${step3LevelFilter !== 'all' ? '#0284C7' : '#CBD5E1'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="all">All ({slotImportedStudents.length})</option>
                      <option value="beginner">
                        Beginner ({slotImportedStudents.filter(s => (s.level || '').toLowerCase() === 'beginner').length})
                      </option>
                      <option value="intermediate">
                        Inter. ({slotImportedStudents.filter(s => (s.level || '').toLowerCase() === 'intermediate').length})
                      </option>
                      <option value="advanced">
                        Adv. ({slotImportedStudents.filter(s => (s.level || '').toLowerCase() === 'advanced').length})
                      </option>
                    </select>
                  </div>

                  {/* Gender Filter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      <span>👤</span> Gender
                    </label>
                    <select
                      value={step3GenderFilter}
                      onChange={(e) => setStep3GenderFilter(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 4px',
                        fontSize: '11px',
                        fontWeight: step3GenderFilter !== 'all' ? 700 : 500,
                        color: step3GenderFilter !== 'all' ? '#0284C7' : '#0F172A',
                        background: step3GenderFilter !== 'all' ? '#F0F9FF' : '#F8FAFC',
                        border: `1.5px solid ${step3GenderFilter !== 'all' ? '#0284C7' : '#CBD5E1'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="all">All ({slotImportedStudents.length})</option>
                      <option value="male">
                        Male ({slotImportedStudents.filter(s => (s.gender || 'male').toLowerCase() === 'male').length})
                      </option>
                      <option value="female">
                        Female ({slotImportedStudents.filter(s => (s.gender || '').toLowerCase() === 'female').length})
                      </option>
                    </select>
                  </div>

                  {/* Swimming Filter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      <span>🏊</span> Swim
                    </label>
                    <select
                      value={step3SwimmingFilter}
                      onChange={(e) => setStep3SwimmingFilter(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 4px',
                        fontSize: '11px',
                        fontWeight: step3SwimmingFilter !== 'all' ? 700 : 500,
                        color: step3SwimmingFilter !== 'all' ? '#0284C7' : '#0F172A',
                        background: step3SwimmingFilter !== 'all' ? '#F0F9FF' : '#F8FAFC',
                        border: `1.5px solid ${step3SwimmingFilter !== 'all' ? '#0284C7' : '#CBD5E1'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="all">All ({slotImportedStudents.length})</option>
                      <option value="swimmer">
                        Swimmer ({slotImportedStudents.filter(s => !(s.swimming_ability || '').toLowerCase().includes('non') && (s.swimming_ability || '').toLowerCase() !== 'no').length})
                      </option>
                      <option value="non-swimmer">
                        Non-Swim ({slotImportedStudents.filter(s => (s.swimming_ability || '').toLowerCase().includes('non') || (s.swimming_ability || '').toLowerCase() === 'no').length})
                      </option>
                    </select>
                  </div>
                </div>

                {/* Search */}
                <div className="ns-ws-search">
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                {/* Helper Tip */}
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>💡</span> Drag students directly into Group Cards on the right.
                </div>

                {/* Students Checklist */}
                <div className="ns-ws-student-list">
                  {filteredColumn1Students.length === 0 ? (
                    <div style={{ padding: '28px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '22px' }}>🔍</span>
                      <span>No students found matching current filters.</span>
                      {hasActiveStep3Filters && (
                        <button
                          type="button"
                          onClick={resetStep3Filters}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#0284C7',
                            cursor: 'pointer'
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredColumn1Students.map(student => {
                      const isChecked = step3CheckedStudentIds.includes(student.id);
                      const badge = getBadgeStyle(student.level);
                      const assignedGroup = trainingGroups.find(g => g.studentIds.includes(student.id));
                      const slotAssignment = getStudentSlotAssignment(student.id);

                      return (
                        <div
                          key={student.id}
                          className={`ns-ws-student-item ${isChecked ? 'active' : ''}`}
                          draggable={true}
                          onDragStart={(e) => {
                            const ids = step3CheckedStudentIds.includes(student.id) && step3CheckedStudentIds.length > 0
                              ? step3CheckedStudentIds
                              : [student.id];
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              type: 'student',
                              studentIds: ids,
                              fromGroupId: assignedGroup?.id || null
                            }));
                            e.dataTransfer.effectAllowed = 'copyMove';
                            setDraggingType('student');
                          }}
                          onDragEnd={() => {
                            setDraggingType(null);
                            setDragOverGroupId(null);
                          }}
                          onClick={() => toggleStep3StudentCheck(student.id)}
                          title={`${student.name} • Drag into any Group Card, or click to select`}
                        >
                          <div className="ns-ws-student-left">
                            <span className="ns-drag-grip" title="Drag">⠿</span>
                            <div className={`ns-checkbox-box ${isChecked ? 'checked' : ''}`}>
                              {isChecked && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </div>
                            <UserAvatar src={student.avatar} name={student.name} size={30} className="ns-ws-avatar" />
                          </div>

                          <div className="ns-ws-student-body">
                            <div className="ns-ws-student-top">
                              <span className="ns-ws-name" title={student.name}>{student.name}</span>
                              {student.isGuest && (
                                <span style={{
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  color: '#0369A1',
                                  background: '#E0F2FE',
                                  border: '1px solid #BAE6FD',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }} title={`Accompanying Guest of ${student.parentStudentName}`}>
                                  👥 Guest of {student.parentStudentName}
                                </span>
                              )}
                              <span
                                className="ns-level-badge"
                                style={{
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                  borderColor: badge.border,
                                  fontSize: '10px',
                                  padding: '1.5px 6px',
                                  borderRadius: '5px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                              >
                                {student.level}
                              </span>
                            </div>

                            <div className="ns-ws-student-meta">
                              <span
                                className="ns-day-progress-badge"
                                style={{
                                  fontSize: '10px',
                                  padding: '1.5px 6px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                              >
                                Day {student.whichDay}/{student.totalDays}
                              </span>

                              {/* Gender Badge */}
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1.5px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  background: (student.gender || '').toLowerCase() === 'female' ? '#FDF2F8' : '#EFF6FF',
                                  color: (student.gender || '').toLowerCase() === 'female' ? '#DB2777' : '#1D4ED8',
                                  border: `1px solid ${(student.gender || '').toLowerCase() === 'female' ? '#FBCFE8' : '#BFDBFE'}`,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                                title={`Gender: ${student.gender || 'Male'}`}
                              >
                                {(student.gender || '').toLowerCase() === 'female' ? '♀ Female' : '♂ Male'}
                              </span>

                              {/* Time Slot Badge */}
                              {slotAssignment && (
                                <span
                                  className="ns-ws-slot-badge"
                                  style={{
                                    backgroundColor: `${slotAssignment.theme.primary}18`,
                                    color: slotAssignment.theme.primary,
                                    borderColor: `${slotAssignment.theme.primary}40`,
                                    padding: '1.5px 6px',
                                    borderRadius: '8px',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    border: `1px solid ${slotAssignment.theme.primary}40`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}
                                  title={`Selected in ${slotAssignment.slot.startTime || slotAssignment.slot.time} slot`}
                                >
                                  ⏰ {slotAssignment.slot.startTime || slotAssignment.slot.time}
                                </span>
                              )}

                              {/* Group Assignment Badge */}
                              {assignedGroup ? (
                                <span
                                  className="ns-ws-group-badge assigned"
                                  style={{
                                    backgroundColor: '#DCFCE7',
                                    color: '#15803D',
                                    borderColor: '#86EFAC',
                                    padding: '1.5px 7px',
                                    borderRadius: '10px',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    border: '1px solid #86EFAC',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}
                                  title={`Assigned to ${assignedGroup.name}`}
                                >
                                  ✓ Assigned ({assignedGroup.name})
                                </span>
                              ) : (
                                <span
                                  className="ns-ws-group-badge unassigned"
                                  style={{
                                    backgroundColor: '#F8FAFC',
                                    color: '#94A3B8',
                                    borderColor: '#E2E8F0',
                                    padding: '1.5px 6px',
                                    borderRadius: '10px',
                                    fontSize: '10.5px',
                                    fontWeight: 500,
                                    border: '1px dashed #CBD5E1',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}
                                  title="Unassigned"
                                >
                                  Unassigned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="ns-ws-col-footer">
                  <span className="ns-selected-count">{step3CheckedStudentIds.length} Selected</span>
                  <button className="ns-create-grp-btn" onClick={handleCreateGroup}>
                    + Group ({step3CheckedStudentIds.length})
                  </button>
                </div>
              </div>

              {/* Column 2: Assigned Training Groups (Dropzone for Students & Instructors) */}
              <div className="ns-ws-col ns-ws-col-groups">
                <div className="ns-col-head" style={{ gap: '8px', flexWrap: 'wrap' }}>
                  <h3 className="ns-col-title">Assigned Training Groups</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ns-col-badge">{displayedTrainingGroups.length} Groups</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {trainingGroups.length > 0 && (
                      <button
                        className="ns-add-grp-btn"
                        style={{ background: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }}
                        onClick={clearAllGroups}
                        title="Clear all groups"
                      >
                        Clear All
                      </button>
                    )}
                    <button className="ns-add-grp-btn" onClick={handleCreateGroup}>
                      + Create Group Card
                    </button>
                  </div>
                </div>

                <div className="ns-training-groups-list">
                  {displayedTrainingGroups.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '12px', border: '1.5px dashed #CBD5E1' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
                        {step3SlotFilter === 'ALL' ? 'No training groups created yet' : 'No training groups for this time slot yet'}
                      </p>
                      <p style={{ margin: '6px 0 16px 0', fontSize: '12px' }}>Click <strong>"+ Create Group Card"</strong> or check students on the left to start grouping.</p>
                      <button className="ns-create-grp-btn" onClick={handleCreateGroup} style={{ margin: '0 auto' }}>
                        + Create Group Card
                      </button>
                      {trainingGroups.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <button
                            type="button"
                            onClick={() => setStep3SlotFilter('ALL')}
                            style={{ background: 'transparent', border: 'none', color: '#0284C7', cursor: 'pointer', fontWeight: 600, fontSize: '12px', textDecoration: 'underline' }}
                          >
                            View all {trainingGroups.length} groups across all slots
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    displayedTrainingGroups.map(grp => {
                      const assignedInstIds = grp.assignedInstructorIds || (grp.assignedInstructorId ? [grp.assignedInstructorId] : []);
                      const assignedInstructors = assignedInstIds
                        .map(id => allInstructors.find(i => String(i.id) === String(id)))
                        .filter(Boolean);
                      const grpStudents = grp.studentIds
                        .map(id => allPoolStudents.find(s => s.id === id))
                        .filter(Boolean);
                      const isDragOver = dragOverGroupId === grp.id;

                      const grpSlot = slots.find(s => s.id === grp.slotId) || slots[0];
                      const grpTheme = getSlotThemeForSlot(grp.slotId || grpSlot?.id);

                      return (
                        <div
                          key={grp.id}
                          className={`ns-group-card ${activeDropGroupId === grp.id ? 'focused' : ''} ${isDragOver ? 'drag-over' : ''}`}
                          onClick={() => setActiveDropGroupId(grp.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                            if (dragOverGroupId !== grp.id) setDragOverGroupId(grp.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverGroupId === grp.id) setDragOverGroupId(null);
                          }}
                          onDrop={(e) => handleDropOnGroup(e, grp.id)}
                        >
                          <div className="ns-gc-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4 className="ns-gc-title">{grp.name}</h4>
                              <select
                                value={grp.slotId || selectedSlotId || slots[0]?.id}
                                onChange={(e) => {
                                  const newSlotId = isNaN(parseInt(e.target.value, 10)) ? e.target.value : parseInt(e.target.value, 10);
                                  setTrainingGroups(prev => prev.map(g => g.id === grp.id ? { ...g, slotId: newSlotId } : g));
                                  setSlotStudentMap(prev => {
                                    const newMap = { ...prev };
                                    Object.keys(newMap).forEach(k => {
                                      if (Array.isArray(newMap[k])) {
                                        newMap[k] = newMap[k].filter(id => !grp.studentIds.includes(id));
                                      }
                                    });
                                    newMap[newSlotId] = Array.from(new Set([...(newMap[newSlotId] || []), ...grp.studentIds]));
                                    return newMap;
                                  });
                                  setSelectedSlotId(newSlotId);
                                  setStep3SlotFilter(newSlotId);
                                }}
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  border: '1.5px solid #0D9488',
                                  background: '#F0FDFA',
                                  color: '#0F766E',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                                title="Change group time slot"
                              >
                                {slots.map((s, idx) => (
                                  <option key={s.id} value={s.id}>
                                    ⏰ {s.startTime || s.time || `Slot ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="ns-gc-count" style={{ fontWeight: 700, color: grpStudents.length > 0 ? '#0F172A' : '#94A3B8' }}>
                                {grpStudents.length} Students
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGroup(grp.id);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  fontSize: '18px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  lineHeight: 1
                                }}
                                title="Delete group"
                              >
                                &times;
                              </button>
                            </div>
                          </div>

                          {/* Students Inside Group */}
                          <div className="ns-group-students-box">
                            {grpStudents.length === 0 ? (
                              <div className="ns-empty-students-dropzone">
                                <span>📥 Drag &amp; Drop students here</span>
                              </div>
                            ) : (
                              <div className="ns-group-students-grid">
                                {grpStudents.map((s) => {
                                  const sSlotAssign = getStudentSlotAssignment(s.id);

                                  return (
                                    <div
                                      key={s.id}
                                      className="ns-group-student-chip"
                                      draggable={true}
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('application/json', JSON.stringify({
                                          type: 'student',
                                          studentIds: [s.id],
                                          fromGroupId: grp.id
                                        }));
                                        e.dataTransfer.effectAllowed = 'copyMove';
                                        setDraggingType('student');
                                      }}
                                      onDragEnd={() => {
                                        setDraggingType(null);
                                        setDragOverGroupId(null);
                                      }}
                                      title="Drag to another group or click × to remove"
                                    >
                                      <UserAvatar src={s.avatar} name={s.name} size={20} className="ns-chip-avatar" />
                                      <span className="ns-chip-name">{s.name}</span>
                                      {s.isGuest && (
                                        <span style={{
                                          fontSize: '9px',
                                          fontWeight: 700,
                                          color: '#0369A1',
                                          background: '#E0F2FE',
                                          border: '1px solid #BAE6FD',
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          flexShrink: 0
                                        }} title={`Accompanying Guest of ${s.parentStudentName}`}>
                                          Guest
                                        </span>
                                      )}

                                      {grpSlot && (
                                        <span style={{
                                          fontSize: '9px',
                                          fontWeight: 700,
                                          color: grpTheme.primary,
                                          background: `${grpTheme.primary}18`,
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          border: `1px solid ${grpTheme.primary}30`
                                        }}>
                                          {grpSlot.startTime || grpSlot.time}
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        className="ns-chip-remove"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeStudentFromGroup(grp.id, s.id);
                                        }}
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Assigned Coaches (Multiple Coaches Supported) */}
                          <div className="ns-assigned-instructors-section" style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                Assigned Coaches {assignedInstructors.length > 0 ? `(${assignedInstructors.length})` : ''}
                              </span>
                            </div>

                            {assignedInstructors.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {assignedInstructors.map(coach => (
                                  <div
                                    key={coach.id}
                                    className="ns-assigned-inst-box"
                                    style={{
                                      padding: '7px 10px',
                                      background: '#F0FDF4',
                                      border: '1.5px solid #86EFAC',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                  >
                                    <UserAvatar src={coach.avatar} name={coach.name} size={26} className="ns-ai-avatar" />
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                      <span className="ns-ai-name" style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {coach.name}
                                      </span>
                                      <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>
                                        ✓ Group Coach ({coach.role || 'Instructor'})
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className="ns-ai-remove"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeInstructorFromGroup(grp.id, coach.id);
                                      }}
                                      title={`Remove ${coach.name}`}
                                      style={{ fontSize: '16px', color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 6px', lineHeight: 1 }}
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}

                                {/* Add Another Coach Dropzone */}
                                <div
                                  className="ns-dropzone-box"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropGroupId(grp.id);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'copy';
                                    if (dragOverGroupId !== grp.id) setDragOverGroupId(grp.id);
                                  }}
                                  onDrop={(e) => handleDropOnGroup(e, grp.id)}
                                  style={{
                                    border: '1.5px dashed #86EFAC',
                                    borderRadius: '8px',
                                    padding: '7px 10px',
                                    textAlign: 'center',
                                    background: '#F0FDF4',
                                    cursor: 'pointer',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    color: '#16A34A',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                  }}
                                  title="Drag or click another instructor to assign"
                                >
                                  <span>+</span> Drag or click to assign another coach
                                </div>
                              </div>
                            ) : (
                              <div
                                className="ns-dropzone-box"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropGroupId(grp.id);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                  if (dragOverGroupId !== grp.id) setDragOverGroupId(grp.id);
                                }}
                                onDrop={(e) => handleDropOnGroup(e, grp.id)}
                                style={{
                                  border: '1.5px dashed #CBD5E1',
                                  borderRadius: '8px',
                                  padding: '10px',
                                  textAlign: 'center',
                                  background: '#F8FAFC',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  color: '#64748B'
                                }}
                              >
                                <span>🏄‍♂️ <strong>Assign Coach</strong> (Drag or click instructor)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 3: Available Instructors (Draggable) */}
              <div className="ns-ws-col ns-ws-col-instructors">
                <div className="ns-col-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="ns-col-title">Available Instructors</h3>
                    <span className="ns-col-badge">{filteredInstructors.length} Staff</span>
                  </div>
                  {step3CoachGenderFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setStep3CoachGenderFilter('all')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284C7',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Reset coach filter"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Coach Gender Filter Toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  background: '#F8FAFC',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    <span>👤</span> Gender:
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { key: 'all', label: 'All', count: allInstructors.length },
                      { key: 'male', label: 'Male', count: allInstructors.filter(i => (i.gender || 'male').toLowerCase() === 'male').length },
                      { key: 'female', label: 'Female', count: allInstructors.filter(i => (i.gender || '').toLowerCase() === 'female').length },
                    ].map(({ key, label, count }) => {
                      const isActive = step3CoachGenderFilter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStep3CoachGenderFilter(key)}
                          style={{
                            border: `1px solid ${isActive ? '#0284C7' : '#CBD5E1'}`,
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: isActive ? 700 : 500,
                            background: isActive ? '#F0F9FF' : '#FFFFFF',
                            color: isActive ? '#0284C7' : '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>🖐️</span> Drag instructor card into any Group Card in the center.
                </div>

                <div className="ns-instructors-list">
                  {filteredInstructors.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      {step3CoachGenderFilter !== 'all'
                        ? `No ${step3CoachGenderFilter} instructors registered.`
                        : 'No instructors registered for this school yet.'}
                    </div>
                  ) : (
                    filteredInstructors.map(inst => {
                      const currentSlotId = step3SlotFilter !== 'ALL' ? step3SlotFilter : (selectedSlotId || slots[0]?.id);
                      const currentSlotGroups = displayedTrainingGroups;
                      const currentActiveGroup = currentSlotGroups.find(g => g.id === activeDropGroupId) || currentSlotGroups[0] || null;

                      // Is instructor already assigned to a group in THIS current time slot?
                      const isAssignedInCurrentSlot = currentSlotGroups.some(g => {
                        const ids = g.assignedInstructorIds || (g.assignedInstructorId ? [g.assignedInstructorId] : []);
                        return ids.map(String).includes(String(inst.id));
                      });

                      const totalAssignedCount = trainingGroups.filter(g => {
                        const ids = g.assignedInstructorIds || (g.assignedInstructorId ? [g.assignedInstructorId] : []);
                        return ids.map(String).includes(String(inst.id));
                      }).length;

                      const isOnLeave = inst.status === 'On Leave';

                      const activeConflict = currentActiveGroup
                        ? getCoachSlotConflict(currentActiveGroup.id, inst.id)
                        : getCoachSlotConflict(null, inst.id, currentSlotId);

                      const badgeText = isOnLeave
                        ? 'On Leave'
                        : activeConflict
                          ? `Busy (${activeConflict.conflictingGroup.name})`
                          : isAssignedInCurrentSlot
                            ? 'Assigned'
                            : totalAssignedCount > 0
                              ? `Assigned (Other slot)`
                              : 'Available';
                      const badgeClass = isOnLeave
                        ? 'leave'
                        : activeConflict
                          ? 'conflict'
                          : isAssignedInCurrentSlot
                            ? 'assigned'
                            : 'available';

                      return (
                        <div
                          key={inst.id}
                          className={`ns-inst-card ${isAssignedInCurrentSlot ? 'assigned' : ''} ${isOnLeave ? 'leave' : ''} ${activeConflict ? 'conflict-busy' : ''}`}
                          draggable={!isOnLeave}
                          onDragStart={(e) => {
                            if (isOnLeave) return;
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              type: 'instructor',
                              id: inst.id
                            }));
                            e.dataTransfer.effectAllowed = 'copy';
                            setDraggingType('instructor');
                          }}
                          onDragEnd={() => {
                            setDraggingType(null);
                            setDragOverGroupId(null);
                          }}
                          onClick={() => {
                            if (isOnLeave) {
                              setUiAlert({
                                title: 'Staff On Leave',
                                message: `${inst.name} is currently marked as On Leave.`,
                                type: 'info',
                                icon: '🏖️'
                              });
                              return;
                            }

                            // Strictly target groups in the CURRENT time slot
                            const activeSlotId = step3SlotFilter !== 'ALL' ? step3SlotFilter : (selectedSlotId || slots[0]?.id);
                            const activeSlotGroups = displayedTrainingGroups;

                            let targetGroup = activeSlotGroups.find(g => g.id === activeDropGroupId);

                            // If active group is from another slot, pick an unassigned group in this slot
                            if (!targetGroup) {
                              targetGroup = activeSlotGroups.find(g => {
                                const ids = g.assignedInstructorIds || (g.assignedInstructorId ? [g.assignedInstructorId] : []);
                                return ids.length === 0;
                              });
                            }

                            // If still none, fallback to first group in current slot
                            if (!targetGroup && activeSlotGroups.length > 0) {
                              targetGroup = activeSlotGroups[0];
                            }

                            if (targetGroup) {
                              setActiveDropGroupId(targetGroup.id);
                              assignInstructorToGroup(targetGroup.id, inst.id);
                            } else {
                              // If NO group exists in current slot yet, auto-create Group A for THIS slot and assign coach
                              const slotStudents = slotStudentMap[activeSlotId] || [];
                              const newGroup = {
                                id: `group-${activeSlotId}-${Date.now()}`,
                                name: 'Group A',
                                day: 'Day 1',
                                level: 'General',
                                slotId: activeSlotId,
                                studentIds: slotStudents,
                                assignedInstructorId: inst.id,
                                assignedInstructorIds: [inst.id],
                              };
                              setTrainingGroups(prev => [...prev, newGroup]);
                              setActiveDropGroupId(newGroup.id);
                            }
                          }}
                          title={isOnLeave ? 'On Leave' : activeConflict ? `Already coaching ${activeConflict.conflictingGroup.name} at ${activeConflict.time}` : 'Drag into a group or click to assign'}
                        >
                          <span className="ns-drag-grip" style={{ color: '#0D9488', fontSize: '13px' }}>⠿</span>
                          <UserAvatar src={inst.avatar} name={inst.name} size={36} className="ns-inst-avatar" />
                          <div className="ns-inst-info">
                            <h4 className="ns-inst-name">{inst.name}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span className="ns-inst-role">{inst.role}</span>
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  background: (inst.gender || '').toLowerCase() === 'female' ? '#FDF2F8' : '#EFF6FF',
                                  color: (inst.gender || '').toLowerCase() === 'female' ? '#DB2777' : '#1D4ED8',
                                  border: `1px solid ${(inst.gender || '').toLowerCase() === 'female' ? '#FBCFE8' : '#BFDBFE'}`,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {(inst.gender || '').toLowerCase() === 'female' ? '♀ Female' : '♂ Male'}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`ns-inst-badge ${badgeClass}`}
                            style={activeConflict ? {
                              background: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              fontWeight: 700
                            } : {}}
                          >
                            {badgeText}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Finalize Action Bottom Bar (Sticky Bar format like Step 1 & Step 2) */}
            <div className="ns-sticky-bar" style={{ position: 'sticky', bottom: '0px', zIndex: 99, marginTop: '24px' }}>
              <div className="ns-sb-left">
                <span className="ns-sb-target-label" style={{ background: '#10B981', color: '#FFF', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                  PUBLISH READY
                </span>
                <span className="ns-sb-capacity" style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                  Total {importedStudents.length} Students Ready to Publish
                </span>
              </div>

              <div className="ns-sb-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="ns-sb-back-btn"
                  onClick={() => setCurrentStep(2)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                >
                  {editSession ? '← Back to Select Students' : '← Back to Import Students'}
                </button>
                <button
                  className="ns-primary-btn finalize-btn"
                  onClick={handleFinalizeAndPublish}
                  disabled={isPublishing}
                  style={{
                    background: 'linear-gradient(135deg, #00D494 0%, #00B37E 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(0, 212, 148, 0.4)',
                    cursor: isPublishing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isPublishing
                    ? (editSession ? 'Saving Changes...' : 'Publishing Sessions...')
                    : (editSession ? '✓ Save Changes' : '🚀 Finalize & Publish')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Slot Edit/Add Modal */}
        {editingSlotModal && (
          <div className="ns-modal-overlay">
            <div className="ns-modal-card" style={{ maxWidth: '480px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                  {editingSlotModal.mode === 'add' ? 'Add Session Time Slot' : 'Edit Session Time Slot'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSlotModal(null)}
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748B', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={editingSlotModal.time}
                    onChange={(e) => setEditingSlotModal({ ...editingSlotModal, time: e.target.value })}
                    placeholder="e.g. 08:30 AM"
                    className="ns-modal-input"
                    style={modalTimeIsDuplicate ? { border: '2px solid #EF4444', background: '#FEF2F2', color: '#B91C1C' } : {}}
                  />
                  {modalTimeIsDuplicate && (
                    <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: 700, display: 'block', marginTop: '5px' }}>
                      ⚠ A slot with this start time already exists! (e.g. 08:31 AM is allowed, but duplicate identical times are not).
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Duration (Minutes)
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <select
                        value={String(editingSlotModal.duration || 90)}
                        onChange={(e) => setEditingSlotModal({ ...editingSlotModal, duration: e.target.value })}
                        className="ns-modal-input"
                        style={{
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: '32px'
                        }}
                        title="Select session duration"
                      >
                        {[30, 45, 60, 75, 90, 105, 120, 135, 150, 180, 240].map(m => {
                          let label = `${m} min`;
                          if (m === 60) label = '60 min (1 hr)';
                          else if (m === 90) label = '90 min (1.5 hrs)';
                          else if (m === 120) label = '120 min (2 hrs)';
                          else if (m === 150) label = '150 min (2.5 hrs)';
                          else if (m === 180) label = '180 min (3 hrs)';
                          else if (m === 240) label = '240 min (4 hrs)';
                          return <option key={m} value={String(m)}>{label}</option>;
                        })}
                        {!([30, 45, 60, 75, 90, 105, 120, 135, 150, 180, 240].includes(Number(editingSlotModal.duration))) && (
                          <option value={String(editingSlotModal.duration)}>{editingSlotModal.duration} min</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Max Students Capacity
                    </label>
                    <input
                      type="number"
                      value={editingSlotModal.maxStudents}
                      onChange={(e) => setEditingSlotModal({ ...editingSlotModal, maxStudents: e.target.value })}
                      className="ns-modal-input"
                      min="1"
                      max="30"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Operational Weekdays
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                      const activeDay = (editingSlotModal.days || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const curDays = editingSlotModal.days || [];
                            const nextDays = activeDay ? curDays.filter(d => d !== day) : [...curDays, day];
                            setEditingSlotModal({ ...editingSlotModal, days: nextDays });
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: activeDay ? '1.5px solid #00D1B2' : '1.5px solid #E2E8F0',
                            background: activeDay ? '#00D1B2' : '#F8FAFC',
                            color: activeDay ? '#FFFFFF' : '#475569',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="slot-active-check"
                    checked={editingSlotModal.active}
                    onChange={(e) => setEditingSlotModal({ ...editingSlotModal, active: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#00D1B2', cursor: 'pointer' }}
                  />
                  <label htmlFor="slot-active-check" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                    Active slot in scheduling
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setEditingSlotModal(null)}
                  className="ns-secondary-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSlotModal(editingSlotModal)}
                  className="ns-primary-btn"
                  style={{
                    padding: '10px 20px',
                    opacity: modalTimeIsDuplicate ? 0.6 : 1,
                    cursor: modalTimeIsDuplicate ? 'not-allowed' : 'pointer'
                  }}
                  disabled={modalTimeIsDuplicate}
                >
                  Save Time Slot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom In-App UI Alert Modal (Replaces native browser alert) */}
        {uiAlert && (
          <div
            className="ns-modal-overlay"
            style={{ zIndex: 1400, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
            onClick={() => setUiAlert(null)}
          >
            <div
              className="ns-modal-card"
              style={{
                maxWidth: '440px',
                width: '90%',
                padding: '32px 28px',
                textAlign: 'center',
                background: '#FFFFFF',
                borderRadius: '20px',
                boxShadow: '0 25px 60px rgba(15, 23, 42, 0.3)',
                border: '1px solid #E2E8F0',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: uiAlert.type === 'error' ? '#FEE2E2' : uiAlert.type === 'info' ? '#E0F2FE' : '#FEF3C7',
                color: uiAlert.type === 'error' ? '#DC2626' : uiAlert.type === 'info' ? '#0284C7' : '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 16px auto',
                border: `2px solid ${uiAlert.type === 'error' ? '#FECACA' : uiAlert.type === 'info' ? '#BAE6FD' : '#FDE68A'}`
              }}>
                {uiAlert.icon || (uiAlert.type === 'error' ? '⚠️' : '📋')}
              </div>

              <h3 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '20px',
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 10px 0'
              }}>
                {uiAlert.title || 'Attention Needed'}
              </h3>

              <p style={{
                fontSize: '14px',
                color: '#64748B',
                lineHeight: 1.55,
                margin: '0 0 24px 0'
              }}>
                {uiAlert.message}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setUiAlert(null)}
                  style={{
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px 32px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1E293B'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#0F172A'}
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scoped Styling for the 3-Step Wizard Flow (Rendered for both Modal & Standalone page) */}
      <style>{`
        .ns-root {
          display: flex;
          min-height: 100vh;
          background-color: #F8FAFC;
          font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0F172A;
        }

        .ns-container, .ns-modal-container {
          font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0F172A;
        }

        .ns-container {
          flex: 1;
          padding: 28px 36px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ─── Top Header & Stepper ─── */
        .ns-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
        }

        .ns-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ns-title {
          font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }

        .ns-status-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
          text-transform: capitalize;
        }
        .ns-status-tag.upcoming {
          background-color: #E0F2FE;
          color: #0284C7;
        }
        .ns-status-tag.review {
          background-color: #F1F5F9;
          color: #475569;
        }

        .ns-stepper {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .ns-step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #64748B;
          transition: all 0.15s;
          padding: 4px 6px;
          border-radius: 6px;
        }
        .ns-step-item:hover {
          color: #0284C7;
          background-color: #F8FAFC;
        }
        .ns-step-item.active {
          color: #0284C7;
          font-weight: 700;
        }
        .ns-step-item.completed {
          color: #10B981;
          font-weight: 600;
        }
        .ns-step-item.ns-step-disabled {
          opacity: 0.4;
          cursor: not-allowed !important;
          pointer-events: none;
        }

        .ns-step-circle {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background-color: #E2E8F0;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }
        .ns-step-item.active .ns-step-circle {
          background-color: #0284C7;
          color: #FFFFFF;
        }
        .ns-step-item.completed .ns-step-circle {
          background-color: #10B981;
          color: #FFFFFF;
        }

        .ns-step-chevron {
          color: #CBD5E1;
          font-weight: 400;
          margin-left: 4px;
        }

        .ns-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        .ns-forecast-label {
          color: #64748B;
        }
        .ns-forecast-val {
          color: #0284C7;
          font-weight: 700;
        }
        .ns-forecast-icon {
          margin-left: 2px;
        }

        /* ─── Selected Banner ─── */
        .ns-selected-banner {
          background-color: #EFF6FF;
          border: 1px solid #BFDBFE;
          border-radius: 10px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #1E3A8A;
        }
        .ns-banner-text strong {
          color: #1E40AF;
        }

        /* ─── Cards & Containers ─── */
        .ns-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .ns-card-heading {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 16px 0;
        }

        /* ─── Buttons ─── */
        .ns-primary-btn {
          background-color: #00D1B2;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.1s;
        }
        .ns-primary-btn:hover {
          background-color: #00B89C;
        }
        .ns-primary-btn.full-width {
          width: 100%;
        }
        .ns-primary-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .ns-secondary-btn {
          background: #FFFFFF;
          color: #0F172A;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        /* ═════════════════════════════════════════════════════════════════ */
        /* STEP 1 SPECIFIC STYLES                                          */
        /* ═════════════════════════════════════════════════════════════════ */
        .ns-step1-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          align-items: stretch;
        }

        .ns-step1-date-card {
          margin: 0;
          height: 100%;
          box-sizing: border-box;
        }

        .ns-step1-pool-card {
          margin: 0;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .ns-step1-slots-card {
          grid-column: 1 / -1;
          margin: 0;
        }

        @media (max-width: 960px) {
          .ns-step1-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Calendar */
        .ns-calendar-widget {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ns-cal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ns-cal-month-title {
          font-weight: 700;
          font-size: 15px;
          color: #0F172A;
        }
        .ns-cal-arrows {
          display: flex;
          gap: 8px;
        }
        .ns-cal-arrow-btn {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
        }
        .ns-cal-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #94A3B8;
        }
        .ns-cal-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .ns-cal-day-cell {
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          color: #1E293B;
          transition: background-color 0.15s;
        }
        .ns-cal-day-cell:hover:not(.selected) {
          background-color: #F1F5F9;
        }
        .ns-cal-day-cell.other-month {
          color: #CBD5E1;
        }
        .ns-cal-day-cell.selected {
          background-color: #0284C7;
          color: #FFFFFF;
          font-weight: 700;
          border-radius: 50%;
          width: 38px;
          margin: 0 auto;
        }

        /* Slots List */
        .ns-slots-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .ns-config-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          color: #0284C7;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ns-config-link-btn:hover {
          background: #E0F2FE;
          border-color: #0284C7;
          color: #0369A1;
        }

        .ns-slots-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ns-slot-card {
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.15s;
          background: #FFFFFF;
        }
        .ns-slot-card:hover {
          border-color: #CBD5E1;
        }
        .ns-slot-card.selected {
          border-color: #0284C7;
          background-color: #F0F9FF;
        }
        .ns-slot-card.is-inactive {
          opacity: 0.72;
          background-color: #F8FAFC;
        }
        .ns-slot-capacity-control {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #F8FAFC;
          padding: 6px 12px;
          border-radius: 10px;
          border: 1.5px solid #E2E8F0;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .ns-slot-card.selected .ns-slot-capacity-control {
          background: #FFFFFF;
          border-color: #BAE6FD;
          box-shadow: 0 1px 4px rgba(2, 132, 199, 0.08);
        }
        .ns-slot-cap-text {
          display: flex;
          flex-direction: column;
          text-align: right;
        }
        .ns-slot-cap-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .ns-slot-cap-count {
          font-size: 13.5px;
          font-weight: 800;
          color: #0F172A;
          margin-top: 1px;
        }
        .ns-slot-cap-stepper {
          display: flex;
          align-items: center;
          gap: 3px;
          background: #FFFFFF;
          padding: 3px 5px;
          border-radius: 8px;
          border: 1.5px solid #CBD5E1;
        }
        .ns-slot-stepper-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F1F5F9;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 800;
          color: #1E293B;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ns-slot-stepper-btn:hover {
          background: #0284C7;
          color: #FFFFFF;
        }
        .ns-slot-stepper-input {
          width: 38px;
          height: 26px;
          border: none;
          outline: none;
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          color: #0F172A;
          background: transparent;
        }
        @media (max-width: 640px) {
          .ns-slot-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .ns-slot-capacity-control {
            width: 100%;
            justify-content: space-between;
          }
        }
        .ns-slot-time {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .ns-slot-sub {
          font-size: 12px;
          color: #64748B;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }
        .ns-slot-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 5px;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }
        .ns-slot-pill.active-day {
          background-color: #DCFCE7;
          color: #15803D;
          border: 1px solid #BBF7D0;
        }
        .ns-slot-pill.off-day {
          background-color: #F1F5F9;
          color: #64748B;
          border: 1px solid #E2E8F0;
        }
        .ns-slot-pill.inactive {
          background-color: #FEE2E2;
          color: #B91C1C;
          border: 1px solid #FECACA;
        }

        .ns-slot-edit-btn {
          background: none;
          border: none;
          color: #0284C7;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .ns-slot-edit-btn:hover {
          text-decoration: underline;
        }
        .ns-add-slot-card {
          border: 1.5px dashed #CBD5E1;
          border-radius: 12px;
          padding: 14px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ns-add-slot-card:hover {
          background-color: #F8FAFC;
          color: #0F172A;
          border-color: #94A3B8;
        }

        .ns-modal-input {
          width: 100%;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          outline: none;
          background-color: #FFFFFF;
          color: #0F172A;
          box-sizing: border-box;
          font-family: inherit;
        }
        .ns-modal-input:focus {
          border-color: #00D1B2;
        }

        /* Capacity Card */
        .ns-capacity-box {
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ns-cap-label {
          font-size: 12px;
          color: #64748B;
        }
        .ns-cap-value {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 700;
          margin: 4px 0 0 0;
          color: #0F172A;
        }
        .ns-cap-stepper {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #F1F5F9;
          border-radius: 8px;
          padding: 4px 8px;
        }
        .ns-stepper-btn {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }
        .ns-stepper-num {
          font-weight: 700;
          font-size: 15px;
          min-width: 24px;
          text-align: center;
        }
        .ns-stepper-input {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #0F172A;
          width: 52px;
          height: 32px;
          text-align: center;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 0 4px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ns-stepper-input:focus {
          border-color: #0284C7;
          box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
        }
        .ns-stepper-input::-webkit-outer-spin-button,
        .ns-stepper-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .ns-stepper-input[type=number] {
          -moz-appearance: textfield;
        }

        /* Right Available Pool Card */
        .ns-pool-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
        }
        .ns-pool-heading {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 16px 0;
        }
        .ns-pool-stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .ns-pool-label {
          color: #64748B;
        }
        .ns-pool-val {
          font-weight: 700;
          font-size: 18px;
        }
        .ns-pool-breakdown {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F1F5F9;
        }
        .ns-pool-item {
          display: flex;
          align-items: center;
          font-size: 13px;
          color: #475569;
        }
        .ns-pool-bullet {
          margin-right: 8px;
          font-size: 18px;
          color: #94A3B8;
        }
        .ns-pool-item-name {
          flex: 1;
        }
        .ns-pool-item-num {
          font-weight: 600;
        }
        .ns-pool-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          margin-top: 16px;
        }
        .ns-pool-space {
          color: #0284C7;
          font-weight: 700;
        }

        /* Dark Today's Tides Card */
        .ns-tides-card {
          background-color: #0F172A;
          color: #F8FAFC;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ns-tides-search {
          background-color: #1E293B;
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ns-search-icon {
          font-size: 12px;
        }
        .ns-tides-input {
          background: transparent;
          border: none;
          outline: none;
          color: #F8FAFC;
          font-size: 13px;
          width: 100%;
        }
        .ns-tides-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }
        .ns-tides-sub {
          font-size: 12px;
          color: #94A3B8;
        }
        .ns-tide-chart-wrap {
          position: relative;
          height: 80px;
          margin: 6px 0;
        }
        .ns-tide-svg {
          width: 100%;
          height: 100%;
        }
        .ns-tide-axis {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748B;
          margin-top: 4px;
        }
        .ns-tide-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid #1E293B;
          padding-top: 12px;
        }
        .ns-tide-row {
          display: flex;
          align-items: center;
          font-size: 12px;
        }
        .ns-tide-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          width: 38px;
          text-align: center;
          margin-right: 12px;
        }
        .ns-tide-tag.high {
          background: #0284C7;
          color: #FFF;
        }
        .ns-tide-tag.low {
          background: #334155;
          color: #E2E8F0;
        }
        .ns-tide-height {
          font-weight: 600;
          flex: 1;
        }
        .ns-tide-time {
          color: #94A3B8;
        }
        .ns-tides-footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #94A3B8;
          border-top: 1px solid #1E293B;
          padding-top: 12px;
        }
        .ns-tides-footer strong {
          color: #F8FAFC;
        }

        /* ═════════════════════════════════════════════════════════════════ */
        /* STEP 2 SPECIFIC STYLES                                          */
        /* ═════════════════════════════════════════════════════════════════ */
        .ns-step2-wrap {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 12px;
          position: relative;
        }

        .ns-filters-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px 20px;
        }
        .ns-filter-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .ns-filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748B;
          min-width: 110px;
        }
        .ns-pill-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ns-pill {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 9999px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ns-pill.active {
          background: #0284C7;
          border-color: #0284C7;
          color: #FFFFFF;
          font-weight: 600;
        }

        .ns-pool-section {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px 24px;
        }
        .ns-pool-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .ns-pool-sec-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          color: #0F172A;
        }
        .ns-pool-sec-actions {
          display: flex;
          gap: 8px;
        }
        .ns-sec-btn {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
        }
        .ns-sec-btn:hover {
          background: #F1F5F9;
        }

        .ns-select-all-btn {
          background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
          color: #FFFFFF;
          border: 1px solid #0284C7;
          border-radius: 8px;
          padding: 7px 15px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
          letter-spacing: 0.2px;
        }
        .ns-select-all-btn:hover {
          background: linear-gradient(135deg, #0369A1 0%, #075985 100%);
          border-color: #0369A1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
        }
        .ns-select-all-btn:active {
          transform: translateY(0);
        }
        .ns-select-all-btn.deselect {
          background: #F1F5F9;
          color: #475569;
          border: 1px solid #CBD5E1;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .ns-select-all-btn.deselect:hover {
          background: #E2E8F0;
          color: #0F172A;
          border-color: #94A3B8;
        }

        .ns-student-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ns-student-row {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          cursor: pointer;
          transition: all 0.15s;
          gap: 14px;
        }
        .ns-student-row:hover {
          border-color: #CBD5E1;
          background-color: #F8FAFC;
        }
        .ns-student-row.selected {
          border-color: #CBD5E1;
          background-color: #FFFFFF;
        }
        .ns-custom-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1.5px solid #CBD5E1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFFFFF;
          font-size: 11px;
          font-weight: 700;
          color: #FFFFFF;
          flex-shrink: 0;
        }
        .ns-student-row.selected .ns-custom-checkbox {
          background-color: #0284C7;
          border-color: #0284C7;
        }
        .ns-avatar-initials {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #FFFFFF;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ns-student-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .ns-student-name {
          font-size: 14px;
          font-weight: 600;
          color: #0F172A;
          flex: 1;
        }
        .ns-day-progress-badge {
          font-size: 11.5px;
          font-weight: 700;
          color: #0284C7;
          background: #E0F2FE;
          border: 1px solid #BAE6FD;
          padding: 3px 10px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          letter-spacing: 0.2px;
          flex-shrink: 0;
        }
        .ns-student-group-label {
          font-size: 12px;
          color: #64748B;
          margin-right: 16px;
          flex-shrink: 0;
        }

        .ns-level-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
          border: 1px solid;
          flex-shrink: 0;
        }

        /* Bottom Sticky Bar */
        .ns-sticky-bar {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          box-sizing: border-box;
          background-color: #0A0F1D;
          color: #FFFFFF;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 50;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          margin-top: 16px;
        }

        .ns-modal-container .ns-sticky-bar {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          box-sizing: border-box;
          border-radius: 14px;
          margin-top: 16px;
          padding: 14px 24px;
          background-color: #0A0F1D;
          z-index: 50;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .ns-sb-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .ns-sb-target-label {
          font-size: 10px;
          font-weight: 700;
          color: #00D1B2;
          background: rgba(0,209,178,0.15);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .ns-sb-capacity {
          font-size: 15px;
          font-weight: 700;
        }
        .ns-slot-pills-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .ns-slot-pill-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 8px;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          outline: none;
        }
        .ns-slot-pill-btn:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          transform: translateY(-1px);
        }
        .ns-slot-pill-btn.active {
          background: #ECFDF5;
          border-color: #10B981;
          color: #065F46;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        }
        .ns-slot-pill-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #E2E8F0;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          transition: all 0.2s;
        }
        .ns-slot-pill-btn.active .ns-slot-pill-num {
          background: #10B981;
          color: #FFFFFF;
        }
        .ns-slot-pill-time {
          font-size: 13px;
          font-weight: 700;
        }
        .ns-slot-pill-active-badge {
          font-size: 10px;
          font-weight: 700;
          background: #10B981;
          color: #FFFFFF;
          padding: 2px 7px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .ns-slot-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #94A3B8;
          cursor: pointer;
        }
        .ns-slot-indicator.active {
          color: #FFFFFF;
          font-weight: 700;
        }
        .ns-slot-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #334155;
          color: #94A3B8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }
        .ns-slot-indicator.active .ns-slot-dot {
          background-color: #10B981;
          color: #FFFFFF;
        }

        /* ═════════════════════════════════════════════════════════════════ */
        /* STEP 3 SPECIFIC STYLES                                          */
        /* ═════════════════════════════════════════════════════════════════ */
        .ns-step3-wrap {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ns-step3-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .ns-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px 20px;
        }
        .ns-sc-value {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .ns-sc-label {
          font-size: 13px;
          color: #64748B;
        }

        /* 3-Column Workspace */
        .ns-step3-workspace {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          gap: 20px;
          align-items: start;
        }
        .ns-ws-col {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 540px;
        }
        .ns-col-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ns-col-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }
        .ns-col-badge {
          background: #F1F5F9;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .ns-day-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .ns-day-tab {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 500;
          color: #64748B;
          cursor: pointer;
          white-space: nowrap;
        }
        .ns-day-tab.active {
          background: #0284C7;
          border-color: #0284C7;
          color: #FFFFFF;
          font-weight: 600;
        }

        .ns-ws-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 8px 12px;
        }
        .ns-ws-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          width: 100%;
        }

        .ns-ws-student-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .ns-ws-student-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 11px;
          border-radius: 10px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }
        .ns-ws-student-item:hover {
          background-color: #F8FAFC;
          border-color: #CBD5E1;
        }
        .ns-ws-student-item.active {
          background-color: #F0F9FF;
          border-color: #0284C7;
          box-shadow: 0 0 0 1px #0284C7;
        }
        .ns-ws-student-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .ns-checkbox-box {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid #CBD5E1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFFFFF;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .ns-checkbox-box.checked {
          background-color: #0284C7;
          border-color: #0284C7;
        }
        .ns-ws-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .ns-ws-student-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ns-ws-student-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
        }
        .ns-ws-name {
          font-size: 13px;
          font-weight: 600;
          color: #0F172A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex: 1;
        }
        .ns-ws-student-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
          min-width: 0;
        }
        .ns-ws-group-badge {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .ns-ws-slot-badge {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .ns-ws-day-tag {
          font-size: 11px;
          color: #64748B;
          white-space: nowrap;
        }

        .ns-ws-col-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #F1F5F9;
          padding-top: 14px;
          margin-top: auto;
        }
        .ns-selected-count {
          font-size: 13px;
          font-weight: 600;
          color: #0F172A;
        }
        .ns-create-grp-btn {
          background: #10B981;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Column 2: Groups */
        .ns-add-grp-btn {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          cursor: pointer;
        }
        .ns-training-groups-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 440px;
          overflow-y: auto;
        }
        .ns-drag-grip {
          color: #94A3B8;
          font-size: 14px;
          cursor: grab;
          user-select: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ns-drag-grip:active {
          cursor: grabbing;
        }

        .ns-group-card {
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          background: #FFFFFF;
        }
        .ns-group-card.focused {
          border-color: #0284C7;
          box-shadow: 0 0 0 2px rgba(2,132,199,0.15);
        }
        .ns-group-card.drag-over {
          border: 2px dashed #0284C7 !important;
          background-color: #F0F9FF !important;
          box-shadow: 0 4px 16px rgba(2, 132, 199, 0.2);
          transform: scale(1.01);
        }
        .ns-gc-day {
          font-size: 11px;
          font-weight: 700;
          color: #0284C7;
          background: #E0F2FE;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .ns-gc-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ns-gc-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
        }
        .ns-gc-count {
          font-size: 12px;
          color: #64748B;
        }

        .ns-group-students-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 8px;
          min-height: 48px;
        }
        .ns-empty-students-dropzone {
          padding: 10px;
          text-align: center;
          font-size: 11.5px;
          color: #94A3B8;
          border: 1px dashed #CBD5E1;
          border-radius: 6px;
        }
        .ns-group-students-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ns-group-student-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 20px;
          padding: 3px 8px 3px 4px;
          font-size: 11.5px;
          font-weight: 600;
          color: #1E293B;
          cursor: grab;
          transition: all 0.15s;
        }
        .ns-group-student-chip:hover {
          border-color: #0284C7;
          background: #F0F9FF;
        }
        .ns-chip-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
        }
        .ns-chip-name {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ns-chip-remove {
          background: none;
          border: none;
          font-size: 14px;
          color: #94A3B8;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .ns-chip-remove:hover {
          color: #EF4444;
        }

        .ns-assigned-inst-box {
          background-color: #E0F2FE;
          border: 1.5px solid #7DD3FC;
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.15s;
        }
        .ns-assigned-inst-box:hover {
          border-color: #0284C7;
        }
        .ns-ai-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: cover;
        }
        .ns-ai-name {
          font-size: 13px;
          font-weight: 700;
          color: #0369A1;
        }
        .ns-ai-remove {
          background: none;
          border: none;
          font-size: 18px;
          color: #0284C7;
          cursor: pointer;
          padding: 0 4px;
        }
        .ns-ai-remove:hover {
          color: #EF4444;
        }

        .ns-dropzone-box {
          border: 1.5px dashed #0D9488;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          font-size: 12px;
          color: #0F766E;
          background-color: #F0FDFA;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ns-dropzone-box:hover {
          border-color: #14B8A6;
          background-color: #CCFBF1;
        }

        /* Column 3: Instructors */
        .ns-instructors-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 440px;
          overflow-y: auto;
        }
        .ns-inst-card {
          border: 1.5px solid #0D9488;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: grab;
          transition: all 0.15s;
          background: #FFFFFF;
          user-select: none;
        }
        .ns-inst-card:active {
          cursor: grabbing;
        }
        .ns-inst-card:hover {
          background-color: #F0FDFA;
          border-color: #14B8A6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.12);
        }
        .ns-inst-card.assigned {
          border-color: #F59E0B;
        }
        .ns-inst-card.leave {
          border-color: #E2E8F0;
          opacity: 0.6;
          cursor: not-allowed;
        }
        .ns-inst-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }
        .ns-inst-info {
          flex: 1;
          min-width: 0;
        }
        .ns-inst-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ns-inst-role {
          font-size: 11px;
          color: #64748B;
        }
        .ns-inst-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .ns-inst-badge.available {
          background: #E6F9F5;
          color: #0D9488;
        }
        .ns-inst-badge.assigned {
          background: #FEF3C7;
          color: #B45309;
        }
        .ns-inst-badge.leave {
          background: #F1F5F9;
          color: #94A3B8;
        }

        .ns-bottom-action-bar {
          display: flex;
          justify-content: flex-end;
          padding: 10px 0;
        }
        .finalize-btn {
          min-width: 200px;
        }

        /* Success Modal */
        .ns-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .ns-modal-card {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 36px;
          max-width: 480px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .ns-modal-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .ns-modal-title {
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 10px 0;
        }
        .ns-modal-desc {
          font-size: 14px;
          color: #64748B;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }
        /* ═════════════════════════════════════════════════════════════════ */
        /* RESPONSIVE & MOBILE STYLES (CHINNA SIMPLE MOBILE UI)             */
        /* ═════════════════════════════════════════════════════════════════ */
        .ns-header-main-row {
          display: contents;
        }
        .ns-hide-mobile {
          /* visible on desktop */
        }
        .ns-show-mobile {
          display: none !important;
        }
        .ns-more-filters-bar {
          display: none;
        }

        .ns-student-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-radius: 12px;
          gap: 14px;
        }
        .ns-student-row.ns-guest-row {
          margin-left: 28px;
          padding: 10px 16px;
        }
        .ns-student-row-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        .ns-student-name-box {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .ns-guest-tag {
          font-size: 11px;
          font-weight: 700;
          color: #0369A1;
          background: #E0F2FE;
          border: 1px solid #BAE6FD;
          padding: 1px 6px;
          border-radius: 4px;
          display: inline-block;
          white-space: nowrap;
          margin-top: 2px;
        }
        .ns-student-row-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          /* Mobile Utilities */
          .ns-hide-mobile {
            display: none !important;
          }
          .ns-show-mobile {
            display: inline !important;
          }

          /* Modal Container */
          .ses-modal-overlay {
            padding: 6px 4px !important;
          }
          .ses-modal-box.ns-modal-container {
            width: 98% !important;
            max-width: 98% !important;
            max-height: 96vh !important;
            border-radius: 14px !important;
          }
          .ns-modal-body-scroll {
            padding: 10px 8px 100px 8px !important;
          }

          /* Header */
          .ns-header {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 10px 12px !important;
            gap: 8px !important;
          }
          .ns-header-main-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 6px !important;
          }
          .ns-header-left {
            gap: 6px !important;
            min-width: 0 !important;
            flex: 1 !important;
          }
          .ns-title {
            font-size: 15px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 150px !important;
          }
          .ns-status-tag {
            font-size: 9.5px !important;
            padding: 1px 6px !important;
          }
          .ns-header-back-btn {
            padding: 3px 6px !important;
            font-size: 11px !important;
          }

          /* Stepper */
          .ns-stepper {
            width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            gap: 6px !important;
            padding: 2px 0 !important;
          }
          .ns-stepper::-webkit-scrollbar {
            display: none !important;
          }
          .ns-step-item {
            font-size: 11px !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
            padding: 2px 5px !important;
            gap: 4px !important;
          }
          .ns-step-circle {
            width: 18px !important;
            height: 18px !important;
            font-size: 9.5px !important;
          }

          /* Step 2 Banner */
          .ns-selected-banner {
            padding: 6px 10px !important;
            font-size: 11.5px !important;
            border-radius: 8px !important;
          }

          /* Filters Card: Compact & Simple */
          .ns-filters-card {
            padding: 10px 10px !important;
            border-radius: 10px !important;
            gap: 8px !important;
          }
          .ns-filter-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
            width: 100% !important;
            margin-top: 8px !important;
            padding-top: 8px !important;
          }
          .ns-filter-row:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          .ns-filter-label {
            min-width: 0 !important;
            width: 100% !important;
            font-size: 11.5px !important;
            font-weight: 700 !important;
            color: #0F172A !important;
          }
          .ns-slot-pills-wrap {
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .ns-slot-pill-btn {
            padding: 4px 8px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
            gap: 4px !important;
          }
          .ns-slot-pill-num {
            width: 18px !important;
            height: 18px !important;
            font-size: 10px !important;
          }
          .ns-slot-pill-time {
            font-size: 11px !important;
          }
          .ns-pill-group {
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 5px !important;
          }
          .ns-pill {
            padding: 4px 8px !important;
            font-size: 11px !important;
            border-radius: 14px !important;
          }
          .ns-search-student-input {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            padding: 6px 10px !important;
            font-size: 12px !important;
          }

          /* Collapsible Secondary Filters */
          .ns-more-filters-bar {
            display: flex !important;
            width: 100% !important;
            margin-top: 8px !important;
            padding-top: 6px !important;
            border-top: 1px solid #F1F5F9 !important;
          }
          .ns-more-filters-toggle {
            background: #F8FAFC !important;
            border: 1px dashed #CBD5E1 !important;
            border-radius: 6px !important;
            padding: 5px 10px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #0284C7 !important;
            cursor: pointer !important;
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
          }
          .ns-active-filter-badge {
            background: #0284C7 !important;
            color: #FFFFFF !important;
            font-size: 9px !important;
            padding: 1px 5px !important;
            border-radius: 8px !important;
            font-weight: 700 !important;
          }
          .ns-extra-filter {
            display: none !important;
          }
          .ns-extra-filter.show {
            display: flex !important;
          }

          /* Pool Section Header */
          .ns-pool-section {
            padding: 10px 10px !important;
            border-radius: 10px !important;
          }
          .ns-pool-section-header {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-bottom: 8px !important;
            gap: 6px !important;
          }
          .ns-ps-title {
            font-size: 13.5px !important;
            font-weight: 700 !important;
          }
          .ns-ps-count {
            font-size: 11px !important;
          }
          .ns-select-all-btn {
            font-size: 11px !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
          }

          /* Student Rows: Ultra Compact, 1 Clean Line, ZERO Overlap */
          .ns-student-row {
            padding: 6px 8px !important;
            gap: 6px !important;
            border-radius: 8px !important;
            min-height: 40px !important;
            margin-bottom: 4px !important;
          }
          .ns-student-row.ns-guest-row {
            margin-left: 8px !important;
            padding: 5px 8px !important;
          }
          .ns-student-row-left {
            gap: 6px !important;
            min-width: 0 !important;
            flex: 1 !important;
          }
          .ns-student-check-circle {
            width: 18px !important;
            height: 18px !important;
          }
          .ns-student-avatar {
            width: 24px !important;
            height: 24px !important;
          }
          .ns-student-name {
            font-size: 12.5px !important;
            max-width: 110px !important;
          }
          .ns-guest-tag {
            font-size: 9px !important;
            padding: 0 4px !important;
            max-width: 90px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .ns-student-row-right {
            gap: 5px !important;
          }
          .ns-student-col-slot,
          .ns-student-col-day,
          .ns-student-col-level {
            width: auto !important;
            display: flex !important;
            align-items: center !important;
          }
          .ns-day-progress-badge {
            font-size: 10px !important;
            padding: 2px 5px !important;
            border-radius: 5px !important;
          }
          .ns-level-badge {
            font-size: 9.5px !important;
            padding: 2px 6px !important;
            border-radius: 5px !important;
            width: auto !important;
          }
          .ns-slot-badge-assigned,
          .ns-slot-badge-other,
          .ns-slot-badge-scheduled {
            font-size: 9.5px !important;
            padding: 2px 5px !important;
            border-radius: 5px !important;
          }

          /* Bottom Sticky Bar: Sleek, compact 44px bar */
          .ns-sticky-bar,
          .ns-modal-container .ns-sticky-bar {
            position: sticky !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 8px 10px !important;
            border-radius: 10px !important;
            margin-top: 8px !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            background-color: #0A0F1D !important;
            z-index: 50 !important;
            gap: 8px !important;
          }
          .ns-sb-left {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            min-width: 0 !important;
          }
          .ns-sb-capacity {
            font-size: 12px !important;
            font-weight: 700 !important;
            color: #FFFFFF !important;
            white-space: nowrap !important;
          }
          .ns-sb-center {
            display: none !important;
          }
          .ns-sb-right {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
          }
          .ns-sb-back-btn {
            padding: 6px 10px !important;
            font-size: 11.5px !important;
            border-radius: 6px !important;
            white-space: nowrap !important;
          }
          .ns-primary-btn {
            padding: 6px 12px !important;
            font-size: 11.5px !important;
            border-radius: 6px !important;
            white-space: nowrap !important;
          }
        }

        @media (max-width: 480px) {
          .ns-student-name {
            max-width: 95px !important;
          }
          .ns-title {
            max-width: 120px !important;
            font-size: 14px !important;
          }
        }
      `}</style>
    </>
  );

  if (currentUser && !canManageSessions) {
    return (
      <div style={{
        minHeight: isModal ? 'auto' : '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: '#F8FAFC'
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '40px 32px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 16px auto',
            border: '2px solid #FECACA'
          }}>
            🔒
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            Scheduling Restricted
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>
            Coaches assigned to a school cannot create or schedule sessions. Only school administrators have permission to schedule training sessions.
          </p>
          <button
            type="button"
            className="ns-create-grp-btn"
            style={{ margin: '0 auto', padding: '10px 24px', fontSize: '14px' }}
            onClick={() => {
              if (isModal) {
                if (onClose) onClose();
              } else {
                navigate('/sessions');
              }
            }}
          >
            &larr; Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  if (isModal) {
    return (
      <div className="ses-modal-overlay" onClick={onClose} style={{ zIndex: 1100, padding: '20px' }}>
        <div
          className="ses-modal-box ns-modal-container"
          style={{
            maxWidth: '1240px',
            width: '96%',
            maxHeight: '92vh',
            padding: '0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '20px',
            background: '#F8FAFC',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderContent()}

          {/* Success Modal for Modal Mode */}
          {showSuccessModal && (
            <div className="ns-modal-overlay" style={{ zIndex: 1200 }}>
              <div className="ns-modal-card">
                <div className="ns-modal-icon">🎉</div>
                <h2 className="ns-modal-title">Session Created &amp; Published!</h2>
                <p className="ns-modal-desc">
                  Your session for <strong>{formattedSessionDate} ({selectedSlot ? (selectedSlot.startTime || selectedSlot.time) : 'Selected Time Slot'})</strong> with {trainingGroups.filter(g => g.studentIds && g.studentIds.length > 0).length} training group(s) has been successfully saved into the schedule.
                </p>
                <div className="ns-modal-actions">
                  <button
                    className="ns-secondary-btn"
                    onClick={() => {
                      setShowSuccessModal(false);
                      setCurrentStep(1);
                    }}
                  >
                    Create Another Session
                  </button>
                  <button
                    className="ns-primary-btn"
                    onClick={() => {
                      setShowSuccessModal(false);
                      if (onSessionCreated) onSessionCreated();
                      if (onClose) onClose();
                    }}
                  >
                    Done & View Sessions &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ns-root">
      <Sidebar />

      <main className="ns-container">
        {renderContent()}

        {/* Success Modal for Standalone Page */}
        {showSuccessModal && (
          <div className="ns-modal-overlay">
            <div className="ns-modal-card">
              <div className="ns-modal-icon">🎉</div>
              <h2 className="ns-modal-title">Session Created &amp; Published!</h2>
              <p className="ns-modal-desc">
                Your session for <strong>{formattedSessionDate} ({selectedSlot ? (selectedSlot.startTime || selectedSlot.time) : 'Selected Time Slot'})</strong> with {trainingGroups.filter(g => g.studentIds && g.studentIds.length > 0).length} training group(s) has been successfully saved into the schedule.
              </p>
              <div className="ns-modal-actions">
                <button
                  className="ns-secondary-btn"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCurrentStep(1);
                  }}
                >
                  Create Another Session
                </button>
                <button
                  className="ns-primary-btn"
                  onClick={() => navigate('/sessions')}
                >
                  View in Sessions List &rarr;
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewSession;
