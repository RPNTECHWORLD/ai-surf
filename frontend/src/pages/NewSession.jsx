import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
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
  { id: 1, time: "06:30 AM", startTime: "06:30 AM", duration: "120", maxStudents: 5, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
  { id: 2, time: "09:30 AM", startTime: "09:30 AM", duration: "120", maxStudents: 5, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
  { id: 3, time: "02:00 PM", startTime: "02:00 PM", duration: "120", maxStudents: 5, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
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
    const rawTime = s.startTime || s.time || '06:30 AM';
    const norm = normalizeTimeString(rawTime);
    if (!norm || !seen.has(norm)) {
      if (norm) seen.add(norm);
      uniqueRaw.push(s);
    }
  }
  return uniqueRaw.map((s, idx) => {
    const rawTime = s.startTime || s.time || '06:30 AM';
    const formattedRange = formatSlotRange(rawTime, s.duration || 120);
    return {
      id: s.id || (idx + 1),
      startTime: s.time && !s.time.includes(' - ') ? s.time : rawTime.split(' - ')[0].trim(),
      duration: s.duration || 120,
      maxStudents: s.maxStudents || 5,
      days: s.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      active: s.active !== false,
      time: formattedRange,
      title: s.title || getSlotSubtitle({ ...s, startTime: rawTime }),
    };
  });
}

function loadConfiguredSlots() {
  return normalizeConfiguredSlots(DEFAULT_CONFIGURED_SLOTS);
}

function parseLocalDateOnly(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const s = String(dateStr).trim();
  if (!s) return null;

  // Handle YYYY-MM-DD or YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

function getStudentCourseTotalDays(student) {
  if (!student) return 3;
  if (student.totalDays && !isNaN(parseInt(student.totalDays, 10))) {
    return parseInt(student.totalDays, 10);
  }
  if (student.total_days && !isNaN(parseInt(student.total_days, 10))) {
    return parseInt(student.total_days, 10);
  }
  const durStr = student.course_duration || student.courseDuration || student.course || student.waitlistGroup || '';
  const match = String(durStr).match(/(\d+)\s*Day/i);
  if (match) return parseInt(match[1], 10);
  return 3;
}

function getStudentStatusOnDate(student, targetDateStr) {
  const targetDate = parseLocalDateOnly(targetDateStr);
  const rawStart = student?.startDate || student?.start_date;
  const totalDays = getStudentCourseTotalDays(student);

  if (!targetDate || !rawStart) {
    return {
      isActive: false,
      status: 'no_date',
      whichDay: 1,
      totalDays
    };
  }

  const startDate = parseLocalDateOnly(rawStart);
  if (!startDate) {
    return {
      isActive: false,
      status: 'invalid_date',
      whichDay: 1,
      totalDays
    };
  }

  const diffMs = targetDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const dayNumber = diffDays + 1; // Day 1 is startDate itself

  if (dayNumber < 1) {
    return {
      isActive: false,
      status: 'upcoming',
      whichDay: 1,
      totalDays,
      daysUntilStart: Math.abs(diffDays)
    };
  } else if (dayNumber > totalDays) {
    return {
      isActive: false,
      status: 'completed',
      whichDay: totalDays,
      totalDays,
      daysAfterEnd: dayNumber - totalDays
    };
  } else {
    return {
      isActive: true,
      status: 'active',
      whichDay: dayNumber,
      totalDays
    };
  }
}

function getStudentCourseDayInfo(s, idx = 0) {
  const totalDays = getStudentCourseTotalDays(s);
  const durStr = s.course_duration || s.courseDuration || s.course || s.waitlistGroup || `${totalDays} Days Course`;

  let whichDay = 1;
  if (s.which_day !== undefined && s.which_day !== null && !isNaN(parseInt(s.which_day, 10))) {
    whichDay = parseInt(s.which_day, 10);
  } else if (s.current_day !== undefined && s.current_day !== null && !isNaN(parseInt(s.current_day, 10))) {
    whichDay = parseInt(s.current_day, 10);
  } else if (s.day_number !== undefined && s.day_number !== null && !isNaN(parseInt(s.day_number, 10))) {
    whichDay = parseInt(s.day_number, 10);
  } else if (s.start_date) {
    const sDate = parseLocalDateOnly(s.start_date);
    if (sDate) {
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
      whichDay = Math.max(1, Math.min(totalDays, diffDays + 1));
    }
  } else {
    whichDay = (idx % totalDays) + 1;
  }

  return { whichDay, totalDays, courseDuration: durStr };
}

function normalizeLevelKey(level) {
  const l = (level || '').toLowerCase().trim();
  if (l.includes('advance intermediate') || l.includes('advanced intermediate')) return 'advance_intermediate';
  if (l.includes('advance beginner') || l.includes('advanced beginner')) return 'advance_beginner';
  if (l.includes('intermediate')) return 'intermediate';
  if (l.includes('beginner') || l.includes('novice')) return 'beginner';
  if (l.includes('pro') || l.includes('master')) return 'pro';
  if (l.includes('advanced') || l.includes('elite')) return 'advanced';
  return 'beginner';
}

function normalizeLevelDisplay(level) {
  const k = normalizeLevelKey(level);
  if (k === 'advance_beginner') return 'Advance Beginner';
  if (k === 'advance_intermediate') return 'Advance Intermediate';
  if (k === 'intermediate') return 'Intermediate';
  if (k === 'advanced') return 'Advanced';
  if (k === 'pro') return 'Pro';
  return 'Beginner';
}

const NewSession = ({ isModal = false, onClose, initialDate, onSessionCreated, editSession = null } = {}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // User Context and Permission Control
  const currentUser = useMemo(() => {
    try {
      const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const activeSchoolName = useMemo(() => {
    try {
      const savedSchool = sessionStorage.getItem('activeSchool');
      if (savedSchool) {
        try {
          const parsed = JSON.parse(savedSchool);
          if (parsed && typeof parsed === 'object') {
            return parsed.name || parsed.school_name || null;
          }
        } catch (e) {
          return savedSchool;
        }
      }
      if (currentUser?.school) {
        return typeof currentUser.school === 'string' ? currentUser.school : (currentUser.school?.name || null);
      }
      if (currentUser?.school_name) {
        return typeof currentUser.school_name === 'string' ? currentUser.school_name : (currentUser.school_name?.name || null);
      }
    } catch (e) { }
    return null;
  }, [currentUser]);

  const schoolLower = (activeSchoolName || '').toLowerCase().trim();
  const resolveSchoolStr = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (typeof val.name === 'string') return val.name;
      if (typeof val.school_name === 'string') return val.school_name;
    }
    return String(val || '');
  };

  const isStudent = currentUser?.role === 'athlete' || currentUser?.role === 'student' || currentUser?.role === 'user';
  const isCoach = currentUser?.role === 'coach' || currentUser?.role === 'instructor';

  const isAdminOrSuperAdmin = !isCoach && !isStudent && (
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'school_admin' ||
    currentUser?.role === 'schooladmin' ||
    schoolLower === 'super admin' ||
    schoolLower === 'school admin'
  );

  // Coach's assigned school
  const coachSchool = resolveSchoolStr(
    currentUser?.school ||
    currentUser?.school_name
  ).trim();
  const coachSchoolLower = coachSchool.toLowerCase();

  // If coach belongs to a real school (not individual and not freelance), they are assigned to a school!
  const isSchoolCoach = isCoach && Boolean(
    coachSchool &&
    !coachSchoolLower.includes('individual') &&
    !coachSchoolLower.includes('freelance') &&
    !coachSchoolLower.includes('independent')
  );

  // A coach is freelance ONLY if they do NOT belong to any school
  const isCoachFreelance = isCoach && !isSchoolCoach;
  const isIndividualCoach = Boolean(isCoachFreelance);

  // Individual surfer: independent athlete (not in a school)
  const userSchoolStr = resolveSchoolStr(currentUser?.school || currentUser?.school_name).trim();
  const isIndividualSurfer = !isCoach && !isStudent && (
    userSchoolStr.toLowerCase().includes('individual') ||
    userSchoolStr.toLowerCase().includes('freelance') ||
    currentUser?.is_individual === true
  );

  // Only School Admins and Freelance Coaches can Schedule sessions
  // Coaches assigned to a school and students can NEVER schedule sessions
  const canManageSessions = !isStudent && !isSchoolCoach && Boolean(isAdminOrSuperAdmin || isCoachFreelance || isIndividualSurfer);

  useEffect(() => {
    if (currentUser && !canManageSessions) {
      if (isModal) {
        if (onClose) onClose();
      } else {
        navigate('/sessions', { replace: true });
      }
    }
  }, [currentUser, canManageSessions, isModal, onClose, navigate]);

  // ─── Step 1 State: Initial Date Resolution ───
  const targetInitialDate = useMemo(() => {
    const targetDateStr = initialDate || searchParams.get('date');
    if (targetDateStr) {
      const parts = targetDateStr.split('-');
      if (parts.length === 3) {
        let y, m, d;
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        } else {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          y = parseInt(parts[2], 10);
        }
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return {
            calDate: new Date(y, m, 1),
            dayNumber: d,
            iso: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          };
        }
      }
    }
    const today = new Date();
    return {
      calDate: new Date(today.getFullYear(), today.getMonth(), 1),
      dayNumber: today.getDate(),
      iso: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    };
  }, [initialDate, searchParams]);

  // ─── Draft Management for Session Creation (Strictly Date-Scoped via API / PostgreSQL) ───
  const initialDraft = null;

  // Wizard Step State: 1 | 2 | 3
  const [currentStep, setCurrentStep] = useState(1);

  // ─── Step 1 State: Session Setup ───
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => targetInitialDate.calDate);
  const [selectedDayNumber, setSelectedDayNumber] = useState(() => targetInitialDate.dayNumber);
  const [capacity, setCapacity] = useState(10);
  const [slotCapacityMap, setSlotCapacityMap] = useState({});

  // Normalized Session Date in YYYY-MM-DD
  const selectedSessionDateYYYYMMDD = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = String(currentCalendarDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDayNumber).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [currentCalendarDate, selectedDayNumber]);

  // Formatted Date String
  const formattedSessionDate = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const monthName = currentCalendarDate.toLocaleString('default', { month: 'short' });
    const dayName = new Date(year, currentCalendarDate.getMonth(), selectedDayNumber).toLocaleString('default', { weekday: 'long' });
    return `${dayName}, ${monthName} ${selectedDayNumber}, ${year}`;
  }, [currentCalendarDate, selectedDayNumber]);

  // Dynamic draft key strictly scoped to current user/school and selected date
  const draftKey = useMemo(() => {
    return `surfing_session_draft_${currentUser?.school_id || currentUser?.id || 'default'}_${selectedSessionDateYYYYMMDD}`;
  }, [currentUser, selectedSessionDateYYYYMMDD]);

  // Handle Calendar Day Selection in Step 1
  const handleSelectCalendarDay = (day) => {
    if (day === selectedDayNumber) return;
    setSelectedDayNumber(day);
    // When switching dates in Step 1, reset groups & slot mapping so previous day's grouping doesn't spill over
    if (!editSession) {
      setTrainingGroups([]);
      setSlotStudentMap({});
      setStep3CheckedStudentIdsBySlot({});
      setActiveDropGroupId(null);
      userClearedGroupsRef.current = false;
      lastSyncedDateRef.current = null;
      setSlotCapacityMap({});
    }
  };

  // Initialize from initialDate or searchParams when prop changes
  useEffect(() => {
    if (initialDraft) return;
    if (targetInitialDate) {
      setCurrentCalendarDate(targetInitialDate.calDate);
      setSelectedDayNumber(targetInitialDate.dayNumber);
    }
  }, [targetInitialDate, initialDraft]);

  // Dynamic slots loaded directly from Session Configuration (always live, never frozen by old drafts)
  const [slots, setSlots] = useState(() => loadConfiguredSlots());
  const [isCustomForDate, setIsCustomForDate] = useState(false);
  const [customDatesList, setCustomDatesList] = useState([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(() => initialDraft?.selectedSlotId ?? null);

  // Fetch central database slots for this specific date (or master default)
  useEffect(() => {
    let isCancelled = false;
    const fetchSlotsForDate = async () => {
      try {
        setIsSlotsLoading(true);
        const schoolId = currentUser?.school_id || null;
        let rawSchool = activeSchoolName || currentUser?.school || currentUser?.school_name || '';
        if (typeof rawSchool === 'object') rawSchool = rawSchool?.name || rawSchool?.school_name || '';
        if (String(rawSchool).toLowerCase() === 'school admin' || String(rawSchool).toLowerCase() === 'super admin') {
          rawSchool = activeSchoolName || '';
        }
        const schoolName = String(rawSchool).trim();

        const params = new URLSearchParams();
        if (schoolId) params.set('school_id', schoolId);
        if (schoolName && schoolName.toLowerCase() !== 'school admin' && schoolName.toLowerCase() !== 'super admin') {
          params.set('school_name', schoolName);
        }
        if (selectedSessionDateYYYYMMDD) params.set('date', selectedSessionDateYYYYMMDD);

        const res = await fetch(`${API}/api/session-slots?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;

        if (data && data.status === 'success' && Array.isArray(data.slots) && data.slots.length > 0) {
          const norm = normalizeConfiguredSlots(data.slots);
          setSlots(norm);
          setIsCustomForDate(Boolean(data.is_custom_date));
          if (Array.isArray(data.custom_dates)) setCustomDatesList(data.custom_dates);

          // Update slotCapacityMap with capacities directly from DB slots for this date
          const freshCapMap = {};
          norm.forEach(s => {
            const maxS = parseInt(s.maxStudents, 10);
            if (!isNaN(maxS) && maxS > 0) {
              freshCapMap[s.id] = maxS;
            }
          });
          setSlotCapacityMap(freshCapMap);

          // Update active slot capacity to match the newly loaded date's configuration
          const targetSlotId = selectedSlotId || norm[0]?.id;
          const matchedSlot = norm.find(s => s.id === targetSlotId) || norm[0];
          if (matchedSlot) {
            const cap = parseInt(matchedSlot.maxStudents, 10);
            if (!isNaN(cap) && cap > 0) {
              setCapacity(cap);
            }
          }
        }
      } catch (err) {
        console.warn('Failed loading slots for date:', err);
      } finally {
        if (!isCancelled) setIsSlotsLoading(false);
      }
    };

    fetchSlotsForDate();

    return () => {
      isCancelled = true;
    };
  }, [selectedSessionDateYYYYMMDD, currentUser, activeSchoolName]);

  const getSlotCapacity = (slot) => {
    if (!slot) return capacity || 5;
    if (slotCapacityMap[slot.id] !== undefined) {
      return slotCapacityMap[slot.id];
    }
    const defaultMax = parseInt(slot.maxStudents, 10);
    return (!isNaN(defaultMax) && defaultMax > 0) ? defaultMax : 5;
  };

  const slotSaveTimerRef = useRef(null);

  const handleUpdateSlotCapacity = (slotId, newVal) => {
    let parsedNum = newVal;
    if (newVal !== '') {
      const n = parseInt(newVal, 10);
      parsedNum = isNaN(n) ? '' : Math.max(1, Math.min(500, n));
    }
    setSlotCapacityMap(prev => ({
      ...prev,
      [slotId]: parsedNum
    }));
    let updatedSlots = slots;
    if (parsedNum !== '') {
      updatedSlots = slots.map(s => s.id === slotId ? { ...s, maxStudents: parsedNum } : s);
      setSlots(updatedSlots);
    }
    if (slotId === selectedSlotId) {
      if (parsedNum !== '') {
        setCapacity(parsedNum);
      }
    }

    // Customizing slot capacity marks this date as custom on the calendar and persists to DB
    if (parsedNum !== '') {
      setIsCustomForDate(true);
      setCustomDatesList(prev => Array.from(new Set([...prev, selectedSessionDateYYYYMMDD])));

      if (slotSaveTimerRef.current) clearTimeout(slotSaveTimerRef.current);
      slotSaveTimerRef.current = setTimeout(() => {
        try {
          const schoolId = currentUser?.school_id || null;
          let rawSchool = activeSchoolName || currentUser?.school || currentUser?.school_name || '';
          if (typeof rawSchool === 'object') rawSchool = rawSchool?.name || rawSchool?.school_name || '';
          if (String(rawSchool).toLowerCase() === 'school admin' || String(rawSchool).toLowerCase() === 'super admin') {
            rawSchool = activeSchoolName || '';
          }
          const schoolName = String(rawSchool).trim();

          fetch(`${API}/api/session-slots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              school_id: schoolId,
              school_name: schoolName,
              date: selectedSessionDateYYYYMMDD,
              slots: updatedSlots
            })
          }).catch(err => console.warn('Failed saving custom slot capacity to DB:', err));
        } catch (err) { }
      }, 500);
    }
  };

  const handleSelectSlot = (slot) => {
    if (!slot) return;
    setSelectedSlotId(slot.id);
    const cap = getSlotCapacity(slot);
    if (cap !== '' && !isNaN(parseInt(cap, 10))) {
      setCapacity(parseInt(cap, 10));
    }
  };

  // Toggle Slot Active / Inactive directly from the schedule wizard (Custom to this date)
  const handleToggleSlotActive = async (slotId, e) => {
    if (e) e.stopPropagation();

    const updated = slots.map(s => {
      if (s.id === slotId) {
        const nextActive = s.active === false ? true : false;
        return { ...s, active: nextActive };
      }
      return s;
    });

    setSlots(updated);
    setIsCustomForDate(true);
    setCustomDatesList(prev => Array.from(new Set([...prev, selectedSessionDateYYYYMMDD])));

    // If currently selected slot was turned inactive, auto-fallback to an active slot
    const currentToggled = updated.find(s => s.id === slotId);
    if (currentToggled && currentToggled.active === false && selectedSlotId === slotId) {
      const otherActive = updated.find(s => s.id !== slotId && s.active !== false);
      if (otherActive) {
        setSelectedSlotId(otherActive.id);
      }
    } else if (currentToggled && currentToggled.active === true && (!selectedSlotId || selectedSlotId === slotId)) {
      setSelectedSlotId(currentToggled.id);
    }

    // Persist to central PostgreSQL database specifically for THIS DATE
    try {
      const schoolId = currentUser?.school_id || null;
      let rawSchool = activeSchoolName || currentUser?.school || currentUser?.school_name || '';
      if (typeof rawSchool === 'object') rawSchool = rawSchool?.name || rawSchool?.school_name || '';
      if (String(rawSchool).toLowerCase() === 'school admin' || String(rawSchool).toLowerCase() === 'super admin') {
        rawSchool = activeSchoolName || '';
      }
      const schoolName = String(rawSchool).trim();

      fetch(`${API}/api/session-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          school_name: schoolName,
          date: selectedSessionDateYYYYMMDD,
          slots: updated
        })
      }).catch(err => console.warn('Failed saving custom date slot toggle to DB:', err));
    } catch (err) { }
  };

  // Open modal to edit this slot's time, duration, and capacity
  const handleEditSlot = (slot, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!slot) return;
    const dur = parseInt(slot.duration, 10) || 90;
    const cap = getSlotCapacity(slot);
    const start = slot.startTime || (slot.time ? slot.time.split(' - ')[0].trim() : '08:30 AM');
    setEditingSlotModal({
      mode: 'edit',
      id: slot.id,
      time: start,
      duration: dur,
      maxStudents: cap,
      days: slot.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      active: slot.active !== false
    });
  };

  // Delete a slot specifically for this session date
  const handleDeleteSlot = (slotId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const slotToDelete = slots.find(s => s.id === slotId);
    const slotLabel = slotToDelete ? (slotToDelete.time || slotToDelete.startTime || 'this slot') : 'this slot';

    setConfirmModal({
      isOpen: true,
      title: 'Delete Time Slot?',
      message: `Delete "${slotLabel}" for ${formattedSessionDate}?\n\nThis slot will be removed for today and marked as a custom schedule. You can restore it anytime with "Reset to Default".`,
      confirmText: 'Delete Slot',
      cancelText: 'Cancel',
      isDanger: true,
      iconType: 'trash',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        executeDeleteSlot(slotId);
      }
    });
  };

  const executeDeleteSlot = (slotId) => {
    const updated = slots.filter(s => s.id !== slotId);
    setSlots(updated);
    setIsCustomForDate(true);
    setCustomDatesList(prev => Array.from(new Set([...prev, selectedSessionDateYYYYMMDD])));

    // If currently selected slot was deleted, auto-fallback to another active slot
    if (selectedSlotId === slotId) {
      const nextActive = updated.find(s => s.active !== false) || updated[0];
      if (nextActive) {
        setSelectedSlotId(nextActive.id);
        const cap = getSlotCapacity(nextActive);
        setCapacity(cap);
      } else {
        setSelectedSlotId(null);
      }
    }

    // Also remove slot from slotStudentMap if students were assigned to it
    setSlotStudentMap(prevMap => {
      if (!prevMap || !prevMap[slotId]) return prevMap;
      const nextMap = { ...prevMap };
      delete nextMap[slotId];
      return nextMap;
    });

    // Persist custom date slots to central PostgreSQL database
    try {
      const schoolId = currentUser?.school_id || null;
      let rawSchool = activeSchoolName || currentUser?.school || currentUser?.school_name || '';
      if (typeof rawSchool === 'object') rawSchool = rawSchool?.name || rawSchool?.school_name || '';
      if (String(rawSchool).toLowerCase() === 'school admin' || String(rawSchool).toLowerCase() === 'super admin') {
        rawSchool = activeSchoolName || '';
      }
      const schoolName = String(rawSchool).trim();

      fetch(`${API}/api/session-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          school_name: schoolName,
          date: selectedSessionDateYYYYMMDD,
          slots: updated
        })
      }).catch(err => console.warn('Failed saving custom slots after delete:', err));
    } catch (err) { }
  };

  // Reset this specific date's schedule back to the Default Template
  const handleResetToDefault = (e) => {
    if (e) e.stopPropagation();

    setConfirmModal({
      isOpen: true,
      title: 'Reset to Default?',
      message: `Reset slots for ${formattedSessionDate} back to Default Template?\n\nThis will remove custom slots configured specifically for this date.`,
      confirmText: 'Reset to Default',
      cancelText: 'Cancel',
      isDanger: false,
      iconType: 'reset',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        executeResetToDefault();
      }
    });
  };

  const executeResetToDefault = async () => {
    try {
      const schoolId = currentUser?.school_id || null;
      let rawSchool = activeSchoolName || currentUser?.school || currentUser?.school_name || '';
      if (typeof rawSchool === 'object') rawSchool = rawSchool?.name || rawSchool?.school_name || '';
      if (String(rawSchool).toLowerCase() === 'school admin' || String(rawSchool).toLowerCase() === 'super admin') {
        rawSchool = activeSchoolName || '';
      }
      const schoolName = String(rawSchool).trim();

      const queryParams = new URLSearchParams();
      if (schoolId) queryParams.set('school_id', schoolId);
      if (schoolName && schoolName.toLowerCase() !== 'school admin' && schoolName.toLowerCase() !== 'super admin') {
        queryParams.set('school_name', schoolName);
      }
      queryParams.set('date', selectedSessionDateYYYYMMDD);

      await fetch(`${API}/api/session-slots?${queryParams.toString()}`, {
        method: 'DELETE'
      });

      // Refetch the default master slots
      const getParams = new URLSearchParams();
      if (schoolId) getParams.set('school_id', schoolId);
      if (schoolName) getParams.set('school_name', schoolName);

      const res = await fetch(`${API}/api/session-slots?${getParams.toString()}`);
      const data = await res.json();
      if (data && data.status === 'success' && Array.isArray(data.slots) && data.slots.length > 0) {
        const norm = normalizeConfiguredSlots(data.slots);
        setSlots(norm);
        const resetCapMap = {};
        norm.forEach(s => {
          const maxS = parseInt(s.maxStudents, 10);
          if (!isNaN(maxS) && maxS > 0) {
            resetCapMap[s.id] = maxS;
          }
        });
        setSlotCapacityMap(resetCapMap);
        if (selectedSlotId && resetCapMap[selectedSlotId] !== undefined) {
          setCapacity(resetCapMap[selectedSlotId]);
        }
      } else {
        const norm = loadConfiguredSlots();
        setSlots(norm);
        const resetCapMap = {};
        norm.forEach(s => {
          const maxS = parseInt(s.maxStudents, 10);
          if (!isNaN(maxS) && maxS > 0) {
            resetCapMap[s.id] = maxS;
          }
        });
        setSlotCapacityMap(resetCapMap);
        if (selectedSlotId && resetCapMap[selectedSlotId] !== undefined) {
          setCapacity(resetCapMap[selectedSlotId]);
        }
      }
      setIsCustomForDate(false);
      setCustomDatesList(prev => prev.filter(d => d !== selectedSessionDateYYYYMMDD));
    } catch (err) {
      console.warn('Failed resetting to default slots:', err);
    }
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
  }, [selectedSlotId, slotCapacityMap, slots]);

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

  const [spotName, setSpotName] = useState(() => initialDraft?.spotName || '');
  const [editingSlotModal, setEditingSlotModal] = useState(null);

  const modalTimeIsDuplicate = useMemo(() => {
    if (!editingSlotModal || !editingSlotModal.time) return false;
    const targetNorm = normalizeTimeString(editingSlotModal.time);
    if (!targetNorm) return false;
    return slots.some(s => s.id !== editingSlotModal.id && normalizeTimeString(s.startTime || s.time) === targetNorm);
  }, [editingSlotModal, slots]);

  // ─── Step 2 State: Roster Selector Pool (Real School Students) ───
  const [dbStudents, setDbStudents] = useState([]);
  const [levelFilter, setLevelFilter] = useState(() => initialDraft?.levelFilter || 'all');
  const [selectionFilter, setSelectionFilter] = useState(() => initialDraft?.selectionFilter || 'all');
  const [selectedSessionSlotFilter, setSelectedSessionSlotFilter] = useState(() => initialDraft?.selectedSessionSlotFilter || 'all');
  const [courseDayFilter, setCourseDayFilter] = useState(() => initialDraft?.courseDayFilter || 'all');
  const [expectedTimeFilter, setExpectedTimeFilter] = useState(() => initialDraft?.expectedTimeFilter || 'all');
  const [genderFilterStep2, setGenderFilterStep2] = useState(() => initialDraft?.genderFilterStep2 || 'all');
  const [swimmingFilterStep2, setSwimmingFilterStep2] = useState(() => initialDraft?.swimmingFilterStep2 || 'all');
  const [dayFilter, setDayFilter] = useState('all');
  const [selectedSlotStep2, setSelectedSlotStep2] = useState(() => initialDraft?.selectedSlotStep2 || 1);
  const [studentSearchStep2, setStudentSearchStep2] = useState('');
  const [showMoreFiltersMobile, setShowMoreFiltersMobile] = useState(false);
  const [isRefreshingStudents, setIsRefreshingStudents] = useState(false);
  const [refreshSuccessMessage, setRefreshSuccessMessage] = useState('');
  const refreshTimerRef = useRef(null);
  const activeStudentsCountRef = useRef(0);

  // ─── Step 2 State: Per-Slot Student Selection Mapping ───
  // Map of slotId -> array of studentIds selected for that specific slot
  const [slotStudentMap, setSlotStudentMap] = useState(() => initialDraft?.slotStudentMap || {});

  // ─── Step 3 State: Instructor Groups Matching (Real School Instructors) ───
  const [dbInstructors, setDbInstructors] = useState([]);
  const [step3DayFilter, setStep3DayFilter] = useState(() => initialDraft?.step3DayFilter || 'all');
  const [step3StatusFilter, setStep3StatusFilter] = useState(() => initialDraft?.step3StatusFilter || 'unassigned');
  const [step3LevelFilter, setStep3LevelFilter] = useState(() => initialDraft?.step3LevelFilter || 'all');
  const [step3GenderFilter, setStep3GenderFilter] = useState(() => initialDraft?.step3GenderFilter || 'all');
  const [step3SwimmingFilter, setStep3SwimmingFilter] = useState(() => initialDraft?.step3SwimmingFilter || 'all');
  const [step3CoachGenderFilter, setStep3CoachGenderFilter] = useState(() => initialDraft?.step3CoachGenderFilter || 'all');
  const [step3SlotFilter, setStep3SlotFilter] = useState(() => {
    if (initialDraft?.step3SlotFilter) return initialDraft.step3SlotFilter;
    const initialSlots = loadConfiguredSlots();
    return initialSlots[0]?.id || 1;
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [instructorSearch, setInstructorSearch] = useState('');
  const [step3CheckedStudentIdsBySlot, setStep3CheckedStudentIdsBySlot] = useState(() => initialDraft?.step3CheckedStudentIdsBySlot || {});

  const [trainingGroups, setTrainingGroups] = useState(() => initialDraft?.trainingGroups || []);
  const [activeDropGroupId, setActiveDropGroupId] = useState(() => initialDraft?.activeDropGroupId || null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [draggingType, setDraggingType] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedStats, setPublishedStats] = useState({ sessionsCount: 1, slotsCount: 1 });
  const [uiAlert, setUiAlert] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: false,
    iconType: 'trash',
    onConfirm: null
  });
  const [existingDbSessions, setExistingDbSessions] = useState([]);
  const [dbLeaveRequests, setDbLeaveRequests] = useState([]);

  // ─── Draft Auto-Saving Helpers ───
  const isDiscardingRef = useRef(false);
  const userClearedGroupsRef = useRef(false);
  const isDraftSavedRef = useRef(false);
  const originalSavedDraftRef = useRef(null);
  const draftLoadedForDateRef = useRef(null);
  const savedScrollPosRef = useRef(null);

  const hasProgressToSave = useMemo(() => {
    if (editSession || isDiscardingRef.current || userClearedGroupsRef.current) return false;
    const hasSlots = Object.keys(slotStudentMap).some(k => Array.isArray(slotStudentMap[k]) && slotStudentMap[k].length > 0);
    const hasGroups = Array.isArray(trainingGroups) && trainingGroups.length > 0;
    const isPastStep1 = currentStep > 1;
    return hasSlots || hasGroups || isPastStep1;
  }, [editSession, slotStudentMap, trainingGroups, currentStep]);

  const backendDebounceTimerRef = useRef(null);

  const saveDraftToBackend = useCallback((payload, immediate = false) => {
    if (backendDebounceTimerRef.current) {
      clearTimeout(backendDebounceTimerRef.current);
      backendDebounceTimerRef.current = null;
    }

    const doFetch = async () => {
      try {
        const schoolId = currentUser?.school_id || null;
        const rawSchool = currentUser?.school || currentUser?.school_name || activeSchoolName || '';
        const schoolName = typeof rawSchool === 'object' ? (rawSchool?.name || rawSchool?.school_name || '') : String(rawSchool);

        await fetch(`${API}/api/session-drafts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_id: schoolId,
            school_name: schoolName,
            date: selectedSessionDateYYYYMMDD,
            draft_data: payload
          })
        });
      } catch (err) {
        console.warn('Failed saving draft to backend:', err);
      }
    };

    if (immediate) {
      doFetch();
    } else {
      backendDebounceTimerRef.current = setTimeout(doFetch, 800);
    }
  }, [currentUser, activeSchoolName, selectedSessionDateYYYYMMDD]);

  // Fetch session draft from Database on mount and whenever selected session date changes
  useEffect(() => {
    if (editSession) return;
    let isCancelled = false;

    const fetchDbDraft = async () => {
      try {
        const schoolId = currentUser?.school_id || null;
        const rawSchool = currentUser?.school || currentUser?.school_name || activeSchoolName || '';
        const schoolName = typeof rawSchool === 'object' ? (rawSchool?.name || rawSchool?.school_name || '') : String(rawSchool);

        const params = new URLSearchParams();
        if (schoolId) params.set('school_id', schoolId);
        if (schoolName) params.set('school_name', schoolName);
        if (selectedSessionDateYYYYMMDD) params.set('date', selectedSessionDateYYYYMMDD);

        const res = await fetch(`${API}/api/session-drafts?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;

        if (data && data.status === 'success' && data.draft && typeof data.draft === 'object') {
          const draft = data.draft;
          if (!isDiscardingRef.current && !userClearedGroupsRef.current) {
            draftLoadedForDateRef.current = selectedSessionDateYYYYMMDD;
            lastSyncedDateRef.current = formattedSessionDate;

            if (draft.currentStep && draft.currentStep > 1) setCurrentStep(draft.currentStep);
            if (draft.capacity !== undefined) setCapacity(draft.capacity);
            if (draft.slotCapacityMap) setSlotCapacityMap(draft.slotCapacityMap);
            const mergedSlotMap = (draft.slotStudentMap && typeof draft.slotStudentMap === 'object') ? { ...draft.slotStudentMap } : {};
            if (Array.isArray(draft.trainingGroups)) {
              draft.trainingGroups.forEach(grp => {
                if (!grp.isExistingDbGroup && grp.slotId && Array.isArray(grp.studentIds) && grp.studentIds.length > 0) {
                  const sIdKey = String(grp.slotId);
                  const currentInSlot = (mergedSlotMap[sIdKey] || mergedSlotMap[grp.slotId] || []).map(String);
                  const combined = Array.from(new Set([...currentInSlot, ...grp.studentIds.map(String)]));
                  mergedSlotMap[grp.slotId] = combined;
                  mergedSlotMap[sIdKey] = combined;
                }
              });
            }
            // Sanitize mergedSlotMap: never keep DB-scheduled students in wizard slotStudentMap
            Object.keys(mergedSlotMap).forEach(sId => {
              if (Array.isArray(mergedSlotMap[sId])) {
                mergedSlotMap[sId] = mergedSlotMap[sId].filter(id => {
                  const st = allPoolStudents.find(s => String(s.id) === String(id));
                  return !st || !isStudentScheduledInDbOnDate(st);
                });
              }
            });
            if (Object.keys(mergedSlotMap).length > 0) {
              setSlotStudentMap(mergedSlotMap);
            }
            if (Array.isArray(draft.trainingGroups) && draft.trainingGroups.length > 0) {
              setTrainingGroups(draft.trainingGroups);
            }
            if (draft.activeDropGroupId !== undefined) setActiveDropGroupId(draft.activeDropGroupId);
            if (draft.selectedSlotStep2) setSelectedSlotStep2(draft.selectedSlotStep2);
            if (draft.step3SlotFilter) setStep3SlotFilter(draft.step3SlotFilter);
            if (draft.step3CheckedStudentIdsBySlot) setStep3CheckedStudentIdsBySlot(draft.step3CheckedStudentIdsBySlot);
            if (draft.levelFilter) setLevelFilter(draft.levelFilter);
            if (draft.selectionFilter) setSelectionFilter(draft.selectionFilter);
            if (draft.selectedSessionSlotFilter) setSelectedSessionSlotFilter(draft.selectedSessionSlotFilter);
            if (draft.courseDayFilter) setCourseDayFilter(draft.courseDayFilter);
            if (draft.expectedTimeFilter) setExpectedTimeFilter(draft.expectedTimeFilter);
            if (draft.genderFilterStep2) setGenderFilterStep2(draft.genderFilterStep2);
            if (draft.swimmingFilterStep2) setSwimmingFilterStep2(draft.swimmingFilterStep2);
            if (draft.step3DayFilter) setStep3DayFilter(draft.step3DayFilter);
            if (draft.step3StatusFilter) setStep3StatusFilter(draft.step3StatusFilter);
            if (draft.step3LevelFilter) setStep3LevelFilter(draft.step3LevelFilter);
            if (draft.step3GenderFilter) setStep3GenderFilter(draft.step3GenderFilter);
            if (draft.step3SwimmingFilter) setStep3SwimmingFilter(draft.step3SwimmingFilter);
            if (draft.step3CoachGenderFilter) setStep3CoachGenderFilter(draft.step3CoachGenderFilter);

            originalSavedDraftRef.current = JSON.stringify(draft);
            isDraftSavedRef.current = true;
            setHasSavedDraft(true);
          }
        }
      } catch (err) {
        console.warn('Failed fetching session draft from DB:', err);
      }
    };

    fetchDbDraft();
    return () => { isCancelled = true; };
  }, [selectedSessionDateYYYYMMDD, editSession, currentUser, activeSchoolName, draftKey]);

  const saveCurrentDraftToStorage = useCallback(() => {
    if (editSession || isDiscardingRef.current || userClearedGroupsRef.current) return;
    const hasSlots = Object.keys(slotStudentMap).some(k => Array.isArray(slotStudentMap[k]) && slotStudentMap[k].length > 0);
    const hasGroups = Array.isArray(trainingGroups) && trainingGroups.length > 0;
    const isPastStep1 = currentStep > 1;

    if (!hasSlots && !hasGroups && !isPastStep1) {
      return;
    }

    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      currentStep,
      calendarDateStr: currentCalendarDate ? currentCalendarDate.toISOString() : new Date().toISOString(),
      selectedDayNumber,
      capacity,
      slotCapacityMap,
      selectedSlotId,
      spotName,
      slotStudentMap,
      trainingGroups,
      activeDropGroupId,
      step3SlotFilter,
      selectedSlotStep2,
      levelFilter,
      selectionFilter,
      selectedSessionSlotFilter,
      courseDayFilter,
      expectedTimeFilter,
      genderFilterStep2,
      swimmingFilterStep2,
      step3DayFilter,
      step3StatusFilter,
      step3LevelFilter,
      step3GenderFilter,
      step3SwimmingFilter,
      step3CoachGenderFilter,
      step3CheckedStudentIdsBySlot,
    };

    try {
      saveDraftToBackend(payload, true);
      originalSavedDraftRef.current = JSON.stringify(payload);
      isDraftSavedRef.current = true;
    } catch (e) {
      console.warn('Failed saving session draft', e);
    }
  }, [
    editSession,
    draftKey,
    currentStep,
    currentCalendarDate,
    selectedDayNumber,
    capacity,
    slotCapacityMap,
    selectedSlotId,
    spotName,
    slotStudentMap,
    trainingGroups,
    activeDropGroupId,
    step3SlotFilter,
    selectedSlotStep2,
    levelFilter,
    selectionFilter,
    selectedSessionSlotFilter,
    courseDayFilter,
    expectedTimeFilter,
    genderFilterStep2,
    swimmingFilterStep2,
    step3DayFilter,
    step3StatusFilter,
    step3LevelFilter,
    step3GenderFilter,
    step3SwimmingFilter,
    step3CoachGenderFilter,
    step3CheckedStudentIdsBySlot,
    saveDraftToBackend,
  ]);

  // Prompt user on tab close/reload if they have unsaved session setup progress
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!editSession && hasProgressToSave && !isDraftSavedRef.current && !isDiscardingRef.current && !userClearedGroupsRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editSession, hasProgressToSave]);

  const [draftSavedToast, setDraftSavedToast] = useState(false);

  const handleManualSaveDraft = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    saveCurrentDraftToStorage();
    setDraftSavedToast(true);
    setHasSavedDraft(true);
    setTimeout(() => setDraftSavedToast(false), 2200);
  };

  const [clearDraftToast, setClearDraftToast] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const handleClearDraft = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setConfirmModal({
      isOpen: true,
      title: 'Clear Session Draft?',
      message: 'Are you sure you want to clear the draft and reset all selections for this session? All unsaved allocations and groups will be cleared.',
      confirmText: 'Clear Draft',
      cancelText: 'Cancel',
      isDanger: true,
      iconType: 'trash',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        executeClearDraft();
      }
    });
  };

  const executeClearDraft = () => {
    isDiscardingRef.current = true;
    userClearedGroupsRef.current = false;
    originalSavedDraftRef.current = null;
    isDraftSavedRef.current = true;

    // Clear draft from Database
    try {
      const schoolId = currentUser?.school_id || null;
      const rawSchool = currentUser?.school || currentUser?.school_name || activeSchoolName || '';
      const schoolName = typeof rawSchool === 'object' ? (rawSchool?.name || rawSchool?.school_name || '') : String(rawSchool);

      const params = new URLSearchParams();
      if (schoolId) params.set('school_id', schoolId);
      if (schoolName) params.set('school_name', schoolName);
      params.set('date', selectedSessionDateYYYYMMDD);

      fetch(`${API}/api/session-drafts?${params.toString()}`, {
        method: 'DELETE'
      }).catch(err => console.warn('Failed deleting draft from DB:', err));
    } catch (err) { }

    // If date has existing DB groups, restore them from DB!
    if (existingDbGroups && existingDbGroups.length > 0) {
      setTrainingGroups(existingDbGroups);
      setSlotStudentMap({});
      setSelectedSlotId(existingDbGroups[0].slotId || slots[0]?.id || null);
    } else {
      setTrainingGroups([]);
      setSlotStudentMap({});
      setSelectedSlotId(slots[0]?.id || null);
    }
    setStep3CheckedStudentIdsBySlot({});
    setSpotName('');
    setCurrentStep(1);
    setActiveDropGroupId(null);

    setClearDraftToast(true);
    setHasSavedDraft(false);
    setTimeout(() => {
      setClearDraftToast(false);
      isDiscardingRef.current = false;
    }, 2200);
  };

  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const showCloseConfirmModalRef = useRef(false);
  useEffect(() => {
    showCloseConfirmModalRef.current = showCloseConfirmModal;
  }, [showCloseConfirmModal]);

  const modalHistoryPushedRef = useRef(false);
  const hasProgressRef = useRef(hasProgressToSave);
  const onCloseRef = useRef(onClose);
  const mountedAtRef = useRef(Date.now());
  const isInitialLoadDoneRef = useRef(false);

  // Guarantee confirmation modal is strictly false on mount and initialize cooldown
  useEffect(() => {
    mountedAtRef.current = Date.now();
    setShowCloseConfirmModal(false);
    const timer = setTimeout(() => {
      isInitialLoadDoneRef.current = true;
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // When user modifies training groups, students, slot or spot, reset draft saved status
  useEffect(() => {
    if (isInitialLoadDoneRef.current) {
      isDraftSavedRef.current = false;
    }
  }, [trainingGroups, slotStudentMap, spotName, capacity, selectedSlotId, selectedSessionDateYYYYMMDD]);

  useEffect(() => {
    hasProgressRef.current = hasProgressToSave;
  }, [hasProgressToSave]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Request close: If unsaved progress exists without draft saved, ask user whether to save draft or not
  const handleRequestClose = () => {
    const hasUnsavedProgress = !editSession && hasProgressToSave && !isDraftSavedRef.current;

    if (hasUnsavedProgress) {
      setShowCloseConfirmModal(true);
    } else {
      if (isModal && modalHistoryPushedRef.current) {
        modalHistoryPushedRef.current = false;
        window.__newSessionIgnorePopState = true;
        window.history.back();
      }
      if (onClose) onClose();
      else navigate('/sessions');
    }
  };

  // User chose: Save draft & close
  const confirmSaveDraftAndClose = () => {
    saveCurrentDraftToStorage();
    isDraftSavedRef.current = true;
    setShowCloseConfirmModal(false);
    if (isModal && modalHistoryPushedRef.current) {
      modalHistoryPushedRef.current = false;
      window.__newSessionIgnorePopState = true;
      window.history.back();
    }
    if (onClose) onClose();
    else navigate('/sessions');
  };

  // User chose: Keep old draft as is (revert to original saved draft snapshot) & close
  const confirmKeepOldDraftAndClose = () => {
    if (originalSavedDraftRef.current) {
      try {
        const orig = JSON.parse(originalSavedDraftRef.current);
        saveDraftToBackend(orig, true);
      } catch (e) { }
    }
    setShowCloseConfirmModal(false);
    if (isModal && modalHistoryPushedRef.current) {
      modalHistoryPushedRef.current = false;
      window.__newSessionIgnorePopState = true;
      window.history.back();
    }
    if (onClose) onClose();
    else navigate('/sessions');
  };

  // User chose: Don't save (discard) & close
  const confirmDiscardAndClose = () => {
    isDiscardingRef.current = true;
    userClearedGroupsRef.current = true;
    if (originalSavedDraftRef.current) {
      // Revert backend to original saved draft snapshot
      try {
        const orig = JSON.parse(originalSavedDraftRef.current);
        saveDraftToBackend(orig, true);
      } catch (e) { }
    } else {
      // User never had a draft, ensure backend draft is deleted
      try {
        const schoolId = currentUser?.school_id || null;
        const rawSchool = currentUser?.school || currentUser?.school_name || activeSchoolName || '';
        const schoolName = typeof rawSchool === 'object' ? (rawSchool?.name || rawSchool?.school_name || '') : String(rawSchool);
        const delParams = new URLSearchParams({ date: selectedSessionDateYYYYMMDD });
        if (schoolId) delParams.set('school_id', schoolId);
        if (schoolName) delParams.set('school_name', schoolName);
        fetch(`${API}/api/session-drafts?${delParams.toString()}`, { method: 'DELETE' }).catch(() => { });
      } catch (e) { }
    }

    // Reset in-memory wizard states immediately
    setTrainingGroups([]);
    setSlotStudentMap({});
    setSelectedSlotId(null);
    setStep3CheckedStudentIdsBySlot({});
    setSpotName('');
    setCurrentStep(1);
    setActiveDropGroupId(null);

    setShowCloseConfirmModal(false);
    if (isModal && modalHistoryPushedRef.current) {
      modalHistoryPushedRef.current = false;
      window.__newSessionIgnorePopState = true;
      window.history.back();
    }
    if (onClose) onClose();
    else navigate('/sessions');
  };

  // User canceled close confirmation
  const handleCancelCloseConfirm = () => {
    setShowCloseConfirmModal(false);
    // If the browser back button was the trigger that popped history, re-push so future back clicks continue to work
    if (isModal && !modalHistoryPushedRef.current) {
      window.history.pushState({ isNewSessionModal: true }, '', window.location.href);
      modalHistoryPushedRef.current = true;
    }
  };

  // ─── Browser Back Button Interception (Stay on underlying page) ───
  useEffect(() => {
    if (!isModal) return;

    // Push a state entry so the browser back button triggers popstate instead of leaving the route
    window.history.pushState({ isNewSessionModal: true }, '', window.location.href);
    modalHistoryPushedRef.current = true;

    const handlePopState = () => {
      // Ignore programmatic history.back or events during the first 600ms of mount (e.g. StrictMode artifacts)
      if (window.__newSessionIgnorePopState) {
        window.__newSessionIgnorePopState = false;
        return;
      }
      if (Date.now() - mountedAtRef.current < 600) {
        return;
      }

      // Browser back button was clicked by the user
      // The history entry was already popped by the browser
      modalHistoryPushedRef.current = false;

      if (showCloseConfirmModalRef.current) {
        // Confirmation dialog was already open; back button dismisses it
        setShowCloseConfirmModal(false);
        // Re-push history entry so modal remains protected
        window.history.pushState({ isNewSessionModal: true }, '', window.location.href);
        modalHistoryPushedRef.current = true;
        return;
      }

      const hasUnsavedProgress = !editSession && hasProgressRef.current && !isDraftSavedRef.current;

      if (hasUnsavedProgress) {
        // Has progress to save -> prompt user
        setShowCloseConfirmModal(true);
      } else {
        // No progress or draft already saved -> close modal directly, user stays on the underlying page (e.g. /sessions)
        if (onCloseRef.current) {
          onCloseRef.current();
        } else {
          navigate('/sessions');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isModal, editSession, navigate]);

  // Check if an instructor is on approved leave on a given date (or current selected session date)
  const getInstructorLeaveOnDate = useCallback((inst, dateStr) => {
    if (!inst) return null;
    const targetDate = String(dateStr || selectedSessionDateYYYYMMDD).trim().substring(0, 10);
    if (!targetDate) return null;

    // 1. Check from dbLeaveRequests
    if (Array.isArray(dbLeaveRequests) && dbLeaveRequests.length > 0) {
      const found = dbLeaveRequests.find(l => {
        if ((l.status || '').toLowerCase() !== 'approved') return false;
        const lInstId = l.instructor_id || l.instructorId;
        const lInstName = (l.instructor_name || l.instructor || '').toLowerCase().trim();
        const instName = (inst.name || '').toLowerCase().trim();
        const isSame = (lInstId && String(lInstId) === String(inst.id)) || (instName && lInstName && lInstName === instName);
        if (!isSame) return false;
        const start = (l.start_date || '').trim().substring(0, 10);
        const end = (l.end_date || l.start_date || '').trim().substring(0, 10);
        return targetDate >= start && targetDate <= end;
      });
      if (found) return found;
    }

    // 2. Check from inst.approved_leaves (from backend /api/instructors)
    if (Array.isArray(inst.approved_leaves)) {
      const found = inst.approved_leaves.find(l => {
        const start = (l.start_date || '').trim().substring(0, 10);
        const end = (l.end_date || l.start_date || '').trim().substring(0, 10);
        return targetDate >= start && targetDate <= end;
      });
      if (found) return found;
    }

    // 3. Fallback to active_leave if matches
    if (inst.active_leave) {
      const start = (inst.active_leave.start_date || '').trim().substring(0, 10);
      const end = (inst.active_leave.end_date || inst.active_leave.start_date || '').trim().substring(0, 10);
      if (targetDate >= start && targetDate <= end) return inst.active_leave;
    }

    return null;
  }, [dbLeaveRequests, selectedSessionDateYYYYMMDD]);

  // Match existing DB sessions on selected session date
  const existingDbDateSessions = useMemo(() => {
    if (!existingDbSessions || existingDbSessions.length === 0) return [];
    const targetYYYYMMDD = selectedSessionDateYYYYMMDD;
    const targetFormatted = (formattedSessionDate || '').toLowerCase().trim();

    return existingDbSessions.filter(sess => {
      const sessDateStr = (sess.date || '').toString().trim();
      if (!sessDateStr) return false;
      const sessLow = sessDateStr.toLowerCase();

      // 1. Exact string match or substring match with formatted date (e.g. "Tuesday, Oct 20, 2026" or "Oct 20, 2026")
      if (targetFormatted && (sessLow.includes(targetFormatted) || targetFormatted.includes(sessLow))) {
        return true;
      }

      // 2. Exact match with YYYY-MM-DD
      if (sessDateStr.startsWith(targetYYYYMMDD) || sessDateStr === targetYYYYMMDD) {
        return true;
      }

      // 3. Parse date string safely (extract year, month, day without UTC timezone shifts)
      try {
        const dObj = new Date(sessDateStr);
        if (!isNaN(dObj.getTime())) {
          const y = dObj.getFullYear();
          const m = String(dObj.getMonth() + 1).padStart(2, '0');
          const d = String(dObj.getDate()).padStart(2, '0');
          if (`${y}-${m}-${d}` === targetYYYYMMDD) return true;

          const uy = dObj.getUTCFullYear();
          const um = String(dObj.getUTCMonth() + 1).padStart(2, '0');
          const ud = String(dObj.getUTCDate()).padStart(2, '0');
          if (`${uy}-${um}-${ud}` === targetYYYYMMDD) return true;
        }
      } catch (e) { }

      return false;
    });
  }, [existingDbSessions, formattedSessionDate, selectedSessionDateYYYYMMDD]);

  // Map student name / guest name / student id -> existing session scheduled details (group name, time, instructor)
  const existingDbScheduledInfoMapOnDate = useMemo(() => {
    const map = new Map();
    if (!existingDbDateSessions || existingDbDateSessions.length === 0) return map;

    existingDbDateSessions.forEach(sess => {
      const groupName = sess.group_name || sess.groupName || '';
      const timeStr = sess.time || '';
      const instructorName = sess.instructor || sess.instructor_name || '';
      const instructorId = sess.instructor_id || null;
      const info = {
        sessionId: sess.id,
        groupName: groupName,
        time: timeStr,
        instructorName: instructorName,
        instructorId: instructorId,
        session: sess
      };

      const isGuestSession = Boolean(sess.guest_name && sess.guest_name.trim());
      if (isGuestSession) {
        // Guest session: only the guest is scheduled, not the parent student
        map.set(sess.guest_name.toLowerCase().trim(), info);
      } else {
        // Regular (non-guest) session: student themselves is scheduled
        if (sess.student_name && sess.student_name.trim()) {
          map.set(sess.student_name.toLowerCase().trim(), info);
        }
        if (sess.student && sess.student.trim()) {
          map.set(sess.student.toLowerCase().trim(), info);
        }
        if (sess.student_id != null) {
          map.set(String(sess.student_id), info);
        }
      }

      if (Array.isArray(sess.sessions)) {
        sess.sessions.forEach(sub => {
          const subInfo = {
            sessionId: sub.id || sess.id,
            groupName: sub.group_name || sub.groupName || groupName,
            time: sub.time || timeStr,
            instructorName: sub.instructor || instructorName,
            instructorId: sub.instructor_id || instructorId,
            session: sub
          };
          const isSubGuest = Boolean(sub.guest_name && sub.guest_name.trim());
          if (isSubGuest) {
            map.set(sub.guest_name.toLowerCase().trim(), subInfo);
          } else {
            if (sub.student_name && sub.student_name.trim()) map.set(sub.student_name.toLowerCase().trim(), subInfo);
            if (sub.student && sub.student.trim()) map.set(sub.student.toLowerCase().trim(), subInfo);
            if (sub.student_id != null) map.set(String(sub.student_id), subInfo);
          }
        });
      }
    });

    return map;
  }, [existingDbDateSessions]);

  const existingScheduledStudentNamesOnDate = useMemo(() => {
    const setNames = new Set();
    existingDbDateSessions.forEach(sess => {
      const isGuestSession = Boolean(sess.guest_name && sess.guest_name.trim());
      if (isGuestSession) {
        // Guest session: only the guest name is scheduled
        setNames.add(sess.guest_name.toLowerCase().trim());
      } else {
        if (sess.student) setNames.add(sess.student.toLowerCase().trim());
        if (sess.student_name) setNames.add(sess.student_name.toLowerCase().trim());
      }
      if (Array.isArray(sess.sessions)) {
        sess.sessions.forEach(sub => {
          const isSubGuest = Boolean(sub.guest_name && sub.guest_name.trim());
          if (isSubGuest) {
            setNames.add(sub.guest_name.toLowerCase().trim());
          } else {
            if (sub.student) setNames.add(sub.student.toLowerCase().trim());
            if (sub.student_name) setNames.add(sub.student_name.toLowerCase().trim());
          }
        });
      }
    });
    return setNames;
  }, [existingDbDateSessions]);

  const isStudentScheduledInDbOnDate = (student) => {
    if (!student) return false;
    const nameLow = (student.name || '').toLowerCase().trim();
    const idStr = String(student.id);

    // If editing a session, students belonging to the session being edited are NOT considered conflicting/blocked
    if (editSession) {
      const editSessList = Array.isArray(editSession.sessions) && editSession.sessions.length > 0
        ? editSession.sessions
        : (editSession.id ? [editSession] : []);
      const isInEditSession = editSessList.some(sess => {
        const isGuest = Boolean(sess.guest_name && sess.guest_name.trim());
        if (student.isGuest) {
          return isGuest && (sess.guest_name || '').toLowerCase().trim() === nameLow;
        } else {
          if (isGuest) return false;
          if (sess.student_id != null && String(sess.student_id) === idStr) return true;
          const sName = (sess.student_name || sess.student || '').toLowerCase().trim();
          return Boolean(sName && sName === nameLow);
        }
      });
      if (isInEditSession) return false;
    }

    if (student.isGuest) {
      return existingScheduledStudentNamesOnDate.has(nameLow) ||
        existingDbScheduledInfoMapOnDate.has(nameLow);
    }

    // Strict ID check first: Only consider student scheduled if their specific student_id is in DB
    if (existingDbScheduledInfoMapOnDate.has(idStr)) {
      return true;
    }

    // Only fallback to name if the matching DB session has no student_id recorded
    const byName = existingDbScheduledInfoMapOnDate.get(nameLow);
    if (byName && byName.session && byName.session.student_id == null) {
      return true;
    }

    return false;
  };

  // Helper to extract school details
  const getActiveSchoolInfo = useCallback(() => {
    const activeSchoolStr = sessionStorage.getItem('activeSchool');
    let schoolName = '';
    let spotLoc = '';
    if (activeSchoolStr) {
      try {
        const parsed = JSON.parse(activeSchoolStr);
        if (parsed && typeof parsed === 'object') {
          schoolName = typeof parsed.name === 'string' ? parsed.name : parsed.name?.name;
        } else if (typeof parsed === 'string') {
          schoolName = parsed;
        }
        spotLoc = parsed?.city || parsed?.location || schoolName;
      } catch (e) {
        schoolName = activeSchoolStr;
        spotLoc = activeSchoolStr;
      }
    }
    if (!schoolName && currentUser?.school) {
      schoolName = typeof currentUser.school === 'string' ? currentUser.school : currentUser.school?.name;
      spotLoc = spotLoc || schoolName;
    }
    if (isCoachFreelance) {
      schoolName = 'Individual / Freelance Coach';
      spotLoc = spotLoc || schoolName;
    }
    const schoolParam = schoolName ? `?school=${encodeURIComponent(schoolName)}` : '';
    return { schoolName, schoolParam, spotLoc };
  }, [currentUser, isCoachFreelance]);

  // Helper to parse student data into normalized UI model
  const normalizeStudentsData = useCallback((data, schoolName) => {
    if (!Array.isArray(data)) return [];
    const filteredStudents = data.filter(s => {
      const sSchool = (s.school || s.school_name || '').toLowerCase().trim();
      if (isCoachFreelance) {
        return sSchool === 'individual / freelance coach' || (!sSchool && String(s.created_by_user_id) === String(currentUser?.instructor_id || currentUser?.id));
      }
      // Safety: if we know the active school, only show students from that school
      if (schoolName) {
        const targetSchool = schoolName.toLowerCase().trim();
        return sSchool === targetSchool;
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
        session_time: s.session_time || s.sessionTime || '',
        start_date: s.start_date || '',
        startDate: s.start_date || '',
        end_date: s.end_date || '',
        endDate: s.end_date || '',
        instructor_id: s.instructor_id || null,
        instructor: s.instructor || '',
        isReal: true,
        isGuest: false,
        age: s.age,
        dob: s.dob,
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
            session_time: g.session_time || s.session_time || s.sessionTime || '',
            start_date: s.start_date || '',
            startDate: s.start_date || '',
            end_date: s.end_date || '',
            endDate: s.end_date || '',
            instructor_id: s.instructor_id || null,
            instructor: s.instructor || '',
            isReal: true,
            isGuest: true,
            age: g.age,
            dob: g.dob,
            guestIndex: gIdx + 1,
            parentStudentId: s.id,
            parentStudentName: s.name
          });
        });
      }
    });

    return mapped;
  }, [currentUser, isCoachFreelance]);

  // Handler to manually refresh student roster and sessions from database
  const handleRefreshStudents = useCallback(async () => {
    if (isRefreshingStudents) return;
    setIsRefreshingStudents(true);
    setRefreshSuccessMessage('');

    try {
      const { schoolName, schoolParam } = getActiveSchoolInfo();
      const sep = schoolParam ? '&' : '?';
      const cacheBust = `_t=${Date.now()}`;

      // Re-fetch sessions & students simultaneously with cache buster so browser never serves stale cache
      const [sessionsRes, studentsRes] = await Promise.all([
        fetch(`${API}/api/sessions${schoolParam}${sep}${cacheBust}`).catch(() => null),
        fetch(`${API}/api/students${schoolParam}${sep}${cacheBust}`).catch(() => null)
      ]);

      let currentDbSessions = existingDbSessions;
      if (sessionsRes && sessionsRes.ok) {
        const sData = await sessionsRes.json();
        if (Array.isArray(sData)) {
          setExistingDbSessions(sData);
          currentDbSessions = sData;
        }
      }

      if (studentsRes && studentsRes.ok) {
        const data = await studentsRes.json();
        const mapped = normalizeStudentsData(data, schoolName);
        setDbStudents(mapped);

        // Helper to check collision with existing sessions on current date
        const isScheduledOnDate = (st) => {
          if (!st || !Array.isArray(currentDbSessions)) return false;
          const sName = (st.name || '').toLowerCase().trim();
          const sId = String(st.id);
          const isGuest = Boolean(st.isGuest);
          return currentDbSessions.some(sess => {
            const sessDate = (sess.date || '').toString();
            if (!sessDate.toLowerCase().includes(formattedSessionDate.toLowerCase()) && !formattedSessionDate.toLowerCase().includes(sessDate.toLowerCase())) return false;
            const isGuestSess = Boolean(sess.guest_name && sess.guest_name.trim());
            if (isGuest) {
              if (isGuestSess && sess.guest_name.toLowerCase().trim() === sName) return true;
              if (Array.isArray(sess.sessions)) {
                return sess.sessions.some(sub => sub.guest_name && sub.guest_name.toLowerCase().trim() === sName);
              }
              return false;
            } else {
              if (isGuestSess) return false;
              if (sess.student && sess.student.toLowerCase().trim() === sName) return true;
              if (sess.student_name && sess.student_name.toLowerCase().trim() === sName) return true;
              if (sess.student_id != null && String(sess.student_id) === sId) return true;
              if (Array.isArray(sess.sessions)) {
                return sess.sessions.some(sub =>
                  !sub.guest_name && (
                    (sub.student && sub.student.toLowerCase().trim() === sName) ||
                    (sub.student_name && sub.student_name.toLowerCase().trim() === sName) ||
                    (sub.student_id != null && String(sub.student_id) === sId)
                  )
                );
              }
              return false;
            }
          });
        };

        // Filter strictly active students for this session date
        const activeList = mapped.filter(s => {
          const status = getStudentStatusOnDate(s, selectedSessionDateYYYYMMDD);
          const isSched = isScheduledOnDate(s);
          return status.isActive || isSched;
        });

        const activeCount = activeList.length;
        const prevActiveCount = activeStudentsCountRef.current;
        const diff = activeCount - prevActiveCount;

        let msg = 'Roster is up to date';
        if (diff > 0) {
          msg = ` ${diff} new student${diff > 1 ? 's' : ''} added`;
        } else if (diff < 0) {
          msg = ' Roster updated';
        } else {
          msg = ' Roster is up to date';
        }
        setRefreshSuccessMessage(msg);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          setRefreshSuccessMessage('');
        }, 3500);
      }
    } catch (err) {
      console.error('Failed to refresh students:', err);
    } finally {
      setIsRefreshingStudents(false);
    }
  }, [isRefreshingStudents, getActiveSchoolInfo, normalizeStudentsData, existingDbSessions, formattedSessionDate, selectedSessionDateYYYYMMDD]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // Fetch real students & instructors from active school
  useEffect(() => {
    const { schoolName, schoolParam, spotLoc } = getActiveSchoolInfo();
    if (spotLoc) setSpotName(`${spotLoc} Beach`);

    // Fetch existing sessions for checking date collisions
    fetch(`${API}/api/sessions${schoolParam}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setExistingDbSessions(data);
      })
      .catch(() => { });

    fetch(`${API}/api/students${schoolParam}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = normalizeStudentsData(data, schoolName);
          setDbStudents(mapped);
        }
      })
      .catch(() => { });

    // Fetch leave requests for current school to cross-check coach availability
    fetch(`${API}/api/leave-requests${schoolParam}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDbLeaveRequests(data);
      })
      .catch(() => { });

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
                } catch (e) { }
              }
            }
            return {
              id: i.id,
              name: i.name,
              gender: i.gender || 'Male',
              role: roleStr,
              status: i.status || 'Available',
              avatar: (i.image && !i.image.includes('unsplash.com') && !i.image.includes('1500648767791')) ? i.image : '',
              isReal: true,
              approved_leaves: i.approved_leaves || [],
              is_on_leave: i.is_on_leave,
              active_leave: i.active_leave
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
                isReal: true,
                approved_leaves: currentUser.approved_leaves || [],
                is_on_leave: currentUser.is_on_leave,
                active_leave: currentUser.active_leave
              });
            }
          }

          setDbInstructors(mapped);
        }
      })
      .catch(() => { });
  }, [isCoachFreelance]);

  // Real Students Pool (Excludes students already scheduled on selected date)
  // In edit mode: load all students AND guests belonging to editSession, plus other pool students
  const allPoolStudents = useMemo(() => {
    if (editSession) {
      const sessList = Array.isArray(editSession.sessions) && editSession.sessions.length > 0
        ? editSession.sessions
        : (editSession.id ? [editSession] : []);

      const matched = [];
      const seenKeys = new Set();

      // 1. Process all sessions in editSession (Both Guests and Regular Students)
      sessList.forEach(sess => {
        const isGuest = Boolean(sess.guest_name && sess.guest_name.trim());
        const gName = isGuest ? sess.guest_name.trim() : '';
        const sName = (sess.student_name || sess.student || '').trim();
        const sid = sess.student_id;

        if (isGuest && gName) {
          const guestKey = `guest-${sid || '0'}-${gName.toLowerCase()}`;
          if (!seenKeys.has(guestKey)) {
            seenKeys.add(guestKey);
            const parentSt = dbStudents.find(st => sid != null && String(st.id) === String(sid));
            const pName = parentSt?.name || sName || 'Accompanying Guest';
            matched.push({
              id: `sess-guest-${sid || '0'}-${gName.replace(/\s+/g, '-').toLowerCase()}`,
              name: gName,
              gender: sess.gender || 'Male',
              level: sess.type || sess.level || 'Beginner',
              day: 'day1',
              whichDay: 1,
              totalDays: 3,
              courseDuration: '3 Days Course',
              waitlistGroup: '3 Days Course',
              avatar: sess.image || '',
              isReal: true,
              isGuest: true,
              isActiveOnDate: true,
              parentStudentId: sid,
              parentStudentName: pName
            });
          }
        } else {
          // Regular student: look up in dbStudents first
          const regSt = dbStudents.find(st => {
            if (sid != null && String(st.id) === String(sid)) return true;
            const stNameLow = (st.name || '').toLowerCase().trim();
            const sNameLow = sName.toLowerCase().trim();
            return Boolean(sNameLow && stNameLow === sNameLow);
          });

          const regKey = regSt ? `reg-${regSt.id}` : `reg-${sid || sName.toLowerCase()}`;
          if (!seenKeys.has(regKey)) {
            seenKeys.add(regKey);
            if (regSt) {
              matched.push({
                ...regSt,
                isGuest: false,
                isActiveOnDate: true
              });
            } else if (sName) {
              matched.push({
                id: sid || `session-st-${sName.replace(/\s+/g, '-').toLowerCase()}`,
                name: sName,
                gender: sess.gender || 'Male',
                level: sess.type || sess.level || 'Beginner',
                day: 'day1',
                whichDay: 1,
                totalDays: 3,
                courseDuration: '3 Days Course',
                waitlistGroup: '3 Days Course',
                avatar: sess.image || '',
                isReal: true,
                isGuest: false,
                isActiveOnDate: true
              });
            }
          }
        }
      });

      // 2. Also include other students from dbStudents so user can add new students if desired
      dbStudents.forEach(st => {
        const regKey = `reg-${st.id}`;
        if (!seenKeys.has(regKey)) {
          seenKeys.add(regKey);
          matched.push({
            ...st,
            isGuest: false,
            isActiveOnDate: true
          });
        }
      });

      return matched;
    }
    // Normal Create Mode:
    // Strictly show students who are active on the selected session date (within start_date + course duration days)
    // or who have a session booked on this date.
    const enrichedStudents = dbStudents.map(s => {
      const status = getStudentStatusOnDate(s, selectedSessionDateYYYYMMDD);
      const isScheduled = isStudentScheduledInDbOnDate(s);
      return {
        ...s,
        whichDay: status.whichDay || s.whichDay || 1,
        totalDays: status.totalDays || s.totalDays || 3,
        dateStatus: status.status, // 'active' | 'upcoming' | 'completed' | 'no_date'
        isActiveOnDate: status.isActive || isScheduled
      };
    });

    const activeList = enrichedStudents.filter(s => s.isActiveOnDate);

    // Guarantee that any student/guest in existing DB sessions on this date is in allPoolStudents
    if (existingDbDateSessions && existingDbDateSessions.length > 0) {
      existingDbDateSessions.forEach(sess => {
        const isGuest = Boolean(sess.guest_name && sess.guest_name.trim());
        const sName = isGuest ? sess.guest_name.trim() : (sess.student_name || sess.student || '').trim();
        const sId = sess.student_id;
        if (!sName) return;
        const sNameLow = sName.toLowerCase();
        const sessGuestSlug = isGuest ? `sess-guest-${sId || '0'}-${sName.replace(/\s+/g, '-').toLowerCase()}` : null;

        const existingObj = activeList.find(s => {
          if (Boolean(s.isGuest) !== isGuest) return false;
          if (isGuest) {
            const nameMatch = (s.name || '').toLowerCase().trim() === sNameLow;
            const parentMatch = sId == null || !s.parentStudentId || String(s.parentStudentId) === String(sId);
            return nameMatch && parentMatch;
          }
          return (sId != null && String(s.id) === String(sId)) || (s.name || '').toLowerCase().trim() === sNameLow;
        });

        if (existingObj) {
          if (isGuest && sessGuestSlug) {
            existingObj.sessGuestId = sessGuestSlug;
            if (!existingObj.parentStudentId && sId) existingObj.parentStudentId = sId;
            if (!existingObj.parentStudentName && (sess.student_name || sess.student)) {
              existingObj.parentStudentName = sess.student_name || sess.student;
            }
          }
        } else {
          activeList.push({
            id: isGuest ? sessGuestSlug : (sId || `sess-st-${sName.replace(/\s+/g, '-').toLowerCase()}`),
            sessGuestId: sessGuestSlug,
            name: sName,
            gender: sess.gender || 'Male',
            level: sess.type || sess.level || 'Beginner',
            day: 'day1',
            whichDay: 1,
            totalDays: 3,
            courseDuration: '3 Days Course',
            waitlistGroup: '3 Days Course',
            avatar: '',
            isReal: true,
            isGuest: isGuest,
            isActiveOnDate: true,
            parentStudentId: isGuest ? sId : null,
            parentStudentName: isGuest ? (sess.student_name || sess.student || null) : null
          });
        }
      });
    }

    return activeList;
  }, [dbStudents, isStudentScheduledInDbOnDate, editSession, selectedSessionDateYYYYMMDD, existingDbDateSessions]);

  useEffect(() => {
    activeStudentsCountRef.current = allPoolStudents.length;
  }, [allPoolStudents.length]);

  // Real Instructors (NO fake data)
  const allInstructors = dbInstructors;

  // Single Instructor for Individual Coach Account
  const currentIndividualCoach = useMemo(() => {
    if (!isIndividualCoach) return null;
    const myId = currentUser?.instructor_id || currentUser?.id;
    if (myId) {
      const found = allInstructors.find(i => String(i.id) === String(myId));
      if (found) return found;
    }
    if (allInstructors.length > 0) return allInstructors[0];
    return {
      id: myId || 1,
      name: currentUser?.name || 'Coach',
      gender: currentUser?.gender || 'Male',
      role: 'Head Coach',
      status: 'Available',
      avatar: currentUser?.image || '',
      isReal: true
    };
  }, [isIndividualCoach, currentUser, allInstructors]);

  // Filtered Instructors for Step 3 (Coach Gender Filter & Search)
  const filteredInstructors = useMemo(() => {
    return allInstructors.filter(inst => {
      // 1. Gender filter
      if (step3CoachGenderFilter !== 'all') {
        const g = (inst.gender || 'male').toLowerCase();
        if (g !== step3CoachGenderFilter.toLowerCase()) return false;
      }
      // 2. Search query filter
      if (instructorSearch && instructorSearch.trim()) {
        const q = instructorSearch.trim().toLowerCase();
        const name = (inst.name || '').toLowerCase();
        const role = (inst.role || '').toLowerCase();
        const spec = (inst.specialization || '').toLowerCase();
        const specs = Array.isArray(inst.specializations)
          ? inst.specializations.join(' ').toLowerCase()
          : (typeof inst.specializations === 'string' ? inst.specializations.toLowerCase() : '');
        const phone = String(inst.phone || inst.whatsapp_number || '').toLowerCase();
        if (!name.includes(q) && !role.includes(q) && !spec.includes(q) && !specs.includes(q) && !phone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allInstructors, step3CoachGenderFilter, instructorSearch]);

  // Track active vs on-leave coaches on selected session date
  const onLeaveInstructorsCount = useMemo(() => {
    return allInstructors.filter(i => Boolean(getInstructorLeaveOnDate(i, selectedSessionDateYYYYMMDD))).length;
  }, [allInstructors, getInstructorLeaveOnDate, selectedSessionDateYYYYMMDD]);

  const activeInstructorsCount = useMemo(() => {
    return Math.max(0, allInstructors.length - onLeaveInstructorsCount);
  }, [allInstructors.length, onLeaveInstructorsCount]);

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

    const matchedIds = [];
    const addedKeys = new Set();

    sessionList.forEach(sess => {
      const isGuest = Boolean(sess.guest_name && sess.guest_name.trim());
      const gName = isGuest ? sess.guest_name.trim() : '';
      const sName = (sess.student_name || sess.student || '').trim();
      const sid = sess.student_id;

      if (isGuest && gName) {
        const gLow = gName.toLowerCase();
        const foundGuest = allPoolStudents.find(s => s.isGuest && (s.name || '').toLowerCase().trim() === gLow);
        const guestId = foundGuest ? foundGuest.id : `sess-guest-${sid || '0'}-${gName.replace(/\s+/g, '-').toLowerCase()}`;
        if (!addedKeys.has(String(guestId))) {
          addedKeys.add(String(guestId));
          matchedIds.push(guestId);
        }
      } else {
        const foundReg = allPoolStudents.find(s => !s.isGuest && (
          (sid != null && String(s.id) === String(sid)) ||
          ((s.name || '').toLowerCase().trim() === sName.toLowerCase().trim())
        )) || dbStudents.find(st => (
          (sid != null && String(st.id) === String(sid)) ||
          ((st.name || '').toLowerCase().trim() === sName.toLowerCase().trim())
        ));

        const regId = foundReg ? foundReg.id : (sid || `session-st-${sName.replace(/\s+/g, '-').toLowerCase()}`);
        if (regId != null && !addedKeys.has(String(regId))) {
          addedKeys.add(String(regId));
          matchedIds.push(regId);
        }
      }
    });

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
      setSlotCapacityMap(prev => ({
        ...prev,
        [targetSlotId]: Math.max(prev[targetSlotId] || 0, matchedIds.length)
      }));
    }

    // 4. Pre-populate trainingGroups with existing group name and ALL assigned instructors
    const existingGroupName = editSession.groupName || editSession.group_name || 'Group A';
    const existingInstructor = editSession.instructor || '';
    const existingInstructorId = editSession.instructor_id || null;

    // Collect all instructor IDs from editSession
    let preloadedCoachIds = [];
    if (Array.isArray(editSession.instructor_ids) && editSession.instructor_ids.length > 0) {
      preloadedCoachIds = editSession.instructor_ids.map(Number).filter(id => !isNaN(id) && id > 0);
    }
    // Also check sessions array inside editSession if available
    if (Array.isArray(editSession.sessions)) {
      editSession.sessions.forEach(s => {
        if (Array.isArray(s.instructor_ids)) {
          s.instructor_ids.forEach(id => {
            const num = Number(id);
            if (!isNaN(num) && num > 0 && !preloadedCoachIds.includes(num)) preloadedCoachIds.push(num);
          });
        } else if (s.instructor_id) {
          const num = Number(s.instructor_id);
          if (!isNaN(num) && num > 0 && !preloadedCoachIds.includes(num)) preloadedCoachIds.push(num);
        }
      });
    }

    // Also parse comma-separated instructor names in editSession.instructor
    const coachNamesToFind = [];
    if (existingInstructor) {
      existingInstructor.split(',').forEach(n => {
        const clean = n.trim().toLowerCase();
        if (clean && !coachNamesToFind.includes(clean)) coachNamesToFind.push(clean);
      });
    }
    // Also check editSession.notes or session notes for "Coaches: Vishal, Dhanya"
    const notesStr = editSession.notes || (Array.isArray(editSession.sessions) ? editSession.sessions.map(s => s.notes || '').join(' ') : '');
    const coachMatch = notesStr.match(/Coaches:\s*([^-\n]+)/i);
    if (coachMatch && coachMatch[1]) {
      coachMatch[1].split(',').forEach(n => {
        const clean = n.trim().toLowerCase();
        if (clean && clean !== 'staff' && !coachNamesToFind.includes(clean)) coachNamesToFind.push(clean);
      });
    }

    coachNamesToFind.forEach(cName => {
      const match = (dbInstructors || []).find(ins => (ins.name || '').toLowerCase().trim() === cName);
      if (match && !preloadedCoachIds.includes(match.id)) {
        preloadedCoachIds.push(match.id);
      }
    });

    if (existingInstructorId) {
      const num = Number(existingInstructorId);
      if (!isNaN(num) && num > 0 && !preloadedCoachIds.includes(num)) {
        preloadedCoachIds.unshift(num);
      }
    }

    if (matchedIds.length > 0 || sessionList.length > 0) {
      setTrainingGroups([
        {
          id: 'group-edit-1',
          name: existingGroupName,
          day: 'Day 1',
          level: 'General',
          slotId: targetSlotId || null,
          studentIds: matchedIds,
          assignedInstructorId: preloadedCoachIds[0] || null,
          assignedInstructorIds: preloadedCoachIds,
        }
      ]);
      setActiveDropGroupId('group-edit-1');
    }

    // 5. Jump directly to Step 3
    setCurrentStep(3);
  }, [editSession, editSessionPreloaded, dbStudents, dbInstructors, slots, allPoolStudents]);

  // ── Helper to ensure groups are always strictly sorted by slot and alphabetically: Group A, Group B, Group C... ──
  const sortGroupsInOrder = (groupsList) => {
    if (!Array.isArray(groupsList)) return [];
    return [...groupsList].sort((a, b) => {
      // 1. If slots differ and slots array available, order by slot index
      if (String(a.slotId) !== String(b.slotId) && slots && slots.length > 0) {
        const slotIndexA = slots.findIndex(s => String(s.id) === String(a.slotId));
        const slotIndexB = slots.findIndex(s => String(s.id) === String(b.slotId));
        if (slotIndexA !== -1 && slotIndexB !== -1 && slotIndexA !== slotIndexB) {
          return slotIndexA - slotIndexB;
        }
      }
      // 2. Order naturally by Group Name: Group A, Group B, Group C, Group D...
      const nameA = (a.name || '').trim();
      const nameB = (b.name || '').trim();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  // ── Existing DB Groups for Selected Date ──
  const existingDbGroups = useMemo(() => {
    if (!existingDbDateSessions || existingDbDateSessions.length === 0) return [];

    const groupsMap = new Map();

    existingDbDateSessions.forEach(sess => {
      const groupName = sess.group_name || sess.groupName || 'Group A';
      const sessTime = (sess.time || '').trim().toLowerCase();

      const matchedSlot = slots.find(s => {
        const sTime = (s.time || s.startTime || '').trim().toLowerCase();
        return sTime === sessTime || sessTime.startsWith(sTime) || sTime.startsWith(sessTime.split(' - ')[0].trim());
      }) || slots[0];

      const slotId = matchedSlot ? matchedSlot.id : (slots[0]?.id || 1);
      const key = `${slotId}__${groupName}`;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          id: `db-group-${slotId}-${groupName.replace(/\s+/g, '-').toLowerCase()}`,
          name: groupName,
          day: 'Day 1',
          level: sess.type || sess.level || 'Intermediate',
          slotId: slotId,
          studentIds: [],
          assignedInstructorId: sess.instructor_id || null,
          assignedInstructorIds: sess.instructor_id ? [sess.instructor_id] : [],
          isExistingDbGroup: true,
          existingSessionIds: []
        });
      }

      const grpObj = groupsMap.get(key);
      if (sess.id && !grpObj.existingSessionIds.includes(sess.id)) {
        grpObj.existingSessionIds.push(sess.id);
      }
      // Collect all coaches from this sess
      const sessCoachIds = [];
      if (Array.isArray(sess.instructor_ids)) {
        sess.instructor_ids.forEach(cid => {
          const num = Number(cid);
          if (!isNaN(num) && num > 0 && !sessCoachIds.includes(num)) sessCoachIds.push(num);
        });
      }
      if (sess.instructor_id) {
        const num = Number(sess.instructor_id);
        if (!isNaN(num) && num > 0 && !sessCoachIds.includes(num)) sessCoachIds.push(num);
      }
      if (sess.instructor) {
        sess.instructor.split(',').forEach(n => {
          const cl = n.trim().toLowerCase();
          const match = (dbInstructors || []).find(ins => (ins.name || '').toLowerCase().trim() === cl);
          if (match && !sessCoachIds.includes(match.id)) sessCoachIds.push(match.id);
        });
      }
      const sNotes = sess.notes || '';
      const cMatch = sNotes.match(/Coaches:\s*([^-\n]+)/i);
      if (cMatch && cMatch[1]) {
        cMatch[1].split(',').forEach(n => {
          const cl = n.trim().toLowerCase();
          if (cl && cl !== 'staff') {
            const match = (dbInstructors || []).find(ins => (ins.name || '').toLowerCase().trim() === cl);
            if (match && !sessCoachIds.includes(match.id)) sessCoachIds.push(match.id);
          }
        });
      }
      sessCoachIds.forEach(cid => {
        if (!grpObj.assignedInstructorIds.includes(cid)) {
          grpObj.assignedInstructorIds.push(cid);
        }
      });
      if (!grpObj.assignedInstructorId && grpObj.assignedInstructorIds.length > 0) {
        grpObj.assignedInstructorId = grpObj.assignedInstructorIds[0];
      }

      // Match student from pool
      let matchedStudent = null;
      const gNameRaw = (sess.guest_name || '').trim();
      const sNameRaw = (sess.student_name || sess.student || '').trim();
      const gNameLow = gNameRaw.toLowerCase();
      const sNameLow = sNameRaw.toLowerCase();

      if (gNameLow) {
        const sessGuestSlug = `sess-guest-${sess.student_id || '0'}-${gNameLow.replace(/\s+/g, '-')}`;
        matchedStudent = allPoolStudents.find(s => s.isGuest && (
          s.sessGuestId === sessGuestSlug ||
          (s.name || '').toLowerCase().trim() === gNameLow ||
          (s.name || '').toLowerCase().trim().includes(gNameLow) ||
          gNameLow.includes((s.name || '').toLowerCase().trim())
        )) || (dbStudents || []).find(s => s.isGuest && (s.name || '').toLowerCase().trim() === gNameLow);
      }
      if (!matchedStudent && !gNameLow && sess.student_id != null) {
        matchedStudent = allPoolStudents.find(s => !s.isGuest && String(s.id) === String(sess.student_id))
          || (dbStudents || []).find(s => !s.isGuest && String(s.id) === String(sess.student_id));
      }
      if (!matchedStudent && !gNameLow && sNameLow) {
        matchedStudent = allPoolStudents.find(s => !s.isGuest && (s.name || '').toLowerCase().trim() === sNameLow)
          || (dbStudents || []).find(s => !s.isGuest && (s.name || '').toLowerCase().trim() === sNameLow);
      }

      const targetStudentId = matchedStudent ? matchedStudent.id : (gNameLow ? `sess-guest-${sess.student_id || '0'}-${gNameLow.replace(/\s+/g, '-')}` : sess.student_id);

      if (targetStudentId && !grpObj.studentIds.includes(targetStudentId)) {
        grpObj.studentIds.push(targetStudentId);
      }
    });

    return sortGroupsInOrder(Array.from(groupsMap.values()));
  }, [existingDbDateSessions, slots, allPoolStudents, dbInstructors]);

  // Check if session date already has published sessions in DB
  const isSessionAlreadyPublishedOnDate = useMemo(() => {
    if (editSession) return true;
    if (existingDbDateSessions && existingDbDateSessions.length > 0) return true;
    if (existingDbGroups && existingDbGroups.length > 0) return true;
    if (trainingGroups.some(g => g.isExistingDbGroup || (g.existingSessionIds && g.existingSessionIds.length > 0))) return true;
    return false;
  }, [editSession, existingDbDateSessions, existingDbGroups, trainingGroups]);

  // Synchronize existing DB groups into wizard state (slotStudentMap & trainingGroups)
  const lastSyncedDateRef = useRef(null);

  useEffect(() => {
    if (editSession) return;
    if (!existingDbGroups || existingDbGroups.length === 0) return;

    // Critical: If a draft was loaded or saved for this date, NEVER overwrite wizard state with existingDbGroups!
    if (draftLoadedForDateRef.current === selectedSessionDateYYYYMMDD || hasSavedDraft || isDraftSavedRef.current) {
      return;
    }

    const isNewDate = lastSyncedDateRef.current !== formattedSessionDate;

    // Once populated for this date, preserve all in-session slot changes and group edits
    if (!isNewDate) {
      return;
    }

    // Populate / merge into trainingGroups
    setTrainingGroups(existingDbGroups);

    // Populate slotStudentMap and ensure slot capacities reflect existing published sessions
    const slotPublishedCounts = {};
    existingDbGroups.forEach(grp => {
      if (grp.slotId && Array.isArray(grp.studentIds)) {
        slotPublishedCounts[grp.slotId] = (slotPublishedCounts[grp.slotId] || 0) + grp.studentIds.length;
      }
    });

    if (isNewDate) {
      setSlotStudentMap({});
    }

    // Ensure slot capacities match or accommodate published sessions
    setSlotCapacityMap(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(slotPublishedCounts).forEach(([sId, count]) => {
        if (!next[sId] || next[sId] < count) {
          next[sId] = count;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setSlots(prevSlots => prevSlots.map(s => {
      const pubCount = slotPublishedCounts[s.id];
      if (pubCount && (parseInt(s.maxStudents, 10) || 0) < pubCount) {
        return { ...s, maxStudents: pubCount };
      }
      return s;
    }));

    if (existingDbGroups.length > 0 && existingDbGroups[0].slotId) {
      if (!selectedSlotId || isNewDate) {
        setSelectedSlotId(existingDbGroups[0].slotId);
      }
      setStep3SlotFilter(existingDbGroups[0].slotId);
    }

    lastSyncedDateRef.current = formattedSessionDate;
  }, [existingDbGroups, formattedSessionDate, editSession, selectedSessionDateYYYYMMDD, hasSavedDraft]);

  // Helper to get any student's assigned group name (from wizard state or DB sessions)
  const getStudentAssignedGroup = (student) => {
    if (!student) return null;
    // 1. Wizard groups
    const inWizard = trainingGroups.find(g => (g.studentIds || []).some(id => String(id) === String(student.id)));
    if (inWizard) {
      return {
        name: inWizard.name,
        slotId: inWizard.slotId,
        source: 'wizard'
      };
    }

    // 2. Existing scheduled DB sessions on this date
    const nameKey = (student.name || '').toLowerCase().trim();
    const idKey = String(student.id);
    let dbInfo = existingDbScheduledInfoMapOnDate.get(idKey);
    if (!dbInfo && student.isGuest) {
      dbInfo = existingDbScheduledInfoMapOnDate.get(nameKey);
    } else if (!dbInfo) {
      const byName = existingDbScheduledInfoMapOnDate.get(nameKey);
      if (byName && byName.session && byName.session.student_id == null) {
        dbInfo = byName;
      }
    }
    if (dbInfo && dbInfo.groupName) {
      return {
        name: dbInfo.groupName,
        time: dbInfo.time,
        instructorName: dbInfo.instructorName,
        source: 'db'
      };
    }

    return null;
  };

  // Sync with Session Configuration changes (live in same tab or across tabs)
  useEffect(() => {
    const handleSlotsSync = (e) => {
      if (e && e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setSlots(normalizeConfiguredSlots(e.detail));
      }
    };

    // Purge any stale legacy session drafts and cached session slots from localStorage & sessionStorage
    try {
      const staleKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('surfing_session_draft') || k === 'session_slots')) {
          staleKeys.push(k);
        }
      }
      staleKeys.forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem('surfing_session_draft_discarded');
    } catch (e) { }

    window.addEventListener('session_slots_updated', handleSlotsSync);
    return () => {
      window.removeEventListener('session_slots_updated', handleSlotsSync);
    };
  }, []);

  // Live sync with storage events when slots change

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

  // Helper: Get all student IDs for a slot (accounting for published DB sessions/groups, wizard groups, and staged slot selections)
  const getSlotAllStudentIds = useCallback((slotOrId) => {
    if (!slotOrId) return [];
    const sId = typeof slotOrId === 'object' ? slotOrId.id : slotOrId;
    const slotObj = typeof slotOrId === 'object' ? slotOrId : slots.find(s => String(s.id) === String(sId));
    const sStart = (slotObj?.startTime || (slotObj?.time ? slotObj.time.split(' - ')[0] : '')).trim().toLowerCase();
    const sFull = (slotObj?.time || slotObj?.startTime || '').trim().toLowerCase();

    const studentIdSet = new Set();

    // 1. Wizard slot selections from Step 2
    const fromMap = slotStudentMap[sId] || slotStudentMap[String(sId)] || [];
    if (Array.isArray(fromMap)) {
      fromMap.forEach(id => {
        if (id != null) studentIdSet.add(String(id));
      });
    }

    const isGroupSlotMatch = (grp) => {
      if (!grp) return false;
      const grpSlotId = grp.slotId;
      if (grpSlotId != null && String(grpSlotId) === String(sId)) return true;
      if (!grpSlotId && slots[0] && String(slots[0].id) === String(sId)) return true;

      const grpTime = (grp.time || '').trim().toLowerCase();
      const grpSlotStr = typeof grpSlotId === 'string' ? grpSlotId.trim().toLowerCase() : '';
      const grpStart = (grp.time ? grp.time.split(' - ')[0] : (typeof grp.slotId === 'string' ? grp.slotId.split(' - ')[0] : '')).trim().toLowerCase();

      if (sStart && grpStart && sStart === grpStart) return true;
      if (sFull && (grpTime === sFull || grpSlotStr === sFull)) return true;
      return false;
    };

    // 2. Training groups in wizard state (includes both published groups and newly created groups)
    (trainingGroups || []).forEach(grp => {
      if (isGroupSlotMatch(grp)) {
        if (Array.isArray(grp.studentIds)) {
          grp.studentIds.forEach(id => {
            if (id != null) studentIdSet.add(String(id));
          });
        }
        if (Array.isArray(grp.students)) {
          grp.students.forEach(st => {
            if (st && st.id != null) studentIdSet.add(String(st.id));
          });
        }
      }
    });

    // 3. Existing DB groups (published sessions on this date)
    // Only count DB groups for students that are NOT in any active training group
    const allActiveWizardStudentIds = new Set();
    (trainingGroups || []).forEach(g => {
      (g.studentIds || []).forEach(id => {
        if (id != null) allActiveWizardStudentIds.add(String(id));
      });
    });

    (existingDbGroups || []).forEach(grp => {
      if (isGroupSlotMatch(grp)) {
        if (Array.isArray(grp.studentIds)) {
          grp.studentIds.forEach(id => {
            if (id != null && !allActiveWizardStudentIds.has(String(id))) {
              studentIdSet.add(String(id));
            }
          });
        }
        if (Array.isArray(grp.students)) {
          grp.students.forEach(st => {
            if (st && st.id != null && !allActiveWizardStudentIds.has(String(st.id))) {
              studentIdSet.add(String(st.id));
            }
          });
        }
      }
    });

    return Array.from(studentIdSet);
  }, [slots, slotStudentMap, trainingGroups, existingDbGroups]);

  // Total student count in a slot (including published sessions)
  const getSlotTotalStudentCount = useCallback((slotOrId) => {
    return getSlotAllStudentIds(slotOrId).length;
  }, [getSlotAllStudentIds]);

  // Helper: Find which slot a student is assigned to
  const getStudentSlotAssignment = (studentId) => {
    const stObj = allPoolStudents.find(s => String(s.id) === String(studentId));
    if (stObj && isStudentScheduledInDbOnDate(stObj)) {
      return null;
    }

    for (let idx = 0; idx < slots.length; idx++) {
      const s = slots[idx];
      const assignedIds = slotStudentMap[s.id] || slotStudentMap[String(s.id)] || [];
      if (assignedIds.some(id => String(id) === String(studentId))) {
        const theme = getSlotThemeForSlot(s.id);
        const activeIdx = activeSlotsForDay.findIndex(x => String(x.id) === String(s.id));
        return { slot: s, slotIdx: activeIdx !== -1 ? activeIdx : idx, theme };
      }
    }
    // Fallback: check trainingGroups (ONLY wizard groups, NEVER existing published DB groups)
    for (const grp of trainingGroups) {
      if (grp.isExistingDbGroup) continue;
      if ((grp.studentIds || []).some(id => String(id) === String(studentId))) {
        const matchedSlot = slots.find(s => String(s.id) === String(grp.slotId)) || slots[0];
        if (matchedSlot) {
          const theme = getSlotThemeForSlot(matchedSlot.id);
          const activeIdx = activeSlotsForDay.findIndex(x => String(x.id) === String(matchedSlot.id));
          return { slot: matchedSlot, slotIdx: activeIdx !== -1 ? activeIdx : 0, theme };
        }
      }
    }
    return null;
  };

  // Union of all selected student IDs across all slots (STRICTLY wizard selections, NEVER DB scheduled)
  const allSelectedStudentIds = useMemo(() => {
    const ids = new Set();
    Object.values(slotStudentMap).forEach(list => {
      if (Array.isArray(list)) {
        list.forEach(id => {
          const st = allPoolStudents.find(s => String(s.id) === String(id));
          if (!st || !isStudentScheduledInDbOnDate(st)) {
            ids.add(id);
          }
        });
      }
    });
    trainingGroups.forEach(grp => {
      if (!grp.isExistingDbGroup && Array.isArray(grp.studentIds)) {
        grp.studentIds.forEach(id => {
          const st = allPoolStudents.find(s => String(s.id) === String(id));
          if (!st || !isStudentScheduledInDbOnDate(st)) {
            ids.add(id);
          }
        });
      }
    });
    return Array.from(ids);
  }, [slotStudentMap, trainingGroups, allPoolStudents, existingScheduledStudentNamesOnDate, existingDbScheduledInfoMapOnDate]);

  // Backward compatibility alias for selectedStudentIds
  const selectedStudentIds = allSelectedStudentIds;

  // Toggle student selection for currently active slot tab (Strictly enforces slot capacity)
  const toggleSelectStudent = (studentId) => {
    const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
    if (!activeSlotId) return;

    const clickedStudent = allPoolStudents.find(s => String(s.id) === String(studentId));
    if (clickedStudent && isStudentScheduledInDbOnDate(clickedStudent)) {
      setUiAlert({
        title: 'Student Already Scheduled',
        message: `${clickedStudent.name} is already scheduled in an existing session on ${formattedSessionDate}. Scheduled students cannot be selected in a new session.`,
        type: 'info',
        icon: 'ℹ️'
      });
      return;
    }

    // Capture scroll position before state update so screen does NOT scroll/jump
    const scrollContainer = document.querySelector('.ns-modal-body-scroll');
    const containerTop = scrollContainer ? scrollContainer.scrollTop : null;
    const windowY = window.scrollY;
    savedScrollPosRef.current = { containerTop, windowY };

    const activeSlot = slots.find(s => s.id === activeSlotId) || selectedSlot;
    const slotCap = getSlotCapacity(activeSlot);

    // Accurate set of all student IDs currently in this slot (from slotStudentMap OR trainingGroups, excluding DB groups)
    const currentSlotStudentIds = new Set([
      ...(slotStudentMap[activeSlotId] || slotStudentMap[String(activeSlotId)] || []).map(String),
      ...trainingGroups
        .filter(g => !g.isExistingDbGroup && String(g.slotId) === String(activeSlotId))
        .flatMap(g => (g.studentIds || []).map(String))
    ]);

    // If main student (not a guest), group with all their accompanying guests
    const isMainStudent = clickedStudent && !clickedStudent.isGuest;
    const associatedGuests = isMainStudent
      ? allPoolStudents.filter(s => s.isGuest && String(s.parentStudentId) === String(clickedStudent.id))
      : [];

    const familyIds = isMainStudent
      ? [studentId, ...associatedGuests.map(g => g.id)]
      : [studentId];
    const familyIdStrs = familyIds.map(String);

    // Check if all family members are already in the current slot
    const allInCurrentSlot = familyIdStrs.every(idStr => currentSlotStudentIds.has(idStr));

    if (!allInCurrentSlot) {
      // Need to add whichever family members are not yet in this slot
      const idsToAdd = familyIds.filter(id => !currentSlotStudentIds.has(String(id)));
      const spotsNeeded = idsToAdd.length;
      const spotsRemaining = slotCap - currentSlotStudentIds.size;

      if (spotsNeeded > spotsRemaining) {
        const slotTimeName = activeSlot ? (activeSlot.startTime || activeSlot.time) : 'this time slot';
        const groupDesc = associatedGuests.length > 0
          ? `${clickedStudent.name} and their ${associatedGuests.length} accompanying guest(s) (${spotsNeeded} spot(s) needed)`
          : (clickedStudent?.name || 'this student');
        setUiAlert({
          title: 'Slot Capacity Limit Reached',
          message: `The capacity limit for ${slotTimeName} is ${slotCap} students. Only ${Math.max(0, spotsRemaining)} spot(s) remaining, but ${groupDesc} requires ${spotsNeeded} spot(s). Please deselect other students first or increase slot capacity in Step 1.`,
          type: 'warning',
          icon: '⚠️'
        });
        return;
      }

      setSlotStudentMap(prevMap => {
        const newMap = { ...prevMap };

        // Remove family members from ALL slots first (so student belongs to only 1 slot at a time)
        Object.keys(newMap).forEach(sId => {
          if (Array.isArray(newMap[sId])) {
            newMap[sId] = newMap[sId].filter(id => !familyIdStrs.includes(String(id)));
          }
        });

        // Add all family members to active slot
        const existingInSlot = (newMap[activeSlotId] || newMap[String(activeSlotId)] || []);
        const updated = Array.from(new Set([...existingInSlot, ...familyIds]));
        newMap[activeSlotId] = updated;
        newMap[String(activeSlotId)] = updated;
        return newMap;
      });

      // Remove family from groups of OTHER slots if any
      setTrainingGroups(prev => prev.map(grp => {
        if (String(grp.slotId) !== String(activeSlotId)) {
          return {
            ...grp,
            studentIds: (grp.studentIds || []).filter(id => !familyIdStrs.includes(String(id)))
          };
        }
        return grp;
      }));
    } else {
      // Deselect all family members from active slot
      setSlotStudentMap(prevMap => {
        const newMap = { ...prevMap };
        Object.keys(newMap).forEach(sId => {
          if (Array.isArray(newMap[sId])) {
            newMap[sId] = newMap[sId].filter(id => !familyIdStrs.includes(String(id)));
          }
        });
        return newMap;
      });

      // CRITICAL: Also remove all family members from trainingGroups so they do not stay selected via groups
      setTrainingGroups(prev => prev.map(grp => ({
        ...grp,
        studentIds: (grp.studentIds || []).filter(id => !familyIdStrs.includes(String(id)))
      })));
    }

    // Additional rAF fallback to ensure viewport remains locked at user's scroll position
    requestAnimationFrame(() => {
      const c = document.querySelector('.ns-modal-body-scroll');
      if (c && containerTop != null && c.scrollTop !== containerTop) {
        c.scrollTop = containerTop;
      }
      if (window.scrollY !== windowY) {
        window.scrollTo({ top: windowY, behavior: 'instant' });
      }
    });
  };

  // Synchronously lock scroll position right after DOM mutation to prevent any screen jump
  useLayoutEffect(() => {
    if (savedScrollPosRef.current) {
      const { containerTop, windowY } = savedScrollPosRef.current;
      const scrollContainer = document.querySelector('.ns-modal-body-scroll');
      if (scrollContainer && containerTop != null) {
        scrollContainer.scrollTop = containerTop;
      }
      if (windowY != null && window.scrollY !== windowY) {
        window.scrollTo(0, windowY);
      }
      savedScrollPosRef.current = null;
    }
  }, [slotStudentMap]);



  // Handle Save from Slot Modal (persists specifically for this date as custom schedule)
  const handleSaveSlotModal = (modalData) => {
    if (!modalData?.time || !modalData.time.trim()) {
      setUiAlert({
        title: 'Start Time Required',
        message: 'Please enter a valid start time for the session slot (e.g. 08:30 AM).',
        type: 'warning',
        icon: '⏰'
      });
      return;
    }

    const currentSlots = Array.isArray(slots) ? [...slots] : [];
    const targetNorm = normalizeTimeString(modalData.time);
    const isDuplicate = currentSlots.some(s => s.id !== modalData.id && normalizeTimeString(s.startTime || s.time) === targetNorm);
    if (isDuplicate) {
      setUiAlert({
        title: 'Duplicate Time Slot',
        message: `A session slot with start time "${modalData.time}" already exists. Duplicate start times are not allowed.`,
        type: 'warning',
        icon: '⚠️'
      });
      return;
    }

    let updatedSlots;
    if (modalData.mode === 'edit') {
      const capNum = parseInt(modalData.maxStudents, 10) || 4;
      updatedSlots = currentSlots.map(s => s.id === modalData.id ? {
        ...s,
        time: modalData.time,
        startTime: modalData.time,
        duration: String(modalData.duration || 90),
        maxStudents: capNum,
        days: modalData.days || s.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        active: modalData.active !== undefined ? modalData.active : (s.active !== false),
      } : s);

      // Sync capacity map & current capacity if this slot is selected
      setSlotCapacityMap(prev => ({ ...prev, [modalData.id]: capNum }));
      if (selectedSlotId === modalData.id) {
        setCapacity(capNum);
      }
    } else {
      updatedSlots = [...currentSlots, {
        id: modalData.id || Date.now(),
        time: modalData.time,
        startTime: modalData.time,
        duration: String(modalData.duration || 90),
        maxStudents: parseInt(modalData.maxStudents, 10) || 4,
        days: modalData.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        active: modalData.active !== false,
      }];
    }

    const normalized = normalizeConfiguredSlots(updatedSlots);
    setSlots(normalized);
    try {
      window.dispatchEvent(new CustomEvent('session_slots_updated', { detail: normalized }));
    } catch (e) { }

    // Also update any existing training groups assigned to this slot so their time is immediately fresh
    setTrainingGroups(prev => prev.map(g => {
      if (String(g.slotId) === String(modalData.id)) {
        return { ...g, slotId: modalData.id };
      }
      return g;
    }));

    setIsCustomForDate(true);
    setCustomDatesList(prev => Array.from(new Set([...prev, selectedSessionDateYYYYMMDD])));
    setEditingSlotModal(null);

    // Persist to central PostgreSQL database specifically for THIS DATE
    try {
      const schoolId = currentUser?.school_id || null;
      let rawSchool = activeSchoolName || currentUser?.school || currentUser?.school_name || '';
      if (typeof rawSchool === 'object') rawSchool = rawSchool?.name || rawSchool?.school_name || '';
      if (String(rawSchool).toLowerCase() === 'school admin' || String(rawSchool).toLowerCase() === 'super admin') {
        rawSchool = activeSchoolName || '';
      }
      const schoolName = String(rawSchool).trim();

      fetch(`${API}/api/session-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          school_name: schoolName,
          date: selectedSessionDateYYYYMMDD,
          slots: normalized
        })
      }).catch(err => console.warn('Failed saving custom date slot to DB:', err));
    } catch (err) { }
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
    if (!editSession) {
      setTrainingGroups([]);
      setSlotStudentMap({});
      setStep3CheckedStudentIdsBySlot({});
      setActiveDropGroupId(null);
      lastSyncedDateRef.current = null;
      setSlotCapacityMap({});
    }
  };
  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
    if (!editSession) {
      setTrainingGroups([]);
      setSlotStudentMap({});
      setStep3CheckedStudentIdsBySlot({});
      setActiveDropGroupId(null);
      lastSyncedDateRef.current = null;
      setSlotCapacityMap({});
    }
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

  // Step 2 Active Session Slot & Display Time for matching
  const currentActiveSlot = useMemo(() => {
    const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
    return activeSlotsForDay.find(s => String(s.id) === String(activeSlotId)) || slots.find(s => String(s.id) === String(activeSlotId)) || null;
  }, [selectedSlotId, activeSlotsForDay, slots]);

  const currentActiveSlotDisplayTime = useMemo(() => {
    if (!currentActiveSlot) return '';
    return currentActiveSlot.startTime || currentActiveSlot.time || '';
  }, [currentActiveSlot]);

  // Normalizes times (removes extra spaces, leading zeros on single digit hours) for reliable matching
  const isStudentMatchingTimeFilter = useCallback((student, filterVal, activeSlotTimeStr) => {
    if (!filterVal || filterVal === 'all') return true;
    const rawSt = (student.session_time || '').trim();

    if (filterVal === 'none') {
      return !rawSt;
    }

    const normSt = rawSt.toLowerCase().replace(/\s+/g, ' ').replace(/\b0([1-9]:)/g, '$1');

    if (filterVal === 'current_slot') {
      if (!rawSt || !activeSlotTimeStr) return false;
      const normActive = activeSlotTimeStr.toLowerCase().replace(/\s+/g, ' ').replace(/\b0([1-9]:)/g, '$1');
      return normSt.includes(normActive) || normActive.includes(normSt);
    }

    if (!rawSt) return false;
    const normFilter = filterVal.toLowerCase().replace(/\s+/g, ' ').replace(/\b0([1-9]:)/g, '$1');
    return normSt === normFilter || normSt.startsWith(normFilter) || normFilter.startsWith(normSt);
  }, []);

  // Distinct Expected Times found among available pool students
  const { distinctExpectedTimes, noExpectedTimeCount } = useMemo(() => {
    const counts = {};
    let noneCount = 0;
    allPoolStudents.forEach(s => {
      const raw = (s.session_time || '').trim();
      if (!raw) {
        noneCount++;
      } else {
        const startPart = raw.split(/\s*[-–—to]+\s*/i)[0].trim();
        const m = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        const t = m ? `${String(m[1]).padStart(2, '0')}:${m[2]} ${(m[3] || 'AM').toUpperCase()}` : startPart;
        counts[t] = (counts[t] || 0) + 1;
      }
    });

    const distinct = Object.keys(counts).sort((a, b) => a.localeCompare(b)).map(time => ({
      time,
      count: counts[time]
    }));

    return { distinctExpectedTimes: distinct, noExpectedTimeCount: noneCount };
  }, [allPoolStudents]);

  // Count of students matching current selected session slot
  const currentSlotMatchingCount = useMemo(() => {
    if (!currentActiveSlotDisplayTime) return 0;
    return allPoolStudents.filter(s =>
      isStudentMatchingTimeFilter(s, 'current_slot', currentActiveSlotDisplayTime)
    ).length;
  }, [allPoolStudents, currentActiveSlotDisplayTime, isStudentMatchingTimeFilter]);

  // Students precisely matching active Step 2 filters (Day, Level, Status, Gender, Swimming, Expected Time, Search)
  const filterMatchingStudents = useMemo(() => {
    const activeSlotIdStep2 = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
    const currentSlotStudentIds = new Set(
      (slotStudentMap[activeSlotIdStep2] || slotStudentMap[String(activeSlotIdStep2)] || []).map(String)
    );
    trainingGroups.forEach(g => {
      if (String(g.slotId) === String(activeSlotIdStep2)) {
        (g.studentIds || []).forEach(id => currentSlotStudentIds.add(String(id)));
      }
    });
    const allSelectedSet = new Set(allSelectedStudentIds.map(String));

    return allPoolStudents.filter(s => {
      const sIdStr = String(s.id);
      // 1. Day Filter (courseDayFilter)
      if (courseDayFilter !== 'all' && String(s.whichDay) !== String(courseDayFilter)) return false;
      // 2. Level Filter
      if (levelFilter !== 'all' && normalizeLevelKey(s.level) !== levelFilter) return false;
      // 3. Status Filter (Selected vs Not Selected)
      if (selectionFilter === 'selected') {
        if (!allSelectedSet.has(sIdStr)) return false;
        if (selectedSessionSlotFilter !== 'all') {
          const targetSlotStudentIds = new Set(
            (slotStudentMap[selectedSessionSlotFilter] || slotStudentMap[String(selectedSessionSlotFilter)] || []).map(String)
          );
          trainingGroups.forEach(g => {
            if (String(g.slotId) === String(selectedSessionSlotFilter)) {
              (g.studentIds || []).forEach(id => targetSlotStudentIds.add(String(id)));
            }
          });
          if (!targetSlotStudentIds.has(sIdStr)) return false;
        }
      }
      if (selectionFilter === 'not_selected' && allSelectedSet.has(sIdStr)) return false;
      if (selectionFilter === 'this_slot' && !currentSlotStudentIds.has(sIdStr)) return false;
      // 4. Gender Filter
      if (genderFilterStep2 !== 'all' && (s.gender || 'male').toLowerCase() !== genderFilterStep2.toLowerCase()) return false;
      // 5. Swimming Ability Filter
      if (swimmingFilterStep2 !== 'all') {
        const sSwim = (s.swimming_ability || 'Swimmer').toLowerCase();
        if (swimmingFilterStep2 === 'swimmer' && (sSwim.includes('non') || sSwim === 'no')) return false;
        if (swimmingFilterStep2 === 'non-swimmer' && !(sSwim.includes('non') || sSwim === 'no')) return false;
      }
      // 6. Expected Time Filter
      if (!isStudentMatchingTimeFilter(s, expectedTimeFilter, currentActiveSlotDisplayTime)) return false;
      // 7. Search Text
      if (studentSearchStep2 && studentSearchStep2.trim()) {
        const q = studentSearchStep2.toLowerCase().trim();
        const n = (s.name || '').toLowerCase();
        const p = (s.parentStudentName || '').toLowerCase();
        if (!n.includes(q) && !p.includes(q)) return false;
      }
      return true;
    });
  }, [allPoolStudents, courseDayFilter, levelFilter, selectionFilter, selectedSessionSlotFilter, genderFilterStep2, swimmingFilterStep2, studentSearchStep2, allSelectedStudentIds, slotStudentMap, trainingGroups, selectedSlotId, activeSlotsForDay, slots, expectedTimeFilter, isStudentMatchingTimeFilter, currentActiveSlotDisplayTime]);

  // Step 2 Filtered & Sorted students from database:
  // Active slot's assigned students on TOP (0), Unassigned in MIDDLE (1), Other slots' students at BOTTOM (2)
  const filteredStudents = useMemo(() => {
    const activeSlotIdStep2 = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
    const currentSlotStudentIds = new Set(
      (slotStudentMap[activeSlotIdStep2] || slotStudentMap[String(activeSlotIdStep2)] || []).map(String)
    );
    trainingGroups.forEach(g => {
      if (String(g.slotId) === String(activeSlotIdStep2)) {
        (g.studentIds || []).forEach(id => currentSlotStudentIds.add(String(id)));
      }
    });
    const allSelectedSet = new Set(allSelectedStudentIds.map(String));

    const getSingleStudentPriority = (s) => {
      if (!s) return 1;
      const sIdStr = String(s.id);
      const isScheduledInDb = isStudentScheduledInDbOnDate(s);
      const isInCurrentSlot = currentSlotStudentIds.has(sIdStr);
      const isOtherSlot = allSelectedSet.has(sIdStr) && !isInCurrentSlot;

      // 1. ⚫ Black Circle (✓): Pudhusa select panna student (Priority 0)
      if (isInCurrentSlot && !isScheduledInDb) {
        return 0;
      }

      // 2. ⚪ White Circle: Select aagadha available student (Priority 1)
      if (!allSelectedSet.has(sIdStr) && !isScheduledInDb) {
        return 1;
      }

      // 3. 🔘 Grey Circle: Vera slot student (Priority 2)
      if (isOtherSlot && !isScheduledInDb) {
        return 2;
      }

      // 4. 🟠 Orange Circle (✓): Already DB-la schedule aana student (Priority 3)
      if (isScheduledInDb) {
        return 3;
      }

      return 4;
    };

    const getStudentPriority = (student) => {
      // Keep family together: evaluate priority based on family head
      const familyHead = (student.isGuest && student.parentStudentId)
        ? (allPoolStudents.find(p => String(p.id) === String(student.parentStudentId)) || student)
        : student;

      let bestPrio = getSingleStudentPriority(familyHead);

      // If family head isn't priority 0, check if any guest is newly selected (0) to keep family at top
      if (bestPrio !== 0) {
        const guests = allPoolStudents.filter(g => g.isGuest && String(g.parentStudentId) === String(familyHead.id));
        for (const g of guests) {
          const gPrio = getSingleStudentPriority(g);
          if (gPrio === 0) {
            bestPrio = 0;
            break;
          }
        }
      }

      return bestPrio;
    };

    return allPoolStudents
      .filter(s => courseDayFilter === 'all' || String(s.whichDay) === String(courseDayFilter))
      .filter(s => levelFilter === 'all' || normalizeLevelKey(s.level) === levelFilter)
      .filter(s => {
        const sIdStr = String(s.id);
        if (selectionFilter === 'selected') {
          if (!allSelectedSet.has(sIdStr)) return false;
          if (selectedSessionSlotFilter !== 'all') {
            const targetSlotStudentIds = new Set(
              (slotStudentMap[selectedSessionSlotFilter] || slotStudentMap[String(selectedSessionSlotFilter)] || []).map(String)
            );
            trainingGroups.forEach(g => {
              if (String(g.slotId) === String(selectedSessionSlotFilter)) {
                (g.studentIds || []).forEach(id => targetSlotStudentIds.add(String(id)));
              }
            });
            return targetSlotStudentIds.has(sIdStr);
          }
          return true;
        }
        if (selectionFilter === 'not_selected') return !allSelectedSet.has(sIdStr);
        if (selectionFilter === 'this_slot') return currentSlotStudentIds.has(sIdStr);
        return true;
      })
      .filter(s => genderFilterStep2 === 'all' || (s.gender || 'male').toLowerCase() === genderFilterStep2.toLowerCase())
      .filter(s => {
        if (swimmingFilterStep2 === 'all') return true;
        const sSwim = (s.swimming_ability || 'Swimmer').toLowerCase();
        if (swimmingFilterStep2 === 'swimmer') return !sSwim.includes('non') && sSwim !== 'no';
        if (swimmingFilterStep2 === 'non-swimmer') return sSwim.includes('non') || sSwim === 'no';
        return true;
      })
      .filter(s => isStudentMatchingTimeFilter(s, expectedTimeFilter, currentActiveSlotDisplayTime))
      .filter(s => !studentSearchStep2 || s.name.toLowerCase().includes(studentSearchStep2.toLowerCase()) || (s.parentStudentName && s.parentStudentName.toLowerCase().includes(studentSearchStep2.toLowerCase())))
      .slice()
      .sort((a, b) => {
        // 1. Strict priority sort: active slot students on TOP (0), available in MIDDLE (1), DB scheduled (2), other slots at BOTTOM (3)
        const prioA = getStudentPriority(a);
        const prioB = getStudentPriority(b);
        if (prioA !== prioB) return prioA - prioB;

        // When having the SAME priority: keep parent student and their guests grouped together
        const familyIdA = a.parentStudentId || a.id;
        const familyIdB = b.parentStudentId || b.id;

        if (String(familyIdA) !== String(familyIdB)) {
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
  }, [allPoolStudents, levelFilter, selectionFilter, selectedSessionSlotFilter, courseDayFilter, genderFilterStep2, swimmingFilterStep2, studentSearchStep2, allSelectedStudentIds, slotStudentMap, trainingGroups, selectedSlotId, activeSlotsForDay, slots, existingScheduledStudentNamesOnDate, existingDbScheduledInfoMapOnDate, expectedTimeFilter, isStudentMatchingTimeFilter, currentActiveSlotDisplayTime]);

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

    if (editSession) {
      // In edit mode: sync the group's slotId without automatically pushing new students into the group
      const activeSlotsWithStudents = slots.filter(s => (slotStudentMap[s.id] || []).length > 0);
      const chosenSlot = activeSlotsWithStudents.length > 0 ? activeSlotsWithStudents[0] : (selectedSlot || slots[0]);
      const chosenSlotId = chosenSlot?.id || null;

      // Preserve existing group's studentIds so newly selected students stay unassigned in Column 1 for manual assignment
      setTrainingGroups(prev => prev.map(grp => {
        if (grp.id === 'group-edit-1' || prev.length === 1) {
          return {
            ...grp,
            slotId: chosenSlotId || grp.slotId,
            studentIds: grp.studentIds || []
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

  // Universal robust resolver to map any student ID or guest slug into a full student/guest object
  const resolveStudentFromPool = useCallback((id) => {
    if (id === undefined || id === null) return null;
    const idStr = String(id).trim();

    // 1. Exact match in allPoolStudents
    let match = allPoolStudents.find(s => String(s.id) === idStr || s.sessGuestId === idStr);
    if (match) return match;

    // 2. If it's a guest ID string: sess-guest-267-test-1 or guest-267-0
    if (idStr.startsWith('sess-guest-')) {
      const parts = idStr.replace('sess-guest-', '').split('-');
      const pId = parts[0];
      const namePart = parts.slice(1).join(' ').toLowerCase();
      match = allPoolStudents.find(s => s.isGuest && (
        (s.name || '').toLowerCase().trim() === namePart ||
        (s.name || '').toLowerCase().replace(/\s+/g, '-') === parts.slice(1).join('-') ||
        (pId && pId !== '0' && String(s.parentStudentId) === String(pId) && (s.name || '').toLowerCase().includes(namePart))
      ));
      if (match) return match;
    } else if (idStr.startsWith('guest-')) {
      const parts = idStr.split('-');
      const pId = parts[1];
      const gIdx = parseInt(parts[2], 10);
      match = allPoolStudents.find(s => s.isGuest && String(s.parentStudentId) === String(pId) && ((s.guestIndex && s.guestIndex === gIdx + 1) || true));
      if (match) return match;
    }

    // 3. Fallback match in dbStudents
    match = (dbStudents || []).find(s => String(s.id) === idStr || (s.isGuest && (s.name || '').toLowerCase().trim() === idStr.toLowerCase()));
    if (match) return match;

    // 4. Fallback synthesis from existingDbDateSessions
    if (existingDbDateSessions && existingDbDateSessions.length > 0) {
      const sessMatch = existingDbDateSessions.find(sess => {
        const isG = Boolean(sess.guest_name && sess.guest_name.trim());
        if (isG) {
          const gSlug = `sess-guest-${sess.student_id || '0'}-${sess.guest_name.trim().replace(/\s+/g, '-').toLowerCase()}`;
          return gSlug === idStr || sess.guest_name.trim().toLowerCase() === idStr.toLowerCase();
        }
        return String(sess.student_id) === idStr || (sess.student_name && sess.student_name.trim().toLowerCase() === idStr.toLowerCase());
      });
      if (sessMatch) {
        const isG = Boolean(sessMatch.guest_name && sessMatch.guest_name.trim());
        const sName = isG ? sessMatch.guest_name.trim() : (sessMatch.student_name || sessMatch.student || '').trim();
        return {
          id: id,
          name: sName,
          gender: sessMatch.gender || 'Male',
          level: sessMatch.type || sessMatch.level || 'Beginner',
          day: 'day1',
          whichDay: 1,
          totalDays: 3,
          avatar: '',
          isReal: true,
          isGuest: isG,
          parentStudentId: isG ? sessMatch.student_id : null,
          parentStudentName: isG ? (sessMatch.student_name || sessMatch.student || null) : null
        };
      }
    }

    return null;
  }, [allPoolStudents, dbStudents, existingDbDateSessions]);

  // Step 3: Students in Column 1 (All selected students across all slots)
  const importedStudents = useMemo(() => {
    if (editSession) {
      // In edit mode: allPoolStudents is already strictly the group's students
      return allPoolStudents;
    }
    const allGroupStudentIds = new Set();
    trainingGroups.forEach(g => {
      (g.studentIds || []).forEach(id => allGroupStudentIds.add(String(id)));
    });
    const targetIdSet = new Set([
      ...allSelectedStudentIds.map(String),
      ...allGroupStudentIds
    ]);
    return allPoolStudents.filter(s => {
      if (targetIdSet.has(String(s.id))) return true;
      if (s.sessGuestId && targetIdSet.has(s.sessGuestId)) return true;
      if (s.isGuest) {
        const gNameSlug = (s.name || '').replace(/\s+/g, '-').toLowerCase();
        const sessGuestSlug = `sess-guest-${s.parentStudentId || '0'}-${gNameSlug}`;
        if (targetIdSet.has(sessGuestSlug)) return true;
        if (targetIdSet.has(s.name.toLowerCase().trim())) return true;
      }
      return false;
    });
  }, [allPoolStudents, allSelectedStudentIds, trainingGroups, editSession]);

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
    const slotAssignedIds = slotStudentMap[step3SlotFilter] || slotStudentMap[String(step3SlotFilter)] || [];
    return importedStudents.filter(s => slotAssignedIds.some(id => String(id) === String(s.id)));
  }, [importedStudents, step3SlotFilter, slotStudentMap, editSession]);

  const hasActiveStep3Filters = step3DayFilter !== 'all' || step3StatusFilter !== 'unassigned' || step3LevelFilter !== 'all' || step3GenderFilter !== 'all' || step3SwimmingFilter !== 'all' || Boolean(studentSearch);

  const resetStep3Filters = () => {
    setStep3DayFilter('all');
    setStep3StatusFilter('unassigned');
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
          const slotAssignedIds = slotStudentMap[step3SlotFilter] || slotStudentMap[String(step3SlotFilter)] || [];
          const isInGroupForSlot = trainingGroups.some(g => String(g.slotId) === String(step3SlotFilter) && (g.studentIds || []).some(id => String(id) === String(s.id)));
          if (!slotAssignedIds.some(id => String(id) === String(s.id)) && !isInGroupForSlot) return false;
        }

        // Day filtering
        if (step3DayFilter !== 'all' && String(s.whichDay) !== String(step3DayFilter)) {
          return false;
        }

        // Status filtering (All Active / Unassigned / Assigned)
        const isAssigned = trainingGroups.some(g => (g.studentIds || []).some(id => String(id) === String(s.id)));
        if (step3StatusFilter === 'unassigned' && isAssigned) return false;
        if (step3StatusFilter === 'assigned' && !isAssigned) return false;

        // Level filtering (All / Beginner / Advance Beginner / Intermediate / Advance Intermediate / Advanced)
        if (step3LevelFilter !== 'all') {
          if (normalizeLevelKey(s.level) !== step3LevelFilter) return false;
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
        const aAssigned = trainingGroups.some(g => (g.studentIds || []).some(id => String(id) === String(a.id)));
        const bAssigned = trainingGroups.some(g => (g.studentIds || []).some(id => String(id) === String(b.id)));
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

  // Step 3: Training groups filtered by slot (strictly ordered Group A, Group B, Group C...)
  const displayedTrainingGroups = useMemo(() => {
    const list = (editSession || step3SlotFilter === 'ALL')
      ? trainingGroups
      : trainingGroups.filter(g => String(g.slotId || slots[0]?.id) === String(step3SlotFilter));
    return sortGroupsInOrder(list);
  }, [trainingGroups, step3SlotFilter, slots, editSession]);

  // Step 3: Current slot students count and assigned instructors count for Ratio display
  const currentSlotStudentsCount = useMemo(() => {
    if (step3SlotFilter === 'ALL') return importedStudents.length;
    return getSlotTotalStudentCount(step3SlotFilter);
  }, [step3SlotFilter, importedStudents.length, getSlotTotalStudentCount]);

  const currentSlotAssignedInstructorsCount = useMemo(() => {
    const coachIdSet = new Set();
    displayedTrainingGroups.forEach(grp => {
      const ids = grp.assignedInstructorIds && grp.assignedInstructorIds.length > 0
        ? grp.assignedInstructorIds
        : (grp.assignedInstructorId ? [grp.assignedInstructorId] : (grp.instructorId ? [grp.instructorId] : []));
      ids.forEach(id => {
        if (id) coachIdSet.add(String(id));
      });
    });
    return coachIdSet.size;
  }, [displayedTrainingGroups]);

  // Step 3: Student-to-Coach Ratio calculation (Divides total students by active coaches)
  const groupRatioStats = useMemo(() => {
    const studentsTotal = importedStudents.length;
    const coachesTotal = activeInstructorsCount;

    if (coachesTotal === 0) {
      return {
        ratioDisplay: studentsTotal > 0 ? `${studentsTotal} : 0` : '0 : 0',
        coachCount: 0,
        studentCount: studentsTotal,
        exactRatio: '0',
        subtext: 'No active coaches available'
      };
    }

    if (studentsTotal === 0) {
      return {
        ratioDisplay: '0 : 1',
        coachCount: 1,
        studentCount: 0,
        exactRatio: '0',
        subtext: '0 students imported'
      };
    }

    const studentsPerCoachRaw = studentsTotal / coachesTotal;
    const roundedStudentsPerCoach = Math.max(1, Math.round(studentsPerCoachRaw));
    const exactFormatted = studentsPerCoachRaw.toFixed(1);

    return {
      ratioDisplay: `1 : ${roundedStudentsPerCoach}`,
      coachCount: 1,
      studentCount: roundedStudentsPerCoach,
      exactRatio: exactFormatted,
      subtext: `Per Group Ratio (${studentsTotal} ÷ ${coachesTotal} ≈ 1:${exactFormatted})`
    };
  }, [importedStudents.length, activeInstructorsCount]);

  // Set of student IDs that belong to the active slot in Step 3
  const activeSlotStudentIdSet = useMemo(() => {
    if (editSession || step3SlotFilter === 'ALL') {
      return new Set(importedStudents.map(s => s.id));
    }
    const slotAssignedIds = slotStudentMap[step3SlotFilter] || slotStudentMap[String(step3SlotFilter)] || [];
    const grpIds = [];
    trainingGroups.forEach(g => {
      if (String(g.slotId) === String(step3SlotFilter)) {
        (g.studentIds || []).forEach(id => grpIds.push(id));
      }
    });
    return new Set([...slotAssignedIds, ...grpIds]);
  }, [importedStudents, step3SlotFilter, slotStudentMap, trainingGroups, editSession]);

  // Checked student IDs strictly scoped to the active slot and unassigned when filter is unassigned
  const step3CheckedStudentIds = useMemo(() => {
    const slotKey = step3SlotFilter ?? 'default';
    const list = step3CheckedStudentIdsBySlot[slotKey] || [];
    return list.filter(id => {
      if (!activeSlotStudentIdSet.has(id)) return false;
      if (step3StatusFilter === 'unassigned' && trainingGroups.some(g => g.studentIds.includes(id))) {
        return false;
      }
      return true;
    });
  }, [step3CheckedStudentIdsBySlot, step3SlotFilter, activeSlotStudentIdSet, step3StatusFilter, trainingGroups]);

  const setStep3CheckedStudentIds = useCallback((valOrFn) => {
    const slotKey = step3SlotFilter ?? 'default';
    setStep3CheckedStudentIdsBySlot(prev => {
      const prevList = (prev[slotKey] || []).filter(id => activeSlotStudentIdSet.has(id));
      const nextList = typeof valOrFn === 'function' ? valOrFn(prevList) : valOrFn;
      return {
        ...prev,
        [slotKey]: Array.isArray(nextList) ? nextList.filter(id => activeSlotStudentIdSet.has(id)) : []
      };
    });
  }, [step3SlotFilter, activeSlotStudentIdSet]);

  // Step 3: Toggle check in Column 1 (Selecting main student auto-selects only UNASSIGNED guests)
  const toggleStep3StudentCheck = (id) => {
    // Only allow selecting students that actually belong to the currently active slot
    if (!activeSlotStudentIdSet.has(id) && step3SlotFilter !== 'ALL' && !editSession) {
      return;
    }

    const clickedStudent = importedStudents.find(s => String(s.id) === String(id));

    // If clicked student is an accompanying GUEST:
    // Allow selecting/deselecting this guest individually without affecting the main student
    if (clickedStudent?.isGuest) {
      setStep3CheckedStudentIds(prev => {
        const willCheck = !prev.includes(id);
        if (willCheck) {
          scrollToCreateGroupSection();
        }
        return willCheck ? [...prev, id] : prev.filter(x => x !== id);
      });
      return;
    }

    // If clicked student is a MAIN student:
    // Find all their UNASSIGNED accompanying guests in the current active slot
    const accompanyingGuestIds = importedStudents
      .filter(s => s.isGuest && String(s.parentStudentId) === String(id))
      .filter(s => step3SlotFilter === 'ALL' || editSession || activeSlotStudentIdSet.has(s.id))
      .filter(s => !trainingGroups.some(g => g.studentIds.includes(s.id)))
      .map(s => s.id);

    setStep3CheckedStudentIds(prev => {
      const isMainCurrentlyChecked = prev.includes(id);
      if (isMainCurrentlyChecked) {
        // User clicked to uncheck the main student: also uncheck their accompanying guests
        const toRemove = new Set([id, ...accompanyingGuestIds]);
        return prev.filter(x => !toRemove.has(x));
      } else {
        // User clicked to check the main student: automatically check main student and only unassigned guests
        const toAdd = [id, ...accompanyingGuestIds.filter(gid => !prev.includes(gid))];
        scrollToCreateGroupSection();
        return [...prev, ...toAdd];
      }
    });
  };

  // Helper to re-index group letters per slot so they always stay sequential (Group A, Group B, Group C...)
  const reindexGroups = (groupsList) => {
    const sorted = sortGroupsInOrder(groupsList);
    const slotCounters = {};
    return sorted.map(g => {
      const slotKey = String(g.slotId || slots[0]?.id || 'default');
      const count = slotCounters[slotKey] || 0;
      slotCounters[slotKey] = count + 1;
      const letter = String.fromCharCode(65 + count);
      return {
        ...g,
        name: `Group ${letter}`
      };
    });
  };

  // Helper to move an entire group (and its students) from one slot to another seamlessly
  const handleMoveGroupToSlot = (groupId, targetSlotId) => {
    const matchedSlot = slots.find(s => String(s.id) === String(targetSlotId));
    const newSlotId = matchedSlot ? matchedSlot.id : targetSlotId;
    const grp = trainingGroups.find(g => g.id === groupId);
    if (!grp) return;

    setTrainingGroups(prev => {
      const updated = prev.map(g => g.id === groupId ? { ...g, slotId: newSlotId } : g);
      return reindexGroups(updated);
    });
    setSlotStudentMap(prev => {
      const newMap = { ...prev };
      const grpStudentIds = (grp.studentIds || []).map(String);
      Object.keys(newMap).forEach(k => {
        if (Array.isArray(newMap[k])) {
          newMap[k] = newMap[k].filter(id => !grpStudentIds.includes(String(id)));
        }
      });
      newMap[newSlotId] = Array.from(new Set([...(newMap[newSlotId] || []), ...(grp.studentIds || [])]));
      return newMap;
    });
    setSelectedSlotId(newSlotId);
    setStep3SlotFilter(newSlotId);
  };

  // Smoothly scroll to the "Want to create another training group?" card to the exact vertical center
  const scrollToCreateGroupSection = (force = false) => {
    setTimeout(() => {
      const createCard = document.getElementById('ns-create-next-group-card');
      const listContainer = document.querySelector('.ns-training-groups-list');

      if (listContainer && createCard) {
        const targetTop = createCard.offsetTop - listContainer.offsetTop - (listContainer.clientHeight / 2) + (createCard.clientHeight / 2);
        listContainer.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth'
        });
      }

      if (createCard) {
        createCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        createCard.classList.add('highlight-pulse');
        setTimeout(() => {
          createCard.classList.remove('highlight-pulse');
        }, 1200);
      }
    }, 80);
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
      assignedInstructorId: (isIndividualCoach && currentIndividualCoach?.id) ? currentIndividualCoach.id : ((isCoachFreelance && (currentUser?.instructor_id || currentUser?.id)) ? (currentUser?.instructor_id || currentUser?.id) : null),
      assignedInstructorIds: (isIndividualCoach && currentIndividualCoach?.id) ? [currentIndividualCoach.id] : ((isCoachFreelance && (currentUser?.instructor_id || currentUser?.id)) ? [(currentUser?.instructor_id || currentUser?.id)] : []),
    };
    setTrainingGroups(prev => {
      // Clean previously assigned groups of these students to prevent duplicates
      const cleaned = prev.map(g => ({
        ...g,
        studentIds: g.studentIds.filter(id => !step3CheckedStudentIds.includes(id))
      }));
      return reindexGroups([...cleaned, newGroup]);
    });
    setActiveDropGroupId(newGroup.id);
    setStep3CheckedStudentIds([]);

    // Auto-scroll smoothly to the newly created group card and focus it in the center
    setTimeout(() => {
      const el = document.getElementById(`ns-grp-card-${newGroup.id}`);
      const listContainer = document.querySelector('.ns-training-groups-list');
      if (listContainer && el) {
        const targetTop = el.offsetTop - listContainer.offsetTop - (listContainer.clientHeight / 2) + (el.clientHeight / 2);
        listContainer.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Auto-assign individual coach to any created or unassigned training groups
  useEffect(() => {
    if (isIndividualCoach && currentIndividualCoach?.id && trainingGroups.length > 0) {
      const hasUnassigned = trainingGroups.some(g =>
        !g.assignedInstructorId ||
        !g.assignedInstructorIds ||
        g.assignedInstructorIds.length === 0
      );
      if (hasUnassigned) {
        setTrainingGroups(prev => prev.map(g => {
          if (!g.assignedInstructorId || !g.assignedInstructorIds || g.assignedInstructorIds.length === 0) {
            return {
              ...g,
              assignedInstructorId: currentIndividualCoach.id,
              assignedInstructorIds: [currentIndividualCoach.id]
            };
          }
          return g;
        }));
      }
    }
  }, [isIndividualCoach, currentIndividualCoach, trainingGroups]);

  // Delete group card and re-sequence remaining group letters per slot
  const deleteGroup = (groupId) => {
    setTrainingGroups(prev => {
      const remaining = prev.filter(g => g.id !== groupId);
      return reindexGroups(remaining);
    });
    setActiveDropGroupId(prevActiveId => {
      if (prevActiveId === groupId) {
        const remaining = trainingGroups.filter(g => g.id !== groupId);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prevActiveId;
    });
  };

  // Clear all groups for fresh manual creation (scoped to active slot)
  const clearAllGroups = () => {
    userClearedGroupsRef.current = true;
    const currentSlotId = step3SlotFilter !== 'ALL' ? step3SlotFilter : (selectedSlotId || slots[0]?.id);
    if (step3SlotFilter !== 'ALL' && !editSession) {
      setTrainingGroups(prev => {
        const remaining = prev.filter(g => String(g.slotId || slots[0]?.id) !== String(currentSlotId));
        return reindexGroups(remaining);
      });
      // Clear students in slotStudentMap for this slot so they return to unassigned list
      setSlotStudentMap(prev => ({
        ...prev,
        [currentSlotId]: []
      }));
    } else {
      setTrainingGroups([]);
      setSlotStudentMap({});
    }
    setActiveDropGroupId(null);
    try {
      const schoolId = currentUser?.school_id || null;
      const rawSchool = currentUser?.school || currentUser?.school_name || activeSchoolName || '';
      const schoolName = typeof rawSchool === 'object' ? (rawSchool?.name || rawSchool?.school_name || '') : String(rawSchool);
      const delParams = new URLSearchParams({ date: selectedSessionDateYYYYMMDD });
      if (schoolId) delParams.set('school_id', schoolId);
      if (schoolName) delParams.set('school_name', schoolName);
      fetch(`${API}/api/session-drafts?${delParams.toString()}`, { method: 'DELETE' }).catch(() => { });
    } catch (e) { }
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

  // Helper: Find previous / Day 1 coach(es) for students inside a training group
  const getPreviousCoachesForGroup = useCallback((groupStudents) => {
    if (!groupStudents || groupStudents.length === 0) return [];

    const coachMap = new Map(); // key: coachId -> { coach, studentNames: Set, count: number }
    const targetDateObj = parseLocalDateOnly(selectedSessionDateYYYYMMDD);

    groupStudents.forEach(st => {
      let foundCoach = null;

      // 1. Look in existingDbSessions for earlier sessions (strictly prior to selected date)
      if (Array.isArray(existingDbSessions) && existingDbSessions.length > 0) {
        const studentNameClean = (st.name || '').toLowerCase().trim();
        const parentNameClean = (st.parentStudentName || '').toLowerCase().trim();
        const studentIdStr = st.id != null ? String(st.id) : null;
        const parentIdStr = st.parentStudentId != null ? String(st.parentStudentId) : null;

        const matchedSessions = existingDbSessions.filter(sess => {
          const sessDateStr = sess.date || '';
          if (targetDateObj && sessDateStr) {
            const sessDateObj = parseLocalDateOnly(sessDateStr);
            if (sessDateObj && sessDateObj.getTime() >= targetDateObj.getTime()) {
              return false; // Skip sessions on or after current session date
            }
          }

          const hasCoach = sess.instructor_id || (Array.isArray(sess.instructor_ids) && sess.instructor_ids.length > 0) || sess.instructor;
          if (!hasCoach) return false;

          const sName = (sess.student || sess.student_name || '').toLowerCase().trim();
          const gName = (sess.guest_name || '').toLowerCase().trim();
          const sidStr = sess.student_id != null ? String(sess.student_id) : null;

          if (studentIdStr && sidStr === studentIdStr) return true;
          if (parentIdStr && sidStr === parentIdStr) return true;
          if (studentNameClean && (sName === studentNameClean || gName === studentNameClean)) return true;
          if (parentNameClean && sName === parentNameClean) return true;

          return false;
        });

        if (matchedSessions.length > 0) {
          // Sort chronologically ascending so earliest (Day 1 / Mothal Naal) comes first
          matchedSessions.sort((a, b) => {
            const dA = parseLocalDateOnly(a.date)?.getTime() || 0;
            const dB = parseLocalDateOnly(b.date)?.getTime() || 0;
            return dA - dB;
          });

          const day1Sess = matchedSessions[0];
          let cid = day1Sess.instructor_id;
          if (!cid && Array.isArray(day1Sess.instructor_ids) && day1Sess.instructor_ids.length > 0) {
            cid = day1Sess.instructor_ids[0];
          }

          if (cid) {
            foundCoach = allInstructors.find(i => String(i.id) === String(cid));
          }
          if (!foundCoach && day1Sess.instructor) {
            const firstCoachName = day1Sess.instructor.split(',')[0].trim().toLowerCase();
            foundCoach = allInstructors.find(i => i.name.toLowerCase().trim() === firstCoachName);
          }
        }
      }

      // 2. If no past session found in DB, fallback to student's initial assigned instructor
      if (!foundCoach) {
        const studentInstId = st.instructor_id;
        if (studentInstId) {
          foundCoach = allInstructors.find(i => String(i.id) === String(studentInstId));
        }
        if (!foundCoach && st.instructor) {
          const instName = String(st.instructor).split(',')[0].trim().toLowerCase();
          foundCoach = allInstructors.find(i => i.name.toLowerCase().trim() === instName);
        }
      }

      // 3. Fallback: check dbStudents by id or parentStudentId
      if (!foundCoach && Array.isArray(dbStudents)) {
        const origStudent = dbStudents.find(ds => String(ds.id) === String(st.id) || (st.parentStudentId && String(ds.id) === String(st.parentStudentId)));
        if (origStudent && origStudent.instructor_id) {
          foundCoach = allInstructors.find(i => String(i.id) === String(origStudent.instructor_id));
        }
      }

      if (foundCoach) {
        const key = String(foundCoach.id);
        if (!coachMap.has(key)) {
          coachMap.set(key, {
            coach: foundCoach,
            studentNames: new Set([st.name]),
            count: 1
          });
        } else {
          const entry = coachMap.get(key);
          entry.studentNames.add(st.name);
          entry.count = entry.studentNames.size;
        }
      }
    });

    return Array.from(coachMap.values())
      .map(entry => ({
        ...entry,
        studentNames: Array.from(entry.studentNames)
      }))
      .sort((a, b) => b.count - a.count);
  }, [existingDbSessions, selectedSessionDateYYYYMMDD, allInstructors, dbStudents]);

  // Assign Instructor to Group (Supports Multiple Coaches with Same-Time Conflict Prevention)
  const assignInstructorToGroup = (groupId, instructorId) => {
    const coach = allInstructors.find(i => String(i.id) === String(instructorId));
    const leaveOnDate = getInstructorLeaveOnDate(coach, selectedSessionDateYYYYMMDD);
    if (leaveOnDate) {
      setUiAlert({
        title: 'Staff On Leave',
        message: `${coach?.name || 'This coach'} is on approved leave on ${formattedSessionDate}${leaveOnDate?.leave_type ? ` (${leaveOnDate.leave_type})` : ''}. You cannot assign this coach to training groups on this date.`,
        type: 'warning',
        icon: '🏖️'
      });
      return false;
    }

    const conflict = getCoachSlotConflict(groupId, instructorId);
    if (conflict) {
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
    } catch (err) { }
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

    const validGroups = sortGroupsInOrder(trainingGroups.filter(grp => grp.studentIds && grp.studentIds.length > 0));
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

    // Check if any assigned coach is on approved leave on selected session date
    for (const grp of validGroups) {
      const coachIds = grp.assignedInstructorIds || (grp.assignedInstructorId ? [grp.assignedInstructorId] : []);
      for (const cid of coachIds) {
        const coach = allInstructors.find(ins => String(ins.id) === String(cid));
        const leave = getInstructorLeaveOnDate(coach, selectedSessionDateYYYYMMDD);
        if (leave) {
          setUiAlert({
            title: 'Assigned Coach On Leave',
            message: `Coach ${coach?.name || 'Assigned coach'} is on approved leave on ${formattedSessionDate}${leave.leave_type ? ` (${leave.leave_type})` : ''}. Please remove or replace this coach in ${grp.name} before publishing.`,
            type: 'warning',
            icon: '🏖️'
          });
          return;
        }
      }
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
            const found = allPoolStudents.find(s => String(s.id) === String(sid)) || dbStudents.find(s => String(s.id) === String(sid));
            if (found) {
              const pid = found.parentStudentId || (typeof found.id === 'number' ? found.id : parseInt(String(found.id).replace(/\D/g, ''), 10));
              if (pid && !isNaN(pid)) return Number(pid);
            }
            const str = String(sid);
            const digits = str.replace(/\D/g, '');
            return digits ? parseInt(digits, 10) : null;
          })
          .filter(id => id != null && !isNaN(id) && id > 0);

        if (numericStudentIds.length === 0) continue;

        const studentsData = grp.studentIds
          .map(sid => {
            const found = allPoolStudents.find(s => String(s.id) === String(sid)) || dbStudents.find(s => String(s.id) === String(sid));
            if (found) {
              const pId = found.parentStudentId || (typeof found.id === 'number' ? found.id : parseInt(String(found.id).replace(/\D/g, ''), 10));
              return {
                student_id: pId,
                student_name: found.isGuest ? (found.parentStudentName || found.name) : found.name,
                is_guest: Boolean(found.isGuest),
                guest_name: found.isGuest ? found.name : null,
                parent_student_name: found.parentStudentName || null,
              };
            }
            const isGuestStr = String(sid).startsWith('sess-guest-') || String(sid).startsWith('guest-');
            const numId = typeof sid === 'number' ? sid : parseInt(String(sid).replace(/\D/g, ''), 10);
            return {
              student_id: numId,
              student_name: '',
              is_guest: isGuestStr,
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

        const grpSlot = slots.find(s => String(s.id) === String(grp.slotId)) || selectedSlot;
        const slotTimeStr = grpSlot ? (grpSlot.time || grpSlot.startTime) : '08:30 AM - 10:00 AM';
        const slotDuration = grpSlot?.duration ? parseInt(grpSlot.duration, 10) : 90;

        const payload = {
          date: formattedSessionDate,
          time: slotTimeStr,
          duration_mins: slotDuration,
          student_ids: numericStudentIds,
          students_data: studentsData,
          instructor_id: primaryInstructorId,
          instructor_ids: numericCoachIds,
          instructor: assignedInstNames || coachName,
          location: spotName || 'Main Beach',
          condition: 'Moderate',
          type: grp.level || 'Intermediate',
          status: 'Upcoming',
          notes: `${grp.name} (${slotTimeStr}) - Coaches: ${assignedInstNames || 'Staff'} - ${numericStudentIds.length} students`,
          group_name: grp.name || '',
        };

        // ── CHECK EXISTING DB SESSIONS FOR THIS GROUP ──
        const knownExistingSessionIds = editSession
          ? (Array.isArray(editSession.sessions) && editSession.sessions.length > 0 ? editSession.sessions.map(s => s.id) : (editSession.id ? [editSession.id] : []))
          : (grp.existingSessionIds && grp.existingSessionIds.length > 0 ? grp.existingSessionIds : []);

        const targetGrpName = (grp.name || '').trim().toLowerCase();
        const targetGrpSlotTime = (grpSlot?.time || grpSlot?.startTime || '').trim().toLowerCase();
        const groupDbSessions = (existingDbDateSessions || []).filter(sess => {
          if (knownExistingSessionIds.includes(sess.id)) return true;
          if (editSession && (editSession.id === sess.id || (Array.isArray(editSession.sessions) && editSession.sessions.some(s => s.id === sess.id)))) return true;
          const sGrp = (sess.group_name || sess.groupName || '').trim().toLowerCase();
          const sTime = (sess.time || '').trim().toLowerCase();
          const timeMatches = !targetGrpSlotTime || !sTime || sTime === targetGrpSlotTime || sTime.startsWith(targetGrpSlotTime.split(' - ')[0]) || targetGrpSlotTime.startsWith(sTime.split(' - ')[0]);
          return Boolean(sGrp && targetGrpName && sGrp === targetGrpName && timeMatches);
        });

        // If this group already has sessions in DB, handle differential update/create/delete
        if (groupDbSessions.length > 0 || knownExistingSessionIds.length > 0) {
          const remainingDbSessions = [...groupDbSessions];
          // Also include any known session IDs that weren't in groupDbSessions
          knownExistingSessionIds.forEach(kId => {
            if (!remainingDbSessions.some(s => s.id === kId)) {
              remainingDbSessions.push({ id: kId });
            }
          });

          const toUpdateSessions = [];
          const toCreateStudents = [];

          for (const stItem of studentsData) {
            const isGuestItem = Boolean(stItem.is_guest || stItem.guest_name);
            const gNameItem = (stItem.guest_name || '').toLowerCase().trim();
            const stNameItem = (stItem.student_name || '').toLowerCase().trim();

            const matchedIdx = remainingDbSessions.findIndex(sess => {
              const sessIsGuest = Boolean(sess.guest_name && sess.guest_name.trim());
              const sessGName = (sess.guest_name || '').toLowerCase().trim();
              const sessSName = (sess.student_name || sess.student || '').toLowerCase().trim();

              // 1. GUEST ISOLATION: A guest item can ONLY match a guest DB session!
              if (isGuestItem) {
                if (!sessIsGuest) return false;
                // Match by guest name
                if (gNameItem && sessGName) {
                  return sessGName === gNameItem || sessGName.includes(gNameItem) || gNameItem.includes(sessGName);
                }
                // Fallback guest match by parent student_id if only 1 guest
                return sess.student_id != null && String(sess.student_id) === String(stItem.student_id);
              }

              // 2. REGULAR STUDENT ISOLATION: A regular student can ONLY match a regular (non-guest) DB session!
              if (sessIsGuest) return false;

              // Regular student match by student_id
              if (sess.student_id != null && stItem.student_id != null && String(sess.student_id) === String(stItem.student_id)) {
                return true;
              }
              // Regular student match by name
              if (sessSName && stNameItem && (sessSName === stNameItem || sessSName.includes(stNameItem) || stNameItem.includes(sessSName))) {
                return true;
              }
              return false;
            });

            if (matchedIdx !== -1) {
              const matched = remainingDbSessions[matchedIdx];
              toUpdateSessions.push({ sessionId: matched.id, stItem });
              remainingDbSessions.splice(matchedIdx, 1);
            } else {
              toCreateStudents.push(stItem);
            }
          }

          // A) UPDATE EXISTING STUDENTS IN THIS GROUP
          const updatePayload = {
            date: formattedSessionDate,
            time: slotTimeStr,
            duration_mins: slotDuration,
            instructor_id: primaryInstructorId,
            instructor_ids: numericCoachIds,
            instructor: assignedInstNames || coachName,
            notes: `${grp.name} (${slotTimeStr}) - Coaches: ${assignedInstNames || 'Staff'} - ${numericStudentIds.length} students`,
            location: spotName || editSession?.location || 'Main Beach',
            group_name: grp.name || editSession?.groupName || '',
            type: grp.level || 'Intermediate',
          };

          if (toUpdateSessions.length > 0) {
            await Promise.all(
              toUpdateSessions.map(({ sessionId, stItem }) => {
                const individualPayload = {
                  ...updatePayload,
                  student_id: stItem.student_id,
                  ...(stItem.is_guest || stItem.guest_name ? { guest_name: stItem.guest_name || stItem.student_name } : {})
                };
                return fetch(`${API}/api/sessions/${sessionId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(individualPayload),
                }).catch(err => console.error('Failed updating session', sessionId, err));
              })
            );
          }

          // B) CREATE SESSIONS FOR NEWLY ADDED STUDENTS IN THIS GROUP
          if (toCreateStudents.length > 0) {
            const newNumericIds = toCreateStudents.map(s => s.student_id).filter(id => !isNaN(id) && id > 0);
            const createPayload = {
              date: formattedSessionDate,
              time: slotTimeStr,
              duration_mins: slotDuration,
              student_ids: newNumericIds,
              students_data: toCreateStudents,
              instructor_id: primaryInstructorId,
              instructor_ids: numericCoachIds,
              instructor: assignedInstNames || coachName,
              location: spotName || 'Main Beach',
              condition: 'Moderate',
              type: grp.level || 'Intermediate',
              status: 'Upcoming',
              notes: `${grp.name} (${slotTimeStr}) - Coaches: ${assignedInstNames || 'Staff'} - ${numericStudentIds.length} students`,
              group_name: grp.name || '',
            };

            const createRes = await fetch(`${API}/api/sessions/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createPayload)
            });
            if (!createRes.ok) {
              const errData = await createRes.json().catch(() => ({}));
              console.error("Bulk save error for newly added students:", errData);
            }
          }

          // C) DELETE SESSIONS FOR STUDENTS REMOVED FROM THIS GROUP
          if (remainingDbSessions.length > 0) {
            await Promise.all(
              remainingDbSessions
                .filter(sess => sess.id != null)
                .map(sess =>
                  fetch(`${API}/api/sessions/${sess.id}`, {
                    method: 'DELETE',
                  }).catch(err => console.error('Failed deleting removed student session', sess.id, err))
                )
            );
          }

          if (toUpdateSessions.length > 0 || toCreateStudents.length > 0) {
            publishedCount++;
          }
          continue;
        }

        // ── CREATE MODE: Brand new group without existing sessions ──
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
        if (!editSession) {
          try {
            const schoolId = currentUser?.school_id || null;
            const rawSchool = currentUser?.school || currentUser?.school_name || activeSchoolName || '';
            const schoolName = typeof rawSchool === 'object' ? (rawSchool?.name || rawSchool?.school_name || '') : String(rawSchool);
            const delParams = new URLSearchParams();
            if (schoolId) delParams.set('school_id', schoolId);
            if (schoolName) delParams.set('school_name', schoolName);
            delParams.set('date', selectedSessionDateYYYYMMDD);
            fetch(`${API}/api/session-drafts?${delParams.toString()}`, { method: 'DELETE' }).catch(() => { });
          } catch (e) { }
        }
        // Immediately refresh existing DB sessions so published indicator turns active
        try {
          const activeSchoolStr = sessionStorage.getItem('activeSchool');
          let sName = '';
          if (activeSchoolStr) {
            try {
              const p = JSON.parse(activeSchoolStr);
              sName = typeof p.name === 'string' ? p.name : p.name?.name || (typeof p === 'string' ? p : '');
            } catch (e) { sName = activeSchoolStr; }
          }
          const sParam = sName ? `?school=${encodeURIComponent(sName)}` : '';
          fetch(`${API}/api/sessions${sParam}`)
            .then(r => r.json())
            .then(data => {
              if (Array.isArray(data)) setExistingDbSessions(data);
            })
            .catch(() => { });
          fetch(`${API}/api/students${sParam}`)
            .then(r => r.json())
            .then(data => {
              if (Array.isArray(data)) {
                const mapped = normalizeStudentsData(data, sName);
                setDbStudents(mapped);
              }
            })
            .catch(() => { });
        } catch (e) { }
        if (editSession) {
          if (isModal && modalHistoryPushedRef.current) {
            modalHistoryPushedRef.current = false;
            window.__newSessionIgnorePopState = true;
            window.history.back();
          }
          if (onSessionCreated) onSessionCreated();
          if (onClose) onClose();
          return;
        }
        const distinctSlotIds = new Set(validGroups.map(g => String(g.slotId || selectedSlotId || 'default')));
        setPublishedStats({
          sessionsCount: publishedCount,
          slotsCount: distinctSlotIds.size
        });
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
    const k = normalizeLevelKey(level);
    if (k === 'advance_beginner') return { bg: '#FEF9C3', text: '#A16207', border: '#FDE047' }; // Yellow badge
    if (k === 'advance_intermediate') return { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' }; // Blue badge
    if (k === 'intermediate') return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }; // Amber badge
    if (k === 'advanced') return { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' }; // Purple badge
    if (k === 'pro') return { bg: '#FFE4E6', text: '#BE123C', border: '#FDA4AF' }; // Rose / Red badge for Pro
    return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' }; // Beginner Green badge
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
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
        {/* Center: Stepper Navigation */}
        <div className="ns-header-center">
          <div className="ns-stepper">
            <div
              className={`ns-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
              onClick={() => setCurrentStep(1)}
            >
              <div className="ns-step-circle">
                {currentStep > 1 ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
        </div>

        {/* Right: Clear Draft & Close Button */}
        <div className="ns-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!editSession && (
            <button
              type="button"
              className="ns-clear-draft-btn"
              onClick={handleClearDraft}
              disabled={!hasSavedDraft && !clearDraftToast}
              title={hasSavedDraft ? 'Clear all saved draft data and reset selections' : 'No saved draft to clear'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: clearDraftToast ? '#DC2626' : !hasSavedDraft ? '#F8FAFC' : '#FEF2F2',
                color: clearDraftToast ? '#FFFFFF' : !hasSavedDraft ? '#94A3B8' : '#DC2626',
                border: clearDraftToast ? '1px solid #DC2626' : !hasSavedDraft ? '1px solid #E2E8F0' : '1px solid #FECACA',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: !hasSavedDraft ? 'not-allowed' : 'pointer',
                opacity: !hasSavedDraft ? 0.6 : 1,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!clearDraftToast && hasSavedDraft) {
                  e.currentTarget.style.background = '#FEE2E2';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                }
              }}
              onMouseLeave={(e) => {
                if (!clearDraftToast && hasSavedDraft) {
                  e.currentTarget.style.background = '#FEF2F2';
                  e.currentTarget.style.borderColor = '#FECACA';
                }
              }}
            >
              <span>{clearDraftToast ? '✓' : '🗑️'}</span>
              <span>{clearDraftToast ? 'Draft Cleared!' : 'Clear Draft'}</span>
            </button>
          )}

          {isModal && (
            <div className="ns-header-close-wrap">
              <button
                type="button"
                className="ses-modal-close"
                onClick={handleRequestClose}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#EF4444';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#EF4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Save Draft on Close Confirmation Modal */}
      {showCloseConfirmModal && (
        <div
          className="ns-modal-overlay"
          style={{
            zIndex: 1400,
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleCancelCloseConfirm}
        >
          <div
            className="ns-modal-card"
            style={{
              position: 'relative',
              maxWidth: '420px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px 24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-Right Cross Button (Cancel) */}
            <button
              type="button"
              onClick={handleCancelCloseConfirm}
              title="Cancel / Close"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#EF4444';
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.borderColor = '#EF4444';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#F1F5F9';
                e.currentTarget.style.color = '#64748B';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              ✕
            </button>

            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#FEF3C7',
                border: '2px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginBottom: '16px'
              }}
            >
              💾
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '19px', fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>
              Save Session Draft?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, padding: '0 8px' }}>
              You have unsaved changes in this session setup. Do you want to save as a draft before closing, or discard changes?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={confirmSaveDraftAndClose}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>💾</span>
                <span>Save Draft &amp; Close</span>
              </button>

              <button
                type="button"
                onClick={confirmDiscardAndClose}
                style={{
                  width: '100%',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: '1.5px solid #FECACA',
                  padding: '11px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
              >
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Scrollable Container */}
      <div className={isModal ? "ns-modal-body-scroll" : ""} style={isModal ? { padding: '16px 24px', overflowY: 'auto', overflowX: 'hidden', flex: 1, maxHeight: 'calc(92vh - 72px)', display: 'flex', flexDirection: 'column', overflowAnchor: 'none' } : { display: 'flex', flexDirection: 'column', flex: 1, overflowAnchor: 'none' }}>

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

                      const monthStr = String(month + 1).padStart(2, '0');
                      const dayStr = String(cd.day).padStart(2, '0');
                      const cellDateYYYYMMDD = `${year}-${monthStr}-${dayStr}`;
                      const hasCustomSchedule = cd.isCurrentMonth && customDatesList.includes(cellDateYYYYMMDD);

                      return (
                        <div
                          key={idx}
                          className={`ns-cal-day-cell ${!cd.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'disabled-past' : ''} ${hasCustomSchedule ? 'has-custom-schedule' : ''}`}
                          style={{
                            position: 'relative',
                            opacity: isPast ? 0.3 : (cd.isCurrentMonth ? 1 : 0.4),
                            cursor: (isPast || !cd.isCurrentMonth) ? 'not-allowed' : 'pointer',
                            background: isPast ? '#F1F5F9' : undefined,
                            color: isPast ? '#94A3B8' : undefined,
                            pointerEvents: isPast ? 'none' : 'auto'
                          }}
                          title={
                            isPast
                              ? 'Past dates cannot be selected'
                              : (hasCustomSchedule ? `Custom Schedule Configured (${cellDateYYYYMMDD})` : undefined)
                          }
                          onClick={() => {
                            if (cd.isCurrentMonth && !isPast) handleSelectCalendarDay(cd.day);
                          }}
                        >
                          <span className="ns-cal-day-num" style={isPast ? { textDecoration: 'line-through' } : {}}>{cd.day}</span>
                          {hasCustomSchedule && (
                            <span
                              className="ns-cal-custom-dot"
                              title="Custom Schedule Configured"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar legend for custom schedules */}
                  {customDatesList.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px', fontSize: '11px', color: '#B45309', fontWeight: 600 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }} />
                      <span>Dates with Custom Schedule</span>
                    </div>
                  )}
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
                        {allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'beginner').length}
                      </span>
                    </div>
                    {allPoolStudents.some(s => normalizeLevelKey(s.level) === 'advance_beginner') && (
                      <div className="ns-pool-item">
                        <span className="ns-pool-bullet">&bull;</span>
                        <span className="ns-pool-item-name">Advance Beginner Students</span>
                        <span className="ns-pool-item-num">
                          {allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'advance_beginner').length}
                        </span>
                      </div>
                    )}
                    <div className="ns-pool-item">
                      <span className="ns-pool-bullet">&bull;</span>
                      <span className="ns-pool-item-name">Intermediate Students</span>
                      <span className="ns-pool-item-num">
                        {allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'intermediate').length}
                      </span>
                    </div>
                    {allPoolStudents.some(s => normalizeLevelKey(s.level) === 'advance_intermediate') && (
                      <div className="ns-pool-item">
                        <span className="ns-pool-bullet">&bull;</span>
                        <span className="ns-pool-item-name">Advance Intermediate Students</span>
                        <span className="ns-pool-item-num">
                          {allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'advance_intermediate').length}
                        </span>
                      </div>
                    )}
                    <div className="ns-pool-item">
                      <span className="ns-pool-bullet">&bull;</span>
                      <span className="ns-pool-item-name">Advanced Students</span>
                      <span className="ns-pool-item-num">
                        {allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'advanced').length}
                      </span>
                    </div>
                    <div className="ns-pool-item">
                      <span className="ns-pool-bullet">&bull;</span>
                      <span className="ns-pool-item-name">Pro Students</span>
                      <span className="ns-pool-item-num">
                        {allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'pro').length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ns-pool-footer" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Total Students: <strong style={{ color: '#0F172A', fontWeight: 800 }}>{allPoolStudents.length}</strong></span>
                    <span style={{ color: '#CBD5E1' }}>•</span>
                    <span style={{ color: '#0284C7' }}>Selected: <strong style={{ fontWeight: 800 }}>{allSelectedStudentIds.length}</strong></span>
                    <span style={{ color: '#CBD5E1' }}>•</span>
                    <span style={{ color: '#64748B' }}>Not Selected: <strong style={{ fontWeight: 800 }}>{Math.max(0, allPoolStudents.length - allSelectedStudentIds.length)}</strong></span>
                  </div>
                  <span className="ns-pool-space" style={{ fontSize: '12px', fontWeight: 600 }}>Capacity: {capacity || 30}</span>
                </div>
              </div>

              {/* Row 2 (Full Width): 2. Choose Time Slot */}
              <section className="ns-card ns-step1-slots-card" style={{ gridColumn: '1 / -1' }}>
                <div className="ns-slots-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 className="ns-card-heading" style={{ margin: 0 }}>2. Choose Time Slot & Capacity</h3>
                    {isCustomForDate ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: '#FEF3C7',
                          color: '#92400E',
                          border: '1px solid #FDE68A',
                          borderRadius: '6px',
                          padding: '3px 9px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <span>🗓️</span>
                          <span>Custom Schedule for {formattedSessionDate}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleResetToDefault}
                          style={{
                            background: '#FFFFFF',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Reset this date back to Default Template"
                        >
                          <span>↺</span> Reset to Default
                        </button>
                      </div>
                    ) : (
                      <span style={{
                        background: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '3px 9px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span>✓</span>
                        <span>Default Schedule (All Dates)</span>
                      </span>
                    )}
                    {isSlotsLoading && (
                      <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                        Updating slots...
                      </span>
                    )}
                  </div>

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
                    <span>Session Configure ( Default )</span>
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
                            <div
                              className="ns-slot-time-wrap"
                              onClick={(e) => handleEditSlot(slot, e)}
                              title="Click to edit slot time & duration"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                              <h4 className="ns-slot-time">{slot.time}</h4>
                            </div>

                            {/* Interactive Active / Inactive Toggle Switch */}
                            {/* Active / Inactive Dropdown */}
                            <select
                              className="ns-slot-pill clickable-toggle"
                              value={slot.active === false ? 'inactive' : 'active'}
                              onChange={(e) => {
                                const isActive = e.target.value === 'active';

                                if (
                                  (slot.active === false && isActive) ||
                                  (slot.active !== false && !isActive)
                                ) {
                                  handleToggleSlotActive(slot.id);
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                border: slot.active === false
                                  ? '1.5px solid #FECACA'
                                  : '1.5px solid #86EFAC',
                                background: slot.active === false ? '#FEE2E2' : '#DCFCE7',
                                color: slot.active === false ? '#B91C1C' : '#15803D',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700
                              }}
                            >
                              <option value="active">Active ({selectedDayOfWeek})</option>
                              <option value="inactive">Inactive</option>
                            </select>

                            {slot.active !== false && !isDayMatch && (
                              <span className="ns-slot-pill off-day">
                                Off today ({selectedDayOfWeek})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Slot Card Right Actions: Capacity Control + Direct Delete Button */}
                        <div
                          className="ns-slot-right-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                                <strong>{slotCap === '' ? '—' : slotCap}</strong> Students
                              </span>
                            </div>
                            <div className="ns-slot-cap-stepper">
                              <button
                                type="button"
                                className="ns-slot-stepper-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSlot(slot);
                                  const cur = parseInt(slotCap, 10);
                                  const safeCur = isNaN(cur) ? (parseInt(slot.maxStudents, 10) || 5) : cur;
                                  handleUpdateSlotCapacity(slot.id, Math.max(1, safeCur - 1));
                                }}
                                title="Decrease capacity"
                              >
                                -
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={slotCap}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, '');
                                  handleSelectSlot(slot);
                                  if (raw === '') {
                                    handleUpdateSlotCapacity(slot.id, '');
                                  } else {
                                    const num = parseInt(raw, 10);
                                    handleUpdateSlotCapacity(slot.id, isNaN(num) ? '' : Math.min(500, num));
                                  }
                                }}
                                onFocus={(e) => {
                                  e.target.select();
                                }}
                                onBlur={() => {
                                  const cur = slotCapacityMap[slot.id];
                                  if (cur === '' || cur === undefined || isNaN(parseInt(cur, 10)) || parseInt(cur, 10) < 1) {
                                    handleUpdateSlotCapacity(slot.id, parseInt(slot.maxStudents, 10) || 5);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
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
                                  const cur = parseInt(slotCap, 10);
                                  const safeCur = isNaN(cur) ? 0 : cur;
                                  handleUpdateSlotCapacity(slot.id, safeCur + 1);
                                }}
                                title="Increase capacity"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Direct Edit Slot Button */}
                          <button
                            type="button"
                            className="ns-slot-edit-btn"
                            onClick={(e) => handleEditSlot(slot, e)}
                            title="Edit slot time, duration, and capacity"
                            aria-label={`Edit slot ${slot.time || slot.startTime || ''}`}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Direct Delete Slot Button */}
                          <button
                            type="button"
                            className="ns-slot-delete-btn"
                            onClick={(e) => handleDeleteSlot(slot.id, e)}
                            title="Delete this slot for this date"
                            aria-label={`Delete slot ${slot.time || slot.startTime || ''}`}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {slots.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '24px 16px',
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      border: '1.5px dashed #CBD5E1',
                      margin: '6px 0 12px 0'
                    }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>
                        All time slots removed for {formattedSessionDate}.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="ns-secondary-btn"
                        style={{ fontSize: '12.5px', padding: '6px 14px', borderRadius: '8px' }}
                      >
                        ↺ Restore Default Slots
                      </button>
                    </div>
                  )}

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
            <div className="ns-sticky-bar-wrapper">
              <div className="ns-sticky-bar">
                <div className="ns-sb-left" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="ns-sb-capacity" style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>
                    {formattedSessionDate} &bull; {selectedSlot ? (selectedSlot.startTime || selectedSlot.time) : 'Select Time Slot'} &bull; Capacity: {capacity} Students
                  </span>
                </div>

                <div className="ns-sb-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="ns-sb-draft-btn"
                    onClick={handleManualSaveDraft}
                    title="Save current progress as draft"
                    style={{
                      background: draftSavedToast ? '#059669' : 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      border: draftSavedToast ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => { if (!draftSavedToast) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
                    onMouseLeave={(e) => { if (!draftSavedToast) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                  >
                    <span>{draftSavedToast ? '✓ Draft Saved' : 'Save Draft'}</span>
                  </button>
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
                    const isSelected = String(selectedSlotId) === String(s.id);
                    const theme = getSlotThemeForSlot(s.id);
                    const count = getSlotTotalStudentCount(s);

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
                    type="button"
                    className={`ns-pill ${levelFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('all')}
                  >
                    All Students ({allPoolStudents.length})
                  </button>
                  <button
                    type="button"
                    className={`ns-pill ${levelFilter === 'beginner' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('beginner')}
                  >
                    Beginner ({allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'beginner').length})
                  </button>
                  {allPoolStudents.some(s => normalizeLevelKey(s.level) === 'advance_beginner') && (
                    <button
                      type="button"
                      className={`ns-pill ${levelFilter === 'advance_beginner' ? 'active' : ''}`}
                      onClick={() => setLevelFilter('advance_beginner')}
                    >
                      Advance Beginner ({allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'advance_beginner').length})
                    </button>
                  )}
                  <button
                    type="button"
                    className={`ns-pill ${levelFilter === 'intermediate' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('intermediate')}
                  >
                    Intermediate ({allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'intermediate').length})
                  </button>
                  {allPoolStudents.some(s => normalizeLevelKey(s.level) === 'advance_intermediate') && (
                    <button
                      type="button"
                      className={`ns-pill ${levelFilter === 'advance_intermediate' ? 'active' : ''}`}
                      onClick={() => setLevelFilter('advance_intermediate')}
                    >
                      Advance Intermediate ({allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'advance_intermediate').length})
                    </button>
                  )}
                  <button
                    type="button"
                    className={`ns-pill ${levelFilter === 'advanced' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('advanced')}
                  >
                    Advanced ({allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'advanced').length})
                  </button>
                  <button
                    type="button"
                    className={`ns-pill ${levelFilter === 'pro' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('pro')}
                  >
                    Pro ({allPoolStudents.filter(s => normalizeLevelKey(s.level) === 'pro').length})
                  </button>
                </div>
              </div>

              {/* Filter by Status (Selected vs Not Selected) */}
              {(() => {
                const activeSlotIdStep2 = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
                const currentSlotCount = (slotStudentMap[activeSlotIdStep2] || []).length;
                const totalSelectedCount = allSelectedStudentIds.length;
                const notSelectedCount = Math.max(0, allPoolStudents.length - totalSelectedCount);

                return (
                  <div className="ns-filter-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="ns-filter-label" style={{ margin: 0 }}>Filter by Status:</span>
                      <div className="ns-pill-group" style={{ flexWrap: 'wrap', gap: '6px' }}>
                        <button
                          type="button"
                          className={`ns-pill ${selectionFilter === 'all' ? 'active' : ''}`}
                          onClick={() => {
                            setSelectionFilter('all');
                            setSelectedSessionSlotFilter('all');
                          }}
                        >
                          All Students ({allPoolStudents.length})
                        </button>
                        <button
                          type="button"
                          className={`ns-pill ${(selectionFilter === 'selected' || selectionFilter === 'this_slot') ? 'active' : ''}`}
                          onClick={() => {
                            setSelectionFilter('selected');
                            setSelectedSessionSlotFilter('all');
                          }}
                          style={(selectionFilter === 'selected' || selectionFilter === 'this_slot') ? { backgroundColor: '#0284C7', borderColor: '#0284C7', color: '#FFFFFF' } : {}}
                        >
                           Selected ({totalSelectedCount})
                        </button>
                        {slots.length > 1 && totalSelectedCount > currentSlotCount && currentSlotCount > 0 && (
                          <button
                            type="button"
                            className={`ns-pill ${(selectionFilter === 'this_slot' || (selectionFilter === 'selected' && String(selectedSessionSlotFilter) === String(activeSlotIdStep2))) ? 'active' : ''}`}
                            onClick={() => {
                              setSelectionFilter('selected');
                              setSelectedSessionSlotFilter(String(activeSlotIdStep2));
                            }}
                            style={(selectionFilter === 'this_slot' || (selectionFilter === 'selected' && String(selectedSessionSlotFilter) === String(activeSlotIdStep2))) ? { backgroundColor: '#0F172A', borderColor: '#0F172A', color: '#FFFFFF' } : {}}
                            title="Students selected specifically in this time slot"
                          >
                            🎯 In This Slot ({currentSlotCount})
                          </button>
                        )}
                        <button
                          type="button"
                          className={`ns-pill ${selectionFilter === 'not_selected' ? 'active' : ''}`}
                          onClick={() => {
                            setSelectionFilter('not_selected');
                            setSelectedSessionSlotFilter('all');
                          }}
                          style={selectionFilter === 'not_selected' ? { backgroundColor: '#64748B', borderColor: '#64748B', color: '#FFFFFF' } : {}}
                        >
                           Not Selected ({notSelectedCount})
                        </button>
                      </div>
                    </div>

                    {/* Secondary Sub-Filter: Which Session Slot's Selected Students to Show */}
                    {(selectionFilter === 'selected' || selectionFilter === 'this_slot') && activeSlotsForDay.length > 1 && (
                      <div
                        style={{
                          width: '100%',
                          marginTop: '10px',
                          padding: '10px 14px',
                          background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                          border: '1.5px solid #BAE6FD',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '14px' }}>🎯</span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Selected in Session Slot:
                          </span>
                        </div>

                        <div className="ns-pill-group" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {/* All Selected Slots Button */}
                          <button
                            type="button"
                            className={`ns-pill ${(selectionFilter === 'selected' && selectedSessionSlotFilter === 'all') ? 'active' : ''}`}
                            onClick={() => {
                              setSelectionFilter('selected');
                              setSelectedSessionSlotFilter('all');
                            }}
                            style={(selectionFilter === 'selected' && selectedSessionSlotFilter === 'all') ? {
                              backgroundColor: '#0284C7',
                              borderColor: '#0284C7',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              padding: '4px 12px',
                              fontSize: '12px'
                            } : {
                              backgroundColor: '#FFFFFF',
                              borderColor: '#BAE6FD',
                              color: '#0369A1',
                              fontWeight: 700,
                              padding: '4px 12px',
                              fontSize: '12px'
                            }}
                          >
                            <span>All Selected</span>
                            <span style={{
                              background: (selectionFilter === 'selected' && selectedSessionSlotFilter === 'all') ? 'rgba(255, 255, 255, 0.25)' : '#E0F2FE',
                              color: (selectionFilter === 'selected' && selectedSessionSlotFilter === 'all') ? '#FFFFFF' : '#0284C7',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 800,
                              marginLeft: '4px'
                            }}>
                              {totalSelectedCount}
                            </span>
                          </button>

                          {/* Individual Slot Buttons */}
                          {activeSlotsForDay.map((slot, sIdx) => {
                            const slotIds = new Set(
                              (slotStudentMap[slot.id] || slotStudentMap[String(slot.id)] || []).map(String)
                            );
                            trainingGroups.forEach(g => {
                              if (String(g.slotId) === String(slot.id)) {
                                (g.studentIds || []).forEach(id => slotIds.add(String(id)));
                              }
                            });
                            const count = slotIds.size;
                            const isCurrentActive = String(slot.id) === String(activeSlotIdStep2);
                            const isThisFilterActive = (selectionFilter === 'this_slot' && isCurrentActive) ||
                              (selectionFilter === 'selected' && String(selectedSessionSlotFilter) === String(slot.id));

                            return (
                              <button
                                key={slot.id || sIdx}
                                type="button"
                                className={`ns-pill ${isThisFilterActive ? 'active' : ''}`}
                                onClick={() => {
                                  setSelectionFilter('selected');
                                  setSelectedSessionSlotFilter(String(slot.id));
                                }}
                                style={isThisFilterActive ? {
                                  backgroundColor: '#0F172A',
                                  borderColor: '#0F172A',
                                  color: '#FFFFFF',
                                  fontWeight: 800,
                                  padding: '4px 12px',
                                  fontSize: '12px'
                                } : {
                                  backgroundColor: '#FFFFFF',
                                  borderColor: '#CBD5E1',
                                  color: '#1E293B',
                                  fontWeight: 600,
                                  padding: '4px 12px',
                                  fontSize: '12px'
                                }}
                              >
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: isThisFilterActive ? '#38BDF8' : '#F1F5F9',
                                  color: isThisFilterActive ? '#0F172A' : '#475569',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  marginRight: '4px'
                                }}>
                                  {sIdx + 1}
                                </span>
                                <span>{slot.startTime || slot.time}</span>
                                {isCurrentActive && (
                                  <span style={{
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    color: isThisFilterActive ? '#38BDF8' : '#0284C7',
                                    background: isThisFilterActive ? 'rgba(56, 189, 248, 0.18)' : '#F0F9FF',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    marginLeft: '3px'
                                  }}>
                                    Current Tab
                                  </span>
                                )}
                                <span style={{
                                  marginLeft: '4px',
                                  fontWeight: 700,
                                  background: isThisFilterActive ? 'rgba(255, 255, 255, 0.2)' : '#F1F5F9',
                                  color: isThisFilterActive ? '#FFFFFF' : '#475569',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  fontSize: '11px'
                                }}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Filter by Expected Time */}
              <div className="ns-filter-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                <span className="ns-filter-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span>⏰</span> Expected Time:
                </span>
                <div className="ns-pill-group" style={{ flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    className={`ns-pill ${expectedTimeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setExpectedTimeFilter('all')}
                  >
                    All ({allPoolStudents.length})
                  </button>

                  {/* Matches current selected session slot */}
                  {currentSlotMatchingCount > 0 && (
                    <button
                      type="button"
                      className={`ns-pill ${expectedTimeFilter === 'current_slot' ? 'active' : ''}`}
                      onClick={() => setExpectedTimeFilter(prev => prev === 'current_slot' ? 'all' : 'current_slot')}
                      style={expectedTimeFilter === 'current_slot' ? {
                        backgroundColor: '#0D9488',
                        borderColor: '#0D9488',
                        color: '#FFFFFF',
                        fontWeight: 700
                      } : {
                        borderColor: '#99F6E4',
                        color: '#0F766E',
                        background: '#F0FDFA'
                      }}
                      title={`Filter students whose expected time matches current slot (${currentActiveSlotDisplayTime})`}
                    >
                      <span>🎯 Matches Current Slot ({currentActiveSlotDisplayTime})</span>
                      <span style={{
                        background: expectedTimeFilter === 'current_slot' ? 'rgba(255, 255, 255, 0.25)' : '#CCFBF1',
                        color: expectedTimeFilter === 'current_slot' ? '#FFFFFF' : '#0F766E',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        marginLeft: '4px'
                      }}>
                        {currentSlotMatchingCount}
                      </span>
                    </button>
                  )}

                  {/* All distinct student expected times */}
                  {distinctExpectedTimes.map(({ time, count }) => {
                    const isSelected = expectedTimeFilter === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        className={`ns-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => setExpectedTimeFilter(prev => prev === time ? 'all' : time)}
                        style={isSelected ? {
                          backgroundColor: '#0D9488',
                          borderColor: '#0D9488',
                          color: '#FFFFFF',
                          fontWeight: 700
                        } : {}}
                      >
                        <span>{time}</span>
                        <span style={{
                          background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
                          color: isSelected ? '#FFFFFF' : '#475569',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          marginLeft: '4px'
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {/* Students with No Expected Time */}
                  {noExpectedTimeCount > 0 && (
                    <button
                      type="button"
                      className={`ns-pill ${expectedTimeFilter === 'none' ? 'active' : ''}`}
                      onClick={() => setExpectedTimeFilter(prev => prev === 'none' ? 'all' : 'none')}
                      style={expectedTimeFilter === 'none' ? {
                        backgroundColor: '#64748B',
                        borderColor: '#64748B',
                        color: '#FFFFFF',
                        fontWeight: 700
                      } : {}}
                    >
                      <span>No Expected Time</span>
                      <span style={{
                        background: expectedTimeFilter === 'none' ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
                        color: expectedTimeFilter === 'none' ? '#FFFFFF' : '#64748B',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginLeft: '4px'
                      }}>
                        {noExpectedTimeCount}
                      </span>
                    </button>
                  )}
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
                  {(courseDayFilter !== 'all' || genderFilterStep2 !== 'all' || swimmingFilterStep2 !== 'all' || expectedTimeFilter !== 'all') && (
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
                const currentSlotList = Array.from(new Set([
                  ...(slotStudentMap[activeSlotId] || slotStudentMap[String(activeSlotId)] || []).map(String),
                  ...trainingGroups
                    .filter(g => !g.isExistingDbGroup && String(g.slotId) === String(activeSlotId))
                    .flatMap(g => (g.studentIds || []).map(String))
                ])).filter(id => {
                  const st = allPoolStudents.find(s => String(s.id) === String(id));
                  return !st || !isStudentScheduledInDbOnDate(st);
                });
                const currentSlotSet = new Set(currentSlotList);
                const visibleIds = filteredStudents.map(s => s.id);
                const matchingFilteredIds = filterMatchingStudents.map(s => s.id);
                const isAllFilteredSelected = matchingFilteredIds.length > 0 && matchingFilteredIds.every(id => currentSlotSet.has(String(id)));
                const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => currentSlotSet.has(String(id)));
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
                      {refreshSuccessMessage && (
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ✓ {refreshSuccessMessage}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Refresh Students Button */}
                      <button
                        type="button"
                        id="ns-refresh-students-btn"
                        className="ns-refresh-btn"
                        onClick={handleRefreshStudents}
                        disabled={isRefreshingStudents}
                        title="Click to refresh student roster from database to load newly added students"
                        style={{
                          background: '#FFFFFF',
                          color: '#0284C7',
                          border: '1.5px solid #0284C7',
                          borderRadius: '8px',
                          padding: '7px 14px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: isRefreshingStudents ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(2, 132, 199, 0.15)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <svg
                          className={isRefreshingStudents ? 'ns-spinning' : ''}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <polyline points="1 20 1 14 7 14"></polyline>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        <span>{isRefreshingStudents ? 'Refreshing...' : 'Refresh'}</span>
                      </button>

                      {/* Select by Filter Button */}
                      <button
                        type="button"
                        className={`ns-select-all-btn ${isAllFilteredSelected ? 'deselect' : ''}`}
                        onClick={() => {
                          if (!activeSlotId) return;
                          if (matchingFilteredIds.length === 0) {
                            setUiAlert({
                              title: 'No Matching Students',
                              message: 'No students match the current active filter criteria.',
                              type: 'info',

                            });
                            return;
                          }

                          if (isAllFilteredSelected) {
                            // Deselect filtered students from active slot
                            const filterIdStrs = matchingFilteredIds.map(String);
                            setSlotStudentMap(prevMap => {
                              const newMap = { ...prevMap };
                              newMap[activeSlotId] = (newMap[activeSlotId] || []).filter(id => !filterIdStrs.includes(String(id)));
                              newMap[String(activeSlotId)] = (newMap[String(activeSlotId)] || []).filter(id => !filterIdStrs.includes(String(id)));
                              return newMap;
                            });
                            setTrainingGroups(prev => prev.map(grp => {
                              if (String(grp.slotId) === String(activeSlotId)) {
                                return {
                                  ...grp,
                                  studentIds: (grp.studentIds || []).filter(id => !filterIdStrs.includes(String(id)))
                                };
                              }
                              return grp;
                            }));
                          } else {
                            // Keep previously selected students and ADD matching filtered students!
                            const currentSelected = slotStudentMap[activeSlotId] || slotStudentMap[String(activeSlotId)] || [];
                            const combinedIds = Array.from(new Set([...currentSelected, ...matchingFilteredIds]));

                            // Automatically expand slot capacity if combined students exceed current capacity
                            if (combinedIds.length > slotCap) {
                              handleUpdateSlotCapacity(activeSlotId, combinedIds.length);
                            }

                            setSlotStudentMap(prevMap => {
                              const newMap = { ...prevMap };
                              // Remove matching students from other slots first
                              Object.keys(newMap).forEach(sId => {
                                if (String(sId) !== String(activeSlotId) && Array.isArray(newMap[sId])) {
                                  newMap[sId] = newMap[sId].filter(id => !matchingFilteredIds.map(String).includes(String(id)));
                                }
                              });
                              // PRESERVE existing selected students and append new filtered students!
                              const existingInActive = newMap[activeSlotId] || newMap[String(activeSlotId)] || [];
                              const updated = Array.from(new Set([...existingInActive, ...matchingFilteredIds]));
                              newMap[activeSlotId] = updated;
                              newMap[String(activeSlotId)] = updated;
                              return newMap;
                            });

                            const filterInfo = [
                              courseDayFilter !== 'all' ? `Day ${courseDayFilter}` : '',
                              levelFilter !== 'all' ? levelFilter : '',
                              expectedTimeFilter !== 'all' ? (expectedTimeFilter === 'current_slot' ? `Slot: ${currentActiveSlotDisplayTime}` : expectedTimeFilter === 'none' ? 'No Expected Time' : `Exp: ${expectedTimeFilter}`) : '',
                              genderFilterStep2 !== 'all' ? genderFilterStep2 : '',
                              swimmingFilterStep2 !== 'all' ? swimmingFilterStep2 : '',
                              studentSearchStep2 ? `"${studentSearchStep2}"` : ''
                            ].filter(Boolean).join(', ') || 'All';

                            setUiAlert({
                              title: 'Added by Filter',
                              message: `Added ${matchingFilteredIds.length} student(s) matching filter (${filterInfo}) to this slot without deselecting your previous selections.`,
                              type: 'success',
                              icon: '🎯'
                            });
                          }
                        }}
                        style={{
                          background: isAllFilteredSelected
                            ? '#F0FDFA'
                            : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                          color: isAllFilteredSelected ? '#0F766E' : '#FFFFFF',
                          border: isAllFilteredSelected ? '1.5px solid #99F6E4' : '1px solid #0D9488',
                          boxShadow: isAllFilteredSelected ? 'none' : '0 2px 6px rgba(13, 148, 136, 0.25)'
                        }}
                        title={isAllFilteredSelected ? 'Deselect students matching the active filter' : 'Select only students matching the current active filter'}
                      >
                        {isAllFilteredSelected ? (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            <span>Deselect by Filter ({matchingFilteredIds.length})</span>
                          </>
                        ) : (
                          <>
                            <span>🎯</span>
                            <span>Select by Filter ({matchingFilteredIds.length})</span>
                          </>
                        )}
                      </button>

                      {/* Select All Button */}
                      <button
                        type="button"
                        className={`ns-select-all-btn ${isAllSelected ? 'deselect' : ''}`}
                        onClick={() => {
                          if (!activeSlotId) return;
                          if (isAllSelected) {
                            const visIdStrs = visibleIds.map(String);
                            setSlotStudentMap(prevMap => {
                              const newMap = { ...prevMap };
                              newMap[activeSlotId] = (newMap[activeSlotId] || []).filter(id => !visIdStrs.includes(String(id)));
                              newMap[String(activeSlotId)] = (newMap[String(activeSlotId)] || []).filter(id => !visIdStrs.includes(String(id)));
                              return newMap;
                            });
                            setTrainingGroups(prev => prev.map(grp => {
                              if (String(grp.slotId) === String(activeSlotId)) {
                                return {
                                  ...grp,
                                  studentIds: (grp.studentIds || []).filter(id => !visIdStrs.includes(String(id)))
                                };
                              }
                              return grp;
                            }));
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
                  </div>
                );
              })()}

              {filteredStudents.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>No active students on this date</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    No students currently have an active course window on {formattedSessionDate}.
                  </div>
                  <div style={{ marginTop: '14px' }}>
                    <button
                      type="button"
                      onClick={handleRefreshStudents}
                      disabled={isRefreshingStudents}
                      className="ns-refresh-btn"
                      style={{ background: '#0284C7', color: '#FFFFFF', borderColor: '#0284C7' }}
                    >
                      <svg
                        className={isRefreshingStudents ? 'ns-spinning' : ''}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                      </svg>
                      <span>{isRefreshingStudents ? 'Refreshing...' : '🔄 Refresh Student Roster'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ns-student-grid">
                  {filteredStudents.map(student => {
                    const badge = getBadgeStyle(student.level);
                    const isSelectedFilterMatch = courseDayFilter !== 'all' && String(student.whichDay) === String(courseDayFilter);
                    const isScheduledInDb = isStudentScheduledInDbOnDate(student);
                    const assignment = !isScheduledInDb ? getStudentSlotAssignment(student.id) : null;
                    const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
                    const isCurrentSlotStudent = !isScheduledInDb && assignment && String(assignment.slot.id) === String(activeSlotId);
                    const isOtherSlotStudent = !isScheduledInDb && assignment && String(assignment.slot.id) !== String(activeSlotId);
                    // Only freshly selected students (not auto-hydrated from DB) get the dark badge
                    const isNewlySelected = !isScheduledInDb && isCurrentSlotStudent;
                    const isChecked = !isScheduledInDb && isCurrentSlotStudent;
                    const assignedGroup = getStudentAssignedGroup(student);

                    const cardStyle = () => {
                      if (isScheduledInDb) {
                        return {
                          background: '#FFFDF5',
                          borderTop: '1px solid #FDE68A',
                          borderRight: '1px solid #FDE68A',
                          borderBottom: '1px solid #FDE68A',
                          borderLeft: '1px solid #FDE68A',
                          boxShadow: 'none',
                          opacity: 0.95,
                          transition: 'all 0.15s ease',
                          cursor: 'default'
                        };
                      }
                      return {
                        background: isOtherSlotStudent ? '#F8FAFC' : '#FFFFFF',
                        borderTop: isOtherSlotStudent ? '1px dashed #CBD5E1' : '1px solid #E2E8F0',
                        borderRight: isOtherSlotStudent ? '1px dashed #CBD5E1' : '1px solid #E2E8F0',
                        borderBottom: isOtherSlotStudent ? '1px dashed #CBD5E1' : '1px solid #E2E8F0',
                        borderLeft: isOtherSlotStudent ? '1px dashed #CBD5E1' : '1px solid #E2E8F0',
                        boxShadow: isNewlySelected ? '0 1px 3px rgba(15, 23, 42, 0.05)' : 'none',
                        opacity: isOtherSlotStudent ? 0.72 : 1,
                        transition: 'all 0.15s ease',
                        cursor: 'pointer'
                      };
                    };

                    return (
                      <div
                        key={student.id}
                        className={`ns-student-row ${isChecked ? 'selected' : ''} ${student.isGuest ? 'ns-guest-row' : ''}`}
                        onClick={() => {
                          if (isScheduledInDb) {
                            setUiAlert({
                              title: 'Student Already Scheduled',
                              message: `${student.name} is already scheduled in an existing session on ${formattedSessionDate}. Scheduled students cannot be selected in a new session.`,
                              type: 'info',
                              icon: 'ℹ️'
                            });
                            return;
                          }
                          toggleSelectStudent(student.id);
                        }}
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
                              border: isScheduledInDb
                                ? '2px solid #D97706'
                                : isNewlySelected
                                  ? (student.isGuest ? '2px solid #0284C7' : '2px solid #0F172A')
                                  : isOtherSlotStudent
                                    ? '2px solid #94A3B8'
                                    : student.isGuest
                                      ? '2px solid #7DD3FC'
                                      : '2px solid #CBD5E1',
                              background: isScheduledInDb
                                ? '#D97706'
                                : isNewlySelected
                                  ? (student.isGuest ? '#0284C7' : '#0F172A')
                                  : isOtherSlotStudent
                                    ? '#E2E8F0'
                                    : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isScheduledInDb && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {!isScheduledInDb && isNewlySelected && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {!isScheduledInDb && isOtherSlotStudent && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                          {/* Column 1: Slot Status & Group Badge (on mobile: HIDE if Not Selected & no group to keep it compact) */}
                          <div className={`ns-student-col-slot ${(!isCurrentSlotStudent && !isOtherSlotStudent && !isScheduledInDb && !assignedGroup) ? 'ns-hide-mobile' : ''}`}>
                            {isScheduledInDb ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
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
                                {assignedGroup && (
                                  <span className="ns-student-group-tag" style={{
                                    background: '#EEF2FF',
                                    color: '#4338CA',
                                    border: '1px solid #C7D2FE',
                                    padding: '2.5px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 2px rgba(67, 56, 202, 0.08)'
                                  }} title={`Group: ${assignedGroup.name}${assignedGroup.time ? ` (${assignedGroup.time})` : ''}`}>
                                    👥 {assignedGroup.name}
                                  </span>
                                )}
                              </div>
                            ) : isNewlySelected && assignment ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
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
                                {assignedGroup && (
                                  <span className="ns-student-group-tag" style={{
                                    background: '#EEF2FF',
                                    color: '#4338CA',
                                    border: '1px solid #C7D2FE',
                                    padding: '2.5px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 2px rgba(67, 56, 202, 0.08)'
                                  }} title={`Group: ${assignedGroup.name}`}>
                                    👥 {assignedGroup.name}
                                  </span>
                                )}
                              </div>
                            ) : isOtherSlotStudent && assignment ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
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
                                {assignedGroup && (
                                  <span className="ns-student-group-tag" style={{
                                    background: '#F1F5F9',
                                    color: '#475569',
                                    border: '1px dashed #CBD5E1',
                                    padding: '2.5px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap'
                                  }} title={`Group: ${assignedGroup.name}`}>
                                    👥 {assignedGroup.name}
                                  </span>
                                )}
                              </div>
                            ) : assignedGroup ? (
                              <span className="ns-student-group-tag" style={{
                                background: '#EEF2FF',
                                color: '#4338CA',
                                border: '1px solid #C7D2FE',
                                padding: '2.5px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 1px 2px rgba(67, 56, 202, 0.08)'
                              }} title={`Group: ${assignedGroup.name}`}>
                                👥 {assignedGroup.name}
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

                          {/* Column 2: Expected Slot (Desktop) */}
                          {student.session_time ? (
                            <div className="ns-student-col-expected ns-hide-mobile" style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: '#F0FDFA',
                                  color: '#0F766E',
                                  border: '1px solid #99F6E4',
                                  padding: '2.5px 7px',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title={`Expected Session Slot: ${student.session_time}`}
                              >
                                <span style={{ fontSize: '9.5px', color: '#64748B', fontWeight: 600 }}>Exp:</span>
                                <span>{student.session_time ? String(student.session_time).split(/\s*[-–—to]+\s*/i)[0].trim() : ''}</span>
                              </span>
                            </div>
                          ) : null}

                          {/* Column 3: Day Badge */}
                          <div className="ns-student-col-day">
                            {student.dateStatus === 'completed' ? (
                              <span
                                style={{
                                  background: '#FEE2E2',
                                  color: '#DC2626',
                                  fontWeight: 600,
                                  fontSize: '10.5px',
                                  padding: '2px 7px',
                                  borderRadius: '8px',
                                  border: '1px solid #FECACA',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Course completed before this date"
                              >
                                Completed
                              </span>
                            ) : student.dateStatus === 'upcoming' ? (
                              <span
                                style={{
                                  background: '#FEF3C7',
                                  color: '#D97706',
                                  fontWeight: 600,
                                  fontSize: '10.5px',
                                  padding: '2px 7px',
                                  borderRadius: '8px',
                                  border: '1px solid #FDE68A',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`Course starts on ${student.startDate || student.start_date}`}
                              >
                                Upcoming
                              </span>
                            ) : (
                              <span
                                className="ns-day-progress-badge"
                                style={{
                                  background: student.isActiveOnDate ? '#ECFDF5' : '#F1F5F9',
                                  color: student.isActiveOnDate ? '#059669' : '#475569',
                                  fontWeight: 600,
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '10px',
                                  border: `1px solid ${student.isActiveOnDate ? '#A7F3D0' : '#E2E8F0'}`,
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                Day {student.whichDay}/{student.totalDays}
                              </span>
                            )}
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
            <div className="ns-sticky-bar-wrapper">
              <div className="ns-sticky-bar">
                {(() => {
                  const activeSlotId = selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id;
                  const activeSlot = slots.find(s => s.id === activeSlotId) || selectedSlot;
                  const slotCap = getSlotCapacity(activeSlot);
                  const currentSlotCount = (slotStudentMap[activeSlotId] || []).filter(id => {
                    const st = allPoolStudents.find(sp => String(sp.id) === String(id));
                    return !st || !isStudentScheduledInDbOnDate(st);
                  }).length;
                  const anySlotOver = slots.some(s => {
                    const cnt = (slotStudentMap[s.id] || []).filter(id => {
                      const st = allPoolStudents.find(sp => String(sp.id) === String(id));
                      return !st || !isStudentScheduledInDbOnDate(st);
                    }).length;
                    return cnt > getSlotCapacity(s);
                  });
                  const totalPoolCount = allPoolStudents.length;
                  const totalSelectedCount = allSelectedStudentIds.length;
                  const notSelectedCount = Math.max(0, totalPoolCount - totalSelectedCount);

                  return (
                    <div className="ns-sb-left" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {anySlotOver && (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.18)',
                          color: '#F87171',
                          border: '1px solid rgba(239, 68, 68, 0.45)',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                          CAPACITY EXCEEDED
                        </span>
                      )}

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '2px 4px'
                      }}>
                        <span style={{ fontSize: '11.5px', color: '#94A3B8', padding: '2px 7px' }}>
                          Total: <strong style={{ color: '#FFFFFF', fontWeight: 700 }}>{totalPoolCount}</strong>
                        </span>
                        <span style={{ width: '1px', height: '12px', background: 'rgba(255, 255, 255, 0.15)' }}></span>
                        <span style={{ fontSize: '11.5px', color: '#38BDF8', padding: '2px 7px', background: 'rgba(56, 189, 248, 0.12)', borderRadius: '4px' }}>
                          Selected: <strong style={{ fontWeight: 800 }}>{totalSelectedCount}</strong>
                        </span>
                        <span style={{ width: '1px', height: '12px', background: 'rgba(255, 255, 255, 0.15)' }}></span>
                        <span style={{ fontSize: '11.5px', color: '#94A3B8', padding: '2px 7px' }}>
                          Remaining: <strong style={{ color: '#F1F5F9', fontWeight: 700 }}>{notSelectedCount}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="ns-sb-center ns-hide-mobile" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flex: '1 1 auto',
                  minWidth: 0,
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  padding: '0 4px'
                }}>
                  {slots.filter(s => {
                    const validCount = (slotStudentMap[s.id] || []).filter(id => {
                      const st = allPoolStudents.find(sp => String(sp.id) === String(id));
                      return !st || !isStudentScheduledInDbOnDate(st);
                    }).length;
                    return validCount > 0;
                  }).map((s) => {
                    const validStudents = (slotStudentMap[s.id] || []).filter(id => {
                      const st = allPoolStudents.find(sp => String(sp.id) === String(id));
                      return !st || !isStudentScheduledInDbOnDate(st);
                    });
                    const count = validStudents.length;
                    const sCap = getSlotCapacity(s);
                    const isSlotOver = count > sCap;
                    const isSlotFull = count === sCap;
                    const isActive = s.id === (selectedSlotId || activeSlotsForDay[0]?.id || slots[0]?.id);

                    return (
                      <span
                        key={s.id}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          background: isSlotOver ? 'rgba(239, 68, 68, 0.2)' : (isActive ? 'rgba(13, 148, 136, 0.2)' : 'rgba(255, 255, 255, 0.06)'),
                          color: isSlotOver ? '#FCA5A5' : (isActive ? '#5EEAD4' : '#E2E8F0'),
                          border: isSlotOver ? '1px solid rgba(239, 68, 68, 0.5)' : (isActive ? '1px solid rgba(13, 148, 136, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)'),
                          padding: '4px 9px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ color: '#94A3B8' }}>{s.startTime || s.time}:</span>
                        <strong style={{ color: isSlotOver ? '#EF4444' : '#10B981', fontWeight: 800 }}>{count}/{sCap}</strong>
                        {isSlotOver && <span style={{ fontSize: '9px', background: '#EF4444', color: '#FFF', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>OVER</span>}
                        {isSlotFull && !isSlotOver && <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.3)', color: '#6EE7B7', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>FULL</span>}
                      </span>
                    );
                  })}
                </div>

                <div className="ns-sb-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="ns-sb-back-btn"
                    onClick={() => setCurrentStep(1)}
                    title="Back to Session Setup"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#E2E8F0',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  >
                    <span>← Back</span>
                  </button>
                  <button
                    type="button"
                    className="ns-sb-draft-btn"
                    onClick={handleManualSaveDraft}
                    title="Save current progress as draft"
                    style={{
                      background: draftSavedToast ? '#059669' : 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      border: draftSavedToast ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '8px',
                      padding: '7px 13px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => { if (!draftSavedToast) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
                    onMouseLeave={(e) => { if (!draftSavedToast) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                  >
                    <span>{draftSavedToast ? '✓ Draft Saved' : 'Save Draft'}</span>
                  </button>
                  <button
                    className="ns-primary-btn"
                    onClick={proceedToStep3}
                    style={{
                      background: '#00D2B4',
                      color: '#0F172A',
                      border: 'none',
                      padding: '7px 16px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(0, 210, 180, 0.35)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span className="ns-hide-mobile">Import &amp; Next »</span>
                    <span className="ns-show-mobile">Next →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* STEP 3: ASSIGN INSTRUCTORS (INSTRUCTOR GROUPS MATCHING)         */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="ns-step-content ns-step3-wrap">
            {/* Selected Session Info Banner - Compact */}
            <div className="ns-selected-banner" style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ns-banner-icon">📅</span>
                <span className="ns-banner-text">
                  Selected Session: <strong>{formattedSessionDate}</strong> | Active Filter: <strong>{slots.find(s => s.id === step3SlotFilter)?.startTime || slots.find(s => s.id === step3SlotFilter)?.time || 'Selected Slot'}</strong>
                </span>
              </div>
              {isSessionAlreadyPublishedOnDate && (
                <span style={{
                  background: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #10B981',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>✓</span> Session Published
                </span>
              )}
            </div>

            {/* Stat Summary Cards - Compact Slim Layout */}
            <div className="ns-step3-stats-grid">
              <div className="ns-stat-card">
                <h2 className="ns-sc-value">{importedStudents.length}</h2>
                <span className="ns-sc-label">Students Imported</span>
              </div>
              <div className="ns-stat-card">
                <h2 className="ns-sc-value">{activeInstructorsCount}</h2>
                <span className="ns-sc-label">
                  Active Instructors {onLeaveInstructorsCount > 0 && <span style={{ color: '#DC2626', fontWeight: 700 }}>({onLeaveInstructorsCount} on leave)</span>}
                </span>
              </div>
              <div className="ns-stat-card">
                <h2 className="ns-sc-value">{groupRatioStats.ratioDisplay}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span className="ns-sc-label" style={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                    {groupRatioStats.coachCount > 0
                      ? `${groupRatioStats.coachCount} Coach : ~${groupRatioStats.studentCount} ${groupRatioStats.studentCount === 1 ? 'Student' : 'Students'}`
                      : 'Students : Instructor Ratio'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, lineHeight: 1.2 }}>
                    {groupRatioStats.subtext}
                  </span>
                </div>
              </div>
            </div>

            {/* Slot Selection Row - Compact Filter Card */}
            <div className="ns-filters-card ns-step3-filters-card" style={{ marginBottom: '8px', padding: '10px 16px' }}>
              <div className="ns-filter-row ns-slot-filter-row">
                <span className="ns-filter-label" style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⏰</span> Select Time Slot:
                </span>
                <div className="ns-slot-pills-wrap">
                  {/* Individual Active Slots */}
                  {activeSlotsForDay.map((s, idx) => {
                    const isSelected = String(step3SlotFilter) === String(s.id);
                    const theme = getSlotThemeForSlot(s.id);
                    const count = getSlotTotalStudentCount(s);

                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`ns-slot-pill-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setStep3SlotFilter(s.id);
                          setSelectedSlotId(s.id);
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
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      Reset
                    </button>
                  )}
                </div>

                {/* Filter Toolbar: Day, Status, Level, Gender, Swimming */}
                <div className="ns-step3-filters-grid">
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
                        fontWeight: step3StatusFilter !== 'unassigned' ? 700 : 500,
                        color: step3StatusFilter !== 'unassigned' ? '#0284C7' : '#0F172A',
                        background: step3StatusFilter !== 'unassigned' ? '#F0F9FF' : '#F8FAFC',
                        border: `1.5px solid ${step3StatusFilter !== 'unassigned' ? '#0284C7' : '#CBD5E1'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="unassigned">
                        Unassigned ({slotImportedStudents.filter(s => !trainingGroups.some(g => (g.studentIds || []).some(id => String(id) === String(s.id)))).length})
                      </option>
                      <option value="all">All ({slotImportedStudents.length})</option>
                      <option value="assigned">
                        Assigned ({slotImportedStudents.filter(s => trainingGroups.some(g => (g.studentIds || []).some(id => String(id) === String(s.id)))).length})
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
                        Beginner ({slotImportedStudents.filter(s => normalizeLevelKey(s.level) === 'beginner').length})
                      </option>
                      {slotImportedStudents.some(s => normalizeLevelKey(s.level) === 'advance_beginner') && (
                        <option value="advance_beginner">
                          Adv. Beginner ({slotImportedStudents.filter(s => normalizeLevelKey(s.level) === 'advance_beginner').length})
                        </option>
                      )}
                      <option value="intermediate">
                        Inter. ({slotImportedStudents.filter(s => normalizeLevelKey(s.level) === 'intermediate').length})
                      </option>
                      {slotImportedStudents.some(s => normalizeLevelKey(s.level) === 'advance_intermediate') && (
                        <option value="advance_intermediate">
                          Adv. Inter. ({slotImportedStudents.filter(s => normalizeLevelKey(s.level) === 'advance_intermediate').length})
                        </option>
                      )}
                      <option value="advanced">
                        Adv. ({slotImportedStudents.filter(s => normalizeLevelKey(s.level) === 'advanced').length})
                      </option>
                      <option value="pro">
                        Pro ({slotImportedStudents.filter(s => normalizeLevelKey(s.level) === 'pro').length})
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
                      <span style={{ fontSize: '24px' }}>
                        {step3StatusFilter === 'unassigned' && slotImportedStudents.length > 0 && slotImportedStudents.every(s => trainingGroups.some(g => (g.studentIds || []).some(id => String(id) === String(s.id)))) ? '🎉' : '🔍'}
                      </span>
                      <span style={{ fontWeight: 600, color: '#475569' }}>
                        {step3StatusFilter === 'unassigned' && slotImportedStudents.length > 0 && slotImportedStudents.every(s => trainingGroups.some(g => (g.studentIds || []).some(id => String(id) === String(s.id))))
                          ? 'All students in this slot are assigned to training groups!'
                          : 'No students found matching current filters.'}
                      </span>
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
                      const accompanyingGuests = !student.isGuest
                        ? importedStudents.filter(s => s.isGuest && String(s.parentStudentId) === String(student.id))
                        : [];
                      const unassignedAccompanyingGuests = accompanyingGuests.filter(
                        g => !trainingGroups.some(grp => grp.studentIds.includes(g.id))
                      );

                      return (
                        <div
                          key={student.id}
                          className={`ns-ws-student-item ${isChecked ? 'active' : ''} ${student.isGuest ? 'ns-ws-guest-item' : ''}`}
                          style={student.isGuest ? {
                            marginLeft: '16px',
                            minWidth: 'calc(100% - 16px)',
                            width: 'max-content',
                            boxSizing: 'border-box',
                            background: isChecked ? '#E0F2FE' : '#F0F9FF',
                            borderTop: isChecked ? '1.5px solid #0284C7' : '1.5px solid #BAE6FD',
                            borderRight: isChecked ? '1.5px solid #0284C7' : '1.5px solid #BAE6FD',
                            borderBottom: isChecked ? '1.5px solid #0284C7' : '1.5px solid #BAE6FD',
                            borderLeft: '4px solid #0284C7'
                          } : {}}
                          draggable={true}
                          onDragStart={(e) => {
                            let ids = [student.id];
                            if (step3CheckedStudentIds.includes(student.id) && step3CheckedStudentIds.length > 0) {
                              ids = step3CheckedStudentIds;
                            } else if (!student.isGuest) {
                              // If dragging an unselected main student, automatically pull along their unassigned guests
                              const guestIds = filteredColumn1Students
                                .filter(s => s.isGuest && String(s.parentStudentId) === String(student.id))
                                .map(g => g.id);
                              ids = [student.id, ...guestIds];
                            }
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
                          title={`${student.name}${student.isGuest ? ` (Guest of ${student.parentStudentName})` : ''} • Drag into any Group Card, or click to select`}
                        >
                          <div className="ns-ws-student-left">
                            {student.isGuest && (
                              <span
                                className="ns-guest-arrow"
                                style={{
                                  fontSize: '13px',
                                  color: '#0284C7',
                                  fontWeight: 800,
                                  lineHeight: 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  flexShrink: 0
                                }}
                                title={`Accompanying Guest of ${student.parentStudentName}`}
                              >
                                ↳
                              </span>
                            )}
                            <span className="ns-drag-grip" title="Drag">⠿</span>
                            <div
                              className={`ns-checkbox-box ${isChecked ? 'checked' : ''}`}
                              style={student.isGuest ? {
                                borderColor: isChecked ? '#0284C7' : '#7DD3FC',
                                background: isChecked ? '#0284C7' : '#FFFFFF'
                              } : {}}
                            >
                              {isChecked && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              )}
                            </div>
                            <UserAvatar src={student.avatar} name={student.name} size={student.isGuest ? 26 : 30} className="ns-ws-avatar" />
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
                              {!student.isGuest && unassignedAccompanyingGuests.length > 0 && (
                                <span style={{
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  color: '#0F766E',
                                  background: '#F0FDFA',
                                  border: '1px solid #99F6E4',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }} title={`Main student with ${unassignedAccompanyingGuests.length} unassigned guest(s)`}>
                                  👥 +{unassignedAccompanyingGuests.length} Guests
                                </span>
                              )}
                              {!student.isGuest && accompanyingGuests.length > 0 && unassignedAccompanyingGuests.length === 0 && (
                                <span style={{
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  color: '#64748B',
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }} title="Accompanying guest(s) are already assigned to training groups">
                                  👥 Guest Assigned
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

                              {/* Kids Badge */}
                              {(() => {
                                let stAge = (student.age !== undefined && student.age !== null && student.age !== '') ? Number(student.age) : null;
                                if ((stAge === null || isNaN(stAge)) && student.dob) {
                                  try {
                                    const bd = new Date(student.dob);
                                    if (!isNaN(bd.getTime())) {
                                      const now = new Date();
                                      let a = now.getFullYear() - bd.getFullYear();
                                      const m = now.getMonth() - bd.getMonth();
                                      if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) a--;
                                      if (a >= 0) stAge = a;
                                    }
                                  } catch (e) { }
                                }
                                if (stAge !== null && !isNaN(stAge) && stAge > 0 && stAge < 16) {
                                  return (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        padding: '1.5px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 800,
                                        background: '#F5F3FF',
                                        color: '#7C3AED',
                                        border: '1px solid #DDD6FE',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0
                                      }}
                                      title={`Kids / Under 16 (${stAge} yrs)`}
                                    >
                                      🧒 Kids
                                    </span>
                                  );
                                }
                                return null;
                              })()}

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
                  <span className="ns-selected-count">
                    <strong>{step3CheckedStudentIds.length}</strong> Selected
                  </span>
                  <button
                    type="button"
                    className="ns-create-grp-btn"
                    onClick={handleCreateGroup}
                    title={step3CheckedStudentIds.length > 0 ? `Create group with ${step3CheckedStudentIds.length} selected student(s)` : "Create a new group card"}
                  >
                    <span>+ Add Group</span>
                    {step3CheckedStudentIds.length > 0 && (
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.25)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 800
                      }}>
                        {step3CheckedStudentIds.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Column 2: Assigned Training Groups (Dropzone for Students & Instructors) */}
              <div className="ns-ws-col ns-ws-col-groups">
                <div className="ns-col-head" style={{ gap: '8px', flexWrap: 'wrap' }}>
                  <h3 className="ns-col-title">Assigned Training Groups</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ns-col-badge">{displayedTrainingGroups.length} Groups</span>
                    {isSessionAlreadyPublishedOnDate && (
                      <span
                        className="ns-col-badge"
                        style={{
                          background: '#ECFDF5',
                          color: '#047857',
                          border: '1px solid #A7F3D0',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="This session has already been published to the schedule"
                      >
                        <span style={{ fontSize: '11px' }}>✓</span> Published
                      </span>
                    )}
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
                    <button
                      className="ns-add-grp-btn"
                      onClick={() => {
                        if (step3CheckedStudentIds.length === 0) {
                          scrollToCreateGroupSection(true);
                        } else {
                          handleCreateGroup();
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: step3CheckedStudentIds.length > 0 ? '#F0FDFA' : '#F1F5F9',
                        borderColor: step3CheckedStudentIds.length > 0 ? '#99F6E4' : '#E2E8F0',
                        color: step3CheckedStudentIds.length > 0 ? '#0F766E' : '#0F172A',
                        fontWeight: 700,
                        transition: 'all 0.15s ease'
                      }}
                      title={step3CheckedStudentIds.length > 0 ? `Create group with ${step3CheckedStudentIds.length} selected student(s)` : "Scroll to create next group"}
                    >
                      <span>+ Create Group Card</span>
                      {step3CheckedStudentIds.length > 0 && (
                        <span style={{
                          background: '#0D9488',
                          color: '#FFFFFF',
                          padding: '1px 7px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 800
                        }}>
                          {step3CheckedStudentIds.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {isIndividualCoach && (
                  <div style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '11.5px',
                    color: '#15803D',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>ℹ️</span>
                    <span>Individual Coach: <strong>{currentIndividualCoach?.name || currentUser?.name || 'Coach'}</strong> is automatically assigned to every group created.</span>
                  </div>
                )}

                <div className="ns-training-groups-list">
                  {displayedTrainingGroups.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '12px', border: '1.5px dashed #CBD5E1' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
                        {step3SlotFilter === 'ALL' ? 'No training groups created yet' : 'No training groups for this time slot yet'}
                      </p>
                      <p style={{ margin: '6px 0 16px 0', fontSize: '12px' }}>Click <strong>"+ Create Group Card"</strong> or check students on the left to start grouping.</p>
                      <button
                        className="ns-create-grp-btn"
                        onClick={handleCreateGroup}
                        style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        title={step3CheckedStudentIds.length > 0 ? `Create group with ${step3CheckedStudentIds.length} selected student(s)` : "Create a new group card"}
                      >
                        <span>+ Create Group Card</span>
                        {step3CheckedStudentIds.length > 0 && (
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.28)',
                            color: '#FFFFFF',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 800
                          }}>
                            {step3CheckedStudentIds.length}
                          </span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <>
                      {displayedTrainingGroups.map(grp => {
                        const assignedInstIds = grp.assignedInstructorIds || (grp.assignedInstructorId ? [grp.assignedInstructorId] : []);
                        const assignedInstructors = assignedInstIds
                          .map(id => allInstructors.find(i => String(i.id) === String(id)))
                          .filter(Boolean);
                        const effectiveGroupCoaches = assignedInstructors.length > 0
                          ? assignedInstructors
                          : (isIndividualCoach && currentIndividualCoach ? [currentIndividualCoach] : []);
                        const grpStudents = (grp.studentIds || [])
                          .map(id => resolveStudentFromPool(id))
                          .filter(Boolean)
                          .slice()
                          .sort((a, b) => {
                            const familyIdA = a.parentStudentId || a.id;
                            const familyIdB = b.parentStudentId || b.id;
                            if (String(familyIdA) !== String(familyIdB)) {
                              return (a.parentStudentName || a.name).localeCompare(b.parentStudentName || b.name);
                            }
                            const subA = a.isGuest ? (a.guestIndex || 1) : 0;
                            const subB = b.isGuest ? (b.guestIndex || 1) : 0;
                            return subA - subB;
                          });
                        const isDragOver = dragOverGroupId === grp.id;

                        const grpSlot = slots.find(s => String(s.id) === String(grp.slotId)) || slots[0];
                        const grpTheme = getSlotThemeForSlot(grp.slotId || grpSlot?.id);

                        return (
                          <div
                            key={grp.id}
                            id={`ns-grp-card-${grp.id}`}
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
                            style={{ position: 'relative' }}
                          >
                            {/* Card Edge Close/Delete Button */}
                            <button
                              type="button"
                              className="ns-gc-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteGroup(grp.id);
                              }}
                              style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                border: '1px solid #E2E8F0',
                                background: '#FFFFFF',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 700,
                                lineHeight: 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                zIndex: 5
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#EF4444';
                                e.currentTarget.style.borderColor = '#FECACA';
                                e.currentTarget.style.background = '#FEF2F2';
                                e.currentTarget.style.transform = 'scale(1.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#94A3B8';
                                e.currentTarget.style.borderColor = '#E2E8F0';
                                e.currentTarget.style.background = '#FFFFFF';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Delete group"
                              aria-label="Delete group"
                            >
                              ✕
                            </button>

                            <div className="ns-gc-title-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '36px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h4 className="ns-gc-title" style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px', margin: 0 }}>
                                  {grp.name}
                                </h4>
                                <select
                                  value={String(grp.slotId || selectedSlotId || slots[0]?.id)}
                                  onChange={(e) => {
                                    handleMoveGroupToSlot(grp.id, e.target.value);
                                  }}
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: '1.5px solid #0D9488',
                                    background: '#F0FDFA',
                                    color: '#0F766E',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    boxShadow: '0 1px 2px rgba(13,148,136,0.06)'
                                  }}
                                  title="Change group time slot"
                                >
                                  {(() => {
                                    const activeSlotsList = activeSlotsForDay.length > 0
                                      ? activeSlotsForDay
                                      : slots.filter(s => s.active !== false);
                                    // Fallback: If current group slot is somehow outside activeSlotsList, include it
                                    const currentSlot = slots.find(s => String(s.id) === String(grp.slotId));
                                    const slotsToRender = (currentSlot && !activeSlotsList.some(s => String(s.id) === String(currentSlot.id)))
                                      ? [currentSlot, ...activeSlotsList]
                                      : activeSlotsList;

                                    return slotsToRender.map((s, idx) => (
                                      <option key={s.id} value={s.id}>
                                        ⏰ {s.startTime || s.time || `Slot ${idx + 1}`}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2.5px 8px',
                                    borderRadius: '6px',
                                    background: effectiveGroupCoaches.length > 0 ? '#EFF6FF' : '#FEF2F2',
                                    color: effectiveGroupCoaches.length > 0 ? '#1D4ED8' : '#DC2626',
                                    border: effectiveGroupCoaches.length > 0 ? '1.5px solid #BFDBFE' : '1.5px solid #FECACA',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    lineHeight: 1.3
                                  }}
                                  title="Group Coach to Student Ratio"
                                >
                                  {effectiveGroupCoaches.length > 0
                                    ? `🏄‍♂️ ${effectiveGroupCoaches.length} Coach : ${grpStudents.length} ${grpStudents.length === 1 ? 'Student' : 'Students'}`
                                    : `⚠️ 0 Coach : ${grpStudents.length} ${grpStudents.length === 1 ? 'Student' : 'Students'}`}
                                </span>
                                {(grp.isExistingDbGroup || (grp.existingSessionIds && grp.existingSessionIds.length > 0) || isSessionAlreadyPublishedOnDate) && (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      padding: '2.5px 7px',
                                      borderRadius: '6px',
                                      background: '#ECFDF5',
                                      color: '#047857',
                                      border: '1.5px solid #A7F3D0',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      lineHeight: 1.3
                                    }}
                                    title="This group is already published in the database schedule"
                                  >
                                    <span>✓</span> Published
                                  </span>
                                )}
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

                                        {/* Gender Badge */}
                                        {(() => {
                                          const isFemale = (s.gender || '').toLowerCase() === 'female';
                                          return (
                                            <span style={{
                                              fontSize: '9.5px',
                                              fontWeight: 700,
                                              color: isFemale ? '#BE185D' : '#0369A1',
                                              background: isFemale ? '#FDF2F8' : '#F0F9FF',
                                              border: `1px solid ${isFemale ? '#FBCFE8' : '#BAE6FD'}`,
                                              padding: '1px 5px',
                                              borderRadius: '4px',
                                              flexShrink: 0,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '2px'
                                            }} title={`Gender: ${s.gender || 'Male'}`}>
                                              {isFemale ? '♀ Female' : '♂ Male'}
                                            </span>
                                          );
                                        })()}

                                        {/* Kids Badge (Kids-only, no Adult badge) */}
                                        {(() => {
                                          let stAge = (s.age !== undefined && s.age !== null && s.age !== '') ? Number(s.age) : null;
                                          if ((stAge === null || isNaN(stAge)) && s.dob) {
                                            try {
                                              const bd = new Date(s.dob);
                                              if (!isNaN(bd.getTime())) {
                                                const now = new Date();
                                                let a = now.getFullYear() - bd.getFullYear();
                                                const m = now.getMonth() - bd.getMonth();
                                                if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) a--;
                                                if (a >= 0) stAge = a;
                                              }
                                            } catch (e) { }
                                          }
                                          const isKid = (stAge !== null && !isNaN(stAge) && stAge > 0 && stAge < 16) ||
                                            (s.division && /kid|child|junior/i.test(s.division)) ||
                                            (s.category && /kid|child|junior/i.test(s.category));

                                          if (!isKid) return null;

                                          return (
                                            <span style={{
                                              fontSize: '9.5px',
                                              fontWeight: 800,
                                              color: '#7C3AED',
                                              background: '#F5F3FF',
                                              border: '1px solid #DDD6FE',
                                              padding: '1px 5px',
                                              borderRadius: '4px',
                                              flexShrink: 0,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '2px'
                                            }} title={`Kid / Under 16${stAge ? ` (${stAge} yrs)` : ''}`}>
                                              🧒 Kids
                                            </span>
                                          );
                                        })()}

                                        {/* Which Day Badge */}
                                        <span style={{
                                          fontSize: '9.5px',
                                          fontWeight: 700,
                                          color: '#047857',
                                          background: '#ECFDF5',
                                          border: '1px solid #A7F3D0',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          flexShrink: 0,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px'
                                        }} title={`Day ${s.whichDay || 1}${s.totalDays ? ` of ${s.totalDays} Days` : ''}`}>
                                          Day {s.whichDay || 1}{s.totalDays ? `/${s.totalDays}` : ''}
                                        </span>

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

                            {/* Assigned Coaches (Single auto-assigned for Individual Coach, multi-coach for schools) */}
                            <div className="ns-assigned-instructors-section" style={{ marginTop: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                  Assigned Coach {isIndividualCoach ? '(Auto-Assigned)' : (assignedInstructors.length > 0 ? `(${assignedInstructors.length})` : '')}
                                </span>
                              </div>

                              {(() => {
                                const displayCoaches = assignedInstructors.length > 0
                                  ? assignedInstructors
                                  : (isIndividualCoach && currentIndividualCoach ? [currentIndividualCoach] : []);

                                if (displayCoaches.length > 0) {
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {displayCoaches.map(coach => {
                                        const coachLeave = getInstructorLeaveOnDate(coach, selectedSessionDateYYYYMMDD);
                                        const isCoachOnLeave = Boolean(coachLeave);
                                        return (
                                          <div
                                            key={coach.id}
                                            className={`ns-assigned-inst-box ${isCoachOnLeave ? 'ns-coach-on-leave-box' : ''}`}
                                            style={{
                                              padding: '7px 10px',
                                              background: isCoachOnLeave ? '#FEF2F2' : '#F0FDF4',
                                              border: isCoachOnLeave ? '1.5px solid #F87171' : '1.5px solid #86EFAC',
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
                                              {isCoachOnLeave ? (
                                                <span style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                  <span>⚠️</span> On Leave on this date ({coachLeave?.leave_type || 'Leave'})
                                                </span>
                                              ) : (
                                                <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>
                                                  ✓ Assigned Coach {isIndividualCoach ? '• Individual Account' : `(${coach.role || 'Instructor'})`}
                                                </span>
                                              )}
                                            </div>
                                            {!isIndividualCoach && (
                                              <button
                                                type="button"
                                                className="ns-ai-remove"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeInstructorFromGroup(grp.id, coach.id);
                                                }}
                                                title={`Remove ${coach.name}`}
                                                style={{ fontSize: '16px', color: isCoachOnLeave ? '#DC2626' : '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 6px', lineHeight: 1 }}
                                              >
                                                &times;
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}

                                      {/* Add Another Coach Dropzone: ONLY for School accounts */}
                                      {!isIndividualCoach && (
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
                                      )}
                                    </div>
                                  );
                                }

                                // When NO coach is assigned yet to this group:
                                // Check if students in this group had previous / Day 1 coach(es)
                                const previousCoaches = getPreviousCoachesForGroup(grpStudents);

                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {previousCoaches.length > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {previousCoaches.map(({ coach, count, studentNames }) => {
                                          const coachLeave = getInstructorLeaveOnDate(coach, selectedSessionDateYYYYMMDD);
                                          const isCoachOnLeave = Boolean(coachLeave);
                                          const conflict = getCoachSlotConflict(grp.id, coach.id);

                                          return (
                                            <div
                                              key={`prev-coach-${grp.id}-${coach.id}`}
                                              style={{
                                                padding: '7px 10px',
                                                background: '#F8FAFC',
                                                border: '1.5px dashed #94A3B8',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                opacity: 0.55,
                                                cursor: isCoachOnLeave ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.18s ease',
                                                userSelect: 'none'
                                              }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isCoachOnLeave) {
                                                  assignInstructorToGroup(grp.id, coach.id);
                                                }
                                              }}
                                              title={
                                                isCoachOnLeave
                                                  ? `${coach.name} is on leave on this date`
                                                  : conflict
                                                    ? `${coach.name} is already coaching ${conflict.conflictingGroup.name} at ${conflict.time}`
                                                    : `Click to assign ${coach.name} (Previous Day Coach for ${count} of ${grpStudents.length} students: ${studentNames.join(', ')})`
                                              }
                                              onMouseEnter={(e) => {
                                                if (!isCoachOnLeave) {
                                                  e.currentTarget.style.opacity = '0.95';
                                                  e.currentTarget.style.borderColor = '#0D9488';
                                                  e.currentTarget.style.background = '#F0FDFA';
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.opacity = '0.55';
                                                e.currentTarget.style.borderColor = '#94A3B8';
                                                e.currentTarget.style.background = '#F8FAFC';
                                              }}
                                            >
                                              <UserAvatar src={coach.avatar} name={coach.name} size={26} />
                                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {coach.name}
                                                  </span>
                                                  <span style={{
                                                    fontSize: '9.5px',
                                                    background: '#F1F5F9',
                                                    color: '#475569',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    fontWeight: 700,
                                                    border: '1px solid #CBD5E1',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                  }}>
                                                    🕒 Previous Coach ({count} student{count > 1 ? 's' : ''})
                                                  </span>
                                                </div>
                                                {isCoachOnLeave ? (
                                                  <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: 600 }}>
                                                    ⚠️ On Leave on this date ({coachLeave?.leave_type || 'Leave'})
                                                  </span>
                                                ) : conflict ? (
                                                  <span style={{ fontSize: '10px', color: '#EA580C', fontWeight: 600 }}>
                                                    ⚠️ Busy at this time ({conflict.conflictingGroup.name})
                                                  </span>
                                                ) : (
                                                  <span style={{ fontSize: '10px', color: '#0F766E', fontWeight: 600 }}>
                                                    💡 Click to assign this coach
                                                  </span>
                                                )}
                                              </div>

                                              <button
                                                type="button"
                                                style={{
                                                  fontSize: '11px',
                                                  fontWeight: 700,
                                                  padding: '3px 8px',
                                                  borderRadius: '5px',
                                                  border: '1px solid #99F6E4',
                                                  background: '#F0FDFA',
                                                  color: '#0F766E',
                                                  cursor: isCoachOnLeave ? 'not-allowed' : 'pointer',
                                                  flexShrink: 0
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!isCoachOnLeave) {
                                                    assignInstructorToGroup(grp.id, coach.id);
                                                  }
                                                }}
                                              >
                                                + Assign
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

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
                                        padding: '9px 10px',
                                        textAlign: 'center',
                                        background: '#F8FAFC',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        color: '#64748B'
                                      }}
                                    >
                                      <span>🏄‍♂️ <strong>Assign Coach</strong> (Drag or click instructor)</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}

                      {/* Dynamic Card to Create Second / Next Group Card - matches first group creation style */}
                      {(() => {
                        const nextIndex = displayedTrainingGroups.length + 1;
                        const ordinalWords = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
                        const nextOrdinal = ordinalWords[nextIndex - 1] || `${nextIndex}th`;

                        // Calculate next letter for active slot
                        const activeSlotId = step3SlotFilter !== 'ALL' ? step3SlotFilter : (selectedSlotId || slots[0]?.id);
                        const currentSlotGroups = trainingGroups.filter(g => String(g.slotId || slots[0]?.id) === String(activeSlotId));
                        const usedLetters = new Set();
                        currentSlotGroups.forEach(g => {
                          const m = (g.name || '').match(/Group\s+([A-Za-z])/i);
                          if (m) usedLetters.add(m[1].toUpperCase());
                        });
                        let code = 65;
                        while (usedLetters.has(String.fromCharCode(code))) {
                          code++;
                        }
                        const nextLetter = String.fromCharCode(code);

                        return (
                          <div
                            id="ns-create-next-group-card"
                            className="ns-create-next-group-card"
                            style={{
                              padding: '24px 20px',
                              textAlign: 'center',
                              color: '#64748B',
                              background: '#FFFFFF',
                              borderRadius: '12px',
                              border: '1.5px dashed #CBD5E1',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              marginTop: '4px',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>
                              Want to create another training group?
                            </p>
                            <p style={{ margin: '2px 0 10px 0', fontSize: '12px', color: '#64748B' }}>
                              Click below to add <strong>Group {nextLetter}</strong> for this session.
                            </p>
                            <button
                              type="button"
                              className="ns-create-grp-btn"
                              onClick={handleCreateGroup}
                              style={{
                                margin: '0 auto',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 18px',
                                fontSize: '13px',
                                fontWeight: 700
                              }}
                              title={step3CheckedStudentIds.length > 0 ? `Create Group ${nextLetter} with ${step3CheckedStudentIds.length} selected student(s)` : `Create Group ${nextLetter}`}
                            >
                              <span>+ Create {nextOrdinal} Group (Group {nextLetter})</span>
                              {step3CheckedStudentIds.length > 0 && (
                                <span style={{
                                  background: 'rgba(255, 255, 255, 0.28)',
                                  color: '#FFFFFF',
                                  padding: '1px 7px',
                                  borderRadius: '10px',
                                  fontSize: '11px',
                                  fontWeight: 800
                                }}>
                                  {step3CheckedStudentIds.length}
                                </span>
                              )}
                            </button>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* Column 3: Available Instructors (Draggable for School Admins, Locked Auto-Assigned for Individual Coaches) */}
              {isIndividualCoach ? (
                <div className="ns-ws-col ns-ws-col-instructors">
                  <div className="ns-col-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 className="ns-col-title">Assigned Coach</h3>
                      <span className="ns-col-badge" style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 700 }}>
                        Individual Coach
                      </span>
                    </div>
                  </div>

                  <div style={{
                    background: '#F0FDF4',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '14px',
                    padding: '18px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <UserAvatar
                        src={currentIndividualCoach?.avatar}
                        name={currentIndividualCoach?.name || currentUser?.name || 'Coach'}
                        size={48}
                        style={{ border: '2.5px solid #86EFAC' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          {currentIndividualCoach?.name || currentUser?.name || 'Coach'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>
                          ✓ Head Coach • Individual Account
                        </span>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '12.5px',
                      color: '#166534',
                      lineHeight: 1.5,
                      background: '#FFFFFF',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid #DCFCE7',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontWeight: 800, color: '#15803D', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🔒</span> Auto-Assigned to All Groups
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                        In an Individual Coach account, you are automatically assigned as the instructor for each group once created. Manual drag &amp; drop is not needed.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ns-ws-col ns-ws-col-instructors">
                  <div className="ns-col-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 className="ns-col-title">Available Instructors</h3>
                      <span className="ns-col-badge">
                        {filteredInstructors.length} Staff {onLeaveInstructorsCount > 0 ? `(${onLeaveInstructorsCount} On Leave)` : ''}
                      </span>
                    </div>
                    {(step3CoachGenderFilter !== 'all' || Boolean(instructorSearch)) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStep3CoachGenderFilter('all');
                          setInstructorSearch('');
                        }}
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

                  {/* Search Instructors */}
                  <div className="ns-ws-search">
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Search instructors..."
                      value={instructorSearch}
                      onChange={(e) => setInstructorSearch(e.target.value)}
                    />
                    {instructorSearch && (
                      <button
                        type="button"
                        onClick={() => setInstructorSearch('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
                    <span>🖐️</span> Drag instructor card into any Group Card in the center.
                  </div>

                  <div className="ns-instructors-list">
                    {filteredInstructors.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        {instructorSearch.trim()
                          ? `No instructors found matching "${instructorSearch}".`
                          : step3CoachGenderFilter !== 'all'
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

                        const leaveOnDate = getInstructorLeaveOnDate(inst, selectedSessionDateYYYYMMDD);
                        const isOnLeave = Boolean(leaveOnDate) || inst.status === 'On Leave';

                        const activeConflict = currentActiveGroup
                          ? getCoachSlotConflict(currentActiveGroup.id, inst.id)
                          : getCoachSlotConflict(null, inst.id, currentSlotId);

                        const badgeText = isOnLeave
                          ? '🏖️ On Leave'
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
                            style={isOnLeave ? {
                              background: '#FFF5F5',
                              borderColor: '#FECACA',
                              cursor: 'not-allowed',
                              opacity: 0.85
                            } : {}}
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
                                  message: `${inst.name} is on approved leave on ${formattedSessionDate}${leaveOnDate?.leave_type ? ` (${leaveOnDate.leave_type})` : ''}. Cannot assign to sessions on this date.`,
                                  type: 'warning',
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
                                setTrainingGroups(prev => reindexGroups([...prev, newGroup]));
                                setActiveDropGroupId(newGroup.id);
                              }
                            }}
                            title={isOnLeave ? `On Leave on ${formattedSessionDate}${leaveOnDate?.leave_type ? ` (${leaveOnDate.leave_type})` : ''}` : activeConflict ? `Already coaching ${activeConflict.conflictingGroup.name} at ${activeConflict.time}` : 'Drag into a group or click to assign'}
                          >
                            <span className="ns-drag-grip" style={{ color: isOnLeave ? '#CBD5E1' : '#0D9488', fontSize: '13px' }}>⠿</span>
                            <UserAvatar src={inst.avatar} name={inst.name} size={36} className="ns-inst-avatar" />
                            <div className="ns-inst-info">
                              <h4 className="ns-inst-name">{inst.name}</h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span className="ns-inst-role">
                                  {inst.role || 'Instructor'}
                                </span>
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
                              style={isOnLeave ? {
                                background: '#FEE2E2',
                                color: '#B91C1C',
                                border: '1px solid #FECACA',
                                fontWeight: 700
                              } : (activeConflict ? {
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                fontWeight: 700
                              } : {})}
                            >
                              {badgeText}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Finalize Action Bottom Bar (Sticky Bar format like Step 1 & Step 2) */}
            <div className="ns-sticky-bar-wrapper">
              <div className="ns-sticky-bar">
                <div className="ns-sb-left">
                  <span
                    className="ns-sb-target-label"
                    style={{
                      background: '#10B981',
                      color: '#FFF',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 800
                    }}
                  >
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
                    type="button"
                    className="ns-sb-draft-btn"
                    onClick={handleManualSaveDraft}
                    title="Save current progress as draft"
                    style={{
                      background: draftSavedToast ? '#059669' : 'rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      border: draftSavedToast ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => { if (!draftSavedToast) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
                    onMouseLeave={(e) => { if (!draftSavedToast) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
                  >
                    <span>{draftSavedToast ? '✓ Draft Saved' : 'Save Draft'}</span>
                  </button>
                  <button
                    className="ns-primary-btn finalize-btn"
                    onClick={handleFinalizeAndPublish}
                    disabled={isPublishing}
                    style={{
                      background: isSessionAlreadyPublishedOnDate
                        ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                        : 'linear-gradient(135deg, #00D494 0%, #00B37E 100%)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '14px',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: isSessionAlreadyPublishedOnDate
                        ? '0 4px 14px rgba(5, 150, 105, 0.4)'
                        : '0 4px 14px rgba(0, 212, 148, 0.4)',
                      cursor: isPublishing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isPublishing
                      ? (isSessionAlreadyPublishedOnDate ? 'Updating Session...' : 'Publishing Sessions...')
                      : (isSessionAlreadyPublishedOnDate ? '✓ Update Published Session' : 'Finalize & Publish')}
                  </button>
                </div>
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
                  {editingSlotModal.time && !modalTimeIsDuplicate && (
                    <span style={{ color: '#0D9488', fontSize: '11.5px', fontWeight: 700, display: 'block', marginTop: '5px' }}>
                      ⏰ Calculated Slot: {formatSlotRange(editingSlotModal.time, editingSlotModal.duration || 90)} ({editingSlotModal.duration || 90} min)
                    </span>
                  )}
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
                        step="1"
                        placeholder="Enter duration in minutes"
                        value={editingSlotModal.duration ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;

                          setEditingSlotModal(prev => ({
                            ...prev,
                            duration: value === '' ? '' : Number(value)
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                {editingSlotModal.mode === 'edit' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idToDelete = editingSlotModal.id;
                      setEditingSlotModal(null);
                      handleDeleteSlot(idToDelete);
                    }}
                    style={{
                      background: '#FEF2F2',
                      border: '1.5px solid #FECACA',
                      color: '#DC2626',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    🗑️ Delete Slot
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: '10px' }}>
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

        {/* Software-Native Confirmation Modal (Replaces browser default window.confirm) */}
        {confirmModal.isOpen && (
          <div
            className="ns-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1500,
              padding: '16px',
              animation: 'nsFadeIn 0.15s ease-out'
            }}
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          >
            <div
              className="ns-modal-card"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '32px 28px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 25px 60px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)',
                textAlign: 'center',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon Container */}
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  backgroundColor: confirmModal.isDanger ? '#FEE2E2' : confirmModal.iconType === 'reset' ? '#E0F2FE' : '#FEF3C7',
                  color: confirmModal.isDanger ? '#DC2626' : confirmModal.iconType === 'reset' ? '#0284C7' : '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  border: `2px solid ${confirmModal.isDanger ? '#FECACA' : confirmModal.iconType === 'reset' ? '#BAE6FD' : '#FDE68A'}`,
                  boxShadow: `0 4px 14px ${confirmModal.isDanger ? 'rgba(220, 38, 38, 0.15)' : 'rgba(2, 132, 199, 0.15)'}`
                }}
              >
                {confirmModal.isDanger ? (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                ) : confirmModal.iconType === 'reset' ? (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </div>

              {/* Title & Message */}
              <h3
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.3px'
                }}
              >
                {confirmModal.title}
              </h3>

              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.55',
                  color: '#64748B',
                  margin: '0 0 26px 0',
                  whiteSpace: 'pre-line'
                }}
              >
                {confirmModal.message}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    flex: 1,
                    padding: '11px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#94A3B8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#CBD5E1';
                  }}
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                  }}
                  style={{
                    flex: 1,
                    padding: '11px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: confirmModal.isDanger ? '#DC2626' : '#0D9488',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: confirmModal.isDanger
                      ? '0 4px 14px rgba(220, 38, 38, 0.35)'
                      : '0 4px 14px rgba(13, 148, 136, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = confirmModal.isDanger ? '#B91C1C' : '#0F766E';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = confirmModal.isDanger ? '#DC2626' : '#0D9488';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {confirmModal.confirmText || 'Confirm'}
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
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          background-color: #F8FAFC;
          font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0F172A;
          box-sizing: border-box;
        }

        .ns-container, .ns-modal-container {
          font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0F172A;
        }

        .ns-container {
          flex: 1;
          margin-top: 72px;
          min-height: calc(100vh - 72px);
          height: auto;
          padding: 24px 32px 120px 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: visible;
          overflow-x: hidden;
          max-width: 1400px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
          -webkit-overflow-scrolling: touch;
        }

        .ns-step-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          width: 100%;
        }

        .ns-modal-body-scroll {
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
          -webkit-overflow-scrolling: touch;
          overflow-anchor: none;
        }

        .ns-student-grid {
          overflow-anchor: none;
        }

        /* ─── Top Header & Stepper ─── */
        .ns-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          gap: 16px;
        }

        .ns-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          justify-content: flex-start;
          min-width: 0;
        }

        .ns-header-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
          justify-content: flex-end;
          flex: 1;
          gap: 16px;
        }
        .ns-header-close-wrap {
          display: flex;
          align-items: center;
          margin-left: 2px;
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
          position: relative;
          height: 38px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          color: #1E293B;
          transition: all 0.15s ease;
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
        .ns-cal-day-cell.has-custom-schedule:not(.selected) {
          font-weight: 700;
          color: #B45309;
        }
        .ns-cal-custom-dot {
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #D97706;
          box-shadow: 0 0 3px rgba(217, 119, 6, 0.7);
          pointer-events: none;
        }
        .ns-cal-day-cell.selected .ns-cal-custom-dot {
          bottom: 4px;
          background-color: #FEF08A;
          box-shadow: 0 0 4px #FEF08A;
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
        .ns-slot-right-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .ns-slot-time-wrap:hover .ns-slot-time {
          color: #0284C7;
        }
        .ns-slot-edit-btn {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #F0F9FF;
          border: 1.5px solid #BAE6FD;
          border-radius: 9px;
          color: #0284C7;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
          padding: 0;
        }
        .ns-slot-edit-btn:hover {
          background: #E0F2FE;
          border-color: #38BDF8;
          color: #0369A1;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.15);
        }
        .ns-slot-edit-btn:active {
          transform: translateY(0);
        }
        .ns-slot-delete-btn {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #FEF2F2;
          border: 1.5px solid #FECACA;
          border-radius: 9px;
          color: #DC2626;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
          padding: 0;
        }
        .ns-slot-delete-btn:hover {
          background: #FEE2E2;
          border-color: #F87171;
          color: #B91C1C;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(220, 38, 38, 0.15);
        }
        .ns-slot-delete-btn:active {
          transform: translateY(0);
        }
        @media (max-width: 640px) {
          .ns-slot-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .ns-slot-right-actions {
            width: 100%;
            justify-content: space-between;
          }
          .ns-slot-capacity-control {
            flex: 1;
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
        .ns-slot-pill.clickable-toggle {
          cursor: pointer;
          user-select: none;
          transition: all 0.15s ease;
        }
        .ns-slot-pill.clickable-toggle:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          filter: brightness(0.95);
        }
        .ns-slot-pill.clickable-toggle:active {
          transform: translateY(0);
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

        .ns-refresh-btn {
          background: #FFFFFF;
          color: #0284C7;
          border: 1px solid #BAE6FD;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 3px rgba(2, 132, 199, 0.08);
          letter-spacing: 0.2px;
        }
        .ns-refresh-btn:hover:not(:disabled) {
          background: #F0F9FF;
          border-color: #0284C7;
          color: #0369A1;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(2, 132, 199, 0.18);
        }
        .ns-refresh-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .ns-refresh-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        @keyframes ns-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ns-spinning {
          animation: ns-spin 0.8s linear infinite;
          display: inline-block;
          transform-origin: center;
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

        /* Sticky Bar Centered Floating Wrapper */
        .ns-sticky-bar-wrapper {
          position: sticky;
          bottom: 14px;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 99;
          margin-top: auto;
          padding-top: 16px;
          pointer-events: none;
        }

        /* Bottom Sticky Bar */
        .ns-sticky-bar {
          pointer-events: auto;
          position: relative;
          width: 100%;
          max-width: 1260px;
          box-sizing: border-box;
          background-color: #0A0F1D;
          color: #FFFFFF;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          z-index: 50;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          margin: 0 auto;
        }

        .ns-modal-container .ns-sticky-bar {
          pointer-events: auto;
          position: relative;
          width: 100%;
          max-width: 1260px;
          box-sizing: border-box;
          border-radius: 12px;
          margin: 0 auto;
          padding: 8px 16px;
          gap: 10px;
          background-color: #0A0F1D;
          z-index: 50;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08);
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
          gap: 12px;
          flex: 1;
          width: 100%;
        }

        .ns-step3-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (max-width: 900px) {
          .ns-step3-stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .ns-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ns-sc-value {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          line-height: 1;
        }
        .ns-sc-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
        }

        .ns-step3-filters-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 16px !important;
        }

        /* 3-Column Workspace */
        .ns-step3-workspace {
          display: grid;
          grid-template-columns: minmax(320px, 1fr) minmax(360px, 1.2fr) minmax(300px, 1fr);
          gap: 16px;
          align-items: start;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 12px;
        }
        .ns-step3-workspace::-webkit-scrollbar {
          height: 6px;
        }
        .ns-step3-workspace::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 4px;
        }
        .ns-step3-workspace::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .ns-step3-filters-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          width: 100%;
          box-sizing: border-box;
        }
        .ns-ws-col {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 600px;
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
          min-height: 480px;
          max-height: calc(88vh - 220px);
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-right: 4px;
          padding-bottom: 8px;
        }
        .ns-ws-student-list::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .ns-ws-student-list::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 4px;
        }
        .ns-ws-student-list::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .ns-ws-student-list::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
        .ns-ws-student-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 10px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          user-select: none;
          width: max-content;
          min-width: 100%;
          box-sizing: border-box;
          position: relative;
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
        .ns-ws-student-item.ns-ws-guest-item {
          margin-left: 16px;
          width: max-content;
          min-width: calc(100% - 16px);
          box-sizing: border-box;
          background-color: #F0F9FF;
          border-color: #BAE6FD;
          border-left: 4px solid #0284C7;
        }
        .ns-ws-student-item.ns-ws-guest-item:hover {
          background-color: #E0F2FE;
          border-color: #7DD3FC;
          border-left-color: #0284C7;
        }
        .ns-ws-student-item.ns-ws-guest-item.active {
          background-color: #E0F2FE;
          border-color: #0284C7;
          border-left: 4px solid #0284C7;
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
          min-width: max-content;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ns-ws-student-top {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: max-content;
          white-space: nowrap;
        }
        .ns-ws-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #0F172A;
          white-space: nowrap;
          flex-shrink: 0;
          min-width: max-content;
        }
        .ns-ws-student-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: max-content;
          white-space: nowrap;
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
          background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
        }
        .ns-create-grp-btn:hover {
          background: linear-gradient(135deg, #0F766E 0%, #115E59 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(13, 148, 136, 0.35);
        }
        .ns-create-grp-btn:active {
          transform: translateY(0);
        }
        .ns-create-next-group-card.highlight-pulse {
          border-color: #0D9488 !important;
          background: #F0FDFA !important;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.25) !important;
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
          min-height: 520px;
          max-height: calc(88vh - 200px);
          overflow-y: auto;
          scroll-behavior: smooth;
          padding-bottom: 300px;
        }

        @keyframes pulseBorder {
          0% { border-color: #0D9488; box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.4); transform: scale(1); }
          50% { border-color: #0D9488; box-shadow: 0 0 0 8px rgba(13, 148, 136, 0.15); transform: scale(1.015); }
          100% { border-color: #CBD5E1; box-shadow: none; transform: scale(1); }
        }
        .highlight-pulse {
          animation: pulseBorder 1.2s ease-in-out;
        }
        .ns-training-groups-list::-webkit-scrollbar {
          width: 7px;
        }
        .ns-training-groups-list::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 4px;
        }
        .ns-training-groups-list::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .ns-training-groups-list::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
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
          position: relative;
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
        .ns-gc-delete-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #94A3B8;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          z-index: 5;
        }
        .ns-gc-delete-btn:hover {
          color: #EF4444;
          border-color: #FECACA;
          background: #FEF2F2;
          transform: scale(1.08);
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
          flex-direction: column;
          gap: 8px;
          padding-right: 36px;
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
          min-height: 480px;
          max-height: calc(88vh - 220px);
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
          padding: 36px 32px 32px;
          max-width: 480px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8);
          box-sizing: border-box;
        }
        .ns-modal-icon {
          font-size: 48px;
          margin-bottom: 12px;
          line-height: 1;
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
          line-height: 1.55;
          margin: 0 0 26px 0;
        }
        .ns-modal-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
        }
        .ns-modal-actions .ns-secondary-btn,
        .ns-modal-actions .ns-primary-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          text-align: center;
          box-sizing: border-box;
          transition: all 0.15s ease;
        }
        .ns-modal-actions .ns-secondary-btn {
          background: #FFFFFF;
          color: #334155;
          border: 1.5px solid #CBD5E1;
        }
        .ns-modal-actions .ns-secondary-btn:hover {
          background: #F8FAFC;
          border-color: #94A3B8;
          color: #0F172A;
        }
        .ns-modal-actions .ns-primary-btn {
          background-color: #00D1B2;
          color: #FFFFFF;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 209, 178, 0.35);
        }
        .ns-modal-actions .ns-primary-btn:hover {
          background-color: #00B89C;
          box-shadow: 0 6px 16px rgba(0, 209, 178, 0.45);
        }
        @media (max-width: 480px) {
          .ns-modal-card {
            padding: 28px 20px 24px;
          }
          .ns-modal-actions {
            flex-direction: column-reverse;
            gap: 10px;
          }
          .ns-modal-actions .ns-secondary-btn,
          .ns-modal-actions .ns-primary-btn {
            width: 100%;
            flex: none;
          }
        }

        /* ═════════════════════════════════════════════════════════════════ */
        /* RESPONSIVE & MOBILE STYLES (CHINNA SIMPLE MOBILE UI)             */
        /* ═════════════════════════════════════════════════════════════════ */
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
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 10px 12px !important;
            gap: 8px !important;
          }
          .ns-header-left {
            gap: 6px !important;
            min-width: 0 !important;
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
          }
          .ns-header-center {
            order: 2 !important;
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
          .ns-header-right {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            order: 1 !important;
            flex: 0 0 auto !important;
          }
          .ns-header-close-wrap {
            display: flex !important;
            align-items: center !important;
          }
          .ns-stepper {
            width: 100% !important;
            justify-content: center !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            gap: 6px !important;
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
          .ns-ws-student-item.ns-ws-guest-item {
            margin-left: 12px !important;
            width: calc(100% - 12px) !important;
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
          .ns-sticky-bar-wrapper {
            position: sticky !important;
            bottom: 8px !important;
            left: 0 !important;
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 99 !important;
            margin-top: auto !important;
            pointer-events: none !important;
          }
          .ns-sticky-bar,
          .ns-modal-container .ns-sticky-bar {
            position: relative !important;
            bottom: auto !important;
            left: auto !important;
            right: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            padding: 8px 10px !important;
            border-radius: 10px !important;
            margin: 0 auto !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            background-color: #0A0F1D !important;
            z-index: 50 !important;
            gap: 8px !important;
            pointer-events: auto !important;
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

        @media (max-width: 900px) {
          .ns-root {
            min-height: 100vh !important;
            height: auto !important;
            overflow-x: hidden !important;
          }
          .ns-container {
            margin-top: 64px !important;
            padding: 14px 12px 100px 12px !important;
            min-height: calc(100vh - 64px) !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .ns-card, .ns-pool-card {
            padding: 16px 14px !important;
            border-radius: 12px !important;
          }
          .ns-step3-workspace {
            display: flex !important;
            flex-direction: column !important;
            gap: 16px !important;
            overflow-x: hidden !important;
          }
          .ns-ws-col {
            width: 100% !important;
            box-sizing: border-box !important;
            min-height: auto !important;
          }
          .ns-ws-student-list {
            max-height: 360px !important;
          }
          .ns-training-groups-list {
            max-height: 440px !important;
            padding-bottom: 260px !important;
          }
          .ns-step3-filters-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
          }
        }

        @media (max-width: 540px) {
          .ns-step3-filters-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
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
      <div className="ses-modal-overlay" onClick={handleRequestClose} style={{ zIndex: 1100, padding: '20px' }}>
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
                <h2 className="ns-modal-title">
                  {publishedStats.sessionsCount > 1
                    ? `${publishedStats.sessionsCount} Sessions Created & Published!`
                    : 'Session Created & Published!'}
                </h2>
                <p className="ns-modal-desc">
                  <strong>{publishedStats.sessionsCount} session{publishedStats.sessionsCount > 1 ? 's' : ''}</strong> created for <strong>{formattedSessionDate}</strong>{publishedStats.slotsCount > 1 ? ` across ${publishedStats.slotsCount} time slots` : ''} have been successfully saved into the schedule.
                </p>
                <div className="ns-modal-actions">
                  <button
                    type="button"
                    className="ns-secondary-btn"
                    onClick={() => {
                      setShowSuccessModal(false);
                      setCurrentStep(1);
                    }}
                  >
                    Create Another Session
                  </button>
                  <button
                    type="button"
                    className="ns-primary-btn"
                    onClick={() => {
                      setShowSuccessModal(false);
                      if (isModal && modalHistoryPushedRef.current) {
                        modalHistoryPushedRef.current = false;
                        window.__newSessionIgnorePopState = true;
                        window.history.back();
                      }
                      if (onSessionCreated) onSessionCreated();
                      if (onClose) onClose();
                    }}
                  >
                    Done &amp; View Sessions &rarr;
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
          <div className="ns-modal-overlay" style={{ zIndex: 1200 }}>
            <div className="ns-modal-card">
              <div className="ns-modal-icon">🎉</div>
              <h2 className="ns-modal-title">
                {publishedStats.sessionsCount > 1
                  ? `${publishedStats.sessionsCount} Sessions Created & Published!`
                  : 'Session Created & Published!'}
              </h2>
              <p className="ns-modal-desc">
                <strong>{publishedStats.sessionsCount} session{publishedStats.sessionsCount > 1 ? 's' : ''}</strong> created for <strong>{formattedSessionDate}</strong>{publishedStats.slotsCount > 1 ? ` across ${publishedStats.slotsCount} time slots` : ''} have been successfully saved into the schedule.
              </p>
              <div className="ns-modal-actions">
                <button
                  type="button"
                  className="ns-secondary-btn"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCurrentStep(1);
                  }}
                >
                  Create Another Session
                </button>
                <button
                  type="button"
                  className="ns-primary-btn"
                  onClick={() => navigate('/sessions')}
                >
                  Done &amp; View Sessions &rarr;
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
