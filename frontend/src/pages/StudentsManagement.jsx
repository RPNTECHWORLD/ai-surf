import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';


const StudentsManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.state?.openAddModal || params.get('action') === 'add' || params.get('add') === 'true') {
      setShowModal(true);
      setAddMode('single');
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [location]);
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [instructorFilter, setInstructorFilter] = useState('All');
  const [sessionTimeFilter, setSessionTimeFilter] = useState('All');
  const [stayFilter, setStayFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [swimmingFilter, setSwimmingFilter] = useState('All'); // 'All' | 'Swimmer' | 'Non-Swimmer'
  const [activeStatFilter, setActiveStatFilter] = useState('TOTAL');
  const [showModal, setShowModal] = useState(false);
  const [modalInvite, setModalInvite] = useState(null); // link shown inside the add-student modal after creation
  const [copied, setCopied] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [inviteModalData, setInviteModalData] = useState(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  // School Batch Registration Invite states
  const [showSchoolInviteModal, setShowSchoolInviteModal] = useState(false);
  const [inviteCapacityCount, setInviteCapacityCount] = useState(3);
  const [inviteCourseDuration, setInviteCourseDuration] = useState('3 Days Course');
  const [createdSchoolInvite, setCreatedSchoolInvite] = useState(null);
  const [schoolInviteLoading, setSchoolInviteLoading] = useState(false);
  const [copiedSchoolInviteCode, setCopiedSchoolInviteCode] = useState(null);
  const [schoolInvitesList, setSchoolInvitesList] = useState([]);
  const [showActiveInvitesOnly, setShowActiveInvitesOnly] = useState(false);
  const [showInviteLinksPanel, setShowInviteLinksPanel] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState('generate'); // 'generate' | 'history'
  const [attendanceModal, setAttendanceModal] = useState(null); // student object to mark attendance
  const [attSaving, setAttSaving] = useState(false);
  const [attError, setAttError] = useState('');
  const DEFAULT_SLOTS = [
    { id: 1, time: "08:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true },
    { id: 2, time: "10:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], active: true },
    { id: 3, time: "11:30 AM", duration: "60", maxStudents: 6, days: ["Mon", "Tue", "Wed"], active: true },
    { id: 4, time: "01:00 PM", duration: "120", maxStudents: 4, days: ["Tue", "Thu", "Sat", "Sun"], active: true },
    { id: 5, time: "03:30 PM", duration: "90", maxStudents: 4, days: ["Fri", "Sat", "Sun"], active: false },
    { id: 6, time: "04:00 PM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
  ];

  const SLOT_THEMES = [
    { name: 'Teal', primary: '#0D9488', dark: '#0F766E', light: '#ECFDF5', border: '#059669' },
    { name: 'Blue', primary: '#0284C7', dark: '#0369A1', light: '#EFF6FF', border: '#0284C7' },
    { name: 'Purple', primary: '#7C3AED', dark: '#6D28D9', light: '#F5F3FF', border: '#7C3AED' },
    { name: 'Amber', primary: '#D97706', dark: '#B45309', light: '#FFFBEB', border: '#D97706' },
    { name: 'Rose', primary: '#E11D48', dark: '#BE123C', light: '#FFF1F2', border: '#E11D48' }
  ];
  const getSlotTheme = (idx) => SLOT_THEMES[Math.abs(idx) % SLOT_THEMES.length];

  const [configuredSlots, setConfiguredSlots] = useState(() => {
    try {
      const raw = localStorage.getItem('session_slots');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SLOTS;
  });

  useEffect(() => {
    const handleSlotsSync = () => {
      try {
        const raw = localStorage.getItem('session_slots');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setConfiguredSlots(parsed);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('storage', handleSlotsSync);
    window.addEventListener('session_slots_updated', handleSlotsSync);
    return () => {
      window.removeEventListener('storage', handleSlotsSync);
      window.removeEventListener('session_slots_updated', handleSlotsSync);
    };
  }, []);

  const availableSlotsForDate = useMemo(() => {
    const activeSlots = (configuredSlots || []).filter(s => s.active !== false);
    if (!dateFilter || dateFilter === 'All') {
      return activeSlots;
    }
    const parts = String(dateFilter).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const d = new Date(year, month, day);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDayOfWeek = dayNames[d.getDay()];
        return activeSlots.filter(s => Array.isArray(s.days) && s.days.includes(selectedDayOfWeek));
      }
    }
    return activeSlots;
  }, [configuredSlots, dateFilter]);

  useEffect(() => {
    if (sessionTimeFilter !== 'All') {
      const exists = availableSlotsForDate.some(s => {
        const t = s.time || s.startTime;
        return t === sessionTimeFilter || sessionTimeFilter.startsWith(t) || t.startsWith(sessionTimeFilter);
      });
      if (!exists) {
        setSessionTimeFilter('All');
      }
    }
  }, [availableSlotsForDate, sessionTimeFilter]);

  const [saving, setSaving] = useState(false);
  const addDaysToDate = (startDateStr, days) => {
    if (!startDateStr) return '';
    const numDays = parseInt(days, 10);
    if (isNaN(numDays) || numDays <= 0) return startDateStr;
    const parts = String(startDateStr).split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + (numDays - 1));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    const d = new Date(startDateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (numDays - 1));
    return d.toISOString().split('T')[0];
  };

  const calculateDaysBetween = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    const sParts = String(startStr).split('-');
    const eParts = String(endStr).split('-');
    if (sParts.length === 3 && eParts.length === 3) {
      const s = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10));
      const e = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10));
      const diffTime = e.getTime() - s.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    }
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    try {
      const birthDate = new Date(dobString);
      if (isNaN(birthDate.getTime())) {
        const parts = String(dobString).split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (!isNaN(d.getTime())) return Math.floor((new Date() - d) / (365.25 * 24 * 60 * 60 * 1000));
          } else if (parts[2].length === 4) {
            const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(d.getTime())) return Math.floor((new Date() - d) / (365.25 * 24 * 60 * 60 * 1000));
          }
        }
        return '';
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 && age < 120 ? age : '';
    } catch (e) {
      return '';
    }
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    if (s.includes('-') || s.includes('/')) {
      const parts = s.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    return s;
  };

  const defaultStartDate = new Date().toISOString().split('T')[0];
  const defaultEndDate = addDaysToDate(defaultStartDate, 3);

  const parseGuestsArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  };

  const getStudentGuestsDetails = (studentObj) => {
    if (!studentObj) return [];
    const directList = parseGuestsArray(studentObj.guests_details);
    if (directList.length > 0) return directList;

    try {
      const emailLower = (studentObj.email || '').toLowerCase().trim();
      const nameLower = (studentObj.name || '').toLowerCase().trim();

      const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      if ((emailLower && (savedUser.email || '').toLowerCase().trim() === emailLower) ||
          (nameLower && (savedUser.name || '').toLowerCase().trim() === nameLower)) {
        const userGuests = parseGuestsArray(savedUser.guests_details);
        if (userGuests.length > 0) return userGuests;
      }

      const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
      const req = reqs.find(r => 
        (emailLower && (r.student_email || r.email || '').toLowerCase().trim() === emailLower) ||
        (nameLower && (r.student_name || r.name || '').toLowerCase().trim() === nameLower)
      );
      if (req) {
        const reqGuests = parseGuestsArray(req.guests_details);
        if (reqGuests.length > 0) return reqGuests;
      }

      const mockStudents = JSON.parse(localStorage.getItem('mock_students_data') || '[]');
      const mock = mockStudents.find(m => 
        (emailLower && (m.email || '').toLowerCase().trim() === emailLower) ||
        (nameLower && (m.name || '').toLowerCase().trim() === nameLower)
      );
      if (mock) {
        const mockGuests = parseGuestsArray(mock.guests_details);
        if (mockGuests.length > 0) return mockGuests;
      }

      const savedAccs = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
      const acc = savedAccs.find(a => 
        (emailLower && (a.email || '').toLowerCase().trim() === emailLower) ||
        (nameLower && (a.name || '').toLowerCase().trim() === nameLower)
      );
      if (acc) {
        const accGuests = parseGuestsArray(acc.guests_details);
        if (accGuests.length > 0) return accGuests;
      }
    } catch (e) {}

    return [];
  };

  const getStudentGuestCount = (studentObj) => {
    if (!studentObj) return 0;
    const details = getStudentGuestsDetails(studentObj);
    if (details && Array.isArray(details) && details.length > 0) return details.length;
    return 0;
  };

  const [form, setForm] = useState({
    name: '', email: '', password: '', level: 'Beginner', instructor_id: '',
    swimming_ability: 'Swimmer',
    whatsapp_number: '', dob: '', age: '', course_duration: '3 Days Course', session_time: '',
    start_date: defaultStartDate, end_date: defaultEndDate, staying_at_school: 'Yes',
    guests: []
  });

  const handleCourseDurationChange = (val) => {
    const match = String(val).match(/^(\d+)/);
    const num = match ? parseInt(match[1], 10) : parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      const durLabel = `${num} ${num === 1 ? 'Day' : 'Days'} Course`;
      const newEnd = form.start_date ? addDaysToDate(form.start_date, num) : form.end_date;
      setForm(prev => ({
        ...prev,
        course_duration: durLabel,
        end_date: newEnd
      }));
    } else {
      setForm(prev => ({
        ...prev,
        course_duration: val
      }));
    }
  };

  const handleStartDateChange = (newStart) => {
    const match = (form.course_duration || '').match(/^(\d+)/);
    const currentDays = match ? parseInt(match[1], 10) : (calculateDaysBetween(form.start_date, form.end_date) || 3);
    const newEnd = addDaysToDate(newStart, currentDays);
    setForm(prev => ({
      ...prev,
      start_date: newStart,
      end_date: newEnd
    }));
  };

  const handleEndDateChange = (newEnd) => {
    const calculatedDays = calculateDaysBetween(form.start_date, newEnd) || 1;
    const durationLabel = `${calculatedDays} ${calculatedDays === 1 ? 'Day' : 'Days'} Course`;
    setForm(prev => ({
      ...prev,
      end_date: newEnd,
      course_duration: durationLabel
    }));
  };

  const handleAddSingleGuest = () => {
    setForm(prev => ({
      ...prev,
      guests: [...(prev.guests || []), { name: '', dob: '', age: '', swimming_ability: 'Swimmer', level: 'Beginner', phone: '' }]
    }));
  };

  const handleSingleGuestChange = (gIdx, field, value) => {
    setForm(prev => {
      const cur = [...(prev.guests || [])];
      if (!cur[gIdx]) return prev;
      const updated = { ...cur[gIdx], [field]: value };
      if (field === 'dob') {
        const computed = calculateAge(value);
        updated.age = computed ? String(computed) : '';
      }
      cur[gIdx] = updated;
      return { ...prev, guests: cur };
    });
  };

  const handleDeleteSingleGuest = (gIdx) => {
    setForm(prev => ({
      ...prev,
      guests: (prev.guests || []).filter((_, i) => i !== gIdx)
    }));
  };

  const closeModal = () => {
    setShowModal(false);
    setModalInvite(null);
    setAddedStudentSummary(null);
    setAddMode('single');
    setCopied(false);
    setCsvFileName('');
    setBulkRows([
      { name: '', email: '', phone: '', dob: '', age: '', level: 'Beginner', swimming_ability: 'Swimmer', days: 3, course_duration: '3 Days Course', start_date: '', end_date: '', instructor_id: '', guests: [] }
    ]);
    setForm({
      name: '', email: '', password: '', level: 'Beginner', instructor_id: '',
      swimming_ability: 'Swimmer',
      whatsapp_number: '', dob: '', age: '', course_duration: '3 Days Course', session_time: '',
      start_date: new Date().toISOString().split('T')[0], end_date: addDaysToDate(new Date().toISOString().split('T')[0], 3), staying_at_school: 'Yes',
      guests: []
    });
  };

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const userRole = (currentUser?.role || '').toLowerCase().trim();
  const isStudent = userRole === 'athlete' || userRole === 'student';
  const isCoach = userRole === 'coach' || userRole === 'instructor';
  const currentCoachName = currentUser?.name || '';
  const currentCoachId = currentUser?.instructor_id || currentUser?.id || null;

  const activeSchoolName = (() => {
    try {
      const savedSchool = sessionStorage.getItem('activeSchool');
      if (savedSchool) {
        try {
          const parsed = JSON.parse(savedSchool);
          if (parsed && typeof parsed === 'object') {
            if (parsed.name) return typeof parsed.name === 'string' ? parsed.name : (parsed.name?.name || null);
          } else if (typeof parsed === 'string') {
            return parsed;
          }
        } catch (e) {
          return savedSchool;
        }
      }
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.school) {
          return typeof parsed.school === 'string' ? parsed.school : (parsed.school?.name || null);
        }
        if (parsed.school_name) {
          return typeof parsed.school_name === 'string' ? parsed.school_name : (parsed.school_name?.name || null);
        }
      }
    } catch (e) {}
    return null;
  })();

  const schoolLower = (activeSchoolName || '').toLowerCase().trim();
  const isSuperAdmin = currentUser?.role === 'superadmin' || schoolLower === 'super admin';
  const isAdminOrSchoolAdmin = isSuperAdmin || userRole === 'admin' || userRole === 'school' || userRole === 'school_admin' || userRole === 'schooladmin';
  const canManagePendingRequests = isAdminOrSchoolAdmin && !isCoach;
  const canDeleteStudent = isAdminOrSchoolAdmin && !isCoach;
  const canCreateInviteLink = isAdminOrSchoolAdmin && !isCoach;

  const loggedInCoach = useMemo(() => {
    if (!instructors || instructors.length === 0) return null;
    return instructors.find(i => 
      (currentCoachId && (String(i.id) === String(currentCoachId) || parseInt(i.id) === parseInt(currentCoachId))) ||
      (currentCoachName && i.name && i.name.toLowerCase().trim() === currentCoachName.toLowerCase().trim())
    );
  }, [instructors, currentCoachId, currentCoachName]);

  const coachAffiliatedSchool = (loggedInCoach?.school || currentUser?.school || currentUser?.school_name || activeSchoolName || '').trim();
  const isCoachFreelance = isCoach && (
    coachAffiliatedSchool.toLowerCase() === 'individual / freelance coach' ||
    (currentUser?.school || '').toLowerCase().trim() === 'individual / freelance coach'
  );

  // If coach belongs to a school ("oru schoola irutha"), they cannot add students.
  // Only Admins and Individual / Freelance Coaches can add students.
  const canAddStudent = isAdminOrSchoolAdmin || (isCoach && isCoachFreelance);

  const effectiveSchool = (isCoach && isCoachFreelance)
    ? 'Individual / Freelance Coach'
    : (activeSchoolName && schoolLower !== 'school admin' && schoolLower !== 'super admin')
      ? activeSchoolName
      : 'Aquatic Indica Surf School';
  const effectiveSchoolLower = effectiveSchool.toLowerCase().trim();
  const isDefaultSchool = !activeSchoolName || (typeof activeSchoolName === 'string' && (activeSchoolName.toLowerCase() === 'aquatic indica surf school' || activeSchoolName.toLowerCase() === 'school admin'));

  const [allSessions, setAllSessions] = useState([]);
  const [expandedGuestStudentId, setExpandedGuestStudentId] = useState(null);

  const toggleGuestDropdown = (studentId) => {
    setExpandedGuestStudentId(prev => (prev === studentId ? null : studentId));
  };

  const fetchStudents = () => {
    setLoading(true);
    const url = (effectiveSchool && !isSuperAdmin)
      ? `${API}/api/students?school=${encodeURIComponent(effectiveSchool)}`
      : `${API}/api/students`;
    fetch(url)
      .then(r => r.json())
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const [reqRefreshKey, setReqRefreshKey] = useState(0);

  useEffect(() => {
    fetchStudents();
    const instUrl = (effectiveSchool && !isSuperAdmin)
      ? `${API}/api/instructors?school=${encodeURIComponent(effectiveSchool)}`
      : `${API}/api/instructors`;
    fetch(instUrl)
      .then(r => r.json())
      .then(data => setInstructors(data))
      .catch(() => {});

    const sessUrl = (effectiveSchool && !isSuperAdmin)
      ? `${API}/api/sessions?school=${encodeURIComponent(effectiveSchool)}`
      : `${API}/api/sessions`;
    fetch(sessUrl)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllSessions(data); })
      .catch(() => {});

    const onStorageChange = () => {
      fetchStudents();
      fetch(sessUrl)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setAllSessions(data); })
        .catch(() => {});
      setReqRefreshKey(k => k + 1);
    };
    window.addEventListener('storage', onStorageChange);
    window.addEventListener('focus', onStorageChange);
    const interval = setInterval(() => setReqRefreshKey(k => k + 1), 1500);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('focus', onStorageChange);
    };
  }, [effectiveSchool, isSuperAdmin]);

  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Master'];

  const approvedStudents = useMemo(() => {
    // Pure AWS Backend Students Only - Approved students
    const list = Array.isArray(students) ? students : [];
    const seenIds = new Set();
    const valid = list.filter(s => {
      if (!s || !s.id) return false;
      if (s.approval_status === 'pending' || s.approval_status === 'rejected') return false;
      if (seenIds.has(s.id)) return false;
      seenIds.add(s.id);

      const studentSchool = (s.school || s.school_name || '').toLowerCase().trim();

      // 1. In School View (!isCoach): Exclude students assigned to an Individual / Freelance Coach
      if (!isCoach) {
        if (studentSchool === 'individual / freelance coach') return false;
        if (s.instructor_id) {
          const inst = instructors.find(i => String(i.id) === String(s.instructor_id));
          if (inst && (inst.school || '').toLowerCase().trim() === 'individual / freelance coach') {
            return false;
          }
        }
      }

      // 2. School-level multi-tenant isolation
      if (effectiveSchoolLower && !isSuperAdmin && !isCoach) {
        if (studentSchool && studentSchool !== effectiveSchoolLower) return false;
      }

      return true;
    });

    // Coach Role Isolation: Only show students assigned to THIS coach (via primary instructor assignment or sessions)
    if (isCoach && (currentCoachName || currentCoachId)) {
      const cNameLower = (currentCoachName || '').toLowerCase().trim();

      const coachStudentIdsFromSessions = new Set();
      const coachStudentNamesFromSessions = new Set();

      allSessions.forEach(sess => {
        const sSchool = (sess.school || '').toLowerCase().trim();
        if (isCoachFreelance) {
          if (sSchool && sSchool !== 'individual / freelance coach') return;
        } else if (coachAffiliatedSchool) {
          if (sSchool && sSchool !== coachAffiliatedSchool.toLowerCase() && sSchool !== effectiveSchoolLower) return;
        }

        const sInstLower = (sess.instructor || sess.instructor_name || '').toLowerCase().trim();
        const instMatch = 
          (cNameLower && sInstLower && (sInstLower === cNameLower || sInstLower.includes(cNameLower) || cNameLower.includes(sInstLower))) ||
          (currentCoachId && (sess.instructor_id === currentCoachId || String(sess.instructor_id) === String(currentCoachId) || parseInt(sess.instructor_id) === parseInt(currentCoachId)));

        if (instMatch) {
          if (sess.student_id) coachStudentIdsFromSessions.add(String(sess.student_id));
          if (sess.student) coachStudentNamesFromSessions.add(sess.student.toLowerCase().trim());
        }
      });

      return valid.filter(s => {
        const studentSchool = (s.school || s.school_name || '').toLowerCase().trim();

        // Affiliation isolation:
        if (isCoachFreelance) {
          // Individual freelance coach: MUST be freelance school or created by this coach
          const isFreelanceStudent = studentSchool === 'individual / freelance coach' || (!studentSchool && String(s.created_by_user_id) === String(currentCoachId));
          if (!isFreelanceStudent) return false;
        } else if (coachAffiliatedSchool) {
          // School coach: student MUST belong to this coach's school
          if (studentSchool && studentSchool !== coachAffiliatedSchool.toLowerCase() && studentSchool !== effectiveSchoolLower) {
            return false;
          }
          if (studentSchool === 'individual / freelance coach') return false;
        }

        const sInstLower = (s.instructor || s.instructor_name || '').toLowerCase().trim();
        const sNameLower = (s.name || '').toLowerCase().trim();

        // 1. Match by primary instructor ID or Name
        const idMatch = currentCoachId && (s.instructor_id === currentCoachId || String(s.instructor_id) === String(currentCoachId) || parseInt(s.instructor_id) === parseInt(currentCoachId));
        const nameMatch = cNameLower && sInstLower && (sInstLower === cNameLower || sInstLower.includes(cNameLower) || cNameLower.includes(sInstLower));
        
        // 2. Match by scheduled session with this coach
        const sessionMatch = coachStudentIdsFromSessions.has(String(s.id)) || (sNameLower && coachStudentNamesFromSessions.has(sNameLower));

        // 3. Match by creator ID
        const createdMatch = s.created_by_user_id && currentCoachId && (String(s.created_by_user_id) === String(currentCoachId));

        return idMatch || nameMatch || sessionMatch || createdMatch;
      });
    }

    return valid;
  }, [students, instructors, allSessions, isCoach, isCoachFreelance, coachAffiliatedSchool, currentCoachName, currentCoachId, effectiveSchoolLower, isSuperAdmin]);

  const handleStatClick = (label) => {
    setActiveStatFilter(label);
    if (label === 'TOTAL') {
      setLevelFilter('All');
    } else if (label === 'ACTIVE') {
      setLevelFilter('All');
    } else if (label === 'BEGINNER') {
      setLevelFilter('Beginner');
    } else if (label === 'INTERMEDIATE') {
      setLevelFilter('Intermediate');
    } else if (label === 'ADVANCED') {
      setLevelFilter('Advanced');
    }
  };

  const calculateCurrentCourseDay = (s) => {
    if (!s) return { which_day: 1, total_days: 3 };
    
    let totalDays = 3;
    const durStr = s.course_duration || '3 Days Course';
    const match = String(durStr).match(/(\d+)\s*Day/i);
    if (match) {
      totalDays = parseInt(match[1]);
    } else if (s.total_days) {
      totalDays = parseInt(s.total_days);
    }

    if (!s.start_date) {
      return { which_day: s.which_day || 1, total_days: totalDays };
    }

    try {
      let sYear, sMonth, sDay;
      const parts = String(s.start_date).trim().split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          sYear = parseInt(parts[0]);
          sMonth = parseInt(parts[1]) - 1;
          sDay = parseInt(parts[2]);
        } else if (parts[2].length === 4) {
          sYear = parseInt(parts[2]);
          sMonth = parseInt(parts[1]) - 1;
          sDay = parseInt(parts[0]);
        }
      }
      if (sYear && !isNaN(sYear)) {
        const sDate = new Date(sYear, sMonth, sDay);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.floor((today.getTime() - sDate.getTime()) / msPerDay);
        
        if (diffDays < 0) {
          return { which_day: 1, total_days: totalDays, status: 'Upcoming' };
        } else {
          const currentDayNum = diffDays + 1;
          if (currentDayNum > totalDays) {
            return { which_day: totalDays, total_days: totalDays, completed: true };
          }
          return { which_day: currentDayNum, total_days: totalDays };
        }
      }
    } catch (e) {}

    return { which_day: s.which_day || 1, total_days: totalDays };
  };

  const filtered = approvedStudents.filter(s => {
    const searchLower = (search || '').toLowerCase();
    const sName = (s.name || '').toLowerCase();
    const sEmail = (s.email || '').toLowerCase();
    const sPhone = String(s.whatsapp_number || '');

    const matchSearch = sName.includes(searchLower) ||
      sEmail.includes(searchLower) ||
      sPhone.includes(search);

    let matchStat = true;
    if (activeStatFilter === 'ACTIVE') {
      matchStat = s.last_active === 'Today' || s.last_active === 'Yesterday';
    } else if (activeStatFilter === 'BEGINNER') {
      matchStat = s.level === 'Beginner';
    } else if (activeStatFilter === 'INTERMEDIATE') {
      matchStat = s.level === 'Intermediate';
    } else if (activeStatFilter === 'ADVANCED') {
      matchStat = s.level === 'Advanced';
    }

    const matchLevel = levelFilter === 'All' || s.level === levelFilter;
    const matchInstructor = instructorFilter === 'All' || s.instructor === instructorFilter;
    const matchSession = sessionTimeFilter === 'All' ||
      s.session_time === sessionTimeFilter ||
      (s.session_time && s.session_time.startsWith(sessionTimeFilter)) ||
      (s.session_time && sessionTimeFilter.startsWith(s.session_time));
    const matchStay = stayFilter === 'All' || (stayFilter === 'Lodge' ? s.staying_at_school === 'Yes' : s.staying_at_school === 'No');
    const matchDate = dateFilter === 'All' || s.start_date === dateFilter;
    const sSwim = (s.swimming_ability || 'Swimmer').toLowerCase();
    const matchSwimming = swimmingFilter === 'All' ||
      (swimmingFilter === 'Swimmer' && !sSwim.includes('non') && sSwim !== 'no') ||
      (swimmingFilter === 'Non-Swimmer' && (sSwim.includes('non') || sSwim === 'no'));
    return matchSearch && matchLevel && matchStat && matchInstructor && matchSession && matchStay && matchDate && matchSwimming;
  });

  const availableDates = React.useMemo(() => {
    const dates = new Set();
    approvedStudents.forEach(s => {
      if (s.start_date && s.start_date.trim()) dates.add(s.start_date.trim());
    });
    return Array.from(dates).sort();
  }, [approvedStudents]);

  const stats = [
    { value: approvedStudents.length, label: 'TOTAL', shortLabel: 'TOTAL', color: '#050B1A', active: activeStatFilter === 'TOTAL' },
    { value: approvedStudents.filter(s => s.last_active === 'Today' || s.last_active === 'Yesterday').length, label: 'ACTIVE', shortLabel: 'ACTIVE', color: '#0D9488', active: activeStatFilter === 'ACTIVE' },
    { value: approvedStudents.filter(s => s.level === 'Beginner').length, label: 'BEGINNER', shortLabel: 'BEGINNER', color: '#F59E0B', active: activeStatFilter === 'BEGINNER' },
    { value: approvedStudents.filter(s => s.level === 'Intermediate').length, label: 'INTERMEDIATE', shortLabel: 'INTERMED', color: '#0D9488', active: activeStatFilter === 'INTERMEDIATE' },
    { value: approvedStudents.filter(s => s.level === 'Advanced').length, label: 'ADVANCED', shortLabel: 'ADVANCED', color: '#7C3AED', active: activeStatFilter === 'ADVANCED' },
  ];


  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedInst = instructors.find(i => String(i.id) === String(form.instructor_id));
      const isInstFreelance = (selectedInst?.school || '').toLowerCase().trim() === 'individual / freelance coach';
      const studentSchool = (isCoach && isCoachFreelance)
        ? 'Individual / Freelance Coach'
        : (isInstFreelance ? 'Individual / Freelance Coach' : (coachAffiliatedSchool || effectiveSchool || 'Aquatic Indica Surf School'));

      const assignedInstId = isCoach ? currentCoachId : (form.instructor_id ? parseInt(form.instructor_id) : null);
      const studentAge = form.dob ? (calculateAge(form.dob) || (form.age ? parseInt(form.age) : undefined)) : (form.age ? parseInt(form.age) : undefined);
      const cleanedSingleGuests = (form.guests || []).filter(g => g && g.name && g.name.trim()).map(g => ({
        name: g.name.trim(),
        dob: g.dob || '',
        age: g.dob ? (calculateAge(g.dob) || (g.age ? parseInt(g.age) : undefined)) : (g.age ? parseInt(g.age) : undefined),
        swimming_ability: g.swimming_ability || 'Swimmer',
        level: g.level || 'Beginner',
        phone: g.phone || g.whatsapp_number || ''
      }));

      const res = await fetch(`${API}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          level: form.level,
          swimming_ability: form.swimming_ability || 'Swimmer',
          dob: form.dob || '',
          instructor_id: assignedInstId,
          created_by_user_id: currentCoachId || currentUser?.id || undefined,
          whatsapp_number: form.whatsapp_number,
          course_duration: form.course_duration,
          session_time: form.session_time,
          start_date: form.start_date,
          end_date: form.end_date,
          staying_at_school: form.staying_at_school,
          school: studentSchool,
          guests_count: cleanedSingleGuests.length,
          guests_details: cleanedSingleGuests,
        }),
      });
      if (res.ok) {
        const newStudent = await res.json();
        



        fetchStudents();
        const baseUrl = window.location.origin;
        let inviteToken = newStudent.invite_token || `inv_${Date.now()}`;
        if (!newStudent.invite_token) {
          try {
            const invRes = await fetch(`${API}/api/students/${newStudent.id}/generate-invite`, { method: 'POST' });
            if (invRes.ok) {
              const invData = await invRes.json();
              if (invData.token) inviteToken = invData.token;
            }
          } catch (err) {}
        }

        const studentInviteLink = `${baseUrl}/student-portal?token=${inviteToken}`;
        const summaryData = {
          ...newStudent,
          name: newStudent.name || form.name,
          email: newStudent.email || form.email,
          whatsapp_number: newStudent.whatsapp_number || form.whatsapp_number,
          dob: newStudent.dob || form.dob,
          age: newStudent.age || studentAge,
          level: newStudent.level || form.level,
          swimming_ability: newStudent.swimming_ability || form.swimming_ability || 'Swimmer',
          course_duration: newStudent.course_duration || form.course_duration,
          session_time: newStudent.session_time || form.session_time,
          start_date: newStudent.start_date || form.start_date,
          end_date: newStudent.end_date || form.end_date,
          instructor: 'Not Assigned Yet',
          inviteLink: studentInviteLink,
          guests_count: cleanedSingleGuests.length,
          guests_details: cleanedSingleGuests
        };

        setModalInvite({
          name: form.name,
          email: form.email,
          link: studentInviteLink,
        });
        setAddedStudentSummary(summaryData);
        setAddMode('summary');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Failed to add student. Please check input values.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating student. Please try again.');
    }
    setSaving(false);
  };

  // Add Student modal tabs: 'single' | 'multiple' | 'csv' | 'summary'
  const [addMode, setAddMode] = useState('single');
  const [addedStudentSummary, setAddedStudentSummary] = useState(null);
  
  // Bulk grid rows state (Starts clean for manual data entry)
  const [bulkRows, setBulkRows] = useState([
    { name: '', email: '', phone: '', dob: '', age: '', level: 'Beginner', swimming_ability: 'Swimmer', days: 3, course_duration: '3 Days Course', start_date: '', end_date: '', instructor_id: '', guests: [] }
  ]);

  // CSV Drag-drop & parser state
  const [dragActive, setDragActive] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');

  // Quick Action Toggles for Review Summary
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [notifyInstructor, setNotifyInstructor] = useState(true);

  // Dynamic session stats for the Review Summary modal
  const summaryStudentSessions = React.useMemo(() => {
    if (!addedStudentSummary) return [];
    const sid = addedStudentSummary.id;
    const sName = (addedStudentSummary.name || '').toLowerCase().trim();

    return allSessions.filter(s => {
      if (sid && s.student_id === sid) return true;
      if (sName && s.student && s.student.toLowerCase().trim() === sName) return true;
      return false;
    });
  }, [allSessions, addedStudentSummary]);

  const summaryPendingSessions = React.useMemo(() => {
    return summaryStudentSessions.filter(s => {
      const st = (s.status || '').toLowerCase().trim();
      return st === 'upcoming' || st === 'in progress' || st === 'pending' || st === 'scheduled';
    });
  }, [summaryStudentSessions]);

  const summaryCompletedSessions = React.useMemo(() => {
    return summaryStudentSessions.filter(s => {
      const st = (s.status || '').toLowerCase().trim();
      return st === 'completed';
    });
  }, [summaryStudentSessions]);

  const summaryPendingCount = summaryPendingSessions.length;
  const summaryPendingDays = React.useMemo(() => {
    return new Set(summaryPendingSessions.map(s => s.date).filter(Boolean)).size;
  }, [summaryPendingSessions]);

  const summaryCompletedCount = summaryCompletedSessions.length;
  const summaryCompletedDays = React.useMemo(() => {
    return new Set(summaryCompletedSessions.map(s => s.date).filter(Boolean)).size;
  }, [summaryCompletedSessions]);

  const handleAddRow = () => {
    setBulkRows(prev => [...prev, { name: '', email: '', phone: '', dob: '', age: '', level: 'Beginner', swimming_ability: 'Swimmer', days: 3, course_duration: '3 Days Course', start_date: '', end_date: '', instructor_id: '', guests: [] }]);
  };

  const handleDeleteRow = (index) => {
    if (bulkRows.length <= 1) {
      setBulkRows([{ name: '', email: '', phone: '', dob: '', age: '', level: 'Beginner', swimming_ability: 'Swimmer', days: 3, course_duration: '3 Days Course', start_date: '', end_date: '', instructor_id: '', guests: [] }]);
      return;
    }
    setBulkRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddGuest = (parentIdx) => {
    setBulkRows(prev => {
      const next = [...prev];
      const parentRow = { ...next[parentIdx] };
      const currentGuests = Array.isArray(parentRow.guests) ? [...parentRow.guests] : [];
      currentGuests.push({
        name: '',
        dob: '',
        age: '',
        swimming_ability: 'Swimmer',
        level: 'Beginner',
        phone: ''
      });
      parentRow.guests = currentGuests;
      next[parentIdx] = parentRow;
      return next;
    });
  };

  const handleGuestChange = (parentIdx, guestIdx, field, value) => {
    setBulkRows(prev => {
      const next = [...prev];
      const parentRow = { ...next[parentIdx] };
      const currentGuests = Array.isArray(parentRow.guests) ? [...parentRow.guests] : [];
      if (!currentGuests[guestIdx]) return prev;

      const updatedGuest = { ...currentGuests[guestIdx], [field]: value };
      if (field === 'dob') {
        const computed = calculateAge(value);
        updatedGuest.age = computed ? String(computed) : '';
      }
      currentGuests[guestIdx] = updatedGuest;
      parentRow.guests = currentGuests;
      next[parentIdx] = parentRow;
      return next;
    });
  };

  const handleDeleteGuest = (parentIdx, guestIdx) => {
    setBulkRows(prev => {
      const next = [...prev];
      const parentRow = { ...next[parentIdx] };
      const currentGuests = Array.isArray(parentRow.guests) ? [...parentRow.guests] : [];
      parentRow.guests = currentGuests.filter((_, i) => i !== guestIdx);
      next[parentIdx] = parentRow;
      return next;
    });
  };

  const handleBulkChange = (index, field, value) => {
    setBulkRows(prev => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      if (field === 'dob') {
        const computed = calculateAge(value);
        updated.age = computed ? String(computed) : '';
      } else if (field === 'days') {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num > 0) {
          updated.course_duration = `${num} ${num === 1 ? 'Day' : 'Days'} Course`;
          if (updated.start_date) {
            updated.end_date = addDaysToDate(updated.start_date, num);
          }
        } else {
          updated.course_duration = value ? `${value} Days Course` : '';
        }
      } else if (field === 'start_date') {
        const rowDays = parseInt(updated.days, 10);
        if (value && !isNaN(rowDays) && rowDays > 0) {
          updated.end_date = addDaysToDate(value, rowDays);
        } else if (value && updated.end_date) {
          const dBetween = calculateDaysBetween(value, updated.end_date);
          if (dBetween) {
            updated.days = dBetween;
            updated.course_duration = `${dBetween} ${dBetween === 1 ? 'Day' : 'Days'} Course`;
          }
        }
      } else if (field === 'end_date') {
        if (updated.start_date && value) {
          const dBetween = calculateDaysBetween(updated.start_date, value);
          if (dBetween) {
            updated.days = dBetween;
            updated.course_duration = `${dBetween} ${dBetween === 1 ? 'Day' : 'Days'} Course`;
          }
        }
      }
      next[index] = updated;
      return next;
    });
  };

  const handleBulkSubmit = async () => {
    if (saving) return;
    const validRows = bulkRows.filter(r => r.name && r.name.trim() && r.email && r.email.trim());
    if (validRows.length === 0) return;
    setSaving(true);
    try {
      const formatted = validRows.map(r => {
        const rowDays = parseInt(r.days, 10);
        let duration = r.course_duration;
        if (!duration) {
          if (!isNaN(rowDays) && rowDays > 0) {
            duration = `${rowDays} ${rowDays === 1 ? 'Day' : 'Days'} Course`;
          } else if (r.start_date && r.end_date) {
            const diff = calculateDaysBetween(r.start_date, r.end_date);
            duration = diff ? `${diff} ${diff === 1 ? 'Day' : 'Days'} Course` : '3 Days Course';
          } else {
            duration = '3 Days Course';
          }
        }
        const sDate = r.start_date || new Date().toISOString().split('T')[0];
        const eDate = r.end_date || (!isNaN(rowDays) && rowDays > 0 ? addDaysToDate(sDate, rowDays) : addDaysToDate(sDate, 3));

        const cleanedGuests = (r.guests || []).filter(g => g && g.name && g.name.trim()).map(g => ({
          name: g.name.trim(),
          dob: g.dob || '',
          age: g.dob ? (calculateAge(g.dob) || (g.age ? parseInt(g.age) : undefined)) : (g.age ? parseInt(g.age) : undefined),
          swimming_ability: g.swimming_ability || 'Swimmer',
          level: g.level || 'Beginner',
          phone: g.phone || g.whatsapp_number || ''
        }));

        return {
          name: r.name.trim(),
          email: r.email.trim().toLowerCase(),
          whatsapp_number: r.phone || '',
          dob: r.dob || '',
          age: r.dob ? (calculateAge(r.dob) || (r.age ? parseInt(r.age) : undefined)) : (r.age ? parseInt(r.age) : undefined),
          level: r.level || 'Beginner',
          swimming_ability: r.swimming_ability || 'Swimmer',
          start_date: sDate,
          end_date: eDate,
          instructor_id: isCoach ? currentCoachId : null,
          created_by_user_id: currentCoachId || currentUser?.id || undefined,
          course_duration: duration,
          session_time: '',
          staying_at_school: 'Yes',
          school: (isCoach && isCoachFreelance)
            ? 'Individual / Freelance Coach'
            : (coachAffiliatedSchool || activeSchoolName || 'Aquatic Indica Surf School'),
          guests_count: cleanedGuests.length,
          guests_details: cleanedGuests
        };
      });
      const res = await fetch(`${API}/api/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatted)
      });
      if (res.ok) {
        const result = await res.json();
        await fetchStudents();
        if (result.students && result.students.length > 0) {
          const first = result.students[0];
          const baseUrl = window.location.origin;
          const token = first.invite_token || `inv_${Date.now()}`;
          const matchingOriginalRow = formatted.find(f => f.email === first.email);
          setAddedStudentSummary({
            ...first,
            totalImported: result.students.length,
            inviteLink: `${baseUrl}/student-portal?token=${token}`,
            guests_count: matchingOriginalRow ? matchingOriginalRow.guests_count : (first.guests_count || 0),
            guests_details: matchingOriginalRow ? matchingOriginalRow.guests_details : (first.guests_details || [])
          });
          setAddMode('summary');
        } else {
          closeModal();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to import students');
      }
    } catch (err) {
      console.error('Error submitting bulk students:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCSVUpload = (file) => {
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) return;
      
      const headerCols = lines[0].split(',').map(c => c.trim().toLowerCase().replace(/^"|"$/g, ''));
      
      const findIdx = (keywords, fallback) => {
        const idx = headerCols.findIndex(h => keywords.some(k => h.includes(k)));
        return idx !== -1 ? idx : fallback;
      };

      const nameIdx = findIdx(['full name', 'name', 'student'], 0);
      const emailIdx = findIdx(['email'], 1);
      const phoneIdx = findIdx(['phone', 'mobile', 'whatsapp'], 2);
      const dobIdx = findIdx(['birth', 'dob'], 3);
      const swimIdx = findIdx(['swim', 'ability'], -1);
      const levelIdx = findIdx(['level', 'surf'], 4);
      const daysIdx = findIdx(['days', 'course', 'duration'], -1);
      const startIdx = findIdx(['start', 'checkin', 'from'], -1);
      const endIdx = findIdx(['end', 'checkout', 'to'], -1);
      const coachIdx = findIdx(['instructor', 'coach', 'assign'], -1);

      const rows = [];
      const seenEmails = new Set();
      const todayISO = new Date().toISOString().split('T')[0];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const name = (cols[nameIdx] || '').trim();
        const email = (cols[emailIdx] || '').trim().toLowerCase();
        
        if (name && email) {
          if (seenEmails.has(email)) continue; // ignore duplicate in same CSV
          seenEmails.add(email);

          // Calculate age from DOB if given as YYYY-MM-DD or numeric
          let dobVal = '';
          let computedAge = '';
          const dobRaw = dobIdx !== -1 ? (cols[dobIdx] || '').trim() : '';
          if (dobRaw) {
            dobVal = parseDateString(dobRaw);
            const cAge = calculateAge(dobVal);
            if (cAge) computedAge = String(cAge);
            else if (!isNaN(parseInt(dobRaw, 10)) && parseInt(dobRaw, 10) > 0 && parseInt(dobRaw, 10) < 120) {
              computedAge = String(parseInt(dobRaw, 10));
            }
          }

          // Parse Swimming Ability
          let swimVal = 'Swimmer';
          if (swimIdx !== -1 && cols[swimIdx]) {
            const rawSwim = cols[swimIdx].trim().toLowerCase();
            if (rawSwim.includes('non') || rawSwim === 'no' || rawSwim === 'false') {
              swimVal = 'Non-Swimmer';
            } else {
              swimVal = 'Swimmer';
            }
          }

          // Parse Course Days / Duration
          let parsedDays = 3;
          let parsedCourseDuration = '3 Days Course';
          if (daysIdx !== -1 && cols[daysIdx]) {
            const rawDays = cols[daysIdx].trim();
            const match = rawDays.match(/^(\d+)/);
            if (match) {
              parsedDays = parseInt(match[1], 10);
              parsedCourseDuration = `${parsedDays} ${parsedDays === 1 ? 'Day' : 'Days'} Course`;
            } else if (rawDays) {
              parsedCourseDuration = rawDays;
            }
          }

          // Parse Start Date and End Date
          let startDate = startIdx !== -1 && cols[startIdx] ? parseDateString(cols[startIdx]) : '';
          if (!startDate) startDate = todayISO;

          let endDate = endIdx !== -1 && cols[endIdx] ? parseDateString(cols[endIdx]) : '';
          if (!endDate) {
            endDate = addDaysToDate(startDate, parsedDays);
          } else if (daysIdx === -1) {
            const diff = calculateDaysBetween(startDate, endDate);
            if (diff) {
              parsedDays = diff;
              parsedCourseDuration = `${diff} ${diff === 1 ? 'Day' : 'Days'} Course`;
            }
          }

          // Match instructor by name if provided
          let instructor_id = '';
          let instructor_name = '';
          const coachQuery = coachIdx !== -1 ? (cols[coachIdx] || '').toLowerCase().trim() : '';
          if (coachQuery && Array.isArray(instructors) && instructors.length > 0) {
            const matched = instructors.find(ins => {
              const iname = (ins.name || '').toLowerCase().trim();
              return iname === coachQuery || iname.includes(coachQuery) || coachQuery.includes(iname);
            });
            if (matched) {
              instructor_id = matched.id;
              instructor_name = matched.name;
            } else {
              instructor_name = cols[coachIdx] || '';
            }
          }

          rows.push({
            name: name,
            email: email,
            phone: phoneIdx !== -1 ? (cols[phoneIdx] || '') : '',
            dob: dobVal,
            age: computedAge,
            level: levelIdx !== -1 && cols[levelIdx] ? cols[levelIdx] : 'Beginner',
            swimming_ability: swimVal,
            days: parsedDays,
            course_duration: parsedCourseDuration,
            start_date: startDate,
            end_date: endDate,
            instructor_id: instructor_id,
            instructor_name: instructor_name,
            guests: []
          });
        }
      }
      if (rows.length > 0) {
        setBulkRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const downloadCSVSample = () => {
    const headers = [
      "Full Name",
      "Email Address",
      "Phone Number",
      "Date of Birth",
      "Swimming Ability",
      "Surf Level",
      "Course Days",
      "Start Date",
      "End Date"
    ];

    const sampleRows = [
      ["Liam Torres", "liam.torres@gmail.com", "+1 555-123-4567", "1998-05-22", "Swimmer", "Intermediate", "3", "2026-10-01", "2026-10-03"],
      ["Maya Chen", "maya.chen@yahoo.com", "+1 555-987-6543", "2001-11-08", "Non-Swimmer", "Beginner", "5", "2026-10-05", "2026-10-09"],
      ["Carlos Silva", "carlos.surf@hotmail.com", "+1 555-456-7890", "1995-03-14", "Swimmer", "Advanced", "7", "2026-10-10", "2026-10-16"]
    ];

    const allData = [headers, ...sampleRows];

    const csvContent = "\uFEFF" + allData.map(row =>
      row.map(field => {
        const val = String(field ?? '');
        if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",")
    ).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_import_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [inviteCopied, setInviteCopied] = useState(false);

  const handleCopyStudentInviteLink = () => {
    const savedUser = sessionStorage.getItem('user');
    let schoolName = 'Aquatic Indica Surf School';
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.school) schoolName = u.school;
        else if (u.name && (u.role === 'school' || u.role === 'admin')) schoolName = u.name;
      } catch (e) {}
    }

    const link = `${window.location.origin}/auth?mode=signup&school=${encodeURIComponent(schoolName)}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link);
    } else {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 3500);
  };

  const [showPendingModal, setShowPendingModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  // In-App Confirmation Dialog State (Replaces native browser window.confirm)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: 'Confirm Action',
    message: '',
    confirmText: 'Remove',
    cancelText: 'Cancel',
    isDanger: true,
    onConfirm: null
  });

  const showConfirm = (title, message, onConfirm, confirmText = 'Remove', isDanger = true) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      isDanger,
      onConfirm
    });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteStudent = (studentId, studentName, studentEmail) => {
    showConfirm(
      'Remove Student',
      `Are you sure you want to remove student "${studentName || 'this student'}"?`,
      async () => {
        closeConfirm();
        try {
          if (studentId) {
            await fetch(`${API}/api/students/${studentId}`, { method: 'DELETE' }).catch(() => {});
          }
          setStudents(prev => prev.filter(s => s.id !== studentId && (s.email || '').toLowerCase().trim() !== (studentEmail || '').toLowerCase().trim()));
          showToast(`Student "${studentName}" removed.`);
        } catch (err) {
          console.error('Failed to delete student:', err);
        }
      }
    );
  };

  // Set of emails that are already active/approved in the roster
  const approvedEmailsSet = new Set(
    (approvedStudents || []).map(s => String(s.email).toLowerCase().trim()).filter(Boolean)
  );

  // Comprehensive Pending Students List from AWS Backend
  const allPendingRequests = useMemo(() => {
    try {
      const seenEmails = new Set();
      const pending = [];

      const addIfPending = (email, name, schoolName, startDate, sessionTime, phone, id, courseDuration, stayingAtSchool, extra = {}) => {
        const emailLower = (email || '').toLowerCase().trim();
        if (!emailLower || seenEmails.has(emailLower)) return;

        // If student is ALREADY approved and present in the active table, do not show in pending
        if (approvedEmailsSet.has(emailLower)) return;

        // Check if student was explicitly approved or rejected
        const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
        const req = reqs.find(r => (r.student_email || r.email || '').toLowerCase().trim() === emailLower);
        if (req && (req.status === 'approved' || req.status === 'rejected')) return;

        // Check school match
        const targetSchool = schoolName || req?.school_name || req?.school || 'Aquatic Indica Surf School';
        if (activeSchoolName && !isDefaultSchool) {
          const normTarget = (targetSchool || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const normActive = (activeSchoolName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normTarget && normActive && !normTarget.includes(normActive) && !normActive.includes(normTarget)) {
            return;
          }
        }

        seenEmails.add(emailLower);
        pending.push({
          id: id || req?.id || `req_${emailLower}`,
          student_id: id || req?.student_id,
          student_name: name || req?.student_name || req?.name || emailLower.split('@')[0],
          student_email: emailLower,
          school_name: targetSchool,
          start_date: startDate || req?.start_date || new Date().toISOString().split('T')[0],
          session_time: sessionTime || req?.session_time || '',
          whatsapp_number: phone || req?.whatsapp_number || req?.phone || 'N/A',
          course_duration: courseDuration || req?.course_duration || '3 Days Course',
          staying_at_school: stayingAtSchool || req?.staying_at_school || 'Yes',
          level: extra.level || req?.level || 'Beginner',
          swimming_ability: extra.swimming_ability || req?.swimming_ability || 'Swimmer',
          dob: extra.dob || req?.dob || '',
          guests_count: extra.guests_count || req?.guests_count || 0,
          guests_details: extra.guests_details || req?.guests_details || [],
          status: 'pending'
        });
      };

      // 1. From backend students list if approval_status === 'pending'
      (students || []).forEach(s => {
        if (!s || !s.email) return;
        if (s.approval_status === 'pending') {
          addIfPending(
            s.email, s.name, s.school, s.start_date, s.session_time,
            s.whatsapp_number, s.id, s.course_duration, s.staying_at_school,
            { level: s.level, swimming_ability: s.swimming_ability, dob: s.dob, guests_count: s.guests_count, guests_details: s.guests_details }
          );
        }
      });

      // 2. From school_join_requests
      const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
      reqs.forEach(r => {
        if (r.status !== 'approved' && r.status !== 'rejected') {
          addIfPending(
            r.student_email || r.email,
            r.student_name || r.name,
            r.school_name || r.school,
            r.start_date,
            r.session_time,
            r.whatsapp_number,
            r.student_id || r.id,
            r.course_duration,
            r.staying_at_school,
            { level: r.level, swimming_ability: r.swimming_ability, dob: r.dob, guests_count: r.guests_count, guests_details: r.guests_details }
          );
        }
      });

      // 3. From savedAccounts (stored during athlete registration)
      const savedAccs = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
      savedAccs.forEach(u => {
        if (!u || !u.email) return;
        if (u.role && u.role !== 'athlete' && u.role !== 'student' && u.role !== 'Athlete') return;
        if (u.approval_status === 'pending') {
          addIfPending(
            u.email, u.name, u.school, u.start_date, u.session_time,
            u.whatsapp_number || u.phone, u.student_id || u.id,
            u.course_duration, u.staying_at_school,
            { level: u.level, swimming_ability: u.swimming_ability, dob: u.dob, guests_count: u.guests_count, guests_details: u.guests_details }
          );
        }
      });

      // 4. From mock_students_data
      const mockStudents = JSON.parse(localStorage.getItem('mock_students_data') || '[]');
      mockStudents.forEach(u => {
        if (!u || !u.email) return;
        if (u.approval_status === 'pending') {
          addIfPending(
            u.email, u.name, u.school, u.start_date, u.session_time,
            u.whatsapp_number || u.phone, u.student_id || u.id,
            u.course_duration, u.staying_at_school,
            { level: u.level, swimming_ability: u.swimming_ability, dob: u.dob, guests_count: u.guests_count, guests_details: u.guests_details }
          );
        }
      });

      // 5. From current session user if athlete and pending
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (sessionUser && sessionUser.email && (sessionUser.role === 'athlete' || sessionUser.role === 'student' || sessionUser.role === 'Athlete')) {
          if (sessionUser.approval_status === 'pending') {
            addIfPending(
              sessionUser.email, sessionUser.name, sessionUser.school, sessionUser.start_date, sessionUser.session_time,
              sessionUser.whatsapp_number || sessionUser.phone, sessionUser.student_id || sessionUser.id,
              sessionUser.course_duration, sessionUser.staying_at_school,
              { level: sessionUser.level, swimming_ability: sessionUser.swimming_ability, dob: sessionUser.dob, guests_count: sessionUser.guests_count, guests_details: sessionUser.guests_details }
            );
          }
        }
      } catch (e) {}

      return pending;
    } catch (e) {
      return [];
    }
  }, [reqRefreshKey, students, approvedStudents, approvedEmailsSet, activeSchoolName, isDefaultSchool]);

  const handleApproveStudentRequest = async (reqId, studentEmail) => {
    try {
      const emailLower = (studentEmail || '').toLowerCase().trim();
      const targetReq = allPendingRequests.find(r => 
        (r.student_id && String(r.student_id) === String(reqId)) ||
        (r.id && String(r.id) === String(reqId)) ||
        (r.student_email && r.student_email.toLowerCase().trim() === emailLower) ||
        (r.email && r.email.toLowerCase().trim() === emailLower)
      );

      // If student record doesn't exist in backend, create it
      const studentExists = students.some(s => s.email && s.email.toLowerCase().trim() === emailLower);
      if (!studentExists && targetReq) {
        try {
          const createRes = await fetch(`${API}/api/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: targetReq.student_name || targetReq.name || (emailLower.split('@')[0]),
              email: emailLower,
              level: targetReq.level || 'Beginner',
              whatsapp_number: targetReq.whatsapp_number || '',
              course_duration: targetReq.course_duration || '3 Days Course',
              session_time: targetReq.session_time || '',
              start_date: targetReq.start_date || new Date().toISOString().split('T')[0],
              staying_at_school: targetReq.staying_at_school || 'Yes',
              school: targetReq.school_name || activeSchoolName || 'Aquatic Indica Surf School',
              approval_status: 'approved'
            })
          });
          if (createRes.ok) {
            const createdData = await createRes.json();
            if (createdData && createdData.id) {
              reqId = createdData.id;
            }
          }
        } catch (e) {}
      }

      if (typeof reqId === 'number' || (!isNaN(reqId) && !String(reqId).startsWith('req_'))) {
        await fetch(`${API}/api/students/${reqId}/approve`, { method: 'POST' }).catch(() => {});
      }
      if (emailLower) {
        await fetch(`${API}/api/students/approve-by-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailLower })
        }).catch(() => {});
      }

      fetchStudents();

      // Upsert approved status into school_join_requests & localStorage
      const allSavedReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
      let found = false;
      const updatedReqs = allSavedReqs.map(r => {
        if (r.id === reqId || ((r.student_email || r.email) && (r.student_email || r.email).toLowerCase().trim() === emailLower)) {
          found = true;
          return { ...r, status: 'approved' };
        }
        return r;
      });

      if (!found && emailLower) {
        updatedReqs.push({
          id: reqId || `req_${Date.now()}`,
          student_id: reqId,
          student_email: emailLower,
          student_name: targetReq?.student_name || emailLower.split('@')[0],
          school_name: targetReq?.school_name || activeSchoolName || 'Aquatic Indica Surf School',
          status: 'approved'
        });
      }

      localStorage.setItem('school_join_requests', JSON.stringify(updatedReqs));

      // Also mark savedAccounts + mock_students_data as approved
      try {
        const savedAccounts = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
        const updatedAccounts = savedAccounts.map(a => 
          a.email && a.email.toLowerCase().trim() === emailLower ? { ...a, approval_status: 'approved' } : a
        );
        localStorage.setItem('savedAccounts', JSON.stringify(updatedAccounts));
      } catch (e) {}
      try {
        const mockStudents = JSON.parse(localStorage.getItem('mock_students_data') || '[]');
        const updatedMock = mockStudents.map(a => 
          a.email && a.email.toLowerCase().trim() === emailLower ? { ...a, approval_status: 'approved' } : a
        );
        localStorage.setItem('mock_students_data', JSON.stringify(updatedMock));
      } catch (e) {}

      // If current logged-in user in sessionStorage is this athlete, update their session too
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (sessionUser.email && sessionUser.email.toLowerCase().trim() === emailLower) {
          sessionUser.approval_status = 'approved';
          sessionStorage.setItem('user', JSON.stringify(sessionUser));
        }
      } catch (e) {}

      fetchStudents();
      setReqRefreshKey(k => k + 1);
      showToast(`✅ Approved ${targetReq?.student_name || studentEmail || 'student'}! Added to My Students.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectStudentRequest = (reqId, studentEmail) => {
    showConfirm(
      'Decline Request',
      `Decline registration request for ${studentEmail || 'student'}?`,
      () => {
        closeConfirm();
        const emailLower = (studentEmail || '').toLowerCase().trim();
        setStudents(prev => prev.filter(s => s.id !== reqId && (s.email && s.email.toLowerCase().trim() !== emailLower)));
        
        const allReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
        let found2 = false;
        const updatedReqs2 = allReqs.map(r => {
          if (r.id === reqId || ((r.student_email || r.email) && (r.student_email || r.email).toLowerCase().trim() === emailLower)) {
            found2 = true;
            return { ...r, status: 'rejected' };
          }
          return r;
        });
        if (!found2 && emailLower) {
          updatedReqs2.push({ id: reqId || `req_${Date.now()}`, student_id: reqId, student_email: emailLower, status: 'rejected' });
        }
        localStorage.setItem('school_join_requests', JSON.stringify(updatedReqs2));

        try {
          const savedAccounts = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
          const updatedAccounts = savedAccounts.map(a => 
            a.email && a.email.toLowerCase().trim() === emailLower ? { ...a, approval_status: 'rejected' } : a
          );
          localStorage.setItem('savedAccounts', JSON.stringify(updatedAccounts));
        } catch (e) {}

        try {
          const mockStudents = JSON.parse(localStorage.getItem('mock_students_data') || '[]');
          const updatedMock = mockStudents.map(a => 
            a.email && a.email.toLowerCase().trim() === emailLower ? { ...a, approval_status: 'rejected' } : a
          );
          localStorage.setItem('mock_students_data', JSON.stringify(updatedMock));
        } catch (e) {}

        setReqRefreshKey(k => k + 1);
        showToast(`❌ Declined request for ${studentEmail || 'student'}.`);
      }
    );
  };

  const fetchSchoolInvites = async () => {
    try {
      const res = await fetch(`${API}/api/school-invites?school=${encodeURIComponent(effectiveSchool)}`);
      if (res.ok) {
        const data = await res.json();
        setSchoolInvitesList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      try {
        const saved = JSON.parse(localStorage.getItem('local_school_invites') || '[]');
        setSchoolInvitesList(saved.filter(i => (i.school || '').toLowerCase() === effectiveSchoolLower));
      } catch (e) {}
    }
  };

  const handleCreateSchoolInvite = async () => {
    const count = parseInt(inviteCapacityCount) || 1;
    if (count < 1) {
      showToast('Please enter a capacity count of at least 1');
      return;
    }
    if (!canCreateInviteLink) {
      showToast('Only School Admins can create invite links');
      return;
    }
    let chosenDuration = inviteCourseDuration || '3 Days Course';
    const matchNum = String(chosenDuration).match(/^(\d+)/);
    if (matchNum) {
      const n = parseInt(matchNum[1], 10);
      chosenDuration = n === 1 ? '1 Day Crash Course' : `${n} Days Course`;
    }
    setSchoolInviteLoading(true);
    try {
      const res = await fetch(`${API}/api/school-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school: effectiveSchool,
          max_count: count,
          course_duration: chosenDuration
        })
      });
      if (res.ok) {
        const data = await res.json();
        const origin = window.location.origin;
        const dur = data.course_duration || chosenDuration;
        const fullUrl = `${origin}/auth?mode=signup&invite_code=${data.code}&school=${encodeURIComponent(data.school)}&course_duration=${encodeURIComponent(dur)}`;
        const newInviteObj = { ...data, course_duration: dur, fullUrl };
        setCreatedSchoolInvite(newInviteObj);
        setSchoolInvitesList(prev => [newInviteObj, ...prev]);

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(fullUrl);
        }
        setCopiedSchoolInviteCode(data.code);
        showToast(`✓ Invite link for ${count} student(s) (${dur}) copied to clipboard!`);
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to generate invite link');
      }
    } catch (err) {
      // Local fallback
      const mockCode = `inv_${Date.now().toString(36)}`;
      const origin = window.location.origin;
      const fullUrl = `${origin}/auth?mode=signup&invite_code=${mockCode}&school=${encodeURIComponent(effectiveSchool)}&course_duration=${encodeURIComponent(chosenDuration)}`;
      const newInviteObj = {
        id: Date.now(),
        code: mockCode,
        school: effectiveSchool,
        max_count: count,
        course_duration: chosenDuration,
        used_count: 0,
        remaining: count,
        is_active: true,
        created_at: new Date().toISOString(),
        fullUrl
      };
      try {
        const saved = JSON.parse(localStorage.getItem('local_school_invites') || '[]');
        saved.unshift(newInviteObj);
        localStorage.setItem('local_school_invites', JSON.stringify(saved));
      } catch (e) {}
      setCreatedSchoolInvite(newInviteObj);
      setSchoolInvitesList(prev => [newInviteObj, ...prev]);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      }
      setCopiedSchoolInviteCode(mockCode);
      showToast(`✓ Invite link for ${count} student(s) (${chosenDuration}) copied to clipboard!`);
    } finally {
      setSchoolInviteLoading(false);
    }
  };

  const copySchoolInviteLink = async (inv) => {
    const origin = window.location.origin;
    const durParam = inv.course_duration ? `&course_duration=${encodeURIComponent(inv.course_duration)}` : '';
    const link = inv.fullUrl || `${origin}/auth?mode=signup&invite_code=${inv.code}&school=${encodeURIComponent(inv.school || effectiveSchool)}${durParam}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(link);
    }
    setCopiedSchoolInviteCode(inv.code);
    showToast('✓ Invite link copied to clipboard!');
    setTimeout(() => setCopiedSchoolInviteCode(null), 3000);
  };


  return (

    <div className="sm-page">
      <Sidebar />
      <main className="sm-main">
        {/* Header */}
        <header className="sm-header">
          <div className="sm-header-text">
            <h1 className="sm-title">Students ({loading ? '…' : approvedStudents.length})</h1>
            <p className="sm-sub">Manage your student body and track their progression across badge levels.</p>
          </div>
          <div className="sm-actions">
            {canManagePendingRequests && (
              <button 
                className="sm-btn-secondary"
                onClick={() => {
                  setReqRefreshKey(k => k + 1);
                  fetchStudents();
                  setShowPendingModal(true);
                }}
                style={{
                  background: allPendingRequests.length > 0 ? '#FFFBEB' : '#FFFFFF',
                  color: allPendingRequests.length > 0 ? '#D97706' : '#0F172A',
                  border: allPendingRequests.length > 0 ? '1.5px solid #FCD34D' : '1px solid #CBD5E1',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative'
                }}
                title="Review pending student registration requests"
              >
                <span>📩 Pending Requests</span>
                {allPendingRequests.length > 0 && (
                  <span style={{ background: '#EF4444', color: '#FFF', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 800 }}>
                    {allPendingRequests.length}
                  </span>
                )}
              </button>
            )}


            {canCreateInviteLink && (
              <button
                className="sm-btn-secondary"
                onClick={() => {
                  fetchSchoolInvites();
                  setShowSchoolInviteModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#F0FDF4',
                  color: '#15803D',
                  border: '1.5px solid #BBF7D0',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Create and share student registration link with capacity limit"
              >
                <span style={{ fontSize: '15px' }}>🔗</span>
                <span>Invite Link</span>
              </button>
            )}
            <button className="sm-btn-secondary" onClick={downloadCSVSample}>Export CSV</button>
            {canAddStudent && (
              <button className="sm-btn-primary" onClick={() => { setShowModal(true); setAddMode('single'); }}>+ Add Student</button>
            )}
          </div>
        </header>

        {/* Pending Requests Modal — Spacious, Enlarged Table Row UI */}
        {showPendingModal && canManagePendingRequests && (
          <div className="sm-modal-overlay" onClick={() => setShowPendingModal(false)}>
            <div
              className="sm-modal sm-add-student-modal"
              style={{ maxWidth: '1400px', width: '96%', maxHeight: '92vh', overflowY: 'auto', padding: '28px 32px' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sm-modal-header" style={{ marginBottom: '22px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 className="sm-modal-title" style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Pending Registration Requests
                    </h3>
                    <span style={{
                      background: '#FEF3C7',
                      color: '#B45309',
                      border: '1px solid #FCD34D',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: '20px',
                      letterSpacing: '0.4px'
                    }}>
                      {allPendingRequests.length} PENDING
                    </span>
                  </div>
                  <p className="sm-modal-sub" style={{ color: '#64748B', fontSize: '14px', margin: '6px 0 0 0' }}>
                    Review online student registrations and approve them directly into your active roster.
                  </p>
                </div>
                <button className="sm-modal-close" onClick={() => setShowPendingModal(false)} style={{ width: '38px', height: '38px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* List of Requests in Table Rows or Empty State */}
              {allPendingRequests.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '70px 20px',
                  background: '#F8FAFC',
                  borderRadius: '16px',
                  border: '1.5px dashed #CBD5E1',
                  marginTop: '10px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎉</div>
                  <h4 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                    All Caught Up!
                  </h4>
                  <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748B' }}>
                    No pending registration requests waiting for review at this moment.
                  </p>
                </div>
              ) : (
                <div style={{
                  overflowX: 'auto',
                  borderRadius: '14px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                        <th style={{ padding: '16px 16px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left', minWidth: '220px' }}>Student</th>
                        <th style={{ padding: '16px 14px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left', minWidth: '220px' }}>Contact</th>
                        <th style={{ padding: '16px 14px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left', minWidth: '120px' }}>DOB / Age</th>
                        <th style={{ padding: '16px 14px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left', minWidth: '120px' }}>Surf Level</th>
                        <th style={{ padding: '16px 14px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left', minWidth: '135px' }}>Swimming</th>
                        <th style={{ padding: '16px 14px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left', minWidth: '140px' }}>Course Duration</th>
                        <th style={{ padding: '16px 14px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left', minWidth: '130px' }}>Start Date</th>
                        <th style={{ padding: '16px 14px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'left', minWidth: '110px' }}>Guests</th>
                        <th style={{ padding: '16px 16px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', textAlign: 'center', minWidth: '210px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPendingRequests.map((req, rIdx) => {
                        const studentName = req.student_name || req.name || 'Student';
                        const initials = studentName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ST';
                        const guestList = parseGuestsArray(req.guests_details);
                        const guestCount = req.guests_count || guestList.length;

                        return (
                          <React.Fragment key={req.id || req.student_email || rIdx}>
                            <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                              {/* 1. Student Name & School */}
                              <td style={{ padding: '18px 16px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                  <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    fontWeight: 800,
                                    boxShadow: '0 3px 8px rgba(13,148,136,0.28)',
                                    flexShrink: 0
                                  }}>
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                                      {studentName}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#D97706', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span>🏫</span>
                                      <span>{req.school_name || req.school || 'Aquatic Indica Surf School'}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Contact */}
                              <td style={{ padding: '18px 14px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', wordBreak: 'break-all' }}>
                                    ✉️ {req.student_email || req.email || '—'}
                                  </span>
                                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
                                    📱 {req.whatsapp_number && req.whatsapp_number !== 'N/A' ? `+91 ${req.whatsapp_number}` : 'N/A'}
                                  </span>
                                </div>
                              </td>

                              {/* 3. DOB & Age */}
                              <td style={{ padding: '18px 14px', verticalAlign: 'middle' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                                  {req.dob || '—'}
                                </div>
                                {(calculateAge(req.dob) || req.age) && (
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    color: '#0D9488',
                                    fontWeight: 700,
                                    background: 'rgba(13,148,136,0.1)',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    marginTop: '3px'
                                  }}>
                                    {calculateAge(req.dob) || req.age} yrs
                                  </span>
                                )}
                              </td>

                              {/* 4. Surf Level */}
                              <td style={{ padding: '18px 14px', verticalAlign: 'middle' }}>
                                <span className="sm-summary-teal-badge" style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '6px' }}>
                                  {(req.level || 'Beginner').toUpperCase()}
                                </span>
                              </td>

                              {/* 5. Swimming */}
                              <td style={{ padding: '18px 14px', verticalAlign: 'middle' }}>
                                {(req.swimming_ability || 'Swimmer').toLowerCase().includes('non') ? (
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                    🤿 Non-Swimmer
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D9488', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                    🏊 Swimmer
                                  </span>
                                )}
                              </td>

                              {/* 6. Course Duration */}
                              <td style={{ padding: '18px 14px', verticalAlign: 'middle' }}>
                                <strong style={{ color: '#0D9488', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                  🏄 {req.course_duration || '3 Days Course'}
                                </strong>
                              </td>

                              {/* 7. Start Date */}
                              <td style={{ padding: '18px 14px', verticalAlign: 'middle' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                  🗓️ {req.start_date || 'Flexible'}
                                </div>
                                {req.session_time && (
                                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                                    {req.session_time}
                                  </div>
                                )}
                              </td>

                              {/* 8. Accompanying Guests */}
                              <td style={{ padding: '18px 14px', verticalAlign: 'middle' }}>
                                {guestCount > 0 ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: '#E0F2FE',
                                    color: '#0284C7',
                                    border: '1px solid #BAE6FD',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    👥 {guestCount} Guest{guestCount > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94A3B8', fontSize: '13px' }}>—</span>
                                )}
                              </td>

                              {/* 9. Actions (Decline / Accept buttons side-by-side with full visibility) */}
                              <td style={{ padding: '18px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleRejectStudentRequest(req.student_id || req.id, req.student_email || req.email);
                                      if (allPendingRequests.length <= 1) setShowPendingModal(false);
                                    }}
                                    style={{
                                      background: '#FEF2F2',
                                      color: '#EF4444',
                                      border: '1.5px solid #FECACA',
                                      borderRadius: '9px',
                                      padding: '8px 16px',
                                      fontWeight: 700,
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                                    title="Decline request"
                                  >
                                    <span>✕</span>
                                    <span>Decline</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleApproveStudentRequest(req.student_id || req.id, req.student_email || req.email);
                                      if (allPendingRequests.length <= 1) setShowPendingModal(false);
                                    }}
                                    className="sm-btn-primary"
                                    style={{
                                      background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: '9px',
                                      padding: '8px 20px',
                                      fontWeight: 800,
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 3px 10px rgba(13, 148, 136, 0.3)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    title="Accept and enroll student"
                                  >
                                    <span>✓</span>
                                    <span>Accept</span>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Sub-row for Accompanying Guests if any */}
                            {guestCount > 0 && (
                              <tr key={`guest-row-${rIdx}`} style={{ background: '#F8FAFC' }}>
                                <td colSpan={9} style={{ padding: '10px 18px 14px 28px', borderBottom: '2px solid #CBD5E1' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0369A1' }}>
                                      👥 Accompanying Guests ({guestCount}) for {studentName}:
                                    </span>
                                    {guestList.length > 0 ? (
                                      guestList.map((g, gIdx) => (
                                        <span key={gIdx} style={{
                                          fontSize: '12px',
                                          fontWeight: 600,
                                          background: '#FFFFFF',
                                          color: '#0369A1',
                                          border: '1px solid #BAE6FD',
                                          borderRadius: '6px',
                                          padding: '3px 10px'
                                        }}>
                                          {g.name || `Guest #${gIdx + 1}`} ({g.level || 'Beginner'})
                                        </span>
                                      ))
                                    ) : (
                                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                                        {guestCount} Guest(s) attached to this registration
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}



        {/* Toast notification */}
        {toastMsg && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#0F172A', color: '#FFF', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, zIndex: 9999, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: '1px solid #334155' }}>
            {toastMsg}
          </div>
        )}



        {/* Filters */}
        <div className="sm-filters">

          <div className="sm-search-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search students by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm-search-input"
            />
          </div>
          {/* 1. Calendar Date Picker */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <input
              type="date"
              className="sm-select"
              value={dateFilter === 'All' ? '' : dateFilter}
              onChange={e => setDateFilter(e.target.value || 'All')}
              style={{
                cursor: 'pointer',
                paddingRight: dateFilter !== 'All' ? '28px' : '10px',
                fontWeight: dateFilter !== 'All' ? 700 : 500,
                color: dateFilter !== 'All' ? '#0D9488' : '#334155',
                borderColor: dateFilter !== 'All' ? '#0D9488' : '#CBD5E1',
                background: dateFilter !== 'All' ? '#E6F9F5' : '#FFFFFF'
              }}
              title="Click to select date from calendar"
            />
            {dateFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setDateFilter('All')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#0D9488',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  lineHeight: 1
                }}
                title="Clear date filter (Show All Dates)"
              >
                ✕
              </button>
            )}
          </div>

          {/* 2. Swimming Ability Filter */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              className="sm-select"
              value={swimmingFilter}
              onChange={e => setSwimmingFilter(e.target.value)}
              style={{
                cursor: 'pointer',
                fontWeight: swimmingFilter !== 'All' ? 700 : 500,
                color: swimmingFilter !== 'All' ? (swimmingFilter === 'Non-Swimmer' ? '#D97706' : '#0D9488') : '#334155',
                borderColor: swimmingFilter !== 'All' ? (swimmingFilter === 'Non-Swimmer' ? '#F59E0B' : '#0D9488') : '#CBD5E1',
                background: swimmingFilter !== 'All' ? (swimmingFilter === 'Non-Swimmer' ? '#FFFBEB' : '#E6F9F5') : '#FFFFFF',
                borderRadius: '10px',
                padding: '9px 14px',
                fontSize: '13px'
              }}
              title="Filter by Swimmer or Non-Swimmer"
            >
              <option value="All">🏊 All Swimming (Any)</option>
              <option value="Swimmer">🏊 Swimmer Only</option>
              <option value="Non-Swimmer">🤿 Non-Swimmer Only</option>
            </select>
          </div>
        </div>



        {/* Stats */}
        <div className="sm-stats-grid">
          {stats.map(s => (
            <div
              key={s.label}
              className={`sm-stat-card ${s.active ? 'sm-stat-active' : ''}`}
              onClick={() => handleStatClick(s.label)}
              title={`Click to filter by ${s.label}`}
            >
              <span className="sm-stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="sm-stat-label">
                <span className="sm-label-full">{s.label}</span>
                <span className="sm-label-short">{s.shortLabel || s.label}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="sm-table-container">
          {loading ? (
            <div className="sm-loading"><div className="sm-spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="sm-empty-state-card">
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>🏄‍♂️</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                {students.length === 0 ? 'No students yet' : 'No students match your search'}
              </div>
              <p style={{ margin: '0 auto 16px', fontSize: '13px', color: '#64748B', maxWidth: '340px', lineHeight: '1.4' }}>
                {students.length === 0 ? 'Add your first student to get started.' : 'Try changing your search query or clearing filters.'}
              </p>
              {students.length === 0 ? (
                canAddStudent ? (
                  <button
                    className="sm-btn-primary"
                    style={{ margin: '0 auto', height: '36px', padding: '6px 16px', fontSize: '12.5px' }}
                    onClick={() => { setShowModal(true); setAddMode('single'); }}
                  >
                    + Add Student
                  </button>
                ) : null
              ) : (
                <button
                  className="sm-btn-secondary"
                  style={{ margin: '0 auto', height: '36px', padding: '6px 16px', fontSize: '12.5px' }}
                  onClick={() => { setSearch(''); setDateFilter('All'); setSwimmingFilter('All'); setLevelFilter('All'); setActiveStatFilter('TOTAL'); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="sm-mobile-scroll-hint">
                <span>👉 Swipe horizontally on the table to view students & actions</span>
              </div>
              <table className="sm-table">
              <thead>
                <tr>
                  <th>Student & WhatsApp</th>
                  <th>Course Progress</th>
                  <th>Date</th>
                  <th>Invite</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #E2E8F0', cursor: 'pointer' }}
                    onClick={() => navigate(`/students/${s.id}`)}
                  >
                    <td>
                      <div className="sm-student-info">
                        {s.image && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791') ? (
                          <img
                            src={s.image}
                            alt={s.name}
                            className="sm-student-avatar"
                            onError={e => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement.querySelector('.sm-avatar-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="sm-avatar-fallback"
                          style={{
                            display: (s.image && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791')) ? 'none' : 'flex',
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                            color: '#FFFFFF',
                            fontWeight: '800',
                            fontSize: '15px',
                            fontFamily: 'Outfit, sans-serif',
                            flexShrink: 0
                          }}
                        >
                          {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <div className="sm-student-name">{s.name}</div>
                            {s.swimming_ability?.toLowerCase() === 'non-swimmer' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: '5px' }}>
                                🤿 Non-Swimmer
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 700, color: '#0D9488', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: '5px' }}>
                                🏊 Swimmer
                              </span>
                            )}
                          </div>
                          <div className="sm-student-email">
                            {s.whatsapp_number ? `📱 +91 ${s.whatsapp_number}` : s.email}
                          </div>
                          {(() => {
                            const guestList = getStudentGuestsDetails(s);
                            // Inga guest illathavangalukku ethuvume kaatta koodathu
                            if (!guestList || guestList.length === 0) {
                              return null;
                            }

                            const isExpanded = expandedGuestStudentId === s.id;

                            return (
                              <div style={{ marginTop: '5px' }}>
                                {/* Dropdown Toggle Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGuestDropdown(s.id);
                                  }}
                                  title={isExpanded ? "Click to hide guest details" : "Click to view guest details"}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: isExpanded ? '#0369A1' : '#0284C7',
                                    background: isExpanded ? '#E0F2FE' : '#F0F9FF',
                                    border: `1px solid ${isExpanded ? '#38BDF8' : '#BAE6FD'}`,
                                    padding: '2.5px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isExpanded ? '0 1px 4px rgba(2, 132, 199, 0.15)' : 'none'
                                  }}
                                >
                                  <span>👥</span>
                                  <span>{guestList.length} {guestList.length === 1 ? 'Guest' : 'Guests'}</span>
                                  <span style={{
                                    fontSize: '9px',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                    display: 'inline-block',
                                    color: isExpanded ? '#0369A1' : '#0284C7'
                                  }}>
                                    ▼
                                  </span>
                                </button>

                                {/* Perfectly Aligned Straight-Line Grid (Shown on Dropdown) */}
                                {isExpanded && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      marginTop: '6px',
                                      padding: '8px 12px',
                                      background: '#F8FAFC',
                                      border: '1px solid #E2E8F0',
                                      borderLeft: '3.5px solid #0284C7',
                                      borderRadius: '6px',
                                      display: 'inline-grid',
                                      gridTemplateColumns: 'max-content max-content max-content max-content max-content',
                                      columnGap: '14px',
                                      rowGap: '6px',
                                      alignItems: 'center',
                                      maxWidth: '100%',
                                      overflowX: 'auto'
                                    }}
                                  >
                                    {guestList.map((g, gIdx) => {
                                      const gName = g.name || `Guest #${gIdx + 1}`;
                                      const gPhone = g.whatsapp_number || g.phone;
                                      const gAge = g.age || calculateAge(g.dob);

                                      return (
                                        <div key={gIdx} style={{ display: 'contents' }}>
                                          {/* Col 1: Fixed Badge */}
                                          <span style={{
                                            fontWeight: 700,
                                            color: '#0284C7',
                                            background: '#F0F9FF',
                                            border: '1px solid #BAE6FD',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10.5px',
                                            whiteSpace: 'nowrap'
                                          }}>
                                            👥 Guest {gIdx + 1}:
                                          </span>

                                          {/* Col 2: Name */}
                                          <span style={{
                                            fontWeight: 700,
                                            color: '#0F172A',
                                            fontSize: '11.5px',
                                            whiteSpace: 'nowrap'
                                          }}>
                                            {gName}
                                          </span>

                                          {/* Col 3: Gender & Age & Level */}
                                          <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontSize: '11px',
                                            color: '#64748B',
                                            whiteSpace: 'nowrap'
                                          }}>
                                            {g.gender && <span>{g.gender}</span>}
                                            {gAge ? <span>• {gAge} yrs</span> : null}
                                            {g.level && (
                                              <span style={{
                                                fontSize: '9.5px',
                                                fontWeight: 700,
                                                background: '#ECFDF5',
                                                color: '#065F46',
                                                border: '1px solid #A7F3D0',
                                                padding: '1px 5px',
                                                borderRadius: '3px'
                                              }}>
                                                {g.level}
                                              </span>
                                            )}
                                          </div>

                                          {/* Col 4: WhatsApp / Phone */}
                                          <div style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                                            {gPhone ? (
                                              <a
                                                href={`https://wa.me/${String(gPhone).replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                  color: '#0D9488',
                                                  textDecoration: 'none',
                                                  fontWeight: 600,
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '3px'
                                                }}
                                              >
                                                📱 +91 {gPhone}
                                              </a>
                                            ) : (
                                              <span style={{ color: '#94A3B8' }}>-</span>
                                            )}
                                          </div>

                                          {/* Col 5: Email */}
                                          <div style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                                            {g.email ? (
                                              <a
                                                href={`mailto:${g.email}`}
                                                onClick={e => e.stopPropagation()}
                                                style={{ color: '#64748B', textDecoration: 'none' }}
                                              >
                                                ✉️ {g.email}
                                              </a>
                                            ) : null}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const { which_day, total_days } = calculateCurrentCourseDay(s);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                              Day {which_day} of {total_days}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              {s.course_duration || `${total_days} Days Course`}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        🗓️ {s.start_date || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                        {!s.has_password && (
                          <button
                            className="sm-invite-btn"
                            title="Generate & copy invite link"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: copiedInviteId === s.id ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                              color: copiedInviteId === s.id ? '#10B981' : '#6366F1',
                              borderColor: copiedInviteId === s.id ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.25)',
                              transition: 'all 0.2s ease',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const invRes = await fetch(`${API}/api/students/${s.id}/generate-invite`, { method: 'POST' });
                                if (invRes.ok) {
                                  const invData = await invRes.json();
                                  const baseUrl = window.location.origin;
                                  const inviteUrl = `${baseUrl}/student-portal?token=${invData.token}`;
                                  
                                  // Auto-copy to clipboard
                                  if (navigator.clipboard) {
                                    await navigator.clipboard.writeText(inviteUrl);
                                  }
                                  
                                  // Show copied state on button
                                  setCopiedInviteId(s.id);
                                  setTimeout(() => setCopiedInviteId(null), 3000);

                                  // Open invite modal popup
                                  setInviteModalData({
                                    id: s.id,
                                    name: s.name,
                                    email: s.email,
                                    phone: s.whatsapp_number,
                                    link: inviteUrl
                                  });
                                }
                              } catch (err) {
                                console.error('Error generating invite:', err);
                              }
                            }}
                          >
                            {copiedInviteId === s.id ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                <span>Invite</span>
                              </>
                            )}
                          </button>
                        )}
                        {s.has_password && (
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Joined
                          </span>
                        )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {canDeleteStudent && (
                          <button
                            className="sm-action-btn"
                            title="Delete / Remove Student"
                            style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.06)' }}
                            onClick={e => { e.stopPropagation(); handleDeleteStudent(s.id, s.name, s.email); }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        )}
                        <button className="sm-action-btn" title="View Profile" onClick={e => { e.stopPropagation(); navigate(`/students/${s.id}`); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          )}
        </div>
      </main>

      {/* ── Add Students Modal & Review Summary ── */}
      {showModal && canAddStudent && (
        <div className="sm-modal-overlay" onClick={closeModal}>
          <div className="sm-modal sm-add-student-modal" onClick={e => e.stopPropagation()}>
            <div className="sm-modal-header">
              <div>
                <h3 className="sm-modal-title">
                  {addMode === 'summary' ? 'Student Successfully Added!' : 'Add Students'}
                </h3>
                <p className="sm-modal-sub font-13" style={{ color: '#64748B', margin: '4px 0 0 0' }}>
                  {addMode === 'summary'
                    ? 'Review onboarding details, quick actions, and schedule sessions.'
                    : 'Add individual students, bulk add, or import from a spreadsheet.'}
                </p>
              </div>
              <button className="sm-modal-close" onClick={closeModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Mode Selection Cards (Tabs) */}
            {addMode !== 'summary' && (
              <div className="sm-tab-cards-grid">
                <div
                  className={`sm-tab-card ${addMode === 'single' ? 'active' : ''}`}
                  onClick={() => setAddMode('single')}
                >
                  <div className="sm-tab-card-radio">{addMode === 'single' ? '●' : '○'}</div>
                  <div>
                    <div className="sm-tab-card-title">Add Single Student</div>
                    <div className="sm-tab-card-sub">Register one student with a guided form.</div>
                  </div>
                </div>

                <div
                  className={`sm-tab-card ${addMode === 'multiple' ? 'active' : ''}`}
                  onClick={() => setAddMode('multiple')}
                >
                  <div className="sm-tab-card-radio">{addMode === 'multiple' ? '●' : '○'}</div>
                  <div>
                    <div className="sm-tab-card-title">Add Multiple Students</div>
                    <div className="sm-tab-card-sub">Quick grid-entry for multiple registrations.</div>
                  </div>
                </div>

                <div
                  className={`sm-tab-card ${addMode === 'csv' ? 'active' : ''}`}
                  onClick={() => setAddMode('csv')}
                >
                  <div className="sm-tab-card-radio">{addMode === 'csv' ? '●' : '○'}</div>
                  <div>
                    <div className="sm-tab-card-title">Import CSV</div>
                    <div className="sm-tab-card-sub">Upload Excel or CSV spreadsheet rosters.</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODE 1: SINGLE STUDENT FORM ── */}
            {addMode === 'single' && (
              <div className="sm-single-layout">
                <form onSubmit={handleAdd} className="sm-single-form">
                  <h4 className="sm-form-section-title">Student Profile Form</h4>
                  <div className="sm-grid-2">
                    <div className="sm-field">
                      <label>Full Name *</label>
                      <input type="text" placeholder="e.g. Chloe Kim" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                    </div>
                    <div className="sm-field">
                      <label>Email Address *</label>
                      <input type="email" placeholder="chloe.kim@wavecoach.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                    </div>
                  </div>

                  <div className="sm-grid-2">
                    <div className="sm-field">
                      <label>Phone Number</label>
                      <input type="text" placeholder="(555) 321-7654" value={form.whatsapp_number} onChange={e => setForm({...form, whatsapp_number: e.target.value})} />
                    </div>
                    <div className="sm-field">
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Date of Birth (DOB) *</span>
                        {form.dob && calculateAge(form.dob) && (
                          <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: '700', background: 'rgba(13,148,136,0.12)', padding: '2px 8px', borderRadius: '12px' }}>
                            Age: {calculateAge(form.dob)} yrs
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={form.dob || ''}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={e => {
                          const val = e.target.value;
                          const cAge = calculateAge(val);
                          setForm({ ...form, dob: val, age: cAge || '' });
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="sm-grid-2">
                    <div className="sm-field">
                      <label>Surf Level *</label>
                      <select value={form.level} onChange={e => setForm({...form, level: e.target.value})}>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Master">Master</option>
                      </select>
                    </div>
                    <div className="sm-field">
                      <label>Swimming Ability *</label>
                      <select value={form.swimming_ability || 'Swimmer'} onChange={e => setForm({...form, swimming_ability: e.target.value})}>
                        <option value="Swimmer">🏊 Swimmer</option>
                        <option value="Non-Swimmer">🤿 Non-Swimmer</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm-field">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Course Duration (Days) *</span>
                      <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: '700', background: 'rgba(13,148,136,0.12)', padding: '2px 8px', borderRadius: '12px' }}>
                        {form.course_duration || '3 Days Course'}
                      </span>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="e.g. 3"
                          value={
                            (() => {
                              const match = (form.course_duration || '').match(/^(\d+)/);
                              return match ? match[1] : '';
                            })()
                          }
                          onChange={e => handleCourseDurationChange(e.target.value)}
                          required
                          style={{ width: '100%', paddingRight: '55px', fontSize: '13px', fontWeight: 600 }}
                        />
                        <span style={{ position: 'absolute', right: '12px', fontSize: '12px', fontWeight: 700, color: '#64748B', pointerEvents: 'none' }}>
                          Days
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[3, 5, 7, 10].map(d => {
                          const isActive = form.course_duration === `${d} Days Course`;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleCourseDurationChange(String(d))}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: isActive ? '1.5px solid #0D9488' : '1px solid #CBD5E1',
                                background: isActive ? '#0D9488' : '#F8FAFC',
                                color: isActive ? '#FFFFFF' : '#334155',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {d}D
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>



                  <div className="sm-grid-2">
                    <div className="sm-field">
                      <label>Start Date *</label>
                      <input type="date" value={form.start_date} onChange={e => handleStartDateChange(e.target.value)} required />
                    </div>
                    <div className="sm-field">
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>End Date *</span>
                        {form.start_date && form.end_date && (
                          <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: '700', background: 'rgba(13,148,136,0.12)', padding: '2px 8px', borderRadius: '12px' }}>
                            {calculateDaysBetween(form.start_date, form.end_date)} Days
                          </span>
                        )}
                      </label>
                      <input type="date" min={form.start_date} value={form.end_date} onChange={e => handleEndDateChange(e.target.value)} required />
                    </div>
                  </div>



                  {/* Accompanying Guests Section */}
                  <div style={{
                    marginTop: '6px',
                    padding: '14px 16px',
                    background: '#F0F9FF',
                    border: '1.5px solid #BAE6FD',
                    borderLeft: '4px solid #0284C7',
                    borderRadius: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.guests && form.guests.length > 0 ? '12px' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0369A1' }}>👥 Accompanying Guests</span>
                        {form.guests && form.guests.length > 0 && (
                          <span style={{ background: '#0284C7', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                            {form.guests.length} {form.guests.length === 1 ? 'Guest' : 'Guests'}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSingleGuest}
                        style={{
                          background: '#FFFFFF',
                          color: '#0284C7',
                          border: '1.5px solid #38BDF8',
                          padding: '5px 12px',
                          borderRadius: '7px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>👥</span>
                        <span>+ Add Guest</span>
                      </button>
                    </div>

                    {(!form.guests || form.guests.length === 0) && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                        Click <strong>+ Add Guest</strong> if this student has accompanying friends or family surfing along.
                      </p>
                    )}

                    {form.guests && form.guests.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        {form.guests.map((g, gIdx) => (
                          <div key={gIdx} style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            display: 'grid',
                            gridTemplateColumns: '70px 1.4fr 1.1fr 1fr 1fr 30px',
                            gap: '8px',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', background: '#E0F2FE', padding: '4px 6px', borderRadius: '5px', textAlign: 'center' }}>
                              #{gIdx + 1}
                            </span>
                            <input
                              type="text"
                              placeholder="Guest Name *"
                              value={g.name || ''}
                              onChange={e => handleSingleGuestChange(gIdx, 'name', e.target.value)}
                              style={{ height: '36px', fontSize: '12.5px', padding: '0 8px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                              required
                            />
                            <div>
                              <input
                                type="date"
                                value={g.dob || ''}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => handleSingleGuestChange(gIdx, 'dob', e.target.value)}
                                style={{ height: '36px', fontSize: '12px', padding: '0 6px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', width: '100%' }}
                              />
                              {g.dob && calculateAge(g.dob) && (
                                <span style={{ fontSize: '10px', color: '#0D9488', fontWeight: 700 }}>
                                  Age: {calculateAge(g.dob)} yrs
                                </span>
                              )}
                            </div>
                            <select
                              value={g.swimming_ability || 'Swimmer'}
                              onChange={e => handleSingleGuestChange(gIdx, 'swimming_ability', e.target.value)}
                              style={{ height: '36px', fontSize: '12px', padding: '0 6px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                            >
                              <option value="Swimmer">🏊 Swimmer</option>
                              <option value="Non-Swimmer">🤿 Non-Swimmer</option>
                            </select>
                            <select
                              value={g.level || 'Beginner'}
                              onChange={e => handleSingleGuestChange(gIdx, 'level', e.target.value)}
                              style={{ height: '36px', fontSize: '12px', padding: '0 6px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                            >
                              <option value="Beginner">🏄 Beginner</option>
                              <option value="Intermediate">🌊 Intermediate</option>
                              <option value="Advanced">⚡ Advanced</option>
                              <option value="Master">🏆 Master</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleGuest(gIdx)}
                              style={{
                                width: '28px',
                                height: '28px',
                                border: '1px solid #FECACA',
                                background: '#FEF2F2',
                                color: '#EF4444',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="sm-form-actions-row">
                    <button type="submit" className="sm-btn-primary" disabled={saving}>
                      {saving ? <span className="sm-btn-spinner" /> : '👤+ Add Student'}
                    </button>
                  </div>
                </form>

                {/* Right Side Box: Requirements */}
                <div className="sm-requirements-box">
                  <h4 className="sm-req-title">Surf School Requirements</h4>
                  <div className="sm-req-list">
                    <div className="sm-req-item">
                      <span className="sm-req-check">✓</span>
                      <span>All students must have filled emergency waivers before session scheduling.</span>
                    </div>
                    <div className="sm-req-item">
                      <span className="sm-req-check">✓</span>
                      <span>Instructors are auto-notified via SMS once assigned to a student.</span>
                    </div>
                    <div className="sm-req-item sm-req-warn">
                      <span className="sm-req-warn-icon">⚠️</span>
                      <span>Pipeline & Sunset spots require minimum Advanced surf level certification.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODE 2: MULTIPLE STUDENTS GRID ── */}
            {addMode === 'multiple' && (
              <div className="sm-bulk-grid-layout">
                <div className="sm-bulk-table-wrap">
                  <table className="sm-bulk-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '190px' }}>Full Name *</th>
                        <th style={{ minWidth: '220px' }}>Email Address *</th>
                        <th style={{ minWidth: '150px' }}>Phone Number</th>
                        <th style={{ minWidth: '165px' }}>Date of Birth *</th>
                        <th style={{ minWidth: '155px' }}>Swimming Ability *</th>
                        <th style={{ minWidth: '155px' }}>Surf Level *</th>
                        <th style={{ minWidth: '135px' }}>Course Days *</th>
                        <th style={{ minWidth: '155px' }}>Start Date</th>
                        <th style={{ minWidth: '155px' }}>End Date</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((row, rIdx) => (
                        <React.Fragment key={rIdx}>
                          <tr style={{ background: '#FFFFFF' }}>
                            <td>
                              <input
                                type="text"
                                placeholder="e.g. Connor Coffin"
                                value={row.name}
                                onChange={e => handleBulkChange(rIdx, 'name', e.target.value)}
                                style={{ minWidth: '180px' }}
                              />
                            </td>
                            <td>
                              <input
                                type="email"
                                placeholder="email@address.com"
                                value={row.email}
                                onChange={e => handleBulkChange(rIdx, 'email', e.target.value)}
                                style={{ minWidth: '210px' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                placeholder="(555) 000-0000"
                                value={row.phone}
                                onChange={e => handleBulkChange(rIdx, 'phone', e.target.value)}
                                style={{ minWidth: '140px' }}
                              />
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <input
                                  type="date"
                                  value={row.dob || ''}
                                  max={new Date().toISOString().split('T')[0]}
                                  onChange={e => handleBulkChange(rIdx, 'dob', e.target.value)}
                                  style={{ minWidth: '150px', padding: '6px 10px', fontSize: '13px' }}
                                  required
                                />
                                {row.dob && calculateAge(row.dob) && (
                                  <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700, paddingLeft: '4px' }}>
                                    Age: {calculateAge(row.dob)} yrs
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <select
                                value={row.swimming_ability || 'Swimmer'}
                                onChange={e => handleBulkChange(rIdx, 'swimming_ability', e.target.value)}
                                style={{ minWidth: '145px' }}
                              >
                                <option value="Swimmer">🏊 Swimmer</option>
                                <option value="Non-Swimmer">🤿 Non-Swimmer</option>
                              </select>
                            </td>
                            <td>
                              <select
                                value={row.level}
                                onChange={e => handleBulkChange(rIdx, 'level', e.target.value)}
                                style={{ minWidth: '145px' }}
                              >
                                <option value="Beginner">🏄 Beginner</option>
                                <option value="Intermediate">🌊 Intermediate</option>
                                <option value="Advanced">⚡ Advanced</option>
                                <option value="Master">🏆 Master</option>
                              </select>
                            </td>
                            <td>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  min="1"
                                  max="365"
                                  placeholder="e.g. 3"
                                  value={row.days !== undefined && row.days !== null ? row.days : ''}
                                  onChange={e => handleBulkChange(rIdx, 'days', e.target.value)}
                                  style={{
                                    minWidth: '115px',
                                    paddingRight: '45px',
                                    fontWeight: '700',
                                    color: '#0F172A',
                                    fontSize: '13px'
                                  }}
                                  required
                                />
                                <span style={{
                                  position: 'absolute',
                                  right: '10px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: '#64748B',
                                  pointerEvents: 'none'
                                }}>
                                  Days
                                </span>
                              </div>
                            </td>
                            <td>
                              <input
                                type="date"
                                value={row.start_date}
                                onChange={e => handleBulkChange(rIdx, 'start_date', e.target.value)}
                                style={{ minWidth: '145px' }}
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                min={row.start_date || undefined}
                                value={row.end_date}
                                onChange={e => handleBulkChange(rIdx, 'end_date', e.target.value)}
                                style={{ minWidth: '145px' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleAddGuest(rIdx)}
                                  title="Add Guest for this student"
                                  style={{
                                    background: '#F0F9FF',
                                    border: '1px solid #BAE6FD',
                                    color: '#0284C7',
                                    borderRadius: '8px',
                                    padding: '6px 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <span>👥</span>
                                  <span>+ Guest</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(rIdx)}
                                  title="Delete this row"
                                  style={{
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#EF4444',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* ── Sub-row directly beneath this student: + Add Guest and Guest Details ── */}
                          {/* Only show when student has guests, OR when student name/email is entered */}
                          {(!row.guests || row.guests.length === 0) ? (
                            ((row.name && row.name.trim()) || (row.email && row.email.trim())) ? (
                              <tr key={`guest-bar-${rIdx}`} style={{ background: '#F8FAFC' }}>
                                <td colSpan={10} style={{ padding: '8px 16px 14px 20px', borderBottom: '2px solid #E2E8F0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleAddGuest(rIdx)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#0284C7',
                                        background: '#FFFFFF',
                                        border: '1.5px dashed #38BDF8',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = '#E0F2FE'; e.currentTarget.style.borderColor = '#0284C7'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#38BDF8'; }}
                                    >
                                      <span>👥</span>
                                      <span>+ Add Guest for <strong>{row.name || row.email}</strong></span>
                                    </button>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                                      Click <strong>+ Add Guest</strong> to add accompanying friends or family surfing with <strong>{row.name || row.email}</strong>.
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ) : null
                          ) : (
                            <tr key={`guest-panel-${rIdx}`} style={{ background: '#F8FAFC' }}>
                              <td colSpan={10} style={{ padding: '10px 14px 18px 18px', borderBottom: '2px solid #CBD5E1' }}>
                                <div style={{
                                  background: '#FFFFFF',
                                  border: '1.5px solid #BAE6FD',
                                  borderLeft: '4px solid #0284C7',
                                  borderRadius: '10px',
                                  padding: '14px 18px',
                                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)'
                                }}>
                                  {/* Top header bar */}
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid #F1F5F9'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0369A1' }}>
                                        👥 Accompanying Guests for {row.name ? row.name : `Student #${rIdx + 1}`}
                                      </span>
                                      <span style={{
                                        background: '#E0F2FE',
                                        color: '#0284C7',
                                        border: '1px solid #BAE6FD',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '12px'
                                      }}>
                                        {row.guests.length} {row.guests.length === 1 ? 'Guest' : 'Guests'}
                                      </span>
                                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                        (Shares {row.days ? `${row.days} Days` : '3 Days'} Course & booking dates with {row.name || 'Student'})
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleAddGuest(rIdx)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#0284C7',
                                        background: '#F0F9FF',
                                        border: '1.5px solid #38BDF8',
                                        padding: '5px 12px',
                                        borderRadius: '7px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = '#E0F2FE'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = '#F0F9FF'; }}
                                    >
                                      <span>👥</span>
                                      <span>+ Add Guest</span>
                                    </button>
                                  </div>

                                  {/* Guest Table Column Headers */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '90px 220px 170px 170px 170px 160px 44px',
                                    gap: '10px',
                                    padding: '0 8px 6px 8px',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    color: '#64748B',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em'
                                  }}>
                                    <span>Guest #</span>
                                    <span>Full Name *</span>
                                    <span>Date of Birth *</span>
                                    <span>Swimming Ability *</span>
                                    <span>Surf Level *</span>
                                    <span>Phone / WhatsApp</span>
                                    <span style={{ textAlign: 'center' }}>Action</span>
                                  </div>

                                  {/* Guest Input Rows */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {row.guests.map((guest, gIdx) => (
                                      <div
                                        key={gIdx}
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: '90px 220px 170px 170px 170px 160px 44px',
                                          gap: '10px',
                                          alignItems: 'center',
                                          background: '#F8FAFC',
                                          border: '1px solid #E2E8F0',
                                          borderRadius: '8px',
                                          padding: '8px 10px'
                                        }}
                                      >
                                        <span style={{
                                          fontWeight: 700,
                                          fontSize: '11px',
                                          color: '#0284C7',
                                          background: '#E0F2FE',
                                          border: '1px solid #BAE6FD',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          textAlign: 'center',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          Guest #{gIdx + 1}
                                        </span>

                                        <input
                                          type="text"
                                          placeholder="Guest Full Name *"
                                          value={guest.name || ''}
                                          onChange={e => handleGuestChange(rIdx, gIdx, 'name', e.target.value)}
                                          style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '0 10px',
                                            fontSize: '12.5px',
                                            fontWeight: 500,
                                            borderRadius: '6px',
                                            border: '1.5px solid #CBD5E1',
                                            background: '#FFFFFF',
                                            boxSizing: 'border-box'
                                          }}
                                          required
                                        />

                                        <div>
                                          <input
                                            type="date"
                                            value={guest.dob || ''}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={e => handleGuestChange(rIdx, gIdx, 'dob', e.target.value)}
                                            style={{
                                              width: '100%',
                                              height: '38px',
                                              padding: '0 8px',
                                              fontSize: '12px',
                                              borderRadius: '6px',
                                              border: '1.5px solid #CBD5E1',
                                              background: '#FFFFFF',
                                              boxSizing: 'border-box'
                                            }}
                                          />
                                          {guest.dob && calculateAge(guest.dob) && (
                                            <span style={{ fontSize: '10.5px', color: '#0D9488', fontWeight: 700, paddingLeft: '4px' }}>
                                              Age: {calculateAge(guest.dob)} yrs
                                            </span>
                                          )}
                                        </div>

                                        <select
                                          value={guest.swimming_ability || 'Swimmer'}
                                          onChange={e => handleGuestChange(rIdx, gIdx, 'swimming_ability', e.target.value)}
                                          style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '0 8px',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1.5px solid #CBD5E1',
                                            background: '#FFFFFF',
                                            boxSizing: 'border-box'
                                          }}
                                        >
                                          <option value="Swimmer">🏊 Swimmer</option>
                                          <option value="Non-Swimmer">🤿 Non-Swimmer</option>
                                        </select>

                                        <select
                                          value={guest.level || 'Beginner'}
                                          onChange={e => handleGuestChange(rIdx, gIdx, 'level', e.target.value)}
                                          style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '0 8px',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1.5px solid #CBD5E1',
                                            background: '#FFFFFF',
                                            boxSizing: 'border-box'
                                          }}
                                        >
                                          <option value="Beginner">🏄 Beginner</option>
                                          <option value="Intermediate">🌊 Intermediate</option>
                                          <option value="Advanced">⚡ Advanced</option>
                                          <option value="Master">🏆 Master</option>
                                        </select>

                                        <input
                                          type="text"
                                          placeholder="(555) 000-0000"
                                          value={guest.phone || ''}
                                          onChange={e => handleGuestChange(rIdx, gIdx, 'phone', e.target.value)}
                                          style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '0 10px',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1.5px solid #CBD5E1',
                                            background: '#FFFFFF',
                                            boxSizing: 'border-box'
                                          }}
                                        />

                                        <div style={{ textAlign: 'center' }}>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteGuest(rIdx, gIdx)}
                                            title="Remove this guest"
                                            style={{
                                              width: '32px',
                                              height: '32px',
                                              borderRadius: '6px',
                                              border: '1px solid #FECACA',
                                              background: '#FEF2F2',
                                              color: '#EF4444',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '14px',
                                              fontWeight: '700',
                                              transition: 'all 0.15s ease'
                                            }}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sm-bulk-actions-bar">
                  <button type="button" className="sm-btn-secondary" onClick={handleAddRow}>
                    + Add Row
                  </button>
                  <button type="button" className="sm-btn-primary" disabled={saving} onClick={handleBulkSubmit}>
                    {saving ? <span className="sm-btn-spinner" /> : '+ Add All Guests / Students'}
                  </button>
                </div>

                <div className="sm-bulk-tips-box">
                  <h4 className="sm-req-title">Bulk Entry Tips</h4>
                  <div className="sm-tips-grid">
                    <div className="sm-req-item"><span className="sm-req-check">✓</span><span>Tab between cells to move across columns quickly.</span></div>
                    <div className="sm-req-item"><span className="sm-req-check">✓</span><span>Paste data directly from a spreadsheet to auto-fill rows.</span></div>
                    <div className="sm-req-item"><span className="sm-req-check">✓</span><span>Surf Level options: Beginner, Intermediate, Advanced, Master.</span></div>
                    <div className="sm-req-item"><span className="sm-req-check">✓</span><span>Start Date and End Date define the guest booking session period.</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODE 3: IMPORT CSV ── */}
            {addMode === 'csv' && (
              <div className="sm-csv-layout">
                <div className="sm-csv-left">
                  {/* Dropzone */}
                  <div
                    className={`sm-dropzone ${dragActive ? 'active' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleCSVUpload(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <div className="sm-dropzone-icon">☁️</div>
                    <div className="sm-dropzone-title">Drag & drop your CSV file here</div>
                    <div className="sm-dropzone-sub">or</div>
                    <label className="sm-btn-secondary sm-browse-btn">
                      Browse Files
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        style={{ display: 'none' }}
                        onChange={e => e.target.files && handleCSVUpload(e.target.files[0])}
                      />
                    </label>
                    {csvFileName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span className="sm-csv-filename">Uploaded: {csvFileName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCsvFileName('');
                            setBulkRows([{ name: '', email: '', phone: '', dob: '', age: '', level: 'Beginner', swimming_ability: 'Swimmer', days: 3, course_duration: '3 Days Course', start_date: '', end_date: '', instructor_id: '' }]);
                          }}
                          style={{
                            background: 'none', border: 'none', color: '#EF4444',
                            fontSize: '12px', cursor: 'pointer', textDecoration: 'underline'
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* If CSV has been parsed, display preview card with Import button right here! */}
                  {bulkRows.some(r => r.name && r.email) && (
                    <div className="sm-csv-preview-card" style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #0D9488',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      boxShadow: '0 4px 16px rgba(13,148,136,0.08)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>✅</span>
                            <span>Ready to Import: {bulkRows.filter(r => r.name && r.email).length} Students</span>
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                            File: <strong>{csvFileName || 'CSV Upload'}</strong> — duplicates are automatically updated without redundant rows.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => setAddMode('multiple')}
                            className="sm-btn-secondary"
                            style={{ fontSize: '12px', padding: '8px 14px' }}
                          >
                            ✏️ Edit in Grid
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkSubmit}
                            disabled={saving}
                            className="sm-btn-primary"
                            style={{
                              fontSize: '13px',
                              padding: '8px 20px',
                              background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              borderRadius: '10px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 10px rgba(13,148,136,0.3)'
                            }}
                          >
                            {saving ? '⏳ Importing & Sending Emails...' : `🚀 Import ${bulkRows.filter(r => r.name && r.email).length} Students Now`}
                          </button>
                        </div>
                      </div>

                      {/* Preview mini table */}
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                        <table className="sm-csv-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Phone</th>
                              <th>DOB / Level</th>
                              <th>Swimming</th>
                              <th>Start / End Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkRows.filter(r => r.name && r.email).map((row, idx) => (
                              <tr key={idx}>
                                <td><strong>{row.name}</strong></td>
                                <td>{row.email}</td>
                                <td>{row.phone || '—'}</td>
                                <td>
                                  {row.dob ? (
                                    <span>
                                      {row.dob}
                                      {calculateAge(row.dob) && (
                                        <span style={{ color: '#0D9488', fontWeight: 600 }}> ({calculateAge(row.dob)} yrs)</span>
                                      )}
                                    </span>
                                  ) : (
                                    row.age ? `${row.age} yrs` : '—'
                                  )} • <span className="sm-badge-opt">{row.level}</span>
                                </td>
                                <td>
                                  {row.swimming_ability?.toLowerCase() === 'non-swimmer' ? (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 6px', borderRadius: '4px' }}>
                                      🤿 Non-Swimmer
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488', background: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                                      🏊 Swimmer
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                                      {row.start_date || '—'}
                                    </span>
                                    {row.end_date && (
                                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                                        to {row.end_date}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* CSV Format Table */}
                  <div className="sm-csv-format-wrap">
                    <h4 className="sm-form-section-title">CSV Format Requirements</h4>
                    <table className="sm-csv-table">
                      <thead>
                        <tr>
                          <th>Column Header</th>
                          <th>Requirement</th>
                          <th>Accepted Formats / Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Full Name</strong></td>
                          <td><span className="sm-badge-req">Required</span></td>
                          <td>First & last name (e.g., Liam Torres)</td>
                        </tr>
                        <tr>
                          <td><strong>Email Address</strong></td>
                          <td><span className="sm-badge-req">Required</span></td>
                          <td>Must be unique, verified email format</td>
                        </tr>
                        <tr>
                          <td><strong>Phone Number</strong></td>
                          <td><span className="sm-badge-req">Required</span></td>
                          <td>Standard formats accepted</td>
                        </tr>
                        <tr>
                          <td><strong>Date of Birth (DOB)</strong></td>
                          <td><span className="sm-badge-req">Required</span></td>
                          <td>Date of Birth in YYYY-MM-DD (e.g., 1998-05-22) or DD-MM-YYYY format</td>
                        </tr>
                        <tr>
                          <td><strong>Swimming Ability</strong></td>
                          <td><span className="sm-badge-opt">Optional</span></td>
                          <td>Swimmer or Non-Swimmer (defaults to Swimmer)</td>
                        </tr>
                        <tr>
                          <td><strong>Surf Level</strong></td>
                          <td><span className="sm-badge-opt">Optional</span></td>
                          <td>Must match: Beginner, Intermediate, or Advanced</td>
                        </tr>
                        <tr>
                          <td><strong>Course Days</strong></td>
                          <td><span className="sm-badge-opt">Optional</span></td>
                          <td>Number of course training days (e.g. 3, 5, 7, 10, or custom). Defaults to 3 days.</td>
                        </tr>
                        <tr>
                          <td><strong>Start Date</strong></td>
                          <td><span className="sm-badge-req">Required</span></td>
                          <td>Session start date in YYYY-MM-DD (e.g., 2026-10-01) or DD-MM-YYYY</td>
                        </tr>
                        <tr>
                          <td><strong>End Date</strong></td>
                          <td><span className="sm-badge-opt">Optional</span></td>
                          <td>Session end date in YYYY-MM-DD (auto-calculated from Course Days if left blank)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side Panel: Import Guidelines */}
                <div className="sm-requirements-box">
                  <h4 className="sm-req-title">Import Guidelines</h4>
                  <div className="sm-req-list">
                    <div className="sm-req-item">
                      <span className="sm-req-check">✓</span>
                      <span>Download our sample CSV template to ensure headers match.</span>
                    </div>
                    <div className="sm-req-item">
                      <span className="sm-req-check">✓</span>
                      <span>The first row of your sheet must contain exact column headers.</span>
                    </div>
                    <div className="sm-req-item sm-req-warn">
                      <span className="sm-req-warn-icon">⚠️</span>
                      <span>Duplicate emails will be flagged and held for review.</span>
                    </div>
                    <div className="sm-req-item sm-req-warn">
                      <span className="sm-req-warn-icon">⚠️</span>
                      <span>Maximum limit of 200 students per import upload.</span>
                    </div>
                  </div>
                  <button type="button" className="sm-btn-secondary" onClick={downloadCSVSample} style={{ width: '100%', marginTop: '20px' }}>
                    📥 Download Sample Template
                  </button>
                </div>
              </div>
            )}

            {/* ── MODE 4: REVIEW SUMMARY / SUCCESS PAGE ── */}
            {addMode === 'summary' && addedStudentSummary && (
              <div className="sm-summary-layout">
                {/* Green Banner */}
                <div className="sm-summary-banner">
                  <span className="sm-summary-banner-check">✓</span>
                  <span>
                    {addedStudentSummary.totalImported && addedStudentSummary.totalImported > 1
                      ? `${addedStudentSummary.totalImported} Students Successfully Added & Invited!`
                      : 'Student Successfully Added!'}
                  </span>
                </div>

                {/* Email Confirmation Notice */}
                <div style={{
                  background: 'rgba(13, 148, 136, 0.12)',
                  border: '1px solid rgba(13, 148, 136, 0.35)',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#0D9488',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  <span style={{ fontSize: '20px' }}>✉️</span>
                  <span>
                    Welcome and student portal invitation emails with access links have been automatically sent to{' '}
                    <strong>
                      {addedStudentSummary.totalImported && addedStudentSummary.totalImported > 1
                        ? `all ${addedStudentSummary.totalImported} students`
                        : (addedStudentSummary.email || 'the student')}
                    </strong>!
                  </span>
                </div>

                {/* Magic Invite Link Card */}
                {addedStudentSummary.inviteLink && (
                  <div style={{
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    marginBottom: '24px',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🔗</span>
                        <span style={{ color: '#00F2FE', fontWeight: 800, fontSize: '15px', fontFamily: 'Outfit, sans-serif' }}>
                          Student Magic Portal Link
                        </span>
                      </div>
                      <span style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00F2FE', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                        READY TO SHARE
                      </span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94A3B8', lineHeight: '1.5' }}>
                      Send this direct link to <strong>{addedStudentSummary.name}</strong>. Opening this link lands them directly in their student portal where they can set their password without needing credentials beforehand.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={addedStudentSummary.inviteLink}
                        style={{
                          flex: 1,
                          background: '#090D1A',
                          border: '1px solid #334155',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          color: '#F8FAFC',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          outline: 'none'
                        }}
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(addedStudentSummary.inviteLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2500);
                        }}
                        style={{
                          background: copied ? '#10B981' : '#FF3355',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 20px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {copied ? '✓ Copied!' : '📋 Copy Link'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="sm-summary-grid">
                  {/* Left Column: Student Details Card */}
                  <div className="sm-summary-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="sm-summary-avatar-row">
                      <div className="sm-summary-avatar">
                        {(addedStudentSummary.name || 'S').split(' ').map(n=>n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="sm-summary-name">{addedStudentSummary.name}</div>
                        <div className="sm-summary-enrolled">Enrolled: {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                      </div>
                    </div>

                    <table className="sm-summary-details-table">
                      <tbody>
                        <tr><td>Email Address</td><td>{addedStudentSummary.email || '—'}</td></tr>
                        <tr><td>Phone Number</td><td>{addedStudentSummary.whatsapp_number || '—'}</td></tr>
                        <tr>
                          <td>Date of Birth</td>
                          <td>
                            {addedStudentSummary.dob
                              ? `${addedStudentSummary.dob}${calculateAge(addedStudentSummary.dob) ? ` (${calculateAge(addedStudentSummary.dob)} yrs)` : ''}`
                              : (addedStudentSummary.age ? `${addedStudentSummary.age} yrs` : '—')}
                          </td>
                        </tr>
                        <tr>
                          <td>Surf Level</td>
                          <td><span className="sm-summary-teal-badge">{(addedStudentSummary.level || 'Beginner').toUpperCase()} TEAL LEVEL</span></td>
                        </tr>
                        <tr>
                          <td>Swimming Ability</td>
                          <td>
                            {addedStudentSummary.swimming_ability?.toLowerCase() === 'non-swimmer' ? (
                              <span style={{ color: '#D97706', fontWeight: 700 }}>🤿 Non-Swimmer</span>
                            ) : (
                              <span style={{ color: '#0D9488', fontWeight: 700 }}>🏊 Swimmer</span>
                            )}
                          </td>
                        </tr>
                        <tr><td>Course Duration</td><td><strong style={{ color: '#0D9488' }}>{addedStudentSummary.course_duration || '3 Days Course'}</strong></td></tr>
                        <tr><td>Assigned Instructor</td><td>{addedStudentSummary.instructor || 'Auto-Assigned Coach'}</td></tr>
                        <tr><td>Booking Start Date</td><td>{addedStudentSummary.start_date || '—'}</td></tr>
                        <tr><td>Booking End Date</td><td>{addedStudentSummary.end_date || '—'}</td></tr>
                        {((addedStudentSummary.guests_count > 0) || (addedStudentSummary.guests_details && addedStudentSummary.guests_details.length > 0)) && (
                          <tr>
                            <td>Accompanying Guests</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: '#0284C7', fontWeight: 700 }}>
                                  👥 {addedStudentSummary.guests_count || (addedStudentSummary.guests_details?.length)} Guest(s)
                                </span>
                                {Array.isArray(addedStudentSummary.guests_details) && addedStudentSummary.guests_details.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                                    {addedStudentSummary.guests_details.map((g, idx) => (
                                      <span key={idx} style={{
                                        fontSize: '11px',
                                        background: '#E0F2FE',
                                        color: '#0369A1',
                                        border: '1px solid #BAE6FD',
                                        borderRadius: '4px',
                                        padding: '1px 6px',
                                        fontWeight: 600
                                      }}>
                                        {g.name} ({g.level || 'Beginner'})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr><td>Medical Considerations</td><td>None reported</td></tr>
                        <tr>
                          <td>Status</td>
                          <td><span className="sm-summary-active-tag">ACTIVE</span></td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="sm-summary-card-actions">
                      <button type="button" className="sm-btn-primary sm-summary-pink-btn" onClick={() => { setAddMode('single'); setAddedStudentSummary(null); }}>
                        + Add Another Student
                      </button>
                      <button type="button" className="sm-btn-secondary" onClick={() => { closeModal(); navigate(`/students/${addedStudentSummary.id}`); }}>
                        View Student Profile
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Attendance Modal — Tamper-Proof Attendance Marking */}
      {attendanceModal && (
        <div className="sm-modal-overlay" onClick={() => setAttendanceModal(null)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="sm-modal-header">
              <h3 className="sm-modal-title">📋 Mark Attendance</h3>
              <button className="sm-modal-close" onClick={() => setAttendanceModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>{attendanceModal.name}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Course: {attendanceModal.course_duration || '3 Days Course'} · Current: Day {calculateCurrentCourseDay(attendanceModal).which_day} of {calculateCurrentCourseDay(attendanceModal).total_days}
              </div>
            </div>

            {attError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '14px' }}>
                ⚠️ {attError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAttSaving(true);
                setAttError('');
                const formEl = e.target;
                const dateVal = formEl.elements.att_date.value;
                const statusVal = formEl.elements.att_status.value;
                const guestsVal = parseInt(formEl.elements.att_guests.value) || 0;
                const notesVal = formEl.elements.att_notes.value;

                try {
                  const res = await fetch(`${API}/api/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      student_id: attendanceModal.id,
                      date: dateVal,
                      present_status: statusVal,
                      guests_present: guestsVal,
                      notes: notesVal
                    })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setAttendanceModal(null);
                    fetchStudents();
                  } else {
                    setAttError(data.detail || 'Failed to mark attendance.');
                  }
                } catch (err) {
                  setAttError('Server connection error.');
                } finally {
                  setAttSaving(false);
                }
              }}
              className="sm-modal-form"
            >
              <div className="sm-field">
                <label>Attendance Date</label>
                <input type="date" name="att_date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="sm-field" style={{ flex: 1 }}>
                  <label>Status</label>
                  <select name="att_status" defaultValue="Present">
                    <option value="Present">Present (Attended)</option>
                    <option value="Absent">Absent</option>
                    <option value="Excused">Excused Leave</option>
                  </select>
                </div>
                <div className="sm-field" style={{ flex: 1 }}>
                  <label>Guests Present</label>
                  <input type="number" name="att_guests" defaultValue={0} min={0} />
                </div>
              </div>

              <div className="sm-field">
                <label>Notes / Observations</label>
                <input type="text" name="att_notes" placeholder="e.g. Wave pop-up drills performed" />
              </div>

              <div className="sm-modal-actions" style={{ marginTop: '12px' }}>
                <button type="button" className="sm-btn-secondary" onClick={() => setAttendanceModal(null)}>Cancel</button>
                <button type="submit" className="sm-btn-primary" disabled={attSaving}>
                  {attSaving ? <span className="sm-btn-spinner" /> : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Direct Student Invite Link Modal ── */}
      {inviteModalData && (
        <div className="sm-modal-overlay" onClick={() => setInviteModalData(null)}>
          <div
            className="sm-modal"
            style={{ maxWidth: '520px', width: '100%', background: '#FFFFFF', borderRadius: '20px', padding: '28px', border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                  🔗
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                    Student Invite Link
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                    Ready for <strong>{inviteModalData.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalData(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Direct Magic Portal Link</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '10px' }}>
                  ✓ Copied to Clipboard
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={inviteModalData.link}
                style={{
                  width: '100%',
                  background: '#0F172A',
                  color: '#00F2FE',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onClick={e => e.target.select()}
              />
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>
                The student can open this link directly to access their portal and set up their profile & password without pre-existing credentials.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteModalData.link);
                    setInviteLinkCopied(true);
                    setTimeout(() => setInviteLinkCopied(false), 2500);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '12px',
                    background: inviteLinkCopied ? '#10B981' : '#6366F1',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                  }}
                >
                  {inviteLinkCopied ? '✓ Copied to Clipboard!' : '📋 Copy Invite Link'}
                </button>

                {inviteModalData.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPhone = String(inviteModalData.phone).replace(/\D/g, '');
                      const text = encodeURIComponent(
                        `Hi ${inviteModalData.name}! Here is your Aquatic Indica Surf School portal link: ${inviteModalData.link}\n\nClick the link to access your student portal and set your password.`
                      );
                      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                    }}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: '#25D366',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
                    }}
                  >
                    💬 WhatsApp
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => window.open(inviteModalData.link, '_blank')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: '#64748B',
                  border: '1px solid #E2E8F0',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🚀 Open Portal in New Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* School Registration Invite Modal */}
      {showSchoolInviteModal && canCreateInviteLink && (
        <div 
          className="sm-modal-overlay" 
          onClick={() => { setShowSchoolInviteModal(false); setCreatedSchoolInvite(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}
        >
          <div
            className="sm-modal"
            style={{ 
              maxWidth: '580px', 
              width: '100%', 
              background: '#FFFFFF', 
              borderRadius: '20px', 
              padding: '28px', 
              border: '1px solid #E2E8F0', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  🔗
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                    School Invite Link
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                    Share registration link locked to <strong>{effectiveSchool}</strong> with custom capacity.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowSchoolInviteModal(false); setCreatedSchoolInvite(null); }}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            {/* Top Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              background: '#F1F5F9',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <button
                type="button"
                onClick={() => setInviteModalTab('generate')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: inviteModalTab === 'generate' ? '#FFFFFF' : 'transparent',
                  color: inviteModalTab === 'generate' ? '#0F172A' : '#64748B',
                  fontWeight: inviteModalTab === 'generate' ? 800 : 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: inviteModalTab === 'generate' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>⚡</span>
                <span>Generate Link</span>
              </button>

              <button
                type="button"
                onClick={() => setInviteModalTab('history')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: inviteModalTab === 'history' ? '#FFFFFF' : 'transparent',
                  color: inviteModalTab === 'history' ? '#0F172A' : '#64748B',
                  fontWeight: inviteModalTab === 'history' ? 800 : 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: inviteModalTab === 'history' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📋</span>
                <span>History</span>
                <span style={{
                  background: inviteModalTab === 'history' ? '#0D9488' : '#CBD5E1',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 800,
                  marginLeft: '2px'
                }}>
                  {schoolInvitesList.length}
                </span>
                {(() => {
                  const actCnt = schoolInvitesList.filter(inv => {
                    const rem = inv.remaining !== undefined ? inv.remaining : Math.max(0, inv.max_count - (inv.used_count || 0));
                    return rem > 0 && inv.is_active;
                  }).length;
                  return actCnt > 0 ? (
                    <span style={{
                      background: '#DCFCE7',
                      color: '#16A34A',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontSize: '10.5px',
                      fontWeight: 800
                    }}>
                      ⚡ {actCnt} Active
                    </span>
                  ) : null;
                })()}
              </button>
            </div>

            {/* TAB 1: GENERATE INVITE LINK */}
            {inviteModalTab === 'generate' && (
              <div>
                {/* School Locking Card */}
                <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🏫</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Active School
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginTop: '1px' }}>
                        {effectiveSchool}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>🔒</span>
                    <span>School Locked on Signup</span>
                  </div>
                </div>

                {/* Capacity Input Block */}
                <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                    👥 Registration Capacity / Student Count
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setInviteCapacityCount(c => Math.max(1, (parseInt(c) || 1) - 1))}
                      style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={inviteCapacityCount}
                      onChange={e => setInviteCapacityCount(e.target.value)}
                      style={{ flex: 1, height: '40px', borderRadius: '10px', border: '1.5px solid #0D9488', textAlign: 'center', fontSize: '18px', fontWeight: 800, color: '#0F172A', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setInviteCapacityCount(c => (parseInt(c) || 0) + 1)}
                      style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {[1, 2, 3, 5, 10].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setInviteCapacityCount(cnt)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: parseInt(inviteCapacityCount) === cnt ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                          background: parseInt(inviteCapacityCount) === cnt ? '#F0FDFA' : '#F8FAFC',
                          color: parseInt(inviteCapacityCount) === cnt ? '#0D9488' : '#64748B',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {cnt} {cnt === 1 ? 'Person' : 'People'}
                      </button>
                    ))}
                  </div>

                  {/* How it works note */}
                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px', padding: '12px', fontSize: '12.5px', color: '#0369A1', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: 800, marginBottom: '3px' }}>💡 How this capacity count works:</div>
                    If set to <strong>{inviteCapacityCount || 3}</strong>:
                    <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                      <li><strong>Option A:</strong> 1 primary email signup with {(parseInt(inviteCapacityCount) || 3) - 1} accompanying guest(s)</li>
                      <li><strong>Option B:</strong> {inviteCapacityCount || 3} separate students registering with their individual emails</li>
                    </ul>
                    Once all {inviteCapacityCount || 3} slot(s) are used, the link automatically locks and closes.
                  </div>
                </div>

                {/* Course Duration / Allowed Days Block - Manual Entry */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Course Duration (Allowed Days)
                    </label>
                    <span style={{ fontSize: '11px', fontWeight: '800', background: '#F0FDFA', color: '#0D9488', padding: '2px 8px', borderRadius: '6px' }}>
                      {(() => {
                        const m = String(inviteCourseDuration || '').match(/^(\d+)/);
                        const n = m ? parseInt(m[1], 10) : 3;
                        return n === 1 ? '1 Day Crash Course' : `${n} Days Course`;
                      })()}
                    </span>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="Enter days (e.g. 3, 5, 7, 10)"
                      value={(() => {
                        const match = String(inviteCourseDuration || '').match(/^(\d+)/);
                        return match ? match[1] : (inviteCourseDuration || '');
                      })()}
                      onChange={e => {
                        const val = e.target.value;
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num > 0) {
                          setInviteCourseDuration(num === 1 ? '1 Day Crash Course' : `${num} Days Course`);
                        } else {
                          setInviteCourseDuration(val);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 65px 10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#0F172A',
                        background: '#F8FAFC',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '14px', fontSize: '13px', fontWeight: '700', color: '#64748B', pointerEvents: 'none' }}>
                      Days
                    </span>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleCreateSchoolInvite}
                  disabled={schoolInviteLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: schoolInviteLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                    marginBottom: '16px'
                  }}
                >
                  {schoolInviteLoading ? 'Generating…' : '⚡ Generate & Copy Invite Link'}
                </button>

                {/* Created Invite Box */}
                {createdSchoolInvite && (
                  <div style={{ background: '#ECFDF5', border: '1.5px solid #10B981', borderRadius: '16px', padding: '18px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✅</span>
                        <span>Link Ready & Copied!</span>
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '3px 10px', borderRadius: '12px' }}>
                        0 / {createdSchoolInvite.max_count} Used ({createdSchoolInvite.max_count} Slots Left)
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        readOnly
                        value={createdSchoolInvite.fullUrl}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #A7F3D0', background: '#FFFFFF', fontSize: '12px', color: '#0F172A', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => copySchoolInviteLink(createdSchoolInvite)}
                        style={{
                          background: copiedSchoolInviteCode === createdSchoolInvite.code ? '#10B981' : '#0D9488',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 16px',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {copiedSchoolInviteCode === createdSchoolInvite.code ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INVITE LINKS HISTORY */}
            {inviteModalTab === 'history' && (
              <div>
                {/* History Header & Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowActiveInvitesOnly(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: !showActiveInvitesOnly ? '#0D9488' : '#F1F5F9',
                        color: !showActiveInvitesOnly ? '#FFFFFF' : '#64748B',
                        border: !showActiveInvitesOnly ? '1.5px solid #0D9488' : '1.5px solid #E2E8F0',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      All Links
                      <span style={{
                        background: !showActiveInvitesOnly ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                        color: !showActiveInvitesOnly ? '#FFFFFF' : '#475569',
                        borderRadius: '10px',
                        padding: '0 6px',
                        fontSize: '11px',
                        fontWeight: 800
                      }}>
                        {schoolInvitesList.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowActiveInvitesOnly(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: showActiveInvitesOnly ? '#10B981' : '#F1F5F9',
                        color: showActiveInvitesOnly ? '#FFFFFF' : '#64748B',
                        border: showActiveInvitesOnly ? '1.5px solid #10B981' : '1.5px solid #E2E8F0',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      ⚡ Active Only
                      <span style={{
                        background: showActiveInvitesOnly ? 'rgba(255,255,255,0.25)' : '#DCFCE7',
                        color: showActiveInvitesOnly ? '#FFFFFF' : '#16A34A',
                        borderRadius: '10px',
                        padding: '0 6px',
                        fontSize: '11px',
                        fontWeight: 800
                      }}>
                        {schoolInvitesList.filter(inv => {
                          const rem = inv.remaining !== undefined ? inv.remaining : Math.max(0, inv.max_count - (inv.used_count || 0));
                          return rem > 0 && inv.is_active;
                        }).length}
                      </span>
                    </button>
                  </div>

                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Click <strong>Copy Link</strong> to share
                  </span>
                </div>

                {/* List of Previous Invites */}
                {(() => {
                  const activeInvites = schoolInvitesList.filter(inv => {
                    const rem = inv.remaining !== undefined ? inv.remaining : Math.max(0, inv.max_count - (inv.used_count || 0));
                    return rem > 0 && inv.is_active;
                  });
                  const displayedInvites = showActiveInvitesOnly ? activeInvites : schoolInvitesList;

                  if (displayedInvites.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '36px 16px',
                        background: '#F8FAFC',
                        border: '1.5px dashed #CBD5E1',
                        borderRadius: '14px',
                        color: '#64748B'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔗</div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>
                          {showActiveInvitesOnly ? 'No Active Invite Links' : 'No Invite Links Created Yet'}
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '300px', margin: '0 auto 14px' }}>
                          {showActiveInvitesOnly
                            ? 'All previous invite links are currently full or expired.'
                            : 'Generate a new batch registration link from the Generate Link tab.'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setInviteModalTab('generate')}
                          style={{
                            background: '#0D9488',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ⚡ Go to Generate Link Tab
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                      {displayedInvites.map((inv, idx) => {
                        const rem = inv.remaining !== undefined ? inv.remaining : Math.max(0, inv.max_count - (inv.used_count || 0));
                        const isFull = rem <= 0 || !inv.is_active;
                        const isCopied = copiedSchoolInviteCode === inv.code;

                        return (
                          <div
                            key={inv.id || inv.code || idx}
                            style={{
                              background: isFull ? '#F8FAFC' : '#FFFFFF',
                              border: isFull ? '1.5px solid #E2E8F0' : '1.5px solid #BBF7D0',
                              borderRadius: '12px',
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              boxShadow: isFull ? 'none' : '0 2px 6px rgba(16, 185, 129, 0.08)'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                <code style={{
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  color: isFull ? '#64748B' : '#0D9488',
                                  background: isFull ? '#E2E8F0' : '#F0FDFA',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: isFull ? '1px solid #CBD5E1' : '1px solid #CCFBF1'
                                }}>
                                  {inv.code}
                                </code>
                                <span style={{ fontSize: '12px', color: '#64748B' }}>
                                  Capacity: <strong style={{ color: '#0F172A' }}>{inv.max_count}</strong>
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  color: '#0D9488',
                                  fontWeight: 700,
                                  background: '#F0FDFA',
                                  padding: '1px 7px',
                                  borderRadius: '6px',
                                  border: '1px solid #CCFBF1'
                                }}>
                                  🗓️ {inv.course_duration || '3 Days Course'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11.5px' }}>
                                <span style={{
                                  color: isFull ? '#EF4444' : '#15803D',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {isFull
                                    ? `⛔ Full (${inv.used_count || inv.max_count}/${inv.max_count} used)`
                                    : `⚡ ${rem} of ${inv.max_count} slots left`}
                                </span>
                                {inv.created_at && (
                                  <span style={{ color: '#94A3B8' }}>
                                    • Created {new Date(inv.created_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => copySchoolInviteLink(inv)}
                              disabled={isFull}
                              style={{
                                background: isFull ? '#E2E8F0' : (isCopied ? '#10B981' : '#F0FDFA'),
                                color: isFull ? '#94A3B8' : (isCopied ? '#FFFFFF' : '#0D9488'),
                                border: isFull ? 'none' : (isCopied ? '1px solid #10B981' : '1.5px solid #0D9488'),
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: isFull ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isCopied ? '✓ Copied' : isFull ? 'Expired' : 'Copy Link'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Software-Native Confirmation Dialog (Replaces Browser window.confirm) */}
      {confirmDialog.isOpen && (
        <div 
          onClick={closeConfirm}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '28px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: confirmDialog.isDanger ? '#FEE2E2' : '#EFF6FF',
                color: confirmDialog.isDanger ? '#EF4444' : '#0D9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {confirmDialog.isDanger ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', fontFamily: 'Outfit, sans-serif' }}>
                  {confirmDialog.title}
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.5', color: '#64748B' }}>
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={closeConfirm}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: confirmDialog.isDanger ? '#EF4444' : '#0D9488',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: confirmDialog.isDanger ? '0 4px 14px rgba(239, 68, 68, 0.4)' : '0 4px 14px rgba(13, 148, 136, 0.4)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = confirmDialog.isDanger ? '#DC2626' : '#0F766E'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = confirmDialog.isDanger ? '#EF4444' : '#0D9488'; }}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '13.5px',
          fontWeight: 600,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>🏄</span>
          <span>{toastMsg}</span>
        </div>
      )}

      <style>{`
        .sm-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .sm-main { flex: 1; padding: 40px 80px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }
        
        .sm-header { display: flex; justify-content: space-between; align-items: center; }
        .sm-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.2; }
        .sm-sub { font-size: 16px; color: #64748B; margin: 8px 0 0 0; }
        
        .sm-actions { display: flex; gap: 12px; }
        .sm-btn-secondary {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;
          padding: 12px 24px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #0F172A; cursor: pointer;
        }
        .sm-btn-primary {
          background: #F43F5E; border: none; border-radius: 8px;
          padding: 12px 24px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #FFFFFF; cursor: pointer;
          display: flex; align-items: center; gap: 8px;
        }
        .sm-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .sm-filters { display: flex; gap: 20px; align-items: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; }
        .sm-search-wrap { display: flex; align-items: center; gap: 12px; background: #F8F6F2; border-radius: 8px; padding: 0 16px; height: 44px; flex: 1; }
        .sm-search-input { border: none; outline: none; background: transparent; font-size: 12px; color: #94A3B8; width: 100%; }
        .sm-select {
          border: 1px solid #E2E8F0; border-radius: 8px; height: 44px; padding: 0 16px; width: 180px;
          font-size: 12px; color: #0F172A; background: #FFF; outline: none; cursor: pointer;
        }

        .sm-stats-grid { display: flex; gap: 20px; }
        .sm-stat-card {
          flex: 1; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px; height: 100px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          cursor: pointer; transition: all 0.2s ease; user-select: none;
        }
        .sm-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
          border-color: #CBD5E1;
        }
        .sm-stat-active {
          border-color: #0D9488 !important;
          background: rgba(13, 148, 136, 0.06) !important;
          box-shadow: 0 0 0 1px #0D9488, 0 4px 12px rgba(13, 148, 136, 0.12) !important;
        }
        .sm-stat-value { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; line-height: 1.2; }
        .sm-stat-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px; }

        .sm-table-container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; }
        .sm-table { width: 100%; border-collapse: collapse; }
        .sm-table th {
          text-align: left; padding: 24px 16px 12px 16px; font-size: 11px; font-weight: 600;
          color: #9CA3AF; text-transform: uppercase; border-bottom: 1px solid #E2E8F0;
        }
        .sm-table td { padding: 16px; vertical-align: middle; }
        
        .sm-student-info { display: flex; align-items: center; gap: 16px; }
        .sm-student-avatar { width: 40px; height: 40px; border-radius: 20px; object-fit: cover; }
        .sm-student-name { font-size: 12px; font-weight: 700; color: #0F172A; }
        .sm-student-email { font-size: 13px; color: #64748B; margin-top: 2px; }
        
        .sm-level-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; display: inline-block; }
        .level-beginner { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .level-intermediate { background: rgba(13, 148, 136, 0.12); color: #0D9488; }
        .level-advanced { background: rgba(124, 58, 237, 0.12); color: #7C3AED; }
        .level-master { background: rgba(5, 11, 26, 0.07); color: #050B1A; border: 1px solid #E2E8F0; }

        .sm-instructor-text { font-size: 13px; color: #64748B; }
        .sm-date-text { font-size: 13px; color: #64748B; }
        
        .sm-action-btn { background: transparent; border: none; color: #94A3B8; cursor: pointer; padding: 8px; border-radius: 4px; }
        .sm-action-btn:hover { background: #F8FAFC; color: #0F172A; }

        .sm-loading { display: flex; justify-content: center; align-items: center; height: 200px; }
        .sm-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(244, 63, 94, 0.2);
          border-top-color: #F43F5E;
          border-radius: 50%;
          animation: sm-spin 0.7s linear infinite;
        }
        @keyframes sm-spin { to { transform: rotate(360deg); } }

        /* Modal */
        .sm-modal-overlay {
          position: fixed; inset: 0; background: rgba(5,11,26,0.45);
          backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: sm-fadeIn 0.25s ease;
        }
        @keyframes sm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sm-modal {
          background: #FFFFFF; border-radius: 24px; padding: 36px; width: 100%; max-width: 480px;
          box-shadow: 0 24px 60px rgba(5,11,26,0.18);
          animation: sm-slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes sm-slideUp { from { transform: translateY(32px) scale(0.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .sm-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .sm-modal-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; color: #0F172A; margin: 0; }
        .sm-modal-close {
          background: #F1F5F9; border: none; width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748B;
        }
        .sm-modal-close:hover { background: #E2E8F0; }
        .sm-modal-form { display: flex; flex-direction: column; gap: 18px; }
        .sm-field { display: flex; flex-direction: column; gap: 6px; }
        .sm-field label { font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.4px; }
        .sm-field input, .sm-field select {
          height: 46px; border: 1.5px solid #E2E8F0; border-radius: 10px;
          padding: 0 14px; font-size: 14px; color: #0F172A; background: #FFF;
          outline: none; font-family: 'Instrument Sans', sans-serif; transition: border-color 0.2s;
        }
        .sm-field input:focus, .sm-field select:focus { border-color: #F43F5E; box-shadow: 0 0 0 3px rgba(244,63,94,0.1); }
        .sm-field input::placeholder { color: #94A3B8; }
        .sm-modal-actions { display: flex; gap: 12px; margin-top: 8px; }
        .sm-modal-actions .sm-btn-secondary { flex: 1; text-align: center; justify-content: center; }
        .sm-modal-actions .sm-btn-primary { flex: 1; justify-content: center; padding: 12px; font-size: 14px; }
        .sm-btn-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
          border-radius: 50%; animation: sm-spin 0.7s linear infinite;
        }

        /* Invite link button in table */
        .sm-invite-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(99,102,241,0.08); color: #6366F1;
          border: 1px solid rgba(99,102,241,0.25); padding: 6px 11px;
          border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .sm-invite-btn:hover { background: rgba(99,102,241,0.16); border-color: #6366F1; }

        /* Invite Modal Extras */
        .sm-invite-modal { max-width: 520px; }
        .invite-success-banner {
          display: flex; align-items: flex-start; gap: 14px;
          background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.2);
          border-radius: 14px; padding: 16px 18px; margin-bottom: 20px;
        }
        .invite-success-icon {
          width: 32px; height: 32px; border-radius: 50%;
          background: #10B981; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
        }
        .invite-success-title { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .invite-success-sub { font-size: 13px; color: #64748B; line-height: 1.5; }
        .invite-link-section { margin-bottom: 20px; }
        .invite-link-box {
          display: flex; gap: 8px; align-items: center;
          background: #F8FAFC; border: 1.5px solid #E2E8F0;
          border-radius: 12px; padding: 4px 4px 4px 14px; overflow: hidden;
        }
        .invite-link-input {
          flex: 1; border: none; outline: none; background: transparent;
          font-size: 13px; color: #334155; font-family: monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .invite-copy-btn {
          background: #F43F5E; color: #fff; border: none;
          border-radius: 8px; padding: 9px 16px; font-size: 13px;
          font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s; flex-shrink: 0;
        }
        .invite-copy-btn.copied { background: #10B981; }
        .invite-copy-btn:hover { opacity: 0.88; }
        .invite-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .invite-action-btn {
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          padding: 11px 16px; border-radius: 10px; font-size: 13px; font-weight: 700;
          cursor: pointer; text-decoration: none; border: none; transition: all 0.2s; min-width: 130px;
        }
        .invite-email { background: rgba(99,102,241,0.1); color: #6366F1; border: 1px solid rgba(99,102,241,0.2); }
        .invite-email:hover { background: rgba(99,102,241,0.18); }
        .invite-wa { background: rgba(37,211,102,0.1); color: #16A34A; border: 1px solid rgba(37,211,102,0.2); }
        .invite-wa:hover { background: rgba(37,211,102,0.18); }
        .invite-done { background: #F43F5E; color: #fff; }
        .invite-done:hover { background: #e8374f; }

        /* Add Students Modal (Multi-Mode) */
        .sm-add-student-modal { max-width: 1320px; width: 96%; max-height: 92vh; overflow-y: auto; }
        
        .sm-tab-cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .sm-tab-card {
          display: flex; gap: 12px; align-items: flex-start; padding: 16px;
          border: 1.5px solid #E2E8F0; border-radius: 14px; cursor: pointer;
          background: #FFFFFF; transition: all 0.2s;
        }
        .sm-tab-card:hover { border-color: #0D9488; }
        .sm-tab-card.active { border-color: #0D9488; background: rgba(13, 148, 136, 0.04); box-shadow: 0 4px 12px rgba(13,148,136,0.08); }
        .sm-tab-card-radio { font-size: 16px; color: #0D9488; font-weight: 700; margin-top: 2px; }
        .sm-tab-card-title { font-size: 14px; font-weight: 700; color: #0F172A; }
        .sm-tab-card-sub { font-size: 12px; color: #64748B; margin-top: 2px; line-height: 1.3; }

        .sm-single-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
        .sm-single-form { display: flex; flex-direction: column; gap: 16px; }
        .sm-form-section-title { font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 4px 0; }
        .sm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .sm-form-actions-row { margin-top: 8px; display: flex; justify-content: flex-end; }

        .sm-requirements-box {
          background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px;
          padding: 24px; height: fit-content;
        }
        .sm-req-title { font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; }
        .sm-req-list { display: flex; flex-direction: column; gap: 14px; }
        .sm-req-item { display: flex; gap: 10px; font-size: 13px; color: #475569; line-height: 1.5; }
        .sm-req-check { color: #10B981; font-weight: 800; font-size: 14px; flex-shrink: 0; }
        .sm-req-warn { color: #D97706; background: rgba(245, 158, 11, 0.08); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(245,158,11,0.2); }
        .sm-req-warn-icon { font-size: 14px; flex-shrink: 0; }

        /* Bulk Grid Entry */
        .sm-bulk-grid-layout { display: flex; flex-direction: column; gap: 20px; }
        .sm-bulk-table-wrap { overflow-x: auto; border: 1px solid #CBD5E1; border-radius: 12px; background: #FFF; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .sm-bulk-table { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .sm-bulk-table th { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; background: #F1F5F9; padding: 14px 12px; border-bottom: 2px solid #CBD5E1; text-align: left; white-space: nowrap; }
        .sm-bulk-table td { padding: 10px 10px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
        .sm-bulk-table input, .sm-bulk-table select {
          width: 100%; height: 42px; border: 1.5px solid #CBD5E1; border-radius: 8px;
          padding: 0 12px; font-size: 13px; font-weight: 500; color: #0F172A; background: #FFF; outline: none;
          box-sizing: border-box; transition: all 0.15s ease;
        }
        .sm-bulk-table input:focus, .sm-bulk-table select:focus {
          border-color: #0D9488;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }
        .sm-bulk-actions-bar { display: flex; justify-content: space-between; align-items: center; }
        .sm-bulk-tips-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; }
        .sm-tips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* CSV Mode */
        .sm-csv-layout { display: grid; grid-template-columns: 2.2fr 1fr; gap: 24px; }
        .sm-csv-left { display: flex; flex-direction: column; gap: 24px; }
        .sm-dropzone {
          border: 2px dashed #CBD5E1; border-radius: 18px; padding: 36px 20px;
          text-align: center; background: #FAFAFA; transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .sm-dropzone.active { border-color: #0D9488; background: rgba(13, 148, 136, 0.05); }
        .sm-dropzone-icon { font-size: 38px; margin-bottom: 4px; }
        .sm-dropzone-title { font-size: 16px; font-weight: 700; color: #0F172A; }
        .sm-dropzone-sub { font-size: 12px; color: #94A3B8; }
        .sm-browse-btn { cursor: pointer; display: inline-block; }
        .sm-dropzone-hint { font-size: 11px; color: #94A3B8; margin-top: 4px; }
        .sm-csv-filename { font-size: 13px; font-weight: 700; color: #0D9488; background: rgba(13,148,136,0.1); padding: 6px 14px; border-radius: 20px; }

        .sm-csv-table { width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; font-size: 13px; }
        .sm-csv-table th { background: #F8FAFC; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #E2E8F0; }
        .sm-csv-table td { padding: 10px 14px; border-bottom: 1px solid #F1F5F9; color: #334155; }
        .sm-badge-req { background: #FEE2E2; color: #EF4444; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
        .sm-badge-opt { background: #ECFDF5; color: #10B981; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }

        /* Review Summary Screen (Image 4) */
        .sm-summary-layout { display: flex; flex-direction: column; gap: 20px; }
        .sm-summary-banner {
          display: flex; align-items: center; gap: 12px;
          background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46;
          font-weight: 700; border-radius: 14px; padding: 16px 20px; font-size: 16px;
        }
        .sm-summary-banner-check {
          width: 26px; height: 26px; border-radius: 50%; background: #10B981; color: #FFF;
          display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800;
        }
        .sm-summary-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; }
        
        .sm-summary-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 18px; padding: 24px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .sm-summary-avatar-row { display: flex; align-items: center; gap: 16px; }
        .sm-summary-avatar {
          width: 54px; height: 54px; border-radius: 50%; background: #CCFBF1; color: #0D9488;
          display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800;
        }
        .sm-summary-name { font-size: 20px; font-weight: 700; color: #0F172A; }
        .sm-summary-enrolled { font-size: 12px; color: #64748B; margin-top: 2px; }

        .sm-summary-details-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .sm-summary-details-table td { padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
        .sm-summary-details-table td:first-child { color: #64748B; font-weight: 600; width: 45%; }
        .sm-summary-details-table td:last-child { color: #0F172A; font-weight: 700; }
        
        .sm-summary-teal-badge { background: rgba(13, 148, 136, 0.12); color: #0D9488; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
        .sm-summary-active-tag { background: #ECFDF5; color: #10B981; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; }

        .sm-summary-card-actions { display: flex; gap: 12px; margin-top: 8px; }
        .sm-summary-pink-btn { background: #F43F5E; }

        .sm-summary-right-col { display: flex; flex-direction: column; gap: 16px; }
        .sm-summary-panel { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        
        .sm-qa-action-item {
          display: flex; align-items: center; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0;
          border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.2s;
        }
        .sm-qa-action-item:hover { border-color: #0D9488; background: #F0FDF4; }
        .sm-qa-icon { font-size: 20px; }
        .sm-qa-text { flex: 1; }
        .sm-qa-title { font-size: 13px; font-weight: 700; color: #0F172A; }
        .sm-qa-sub { font-size: 11px; color: #64748B; margin-top: 2px; }
        .sm-qa-arrow { font-size: 16px; color: #0D9488; font-weight: 800; }

        .sm-qa-toggle-item {
          display: flex; align-items: center; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0;
          border-radius: 12px; padding: 14px;
        }
        .sm-toggle-input { width: 20px; height: 20px; accent-color: #0D9488; cursor: pointer; }

        .sm-session-stat-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 18px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .sm-ssc-label { font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; }
        .sm-ssc-value { font-size: 32px; font-weight: 800; color: #0F172A; line-height: 1; }
        .sm-ssc-sub { font-size: 12px; color: #64748B; }

        .sm-summary-step-bar {
          display: flex; align-items: center; justify-content: center; gap: 16px;
          padding-top: 16px; border-top: 1px solid #E2E8F0;
        }
        .sm-step-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #94A3B8; }
        .sm-step-item.done { color: #10B981; }
        .sm-step-item.active { color: #0D9488; }
        .sm-step-circle {
          width: 24px; height: 24px; border-radius: 50%; background: #E2E8F0; color: #475569;
          display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
        }
        .sm-step-item.done .sm-step-circle { background: #10B981; color: #FFF; }
        .sm-step-item.active .sm-step-circle { background: #0D9488; color: #FFF; }
        .sm-step-line { width: 32px; height: 2px; background: #E2E8F0; }

        /* Responsive Overrides */
        @media (max-width: 900px) {
          .sm-main {
            padding: 20px 16px !important;
            gap: 20px !important;
            margin-left: 0 !important;
            width: 100% !important;
          }
          .sm-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .sm-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .sm-actions {
            width: 100% !important;
            flex-wrap: wrap !important;
          }
          .sm-actions button {
            flex: 1 !important;
            justify-content: center !important;
          }
        }

        .sm-label-short { display: none; }
        .sm-label-full { display: inline; }
        .sm-mobile-scroll-hint { display: none; }
        .sm-empty-state-card {
          text-align: center;
          padding: 44px 20px;
          width: 100%;
          box-sizing: border-box;
          background: #FFFFFF;
        }

        @media (max-width: 768px) {
          .sm-label-full { display: none !important; }
          .sm-label-short { display: inline !important; }
          .sm-mobile-scroll-hint {
            display: block !important;
            background: #F0FDFA;
            border-bottom: 1px solid #CCFBF1;
            padding: 8px 12px;
            font-size: 11.5px;
            font-weight: 600;
            color: #0F766E;
            text-align: center;
          }
          .sm-main {
            margin-top: 64px !important;
            padding: 14px 12px 90px 12px !important;
            gap: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .sm-header {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            text-align: left !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .sm-header-text {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            text-align: left !important;
            width: 100% !important;
          }
          .sm-title {
            font-size: 20px !important;
            text-align: left !important;
            line-height: 1.2 !important;
            width: 100% !important;
          }
          .sm-sub {
            font-size: 12px !important;
            text-align: left !important;
            margin: 2px 0 0 0 !important;
            line-height: 1.35 !important;
            width: 100% !important;
          }
          .sm-actions {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .sm-btn-secondary,
          .sm-btn-primary {
            flex: 1 1 auto !important;
            min-width: 110px !important;
            height: 38px !important;
            padding: 6px 12px !important;
            font-size: 12.5px !important;
            font-weight: 700 !important;
            border-radius: 8px !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }
          .sm-filters {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 8px !important;
            border-radius: 10px !important;
            background: #FFFFFF !important;
            box-sizing: border-box !important;
          }
          .sm-search-wrap {
            flex: 1 !important;
            height: 38px !important;
            padding: 0 10px !important;
            gap: 6px !important;
            background: #F8FAFC !important;
            border: 1px solid #E2E8F0 !important;
            border-radius: 8px !important;
            box-sizing: border-box !important;
          }
          .sm-search-input {
            font-size: 12px !important;
          }
          .sm-select {
            width: 120px !important;
            height: 38px !important;
            padding: 0 8px !important;
            font-size: 11.5px !important;
            border-radius: 8px !important;
            border: 1px solid #E2E8F0 !important;
            background: #F8FAFC !important;
            box-sizing: border-box !important;
          }
          .sm-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 4px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .sm-stat-card {
            height: 48px !important;
            min-width: 0 !important;
            border-radius: 8px !important;
            border: 1.5px solid #E2E8F0 !important;
            padding: 4px 1px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 1px !important;
            background: #FFFFFF !important;
            box-sizing: border-box !important;
          }
          .sm-stat-value {
            font-size: 16px !important;
            font-weight: 800 !important;
            line-height: 1.1 !important;
          }
          .sm-stat-label {
            font-size: 8px !important;
            font-weight: 700 !important;
            letter-spacing: 0 !important;
            text-transform: uppercase !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: clip !important;
            max-width: 100% !important;
            text-align: center !important;
          }
          .sm-table-container {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            border-radius: 12px !important;
          }
          .sm-table {
            min-width: 720px !important;
          }
          .sm-modal {
            width: calc(100% - 24px) !important;
            padding: 20px 16px !important;
            margin: 12px !important;
            max-height: 90vh !important;
            border-radius: 18px !important;
          }
          .sm-modal-form {
            gap: 14px !important;
          }
          .sm-modal-actions {
            flex-direction: column !important;
          }
          .sm-modal-actions button {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentsManagement;
