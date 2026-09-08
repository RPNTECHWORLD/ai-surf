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
  const cap = slot.maxStudents ? `Max ${slot.maxStudents} students` : 'Max 4 students';
  const days = slot.days && slot.days.length > 0
    ? (slot.days.length === 7 ? 'Daily' : slot.days.join(', '))
    : 'Mon - Fri';

  const timeStr = slot.startTime || slot.time || '';
  let flavor = 'Morning offshore wave ride';
  const match = timeStr.match(/^(\d{1,2})/);
  const h = match ? parseInt(match[1], 10) : 8;
  const isPM = timeStr.toLowerCase().includes('pm');
  const h24 = isPM && h < 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);

  if (h24 >= 10 && h24 < 12) flavor = 'Mid-morning peak surf';
  else if (h24 >= 12 && h24 < 15) flavor = 'Midday surf & paddle drill';
  else if (h24 >= 15 && h24 < 17) flavor = 'Afternoon reef clinic';
  else if (h24 >= 17) flavor = 'Sunset wind down run';

  return `${flavor} · ${dur} · ${cap} · (${days})`;
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

const NewSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard Step State: 1 | 2 | 3
  const [currentStep, setCurrentStep] = useState(1);

  // ─── Step 1 State: Session Setup ───
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(2026, 8, 6)); // Default Sept 2026
  const [selectedDayNumber, setSelectedDayNumber] = useState(6);
  const [capacity, setCapacity] = useState(30);

  // Dynamic slots loaded directly from Session Configuration
  const [slots, setSlots] = useState(() => loadConfiguredSlots());
  const [selectedSlotId, setSelectedSlotId] = useState(() => {
    const initialSlots = loadConfiguredSlots();
    const firstActive = initialSlots.find(s => s.active);
    return firstActive ? firstActive.id : initialSlots[0]?.id || 1;
  });
  const [spotName, setSpotName] = useState('Banzai Pipeline, North Shore, Oahu');
  const [editingSlotModal, setEditingSlotModal] = useState(null);

  // ─── Step 2 State: Roster Selector Pool (Real School Students) ───
  const [dbStudents, setDbStudents] = useState([]);
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'Beginner' | 'Intermediate' | 'Advanced'
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
      } catch (e) {}
    }
    const schoolParam = schoolName ? `?school=${encodeURIComponent(schoolName)}` : '';

    fetch(`${API}/api/students${schoolParam}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((s, idx) => ({
            id: s.id,
            name: s.name,
            level: s.level || 'Beginner',
            day: idx % 2 === 0 ? 'day1' : 'day2',
            waitlistGroup: s.course_duration || 'Standard Session',
            avatar: (s.image && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791')) ? s.image : '',
            isReal: true
          }));
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

  // Step 2 Filtered students from database
  const filteredStudents = useMemo(() => {
    return allPoolStudents
      .filter(s => levelFilter === 'all' || s.level.toLowerCase() === levelFilter.toLowerCase())
      .filter(s => !studentSearchStep2 || s.name.toLowerCase().includes(studentSearchStep2.toLowerCase()));
  }, [allPoolStudents, levelFilter, studentSearchStep2]);

  // Transition from Step 2 to Step 3 with automatic grouping of real students
  const proceedToStep3 = () => {
    const selStudents = allPoolStudents.filter(s => selectedStudentIds.includes(s.id));
    if (trainingGroups.length === 0 || trainingGroups.every(g => g.studentIds.length === 0)) {
      const chunks = [];
      const chunkSize = 4;
      for (let i = 0; i < selStudents.length; i += chunkSize) {
        chunks.push(selStudents.slice(i, i + chunkSize));
      }
      const newGroups = chunks.map((chunk, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const assignedInst = allInstructors[idx % Math.max(1, allInstructors.length)];
        return {
          id: `group-${idx + 1}`,
          name: `Group ${letter} (${chunk[0]?.level || 'General'})`,
          day: `Day ${idx + 1}`,
          level: chunk[0]?.level || 'All Levels',
          studentIds: chunk.map(s => s.id),
          assignedInstructorId: assignedInst ? assignedInst.id : null,
        };
      });
      if (newGroups.length > 0) {
        setTrainingGroups(newGroups);
        setActiveDropGroupId(newGroups[0].id);
      } else if (selStudents.length > 0) {
        const fallbackGrp = {
          id: 'group-1',
          name: 'Group A (General)',
          day: 'Day 1',
          level: 'All Levels',
          studentIds: selStudents.map(s => s.id),
          assignedInstructorId: allInstructors[0]?.id || null,
        };
        setTrainingGroups([fallbackGrp]);
        setActiveDropGroupId('group-1');
      }
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
        return s.level?.toLowerCase() === studentTab.toLowerCase();
      })
      .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()));
  }, [importedStudents, studentTab, studentSearch]);

  // Step 3: Toggle check in Column 1
  const toggleStep3StudentCheck = (id) => {
    setStep3CheckedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Create Group from checked students
  const handleCreateGroup = () => {
    if (step3CheckedStudentIds.length === 0) {
      alert('Please check at least one student from the left column to create a group.');
      return;
    }
    const newGroupLetter = String.fromCharCode(65 + trainingGroups.length);
    const assignedInst = allInstructors[trainingGroups.length % Math.max(1, allInstructors.length)];
    const newGroup = {
      id: `group-${Date.now()}`,
      name: `Group ${newGroupLetter} (${importedStudents.find(s => step3CheckedStudentIds.includes(s.id))?.level || 'Custom'})`,
      day: `Day ${trainingGroups.length + 1}`,
      level: importedStudents.find(s => step3CheckedStudentIds.includes(s.id))?.level || 'All Levels',
      studentIds: [...step3CheckedStudentIds],
      assignedInstructorId: assignedInst ? assignedInst.id : null,
    };
    setTrainingGroups(prev => [...prev, newGroup]);
    setActiveDropGroupId(newGroup.id);
    setStep3CheckedStudentIds([]);
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

  return (
    <div className="ns-root">
      <Sidebar />

      <main className="ns-container">
        {/* Top Header & Breadcrumb Stepper */}
        <header className="ns-header">
          <div className="ns-header-left">
            <h1 className="ns-title">
              {currentStep === 1 && 'Create New Session'}
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

          <div className="ns-header-right">
            <span className="ns-forecast-label">Next Swell Forecast:</span>
            <span className="ns-forecast-val">4-6ft @ 12s</span>
            <span className="ns-forecast-icon" role="img" aria-label="swell">🌊</span>
          </div>
        </header>

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
                    onClick={() => navigate('/sessions/configure')}
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
                      className="ns-stepper-btn"
                      onClick={() => setCapacity(Math.max(5, capacity - 5))}
                    >
                      -
                    </button>
                    <span className="ns-stepper-num">{capacity}</span>
                    <button
                      className="ns-stepper-btn"
                      onClick={() => setCapacity(capacity + 5)}
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
                  <span className="ns-pool-space">{selectedStudentIds.length} / {capacity}</span>
                </div>
              </div>

              {/* Today's Tides Card (Dark Mode Widget) */}
              <div className="ns-tides-card">
                <div className="ns-tides-search">
                  <span className="ns-search-icon">🔍</span>
                  <input
                    type="text"
                    value={spotName}
                    onChange={(e) => setSpotName(e.target.value)}
                    placeholder="Enter spot or beach name..."
                    className="ns-tides-input"
                  />
                </div>

                <div className="ns-tides-header">
                  <h4 className="ns-tides-title">Today's Tides</h4>
                  <span className="ns-tides-sub">Surfline Forecast &middot; Sep 2</span>
                </div>

                {/* SVG Curve Chart */}
                <div className="ns-tide-chart-wrap">
                  <svg viewBox="0 0 400 120" className="ns-tide-svg" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 100 Q 80 80 140 40 T 260 20 T 400 30 L 400 120 L 0 120 Z"
                      fill="url(#tideGrad)"
                    />
                    <path
                      d="M 0 100 Q 80 80 140 40 T 260 20 T 400 30"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="3"
                    />
                  </svg>
                  <div className="ns-tide-axis">
                    <span>6am</span>
                    <span>12pm</span>
                    <span>6pm</span>
                  </div>
                </div>

                {/* Tides Timeline items */}
                <div className="ns-tide-rows">
                  <div className="ns-tide-row">
                    <span className="ns-tide-tag high">High</span>
                    <span className="ns-tide-height">5.2 ft</span>
                    <span className="ns-tide-time">6:14 AM</span>
                  </div>
                  <div className="ns-tide-row">
                    <span className="ns-tide-tag low">Low</span>
                    <span className="ns-tide-height">1.1 ft</span>
                    <span className="ns-tide-time">12:32 PM</span>
                  </div>
                  <div className="ns-tide-row">
                    <span className="ns-tide-tag high">High</span>
                    <span className="ns-tide-height">4.8 ft</span>
                    <span className="ns-tide-time">6:47 PM</span>
                  </div>
                  <div className="ns-tide-row">
                    <span className="ns-tide-tag low">Low</span>
                    <span className="ns-tide-height">0.8 ft</span>
                    <span className="ns-tide-time">11:58 PM</span>
                  </div>
                </div>

                <div className="ns-tides-footer">
                  <span>Water Temp: <strong>68&deg;F</strong></span>
                  <span>Swell: <strong>4-6ft @ 12s WSW</strong></span>
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

            {/* Filter Bar */}
            <div className="ns-filters-card">
              <div className="ns-filter-row">
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
                <button
                  className="ns-select-all-btn"
                  onClick={() => {
                    const poolIds = filteredStudents.map(s => s.id);
                    const allSelected = poolIds.length > 0 && poolIds.every(id => selectedStudentIds.includes(id));
                    if (allSelected) {
                      setSelectedStudentIds(prev => prev.filter(id => !poolIds.includes(id)));
                    } else {
                      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...poolIds])));
                    }
                  }}
                >
                  {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? 'Deselect All' : 'Select All'}
                </button>
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
                        <span className="ns-student-group-label">{student.waitlistGroup || 'Student'}</span>
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
                <span className="ns-sb-target-label">SELECTED TARGET</span>
                <span className="ns-sb-capacity">
                  {selectedStudentIds.length} / {capacity} Students Selected
                </span>
                {/* Circular Dial */}
                <div className="ns-cap-dial">
                  <svg width="34" height="34" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="4"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="4"
                      strokeDasharray={`${Math.min(100, Math.round((selectedStudentIds.length / (capacity || 1)) * 100))}, 100`}
                    />
                  </svg>
                </div>
              </div>

              <div className="ns-sb-center">
                {slots.filter(s => s.active !== false).map((s, idx) => (
                  <div
                    key={s.id}
                    className={`ns-slot-indicator ${selectedSlotId === s.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedSlotId(s.id);
                      setSelectedSlotStep2(idx + 1);
                    }}
                    title={`${s.time} (${s.title || ''})`}
                  >
                    <div className="ns-slot-dot">{idx + 1}</div>
                    <span>{s.startTime || `Slot ${idx + 1}`}</span>
                  </div>
                ))}
              </div>

              <div className="ns-sb-right">
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
              {/* Column 1: Students List */}
              <div className="ns-ws-col">
                <div className="ns-col-head">
                  <h3 className="ns-col-title">Students List</h3>
                  <span className="ns-col-badge">{importedStudents.length} Total</span>
                </div>

                {/* Level Tabs */}
                <div className="ns-day-tabs">
                  {['All Active', 'Beginner', 'Intermediate', 'Advanced'].map(tab => (
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

                {/* Students Checklist */}
                <div className="ns-ws-student-list">
                  {filteredColumn1Students.map(student => {
                    const isChecked = step3CheckedStudentIds.includes(student.id);
                    const badge = getBadgeStyle(student.level);
                    return (
                      <div
                        key={student.id}
                        className={`ns-ws-student-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleStep3StudentCheck(student.id)}
                      >
                        <div className={`ns-checkbox-box ${isChecked ? 'checked' : ''}`}>
                          {isChecked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </div>
                        <UserAvatar src={student.avatar} name={student.name} size={28} className="ns-ws-avatar" />
                        <span className="ns-ws-name">{student.name}</span>
                        <span className="ns-ws-day-tag">{student.waitlistGroup}</span>
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

                <div className="ns-ws-col-footer">
                  <span className="ns-selected-count">{step3CheckedStudentIds.length} Selected</span>
                  <button className="ns-create-grp-btn" onClick={handleCreateGroup}>
                    Create Group
                  </button>
                </div>
              </div>

              {/* Column 2: Assigned Training Groups */}
              <div className="ns-ws-col">
                <div className="ns-col-head">
                  <h3 className="ns-col-title">Assigned Training Groups</h3>
                  <button className="ns-add-grp-btn" onClick={handleCreateGroup}>
                    + Create Group Card
                  </button>
                </div>

                <div className="ns-training-groups-list">
                  {trainingGroups.length === 0 ? (
                    <div style={{ padding: '28px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>No training groups created yet.</p>
                      <p style={{ margin: '4px 0 12px 0', fontSize: '12px' }}>Check students in Column 1 and click "Create Group" to assemble coaching groups.</p>
                    </div>
                  ) : (
                    trainingGroups.map(grp => {
                      const assignedInstructor = allInstructors.find(i => String(i.id) === String(grp.assignedInstructorId));
                      const grpStudents = grp.studentIds
                        .map(id => allPoolStudents.find(s => s.id === id))
                        .filter(Boolean);

                      return (
                        <div
                          key={grp.id}
                          className={`ns-group-card ${activeDropGroupId === grp.id ? 'focused' : ''}`}
                          onClick={() => setActiveDropGroupId(grp.id)}
                        >
                          <div className="ns-gc-header">
                            <span className="ns-gc-day">{grp.day}</span>
                          </div>
                          <div className="ns-gc-title-row">
                            <h4 className="ns-gc-title">{grp.name}</h4>
                            <span className="ns-gc-count">{grpStudents.length} Students</span>
                          </div>

                          {/* Overlapping Avatar Stack */}
                          <div className="ns-avatar-stack">
                            {grpStudents.slice(0, 4).map((s, idx) => (
                              <UserAvatar
                                key={s.id || idx}
                                src={s.avatar}
                                name={s.name}
                                size={28}
                                className="ns-stack-avatar"
                                style={{ zIndex: 5 - idx }}
                              />
                            ))}
                            {grpStudents.length > 4 && (
                              <div className="ns-stack-plus">+{grpStudents.length - 4}</div>
                            )}
                          </div>

                          {/* Assigned Instructor Slot */}
                          {assignedInstructor ? (
                            <div className="ns-assigned-inst-box">
                              <UserAvatar src={assignedInstructor.avatar} name={assignedInstructor.name} size={26} className="ns-ai-avatar" />
                              <span className="ns-ai-name">{assignedInstructor.name} Assigned</span>
                              <button
                                className="ns-ai-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeInstructorFromGroup(grp.id);
                                }}
                                title="Unassign"
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
                              Drag and drop instructor here
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 3: Available Instructors */}
              <div className="ns-ws-col">
                <div className="ns-col-head">
                  <h3 className="ns-col-title">Available Instructors</h3>
                  <span className="ns-col-badge">{allInstructors.length} Staff</span>
                </div>

                <div className="ns-instructors-list">
                  {allInstructors.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      No instructors registered for this school yet.
                    </div>
                  ) : (
                    allInstructors.map(inst => {
                      const isAssigned = trainingGroups.some(g => String(g.assignedInstructorId) === String(inst.id));
                      const isOnLeave = inst.status === 'On Leave';

                      return (
                        <div
                          key={inst.id}
                          className={`ns-inst-card ${isAssigned ? 'assigned' : ''} ${isOnLeave ? 'leave' : ''}`}
                          onClick={() => {
                            if (isOnLeave) {
                              alert(`${inst.name} is currently On Leave.`);
                              return;
                            }
                            if (activeDropGroupId) {
                              assignInstructorToGroup(activeDropGroupId, inst.id);
                            } else {
                              // Find first unassigned group
                              const unassigned = trainingGroups.find(g => !g.assignedInstructorId);
                              if (unassigned) {
                                assignInstructorToGroup(unassigned.id, inst.id);
                              } else {
                                alert('Please select or create a Training Group in the middle column first.');
                              }
                            }
                          }}
                        >
                          <UserAvatar src={inst.avatar} name={inst.name} size={36} className="ns-inst-avatar" />
                          <div className="ns-inst-info">
                            <h4 className="ns-inst-name">{inst.name}</h4>
                            <span className="ns-inst-role">{inst.role}</span>
                          </div>
                          <span className={`ns-inst-badge ${isOnLeave ? 'leave' : isAssigned ? 'assigned' : 'available'}`}>
                            {isOnLeave ? 'On Leave' : isAssigned ? '1 Assigned' : 'Available'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Finalize Action Bottom Bar */}
            <div className="ns-bottom-action-bar">
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

        {/* Success Modal */}
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

      {/* Scoped Styling for the 3-Step Wizard Flow */}
      <style>{`
        .ns-root {
          display: flex;
          min-height: 100vh;
          background-color: #F8FAFC;
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
          transition: color 0.15s;
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
          padding-bottom: 80px; /* Space for bottom sticky bar */
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
        .ns-ps-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ns-ps-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #0F172A;
        }
        .ns-ps-count {
          font-size: 13px;
          color: #64748B;
        }
        .ns-select-all-btn {
          background: none;
          border: none;
          color: #0284C7;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .ns-student-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ns-student-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid transparent;
          background-color: #F8FAFC;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ns-student-row:hover {
          background-color: #F1F5F9;
        }
        .ns-student-row.selected {
          background-color: #F0F9FF;
          border-color: #BAE6FD;
        }

        .ns-checkbox-box {
          width: 18px;
          height: 18px;
          border: 1.5px solid #CBD5E1;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .ns-checkbox-box.checked {
          background-color: #0284C7;
          border-color: #0284C7;
        }
        .ns-avatar-fallback {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
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
        .ns-student-group-label {
          font-size: 12px;
          color: #64748B;
          margin-right: 16px;
        }

        .ns-level-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
          border: 1px solid;
        }

        /* Bottom Sticky Bar */
        .ns-sticky-bar {
          position: fixed;
          bottom: 0;
          left: 260px; /* Sidebar width */
          right: 0;
          background-color: #0A0F1D;
          color: #FFFFFF;
          padding: 16px 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
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
        .ns-sb-center {
          display: flex;
          gap: 16px;
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
        .ns-group-card {
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.15s;
          cursor: pointer;
        }
        .ns-group-card.focused {
          border-color: #0284C7;
          box-shadow: 0 0 0 2px rgba(2,132,199,0.15);
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

        .ns-avatar-stack {
          display: flex;
          align-items: center;
        }
        .ns-stack-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #FFFFFF;
          margin-left: -8px;
          object-fit: cover;
        }
        .ns-stack-avatar:first-child {
          margin-left: 0;
        }
        .ns-stack-plus {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #E2E8F0;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #FFFFFF;
          margin-left: -8px;
        }

        .ns-assigned-inst-box {
          background-color: #E0F2FE;
          border: 1px solid #BAE6FD;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ns-ai-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: cover;
        }
        .ns-ai-name {
          font-size: 13px;
          font-weight: 600;
          color: #0284C7;
          flex: 1;
        }
        .ns-ai-remove {
          background: none;
          border: none;
          font-size: 16px;
          color: #0284C7;
          cursor: pointer;
        }

        .ns-dropzone-box {
          border: 1.5px dashed #CBD5E1;
          border-radius: 8px;
          padding: 14px;
          text-align: center;
          font-size: 12px;
          color: #94A3B8;
          background-color: #F8FAFC;
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
          border: 1.5px solid #00D1B2;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.15s;
          background: #FFFFFF;
        }
        .ns-inst-card:hover {
          background-color: #F0FDFA;
        }
        .ns-inst-card.assigned {
          border-color: #F59E0B;
        }
        .ns-inst-card.leave {
          border-color: #E2E8F0;
          opacity: 0.7;
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
          font-size: 14px;
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
          color: #00D1B2;
        }
        .ns-inst-badge.assigned {
          background: #FEF3C7;
          color: #D97706;
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
    </div>
  );
};

export default NewSession;
