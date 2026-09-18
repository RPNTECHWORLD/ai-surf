import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

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
    name: 'Teal',
    primary: '#0D9488',
    dark: '#0F766E',
    light: '#ECFDF5',
    border: '#059669',
    badgeBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    pillActiveBg: '#0D9488',
    text: '#064E3B'
  },
  {
    name: 'Blue',
    primary: '#0284C7',
    dark: '#0369A1',
    light: '#EFF6FF',
    border: '#0284C7',
    badgeBg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    pillActiveBg: '#0284C7',
    text: '#0C4A6E'
  },
  {
    name: 'Purple',
    primary: '#7C3AED',
    dark: '#6D28D9',
    light: '#F5F3FF',
    border: '#7C3AED',
    badgeBg: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    pillActiveBg: '#7C3AED',
    text: '#4C1D95'
  },
  {
    name: 'Amber',
    primary: '#D97706',
    dark: '#B45309',
    light: '#FFFBEB',
    border: '#D97706',
    badgeBg: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    pillActiveBg: '#D97706',
    text: '#78350F'
  },
  {
    name: 'Rose',
    primary: '#E11D48',
    dark: '#BE123C',
    light: '#FFF1F2',
    border: '#E11D48',
    badgeBg: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
    pillActiveBg: '#E11D48',
    text: '#881337'
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
  return rawSlots.map((s, idx) => {
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

const NewSession = ({ isModal = false, onClose, initialDate, onSessionCreated } = {}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  // Auto-sync capacity when selected slot changes so each slot retains its own capacity limit
  useEffect(() => {
    if (selectedSlotId) {
      if (slotCapacityMap[selectedSlotId] !== undefined) {
        setCapacity(slotCapacityMap[selectedSlotId]);
      } else {
        const selSlot = slots.find(s => s.id === selectedSlotId);
        if (selSlot && selSlot.maxStudents) {
          const capNum = parseInt(selSlot.maxStudents, 10);
          if (!isNaN(capNum) && capNum > 0) {
            setCapacity(capNum);
            setSlotCapacityMap(prev => ({ ...prev, [selectedSlotId]: capNum }));
          }
        }
      }
    }
  }, [selectedSlotId, slots]);

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

  // ─── Step 2 State: Roster Selector Pool (Real School Students) ───
  const [dbStudents, setDbStudents] = useState([]);
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'Beginner' | 'Intermediate' | 'Advanced'
  const [courseDayFilter, setCourseDayFilter] = useState('all'); // 'all' | '1' | '2' | '3' | ... | '7'
  const [dayFilter, setDayFilter] = useState('all');
  const [selectedSlotStep2, setSelectedSlotStep2] = useState(1);
  const [studentSearchStep2, setStudentSearchStep2] = useState('');

  // ─── Step 2 State: Per-Slot Student Selection Mapping ───
  // Map of slotId -> array of studentIds selected for that specific slot
  const [slotStudentMap, setSlotStudentMap] = useState({});

  // ─── Step 3 State: Instructor Groups Matching (Real School Instructors) ───
  const [dbInstructors, setDbInstructors] = useState([]);
  const [studentTab, setStudentTab] = useState('All Active');
  const [step3SlotFilter, setStep3SlotFilter] = useState('ALL');
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
        schoolName = typeof parsed.name === 'string' ? parsed.name : parsed.name?.name;
        const loc = parsed.city || parsed.location || schoolName;
        if (loc) setSpotName(`${loc} Beach`);
      } catch (e) {}
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
          const mapped = data.map((s, idx) => {
            const dayInfo = getStudentCourseDayInfo(s, idx);
            return {
              id: s.id,
              name: s.name,
              level: s.level || 'Beginner',
              day: idx % 2 === 0 ? 'day1' : 'day2',
              whichDay: s.which_day || s.whichDay || dayInfo.whichDay,
              totalDays: s.total_days || s.totalDays || dayInfo.totalDays,
              courseDuration: s.course_duration || dayInfo.courseDuration,
              waitlistGroup: s.course_duration || `${dayInfo.totalDays} Days Course`,
              avatar: (s.image && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791')) ? s.image : '',
              isReal: true
            };
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
              role: roleStr,
              status: i.status || 'Available',
              avatar: (i.image && !i.image.includes('unsplash.com') && !i.image.includes('1500648767791')) ? i.image : '',
              isReal: true
            };
          });
          setDbInstructors(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Real Students Pool (Excludes students already scheduled on selected date)
  const allPoolStudents = useMemo(() => {
    return dbStudents.filter(s => !isStudentScheduledInDbOnDate(s));
  }, [dbStudents, isStudentScheduledInDbOnDate]);

  // Real Instructors (NO fake data)
  const allInstructors = dbInstructors;

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

  // Auto-reset selectedSlotId if the selected slot is off on the current selected day of week
  useEffect(() => {
    if (selectedSlotId && activeSlotsForDay.length > 0) {
      const isCurrentActive = activeSlotsForDay.some(s => s.id === selectedSlotId);
      if (!isCurrentActive) {
        setSelectedSlotId(null);
      }
    }
  }, [selectedDayOfWeek, activeSlotsForDay, selectedSlotId]);

  // Helper: Find which slot a student is assigned to
  const getStudentSlotAssignment = (studentId) => {
    for (let idx = 0; idx < slots.length; idx++) {
      const s = slots[idx];
      const assignedIds = slotStudentMap[s.id] || [];
      if (assignedIds.includes(studentId)) {
        return { slot: s, slotIdx: idx, theme: getSlotTheme(idx) };
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

  // Toggle student selection for currently active slot tab
  const toggleSelectStudent = (studentId) => {
    const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
    if (!activeSlotId) return;

    setSlotStudentMap(prevMap => {
      const currentSlotList = prevMap[activeSlotId] || [];
      const isAlreadyInCurrentSlot = currentSlotList.includes(studentId);

      const newMap = { ...prevMap };

      // Remove student from ALL slots first (so student belongs to only 1 slot at a time)
      Object.keys(newMap).forEach(sId => {
        if (Array.isArray(newMap[sId])) {
          newMap[sId] = newMap[sId].filter(id => id !== studentId);
        }
      });

      if (!isAlreadyInCurrentSlot) {
        newMap[activeSlotId] = [...(newMap[activeSlotId] || []), studentId];
      }

      return newMap;
    });
  };



  // Handle Save from Slot Modal (persists to localStorage so Session Configuration is synced)
  const handleSaveSlotModal = (modalData) => {
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

  // Step 2 Filtered & Sorted students from database (matching day students top, others below)
  const filteredStudents = useMemo(() => {
    return allPoolStudents
      .filter(s => levelFilter === 'all' || s.level.toLowerCase() === levelFilter.toLowerCase())
      .filter(s => !studentSearchStep2 || s.name.toLowerCase().includes(studentSearchStep2.toLowerCase()))
      .slice()
      .sort((a, b) => {
        if (courseDayFilter !== 'all') {
          const aMatch = String(a.whichDay) === String(courseDayFilter);
          const bMatch = String(b.whichDay) === String(courseDayFilter);
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
        }
        const dayA = parseInt(a.whichDay, 10) || 1;
        const dayB = parseInt(b.whichDay, 10) || 1;
        if (dayA !== dayB) return dayA - dayB;
        return a.name.localeCompare(b.name);
      });
  }, [allPoolStudents, levelFilter, courseDayFilter, studentSearchStep2]);

  // Transition from Step 2 to Step 3: Multi-slot aware group initialization
  const proceedToStep3 = () => {
    if (trainingGroups.length === 0) {
      const activeSlotsWithStudents = slots.filter(s => (slotStudentMap[s.id] || []).length > 0);
      const initialSlot = activeSlotsWithStudents.length > 0 ? activeSlotsWithStudents[0] : (selectedSlot || slots[0]);

      const targetIds = allSelectedStudentIds.length > 0 ? allSelectedStudentIds : selectedStudentIds;

      if (targetIds && targetIds.length > 0) {
        setTrainingGroups([
          {
            id: `group-1`,
            name: `Group A`,
            day: `Day 1`,
            level: 'General',
            slotId: initialSlot?.id || null,
            studentIds: targetIds,
            assignedInstructorId: null,
          }
        ]);
        setActiveDropGroupId('group-1');
      } else {
        setTrainingGroups([]);
        setActiveDropGroupId(null);
      }
    }
    setCurrentStep(3);
  };

  // Step 3: Students in Column 1 (All selected students across all slots)
  const importedStudents = useMemo(() => {
    const targetIds = allSelectedStudentIds.length > 0 ? allSelectedStudentIds : selectedStudentIds;
    return allPoolStudents.filter(s => targetIds.includes(s.id));
  }, [allPoolStudents, allSelectedStudentIds, selectedStudentIds]);

  const filteredColumn1Students = useMemo(() => {
    return importedStudents
      .filter(s => {
        // Slot filtering in Step 3
        if (step3SlotFilter !== 'ALL') {
          const slotAssignedIds = slotStudentMap[step3SlotFilter] || [];
          if (!slotAssignedIds.includes(s.id)) return false;
        }

        if (studentTab === 'All Active') return true;
        const isAssigned = trainingGroups.some(g => g.studentIds.includes(s.id));
        if (studentTab === 'Unassigned') return !isAssigned;
        if (studentTab === 'Assigned') return isAssigned;
        return s.level?.toLowerCase() === studentTab.toLowerCase();
      })
      .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()))
      .slice()
      .sort((a, b) => {
        const dayA = parseInt(a.whichDay, 10) || 1;
        const dayB = parseInt(b.whichDay, 10) || 1;
        if (dayA !== dayB) return dayA - dayB;
        return a.name.localeCompare(b.name);
      });
  }, [importedStudents, studentTab, step3SlotFilter, slotStudentMap, studentSearch, trainingGroups]);

  // Step 3: Toggle check in Column 1
  const toggleStep3StudentCheck = (id) => {
    setStep3CheckedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Create Group from checked students or create a fresh empty group card with assigned slot
  const handleCreateGroup = () => {
    const newGroupLetter = String.fromCharCode(65 + trainingGroups.length);
    const checkedStudents = importedStudents.filter(s => step3CheckedStudentIds.includes(s.id));
    const levelLabel = checkedStudents.length > 0 ? (checkedStudents[0]?.level || 'General') : 'General';
    
    // Determine default slot for the group
    let defaultSlotId = step3SlotFilter !== 'ALL' ? step3SlotFilter : null;
    if (!defaultSlotId && checkedStudents.length > 0) {
      const assignment = getStudentSlotAssignment(checkedStudents[0].id);
      if (assignment) defaultSlotId = assignment.slot.id;
    }
    if (!defaultSlotId) defaultSlotId = selectedSlot?.id || slots[0]?.id;

    const newGroup = {
      id: `group-${Date.now()}`,
      name: `Group ${newGroupLetter}`,
      day: `Day ${trainingGroups.length + 1}`,
      level: levelLabel,
      slotId: defaultSlotId,
      studentIds: [...step3CheckedStudentIds],
      assignedInstructorId: null,
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

  // Assign Instructor to Group (Single Coach Only)
  const assignInstructorToGroup = (groupId, instructorId) => {
    setTrainingGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          assignedInstructorIds: [instructorId],
          assignedInstructorId: instructorId
        };
      })
    );
  };

  const removeInstructorFromGroup = (groupId) => {
    setTrainingGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          assignedInstructorIds: [],
          assignedInstructorId: null
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

    setIsPublishing(true);
    let publishedCount = 0;
    try {
      for (const grp of validGroups) {
        const numericStudentIds = grp.studentIds
          .map(sid => typeof sid === 'number' ? sid : parseInt(String(sid).replace(/\D/g, ''), 10))
          .filter(id => !isNaN(id) && id > 0);

        if (numericStudentIds.length === 0) continue;

        const assignedCoachId = grp.assignedInstructorId || (grp.assignedInstructorIds && grp.assignedInstructorIds[0]);
        const numericCoachId = typeof assignedCoachId === 'number' ? assignedCoachId : parseInt(String(assignedCoachId).replace(/\D/g, ''), 10);
        const assignedCoachObj = allInstructors.find(i => String(i.id) === String(assignedCoachId));
        const coachName = assignedCoachObj?.name || 'Instructor';

        const grpSlot = slots.find(s => s.id === grp.slotId) || selectedSlot;
        const slotTimeStr = grpSlot ? (grpSlot.time || grpSlot.startTime) : '08:30 AM - 10:00 AM';
        const slotDuration = grpSlot?.duration ? parseInt(grpSlot.duration, 10) : 90;

        const payload = {
          date: formattedSessionDate,
          time: slotTimeStr,
          duration_mins: slotDuration,
          student_ids: numericStudentIds,
          instructor_id: primaryInstructorId,
          instructor_ids: numericInstIds,
          location: spotName,
          condition: 'Moderate',
          type: grp.level || 'Intermediate',
          status: 'Upcoming',
          notes: `${grp.name} (${slotTimeStr}) - Coaches: ${assignedInstNames || 'Staff'} - ${numericStudentIds.length} students`,
          group_name: grp.name || '',
        };

        await fetch(`${API}/api/sessions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});

        publishedCount++;
      }

      if (publishedCount > 0) {
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
            {currentStep === 1 && 'Schedule Surf Session'}
            {currentStep === 2 && 'Roster Selector Pool'}
            {currentStep === 3 && 'Instructor Groups Matching'}
          </h1>
          <span className={`ns-status-tag ${currentStep === 3 ? 'review' : 'upcoming'}`}>
            {currentStep === 3 ? 'Review' : 'Upcoming'}
          </span>
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
            <span className="ns-step-text">2. Import Students</span>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isModal && (
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
          )}
        </div>
      </header>

      {/* Main Form Scrollable Container */}
      <div style={isModal ? { padding: '24px 28px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 85px)' } : {}}>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: SESSION SETUP                                           */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="ns-step-content ns-step1-wrap">
            <div className="ns-step1-grid">
              {/* Left Column: Date & Time Slot */}
              <div className="ns-step1-left">
                {/* 1. Select Date */}
                <section className="ns-card">
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

                {/* 2. Choose Time Slot (Dynamically loaded from Session Configuration) */}
                <section className="ns-card">
                  <div className="ns-slots-header-row">
                    <h3 className="ns-card-heading" style={{ margin: 0 }}>2. Choose Time Slot</h3>
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
                      Session Configuration
                    </button>
                  </div>

                  <div className="ns-slots-list">
                    {slots.map(slot => {
                      const isSelected = slot.id === selectedSlotId;
                      const isDayMatch = slot.days && slot.days.includes(selectedDayOfWeek);
                      return (
                        <div
                          key={slot.id}
                          className={`ns-slot-card ${isSelected ? 'selected' : ''} ${!slot.active ? 'is-inactive' : ''}`}
                          onClick={() => setSelectedSlotId(slot.id)}
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
                        </div>
                      );
                    })}

                    <div
                      className="ns-add-slot-card"
                      onClick={() => {
                        setEditingSlotModal({
                          mode: 'add',
                          id: Date.now(),
                          time: '04:00 PM',
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

              {/* Right Column: Capacity & Available Pool Widget */}
              <div className="ns-step1-right">
                {/* 3. Set Session Capacity */}
                <section className="ns-card">
                  <h3 className="ns-card-heading">3. Set Session Capacity</h3>
                  <div className="ns-capacity-box">
                    <div className="ns-cap-left">
                      <span className="ns-cap-label">Target student roster limit</span>
                      <h2 className="ns-cap-value">{capacity} Students</h2>
                    </div>
                    <div className="ns-cap-stepper">
                      <button
                        type="button"
                        className="ns-stepper-btn"
                        onClick={() => handleUpdateCapacity(Math.max(1, (parseInt(capacity, 10) || 5) - 5))}
                        title="Decrease capacity by 5"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={capacity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setCapacity('');
                          } else {
                            const num = parseInt(val, 10);
                            handleUpdateCapacity(isNaN(num) ? '' : Math.max(1, num));
                          }
                        }}
                        onBlur={() => {
                          if (!capacity || parseInt(capacity, 10) < 1) {
                            handleUpdateCapacity(5);
                          }
                        }}
                        className="ns-stepper-input"
                        title="Type capacity limit directly"
                      />
                      <button
                        type="button"
                        className="ns-stepper-btn"
                        onClick={() => handleUpdateCapacity((parseInt(capacity, 10) || 0) + 5)}
                        title="Increase capacity by 5"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </section>

                {/* Available Students Pool */}
                <div className="ns-pool-card">
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
                  <div className="ns-pool-footer">
                    <span>Selected Roster Count:</span>
                    <span className="ns-pool-space">{allSelectedStudentIds.length}/{capacity || 30} Athletes Selected</span>
                  </div>
                </div>
              </div>
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
                Save configuration and Next: Import Students &rarr;
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
                    const theme = getSlotTheme(idx);
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
                          background: theme.light,
                          borderColor: theme.primary,
                          borderWidth: '2px',
                          color: theme.dark,
                          boxShadow: `0 3px 10px ${theme.primary}30`
                        } : {
                          background: '#FFFFFF',
                          borderColor: count > 0 ? theme.primary : '#CBD5E1',
                          color: count > 0 ? theme.dark : '#475569'
                        }}
                        title={`${s.time} (${count} Athletes assigned)`}
                      >
                        <span className="ns-slot-pill-num" style={{
                          background: isSelected || count > 0 ? theme.primary : '#94A3B8',
                          color: '#FFFFFF'
                        }}>
                          {idx + 1}
                        </span>
                        <span className="ns-slot-pill-time" style={{ fontWeight: isSelected ? 800 : 600 }}>
                          {s.startTime || s.time || `Slot ${idx + 1}`}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isSelected || count > 0 ? theme.primary : '#E2E8F0',
                          color: isSelected || count > 0 ? '#FFFFFF' : '#64748B'
                        }}>
                          {count} Athletes
                        </span>
                        {isSelected && (
                          <span className="ns-slot-pill-active-badge" style={{ background: theme.primary, color: '#FFFFFF' }}>
                            ✓ Selected Tab
                          </span>
                        )}
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

              {/* Filter by Day (Which Day Athlete is Attending) */}
              <div className="ns-filter-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
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

              {/* Search Athlete */}
              <div className="ns-filter-row" style={{ marginTop: '12px' }}>
                <span className="ns-filter-label">Search Athlete:</span>
                <input
                  type="text"
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
              <div className="ns-pool-section-header">
                <div className="ns-ps-title-wrap">
                  <span className="ns-ps-icon">📋</span>
                  <span className="ns-ps-title">School Athlete Roster</span>
                  <span className="ns-ps-count">({filteredStudents.length} available)</span>
                </div>
                {(() => {
                  const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
                  const currentSlotList = slotStudentMap[activeSlotId] || [];
                  const visibleIds = filteredStudents.map(s => s.id);
                  const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => currentSlotList.includes(id));

                  return (
                    <button
                      type="button"
                      className={`ns-select-all-btn ${isAllSelected ? 'deselect' : ''}`}
                      onClick={() => {
                        if (!activeSlotId) return;
                        setSlotStudentMap(prevMap => {
                          const newMap = { ...prevMap };
                          if (isAllSelected) {
                            newMap[activeSlotId] = (newMap[activeSlotId] || []).filter(id => !visibleIds.includes(id));
                          } else {
                            Object.keys(newMap).forEach(sId => {
                              if (Array.isArray(newMap[sId])) {
                                newMap[sId] = newMap[sId].filter(id => !visibleIds.includes(id));
                              }
                            });
                            newMap[activeSlotId] = Array.from(new Set([...(newMap[activeSlotId] || []), ...visibleIds]));
                          }
                          return newMap;
                        });
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
                  );
                })()}
              </div>

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
                    const isChecked = !!assignment;
                    const isScheduledInDb = isStudentScheduledInDbOnDate(student);

                    const cardStyle = () => {
                      if (isChecked && assignment) {
                        const theme = assignment.theme;
                        return {
                          background: theme.light,
                          border: `2px solid ${theme.border}`,
                          borderLeft: `7px solid ${theme.primary}`,
                          boxShadow: `0 4px 14px ${theme.primary}25`,
                          transition: 'all 0.15s ease'
                        };
                      }
                      if (isScheduledInDb) {
                        return {
                          background: '#FFFBEB',
                          border: '1.5px solid #F59E0B',
                          borderLeft: '5px solid #D97706',
                          opacity: 0.95,
                          transition: 'all 0.15s ease'
                        };
                      }
                      if (isSelectedFilterMatch) {
                        return {
                          background: '#F0FDFA',
                          border: '1.5px solid #0D9488',
                          borderLeft: '4px solid #0D9488',
                          opacity: 0.88,
                          transition: 'all 0.15s ease'
                        };
                      }
                      return {
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderLeft: '4px solid #CBD5E1',
                        opacity: 0.8,
                        transition: 'all 0.15s ease'
                      };
                    };

                    return (
                      <div
                        key={student.id}
                        className={`ns-student-row ${isChecked ? 'selected' : ''}`}
                        onClick={() => toggleSelectStudent(student.id)}
                        style={cardStyle()}
                      >
                        {/* Checkbox Icon */}
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: isChecked && assignment ? `2px solid ${assignment.theme.primary}` : isScheduledInDb ? '2px solid #D97706' : '2px solid #94A3B8',
                            background: isChecked && assignment ? assignment.theme.primary : isScheduledInDb ? '#D97706' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                            boxShadow: isChecked && assignment ? `0 2px 6px ${assignment.theme.primary}35` : 'none'
                          }}
                        >
                          {(isChecked || isScheduledInDb) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        <UserAvatar src={student.avatar} name={student.name} size={32} className="ns-student-avatar" />

                        <span className="ns-student-name" style={{
                          fontWeight: (isChecked || isScheduledInDb) ? 800 : 600,
                          color: isChecked && assignment ? assignment.theme.dark : isScheduledInDb ? '#92400E' : '#334155',
                          fontSize: '14px'
                        }}>
                          {student.name}
                        </span>

                        {/* Selected Tag / Status Pill in Slot Theme Color */}
                        {isChecked && assignment ? (
                          <span style={{
                            background: assignment.theme.primary,
                            color: '#FFFFFF',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: `0 2px 6px ${assignment.theme.primary}35`,
                            flexShrink: 0
                          }}>
                            ✓ {assignment.slot.startTime || assignment.slot.time} SLOT
                          </span>
                        ) : isScheduledInDb ? (
                          <span style={{
                            background: '#D97706',
                            color: '#FFFFFF',
                            padding: '4px 10px',
                            borderRadius: '14px',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                            flexShrink: 0
                          }}>
                            ✓ Already Scheduled on Date
                          </span>
                        ) : (
                          <span style={{
                            background: '#F1F5F9',
                            color: '#94A3B8',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            border: '1px dashed #CBD5E1',
                            flexShrink: 0
                          }}>
                            Not Selected
                          </span>
                        )}

                        {isSelectedFilterMatch && (
                          <span style={{
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            color: '#FFFFFF',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '10.5px',
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

                        <span
                          className="ns-day-progress-badge"
                          style={isChecked && assignment ? {
                            background: assignment.theme.dark,
                            color: '#FFFFFF',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '12px'
                          } : {
                            background: '#F1F5F9',
                            color: '#64748B',
                            fontWeight: 600
                          }}
                        >
                          📅 Day {student.whichDay} of {student.totalDays}
                        </span>

                        <span className="ns-student-group-label">{student.courseDuration || student.waitlistGroup || `${student.totalDays} Days Course`}</span>
                        <span
                          className="ns-level-badge"
                          style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
                        >
                          {student.level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Sticky Target Bar */}
            <div className="ns-sticky-bar">
              <div className="ns-sb-left">
                <span className="ns-sb-target-label">SELECTED ROSTER</span>
                <span className="ns-sb-capacity" style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                  Total {allSelectedStudentIds.length}/{capacity || 30} Athletes Selected
                </span>
              </div>

              <div className="ns-sb-center">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {slots.filter(s => (slotStudentMap[s.id] || []).length > 0).map((s) => {
                    const slotIdx = slots.findIndex(x => x.id === s.id);
                    const theme = getSlotTheme(slotIdx >= 0 ? slotIdx : 0);
                    const count = slotStudentMap[s.id].length;
                    return (
                      <span key={s.id} style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        background: theme.primary,
                        color: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: '14px',
                        boxShadow: `0 2px 6px ${theme.primary}40`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        ⏰ {s.startTime || s.time}: <strong>{count} Athletes</strong>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="ns-sb-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="ns-sb-back-btn"
                  onClick={() => setCurrentStep(1)}
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
                  ← Back to Session Setup
                </button>
                <button
                  className="ns-primary-btn"
                  onClick={proceedToStep3}
                >
                  Import Selected in &amp; Next
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
            <div className="ns-selected-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ns-banner-icon">📅</span>
                <span className="ns-banner-text">
                  Selected Session: <strong>{formattedSessionDate}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Active Slots:</span>
                {slots.filter(s => (slotStudentMap[s.id] || []).length > 0).map((s) => {
                  const slotIdx = slots.findIndex(x => x.id === s.id);
                  const theme = getSlotTheme(slotIdx >= 0 ? slotIdx : 0);
                  const count = (slotStudentMap[s.id] || []).length;
                  return (
                    <span key={s.id} style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background: theme.primary,
                      color: '#FFFFFF',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: `0 2px 5px ${theme.primary}30`
                    }}>
                      ⏰ {s.startTime || s.time}: <strong>{count} Athletes</strong>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 3 Stat Summary Cards */}
            <div className="ns-step3-stats-grid">
              <div className="ns-stat-card">
                <h2 className="ns-sc-value">{importedStudents.length}</h2>
                <span className="ns-sc-label">Students Imported</span>
              </div>
              <div className="ns-stat-card">
                <h2 className="ns-sc-value">{allInstructors.length}</h2>
                <span className="ns-sc-label">Active Instructors</span>
              </div>
              <div className="ns-stat-card">
                <h2 className="ns-sc-value">{allInstructors.length > 0 && importedStudents.length > 0 ? `${Math.ceil(importedStudents.length / allInstructors.length)}:1` : '0:1'}</h2>
                <span className="ns-sc-label">Target Student Ratio</span>
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
                <div className="ns-col-head">
                  <h3 className="ns-col-title">Students List</h3>
                  <span className="ns-col-badge">{importedStudents.length} Total</span>
                </div>

                {/* Time Slot Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', padding: '4px', background: '#F1F5F9', borderRadius: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setStep3SlotFilter('ALL')}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: step3SlotFilter === 'ALL' ? '#0F172A' : 'transparent',
                      color: step3SlotFilter === 'ALL' ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    All Slots ({importedStudents.length})
                  </button>
                  {slots.filter(s => (slotStudentMap[s.id] || []).length > 0).map((s) => {
                    const slotIdx = slots.findIndex(x => x.id === s.id);
                    const theme = getSlotTheme(slotIdx >= 0 ? slotIdx : 0);
                    const count = (slotStudentMap[s.id] || []).length;
                    const isSelected = step3SlotFilter === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStep3SlotFilter(s.id)}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          background: isSelected ? theme.primary : 'transparent',
                          color: isSelected ? '#FFFFFF' : theme.primary,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ⏰ {s.startTime || s.time} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Level & Group Filter Tabs */}
                <div className="ns-day-tabs" style={{ flexWrap: 'wrap', gap: '4px' }}>
                  {['All Active', 'Unassigned', 'Assigned', 'Beginner', 'Intermediate', 'Advanced'].map(tab => (
                    <button
                      key={tab}
                      className={`ns-day-tab ${studentTab === tab ? 'active' : ''}`}
                      onClick={() => setStudentTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
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
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                      No students found in this tab.
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
                          title="Drag this student into any Group Card, or check to create a group"
                        >
                          <span className="ns-drag-grip" title="Drag">⠿</span>
                          <div className={`ns-checkbox-box ${isChecked ? 'checked' : ''}`}>
                            {isChecked && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </div>
                          <UserAvatar src={student.avatar} name={student.name} size={28} className="ns-ws-avatar" />
                          <span className="ns-ws-name">{student.name}</span>
                          
                          <span
                            className="ns-day-progress-badge"
                            style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px' }}
                          >
                            Day {student.whichDay}/{student.totalDays}
                          </span>

                          {/* Time Slot Badge */}
                          {slotAssignment && (
                            <span
                              style={{
                                backgroundColor: `${slotAssignment.theme.primary}18`,
                                color: slotAssignment.theme.primary,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: `1px solid ${slotAssignment.theme.primary}40`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title={`Selected in ${slotAssignment.slot.startTime || slotAssignment.slot.time} slot`}
                            >
                              ⏰ {slotAssignment.slot.startTime || slotAssignment.slot.time}
                            </span>
                          )}

                          {/* Group Assignment Badge */}
                          {assignedGroup ? (
                            <span
                              className="ns-ws-group-badge"
                              style={{
                                backgroundColor: '#E0F2FE',
                                color: '#0284C7',
                                borderColor: '#BAE6FD',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                border: '1px solid #BAE6FD'
                              }}
                            >
                              ✓ {assignedGroup.name}
                            </span>
                          ) : (
                            <span
                              className="ns-ws-group-badge"
                              style={{
                                backgroundColor: '#F8FAFC',
                                color: '#94A3B8',
                                borderColor: '#E2E8F0',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 500,
                                border: '1px dashed #CBD5E1'
                              }}
                            >
                              Unassigned
                            </span>
                          )}

                          <span
                            className="ns-level-badge"
                            style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
                          >
                            {student.level}
                          </span>
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
                  {trainingGroups.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '12px', border: '1.5px dashed #CBD5E1' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>No training groups created yet</p>
                      <p style={{ margin: '6px 0 16px 0', fontSize: '12px' }}>Click <strong>"+ Create Group Card"</strong> or check students on the left to start grouping.</p>
                      <button className="ns-create-grp-btn" onClick={handleCreateGroup} style={{ margin: '0 auto' }}>
                        + Create First Group
                      </button>
                    </div>
                  ) : (
                    trainingGroups.map(grp => {
                      const assignedInstIds = grp.assignedInstructorIds || (grp.assignedInstructorId ? [grp.assignedInstructorId] : []);
                      const assignedInstructors = assignedInstIds
                        .map(id => allInstructors.find(i => String(i.id) === String(id)))
                        .filter(Boolean);
                      const grpStudents = grp.studentIds
                        .map(id => allPoolStudents.find(s => s.id === id))
                        .filter(Boolean);
                      const isDragOver = dragOverGroupId === grp.id;

                      const grpSlot = slots.find(s => s.id === grp.slotId) || slots[0];
                      const grpSlotIdx = slots.findIndex(x => x.id === (grp.slotId || grpSlot?.id));
                      const grpTheme = getSlotTheme(grpSlotIdx >= 0 ? grpSlotIdx : 0);

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
                          <div className="ns-gc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="ns-gc-day">{grp.day}</span>
                              
                              {/* Slot Dropdown for Group */}
                              <select
                                value={grp.slotId || (slots[0]?.id)}
                                onChange={(e) => {
                                  const newSlotId = e.target.value;
                                  setTrainingGroups(prev => prev.map(g => g.id === grp.id ? { ...g, slotId: newSlotId } : g));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: `${grpTheme.primary}18`,
                                  color: grpTheme.primary,
                                  border: `1px solid ${grpTheme.primary}50`,
                                  borderRadius: '8px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                {slots.map((s, idx) => {
                                  const count = (slotStudentMap[s.id] || []).length;
                                  return (
                                    <option key={s.id} value={s.id} style={{ color: '#0F172A', background: '#FFF' }}>
                                      ⏰ {s.startTime || s.time} ({count} Athletes)
                                    </option>
                                  );
                                })}
                              </select>

                              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{grp.level}</span>
                            </div>
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

                          <div className="ns-gc-title-row">
                            <h4 className="ns-gc-title">{grp.name}</h4>
                            <span className="ns-gc-count" style={{ fontWeight: 700, color: grpStudents.length > 0 ? '#0F172A' : '#94A3B8' }}>
                              {grpStudents.length} Students
                            </span>
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

                                      {sSlotAssign && (
                                        <span style={{
                                          fontSize: '9px',
                                          fontWeight: 700,
                                          color: sSlotAssign.theme.primary,
                                          background: `${sSlotAssign.theme.primary}18`,
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          border: `1px solid ${sSlotAssign.theme.primary}30`
                                        }}>
                                          {sSlotAssign.slot.startTime || sSlotAssign.slot.time}
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

                          {/* Assigned Coach (Single Coach Only) */}
                          <div className="ns-assigned-instructors-section" style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                Assigned Coach
                              </span>
                            </div>

                            {assignedInstructors.length > 0 ? (
                              (() => {
                                const coach = assignedInstructors[0];
                                return (
                                  <div
                                    key={coach.id}
                                    className="ns-assigned-inst-box"
                                    style={{
                                      padding: '8px 12px',
                                      background: '#F0FDF4',
                                      border: '1.5px solid #86EFAC',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px'
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'copy';
                                    }}
                                    onDrop={(e) => handleDropOnGroup(e, grp.id)}
                                  >
                                    <UserAvatar src={coach.avatar} name={coach.name} size={28} className="ns-ai-avatar" />
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                      <span className="ns-ai-name" style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{coach.name}</span>
                                      <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>
                                        ✓ Group Coach ({coach.role || 'Instructor'})
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className="ns-ai-remove"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeInstructorFromGroup(grp.id);
                                      }}
                                      title="Remove assigned coach"
                                      style={{ fontSize: '16px', color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 6px' }}
                                    >
                                      &times;
                                    </button>
                                  </div>
                                );
                              })()
                            ) : (
                              <div
                                className="ns-dropzone-box"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropGroupId(grp.id);
                                }}
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
                <div className="ns-col-head">
                  <h3 className="ns-col-title">Available Instructors</h3>
                  <span className="ns-col-badge">{allInstructors.length} Staff</span>
                </div>

                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>🖐️</span> Drag instructor card into any Group Card in the center.
                </div>

                <div className="ns-instructors-list">
                  {allInstructors.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      No instructors registered for this school yet.
                    </div>
                  ) : (
                    allInstructors.map(inst => {
                      const assignedCount = trainingGroups.filter(g => {
                        const ids = g.assignedInstructorIds || (g.assignedInstructorId ? [g.assignedInstructorId] : []);
                        return ids.map(String).includes(String(inst.id));
                      }).length;
                      const isAssigned = assignedCount > 0;
                      const isOnLeave = inst.status === 'On Leave';

                      return (
                        <div
                          key={inst.id}
                          className={`ns-inst-card ${isAssigned ? 'assigned' : ''} ${isOnLeave ? 'leave' : ''}`}
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
                            if (activeDropGroupId) {
                              assignInstructorToGroup(activeDropGroupId, inst.id);
                            } else {
                              const unassignedGroup = trainingGroups.find(g => {
                                const ids = g.assignedInstructorIds || (g.assignedInstructorId ? [g.assignedInstructorId] : []);
                                return ids.length === 0;
                              });
                              if (unassignedGroup) {
                                assignInstructorToGroup(unassignedGroup.id, inst.id);
                              } else if (trainingGroups.length > 0) {
                                assignInstructorToGroup(trainingGroups[0].id, inst.id);
                              } else {
                                setUiAlert({
                                  title: 'Create Group First',
                                  message: 'Please create a Group Card in the center column first before assigning coaches.',
                                  type: 'warning',
                                  icon: '📋'
                                });
                              }
                            }
                          }}
                          title={isOnLeave ? 'On Leave' : 'Drag into a group or click to assign'}
                        >
                          <span className="ns-drag-grip" style={{ color: '#0D9488', fontSize: '13px' }}>⠿</span>
                          <UserAvatar src={inst.avatar} name={inst.name} size={36} className="ns-inst-avatar" />
                          <div className="ns-inst-info">
                            <h4 className="ns-inst-name">{inst.name}</h4>
                            <span className="ns-inst-role">{inst.role}</span>
                          </div>
                          <span className={`ns-inst-badge ${isOnLeave ? 'leave' : isAssigned ? 'assigned' : 'available'}`}>
                            {isOnLeave ? 'On Leave' : isAssigned ? `${assignedCount} Assigned` : 'Available'}
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
                  Total {importedStudents.length} Athletes Ready to Publish
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
                  ← Back to Import Students
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
                  {isPublishing ? 'Publishing Sessions...' : '🚀 Finalize & Publish'}
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
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Duration (Minutes)
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max="600"
                        step="5"
                        list="ns-duration-presets"
                        value={editingSlotModal.duration}
                        onChange={(e) => setEditingSlotModal({ ...editingSlotModal, duration: e.target.value })}
                        className="ns-modal-input"
                        style={{ paddingRight: '36px', fontWeight: 700 }}
                        placeholder="90"
                      />
                      <span style={{ position: 'absolute', right: '10px', fontSize: '11px', fontWeight: 700, color: '#64748B', pointerEvents: 'none' }}>
                        min
                      </span>
                      <datalist id="ns-duration-presets">
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                        <option value="75">75 min</option>
                        <option value="90">90 min</option>
                        <option value="105">105 min</option>
                        <option value="120">120 min</option>
                        <option value="150">150 min</option>
                        <option value="180">180 min</option>
                      </datalist>
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
                  style={{ padding: '10px 20px' }}
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
          grid-template-columns: 1fr 400px;
          gap: 24px;
        }

        .ns-step1-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ns-step1-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
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
          border-color: #0284C7;
          background-color: #F0F9FF;
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
          grid-template-columns: repeat(3, 1fr);
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
          max-height: 340px;
          overflow-y: auto;
        }
        .ns-ws-student-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .ns-ws-student-item:hover {
          background-color: #F1F5F9;
        }
        .ns-ws-student-item.active {
          background-color: #F0F9FF;
        }
        .ns-ws-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }
        .ns-ws-name {
          font-size: 13px;
          font-weight: 600;
          flex: 1;
        }
        .ns-ws-day-tag {
          font-size: 11px;
          color: #64748B;
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
        }
        .ns-inst-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
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
        .ns-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
      `}</style>
    </>
  );

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
