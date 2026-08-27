import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';


const StudentsManagement = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [instructorFilter, setInstructorFilter] = useState('All');
  const [sessionTimeFilter, setSessionTimeFilter] = useState('All');
  const [stayFilter, setStayFilter] = useState('All');
  const [activeStatFilter, setActiveStatFilter] = useState('TOTAL');
  const [showModal, setShowModal] = useState(false);
  const [modalInvite, setModalInvite] = useState(null); // link shown inside the add-student modal after creation
  const [copied, setCopied] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [inviteModalData, setInviteModalData] = useState(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState(null); // student object to mark attendance
  const [attSaving, setAttSaving] = useState(false);
  const [attError, setAttError] = useState('');
  const [saving, setSaving] = useState(false);
  const addDaysToDate = (startDateStr, days) => {
    if (!startDateStr) return '';
    const d = new Date(startDateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (days - 1));
    return d.toISOString().split('T')[0];
  };

  const calculateDaysBetween = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const defaultStartDate = new Date().toISOString().split('T')[0];
  const defaultEndDate = addDaysToDate(defaultStartDate, 3);

  const [form, setForm] = useState({
    name: '', email: '', password: '', level: 'Beginner', instructor_id: '',
    whatsapp_number: '', course_duration: '3 Days Course', session_time: 'Morning 6:00 AM',
    start_date: defaultStartDate, end_date: defaultEndDate, staying_at_school: 'Yes'
  });

  const handleCourseDurationChange = (val) => {
    if (val === 'custom') {
      const currentDays = calculateDaysBetween(form.start_date, form.end_date) || 14;
      const targetDays = currentDays > 10 ? currentDays : 14;
      const newEnd = addDaysToDate(form.start_date, targetDays);
      setForm(prev => ({
        ...prev,
        course_duration: `${targetDays} Days Course`,
        end_date: newEnd
      }));
    } else {
      const match = val.match(/^(\d+)\s*Days/i);
      const days = match ? parseInt(match[1]) : 3;
      const newEnd = addDaysToDate(form.start_date, days);
      setForm(prev => ({
        ...prev,
        course_duration: val,
        end_date: newEnd
      }));
    }
  };

  const handleStartDateChange = (newStart) => {
    const currentDays = calculateDaysBetween(form.start_date, form.end_date) || 3;
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

  const closeModal = () => {
    setShowModal(false);
    setModalInvite(null);
    setAddedStudentSummary(null);
    setAddMode('single');
    setCopied(false);
    setForm({
      name: '', email: '', password: '', level: 'Beginner', instructor_id: '',
      whatsapp_number: '', course_duration: '3 Days Course', session_time: 'Morning 6:00 AM',
      start_date: new Date().toISOString().split('T')[0], end_date: addDaysToDate(new Date().toISOString().split('T')[0], 3), staying_at_school: 'Yes'
    });
  };

  const fetchStudents = () => {
    fetch(`${API}/api/students`)
      .then(r => r.json())
      .then(data => setStudents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
    fetch(`${API}/api/instructors`)
      .then(r => r.json())
      .then(data => setInstructors(data))
      .catch(() => {});
  }, []);

  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Master'];

  const activeSchoolName = (() => {
    try {
      const savedSchool = sessionStorage.getItem('activeSchool');
      if (savedSchool) {
        const parsed = JSON.parse(savedSchool);
        if (parsed.name) return parsed.name;
      }
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.school) return parsed.school;
        if (parsed.school_name) return parsed.school_name;
      }
    } catch (e) {}
    return null;
  })();

  const isDefaultSchool = !activeSchoolName || activeSchoolName.toLowerCase() === 'aquatic indica surf school' || activeSchoolName.toLowerCase() === 'school admin';

  const approvedStudents = (students || []).filter(s => {
    if (!s || !s.email) return false;
    const emailLower = String(s.email).toLowerCase();
    if (s.approval_status === 'pending') return false;

    // Determine target school for student request/profile
    let studentTargetSchool = s.school || 'Aquatic Indica Surf School';

    try {
      const savedReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
      const req = savedReqs.find(r => r.student_email && String(r.student_email).toLowerCase() === emailLower);
      if (req) {
        if (req.status !== 'approved') return false;
        if (req.school_name) studentTargetSchool = req.school_name;
      }
    } catch (e) {}

    // Strict school isolation
    if (activeSchoolName) {
      if (String(studentTargetSchool).toLowerCase() !== String(activeSchoolName).toLowerCase()) {
        return false;
      }
    }

    return true;
  });

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
    const matchSession = sessionTimeFilter === 'All' || s.session_time === sessionTimeFilter;
    const matchStay = stayFilter === 'All' || (stayFilter === 'Lodge' ? s.staying_at_school === 'Yes' : s.staying_at_school === 'No');
    return matchSearch && matchLevel && matchStat && matchInstructor && matchSession && matchStay;
  });

  const stats = [
    { value: approvedStudents.length, label: 'TOTAL', color: '#050B1A', active: activeStatFilter === 'TOTAL' },
    { value: approvedStudents.filter(s => s.last_active === 'Today' || s.last_active === 'Yesterday').length, label: 'ACTIVE', color: '#0D9488', active: activeStatFilter === 'ACTIVE' },
    { value: approvedStudents.filter(s => s.level === 'Beginner').length, label: 'BEGINNER', color: '#F59E0B', active: activeStatFilter === 'BEGINNER' },
    { value: approvedStudents.filter(s => s.level === 'Intermediate').length, label: 'INTERMEDIATE', color: '#0D9488', active: activeStatFilter === 'INTERMEDIATE' },
    { value: approvedStudents.filter(s => s.level === 'Advanced').length, label: 'ADVANCED', color: '#7C3AED', active: activeStatFilter === 'ADVANCED' },
  ];


  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          level: form.level,
          instructor_id: form.instructor_id ? parseInt(form.instructor_id) : null,
          whatsapp_number: form.whatsapp_number,
          course_duration: form.course_duration,
          session_time: form.session_time,
          start_date: form.start_date,
          end_date: form.end_date,
          staying_at_school: form.staying_at_school,
        }),
      });
      if (res.ok) {
        const newStudent = await res.json();
        fetchStudents();
        const baseUrl = window.location.origin;
        let inviteToken = `inv_${Date.now()}`;
        try {
          const invRes = await fetch(`${API}/api/students/${newStudent.id}/generate-invite`, { method: 'POST' });
          if (invRes.ok) {
            const invData = await invRes.json();
            if (invData.token) inviteToken = invData.token;
          }
        } catch (err) {}

        const studentInviteLink = `${baseUrl}/student-portal?token=${inviteToken}`;
        const summaryData = {
          ...newStudent,
          name: newStudent.name || form.name,
          email: newStudent.email || form.email,
          whatsapp_number: newStudent.whatsapp_number || form.whatsapp_number,
          level: newStudent.level || form.level,
          course_duration: newStudent.course_duration || form.course_duration,
          session_time: newStudent.session_time || form.session_time,
          start_date: newStudent.start_date || form.start_date,
          end_date: newStudent.end_date || form.end_date,
          staying_at_school: newStudent.staying_at_school || form.staying_at_school,
          instructor: instructors.find(i => i.id === parseInt(form.instructor_id))?.name || 'Auto-Assigned Coach',
          inviteLink: studentInviteLink
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
  
  // Bulk grid rows state
  const [bulkRows, setBulkRows] = useState([
    { name: 'Liam Torres', email: 'liam.torres@gmail.com', phone: '(555) 123-4567', age: 22, level: 'Intermediate', start_date: '2026-08-25', end_date: '2026-09-05', instructor_id: '' },
    { name: 'Maya Chen', email: 'maya.chen@yahoo.com', phone: '(555) 987-6543', age: 17, level: 'Beginner', start_date: '2026-08-28', end_date: '2026-09-02', instructor_id: '' },
    { name: 'Jackson Miller', email: 'j.miller@outlook.com', phone: '(555) 456-7890', age: 28, level: 'Advanced', start_date: '2026-08-30', end_date: '2026-09-08', instructor_id: '' },
    { name: 'Sofia Rodriguez', email: 'sofia.rod@gmail.com', phone: '(555) 321-9876', age: 19, level: 'Intermediate', start_date: '2026-09-01', end_date: '2026-09-12', instructor_id: '' },
    { name: 'Kai Peterson', email: 'kai.pete@hawaii.edu', phone: '(555) 789-0123', age: 21, level: 'Advanced', start_date: '2026-09-03', end_date: '2026-09-15', instructor_id: '' },
    { name: '', email: '', phone: '', age: '', level: 'Beginner', start_date: '', end_date: '', instructor_id: '' }
  ]);

  // CSV Drag-drop & parser state
  const [dragActive, setDragActive] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');

  // Quick Action Toggles for Review Summary
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [notifyInstructor, setNotifyInstructor] = useState(true);

  const handleAddRow = () => {
    setBulkRows(prev => [...prev, { name: '', email: '', phone: '', age: '', level: 'Beginner', start_date: '', end_date: '', instructor_id: '' }]);
  };

  const handleBulkChange = (index, field, value) => {
    setBulkRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleBulkSubmit = async () => {
    const validRows = bulkRows.filter(r => r.name.trim() && r.email.trim());
    if (validRows.length === 0) return;
    setSaving(true);
    try {
      const formatted = validRows.map(r => ({
        name: r.name.trim(),
        email: r.email.trim(),
        whatsapp_number: r.phone || '',
        age: r.age ? parseInt(r.age) : undefined,
        level: r.level || 'Beginner',
        start_date: r.start_date || new Date().toISOString().split('T')[0],
        end_date: r.end_date || '',
        instructor_id: r.instructor_id ? parseInt(r.instructor_id) : null,
        course_duration: '3 Days Course',
        session_time: 'Morning 6:00 AM',
        staying_at_school: 'Yes'
      }));
      const res = await fetch(`${API}/api/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatted)
      });
      if (res.ok) {
        const result = await res.json();
        fetchStudents();
        if (result.students && result.students.length > 0) {
          setAddedStudentSummary(result.students[0]);
          setAddMode('summary');
        } else {
          closeModal();
        }
      }
    } catch (err) {}
    setSaving(false);
  };

  const handleCSVUpload = (file) => {
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) return;
      
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols[0] && cols[1]) {
          rows.push({
            name: cols[0],
            email: cols[1],
            phone: cols[2] || '',
            age: cols[3] || '20',
            level: cols[4] || 'Beginner',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            instructor_id: ''
          });
        }
      }
      if (rows.length > 0) {
        setBulkRows(rows);
        setAddMode('multiple');
      }
    };
    reader.readAsText(file);
  };

  const downloadCSVSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,Full Name,Email Address,Phone Number,Date of Birth,Surf Level,Assign Instructor\nLiam Torres,liam.torres@gmail.com,(555) 123-4567,1998-05-22,Intermediate,Bethany Hamilton\nMaya Chen,maya.chen@yahoo.com,(555) 987-6543,2001-11-08,Beginner,Kelly Slater";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_import_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const [joinRequests, setJoinRequests] = useState(() => {
    try {
      const saved = localStorage.getItem('school_join_requests');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });



  const allPendingRequests = joinRequests.filter(r => {
    if (r.status === 'approved' || r.status === 'rejected') return false;
    if (activeSchoolName && r.school_name && r.school_name.toLowerCase() !== activeSchoolName.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Synchronize newly created unapproved students into pending requests list
  students.forEach(s => {
    if (!s.email) return;
    const emailLower = s.email.toLowerCase();
    const isApprovedInStorage = joinRequests.some(r => r.student_email?.toLowerCase() === emailLower && r.status === 'approved');
    const isRejectedInStorage = joinRequests.some(r => r.student_email?.toLowerCase() === emailLower && r.status === 'rejected');
    
    // Only mark as pending if student's approval status is explicitly pending
    const isPending = s.approval_status === 'pending' && !isApprovedInStorage;
    const matchesSchool = !activeSchoolName || !s.school || s.school.toLowerCase() === activeSchoolName.toLowerCase();
    
    if (isPending && matchesSchool && !isRejectedInStorage && !allPendingRequests.some(r => r.student_email?.toLowerCase() === emailLower)) {
      allPendingRequests.push({
        id: s.id,
        student_id: s.id,
        student_name: s.name,
        student_email: s.email,
        school_name: s.school || activeSchoolName || 'Aquatic Indica Surf School',
        start_date: s.start_date || '2026-08-26',
        session_time: s.session_time || 'Morning 6:00 AM',
        whatsapp_number: s.whatsapp_number || 'N/A'
      });
    }
  });


  const handleApproveStudentRequest = async (reqId, studentEmail) => {
    try {
      const emailLower = (studentEmail || '').toLowerCase();

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

      setStudents(prev => prev.map(s => {
        if (s.id === reqId || (s.email && s.email.toLowerCase() === emailLower)) {
          return { ...s, approval_status: 'approved' };
        }
        return s;
      }));

      // Upsert approved status into joinRequests & localStorage
      let found = false;
      const updatedReqs = joinRequests.map(r => {
        if (r.id === reqId || (r.student_email && r.student_email.toLowerCase() === emailLower)) {
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
          status: 'approved'
        });
      }

      setJoinRequests(updatedReqs);
      localStorage.setItem('school_join_requests', JSON.stringify(updatedReqs));

      try {
        const savedAccounts = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
        const updatedAccounts = savedAccounts.map(a => 
          a.email.toLowerCase() === emailLower ? { ...a, approval_status: 'approved' } : a
        );
        localStorage.setItem('savedAccounts', JSON.stringify(updatedAccounts));
      } catch (e) {}

      showToast(`✅ Approved ${studentEmail || 'student'}! Account unlocked.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectStudentRequest = (reqId, studentEmail) => {
    if (!window.confirm(`Decline registration request for ${studentEmail || 'student'}?`)) return;
    const emailLower = (studentEmail || '').toLowerCase();
    setStudents(prev => prev.filter(s => s.id !== reqId && (s.email && s.email.toLowerCase() !== emailLower)));
    
    let found = false;
    const updatedReqs = joinRequests.map(r => {
      if (r.id === reqId || (r.student_email && r.student_email.toLowerCase() === emailLower)) {
        found = true;
        return { ...r, status: 'rejected' };
      }
      return r;
    });
    if (!found && emailLower) {
      updatedReqs.push({
        id: reqId || `req_${Date.now()}`,
        student_id: reqId,
        student_email: emailLower,
        status: 'rejected'
      });
    }
    setJoinRequests(updatedReqs);
    localStorage.setItem('school_join_requests', JSON.stringify(updatedReqs));
    showToast(`❌ Declined request for ${studentEmail || 'student'}.`);
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
          <div className="sm-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="sm-btn-secondary"
              onClick={() => setShowPendingModal(true)}
              style={{
                background: allPendingRequests.length > 0 ? '#FFFBEB' : '#FFFFFF',
                color: allPendingRequests.length > 0 ? '#D97706' : '#0F172A',
                border: allPendingRequests.length > 0 ? '1px solid #FCD34D' : '1px solid #CBD5E1',
                fontWeight: 700,
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


            <button className="sm-btn-secondary" onClick={downloadCSVSample}>Export CSV</button>
            <button className="sm-btn-primary" onClick={() => { setShowModal(true); setAddMode('single'); }}>+ Add Student</button>
          </div>
        </header>

        {/* Pending Requests Modal */}
        {showPendingModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '680px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>📩</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0F172A' }}>
                      Pending Registration Requests ({allPendingRequests.length})
                    </h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                      Students requesting to join your Surf School directly.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowPendingModal(false)} style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {allPendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#475569' }}>No pending requests!</div>
                  <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>All student join requests have been reviewed.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {allPendingRequests.map((req) => (
                    <div key={req.id || req.student_email} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '16px' }}>{req.student_name || req.name}</div>
                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>✉️ {req.student_email || req.email}</span>
                          <span>📱 {req.whatsapp_number || 'N/A'}</span>
                          <span>🗓️ {req.start_date || '2026-08-26'} ({req.session_time || 'Dawn Patrol'})</span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#D97706', marginTop: '6px', fontWeight: 700 }}>
                          🏫 Requested Surf School: {req.school_name || req.school || 'Aquatic Indica Surf School'}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => {
                            handleApproveStudentRequest(req.student_id || req.id, req.student_email || req.email);
                            if (allPendingRequests.length <= 1) setShowPendingModal(false);
                          }}
                          style={{ background: '#10B981', color: '#FFF', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(16,185,129,0.2)' }}
                        >
                          ✅ Accept Student
                        </button>
                        <button 
                          onClick={() => {
                            handleRejectStudentRequest(req.student_id || req.id, req.student_email || req.email);
                            if (allPendingRequests.length <= 1) setShowPendingModal(false);
                          }}
                          style={{ background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '8px', padding: '9px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                        >
                          ❌ Decline
                        </button>
                      </div>
                    </div>
                  ))}
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
          <select
            className="sm-select"
            value={levelFilter}
            onChange={e => {
              const val = e.target.value;
              setLevelFilter(val);
              if (val === 'Beginner') setActiveStatFilter('BEGINNER');
              else if (val === 'Intermediate') setActiveStatFilter('INTERMEDIATE');
              else if (val === 'Advanced') setActiveStatFilter('ADVANCED');
              else setActiveStatFilter('TOTAL');
            }}
          >
            <option value="All">Level: All</option>
            {levels.map(l => <option key={l}>{l}</option>)}
          </select>
          <select className="sm-select" value={instructorFilter} onChange={e => setInstructorFilter(e.target.value)}>
            <option value="All">Instructor: All</option>
            {instructors.map(i => <option key={i.id}>{i.name}</option>)}
          </select>
          <select className="sm-select" value={sessionTimeFilter} onChange={e => setSessionTimeFilter(e.target.value)}>
            <option value="All">Session: All Slots</option>
            <option value="Morning 6:00 AM">Morning 6:00 AM (Dawn Patrol)</option>
            <option value="Morning 8:00 AM">Morning 8:00 AM</option>
            <option value="Evening 4:00 PM">Evening 4:00 PM</option>
          </select>
          <select className="sm-select" value={stayFilter} onChange={e => setStayFilter(e.target.value)}>
            <option value="All">Stay: All</option>
            <option value="Lodge">On-site Lodge</option>
            <option value="Offsite">Off-site Stay</option>
          </select>
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
              <span className="sm-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="sm-table-container">
          {loading ? (
            <div className="sm-loading"><div className="sm-spinner" /></div>
          ) : (
            <table className="sm-table">
              <thead>
                <tr>
                  <th>Student & WhatsApp</th>
                  <th>Course Progress</th>
                  <th>Session & Stay</th>
                  <th>Primary Instructor</th>
                  <th>Attendance</th>
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
                        <img src={s.image} alt={s.name} className="sm-student-avatar" onError={e => e.target.style.display='none'} />
                        <div>
                          <div className="sm-student-name">{s.name}</div>
                          <div className="sm-student-email">
                            {s.whatsapp_number ? `📱 +91 ${s.whatsapp_number}` : s.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          Day {s.which_day || 1} of {s.total_days || 3}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {s.course_duration || '3 Days Course'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                          ⏰ {s.session_time || 'Morning 6:00 AM'}
                        </span>
                        <span style={{ fontSize: '11px', color: s.staying_at_school === 'Yes' ? '#10B981' : '#64748B' }}>
                          {s.staying_at_school === 'Yes' ? '🏨 On-site Lodge' : '🚗 Off-site Stay'}
                        </span>
                      </div>
                    </td>
                    <td className="sm-instructor-text">{s.instructor || '—'}</td>
                    <td>
                      <button
                        className="sm-invite-btn"
                        style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.25)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttendanceModal(s);
                        }}
                      >
                        ✓ Mark Daily
                      </button>
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
                    <td style={{ textAlign: 'right' }}>
                      <button className="sm-action-btn" onClick={e => { e.stopPropagation(); navigate(`/students/${s.id}`); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                      {students.length === 0 ? 'No students yet — add one above.' : 'No students match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Add Students Modal & Review Summary ── */}
      {showModal && (
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
                      <label>Course Duration</label>
                      <select
                        value={
                          ['3 Days Course', '5 Days Course', '7 Days Course', '10 Days Course'].includes(form.course_duration)
                            ? form.course_duration
                            : 'custom'
                        }
                        onChange={e => handleCourseDurationChange(e.target.value)}
                      >
                        <option value="3 Days Course">3 Days Course</option>
                        <option value="5 Days Course">5 Days Course</option>
                        <option value="7 Days Course">7 Days Course</option>
                        <option value="10 Days Course">10 Days Course</option>
                        <option value="custom">
                          {['3 Days Course', '5 Days Course', '7 Days Course', '10 Days Course'].includes(form.course_duration)
                            ? 'Custom (> 10 Days)'
                            : `Custom (${form.course_duration})`}
                        </option>
                      </select>
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
                      <label>Assign Instructor</label>
                      <select value={form.instructor_id} onChange={e => setForm({...form, instructor_id: e.target.value})}>
                        <option value="">Auto-Assign (Or Select Coach)</option>
                        {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="sm-field">
                    <label>Preferred Session Time</label>
                    <select value={form.session_time} onChange={e => setForm({...form, session_time: e.target.value})}>
                      <option value="Morning 6:00 AM">06:00 AM · Dawn Patrol</option>
                      <option value="Morning 8:30 AM">08:30 AM · Morning Session</option>
                      <option value="Afternoon 2:00 PM">02:00 PM · Afternoon Session</option>
                      <option value="Sunset 4:30 PM">04:30 PM · Sunset Patrol</option>
                    </select>
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

                  <div className="sm-field">
                    <label>Lodge Stay</label>
                    <select value={form.staying_at_school} onChange={e => setForm({...form, staying_at_school: e.target.value})}>
                      <option value="Yes">Yes (On-site Lodge)</option>
                      <option value="No">No (Off-site Stay)</option>
                    </select>
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
                        <th>Full Name *</th>
                        <th>Email Address *</th>
                        <th>Phone Number</th>
                        <th>Age *</th>
                        <th>Surf Level *</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Assign Instructor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td>
                            <input
                              type="text"
                              placeholder="e.g. Connor Coffin"
                              value={row.name}
                              onChange={e => handleBulkChange(rIdx, 'name', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="email"
                              placeholder="email@address.com"
                              value={row.email}
                              onChange={e => handleBulkChange(rIdx, 'email', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="(555) 000-0000"
                              value={row.phone}
                              onChange={e => handleBulkChange(rIdx, 'phone', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              placeholder="Age"
                              value={row.age}
                              onChange={e => handleBulkChange(rIdx, 'age', e.target.value)}
                              style={{ width: '60px' }}
                            />
                          </td>
                          <td>
                            <select
                              value={row.level}
                              onChange={e => handleBulkChange(rIdx, 'level', e.target.value)}
                            >
                              <option value="Beginner">Beginner</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Advanced">Advanced</option>
                              <option value="Master">Master</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="date"
                              value={row.start_date}
                              onChange={e => handleBulkChange(rIdx, 'start_date', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={row.end_date}
                              onChange={e => handleBulkChange(rIdx, 'end_date', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              value={row.instructor_id}
                              onChange={e => handleBulkChange(rIdx, 'instructor_id', e.target.value)}
                            >
                              <option value="">Auto-Assign</option>
                              {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                          </td>
                        </tr>
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
                    <div className="sm-req-item sm-req-warn"><span className="sm-req-warn-icon">⚠️</span><span>Leave Instructor blank for auto-assignment.</span></div>
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
                    <div className="sm-dropzone-hint">Supports .csv and .xlsx files up to 10MB</div>
                    {csvFileName && <div className="sm-csv-filename">Uploaded: {csvFileName}</div>}
                  </div>

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
                          <td><strong>Date of Birth</strong></td>
                          <td><span className="sm-badge-req">Required</span></td>
                          <td>Numeric values only (must be under 100) or YYYY-MM-DD</td>
                        </tr>
                        <tr>
                          <td><strong>Surf Level</strong></td>
                          <td><span className="sm-badge-opt">Optional</span></td>
                          <td>Must match: Beginner, Intermediate, or Advanced</td>
                        </tr>
                        <tr>
                          <td><strong>Assign Instructor</strong></td>
                          <td><span className="sm-badge-opt">Optional</span></td>
                          <td>Full name of active coach, or left blank</td>
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
                  <span>Student Successfully Added!</span>
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
                  <div className="sm-summary-card">
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
                        <tr><td>Email Address</td><td>{addedStudentSummary.email}</td></tr>
                        <tr><td>Phone Number</td><td>{addedStudentSummary.whatsapp_number || '(555) 321-7654'}</td></tr>
                        <tr><td>Age</td><td>{addedStudentSummary.age || 19}</td></tr>
                        <tr>
                          <td>Surf Level</td>
                          <td><span className="sm-summary-teal-badge">{addedStudentSummary.level || 'Intermediate'} TEAL LEVEL</span></td>
                        </tr>
                        <tr><td>Assigned Instructor</td><td>{addedStudentSummary.instructor || 'Bethany Hamilton'}</td></tr>
                        <tr><td>Preferred Session</td><td>{addedStudentSummary.session_time || '08:30 AM · Morning Patrol'}</td></tr>
                        <tr><td>Booking Start Date</td><td>{addedStudentSummary.start_date || 'Aug 25, 2026'}</td></tr>
                        <tr><td>Booking End Date</td><td>{addedStudentSummary.end_date || 'Dec 20, 2026'}</td></tr>
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

                  {/* Right Column: Quick Actions & Session Stats */}
                  <div className="sm-summary-right-col">
                    {/* Quick Actions Card */}
                    <div className="sm-summary-panel">
                      <h4 className="sm-form-section-title" style={{ marginTop: 0 }}>Quick Actions</h4>
                      
                      <div className="sm-qa-action-item" onClick={() => navigate('/sessions')}>
                        <div className="sm-qa-icon">📅</div>
                        <div className="sm-qa-text">
                          <div className="sm-qa-title">Assign to Session</div>
                          <div className="sm-qa-sub">Schedule {(addedStudentSummary.name || 'Student').split(' ')[0]}'s first coaching session</div>
                        </div>
                        <span className="sm-qa-arrow">→</span>
                      </div>

                      <div className="sm-qa-toggle-item">
                        <div className="sm-qa-icon">✉️</div>
                        <div className="sm-qa-text">
                          <div className="sm-qa-title">Send Welcome Email</div>
                          <div className="sm-qa-sub">Send onboarding credentials</div>
                        </div>
                        <input
                          type="checkbox"
                          className="sm-toggle-input"
                          checked={sendWelcomeEmail}
                          onChange={e => setSendWelcomeEmail(e.target.checked)}
                        />
                      </div>

                      <div className="sm-qa-toggle-item">
                        <div className="sm-qa-icon">🔔</div>
                        <div className="sm-qa-text">
                          <div className="sm-qa-title">Notify Instructor</div>
                          <div className="sm-qa-sub">Alert coach about new assignment</div>
                        </div>
                        <input
                          type="checkbox"
                          className="sm-toggle-input"
                          checked={notifyInstructor}
                          onChange={e => setNotifyInstructor(e.target.checked)}
                        />
                      </div>
                    </div>

                    {/* Session Stats Widgets */}
                    <div className="sm-session-stat-card">
                      <div className="sm-ssc-label">PENDING SESSIONS</div>
                      <div className="sm-ssc-value">12</div>
                      <div className="sm-ssc-sub">Days Pending: 8</div>
                    </div>

                    <div className="sm-session-stat-card">
                      <div className="sm-ssc-label">SESSIONS BOOKED</div>
                      <div className="sm-ssc-value">48</div>
                      <div className="sm-ssc-sub">Days Booked: 32</div>
                    </div>

                    <div className="sm-session-stat-card">
                      <div className="sm-ssc-label">SESSIONS COMPLETED</div>
                      <div className="sm-ssc-value">36</div>
                      <div className="sm-ssc-sub">Days Completed: 24</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Step Indicator Bar */}
                <div className="sm-summary-step-bar">
                  <div className="sm-step-item done"><span className="sm-step-circle">✓</span> Add Student</div>
                  <div className="sm-step-line" />
                  <div className="sm-step-item active"><span className="sm-step-circle">2</span> Review Summary</div>
                  <div className="sm-step-line" />
                  <div className="sm-step-item"><span className="sm-step-circle">3</span> Assign Session</div>
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
                Course: {attendanceModal.course_duration || '3 Days Course'} · Current: Day {attendanceModal.which_day || 1} of {attendanceModal.total_days || 3}
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
        .sm-add-student-modal { max-width: 1040px; width: 95%; max-height: 90vh; overflow-y: auto; }
        
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
        .sm-bulk-table-wrap { overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 12px; background: #FFF; }
        .sm-bulk-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .sm-bulk-table th { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748B; background: #F8FAFC; padding: 12px 10px; border-bottom: 1px solid #E2E8F0; text-align: left; }
        .sm-bulk-table td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; }
        .sm-bulk-table input, .sm-bulk-table select {
          width: 100%; height: 36px; border: 1px solid #E2E8F0; border-radius: 6px;
          padding: 0 8px; font-size: 12px; color: #0F172A; background: #FFF; outline: none;
        }
        .sm-bulk-table input:focus, .sm-bulk-table select:focus { border-color: #0D9488; }
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
      `}</style>
    </div>
  );
};

export default StudentsManagement;
