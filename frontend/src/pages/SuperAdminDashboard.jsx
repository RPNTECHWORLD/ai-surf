import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

// ── Custom SVG Icon Components (Replaces lucide-react to avoid dependencies) ──
const IconMarket = ({ size = 14, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const IconFlag = ({ size = 14, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const IconChart = ({ size = 14, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconActivity = ({ size = 18, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const IconUsers = ({ size = 18, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconTrophy = ({ size = 18, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a6 6 0 0 1 6 6v1c0 2.2-1.8 4-4 4h-4a4 4 0 0 1-4-4V8a6 6 0 0 1 6-6z" />
  </svg>
);

const IconClock = ({ size = 18, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconRefreshCw = ({ size = 14, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconCopy = ({ size = 13, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconEye = ({ size = 13, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = ({ size = 13, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconLock = ({ size = 14, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);


const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'users', 'marketplace', 'reports', 'ai_monitoring', 'keys'
  const [coaches, setCoaches] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Password reset state
  const [selectedUser, setSelectedUser] = useState(null); // { user_id, name, email }
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState({}); // maps user_id -> boolean (to show/hide plain password)

  // New Admin States
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isStudentSelectMode, setIsStudentSelectMode] = useState(false);
  const [schoolsList, setSchoolsList] = useState([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [isSchoolSelectMode, setIsSchoolSelectMode] = useState(false);
  const [marketplace, setMarketplace] = useState([]);
  const [reports, setReports] = useState([]);
  const [aiUsage, setAiUsage] = useState(null);
  const [keys, setKeys] = useState([]);

  // Form states
  const [newMarketplaceItem, setNewMarketplaceItem] = useState({ title: '', price: '', category: 'Board', description: '' });
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  
  const [newKey, setNewKey] = useState({ app_name: '', webhook_url: '' });
  const [showKeyModal, setShowKeyModal] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch instructors/credentials
      const coachesRes = await fetch(`${API}/api/superadmin/instructors`);
      if (coachesRes.ok) setCoaches(await coachesRes.json());

      // 2. Fetch dashboard stats
      const statsRes = await fetch(`${API}/api/dashboard/stats`);
      if (statsRes.ok) setStats(await statsRes.json());

      // 3. Fetch recent activity
      const activityRes = await fetch(`${API}/api/dashboard/activity`);
      if (activityRes.ok) setActivity(await activityRes.json());

      // 4. Fetch marketplace
      const marketRes = await fetch(`${API}/api/superadmin/marketplace`);
      if (marketRes.ok) setMarketplace(await marketRes.json());

      // 5. Fetch user reports
      const reportsRes = await fetch(`${API}/api/superadmin/reports`);
      if (reportsRes.ok) setReports(await reportsRes.json());

      // 6. Fetch AI monitoring stats
      const aiRes = await fetch(`${API}/api/superadmin/ai-monitoring`);
      if (aiRes.ok) setAiUsage(await aiRes.json());

      // 7. Fetch client keys
      const keysRes = await fetch(`${API}/api/superadmin/keys`);
      if (keysRes.ok) setKeys(await keysRes.json());

      // 8. Fetch students for management
      const studentsRes = await fetch(`${API}/api/students`);
      let allStudents = [];
      if (studentsRes.ok) allStudents = await studentsRes.json();

      const deletedEmails = new Set(
        (JSON.parse(localStorage.getItem('deleted_student_emails') || '[]')).map(e => String(e).toLowerCase().trim())
      );
      const deletedIds = new Set(
        (JSON.parse(localStorage.getItem('deleted_student_ids') || '[]')).map(i => String(i))
      );

      // Filter out deleted students from database response
      allStudents = allStudents.filter(s => {
        if (!s) return false;
        if (deletedIds.has(String(s.id))) return false;
        if (s.email && deletedEmails.has(s.email.toLowerCase().trim())) return false;
        return true;
      });

      // Merge with registered students / requests from localStorage (excluding deleted)
      try {
        const savedReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
        const savedAccs = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
        const mockStudents = JSON.parse(localStorage.getItem('mock_students_data') || '[]');
        const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        const allKnown = [...savedReqs, ...savedAccs, ...mockStudents];
        if (savedUser && savedUser.email && (savedUser.role === 'athlete' || savedUser.role === 'student')) {
          allKnown.push(savedUser);
        }

        allKnown.forEach(req => {
          const emailLower = (req.student_email || req.email || '').toLowerCase().trim();
          if (emailLower && !deletedEmails.has(emailLower) && !allStudents.some(s => s.email && s.email.toLowerCase().trim() === emailLower)) {
            allStudents.push({
              id: req.student_id || req.id || Date.now(),
              name: req.student_name || req.name || emailLower.split('@')[0],
              email: emailLower,
              whatsapp_number: req.whatsapp_number || req.phone || '',
              level: req.level || 'Beginner',
              course_duration: req.course_duration || '3 Days Course',
              session_time: req.session_time || '11:30 AM',
              start_date: req.start_date || '2026-08-29',
              staying_at_school: req.staying_at_school || 'Yes',
              approval_status: req.status || req.approval_status || 'approved',
              instructor: ''
            });
          }
        });
      } catch (e) {}

      setStudentsList(allStudents);

      // 9. Fetch schools for management
      const schoolsRes = await fetch(`${API}/api/schools`);
      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        const deletedSchoolIds = new Set(JSON.parse(localStorage.getItem('deleted_school_ids') || '[]').map(String));
        const deletedSchoolEmails = new Set(JSON.parse(localStorage.getItem('deleted_school_emails') || '[]').map(e => String(e).toLowerCase().trim()));
        const deletedSchoolNames = new Set(JSON.parse(localStorage.getItem('deleted_school_names') || '[]').map(n => String(n).toLowerCase().trim()));

        let filtered = (Array.isArray(schoolsData) ? schoolsData : []).filter(sc => 
          sc && !deletedSchoolIds.has(String(sc.id)) && (!sc.email || !deletedSchoolEmails.has(String(sc.email).toLowerCase().trim())) && (!sc.name || !deletedSchoolNames.has(String(sc.name).toLowerCase().trim()))
        );

        // Keep the primary official school (Aquatic Indica Surf School) always present as the active primary school
        if (!deletedSchoolNames.has('aquatic indica surf school') && !filtered.some(s => s.name?.toLowerCase().includes('aquatic indica'))) {
          filtered.unshift({
            id: 1,
            name: "Aquatic Indica Surf School",
            owner: "Aquatic Admin",
            email: "rpntechworld@gmail.com",
            phone: "+91 9876543210",
            location: "Kovalam / Chennai, India",
            website: "https://aquaticindica.com"
          });
        }
        setSchoolsList(filtered);
      }

      setError('');
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please verify that the backend server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setResetting(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch(`${API}/api/superadmin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.user_id,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Successfully updated password for ${selectedUser.name}!`);
        setNewPassword('');
        setTimeout(() => {
          setSelectedUser(null);
          setSuccessMsg('');
          loadData(); // Refresh table to show new plain password
        }, 2000);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error occurred.');
    } finally {
      setResetting(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`Copied ${label} to clipboard!`);
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const toggleShowPassword = (userId) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const markStudentAsDeleted = (id, email) => {
    if (id) {
      const deletedIds = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      if (!deletedIds.includes(String(id))) {
        deletedIds.push(String(id));
        localStorage.setItem('deleted_student_ids', JSON.stringify(deletedIds));
      }
    }
    if (email) {
      const emailLower = email.toLowerCase().trim();
      const deletedEmails = JSON.parse(localStorage.getItem('deleted_student_emails') || '[]');
      if (!deletedEmails.includes(emailLower)) {
        deletedEmails.push(emailLower);
        localStorage.setItem('deleted_student_emails', JSON.stringify(deletedEmails));
      }
      const savedReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
      const filteredReqs = savedReqs.filter(r => (r.student_email || r.email || '').toLowerCase().trim() !== emailLower);
      localStorage.setItem('school_join_requests', JSON.stringify(filteredReqs));
    }
  };

  const handleDeleteStudent = async (id, name, email) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"?`)) return;
    markStudentAsDeleted(id, email);
    try {
      await fetch(`${API}/api/superadmin/users/${id}`, { method: 'DELETE' });
      await fetch(`${API}/api/students/${id}`, { method: 'DELETE' });
    } catch (err) {}
    setStudentsList(prev => prev.filter(s => s.id !== id && s.id != id));
    setSuccessMsg(`Student "${name}" deleted.`);
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === studentsList.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(studentsList.map(s => s.id));
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedStudentIds.length} selected student(s)?`)) return;

    const idsToDelete = [...selectedStudentIds];
    for (const id of idsToDelete) {
      const student = studentsList.find(s => s.id === id || s.id == id);
      if (student) {
        markStudentAsDeleted(student.id, student.email);
        try {
          await fetch(`${API}/api/superadmin/users/${id}`, { method: 'DELETE' });
          await fetch(`${API}/api/students/${id}`, { method: 'DELETE' });
        } catch (e) {}
      }
    }
    setStudentsList(prev => prev.filter(s => !idsToDelete.includes(s.id)));
    setSelectedStudentIds([]);
    setSuccessMsg(`${idsToDelete.length} student(s) deleted successfully.`);
  };

  const handleBulkAssignInstructor = async (instructorIdVal) => {
    if (selectedStudentIds.length === 0 || !instructorIdVal) return;
    const instructorId = parseInt(instructorIdVal);

    setStudentsList(prev => prev.map(s => {
      if (selectedStudentIds.includes(s.id)) {
        return { ...s, instructor_id: instructorId };
      }
      return s;
    }));

    for (const id of selectedStudentIds) {
      try {
        await fetch(`${API}/api/students/${id}/assign-instructor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instructor_id: instructorId })
        });
      } catch (err) {}
    }
    setSuccessMsg(`Assigned instructor to ${selectedStudentIds.length} student(s).`);
  };

  const toggleSelectSchool = (id) => {
    setSelectedSchoolIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllSchools = () => {
    if (selectedSchoolIds.length === schoolsList.length) {
      setSelectedSchoolIds([]);
    } else {
      setSelectedSchoolIds(schoolsList.map(s => s.id));
    }
  };

  const markSchoolAsDeleted = (id, name, email) => {
    if (id) {
      const deletedIds = JSON.parse(localStorage.getItem('deleted_school_ids') || '[]');
      if (!deletedIds.includes(String(id))) {
        deletedIds.push(String(id));
        localStorage.setItem('deleted_school_ids', JSON.stringify(deletedIds));
      }
    }
    if (name) {
      const nameLower = name.toLowerCase().trim();
      const deletedNames = JSON.parse(localStorage.getItem('deleted_school_names') || '[]');
      if (!deletedNames.includes(nameLower)) {
        deletedNames.push(nameLower);
        localStorage.setItem('deleted_school_names', JSON.stringify(deletedNames));
      }
    }
    if (email) {
      const emailLower = email.toLowerCase().trim();
      const deletedEmails = JSON.parse(localStorage.getItem('deleted_school_emails') || '[]');
      if (!deletedEmails.includes(emailLower)) {
        deletedEmails.push(emailLower);
        localStorage.setItem('deleted_school_emails', JSON.stringify(deletedEmails));
      }
    }
  };

  const handleBulkDeleteSchools = async () => {
    if (selectedSchoolIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedSchoolIds.length} selected surf school(s)?`)) return;

    const idsToDelete = [...selectedSchoolIds];
    for (const id of idsToDelete) {
      const sch = schoolsList.find(s => s.id === id || s.id == id);
      if (sch) {
        markSchoolAsDeleted(sch.id, sch.name, sch.email);
        try {
          await fetch(`${API}/api/superadmin/schools/${id}`, { method: 'DELETE' });
        } catch (e) {}
      }
    }
    setSchoolsList(prev => prev.filter(s => !idsToDelete.includes(s.id)));
    setSelectedSchoolIds([]);
    setSuccessMsg(`${idsToDelete.length} surf school(s) deleted successfully.`);
  };
  
  const handleAssignInstructor = async (studentId, instructorIdVal) => {
    const instructorId = instructorIdVal ? parseInt(instructorIdVal) : 0;
    
    // Update local state first for instant feedback (Optimistic Update)
    setStudentsList(prev => prev.map(s => {
      if (s.id === studentId) {
        const selectedCoach = coaches.find(c => c.instructor_id === instructorId);
        return {
          ...s,
          instructor_id: instructorId || null,
          instructor: selectedCoach ? selectedCoach.name : ''
        };
      }
      return s;
    }));

    try {
      const res = await fetch(`${API}/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructor_id: instructorId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Failed to assign instructor:", errorData);
        setError("Failed to assign instructor to the student.");
        loadData();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the backend server.");
      loadData();
    }
  };

  const handleDeleteCoach = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete coach "${name}"?`)) return;
    try {
      await fetch(`${API}/api/superadmin/users/${id}`, { method: 'DELETE' });
      await fetch(`${API}/api/instructors/${id}`, { method: 'DELETE' });
      setSuccessMsg(`Coach "${name}" deleted.`);
      setCoaches(prev => prev.filter(c => c.id !== id && c.user_id !== id));
      setInstructorsList(prev => prev.filter(i => i.id !== id && i.user_id !== id));
    } catch (err) {
      setCoaches(prev => prev.filter(c => c.id !== id && c.user_id !== id));
      setInstructorsList(prev => prev.filter(i => i.id !== id && i.user_id !== id));
      setSuccessMsg(`Coach "${name}" deleted.`);
    }
  };

  const handleDeleteSchool = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete surf school "${name}"?`)) return;
    const sch = schoolsList.find(s => s.id === id || s.id == id);
    markSchoolAsDeleted(id, name, sch?.email);
    try {
      const res = await fetch(`${API}/api/schools/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Surf school "${name}" deleted.`);
        setSchoolsList(prev => prev.filter(sc => sc.id !== id));
      } else {
        setSchoolsList(prev => prev.filter(sc => sc.id !== id));
        setSuccessMsg(`Surf school "${name}" deleted.`);
      }
    } catch (err) {
      setSchoolsList(prev => prev.filter(sc => sc.id !== id));
      setSuccessMsg(`Surf school "${name}" deleted.`);
    }
  };

  // Marketplace Actions
  const handleDeleteMarketplace = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      const res = await fetch(`${API}/api/superadmin/marketplace/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Listing deleted successfully!');
        loadData(true);
      }
    } catch (e) {}
  };

  const handleCreateMarketplace = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/superadmin/marketplace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMarketplaceItem.title,
          price: parseFloat(newMarketplaceItem.price),
          category: newMarketplaceItem.category,
          description: newMarketplaceItem.description
        })
      });
      if (res.ok) {
        alert('Listing created successfully!');
        setNewMarketplaceItem({ title: '', price: '', category: 'Board', description: '' });
        setShowMarketplaceModal(false);
        loadData(true);
      }
    } catch (e) {}
  };

  // User Reports Actions
  const handleUpdateReport = async (id, status) => {
    try {
      const res = await fetch(`${API}/api/superadmin/reports/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadData(true);
      }
    } catch (e) {}
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      const res = await fetch(`${API}/api/superadmin/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData(true);
      }
    } catch (e) {}
  };

  // Integration Keys Actions
  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/superadmin/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: newKey.app_name,
          webhook_url: newKey.webhook_url
        })
      });
      if (res.ok) {
        alert('Integration application registered successfully!');
        setNewKey({ app_name: '', webhook_url: '' });
        setShowKeyModal(false);
        loadData(true);
      }
    } catch (e) {}
  };

  const handleToggleKey = async (id) => {
    try {
      const res = await fetch(`${API}/api/superadmin/keys/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        loadData(true);
      }
    } catch (e) {}
  };

  const handleDeleteKey = async (id) => {
    if (!window.confirm("Are you sure you want to delete this integration client?")) return;
    try {
      const res = await fetch(`${API}/api/superadmin/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData(true);
      }
    } catch (e) {}
  };

  const statsCards = [
    { icon: IconUsers, label: 'Total Instructors', value: coaches?.length || 0, color: '#6366f1', sub: 'Active coaches in roster' },
    { icon: IconActivity, label: 'Active Students', value: studentsList?.length || 0, color: '#06b6d4', sub: 'Athletes in training' },
    { icon: IconTrophy, label: 'Sessions This Month', value: stats?.sessions_this_month ?? 0, color: '#10b981', sub: 'Completed sessions' },
    { icon: IconClock, label: 'Upcoming Sessions', value: stats?.upcoming_sessions ?? 0, color: '#f59e0b', sub: 'Scheduled future events' }
  ];

  return (
    <div className="sa-wrapper">
      {/* Top Navbar */}
      <nav className="sa-nav">
        <div className="sa-nav-left">
          <div className="sa-brand" onClick={() => navigate('/dashboard')}>
            <span className="sa-brand-dot" />
            <span className="sa-brand-text">WaveCoach <span className="sa-brand-badge">Super Admin</span></span>
          </div>
          <div className="sa-nav-tabs">
            <button 
              className={`sa-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <IconActivity size={14} /> Dashboard
            </button>
            <button 
              className={`sa-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <IconUsers size={14} /> Students ({studentsList.length})
            </button>
            <button 
              className={`sa-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <IconUsers size={14} /> Coaches ({coaches.length})
            </button>
            <button 
              className={`sa-tab-btn ${activeTab === 'schools' ? 'active' : ''}`}
              onClick={() => setActiveTab('schools')}
            >
              <IconMarket size={14} /> Surf Schools ({schoolsList.length})
            </button>
            <button 
              className={`sa-tab-btn ${activeTab === 'marketplace' ? 'active' : ''}`}
              onClick={() => setActiveTab('marketplace')}
            >
              <IconMarket size={14} /> Marketplace
            </button>
            <button 
              className={`sa-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <IconFlag size={14} /> Reports
            </button>
            <button 
              className={`sa-tab-btn ${activeTab === 'ai_monitoring' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai_monitoring')}
            >
              <IconChart size={14} /> AI Monitor
            </button>
            <button 
              className={`sa-tab-btn ${activeTab === 'keys' ? 'active' : ''}`}
              onClick={() => setActiveTab('keys')}
            >
              <IconLock size={14} /> Client Keys
            </button>
          </div>
        </div>
        <button className="sa-exit-btn" onClick={() => navigate('/dashboard')}>
          Back to School Portal &rarr;
        </button>
      </nav>

      {/* Main Container */}
      <main className="sa-container">
        {error && <div className="sa-error-banner">{error}</div>}

        {loading ? (
          <div className="sa-loader">
            <div className="sa-spinner" />
            <p>Loading Console...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="sa-tab-content fade-in">
                {/* Header */}
                <div className="sa-section-header">
                  <div>
                    <h2>Platform Overview</h2>
                    <p>Real-time stats across all surf schools and coach assignments</p>
                  </div>
                  <button className="sa-refresh-btn" onClick={() => loadData(true)} disabled={refreshing}>
                    <IconRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="sa-stats-grid">
                  {statsCards.map((s, idx) => (
                    <div className="sa-stat-card" key={idx}>
                      <div className="sa-stat-header">
                        <span className="sa-stat-label">{s.label}</span>
                        <div className="sa-stat-icon-wrapper" style={{ background: `${s.color}15` }}>
                          <s.icon size={18} color={s.color} />
                        </div>
                      </div>
                      <div className="sa-stat-value">{s.value}</div>
                      <div className="sa-stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Activities */}
                <div className="sa-activity-card">
                  <div className="sa-activity-header">
                    <IconActivity size={18} color="#6366f1" />
                    <h3>Recent System Activities</h3>
                  </div>
                  <div className="sa-table-responsive">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Activity Details</th>
                          <th>Group/Type</th>
                          <th style={{ textAlign: 'right' }}>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.map((act) => (
                          <tr key={act.id}>
                            <td className="sa-act-text">{act.text}</td>
                            <td>
                              <span className="sa-type-badge">{act.type || 'System'}</span>
                            </td>
                            <td style={{ textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>
                              {act.time || 'Just now'}
                            </td>
                          </tr>
                        ))}
                        {activity.length === 0 && (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                              No recent activities logged.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="sa-tab-content fade-in">
                {/* Header */}
                <div className="sa-section-header">
                  <div>
                    <h2>Instructors & Credentials</h2>
                    <p>Retrieve plaintext user passwords, copy hashes, and execute credentials management</p>
                  </div>
                  <button className="sa-refresh-btn" onClick={() => loadData(true)} disabled={refreshing}>
                    <IconRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                <div className="sa-split-layout">
                  {/* Table Card */}
                  <div className="sa-card-main">
                    <div className="sa-card-header">
                      <h3>Instructors Roster</h3>
                      <span className="sa-count-badge">{coaches.length} registered</span>
                    </div>

                    <div className="sa-table-responsive">
                      <table className="sa-table">
                        <thead>
                          <tr>
                            <th>Coach Name</th>
                            <th>Email Address</th>
                            <th>Password (Plain)</th>
                            <th>Database Password Hash</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coaches.map((c) => (
                            <tr key={c.user_id}>
                              <td>
                                <div className="sa-user-info">
                                  <div className="sa-avatar">{getInitials(c.name)}</div>
                                  <div>
                                    <div className="sa-user-name">{c.name}</div>
                                    <div className="sa-user-sub">User ID: {c.user_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="sa-email-cell">{c.email}</td>
                              <td>
                                <div className="sa-password-cell">
                                  <span className="sa-plain-pass">
                                    {showPasswordMap[c.user_id] ? c.password_plain : '••••••••'}
                                  </span>
                                  <div className="sa-pass-actions">
                                    <button 
                                      className="sa-icon-btn" 
                                      onClick={() => toggleShowPassword(c.user_id)}
                                      title={showPasswordMap[c.user_id] ? "Hide Password" : "Show Password"}
                                    >
                                      {showPasswordMap[c.user_id] ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                                    </button>
                                    <button 
                                      className="sa-icon-btn"
                                      onClick={() => copyToClipboard(c.password_plain, 'plain password')}
                                      title="Copy Password"
                                    >
                                      <IconCopy size={13} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="sa-hash-box" onClick={() => copyToClipboard(c.password_hash, 'password hash')}>
                                  <code className="sa-hash-text">{c.password_hash}</code>
                                  <IconCopy size={12} className="copy-icon" />
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button 
                                  className="sa-action-btn"
                                  onClick={() => {
                                    setSelectedUser(c);
                                    setSuccessMsg('');
                                    setError('');
                                  }}
                                >
                                  Reset Password
                                </button>
                                <button
                                  className="sa-action-btn"
                                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)', marginLeft: '6px' }}
                                  onClick={() => handleDeleteCoach(c.id || c.user_id, c.name)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Sidebar Form for Resetting */}
                  {selectedUser && (
                    <div className="sa-card-side fade-in">
                      <div className="sa-side-header">
                        <h3>Update Credentials</h3>
                        <button className="sa-close-btn" onClick={() => setSelectedUser(null)}>&times;</button>
                      </div>

                      <div className="sa-side-profile">
                        <div className="sa-avatar large-avatar">{getInitials(selectedUser.name)}</div>
                        <h4>{selectedUser.name}</h4>
                        <p>{selectedUser.email}</p>
                      </div>

                      {successMsg && <div className="sa-success-banner">{successMsg}</div>}

                      <form className="sa-reset-form" onSubmit={handleResetPassword}>
                        <div className="sa-form-group">
                          <label>New Password (Plaintext)</label>
                          <div className="sa-input-wrapper">
                            <IconLock size={14} className="input-icon" />
                            <input 
                              type="text" 
                              placeholder="Enter new password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              minLength={5}
                            />
                          </div>
                          <small>This plaintext password will be saved dynamically to help retrieve it later, and hashed for secure authentication.</small>
                        </div>

                        <div className="sa-form-actions">
                          <button type="button" className="sa-btn-cancel" onClick={() => setSelectedUser(null)}>Cancel</button>
                          <button type="submit" className="sa-btn-submit" disabled={resetting}>
                            {resetting ? 'Updating...' : 'Save Password'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STUDENTS TAB ── */}
            {activeTab === 'students' && (
              <div className="sa-tab-content fade-in">
                <div className="sa-section-header">
                  <div>
                    <h2>Registered Students Management</h2>
                    <p>Super Admin control: view active student profiles and delete accounts</p>
                  </div>
                  <button className="sa-refresh-btn" onClick={() => loadData(true)} disabled={refreshing}>
                    <IconRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                <div className="sa-card-main">
                  <div className="sa-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3>Student Roster</h3>
                      <span className="sa-count-badge">{studentsList.length} total students</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {isStudentSelectMode && selectedStudentIds.length > 0 && (
                        <>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleBulkAssignInstructor(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#0F172A',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">Assign Selected to...</option>
                            {coaches.map((c) => (
                              c.instructor_id && <option key={c.instructor_id} value={c.instructor_id}>{c.name}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={handleBulkDeleteStudents}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              background: '#EF4444',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            Delete Selected ({selectedStudentIds.length})
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsStudentSelectMode(!isStudentSelectMode);
                          if (isStudentSelectMode) setSelectedStudentIds([]);
                        }}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '8px',
                          border: isStudentSelectMode ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                          background: isStudentSelectMode ? '#0F172A' : '#F8FAFC',
                          color: isStudentSelectMode ? '#00F2FE' : '#334155',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isStudentSelectMode ? '✓ Select Mode Active' : 'Select'}
                      </button>
                    </div>
                  </div>

                  <div className="sa-table-responsive">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          {isStudentSelectMode && (
                            <th style={{ width: '40px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={studentsList.length > 0 && selectedStudentIds.length === studentsList.length}
                                onChange={toggleSelectAllStudents}
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0284C7' }}
                              />
                            </th>
                          )}
                          <th>Student Name</th>
                          <th>Email Address</th>
                          <th>Course & Slot</th>
                          <th>Stay / WhatsApp</th>
                          <th>Instructor</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsList.map((st) => (
                          <tr key={st.id} style={{ background: selectedStudentIds.includes(st.id) ? 'rgba(2, 132, 199, 0.05)' : 'transparent' }}>
                            {isStudentSelectMode && (
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedStudentIds.includes(st.id)}
                                  onChange={() => toggleSelectStudent(st.id)}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0284C7' }}
                                />
                              </td>
                            )}
                            <td>
                              <div className="sa-user-info">
                                <div className="sa-avatar">{getInitials(st.name)}</div>
                                <div>
                                  <div className="sa-user-name">{st.name}</div>
                                  <div className="sa-user-sub">Level: {st.level}</div>
                                </div>
                              </div>
                            </td>
                            <td className="sa-email-cell">{st.email || 'No Email'}</td>
                            <td>{st.course_duration || '3 Days'} • {st.session_time || 'Morning'}</td>
                            <td>
                              {st.staying_at_school === 'Yes' ? '🏨 Lodge' : '🚗 Off-site'}<br />
                              <span style={{ fontSize: '11px', color: '#94A3B8' }}>{st.whatsapp_number ? `+91 ${st.whatsapp_number}` : ''}</span>
                            </td>
                            <td>
                              <select
                                value={st.instructor_id || ''}
                                onChange={(e) => handleAssignInstructor(st.id, e.target.value)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#0F172A',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  minWidth: '130px'
                                }}
                              >
                                <option value="">Unassigned</option>
                                {coaches.map((c) => (
                                  c.instructor_id && <option key={c.instructor_id} value={c.instructor_id}>{c.name}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="sa-action-btn"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                onClick={() => handleDeleteStudent(st.id, st.name, st.email)}
                              >
                                Delete Student
                              </button>
                            </td>
                          </tr>
                        ))}
                        {studentsList.length === 0 && (
                          <tr><td colSpan={isStudentSelectMode ? "7" : "6"} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>No students registered yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SURF SCHOOLS TAB ── */}
            {activeTab === 'schools' && (
              <div className="sa-tab-content fade-in">
                <div className="sa-section-header">
                  <div>
                    <h2>Registered Surf Schools</h2>
                    <p>Manage and delete registered surf schools across the platform</p>
                  </div>
                  <button className="sa-refresh-btn" onClick={() => loadData(true)} disabled={refreshing}>
                    <IconRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                <div className="sa-card-main">
                  <div className="sa-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3>Surf Schools Directory</h3>
                      <span className="sa-count-badge">{schoolsList.length} schools</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {isSchoolSelectMode && selectedSchoolIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleBulkDeleteSchools}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            background: '#EF4444',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          Delete Selected ({selectedSchoolIds.length})
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsSchoolSelectMode(!isSchoolSelectMode);
                          if (isSchoolSelectMode) setSelectedSchoolIds([]);
                        }}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '8px',
                          border: isSchoolSelectMode ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                          background: isSchoolSelectMode ? '#0F172A' : '#F8FAFC',
                          color: isSchoolSelectMode ? '#00F2FE' : '#334155',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isSchoolSelectMode ? '✓ Select Mode Active' : 'Select'}
                      </button>
                    </div>
                  </div>

                  <div className="sa-table-responsive">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          {isSchoolSelectMode && (
                            <th style={{ width: '40px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={schoolsList.length > 0 && selectedSchoolIds.length === schoolsList.length}
                                onChange={toggleSelectAllSchools}
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0284C7' }}
                              />
                            </th>
                          )}
                          <th>School Name</th>
                          <th>Owner / Contact</th>
                          <th>Location</th>
                          <th>Website</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schoolsList.map((sch) => (
                          <tr key={sch.id} style={{ background: selectedSchoolIds.includes(sch.id) ? 'rgba(2, 132, 199, 0.05)' : 'transparent' }}>
                            {isSchoolSelectMode && (
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedSchoolIds.includes(sch.id)}
                                  onChange={() => toggleSelectSchool(sch.id)}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0284C7' }}
                                />
                              </td>
                            )}
                            <td>
                              <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{sch.name}</div>
                              <div style={{ fontSize: '12px', color: '#94A3B8' }}>ID: #{sch.id}</div>
                            </td>
                            <td>
                              <div>{sch.owner || '—'}</div>
                              <div className="sa-email-cell" style={{ fontSize: '12px' }}>{sch.email}</div>
                            </td>
                            <td>{sch.city || sch.country ? `${sch.city || ''}, ${sch.country || ''}` : 'Global'}</td>
                            <td>{sch.website ? <a href={sch.website} target="_blank" rel="noreferrer" style={{ color: '#6366F1' }}>{sch.website}</a> : '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="sa-action-btn"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                onClick={() => handleDeleteSchool(sch.id, sch.name)}
                              >
                                Delete School
                              </button>
                            </td>
                          </tr>
                        ))}
                        {schoolsList.length === 0 && (
                          <tr><td colSpan={isSchoolSelectMode ? "6" : "5"} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>No surf schools registered yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Marketplace Tab */}
            {activeTab === 'marketplace' && (
              <div className="sa-tab-content fade-in">
                <div className="sa-section-header">
                  <div>
                    <h2>Marketplace Listings</h2>
                    <p>Manage community surfboards, fins, wetsuits, and coaching offers</p>
                  </div>
                  <button className="sa-btn-primary" onClick={() => setShowMarketplaceModal(true)}>
                    + Create Listing
                  </button>
                </div>

                <div className="sa-listings-grid">
                  {marketplace.map((item) => (
                    <div className="sa-listing-card" key={item.id}>
                      <div className="sa-card-top">
                        <span className="sa-listing-cat">{item.category}</span>
                        <span className="sa-status-dot">{item.status}</span>
                      </div>
                      <h4 className="sa-listing-title">{item.title}</h4>
                      <p className="sa-listing-desc">{item.description || "No description provided."}</p>
                      <div className="sa-card-bottom">
                        <span className="sa-listing-price">${item.price.toFixed(2)}</span>
                        <button className="sa-delete-btn-red" onClick={() => handleDeleteMarketplace(item.id)}>
                          Delete Listing
                        </button>
                      </div>
                    </div>
                  ))}
                  {marketplace.length === 0 && (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No listings registered in the marketplace.
                    </p>
                  )}
                </div>

                {/* Marketplace Modal */}
                {showMarketplaceModal && (
                  <div className="sa-modal-overlay">
                    <div className="sa-modal-card fade-in">
                      <div className="sa-modal-header">
                        <h3>Create Marketplace Listing</h3>
                        <button className="sa-close-btn" onClick={() => setShowMarketplaceModal(false)}>&times;</button>
                      </div>
                      <form onSubmit={handleCreateMarketplace} className="sa-modal-form">
                        <div className="sa-form-group">
                          <label>Listing Title</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 6'2 Pyzel Shortboard"
                            value={newMarketplaceItem.title} 
                            onChange={(e) => setNewMarketplaceItem({...newMarketplaceItem, title: e.target.value})}
                            required 
                          />
                        </div>
                        <div className="sa-form-row">
                          <div className="sa-form-group flex-1">
                            <label>Price ($)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="Price in USD"
                              value={newMarketplaceItem.price} 
                              onChange={(e) => setNewMarketplaceItem({...newMarketplaceItem, price: e.target.value})}
                              required 
                            />
                          </div>
                          <div className="sa-form-group flex-1">
                            <label>Category</label>
                            <select 
                              value={newMarketplaceItem.category} 
                              onChange={(e) => setNewMarketplaceItem({...newMarketplaceItem, category: e.target.value})}
                            >
                              <option value="Board">Surfboard</option>
                              <option value="Fins">Fins</option>
                              <option value="Wetsuit">Wetsuit</option>
                              <option value="Coaching">Coaching</option>
                            </select>
                          </div>
                        </div>
                        <div className="sa-form-group">
                          <label>Description (Condition/Details)</label>
                          <textarea 
                            rows="3" 
                            placeholder="Describe item condition, repairs, sizing..."
                            value={newMarketplaceItem.description} 
                            onChange={(e) => setNewMarketplaceItem({...newMarketplaceItem, description: e.target.value})}
                          />
                        </div>
                        <div className="sa-modal-actions">
                          <button type="button" className="sa-btn-cancel" onClick={() => setShowMarketplaceModal(false)}>Cancel</button>
                          <button type="submit" className="sa-btn-submit">Submit Listing</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="sa-tab-content fade-in">
                <div className="sa-section-header">
                  <div>
                    <h2>Flagged Content & Reports</h2>
                    <p>Review community-flagged comments, suspicious activity, and inappropriate behavior</p>
                  </div>
                </div>

                <div className="sa-card-main">
                  <div className="sa-table-responsive">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Reporter</th>
                          <th>Flagged Content Details</th>
                          <th>Reason / Type</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r) => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 700, color: '#1E293B' }}>{r.reporter}</td>
                            <td className="sa-act-text" style={{ maxWidth: '300px' }}>"{r.content}"</td>
                            <td>
                              <span className="sa-reason-badge">{r.reason}</span>
                            </td>
                            <td>
                              <span className={`sa-status-badge status-${r.status.toLowerCase()}`}>{r.status}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                {r.status === 'Pending' && (
                                  <>
                                    <button className="sa-action-btn btn-green" onClick={() => handleUpdateReport(r.id, 'Resolved')}>
                                      Resolve
                                    </button>
                                    <button className="sa-action-btn btn-gray" onClick={() => handleUpdateReport(r.id, 'Dismissed')}>
                                      Dismiss
                                    </button>
                                  </>
                                )}
                                <button className="sa-action-btn btn-red" onClick={() => handleDeleteReport(r.id)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {reports.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                              No content reports filed yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* AI Monitor Tab */}
            {activeTab === 'ai_monitoring' && (
              <div className="sa-tab-content fade-in">
                <div className="sa-section-header">
                  <div>
                    <h2>AI Engine Monitoring</h2>
                    <p>Track request counters, average latencies, and Gemini model tokens used across the platform</p>
                  </div>
                </div>

                {/* API Stats Cards */}
                <div className="sa-stats-grid">
                  <div className="sa-stat-card">
                    <span className="sa-stat-label">Total AI Requests</span>
                    <div className="sa-stat-value">{aiUsage?.summary?.total_calls ?? 0}</div>
                    <div className="sa-stat-sub">Cumulative API endpoint triggers</div>
                  </div>
                  <div className="sa-stat-card">
                    <span className="sa-stat-label">Total Tokens Consumed</span>
                    <div className="sa-stat-value" style={{ color: '#7C3AED' }}>
                      {aiUsage?.summary?.total_tokens?.toLocaleString() ?? 0}
                    </div>
                    <div className="sa-stat-sub">Prompt + Completion token metrics</div>
                  </div>
                  <div className="sa-stat-card">
                    <span className="sa-stat-label">Average Response Time</span>
                    <div className="sa-stat-value" style={{ color: '#0D9488' }}>
                      {aiUsage?.summary?.avg_latency_ms ?? 0} ms
                    </div>
                    <div className="sa-stat-sub">Latency metrics from backend engine</div>
                  </div>
                </div>

                {/* Logs Table */}
                <div className="sa-card-main">
                  <div className="sa-card-header">
                    <h3>Recent AI Request Logs</h3>
                  </div>
                  <div className="sa-table-responsive">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>API Endpoint</th>
                          <th>Tokens Used</th>
                          <th>Latency (ms)</th>
                          <th style={{ textAlign: 'right' }}>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiUsage?.logs?.map((log) => (
                          <tr key={log.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4F46E5' }}>{log.api_endpoint}</td>
                            <td>{log.tokens_used} tokens</td>
                            <td style={{ color: log.latency_ms > 2000 ? '#EF4444' : '#0D9488', fontWeight: 600 }}>
                              {log.latency_ms} ms
                            </td>
                            <td style={{ textAlign: 'right', color: '#64748B' }}>{log.timestamp}</td>
                          </tr>
                        ))}
                        {(!aiUsage?.logs || aiUsage.logs.length === 0) && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                              No AI request logs recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Keys Tab */}
            {activeTab === 'keys' && (
              <div className="sa-tab-content fade-in">
                <div className="sa-section-header">
                  <div>
                    <h2>App Integration & Client Keys</h2>
                    <p>Configure credentials and webhook destinations linking WaveCoach with the Live Scoring App</p>
                  </div>
                  <button className="sa-btn-primary" onClick={() => setShowKeyModal(true)}>
                    + Register Client App
                  </button>
                </div>

                <div className="sa-card-main">
                  <div className="sa-table-responsive">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Application Name</th>
                          <th>Client ID</th>
                          <th>API Secret Key</th>
                          <th>Webhook Destination</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keys.map((k) => (
                          <tr key={k.id}>
                            <td style={{ fontWeight: 700, color: '#0F172A' }}>{k.app_name}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <code style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{k.client_id}</code>
                                <button className="sa-icon-btn" onClick={() => copyToClipboard(k.client_id, 'Client ID')}>
                                  <IconCopy size={12} />
                                </button>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <code style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{k.api_key.substring(0, 10)}...</code>
                                <button className="sa-icon-btn" onClick={() => copyToClipboard(k.api_key, 'API Key')}>
                                  <IconCopy size={12} />
                                </button>
                              </div>
                            </td>
                            <td style={{ color: '#475569', fontSize: '12px' }}>{k.webhook_url || '—'}</td>
                            <td>
                              <span className={`sa-status-badge status-${k.status.toLowerCase()}`}>{k.status}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  className={`sa-action-btn ${k.status === 'Active' ? 'btn-gray' : 'btn-green'}`} 
                                  onClick={() => handleToggleKey(k.id)}
                                >
                                  {k.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button className="sa-action-btn btn-red" onClick={() => handleDeleteKey(k.id)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {keys.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                              No integration keys registered yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Key Registration Modal */}
                {showKeyModal && (
                  <div className="sa-modal-overlay">
                    <div className="sa-modal-card fade-in">
                      <div className="sa-modal-header">
                        <h3>Register Integration Client</h3>
                        <button className="sa-close-btn" onClick={() => setShowKeyModal(false)}>&times;</button>
                      </div>
                      <form onSubmit={handleCreateKey} className="sa-modal-form">
                        <div className="sa-form-group">
                          <label>Integration Application Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. LiveHeats Scoring Companion"
                            value={newKey.app_name} 
                            onChange={(e) => setNewKey({...newKey, app_name: e.target.value})}
                            required 
                          />
                        </div>
                        <div className="sa-form-group">
                          <label>Webhook URL (Optional)</label>
                          <input 
                            type="url" 
                            placeholder="e.g. https://api.myclient.com/webhooks"
                            value={newKey.webhook_url} 
                            onChange={(e) => setNewKey({...newKey, webhook_url: e.target.value})}
                          />
                        </div>
                        <div className="sa-modal-actions">
                          <button type="button" className="sa-btn-cancel" onClick={() => setShowKeyModal(false)}>Cancel</button>
                          <button type="submit" className="sa-btn-submit">Generate Credentials</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .sa-wrapper {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Instrument Sans', sans-serif;
          color: #0F172A;
          display: flex;
          flex-direction: column;
        }

        /* Button premium */
        .sa-btn-primary {
          background: #6366f1;
          color: #FFF;
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-btn-primary:hover {
          background: #4f46e5;
        }

        /* Listings */
        .sa-listings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          margin-top: 10px;
        }
        .sa-listing-card {
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sa-listing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .sa-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sa-listing-cat {
          background: rgba(99,102,241,0.08);
          color: #6366f1;
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .sa-status-dot {
          font-size: 11px;
          font-weight: 700;
          color: #0d9488;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .sa-status-dot::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0d9488;
        }
        .sa-listing-title {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          line-height: 1.4;
        }
        .sa-listing-desc {
          font-size: 12.5px;
          color: #64748B;
          margin: 0;
          line-height: 1.5;
          flex-grow: 1;
        }
        .sa-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          border-top: 1px solid #F1F5F9;
          padding-top: 12px;
        }
        .sa-listing-price {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
        }
        .sa-delete-btn-red {
          background: none;
          border: none;
          color: #EF4444;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .sa-delete-btn-red:hover {
          background: #FEE2E2;
        }

        /* Modal styling */
        .sa-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .sa-modal-card {
          background: #FFF;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .sa-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 12px;
          margin-bottom: 18px;
        }
        .sa-modal-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          margin: 0;
        }
        .sa-modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sa-form-row {
          display: flex;
          gap: 16px;
        }
        .flex-1 {
          flex: 1;
        }
        .sa-modal-form input, .sa-modal-form select, .sa-modal-form textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          font-size: 13.5px;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }
        .sa-modal-form input:focus, .sa-modal-form select:focus, .sa-modal-form textarea:focus {
          border-color: #6366f1;
        }
        .sa-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }

        /* Badges status */
        .sa-status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .sa-status-badge.status-pending {
          background: #FEF3C7;
          color: #D97706;
        }
        .sa-status-badge.status-resolved {
          background: #DCFCE7;
          color: #15803D;
        }
        .sa-status-badge.status-dismissed {
          background: #F1F5F9;
          color: #64748B;
        }
        .sa-status-badge.status-active {
          background: #DCFCE7;
          color: #15803D;
        }
        .sa-status-badge.status-inactive {
          background: #FEE2E2;
          color: #B91C1C;
        }
        .sa-reason-badge {
          background: #FEE2E2;
          color: #EF4444;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
        }

        /* Action buttons table */
        .sa-action-btn.btn-green {
          color: #10B981;
          border-color: rgba(16, 185, 129, 0.2);
        }
        .sa-action-btn.btn-green:hover {
          background: #10B981;
          color: #FFF;
          border-color: #10B981;
        }
        .sa-action-btn.btn-gray {
          color: #64748B;
          border-color: rgba(100, 116, 139, 0.2);
        }
        .sa-action-btn.btn-gray:hover {
          background: #64748B;
          color: #FFF;
          border-color: #64748B;
        }
        .sa-action-btn.btn-red {
          color: #EF4444;
          border-color: rgba(239, 68, 68, 0.2);
        }
        .sa-action-btn.btn-red:hover {
          background: #EF4444;
          color: #FFF;
          border-color: #EF4444;
        }

        /* Original Wrapper Style */
        .sa-wrapper {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Instrument Sans', sans-serif;
          color: #0F172A;
          display: flex;
          flex-direction: column;
        }

        /* Nav layout */
        .sa-nav {
          background: #0F172A;
          padding: 0 40px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #FFF;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .sa-nav-left {
          display: flex;
          align-items: center;
          gap: 40px;
          height: 100%;
        }
        .sa-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .sa-brand-dot {
          width: 8px;
          height: 8px;
          background: #6366f1;
          border-radius: 50%;
        }
        .sa-brand-text {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sa-brand-badge {
          background: rgba(99,102,241,0.15);
          color: #818cf8;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .sa-nav-tabs {
          display: flex;
          gap: 4px;
          height: 100%;
        }
        .sa-tab-btn {
          background: none;
          border: none;
          color: #94a3b8;
          padding: 0 20px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 100%;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .sa-tab-btn:hover {
          color: #FFF;
          background: rgba(255,255,255,0.02);
        }
        .sa-tab-btn.active {
          color: #6366f1;
          border-bottom-color: #6366f1;
          background: rgba(255,255,255,0.03);
        }
        .sa-exit-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: #FFF;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-exit-btn:hover {
          background: rgba(255,255,255,0.15);
        }

        .sa-container {
          flex: 1;
          padding: 40px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .sa-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .sa-section-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 4px 0;
          color: #0F172A;
        }
        .sa-section-header p {
          font-size: 13.5px;
          color: #64748B;
          margin: 0;
        }
        .sa-refresh-btn {
          background: #FFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #64748B;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-refresh-btn:hover {
          border-color: #CBD5E1;
          color: #475569;
        }

        .sa-error-banner {
          background: #FEE2E2;
          border: 1px solid #FCA5A5;
          color: #B91C1C;
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        /* Stats Grid */
        .sa-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .sa-stat-card {
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sa-stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sa-stat-label {
          font-size: 12px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sa-stat-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sa-stat-value {
          font-size: 32px;
          font-weight: 900;
          color: #0F172A;
          line-height: 1.1;
        }
        .sa-stat-sub {
          font-size: 12.5px;
          color: #64748B;
        }

        /* Cards layout */
        .sa-activity-card {
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }
        .sa-activity-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 14px;
        }
        .sa-activity-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }

        /* Split Directory layout */
        .sa-split-layout {
          display: flex;
          gap: 28px;
          align-items: flex-start;
        }
        .sa-card-main {
          flex: 1;
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }
        .sa-card-side {
          width: 360px;
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .sa-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 14px;
        }
        .sa-card-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          margin: 0;
        }
        .sa-count-badge {
          background: #F1F5F9;
          color: #64748B;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
        }

        /* Tables style */
        .sa-table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .sa-table {
          width: 100%;
          border-collapse: collapse;
        }
        .sa-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1.5px solid #E2E8F0;
        }
        .sa-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
          font-size: 13.5px;
        }
        .sa-act-text {
          font-weight: 600;
          color: #1E293B;
        }
        .sa-type-badge {
          background: rgba(99,102,241,0.08);
          color: #6366f1;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        /* User cells */
        .sa-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sa-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
          color: #FFF;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sa-user-name {
          font-weight: 700;
          color: #0F172A;
        }
        .sa-user-sub {
          font-size: 10.5px;
          color: #94A3B8;
          margin-top: 1px;
        }
        .sa-email-cell {
          color: #475569;
          font-weight: 500;
        }

        /* Password Cells */
        .sa-password-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: space-between;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 6px 12px;
          border-radius: 8px;
          max-width: 160px;
        }
        .sa-plain-pass {
          font-family: monospace;
          font-size: 13px;
          color: #0F172A;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .sa-pass-actions {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .sa-icon-btn {
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .sa-icon-btn:hover {
          color: #475569;
          background: #E2E8F0;
        }

        /* Hash boxes */
        .sa-hash-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 6px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 140px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-hash-box:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }
        .sa-hash-text {
          font-family: monospace;
          font-size: 10px;
          color: #64748B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: 6px;
        }
        .copy-icon {
          color: #94A3B8;
          flex-shrink: 0;
        }

        /* Actions */
        .sa-action-btn {
          background: #FFF;
          border: 1.5px solid #E2E8F0;
          color: #0f172a;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .sa-action-btn:hover {
          background: #0F172A;
          color: #FFF;
          border-color: #0F172A;
        }

        /* Sidebar Styling */
        .sa-side-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 12px;
        }
        .sa-side-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 800;
          margin: 0;
        }
        .sa-close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #94A3B8;
        }
        .sa-side-profile {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
        }
        .large-avatar {
          width: 56px;
          height: 56px;
          font-size: 18px;
          background: linear-gradient(135deg, #EC4899 0%, #D946EF 100%);
        }
        .sa-side-profile h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 800;
          margin: 0;
        }
        .sa-side-profile p {
          font-size: 12px;
          color: #64748B;
          margin: 0;
        }
        .sa-success-banner {
          background: #DCFCE7;
          border: 1px solid #86EFAC;
          color: #166534;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          text-align: center;
        }
        .sa-reset-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sa-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sa-form-group label {
          font-size: 11px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sa-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sa-input-wrapper input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.2s;
        }
        .sa-input-wrapper input:focus {
          border-color: #6366f1;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: #94A3B8;
        }
        .sa-form-group small {
          font-size: 11px;
          color: #94A3B8;
          line-height: 1.4;
          margin-top: 4px;
        }
        .sa-form-actions {
          display: flex;
          gap: 10px;
        }
        .sa-form-actions button {
          flex: 1;
          padding: 10px 0;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-btn-cancel {
          background: #FFF;
          border: 1.5px solid #E2E8F0;
          color: #64748B;
        }
        .sa-btn-cancel:hover {
          background: #F1F5F9;
        }
        .sa-btn-submit {
          background: #6366f1;
          border: none;
          color: #FFF;
        }
        .sa-btn-submit:hover {
          background: #4f46e5;
        }

        .sa-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 12px;
          color: #64748B;
        }
        .sa-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(99,102,241,0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: sa-spin 0.8s linear infinite;
        }
        @keyframes sa-spin { to { transform: rotate(360deg); } }

        .fade-in {
          animation: saFadeIn 0.25s ease-out;
        }
        @keyframes saFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-spin {
          animation: sa-spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SuperAdminDashboard;
