import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const formatExperience = (exp) => {
  if (!exp && exp !== 0) return '—';
  const str = String(exp).trim();
  if (/^\d+$/.test(str)) return `${str} Years`;
  return str;
};

const InstructorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeSchoolName = (() => {
    try {
      const savedSchool = sessionStorage.getItem('activeSchool');
      if (savedSchool) {
        const parsed = JSON.parse(savedSchool);
        if (typeof parsed === 'string') return parsed;
        if (parsed?.name && typeof parsed.name === 'string') return parsed.name;
        if (parsed?.name && typeof parsed.name === 'object' && parsed.name.name) return String(parsed.name.name);
      }
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (typeof parsedUser?.school_name === 'string') return parsedUser.school_name;
        if (typeof parsedUser?.school === 'string') return parsedUser.school;
        if (parsedUser?.school && typeof parsedUser.school === 'object' && parsedUser.school.name) return String(parsedUser.school.name);
        if (parsedUser?.school_name && typeof parsedUser.school_name === 'object' && parsedUser.school_name.name) return String(parsedUser.school_name.name);
      }
    } catch (e) {}
    return '';
  })();

  // Auth states
  const [currentUser, setCurrentUser] = useState(null);
  const [schoolsList, setSchoolsList] = useState([]);
  const [schoolsData, setSchoolsData] = useState([]);

  const getSchoolLocation = (schoolName) => {
    if (!schoolName || schoolName === 'Individual / Freelance Coach') return '';
    const cleanName = schoolName.toLowerCase().trim();
    const found = schoolsData.find(s => (s.name || '').toLowerCase().trim() === cleanName);
    if (found) {
      const parts = [found.city, found.country].filter(Boolean);
      return parts.join(', ') || found.city || found.country || '';
    }
    return '';
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const str = String(dobString).trim();
    const birthDate = new Date(str);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    dob: '',
    age: '',
    gender: 'Male',
    bio: '',
    experience: '',
    fitness_level: 'Elite',
    rates: '',
    location: '',
    school: 'Individual / Freelance Coach',
    image: '',
    specializations: [],
    certifications: ''
  });

  const isSchoolAffiliated = Boolean(editForm.school) && editForm.school !== 'Individual / Freelance Coach';

  // Password & Credentials State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [coachEmail, setCoachEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Dynamic data states for students and sessions
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [instructorSessions, setInstructorSessions] = useState([]);

  // Leave Application State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTab, setLeaveTab] = useState('apply'); // 'apply' or 'history'
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState('');
  const [leavesList, setLeavesList] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [withdrawingId, setWithdrawingId] = useState(null);

  const [dismissedLeaveIds, setDismissedLeaveIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_leave_replies') || '[]');
    } catch {
      return [];
    }
  });

  const dismissNotification = (id) => {
    const next = [...dismissedLeaveIds, id];
    setDismissedLeaveIds(next);
    try {
      localStorage.setItem('dismissed_leave_replies', JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  };

  const reviewedLeaves = leavesList.filter(l => l.status === 'Approved' || l.status === 'Rejected');
  const unacknowledgedLeaves = reviewedLeaves.filter(l => !dismissedLeaveIds.includes(l.id));

  const fetchLeaves = async (coachId) => {
    if (!coachId) return;
    try {
      const res = await fetch(`${API}/api/instructors/${coachId}/leave-requests`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => (b.id || 0) - (a.id || 0));
          setLeavesList(sorted);
        }
      }
    } catch (e) {
      console.error('Error fetching leaves:', e);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const str = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr: str, isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr: str, isCurrentMonth: true });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const str = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr: str, isCurrentMonth: false });
    }
    return days;
  };

  const handleCalendarDayClick = (dateStr) => {
    setLeaveError('');
    if (!leaveStartDate || (leaveStartDate && leaveEndDate)) {
      setLeaveStartDate(dateStr);
      setLeaveEndDate('');
    } else if (leaveStartDate && !leaveEndDate) {
      if (dateStr < leaveStartDate) {
        setLeaveStartDate(dateStr);
      } else {
        setLeaveEndDate(dateStr);
      }
    }
  };

  const calculateDaysCount = (start, end) => {
    if (!start) return 0;
    const e = end || start;
    try {
      const d1 = new Date(start);
      const d2 = new Date(e);
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch (err) {
      return 1;
    }
  };

  const handleApplyLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveError('');
    setLeaveSuccess('');

    if (!leaveStartDate) {
      setLeaveError('Please select a start date from the calendar or date picker.');
      return;
    }
    const finalEndDate = leaveEndDate || leaveStartDate;

    setSubmittingLeave(true);
    try {
      const coachId = instructor?.id || id;
      const res = await fetch(`${API}/api/instructors/${coachId}/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: leaveStartDate,
          end_date: finalEndDate,
          leave_type: leaveType,
          reason: leaveReason
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to submit leave request');
      }

      const newLeave = await res.json();
      setLeavesList(prev => [newLeave, ...prev.filter(l => l.id !== newLeave.id)]);
      setLeaveSuccess('Leave request applied successfully! Your School Admin has received it.');
      setLeaveReason('');
      setTimeout(() => {
        setLeaveTab('history');
        setLeaveSuccess('');
      }, 1500);
    } catch (err) {
      setLeaveError(err.message || 'Error submitting leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to withdraw this leave request?')) return;
    setWithdrawingId(leaveId);
    try {
      const res = await fetch(`${API}/api/leave-requests/${leaveId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setLeavesList(prev => prev.filter(l => l.id !== leaveId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWithdrawingId(null);
    }
  };

  useEffect(() => {
    fetch(`${API}/api/schools`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSchoolsData(data);
          const names = data.map(s => s.name).filter(Boolean);
          setSchoolsList(prev => Array.from(new Set([...names, ...prev])));
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (newPass.length < 6) {
      setPassError('Password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Passwords do not match.');
      return;
    }

    setIsSavingPass(true);
    try {
      const res = await fetch(`${API}/api/instructors/${id}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: coachEmail, password: newPass })
      });

      const data = await res.json();
      if (res.ok && (data.success || data.message)) {
        setPassSuccess(`Credentials updated successfully! You can now log in anytime with email: ${data.email || coachEmail}`);
        setInstructor(prev => ({ ...prev, email: data.email || coachEmail, password_plain: data.password_plain || newPass, has_password: true }));
        if (currentUser) {
          const updatedUser = { ...currentUser, email: data.email || coachEmail };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        setTimeout(() => {
          setShowPasswordModal(false);
          setPassSuccess('');
          setNewPass('');
          setConfirmPass('');
          setShowNewPass(false);
          setShowConfirmPass(false);
        }, 2200);
      } else {
        setPassError(data.detail || data.message || 'Failed to update password.');
      }
    } catch (err) {
      setPassError('Network error. Please try again.');
    } finally {
      setIsSavingPass(false);
    }
  };

  const matchesCoach = (item, coachId, coachName) => {
    if (!item) return false;
    const targetId = parseInt(coachId);
    if (targetId && (item.instructor_id === targetId || String(item.instructor_id) === String(targetId) || parseInt(item.instructor_id) === targetId)) {
      return true;
    }
    if (Array.isArray(item.instructor_ids) && targetId && (item.instructor_ids.includes(targetId) || item.instructor_ids.includes(String(targetId)))) {
      return true;
    }
    if (coachName) {
      const cNameLower = coachName.toLowerCase().trim();
      const itemInst = (item.instructor || item.instructor_name || item.primary_instructor || '').toLowerCase().trim();
      if (itemInst && (itemInst === cNameLower || itemInst.includes(cNameLower) || cNameLower.includes(itemInst))) {
        return true;
      }
    }
    return false;
  };

  const fetchDynamicData = (coachObj) => {
    const currentCoach = coachObj || instructor;
    const coachId = id || currentCoach?.id;
    const coachName = currentCoach?.name || '';
    const coachSchool = (currentCoach?.school || '').trim();
    const isFreelance = coachSchool.toLowerCase() === 'individual / freelance coach';

    // If coachObj has assigned_students directly from backend API
    if (Array.isArray(coachObj?.assigned_students) && coachObj.assigned_students.length > 0) {
      if (isFreelance) {
        setAssignedStudents(coachObj.assigned_students.filter(s => (s.school || '').toLowerCase().trim() === 'individual / freelance coach'));
      } else if (coachSchool) {
        setAssignedStudents(coachObj.assigned_students.filter(s => (s.school || '').toLowerCase().trim() === coachSchool.toLowerCase()));
      } else {
        setAssignedStudents(coachObj.assigned_students);
      }
    }

    Promise.all([
      fetch(`${API}/api/students`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/sessions`).then(r => r.json()).catch(() => [])
    ]).then(([studentsData, sessionsData]) => {
      const allStudents = Array.isArray(studentsData) ? studentsData : [];
      const allSessions = Array.isArray(sessionsData) ? sessionsData : [];

      // 1. Sessions for this coach isolated by affiliation
      const coachSessions = allSessions.filter(s => {
        if (!matchesCoach(s, coachId, coachName)) return false;
        const sSchool = (s.school || '').toLowerCase().trim();
        if (isFreelance) {
          return !sSchool || sSchool === 'individual / freelance coach';
        } else if (coachSchool) {
          return sSchool === coachSchool.toLowerCase();
        }
        return true;
      });
      setInstructorSessions(coachSessions);

      // 2. Identify students associated with this coach isolated by affiliation
      const sessionStudentIds = new Set(coachSessions.map(sess => String(sess.student_id)).filter(Boolean));
      const sessionStudentNames = new Set(coachSessions.map(sess => (sess.student || '').toLowerCase().trim()).filter(Boolean));

      const matchedStudents = [];
      const seenStudentIds = new Set();
      const seenStudentNames = new Set();

      // Check allStudents
      allStudents.forEach(s => {
        const sSchool = (s.school || s.school_name || '').toLowerCase().trim();
        if (isFreelance) {
          const isFreelanceSt = sSchool === 'individual / freelance coach' || (!sSchool && String(s.created_by_user_id) === String(coachId));
          if (!isFreelanceSt) return;
        } else if (coachSchool) {
          if (sSchool !== coachSchool.toLowerCase()) return;
        }

        const sIdStr = s.id ? String(s.id) : '';
        const sNameLower = (s.name || '').toLowerCase().trim();

        const isDirect = matchesCoach(s, coachId, coachName);
        const isInSession = (sIdStr && sessionStudentIds.has(sIdStr)) || (sNameLower && sessionStudentNames.has(sNameLower));

        if (isDirect || isInSession) {
          matchedStudents.push(s);
          if (sIdStr) seenStudentIds.add(sIdStr);
          if (sNameLower) seenStudentNames.add(sNameLower);
        }
      });

      // Also ensure any student appearing in coachSessions is included even if not in allStudents
      coachSessions.forEach(sess => {
        const sessName = sess.student || '';
        const sessIdStr = sess.student_id ? String(sess.student_id) : '';
        const sessNameLower = sessName.toLowerCase().trim();

        if (sessName && !seenStudentNames.has(sessNameLower) && (!sessIdStr || !seenStudentIds.has(sessIdStr))) {
          matchedStudents.push({
            id: sess.student_id || `sess_${sess.id}`,
            name: sessName,
            level: sess.type || 'Beginner',
            last_active: sess.date || 'Today',
            image: sess.image_url || ''
          });
          if (sessIdStr) seenStudentIds.add(sessIdStr);
          seenStudentNames.add(sessNameLower);
        }
      });

      setAssignedStudents(matchedStudents);
    }).catch(err => console.error("Error fetching coach dynamic data:", err));
  };

  const getFallbackInstructor = (coachId, userObj) => {
    const saved = userObj || JSON.parse(sessionStorage.getItem('user') || '{}');
    const savedAccs = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
    const emailLower = (saved.email || '').toLowerCase().trim();
    const nameLower = (saved.name || '').toLowerCase().trim();
    
    const acc = savedAccs.find(a => 
      (emailLower && (a.email || '').toLowerCase().trim() === emailLower) ||
      (nameLower && (a.name || '').toLowerCase().trim() === nameLower) ||
      (coachId && (a.instructor_id === coachId || a.id === coachId || String(a.id) === String(coachId)))
    );

    const coachName = acc?.name || saved.name || (saved.role === 'coach' ? saved.name : 'Surf Coach');
    const coachEmail = acc?.email || saved.email || '';
    const userSchoolStr = typeof saved.school === 'string' ? saved.school : (saved.school?.name || saved.school_name || '');
    const coachSchool = acc?.school || userSchoolStr || activeSchoolName || '';

    return {
      id: parseInt(coachId) || saved.instructor_id || saved.id || 1,
      name: coachName && coachName !== 'System Admin' ? coachName : 'Surf Coach',
      email: coachEmail,
      age: acc?.age || saved.age || 28,
      gender: acc?.gender || saved.gender || 'Male',
      fitness_level: acc?.fitness_level || 'Advanced',
      experience: acc?.experience || '3 Years',
      certifications: acc?.certifications || ['ISA Level 1', 'Lifeguard Certified'],
      image: acc?.image || saved.image || '',
      bio: acc?.bio || saved.bio || `Professional surf coach at ${coachSchool}. Dedicated to student progression and wave mastery.`,
      specializations: acc?.specializations || ['S&C', 'Video Analysis'],
      rates: acc?.rates || '$75 / hr',
      location: acc?.location || saved.location || 'North Shore, Oahu',
      school: coachSchool,
      reviews: []
    };
  };

  const fetchInstructor = async () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('user') || '{}');

      // 1. Try direct fetch by ID
      let data = null;
      try {
        const res = await fetch(`${API}/api/instructors/${id}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {}

      // 2. If direct ID fetch failed, search all instructors list
      if (!data) {
        try {
          const listRes = await fetch(`${API}/api/instructors`);
          if (listRes.ok) {
            const list = await listRes.json();
            if (Array.isArray(list)) {
              const matched = list.find(i => 
                String(i.id) === String(id) ||
                (saved.email && i.email && i.email.toLowerCase().trim() === saved.email.toLowerCase().trim()) ||
                (saved.name && i.name && i.name.toLowerCase().trim() === saved.name.toLowerCase().trim())
              );
              if (matched) data = matched;
            }
          }
        } catch (e) {}
      }

      if (data) {
        if (!data.specializations) data.specializations = [];
        if (!data.certifications) data.certifications = [];
        if (!data.reviews) data.reviews = [];

        // Dynamic sync: if data.school is missing, match activeSchoolName
        if (activeSchoolName && !data.school) {
          data.school = activeSchoolName;
        }

        setInstructor(data);
        if (data.email) setCoachEmail(data.email);
        if (Array.isArray(data.leaves)) setLeavesList(data.leaves);
        fetchLeaves(data.id || id);
        fetchDynamicData(data);
      } else {
        const fallback = getFallbackInstructor(id, saved);
        setInstructor(fallback);
        if (fallback.email) setCoachEmail(fallback.email);
        fetchDynamicData(fallback);
      }
    } catch (err) {
      const saved = JSON.parse(sessionStorage.getItem('user') || '{}');
      const fallback = getFallbackInstructor(id, saved);
      setInstructor(fallback);
      fetchDynamicData(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {}
    }
    fetchInstructor();
  }, [id]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setUploadingPhoto(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/upload-image`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const uploadedUrl = data.image_url || data.url;
        if (uploadedUrl) {
          setEditForm(prev => ({ ...prev, image: uploadedUrl }));
        }
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEditClick = () => {
    setEditForm({
      name: instructor.name || '',
      email: instructor.email || '',
      phone: instructor.phone || '',
      dob: instructor.dob || '',
      age: instructor.age || (instructor.dob ? calculateAge(instructor.dob) : '') || '',
      gender: instructor.gender || 'Male',
      bio: instructor.bio || '',
      experience: instructor.experience || '',
      fitness_level: instructor.fitness_level || 'Elite',
      rates: instructor.rates || '',
      location: instructor.location || '',
      school: instructor.school || 'Individual / Freelance Coach',
      image: (instructor.image && !instructor.image.startsWith('blob:')) ? instructor.image : '',
      specializations: instructor.specializations || [],
      certifications: (instructor.certifications || []).join('\n')
    });
    setPhotoPreview('');
    setShowEditModal(true);
  };

  const handleCheckboxChange = (spec) => {
    const specs = [...editForm.specializations];
    if (specs.includes(spec)) {
      setEditForm({ ...editForm, specializations: specs.filter(s => s !== spec) });
    } else {
      setEditForm({ ...editForm, specializations: [...specs, spec] });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (uploadingPhoto) return;
    setSaving(true);
    try {
      const token = sessionStorage.getItem('token');
      const safeImage = (editForm.image && !editForm.image.startsWith('blob:')) ? editForm.image : '';
      const calcAge = calculateAge(editForm.dob);
      const payload = {
        name: editForm.name,
        phone: editForm.phone || '',
        dob: editForm.dob || '',
        age: calcAge || (editForm.age ? parseInt(editForm.age) : null),
        gender: editForm.gender || 'Male',
        bio: editForm.bio,
        experience: editForm.experience,
        fitness_level: editForm.fitness_level,
        specializations: editForm.specializations,
        rates: editForm.rates,
        location: isSchoolAffiliated ? (getSchoolLocation(editForm.school) || editForm.location) : editForm.location,
        school: editForm.school || 'Individual / Freelance Coach',
        certifications: editForm.certifications.split('\n').filter(c => c.trim() !== '')
      };
      if (safeImage) {
        payload.image = safeImage;
      }

      const res = await fetch(`${API}/api/instructors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newSchool = editForm.school || 'Individual / Freelance Coach';
        if (currentUser && (
          currentUser.instructor_id === parseInt(id) ||
          currentUser.id === parseInt(id) ||
          (currentUser.email && instructor?.email && currentUser.email.toLowerCase().trim() === instructor.email.toLowerCase().trim())
        )) {
          const updatedUser = {
            ...currentUser,
            name: editForm.name,
            image: safeImage || currentUser.image,
            school: newSchool,
            school_name: newSchool
          };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        
        const activeSch = typeof sessionStorage.getItem('activeSchool') === 'string' && sessionStorage.getItem('activeSchool')?.startsWith('{')
          ? JSON.stringify({ name: newSchool })
          : newSchool;
        sessionStorage.setItem('activeSchool', activeSch);

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('user_updated'));

        setShowEditModal(false);
        setPhotoPreview('');
        const updatedInst = {
          ...instructor,
          ...payload,
          school: newSchool
        };
        setInstructor(updatedInst);
        fetchDynamicData(updatedInst);
        fetchInstructor();
      } else {
        alert('Failed to save profile changes.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to the server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="db-page"><Sidebar /><main className="db-main"><div className="db-loading"><div className="db-spinner" /></div></main></div>;
  if (!instructor) return <div className="db-page"><Sidebar /><main className="db-main">Instructor not found</main></div>;

  const activeSchoolStr = sessionStorage.getItem('activeSchool') || '';
  const isSuperAdmin = currentUser?.role === 'superadmin' || 
                       currentUser?.role === 'super_admin' || 
                       activeSchoolStr.toLowerCase().includes('super admin');

  const isSchoolAdmin = currentUser?.role === 'school_admin' || 
                        currentUser?.role === 'school' || 
                        currentUser?.role === 'admin' ||
                        currentUser?.role === 'schooladmin' ||
                        Boolean(currentUser?.school_name || (currentUser?.school && currentUser?.role !== 'coach' && currentUser?.role !== 'instructor'));

  const isCoachThemselves = (currentUser?.role === 'coach' || currentUser?.role === 'instructor') && (
    currentUser?.instructor_id === parseInt(id) ||
    currentUser?.id === parseInt(id) ||
    (currentUser?.email && instructor?.email && currentUser.email.toLowerCase().trim() === instructor.email.toLowerCase().trim())
  );

  // School Admin should NEVER see Edit Profile button; only the coach themselves when logged in
  const canEditProfile = !isSchoolAdmin && isCoachThemselves;

  const userRole = (currentUser?.role || (() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
      return u.role || '';
    } catch (e) {
      return '';
    }
  })()).toLowerCase().trim();
  const isStudent = userRole === 'athlete' || userRole === 'student' || userRole === 'user';


  return (
    <div className="ip-page">
      <Sidebar />
      <main className="ip-main">
        {/* Hero */}
        <section className="ip-hero">
          {instructor.image && typeof instructor.image === 'string' && instructor.image.trim() !== '' ? (
            <img 
              src={instructor.image} 
              alt={instructor.name} 
              className="ip-hero-avatar"
              onError={e => {
                e.currentTarget.style.display = 'none';
                const fb = e.currentTarget.parentElement.querySelector('.ip-avatar-fallback');
                if (fb) fb.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="ip-avatar-fallback ip-hero-avatar" 
            style={{ 
              display: (instructor.image && typeof instructor.image === 'string' && instructor.image.trim() !== '') ? 'none' : 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', 
              color: '#FFFFFF', 
              fontFamily: 'Outfit, sans-serif', 
              fontSize: '36px', 
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(13, 148, 136, 0.3)'
            }}
          >
            {(instructor.name || 'C')[0].toUpperCase()}
          </div>
          <div className="ip-hero-info">
            <h1 className="ip-hero-name">{instructor.name}</h1>
            <p className="ip-hero-sub">Age {instructor.age || '—'} • {instructor.location || 'Not Specified'}</p>
            <div className="ip-hero-badges">
              <span className="ip-badge-primary">ISA CERTIFIED</span>
              <span className="ip-badge-active">ACTIVE</span>
              {(instructor.is_on_leave || instructor.active_leave) && (
                <span 
                  className="ip-badge-leave"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    letterSpacing: '0.04em'
                  }}
                >
                  🏖️ ON LEAVE
                </span>
              )}
            </div>
          </div>
          {canEditProfile && (
            <div className="ip-hero-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
              {(!instructor.has_password && !instructor.user_id && !instructor.password_plain) && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setCoachEmail(instructor.email || '');
                    setShowPasswordModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(2, 132, 199, 0.25) 100%)',
                    color: '#2DD4BF',
                    border: '1px solid rgba(45, 212, 191, 0.4)',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '700',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.15)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <span>🔑 Set Password / Login ID</span>
                </button>
              )}

              <button 
                className="btn-secondary apply-leave-btn" 
                onClick={() => {
                  setShowLeaveModal(true);
                  if (unacknowledgedLeaves.length > 0) {
                    setLeaveTab('history');
                  } else {
                    setLeaveTab('apply');
                  }
                }} 
                style={{ 
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', 
                  color: '#FFF', 
                  border: '1px solid rgba(45, 212, 191, 0.4)', 
                  padding: '10px 18px', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '7px' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Apply Leave</span>
                {unacknowledgedLeaves.length > 0 && (
                  <span
                    style={{
                      marginLeft: '8px',
                      background: unacknowledgedLeaves[0].status === 'Approved' ? '#10B981' : '#EF4444',
                      color: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{unacknowledgedLeaves[0].status === 'Approved' ? '✓' : '!'}</span>
                    <span>{unacknowledgedLeaves[0].status}</span>
                  </span>
                )}
              </button>

              <button className="btn-secondary edit-profile-btn" onClick={handleEditClick} style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Profile
              </button>
            </div>
          )}
        </section>

        {/* LEAVE REPLY NOTIFICATION BANNER */}
        {unacknowledgedLeaves.length > 0 && (() => {
          const note = unacknowledgedLeaves[0];
          const isApproved = note.status === 'Approved';
          return (
            <div
              style={{
                background: isApproved ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
                border: `1.5px solid ${isApproved ? '#A7F3D0' : '#FECDD3'}`,
                borderRadius: '18px',
                padding: '16px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: isApproved ? '0 6px 20px rgba(16, 185, 129, 0.12)' : '0 6px 20px rgba(244, 63, 94, 0.12)',
                animation: 'imFadeIn 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: isApproved ? '#10B981' : '#F43F5E',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0,
                    boxShadow: isApproved ? '0 4px 10px rgba(16, 185, 129, 0.3)' : '0 4px 10px rgba(244, 63, 94, 0.3)'
                  }}
                >
                  {isApproved ? '✅' : '❌'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '15.5px', color: isApproved ? '#065F46' : '#9F1239', fontWeight: 800 }}>
                      {isApproved ? '🎉 Leave Request Approved by Admin!' : '⚠️ Leave Request Declined by Admin'}
                    </strong>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isApproved ? '#A7F3D0' : '#FECDD3',
                        color: isApproved ? '#047857' : '#9F1239'
                      }}
                    >
                      {note.leave_type}
                    </span>
                    <span style={{ fontSize: '12.5px', color: isApproved ? '#047857' : '#9F1239', fontWeight: 600 }}>
                      📅 {note.start_date} {note.end_date && note.end_date !== note.start_date ? `to ${note.end_date}` : ''} ({note.total_days} Day{note.total_days > 1 ? 's' : ''})
                    </span>
                  </div>
                  {note.admin_notes ? (
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: isApproved ? '#065F46' : '#881337', lineHeight: '1.4' }}>
                      <strong>Admin Feedback:</strong> "{note.admin_notes}"
                    </p>
                  ) : (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: isApproved ? '#047857' : '#881337' }}>
                      Your leave request has been reviewed by your surf school administration.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveModal(true);
                    setLeaveTab('history');
                    dismissNotification(note.id);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isApproved ? '#0D9488' : '#E11D48',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  View Details
                </button>
                <button
                  type="button"
                  onClick={() => dismissNotification(note.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: 'transparent',
                    color: isApproved ? '#047857' : '#9F1239',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })()}

        <div className="ip-grid" style={isStudent && (!instructor.reviews || instructor.reviews.length === 0) ? { maxWidth: '780px', margin: '0 auto' } : {}}>
          {/* Left Column */}
          <div className="ip-col-left" style={isStudent && (!instructor.reviews || instructor.reviews.length === 0) ? { width: '100%', flex: 1 } : {}}>
            {/* Personal Details */}
            <div className="ip-card">
              <h3 className="ip-card-title">Personal Details</h3>
              <div className="ip-details-list">
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Email (Login ID)</span>
                  <span className="ip-detail-value" style={{ fontWeight: 700, color: instructor.email ? '#0F172A' : '#94A3B8' }}>
                    {instructor.email || 'No email set'}
                  </span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Phone / WhatsApp</span>
                  <span className="ip-detail-value" style={{ fontWeight: 700, color: instructor.phone ? '#0F172A' : '#94A3B8' }}>
                    {instructor.phone ? (
                      <a
                        href={`https://wa.me/${String(instructor.phone).replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#0D9488', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>📱 {instructor.phone}</span>
                        <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#16A34A', padding: '1px 7px', borderRadius: '8px', fontWeight: 800 }}>WhatsApp</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Date of Birth (DOB)</span>
                  <span className="ip-detail-value" style={{ fontWeight: 600 }}>
                    {instructor.dob ? (
                      <>
                        {instructor.dob}
                        {calculateAge(instructor.dob) ? (
                          <span style={{ color: '#64748B', fontWeight: 500, marginLeft: '6px', fontSize: '12px' }}>
                            ({calculateAge(instructor.dob)} years old)
                          </span>
                        ) : null}
                      </>
                    ) : (instructor.age ? `${instructor.age} years old` : '—')}
                  </span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Affiliation / School</span>
                  <span className="ip-detail-value" style={{ fontWeight: 600, color: '#0D9488' }}>
                    {instructor?.school || activeSchoolName || 'Individual / Freelance Coach'}
                  </span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Fitness Level</span>
                  <span className="ip-detail-value">{instructor.fitness_level}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Experience</span>
                  <span className="ip-detail-value">{formatExperience(instructor.experience)}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Hourly Rate</span>
                  <span className="ip-detail-value">{instructor.rates || '—'}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Location</span>
                  <span className="ip-detail-value">{instructor.location || '—'}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Specializations</span>
                  <span className="ip-detail-value" style={{ maxWidth: '180px', textAlign: 'right', whiteSpace: 'normal' }}>
                    {(instructor.specializations || []).join(', ') || '—'}
                  </span>
                </div>
              </div>
              <div className="ip-divider" />
              <div className="ip-bio">
                <span className="ip-bio-label">Bio</span>
                <p className="ip-bio-text">{instructor.bio || 'No bio added yet.'}</p>
              </div>
            </div>

            {/* Certifications */}
            <div className="ip-card">
              <h3 className="ip-card-title">Certifications</h3>
              <ul className="ip-cert-list">
                {instructor.certifications && instructor.certifications.map(cert => (
                  <li key={cert} className="ip-cert-item">
                    <div className="ip-cert-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <span>{cert}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column */}
          {(!isStudent || (instructor.reviews && instructor.reviews.length > 0)) && (
            <div className="ip-col-right">

            {/* Assigned Students (Admin & Coach only) */}
            {!isStudent && (
              <div className="ip-card">
                <h3 className="ip-card-title">Assigned Students ({assignedStudents.length})</h3>
                <div className="ip-student-list">
                  {assignedStudents.length > 0 ? (
                    assignedStudents.map((s, i) => (
                      <div 
                        key={s.id} 
                        className="ip-student-row" 
                        style={{ 
                          borderBottom: i === assignedStudents.length - 1 ? 'none' : '1px solid #E2E8F0',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/students/${s.id}`)}
                      >
                        <div className="ip-student-info">
                          {s.image && typeof s.image === 'string' && s.image.trim() !== '' && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791') ? (
                            <img 
                              src={s.image} 
                              alt={s.name} 
                              className="ip-student-avatar" 
                              onError={e => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement.querySelector('.ip-student-fallback');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="ip-student-fallback"
                            style={{
                              display: (s.image && typeof s.image === 'string' && s.image.trim() !== '' && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791')) ? 'none' : 'flex',
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                              color: '#FFFFFF',
                              fontWeight: '800',
                              fontSize: '14px',
                              fontFamily: 'Outfit, sans-serif',
                              flexShrink: 0
                            }}
                          >
                            {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="ip-student-name">{s.name}</div>
                            <div className="ip-student-time">{s.last_active || 'Today'}</div>
                          </div>
                        </div>
                        <span className={`ip-level-badge level-${(s.level || 'Beginner').toLowerCase()}`}>{s.level || 'Beginner'}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                      No students assigned to this coach yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Student Reviews */}
            {instructor.reviews && instructor.reviews.length > 0 && (
              <div className="ip-card">
                <h3 className="ip-card-title">Student Reviews</h3>
                <div className="ip-reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {instructor.reviews.map((r, idx) => (
                    <div key={idx} className="ip-review-item" style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#0F172A' }}>{r.student}</strong>
                        <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 700 }}>{'★'.repeat(r.rating || 5)}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.4 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Session Activity (Admin & Coach only) */}
            {!isStudent && (
              <div className="ip-card">
                <h3 className="ip-card-title">Recent Session Activity</h3>
                <div className="ip-activity-list">
                  {instructorSessions.length > 0 ? (
                    instructorSessions.slice(0, 5).map((session, index) => (
                      <div key={session.id} className="ip-activity-row">
                        <div className="ip-activity-icon" />
                        <div className="ip-activity-info">
                          <div className="ip-activity-title">Session with {session.student}</div>
                          <div className="ip-activity-sub">{session.location} • {session.date} at {session.time}</div>
                        </div>
                        <span className="ip-badge-primary">{session.type}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                      No session activity recorded yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

        {/* EDIT PROFILE MODAL */}
        {showEditModal && (
          <div className="sp-modal-overlay">
            <div className="sp-modal glass">
              <div className="sp-modal-header">
                <h3>Edit Coach Profile</h3>
                <button className="sp-modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="sp-modal-body">
                  {/* Profile Photo Upload */}
                  <div className="sp-form-field" style={{ marginBottom: '16px' }}>
                    <label>Profile Photo</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePhotoUpload}
                    />
                    {(() => {
                      const displayImg = photoPreview || (editForm.image && typeof editForm.image === 'string' && editForm.image.trim() !== '' && !editForm.image.startsWith('blob:') ? editForm.image : null);
                      return (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            width: '100%',
                            padding: '12px 16px',
                            background: '#F8FAFC',
                            border: '2px dashed #CBD5E1',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                            {displayImg ? (
                              <img
                                src={displayImg}
                                alt="Coach Avatar"
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '2px solid #00D1B2'
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                                  color: '#FFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '20px'
                                }}
                              >
                                {editForm.name ? editForm.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                              {uploadingPhoto ? 'Uploading to cloud...' : (displayImg ? '✓ Change Photo' : 'Upload Profile Photo')}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              Click to select image (JPG, PNG, WEBP)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                      <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                    </div>
                    <div className="sp-form-field">
                      <label>Phone Number (WhatsApp) <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        required
                      />
                    </div>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Date of Birth (DOB) <span style={{ color: '#EF4444' }}>*</span></span>
                        {editForm.dob && calculateAge(editForm.dob) && (
                          <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700 }}>
                            Age: {calculateAge(editForm.dob)} yrs
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={editForm.dob || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const cAge = calculateAge(val);
                          setEditForm(prev => ({
                            ...prev,
                            dob: val,
                            age: cAge || prev.age
                          }));
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="sp-form-field">
                      <label>Gender <span style={{ color: '#EF4444' }}>*</span></label>
                      <select
                        value={editForm.gender || 'Male'}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        required
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>Experience (Years) <span style={{ color: '#EF4444' }}>*</span></label>
                      <input type="number" min="0" max="60" value={editForm.experience} onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })} placeholder="e.g. 5" required />
                    </div>
                    <div className="sp-form-field">
                      <label>Fitness Level <span style={{ color: '#EF4444' }}>*</span></label>
                      <select value={editForm.fitness_level} onChange={(e) => setEditForm({ ...editForm, fitness_level: e.target.value })} required>
                        <option value="Elite">Elite</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Beginner">Beginner</option>
                      </select>
                    </div>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>Hourly Rate <span style={{ color: '#EF4444' }}>*</span></label>
                      <input type="text" value={editForm.rates} onChange={(e) => setEditForm({ ...editForm, rates: e.target.value })} placeholder="e.g. $100 / hr" required />
                    </div>
                    <div className="sp-form-field">
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Location / Region <span style={{ color: '#EF4444' }}>*</span></span>
                        {isSchoolAffiliated && (
                          <span style={{ fontSize: '11px', color: '#0F766E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🔒 Locked to School
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={isSchoolAffiliated ? (getSchoolLocation(editForm.school) || editForm.location) : editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        placeholder={isSchoolAffiliated ? 'School location...' : 'e.g. Maui, Hawaii'}
                        readOnly={isSchoolAffiliated}
                        disabled={isSchoolAffiliated}
                        required={!isSchoolAffiliated}
                        style={isSchoolAffiliated ? { background: '#F1F5F9', color: '#334155', cursor: 'not-allowed', fontWeight: 600 } : {}}
                      />
                    </div>
                  </div>

                  <div className="sp-form-field">
                    <label>Affiliation / Surf School <span style={{ color: '#EF4444' }}>*</span></label>
                    <select
                      value={editForm.school || 'Individual / Freelance Coach'}
                      onChange={(e) => {
                        const chosen = e.target.value;
                        const isAff = chosen && chosen !== 'Individual / Freelance Coach';
                        setEditForm({
                          ...editForm,
                          school: chosen,
                          location: isAff ? (getSchoolLocation(chosen) || editForm.location) : ''
                        });
                      }}
                      required
                    >
                      <option value="Individual / Freelance Coach">👤 Individual / Freelance Coach (Independent)</option>
                      {schoolsList.filter(s => s !== 'Individual / Freelance Coach').map(s => (
                        <option key={s} value={s}>🏫 {s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sp-form-field">
                    <label>Bio <span style={{ color: '#EF4444' }}>*</span></label>
                    <textarea rows="3" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Write your coaching bio..." required></textarea>
                  </div>

                  <div className="sp-form-field">
                    <label>Coaching Specializations</label>
                    <div className="specializations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '6px' }}>
                      {['S&C', 'Nutrition', 'Video Analysis', 'Competition Strategy', 'Water Safety', 'Big Wave'].map(spec => (
                        <label key={spec} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={editForm.specializations.includes(spec)} onChange={() => handleCheckboxChange(spec)} />
                          <span>{spec}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="sp-form-field">
                    <label>Certifications (one certification per line) <span style={{ color: '#EF4444' }}>*</span></label>
                    <textarea rows="3" value={editForm.certifications} onChange={(e) => setEditForm({ ...editForm, certifications: e.target.value })} placeholder="e.g. ISA Level 2 Coach" required></textarea>
                  </div>
                </div>
                <div className="sp-modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => { setShowEditModal(false); setPhotoPreview(''); }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving || uploadingPhoto}>
                    {uploadingPhoto ? 'Uploading Photo...' : (saving ? 'Saving...' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Password & Login ID Modal */}
        {showPasswordModal && (
          <div className="sp-modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="sp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="sp-modal-header">
                <div>
                  <h3 className="sp-modal-title">Coach Login & Credentials</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                    Set your email and password to log in directly via the login portal.
                  </p>
                </div>
                <button className="sp-modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
              </div>

              {passError && (
                <div style={{ margin: '16px 24px 0 24px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  ⚠️ {passError}
                </div>
              )}
              {passSuccess && (
                <div style={{ margin: '16px 24px 0 24px', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  ✅ {passSuccess}
                </div>
              )}

              <form onSubmit={handleUpdatePassword}>
                <div className="sp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {instructor?.password_plain && (
                    <div style={{ padding: '12px 14px', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '11.5px', color: '#0F766E', fontWeight: 700, textTransform: 'uppercase' }}>Current Password:</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0D9488', fontFamily: 'monospace', marginTop: '2px' }}>
                          {instructor.password_plain}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(instructor.password_plain);
                            setCopiedPass(true);
                            setTimeout(() => setCopiedPass(false), 2000);
                          }
                        }}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: '#0D9488', color: '#FFF', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {copiedPass ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  )}

                  <div className="sp-form-field">
                    <label>Email Address (User ID)</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. coach@school.com"
                      value={coachEmail}
                      onChange={(e) => setCoachEmail(e.target.value)}
                    />
                    <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '2px' }}>
                      This email will be used as your Coach Login User ID.
                    </small>
                  </div>

                  <div className="sp-form-field">
                    <label>New Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        placeholder="Minimum 6 characters"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        style={{ width: '100%', paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                        title={showNewPass ? 'Hide password' : 'Show password'}
                      >
                        {showNewPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="sp-form-field">
                    <label>Confirm New Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        placeholder="Re-type new password"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        style={{ width: '100%', paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                        title={showConfirmPass ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="sp-modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isSavingPass} style={{ background: '#0D9488', borderColor: '#0D9488' }}>
                    {isSavingPass ? 'Saving Credentials...' : 'Save Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* APPLY LEAVE MODAL WITH INTERACTIVE CALENDAR */}
        {showLeaveModal && (
          <div className="sp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLeaveModal(false); }}>
            <div
              className="sp-modal glass"
              style={{
                maxWidth: '640px',
                width: '92%',
                height: 'min(720px, 90vh)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div className="sp-modal-header" style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D9488', fontSize: '18px' }}>
                    📅
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0F172A' }}>Apply for Leave</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      Select dates from the calendar and submit for School Admin approval.
                    </p>
                  </div>
                </div>
                <button className="sp-modal-close" onClick={() => setShowLeaveModal(false)}>&times;</button>
              </div>

              {/* Modal Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', padding: '0 24px' }}>
                <button
                  type="button"
                  onClick={() => setLeaveTab('apply')}
                  style={{
                    padding: '12px 18px',
                    border: 'none',
                    background: 'none',
                    borderBottom: leaveTab === 'apply' ? '2.5px solid #0D9488' : '2.5px solid transparent',
                    color: leaveTab === 'apply' ? '#0D9488' : '#64748B',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📅 Apply Leave</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveTab('history')}
                  style={{
                    padding: '12px 18px',
                    border: 'none',
                    background: 'none',
                    borderBottom: leaveTab === 'history' ? '2.5px solid #0D9488' : '2.5px solid transparent',
                    color: leaveTab === 'history' ? '#0D9488' : '#64748B',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📋 My Requests ({leavesList.length})</span>
                  {unacknowledgedLeaves.length > 0 && (
                    <span style={{
                      background: unacknowledgedLeaves[0].status === 'Approved' ? '#10B981' : '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '8px'
                    }}>
                      New Reply
                    </span>
                  )}
                </button>
              </div>

              <div
                className="sp-modal-body"
                style={{
                  padding: '20px 24px',
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {leaveTab === 'apply' ? (
                  <form onSubmit={handleApplyLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {leaveError && (
                      <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚠️</span>
                        <span>{leaveError}</span>
                      </div>
                    )}
                    {leaveSuccess && (
                      <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✅</span>
                        <span>{leaveSuccess}</span>
                      </div>
                    )}

                    {/* INTERACTIVE CALENDAR */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                      {/* Month Navigation */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                            {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                            title="Previous Month"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth(new Date())}
                            style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                            title="Next Month"
                          >
                            ›
                          </button>
                        </div>
                      </div>

                      {/* Day of week labels */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
                          <div key={w} style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', padding: '4px 0' }}>
                            {w}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {getCalendarDays().map((item, idx) => {
                          const isStart = leaveStartDate === item.dateStr;
                          const isEnd = (leaveEndDate || leaveStartDate) === item.dateStr;
                          const inRange = leaveStartDate && item.dateStr >= leaveStartDate && item.dateStr <= (leaveEndDate || leaveStartDate);
                          
                          // Check existing leaves
                          const existingLeave = leavesList.find(l => l.start_date <= item.dateStr && item.dateStr <= l.end_date);
                          const isToday = new Date().toISOString().slice(0, 10) === item.dateStr;

                          let bg = '#FFFFFF';
                          let color = item.isCurrentMonth ? '#0F172A' : '#CBD5E1';
                          let borderRadius = '8px';

                          if (isStart || isEnd) {
                            bg = '#0D9488';
                            color = '#FFFFFF';
                          } else if (inRange) {
                            bg = 'rgba(13, 148, 136, 0.15)';
                            color = '#0F766E';
                          }

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleCalendarDayClick(item.dateStr)}
                              style={{
                                height: '38px',
                                border: isToday && !inRange ? '1.5px solid #0D9488' : '1px solid transparent',
                                borderRadius,
                                background: bg,
                                color,
                                fontWeight: inRange || isToday ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                transition: 'all 0.15s ease'
                              }}
                              title={existingLeave ? `${existingLeave.leave_type} (${existingLeave.status})` : item.dateStr}
                            >
                              <span>{item.dayNumber}</span>
                              {existingLeave && (
                                <span
                                  style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    bottom: '3px',
                                    background: existingLeave.status === 'Approved' ? '#10B981' : (existingLeave.status === 'Rejected' ? '#EF4444' : '#F59E0B')
                                  }}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '11px', color: '#64748B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                          <span>Approved Leave</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
                          <span>Pending Request</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                          <span>Rejected</span>
                        </div>
                      </div>
                    </div>

                    {/* Date Pickers (Two-way sync) */}
                    <div className="sp-form-row">
                      <div className="sp-form-field">
                        <label>Start Date *</label>
                        <input
                          type="date"
                          required
                          value={leaveStartDate}
                          onChange={(e) => {
                            setLeaveStartDate(e.target.value);
                            if (leaveEndDate && e.target.value > leaveEndDate) setLeaveEndDate(e.target.value);
                          }}
                        />
                      </div>
                      <div className="sp-form-field">
                        <label>End Date *</label>
                        <input
                          type="date"
                          required
                          min={leaveStartDate}
                          value={leaveEndDate || leaveStartDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Summary Banner */}
                    {leaveStartDate && (
                      <div style={{ background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.25)', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '12.5px', color: '#0F766E', fontWeight: 600 }}>Selected Period: </span>
                          <strong style={{ fontSize: '13px', color: '#0F172A' }}>
                            {leaveStartDate} {leaveEndDate && leaveEndDate !== leaveStartDate ? `➔ ${leaveEndDate}` : ''}
                          </strong>
                        </div>
                        <span style={{ background: '#0D9488', color: '#FFFFFF', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                          {calculateDaysCount(leaveStartDate, leaveEndDate)} Day{calculateDaysCount(leaveStartDate, leaveEndDate) > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Leave Type */}
                    <div className="sp-form-field">
                      <label>Leave Type *</label>
                      <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                        <option value="Casual Leave">Casual Leave (CL)</option>
                        <option value="Sick Leave">Sick Leave (SL)</option>
                        <option value="Vacation">Vacation / Paid Time Off</option>
                        <option value="Personal Emergency">Personal Emergency</option>
                        <option value="Half Day">Half Day</option>
                      </select>
                    </div>

                    {/* Reason / Notes */}
                    <div className="sp-form-field">
                      <label>Reason / Notes for Administration (Optional)</label>
                      <textarea
                        rows={3}
                        placeholder="Provide details about your leave request (e.g. personal trip, medical rest, family function)..."
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                      />
                    </div>

                    <div className="sp-modal-footer" style={{ padding: '12px 0 0 0', marginTop: '6px' }}>
                      <button type="button" className="btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={submittingLeave || !leaveStartDate}
                        style={{
                          background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                          borderColor: '#0D9488',
                          padding: '10px 22px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {submittingLeave ? 'Submitting Request...' : 'Submit Leave Request'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* MY LEAVE REQUESTS TAB */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    {leavesList.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B', margin: 'auto' }}>
                        <div style={{ fontSize: '42px', marginBottom: '8px' }}>🏖️</div>
                        <h4 style={{ margin: '0 0 4px 0', color: '#0F172A', fontWeight: 700, fontSize: '16px' }}>No Leave Requests</h4>
                        <p style={{ margin: 0, fontSize: '13px' }}>You haven't applied for any leaves yet.</p>
                      </div>
                    ) : (
                      leavesList.map(l => (
                        <div
                          key={l.id}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ color: '#0F172A', fontSize: '14px' }}>{l.leave_type}</strong>
                                <span style={{ background: '#E2E8F0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                  {l.total_days} {l.total_days === 1 ? 'Day' : 'Days'}
                                </span>
                              </div>
                              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                                📅 {l.start_date} {l.end_date && l.end_date !== l.start_date ? `➔ ${l.end_date}` : ''}
                              </p>
                            </div>

                            {/* Status badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: l.status === 'Approved' ? '#DCFCE7' : (l.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7'),
                                  color: l.status === 'Approved' ? '#15803D' : (l.status === 'Rejected' ? '#B91C1C' : '#B45309')
                                }}
                              >
                                {l.status === 'Approved' ? '✅ Approved' : (l.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending Review')}
                              </span>
                            </div>
                          </div>

                          {l.reason && (
                            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#334155', background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                              "{l.reason}"
                            </p>
                          )}

                          {l.admin_notes && (
                            <div style={{
                              marginTop: '4px',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              background: l.status === 'Approved' ? 'rgba(16, 185, 129, 0.08)' : (l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(13, 148, 136, 0.08)'),
                              border: `1px solid ${l.status === 'Approved' ? 'rgba(16, 185, 129, 0.25)' : (l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(13, 148, 136, 0.2)')}`,
                              fontSize: '12.5px',
                              color: l.status === 'Approved' ? '#065F46' : (l.status === 'Rejected' ? '#991B1B' : '#0F766E')
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                <span>💬</span>
                                <strong>Admin Reply / Feedback:</strong>
                              </div>
                              <div style={{ paddingLeft: '20px', fontStyle: 'italic' }}>
                                "{l.admin_notes}"
                              </div>
                            </div>
                          )}

                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            Applied on: {l.created_at || 'Recently'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .ip-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; width: 100%; max-width: 100%; overflow-x: hidden; box-sizing: border-box; }
        .ip-main { flex: 1; padding: 40px 80px; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 32px; position: relative; width: 100%; max-width: 100%; box-sizing: border-box; }
        
        /* Hero */
        .ip-hero {
          display: flex; align-items: center; gap: 24px; padding: 32px;
          background: #050B1A; border-radius: 24px; width: 100%; max-width: 100%; box-sizing: border-box;
        }
        .ip-hero-avatar { width: 120px; height: 120px; border-radius: 60px; object-fit: cover; flex-shrink: 0; }
        .ip-hero-info { display: flex; flex-direction: column; gap: 12px; }
        .ip-hero-name { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 800; color: #FFF; margin: 0; line-height: 1; }
        .ip-hero-sub { font-size: 18px; color: rgba(255,255,255,0.6); margin: 0; }
        .ip-hero-badges { display: flex; gap: 8px; }
        .ip-badge-primary {
          background: rgba(13, 148, 136, 0.12); color: #0D9488;
          padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;
        }
        .ip-badge-active {
          background: rgba(255, 255, 255, 0.25); color: #FFF;
          padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;
        }

        /* Grid */
        .ip-grid { display: flex; gap: 32px; width: 100%; max-width: 100%; box-sizing: border-box; }
        .ip-col-left { display: flex; flex-direction: column; gap: 32px; width: 400px; max-width: 100%; flex-shrink: 0; box-sizing: border-box; }
        .ip-col-right { display: flex; flex-direction: column; gap: 32px; flex: 1; min-width: 0; max-width: 100%; box-sizing: border-box; }

        /* Card common */
        .ip-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px;
          display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 100%; box-sizing: border-box; min-width: 0; overflow-x: hidden;
        }
        .ip-card-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0; }

        /* Left Column Details */
        .ip-details-list { display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .ip-detail-row { display: flex; justify-content: space-between; width: 100%; }
        .ip-detail-label { font-size: 13px; color: #64748B; font-weight: 500; }
        .ip-detail-value { font-size: 13px; font-weight: 700; color: #0F172A; }
        .ip-divider { height: 1px; background: #E2E8F0; width: 100%; margin: 8px 0; }
        .ip-bio { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .ip-bio-label { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
        .ip-bio-text { font-size: 14px; color: #334155; line-height: 1.5; margin: 0; }
        
        .ip-cert-list { display: flex; flex-direction: column; gap: 12px; list-style: none; padding: 0; margin: 0; width: 100%; }
        .ip-cert-item { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 500; color: #0F172A; }
        .ip-cert-icon {
          width: 24px; height: 24px; background: rgba(13, 148, 136, 0.12); border-radius: 12px;
          display: flex; align-items: center; justify-content: center; color: #0D9488;
        }

        /* Right Column */
        .ip-stats-row { display: flex; gap: 16px; width: 100%; max-width: 100%; box-sizing: border-box; }
        .ip-stat-card { flex: 1; gap: 16px; justify-content: space-between; min-width: 0; }
        .ip-stat-label { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; }
        .ip-chart { display: flex; align-items: flex-end; gap: 6px; height: 60px; width: 100%; max-width: 100%; overflow-x: auto; box-sizing: border-box; }
        .ip-bar { flex: 1; min-width: 8px; max-width: 39px; background: #0D9488; border-radius: 2px; }
        .ip-stat-big { display: flex; flex-direction: column; }
        .ip-stat-number { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 700; color: #0D9488; line-height: 1.2; }
        .ip-stat-trend { font-size: 12px; color: #0D9488; }

        /* Students */
        .ip-student-list { display: flex; flex-direction: column; }
        .ip-student-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
        .ip-student-row:first-child { padding-top: 0; }
        .ip-student-row:last-child { padding-bottom: 0; }
        .ip-student-info { display: flex; align-items: center; gap: 16px; }
        .ip-student-avatar { width: 40px; height: 40px; border-radius: 20px; object-fit: cover; }
        .ip-student-name { font-size: 13px; font-weight: 700; color: #0F172A; }
        .ip-student-time { font-size: 12px; color: #64748B; margin-top: 2px; }
        
        .ip-level-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .level-beginner { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .level-intermediate { background: rgba(13, 148, 136, 0.12); color: #0D9488; }
        .level-advanced { background: rgba(124, 58, 237, 0.12); color: #7C3AED; }

        /* Activity */
        .ip-activity-list { display: flex; flex-direction: column; gap: 12px; }
        .ip-activity-row {
          display: flex; align-items: center; padding: 16px; gap: 16px;
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px;
        }
        .ip-activity-icon { width: 12px; height: 12px; border-radius: 6px; background: #0D9488; flex-shrink: 0; }
        .ip-activity-info { flex: 1; }
        .ip-activity-title { font-size: 13px; font-weight: 500; color: #0F172A; }
        .ip-activity-sub { font-size: 12px; color: #64748B; margin-top: 4px; }

        /* Modal styling */
        .sp-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(5, 11, 26, 0.5); display: flex; justify-content: center;
          align-items: center; z-index: 1000; backdrop-filter: blur(4px);
        }
        .sp-modal {
          width: 100%; max-width: 540px; border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column;
          background: #FFFFFF; box-shadow: 0px 20px 40px rgba(0, 0, 0, 0.2); color: #0F172A;
          overflow: hidden;
        }
        .sp-modal-header {
          padding: 20px 24px; border-bottom: 1px solid #E2E8F0;
          display: flex; justify-content: space-between; align-items: center;
        }
        .sp-modal-header h3 { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; margin: 0; }
        .sp-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748B; }
        .sp-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; max-height: 70vh; overflow-y: auto; }
        .sp-form-field { display: flex; flex-direction: column; gap: 8px; }
        .sp-form-field label { font-size: 13px; font-weight: 600; color: #475569; }
        .sp-form-field input,
        .sp-form-field select,
        .sp-form-field textarea {
          padding: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px;
          font-size: 14px; outline: none; transition: border-color 0.2s;
          font-family: inherit;
        }
        .sp-form-field input:focus,
        .sp-form-field select:focus,
        .sp-form-field textarea:focus { border-color: #0D9488; }
        .sp-form-row { display: flex; gap: 16px; }
        .sp-form-row .sp-form-field { flex: 1; }
        .sp-modal-footer {
          padding: 16px 24px; border-top: 1px solid #E2E8F0;
          display: flex; justify-content: flex-end; gap: 12px;
        }

        @media (max-width: 900px) {
          .ip-page {
            width: 100% !important;
            max-width: 100% !important;
            flex-direction: column !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .ip-main {
            padding: 20px 14px 90px 14px !important;
            gap: 16px !important;
            margin-left: 0 !important;
            margin-top: 64px !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .ip-grid {
            flex-direction: column !important;
            gap: 16px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .ip-col-left {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            gap: 16px !important;
            box-sizing: border-box !important;
          }
          .ip-col-right {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            gap: 16px !important;
            box-sizing: border-box !important;
          }
          .ip-hero {
            padding: 20px 16px !important;
            border-radius: 18px !important;
            gap: 14px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .ip-stats-row {
            flex-wrap: wrap !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        }

        @media (max-width: 768px) {
          .ip-page {
            width: 100% !important;
            max-width: 100% !important;
            flex-direction: column !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .ip-main {
            padding: 10px 10px 70px 10px !important;
            margin-top: 64px !important;
            gap: 10px !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .ip-grid {
            flex-direction: column !important;
            gap: 10px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .ip-col-left, .ip-col-right {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            gap: 10px !important;
            box-sizing: border-box !important;
          }
          /* Compact Hero */
          .ip-hero {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            text-align: left !important;
            padding: 12px 14px !important;
            border-radius: 14px !important;
            gap: 10px 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .ip-hero-avatar {
            width: 48px !important;
            height: 48px !important;
            border-radius: 24px !important;
            font-size: 18px !important;
            flex-shrink: 0 !important;
          }
          .ip-hero-info {
            align-items: flex-start !important;
            text-align: left !important;
            gap: 2px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }
          .ip-hero-name {
            font-size: 17px !important;
            font-weight: 800 !important;
            line-height: 1.2 !important;
            margin: 0 !important;
          }
          .ip-hero-sub {
            font-size: 11.5px !important;
            color: rgba(255, 255, 255, 0.65) !important;
            margin: 0 !important;
          }
          .ip-hero-badges {
            justify-content: flex-start !important;
            flex-wrap: wrap !important;
            gap: 4px !important;
            margin-top: 2px !important;
          }
          .ip-badge-primary, .ip-badge-active {
            font-size: 9.5px !important;
            padding: 2px 5px !important;
            border-radius: 3px !important;
          }
          .ip-hero-actions {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            flex-direction: row !important;
            gap: 8px !important;
            box-sizing: border-box !important;
            margin-top: 2px !important;
          }
          .ip-hero-actions button {
            flex: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 32px !important;
            padding: 4px 10px !important;
            font-size: 11.5px !important;
            border-radius: 8px !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }

          /* Compact Cards */
          .ip-card {
            padding: 12px 12px !important;
            border-radius: 12px !important;
            gap: 10px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
          .ip-card-title {
            font-size: 14.5px !important;
            font-weight: 700 !important;
            margin: 0 !important;
          }

          /* Compact 2-column Personal Details Grid */
          .ip-details-list {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .ip-detail-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 2px !important;
            padding: 6px 8px !important;
            background: #F8FAFC !important;
            border: 1px solid #E2E8F0 !important;
            border-radius: 8px !important;
            box-sizing: border-box !important;
            min-width: 0 !important;
          }
          .ip-detail-row:nth-child(1),
          .ip-detail-row:nth-child(2),
          .ip-detail-row:nth-child(7) {
            grid-column: span 2 !important;
          }
          .ip-detail-label {
            font-size: 9px !important;
            color: #64748B !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
            line-height: 1.1 !important;
          }
          .ip-detail-value {
            font-size: 11.5px !important;
            font-weight: 700 !important;
            color: #0F172A !important;
            word-break: break-word !important;
            max-width: 100% !important;
            text-align: left !important;
            line-height: 1.25 !important;
          }
          .ip-divider {
            margin: 4px 0 !important;
          }
          .ip-bio {
            gap: 3px !important;
          }
          .ip-bio-label {
            font-size: 9.5px !important;
          }
          .ip-bio-text {
            font-size: 11.5px !important;
            line-height: 1.35 !important;
          }

          /* Compact Certifications */
          .ip-cert-list {
            gap: 5px !important;
          }
          .ip-cert-item {
            font-size: 11.5px !important;
            gap: 6px !important;
            padding: 2px 0 !important;
          }
          .ip-cert-icon {
            width: 18px !important;
            height: 18px !important;
          }

          /* Compact Stats & Chart */
          .ip-stats-row {
            flex-direction: column !important;
            gap: 10px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .ip-stat-label {
            font-size: 9.5px !important;
          }
          .ip-chart {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            gap: 3px !important;
            height: 36px !important;
          }
          .ip-bar {
            min-width: 0 !important;
            flex: 1 !important;
          }
          .ip-stat-number {
            font-size: 24px !important;
          }
          .ip-stat-trend {
            font-size: 10.5px !important;
          }

          /* Students & Activity */
          .ip-student-row {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 6px 0 !important;
            gap: 8px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .ip-student-info {
            gap: 8px !important;
          }
          .ip-student-avatar {
            width: 30px !important;
            height: 30px !important;
            border-radius: 15px !important;
          }
          .ip-student-name {
            font-size: 12px !important;
          }
          .ip-student-time {
            font-size: 10.5px !important;
          }
          .ip-level-badge {
            font-size: 9.5px !important;
            padding: 2px 6px !important;
          }
          .ip-activity-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px !important;
            padding: 8px 10px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .ip-activity-title {
            font-size: 11.5px !important;
          }
          .ip-activity-sub {
            font-size: 10.5px !important;
          }

          .sp-modal {
            width: calc(100% - 24px) !important;
            margin: 12px !important;
            max-height: 90vh !important;
            border-radius: 14px !important;
          }
          .sp-modal-body {
            padding: 14px !important;
          }
          .sp-form-row {
            flex-direction: column !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InstructorProfile;
