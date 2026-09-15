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
];

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
  const [selectedSlotId, setSelectedSlotId] = useState(() => {
    const initialSlots = loadConfiguredSlots();
    const firstActive = initialSlots.find(s => s.active);
    return firstActive ? firstActive.id : initialSlots[0]?.id || 1;
  });
  const [spotName, setSpotName] = useState('');
  const [editingSlotModal, setEditingSlotModal] = useState(null);

  // ─── Step 2 State: Roster Selector Pool (Real School Students) ───
  const [dbStudents, setDbStudents] = useState([]);
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'Beginner' | 'Intermediate' | 'Advanced'
  const [courseDayFilter, setCourseDayFilter] = useState('all'); // 'all' | '1' | '2' | '3' | ... | '7'
  const [dayFilter, setDayFilter] = useState('all');
  const [selectedSlotStep2, setSelectedSlotStep2] = useState(1);
  const [studentSearchStep2, setStudentSearchStep2] = useState('');

  // Selected students from database
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // ─── Step 3 State: Instructor Groups Matching (Real School Instructors) ───
  const [dbInstructors, setDbInstructors] = useState([]);
  const [studentTab, setStudentTab] = useState('All Active');
  const [studentSearch, setStudentSearch] = useState('');
  const [step3CheckedStudentIds, setStep3CheckedStudentIds] = useState([]);

  const [trainingGroups, setTrainingGroups] = useState([]);
  const [activeDropGroupId, setActiveDropGroupId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [draggingType, setDraggingType] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
          setSelectedStudentIds(mapped.map(s => s.id));
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

  // Real Students Pool (NO fake data)
  const allPoolStudents = dbStudents;

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

  // Selected Slot details with safe fallback
  const selectedSlot = useMemo(() => {
    return slots.find(s => s.id === selectedSlotId) || slots[0] || {
      id: 1,
      time: '08:30 AM - 10:00 AM',
      startTime: '08:30 AM',
      duration: 90,
      maxStudents: 4,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      active: true,
      title: 'Morning offshore wave ride',
    };
  }, [slots, selectedSlotId]);

  // Selected Day of Week (e.g. 'Sun', 'Mon', 'Sat')
  const selectedDayOfWeek = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    return new Date(year, month, selectedDayNumber).toLocaleDateString('en-US', { weekday: 'short' });
  }, [currentCalendarDate, selectedDayNumber]);

  // Formatted Date String
  const formattedSessionDate = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const monthName = currentCalendarDate.toLocaleString('default', { month: 'short' });
    const dayName = new Date(year, currentCalendarDate.getMonth(), selectedDayNumber).toLocaleString('default', { weekday: 'long' });
    return `${dayName}, ${monthName} ${selectedDayNumber}, ${year}`;
  }, [currentCalendarDate, selectedDayNumber]);

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

  // Toggle student selection in Step 2
  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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

  // Step 2 Filtered students from database
  const filteredStudents = useMemo(() => {
    return allPoolStudents
      .filter(s => levelFilter === 'all' || s.level.toLowerCase() === levelFilter.toLowerCase())
      .filter(s => courseDayFilter === 'all' || String(s.whichDay) === String(courseDayFilter))
      .filter(s => !studentSearchStep2 || s.name.toLowerCase().includes(studentSearchStep2.toLowerCase()));
  }, [allPoolStudents, levelFilter, courseDayFilter, studentSearchStep2]);

  // Transition from Step 2 to Step 3: No auto-grouping or auto-instructor assignment
  const proceedToStep3 = () => {
    // If no groups exist yet, create 1 clean initial empty Group Card for user to start dragging or creating
    if (trainingGroups.length === 0) {
      setTrainingGroups([
        {
          id: `group-1`,
          name: `Group A`,
          day: `Day 1`,
          level: 'General',
          studentIds: [],
          assignedInstructorId: null, // Left unassigned for user to drag & drop
        }
      ]);
      setActiveDropGroupId('group-1');
    }
    setCurrentStep(3);
  };

  // Step 3: Students in Column 1
  const importedStudents = useMemo(() => {
    return allPoolStudents.filter(s => selectedStudentIds.includes(s.id));
  }, [allPoolStudents, selectedStudentIds]);

  const filteredColumn1Students = useMemo(() => {
    return importedStudents
      .filter(s => {
        if (studentTab === 'All Active') return true;
        const isAssigned = trainingGroups.some(g => g.studentIds.includes(s.id));
        if (studentTab === 'Unassigned') return !isAssigned;
        if (studentTab === 'Assigned') return isAssigned;
        return s.level?.toLowerCase() === studentTab.toLowerCase();
      })
      .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()));
  }, [importedStudents, studentTab, studentSearch, trainingGroups]);

  // Step 3: Toggle check in Column 1
  const toggleStep3StudentCheck = (id) => {
    setStep3CheckedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Create Group from checked students or create a fresh empty group card
  const handleCreateGroup = () => {
    const newGroupLetter = String.fromCharCode(65 + trainingGroups.length);
    const checkedStudents = importedStudents.filter(s => step3CheckedStudentIds.includes(s.id));
    const levelLabel = checkedStudents.length > 0 ? (checkedStudents[0]?.level || 'General') : 'General';
    const newGroup = {
      id: `group-${Date.now()}`,
      name: `Group ${newGroupLetter}`,
      day: `Day ${trainingGroups.length + 1}`,
      level: levelLabel,
      studentIds: [...step3CheckedStudentIds],
      assignedInstructorId: null, // Left unassigned for user to drag & drop or choose
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

  // Assign Instructor to Group
  const assignInstructorToGroup = (groupId, instructorId) => {
    setTrainingGroups(prev =>
      prev.map(g => g.id === groupId ? { ...g, assignedInstructorId: instructorId } : g)
    );
  };

  const removeInstructorFromGroup = (groupId) => {
    setTrainingGroups(prev =>
      prev.map(g => g.id === groupId ? { ...g, assignedInstructorId: null } : g)
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
    setIsPublishing(true);
    try {
      // Loop over training groups and submit to /api/sessions/bulk
      for (const grp of trainingGroups) {
        const numericStudentIds = grp.studentIds
          .map(sid => typeof sid === 'number' ? sid : parseInt(String(sid).replace(/\D/g, '')))
          .filter(id => !isNaN(id) && id > 0);

        const instructorNum = grp.assignedInstructorId
          ? (typeof grp.assignedInstructorId === 'number' ? grp.assignedInstructorId : parseInt(String(grp.assignedInstructorId).replace(/\D/g, '')) || 1)
          : 1;

        const payload = {
          date: formattedSessionDate,
          time: selectedSlot.time,
          duration_mins: selectedSlot.duration ? parseInt(selectedSlot.duration, 10) : 90,
          student_ids: numericStudentIds.length > 0 ? numericStudentIds : [1],
          instructor_id: instructorNum,
          location: spotName,
          condition: 'Moderate',
          type: grp.level || 'Intermediate',
          status: 'Upcoming',
          notes: `${grp.name} - Automated schedule with ${grp.studentIds.length} athletes`,
          group_name: grp.name || '',
        };

        await fetch(`${API}/api/sessions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }

      setShowSuccessModal(true);
    } catch (e) {
      console.error(e);
      alert('Error saving session. Please try again.');
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
          <div className="ns-step-content ns-step1-grid">
            {/* Left Column: Date, Slot & Capacity */}
            <div className="ns-step1-left">
              {/* 1. Select Date */}
              <section className="ns-card">
                <h3 className="ns-card-heading">1. Select Date</h3>
                <div className="ns-calendar-widget">
                  <div className="ns-cal-header">
                    <span className="ns-cal-month-title">
                      {currentCalendarDate.toLocaleString('default', { month: 'long' })} {currentCalendarDate.getFullYear()}
                    </span>
                    <div className="ns-cal-arrows">
                      <button className="ns-cal-arrow-btn" onClick={handlePrevMonth} title="Previous Month">&larr;</button>
                      <button className="ns-cal-arrow-btn" onClick={handleNextMonth} title="Next Month">&rarr;</button>
                    </div>
                  </div>

                  <div className="ns-cal-weekdays">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                  </div>

                  <div className="ns-cal-days-grid">
                    {calendarDays.map((cd, idx) => {
                      const isSelected = cd.isCurrentMonth && cd.day === selectedDayNumber;
                      return (
                        <div
                          key={idx}
                          className={`ns-cal-day-cell ${!cd.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (cd.isCurrentMonth) setSelectedDayNumber(cd.day);
                          }}
                        >
                          <span className="ns-cal-day-num">{cd.day}</span>
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
                        <button
                          type="button"
                          className="ns-slot-edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSlotModal({
                              mode: 'edit',
                              id: slot.id,
                              time: slot.startTime || (slot.time ? slot.time.split(' - ')[0].trim() : '08:30 AM'),
                              duration: slot.duration || 90,
                              maxStudents: slot.maxStudents || 4,
                              days: slot.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                              active: slot.active !== false,
                            });
                          }}
                        >
                          Edit
                        </button>
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
                      onClick={() => setCapacity(Math.max(1, (parseInt(capacity, 10) || 5) - 5))}
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
                          setCapacity(isNaN(num) ? '' : Math.max(1, num));
                        }
                      }}
                      onBlur={() => {
                        if (!capacity || parseInt(capacity, 10) < 1) {
                          setCapacity(5);
                        }
                      }}
                      className="ns-stepper-input"
                      title="Type capacity limit directly"
                    />
                    <button
                      type="button"
                      className="ns-stepper-btn"
                      onClick={() => setCapacity((parseInt(capacity, 10) || 0) + 5)}
                      title="Increase capacity by 5"
                    >
                      +
                    </button>
                  </div>
                </div>
              </section>

              {/* Step 1 Submit Button */}
              <button
                className="ns-primary-btn full-width"
                onClick={() => setCurrentStep(2)}
              >
                Save configuration and Next: Import Students
              </button>
            </div>

            {/* Right Column: Available Pool & Today's Tides Widget */}
            <div className="ns-step1-right">
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
                    <span className="ns-pool-item-name">Beginner Athletes</span>
                    <span className="ns-pool-item-num">
                      {allPoolStudents.filter(s => s.level?.toLowerCase() === 'beginner').length}
                    </span>
                  </div>
                  <div className="ns-pool-item">
                    <span className="ns-pool-bullet">&bull;</span>
                    <span className="ns-pool-item-name">Intermediate Athletes</span>
                    <span className="ns-pool-item-num">
                      {allPoolStudents.filter(s => s.level?.toLowerCase() === 'intermediate').length}
                    </span>
                  </div>
                  <div className="ns-pool-item">
                    <span className="ns-pool-bullet">&bull;</span>
                    <span className="ns-pool-item-name">Advanced Athletes</span>
                    <span className="ns-pool-item-num">
                      {allPoolStudents.filter(s => s.level?.toLowerCase() === 'advanced').length}
                    </span>
                  </div>
                </div>
                <div className="ns-pool-footer">
                  <span>Selected Roster Count:</span>
                  <span className="ns-pool-space">{selectedStudentIds.length} Athletes Selected</span>
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
                Selected Session: <strong>{formattedSessionDate}</strong> | Time Slot: <strong>{selectedSlot.time}</strong>
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
                  {slots.filter(s => s.active !== false).map((s, idx) => {
                    const isSelected = selectedSlotId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`ns-slot-pill-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedSlotId(s.id);
                          setSelectedSlotStep2(idx + 1);
                        }}
                        title={`${s.time} (${s.title || ''})`}
                      >
                        <span className="ns-slot-pill-num">{idx + 1}</span>
                        <span className="ns-slot-pill-time">{s.startTime || s.time || `Slot ${idx + 1}`}</span>
                        {isSelected && <span className="ns-slot-pill-active-badge">Active</span>}
                      </button>
                    );
                  })}
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
                  const poolIds = filteredStudents.map(s => s.id);
                  const isAllSelected = poolIds.length > 0 && poolIds.every(id => selectedStudentIds.includes(id));
                  return (
                    <button
                      type="button"
                      className={`ns-select-all-btn ${isAllSelected ? 'deselect' : ''}`}
                      onClick={() => {
                        if (isAllSelected) {
                          setSelectedStudentIds(prev => prev.filter(id => !poolIds.includes(id)));
                        } else {
                          setSelectedStudentIds(prev => Array.from(new Set([...prev, ...poolIds])));
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
                    const isChecked = selectedStudentIds.includes(student.id);
                    const badge = getBadgeStyle(student.level);
                    return (
                      <div
                        key={student.id}
                        className={`ns-student-row ${isChecked ? 'selected' : ''}`}
                        onClick={() => toggleSelectStudent(student.id)}
                      >
                        <div className={`ns-checkbox-box ${isChecked ? 'checked' : ''}`}>
                          {isChecked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </div>
                        <UserAvatar src={student.avatar} name={student.name} size={32} className="ns-student-avatar" />
                        <span className="ns-student-name">{student.name}</span>
                        <span className="ns-day-progress-badge">
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
                <span className="ns-sb-capacity">
                  {selectedStudentIds.length} Students Selected (Any Group Size)
                </span>
              </div>

              <div className="ns-sb-center">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Selected Slot:</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>
                    ⏰ {selectedSlot?.startTime || selectedSlot?.time || 'Slot'}
                  </span>
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
            <div className="ns-selected-banner">
              <span className="ns-banner-icon">🟦</span>
              <span className="ns-banner-text">
                Selected Session: <strong>{formattedSessionDate}</strong> | Time Slot: <strong>{selectedSlot.time}</strong>
              </span>
            </div>

            {/* 4 Stat Summary Cards */}
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
                <h2 className="ns-sc-value">{allInstructors.filter(i => i.status === 'On Leave').length}</h2>
                <span className="ns-sc-label">Staff On Leave</span>
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
                      const assignedInstructor = allInstructors.find(i => String(i.id) === String(grp.assignedInstructorId));
                      const grpStudents = grp.studentIds
                        .map(id => allPoolStudents.find(s => s.id === id))
                        .filter(Boolean);
                      const isDragOver = dragOverGroupId === grp.id;

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
                          <div className="ns-gc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="ns-gc-day">{grp.day}</span>
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
                                {grpStudents.map((s) => (
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
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Assigned Instructor Slot */}
                          {assignedInstructor ? (
                            <div
                              className="ns-assigned-inst-box"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                              }}
                              onDrop={(e) => handleDropOnGroup(e, grp.id)}
                            >
                              <UserAvatar src={assignedInstructor.avatar} name={assignedInstructor.name} size={26} className="ns-ai-avatar" />
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                <span className="ns-ai-name">{assignedInstructor.name}</span>
                                <span style={{ fontSize: '10.5px', color: '#0369A1' }}>Assigned Instructor</span>
                              </div>
                              <button
                                className="ns-ai-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeInstructorFromGroup(grp.id);
                                }}
                                title="Unassign Instructor"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <div
                              className="ns-dropzone-box"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropGroupId(grp.id);
                              }}
                            >
                              <span>🖐️ <strong>Drag Instructor Here</strong> (or click instructor)</span>
                            </div>
                          )}
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
                      const assignedCount = trainingGroups.filter(g => String(g.assignedInstructorId) === String(inst.id)).length;
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
                              alert(`${inst.name} is currently On Leave.`);
                              return;
                            }
                            if (activeDropGroupId) {
                              assignInstructorToGroup(activeDropGroupId, inst.id);
                            } else {
                              const unassigned = trainingGroups.find(g => !g.assignedInstructorId);
                              if (unassigned) {
                                assignInstructorToGroup(unassigned.id, inst.id);
                              } else if (trainingGroups.length > 0) {
                                assignInstructorToGroup(trainingGroups[0].id, inst.id);
                              } else {
                                alert('Please create a Group Card in the center column first.');
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

            {/* Finalize Action Bottom Bar */}
            <div className="ns-bottom-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                className="ns-sec-btn"
                onClick={() => setCurrentStep(2)}
                style={{
                  padding: '12px 22px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              >
                ← Back to Import Students
              </button>
              <button
                className="ns-primary-btn finalize-btn"
                onClick={handleFinalizeAndPublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing Sessions...' : 'Finalize & Publish'}
              </button>
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
                    <select
                      value={editingSlotModal.duration}
                      onChange={(e) => setEditingSlotModal({ ...editingSlotModal, duration: e.target.value })}
                      className="ns-modal-input"
                    >
                      <option value="60">60 min</option>
                      <option value="90">90 min</option>
                      <option value="120">120 min</option>
                      <option value="180">180 min</option>
                    </select>
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
          grid-template-columns: repeat(4, 1fr);
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
                  Your session for <strong>{formattedSessionDate} ({selectedSlot.time})</strong> with {trainingGroups.length} training groups has been successfully saved into the schedule.
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
                Your session for <strong>{formattedSessionDate} ({selectedSlot.time})</strong> with {trainingGroups.length} training groups has been successfully saved into the schedule.
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
