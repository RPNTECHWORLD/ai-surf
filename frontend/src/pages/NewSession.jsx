import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';


const API = import.meta.env.VITE_API_URL || '';

const NewSession = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isVideoUrl = (m) => {
    if (!m || typeof m !== 'string') return false;
    const lower = m.toLowerCase();
    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.avi') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mkv') ||
      lower.endsWith('.m4v') ||
      lower.endsWith('.ogv') ||
      lower.includes('/uploads/') ||
      lower.includes('#video') ||
      lower.startsWith('blob:')
    );
  };

  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const removeMedia = (indexToRemove) => {
    setMediaFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const uploadFile = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/api/upload-video`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const uploadedUrl = data.video_url || data.url;
        setMediaFiles(prev => [...prev, uploadedUrl]);
      } else {
        alert('Failed to upload file');
      }
    } catch (err) {
      console.error(err);
      alert('Upload connection error');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Parse ?date= param from URL (e.g., set by calendar "Schedule Slot")
  const urlDateParam = searchParams.get('date'); // format: YYYY-MM-DD

  const today = new Date();
  const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD for date input

  const [form, setForm] = useState({
    date: urlDateParam || todayISO,
    time: '08:30',
    duration_mins: '90',
    location: 'Banzai Pipeline, North Shore, Oahu',
    condition: 'Moderate',
    type: 'Intermediate',
    student_id: '',
    instructor_id: '',
    status: 'Upcoming',
    notes: '',
  });

  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentMenu, setShowStudentMenu] = useState(false);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState([]);
  const [instructorSearch, setInstructorSearch] = useState('');
  const [showInstructorMenu, setShowInstructorMenu] = useState(false);
  const [slotChoice, setSlotChoice] = useState('08:30');
  const [allSessions, setAllSessions] = useState([]);
  const [studentFilterTab, setStudentFilterTab] = useState('slot'); // 'slot' | 'all'

  const configuredSlots = [
    { time: '08:30', display: '08:30 AM (90m)', duration: 90, label: 'Morning Slot 1' },
    { time: '10:30', display: '10:30 AM (90m)', duration: 90, label: 'Morning Slot 2' },
    { time: '11:30', display: '11:30 AM (60m)', duration: 60, label: 'Midday Slot' },
    { time: '13:00', display: '01:00 PM (120m)', duration: 120, label: 'Afternoon Slot' },
    { time: '15:30', display: '03:30 PM (90m)', duration: 90, label: 'Late Afternoon' },
  ];

  const handleSlotSelect = (timeStr, durationMins) => {
    setSlotChoice(timeStr);
    setForm(prev => ({
      ...prev,
      time: timeStr,
      duration_mins: String(durationMins)
    }));
  };

  const [checkedNotes, setCheckedNotes] = useState({
    leftBreak: true,
    offshoreWind: true,
    fastSections: true,
    highTide: true,
  });

  const toggleNote = (key) => {
    setCheckedNotes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStudent = (sId) => {
    setSelectedStudentIds(prev => 
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const toggleInstructor = (iId) => {
    setSelectedInstructorIds(prev => {
      const exists = prev.includes(iId);
      const updated = exists ? prev.filter(id => id !== iId) : [...prev, iId];
      setForm(f => ({ ...f, instructor_id: updated[0] ? String(updated[0]) : '' }));
      return updated;
    });
  };

  const toggleSelectAllInstructors = () => {
    if (selectedInstructorIds.length === instructors.length) {
      setSelectedInstructorIds([]);
      setForm(f => ({ ...f, instructor_id: '' }));
    } else {
      const allIds = instructors.map(i => i.id);
      setSelectedInstructorIds(allIds);
      setForm(f => ({ ...f, instructor_id: allIds[0] ? String(allIds[0]) : '' }));
    }
  };

  const toggleSelectAllStudents = (targetList = students) => {
    const targetIds = targetList.map(s => s.id);
    const allSelected = targetIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !targetIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  useEffect(() => {
    fetch(`${API}/api/students`).then(r => r.json()).then(setStudents).catch(() => {});
    fetch(`${API}/api/instructors`).then(r => r.json()).then(setInstructors).catch(() => {});
    fetch(`${API}/api/sessions`).then(r => r.json()).then(setAllSessions).catch(() => {});
  }, []);

  const normalizeDate = (d) => {
    if (!d) return '';
    try {
      const ddmmyyyy = String(d).match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
      if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
      }
      const yyyymmdd = String(d).match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (yyyymmdd) {
        return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
      }
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (e) {}
    return String(d).trim().toLowerCase();
  };

  const normalizeTime = (t) => {
    if (!t) return '';
    const m = String(t).match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return String(t).trim();
    let h = parseInt(m[1]);
    const min = m[2];
    const ampm = m[3] ? m[3].toUpperCase() : null;
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  };

  // Find students matching currently selected Date & Time Slot (from scheduled sessions OR student registered booking)
  const isStudentInSlot = (s) => {
    const formDateStr = normalizeDate(form.date);
    const formTimeStr = normalizeTime(form.time);

    // 1. Check if student has a scheduled session in allSessions for this date & time
    const hasSessionMatch = allSessions.some(sess => 
      String(sess.student_id) === String(s.id) &&
      normalizeDate(sess.date) === formDateStr &&
      normalizeTime(sess.time) === formTimeStr
    );
    if (hasSessionMatch) return true;

    // 2. Check student's registered booking / course schedule
    const sTimeStr = normalizeTime(s.session_time || s.time || s.session_slot);
    if (sTimeStr && sTimeStr === formTimeStr) {
      const sStart = normalizeDate(s.start_date || s.date);
      const sEnd = normalizeDate(s.end_date || s.start_date || s.date);
      if (sStart && sEnd) {
        if (formDateStr >= sStart && formDateStr <= sEnd) return true;
      } else if (sStart && formDateStr === sStart) {
        return true;
      } else if (!sStart) {
        return true;
      }
    }
    return false;
  };

  const slotStudents = students.filter(isStudentInSlot);
  const slotStudentIds = slotStudents.map(s => s.id);

  useEffect(() => {
    if (isEdit) {
      fetch(`${API}/api/sessions/${id}`)
        .then(r => r.json())
        .then(data => {
          // Convert stored "27 Aug 2026" → "2026-08-27" for date input
          const parseToISO = (d) => {
            if (!d) return '';
            // Already ISO format
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
            const p = new Date(d);
            return isNaN(p) ? d : p.toISOString().split('T')[0];
          };
          // Convert "08:30 AM" → "08:30" for time input (HTML5 type=time uses 24h HH:MM)
          const parseToHHMM = (t) => {
            if (!t) return '08:30';
            if (/^\d{2}:\d{2}$/.test(t)) return t;
            const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!m) return t.slice(0, 5);
            let h = parseInt(m[1]);
            const min = m[2];
            const ampm = m[3].toUpperCase();
            if (ampm === 'PM' && h !== 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return `${String(h).padStart(2,'0')}:${min}`;
          };
          setForm({
            date: parseToISO(data.date),
            time: parseToHHMM(data.time),
            duration_mins: String(data.duration_mins),
            location: data.location,
            condition: data.condition,
            type: data.type,
            student_id: String(data.student_id),
            instructor_id: String(data.instructor_id),
            status: data.status,
            notes: data.notes || '',
          });
          if (data.instructor_ids && Array.isArray(data.instructor_ids)) {
            setSelectedInstructorIds(data.instructor_ids);
          } else if (data.instructor_id) {
            setSelectedInstructorIds([parseInt(data.instructor_id)]);
          }
          if (data.video_url) {
            setMediaFiles([data.video_url]);
          } else {
            setMediaFiles([]);
          }
          const notesStr = data.notes || '';
          setCheckedNotes({
            leftBreak: notesStr.includes('Left break dominant'),
            offshoreWind: notesStr.includes('Offshore wind'),
            fastSections: notesStr.includes('Fast sections'),
            highTide: notesStr.includes('High tide start'),
          });
        })
        .catch(err => console.error(err));
    }
  }, [id, isEdit]);

  const buildNotes = () => {
    const noteMap = {
      leftBreak: 'Left break dominant',
      offshoreWind: 'Offshore wind',
      fastSections: 'Fast sections',
      highTide: 'High tide start',
    };
    return Object.entries(checkedNotes)
      .filter(([, checked]) => checked)
      .map(([k]) => noteMap[k])
      .join('; ');
  };

  const handleSave = async () => {
    const finalStudentIds = isEdit 
      ? (form.student_id ? [parseInt(form.student_id)] : []) 
      : (selectedStudentIds.length > 0 ? selectedStudentIds : (form.student_id ? [parseInt(form.student_id)] : []));

    const finalInstructorIds = selectedInstructorIds.length > 0
      ? selectedInstructorIds
      : (form.instructor_id ? [parseInt(form.instructor_id)] : []);

    if (finalStudentIds.length === 0 || finalInstructorIds.length === 0) {
      setError('Please select at least one student and at least one instructor.');
      return;
    }

    const chosenInstructors = instructors.filter(i => finalInstructorIds.includes(i.id));
    const instructorNames = chosenInstructors.map(i => i.name).join(' & ');
    const primaryInstructorId = finalInstructorIds[0];

    setSaving(true);
    setError('');
    const videoItems = mediaFiles.filter(isVideoUrl);
    const uploadedVideo = videoItems.length > 0 ? videoItems[videoItems.length - 1] : (mediaFiles.length > 0 ? mediaFiles[mediaFiles.length - 1] : '');
    
    const formattedDate = form.date
      ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : form.date;
      
    const formattedTime = (() => {
      const [hStr, mStr] = (form.time || '08:30').split(':');
      let h = parseInt(hStr);
      const min = mStr || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${String(h).padStart(2, '0')}:${min} ${ampm}`;
    })();

    try {
      if (isEdit || finalStudentIds.length === 1) {
        const sid = finalStudentIds[0];
        const url = isEdit ? `${API}/api/sessions/${id}` : `${API}/api/sessions`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: formattedDate,
            time: formattedTime,
            duration_mins: parseInt(form.duration_mins) || 60,
            student_id: sid,
            instructor_id: primaryInstructorId,
            instructor: instructorNames,
            instructor_ids: finalInstructorIds,
            location: form.location,
            condition: form.condition,
            type: form.type,
            status: isEdit ? form.status : 'Upcoming',
            notes: buildNotes(),
            video_url: uploadedVideo
          }),
        });
        if (res.ok) {
          navigate('/sessions');
        } else {
          setError('Failed to save session. Please try again.');
        }
      } else {
        // Multi-Student Group Session Creation
        const res = await fetch(`${API}/api/sessions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: formattedDate,
            time: formattedTime,
            duration_mins: parseInt(form.duration_mins) || 60,
            student_ids: finalStudentIds,
            instructor_id: primaryInstructorId,
            instructor: instructorNames,
            instructor_ids: finalInstructorIds,
            location: form.location,
            condition: form.condition,
            type: form.type,
            status: 'Upcoming',
            notes: buildNotes(),
            video_url: uploadedVideo
          }),
        });
        if (res.ok) {
          navigate('/sessions');
        } else {
          // Fallback: create individual sessions sequentially
          for (const sid of finalStudentIds) {
            await fetch(`${API}/api/sessions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: formattedDate,
                time: formattedTime,
                duration_mins: parseInt(form.duration_mins) || 60,
                student_id: sid,
                instructor_id: primaryInstructorId,
                instructor: instructorNames,
                instructor_ids: finalInstructorIds,
                location: form.location,
                condition: form.condition,
                type: form.type,
                status: 'Upcoming',
                notes: buildNotes(),
                video_url: uploadedVideo
              }),
            });
          }
          navigate('/sessions');
        }
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="ns-page">
      <Sidebar />
      <main className="ns-main">
        {/* Header */}
        <header className="ns-header">
          <div>
            <h1 className="ns-title">{isEdit ? 'Edit Session Log' : 'New Session Log'}</h1>
            <p className="ns-sub">{isEdit ? 'Modify session metadata, status, and upload footage.' : 'Document session metadata and wave conditions.'}</p>
          </div>
          <div className="ns-actions">
            <button className="ns-btn-cancel" onClick={() => navigate('/sessions')}>Cancel</button>
            <button className="ns-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? <span className="ns-spinner" /> : 'Save Session'}
            </button>
          </div>
        </header>

        {error && (
          <div className="ns-error">{error}</div>
        )}

        {/* Layout */}
        <div className="ns-layout">
          {/* Left Column: Session Details */}
          <div className="ns-col-left">
            <h2 className="ns-section-title">Session Details</h2>

            {/* Row 1: Student Selection & Instructor */}
            <div className="ns-form-row" style={{ alignItems: 'flex-start' }}>
              
              {/* Clean Student Multi-Select Dropdown */}
              <div className="ns-form-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="ns-label" style={{ margin: 0 }}>
                    STUDENT(S)
                  </label>
                  {selectedStudentIds.length > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488' }}>
                      {selectedStudentIds.length === students.length ? 'All Students' : `${selectedStudentIds.length} Selected`}
                    </span>
                  )}
                </div>

                {/* Dropdown Trigger Box */}
                <div
                  onClick={() => setShowStudentMenu(!showStudentMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    minHeight: '44px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <span style={{ fontSize: '16px' }}>👥</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: selectedStudentIds.length > 0 ? '#0F172A' : '#94A3B8' }}>
                      {selectedStudentIds.length === 0 
                        ? (slotStudents.length > 0 ? `— Select students (${slotStudents.length} in this slot) —` : '— Select students for this session —') 
                        : (selectedStudentIds.length === students.length 
                            ? `All Students (${students.length} Enrolled)` 
                            : `${selectedStudentIds.length} Student${selectedStudentIds.length > 1 ? 's' : ''} Selected`
                          )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {slotStudents.length > 0 && (
                      <span style={{
                        background: '#E6F9F5',
                        color: '#0D9488',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid #99F6E4'
                      }}>
                        {slotStudents.length} in slot
                      </span>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showStudentMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Floating Multi-Select Menu */}
                {showStudentMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '6px',
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {/* Filter Tabs: Slot Students vs All Students */}
                    <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setStudentFilterTab('slot')}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          border: 'none',
                          borderRadius: '6px',
                          background: studentFilterTab === 'slot' ? '#0D9488' : 'transparent',
                          color: studentFilterTab === 'slot' ? '#FFFFFF' : '#475569',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>📅 In This Slot</span>
                        <span style={{
                          background: studentFilterTab === 'slot' ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                          color: studentFilterTab === 'slot' ? '#FFF' : '#334155',
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '10px'
                        }}>
                          {slotStudents.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudentFilterTab('all')}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          border: 'none',
                          borderRadius: '6px',
                          background: studentFilterTab === 'all' ? '#0D9488' : 'transparent',
                          color: studentFilterTab === 'all' ? '#FFFFFF' : '#475569',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>👥 All Students</span>
                        <span style={{
                          background: studentFilterTab === 'all' ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                          color: studentFilterTab === 'all' ? '#FFF' : '#334155',
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '10px'
                        }}>
                          {students.length}
                        </span>
                      </button>
                    </div>

                    {/* Search & Actions Bar */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Search student by name..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          outline: 'none',
                          background: '#F8FAFC'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => toggleSelectAllStudents(studentFilterTab === 'slot' ? slotStudents : students)}
                        style={{
                          background: '#E6F9F5',
                          color: '#0D9488',
                          border: '1px solid #0D9488',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {studentFilterTab === 'slot' ? 'Select All in Slot' : 'Select All'}
                      </button>
                      {selectedStudentIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Scrollable Students List */}
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {(studentFilterTab === 'slot' ? slotStudents : students)
                        .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.level && s.level.toLowerCase().includes(studentSearch.toLowerCase())))
                        .map(s => {
                          const isChecked = selectedStudentIds.includes(s.id);
                          const isInSlot = slotStudentIds.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              onClick={() => toggleStudent(s.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: isChecked ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.1s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  style={{ cursor: 'pointer', accentColor: '#0D9488' }}
                                />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                                  {s.name}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isInSlot && studentFilterTab === 'all' && (
                                  <span style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    background: '#CCFBF1',
                                    color: '#0F766E'
                                  }}>
                                    In Slot
                                  </span>
                                )}
                                <span style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: '#F1F5F9',
                                  color: '#64748B'
                                }}>
                                  {s.level || 'Beginner'}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                      {studentFilterTab === 'slot' && slotStudents.length === 0 && (
                        <div style={{ padding: '18px 12px', textAlign: 'center', color: '#64748B', fontSize: '12.5px' }}>
                          <div>📅 No students booked yet for this slot.</div>
                          <button
                            type="button"
                            onClick={() => setStudentFilterTab('all')}
                            style={{
                              marginTop: '8px',
                              padding: '5px 12px',
                              background: '#0D9488',
                              color: '#FFF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Switch to All Students
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Done button */}
                    <button
                      type="button"
                      onClick={() => setShowStudentMenu(false)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#0D9488',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Done ({selectedStudentIds.length} Selected)
                    </button>
                  </div>
                )}
              </div>

              {/* Instructor Multi-Select */}
              <div className="ns-form-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="ns-label" style={{ margin: 0 }}>INSTRUCTORS ({selectedInstructorIds.length} SELECTED)</label>
                  {selectedInstructorIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSelectedInstructorIds([]); setForm(f => ({ ...f, instructor_id: '' })); }}
                      style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Box that toggles dropdown */}
                <div
                  onClick={() => setShowInstructorMenu(!showInstructorMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#FFFFFF',
                    border: showInstructorMenu ? '1.5px solid #0D9488' : '1.5px solid #CBD5E1',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    minHeight: '44px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                    <span style={{ fontSize: '16px' }}>🏄‍♂️</span>
                    <span style={{ fontSize: '13.5px', fontWeight: selectedInstructorIds.length > 0 ? 700 : 500, color: selectedInstructorIds.length > 0 ? '#0F172A' : '#94A3B8' }}>
                      {selectedInstructorIds.length === 0
                        ? '— Select instructors / coaches —'
                        : (selectedInstructorIds.length === instructors.length
                            ? `All Instructors (${instructors.length} Assigned)`
                            : instructors.filter(i => selectedInstructorIds.includes(i.id)).map(i => i.name).join(', ')
                          )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedInstructorIds.length > 0 && (
                      <span style={{
                        background: '#CCFBF1',
                        color: '#0F766E',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid #99F6E4'
                      }}>
                        {selectedInstructorIds.length} coach{selectedInstructorIds.length > 1 ? 'es' : ''}
                      </span>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showInstructorMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Floating Multi-Select Menu */}
                {showInstructorMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '6px',
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {/* Search & Actions Bar */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Search instructor by name..."
                        value={instructorSearch}
                        onChange={e => setInstructorSearch(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          outline: 'none',
                          background: '#F8FAFC'
                        }}
                      />
                      <button
                        type="button"
                        onClick={toggleSelectAllInstructors}
                        style={{
                          background: '#E6F9F5',
                          color: '#0D9488',
                          border: '1px solid #0D9488',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {selectedInstructorIds.length === instructors.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Scrollable Instructors List */}
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {instructors
                        .filter(i => !instructorSearch || i.name.toLowerCase().includes(instructorSearch.toLowerCase()) || (i.specialty && i.specialty.toLowerCase().includes(instructorSearch.toLowerCase())))
                        .map(i => {
                          const isChecked = selectedInstructorIds.includes(i.id);
                          return (
                            <div
                              key={i.id}
                              onClick={() => toggleInstructor(i.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: isChecked ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.1s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  style={{ cursor: 'pointer', accentColor: '#0D9488' }}
                                />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                                  {i.name}
                                </span>
                              </div>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#F1F5F9',
                                color: '#64748B'
                              }}>
                                {i.specialty || 'Surf Coach'}
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    {/* Done button */}
                    <button
                      type="button"
                      onClick={() => setShowInstructorMenu(false)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#0D9488',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Done ({selectedInstructorIds.length} Selected)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Configured Time Slots Quick Picker */}
            <div style={{ marginBottom: '16px' }}>
              <label className="ns-label" style={{ marginBottom: '6px' }}>
                CONFIGURED TIME SLOTS
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {configuredSlots.map(slot => {
                  const isActive = form.time === slot.time && String(form.duration_mins) === String(slot.duration);
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => handleSlotSelect(slot.time, slot.duration)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        background: isActive ? '#0D9488' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : '#475569',
                        border: `1.5px solid ${isActive ? '#0D9488' : '#E2E8F0'}`,
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {slot.display}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Date, Start Time, Duration */}
            <div className="ns-form-row">
              <div className="ns-form-group">
                <label className="ns-label">DATE</label>
                <input
                  className="ns-input-box ns-real-input"
                  type="date"
                  value={form.date}
                  onChange={e => setField('date', e.target.value)}
                />
              </div>

              <div className="ns-form-group">
                <label className="ns-label">START TIME</label>
                <input
                  className="ns-input-box ns-real-input"
                  type="time"
                  value={form.time}
                  onChange={e => setField('time', e.target.value)}
                />
              </div>

              <div className="ns-form-group">
                <label className="ns-label">DURATION (MIN)</label>
                <input
                  className="ns-input-box ns-real-input"
                  type="number"
                  min="15"
                  max="300"
                  value={form.duration_mins}
                  onChange={e => setField('duration_mins', e.target.value)}
                />
              </div>
            </div>

            <div className="ns-form-row">
              <div className="ns-form-group">
                <label className="ns-label">LESSON TYPE</label>
                <select className="ns-select-box" value={form.type} onChange={e => setField('type', e.target.value)}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                  <option>Master</option>
                </select>
              </div>

              {isEdit && (
                <div className="ns-form-group">
                  <label className="ns-label">STATUS</label>
                  <select className="ns-select-box" value={form.status || 'Upcoming'} onChange={e => setField('status', e.target.value)}>
                    <option value="Upcoming">Upcoming</option>
                    <option value="IN PROGRESS">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}
            </div>

            <div className="ns-form-group" style={{ marginTop: '8px' }}>
              <label className="ns-label">LOCATION</label>
              <div className="ns-input-box ns-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <input
                  className="ns-inline-input"
                  type="text"
                  value={form.location}
                  onChange={e => setField('location', e.target.value)}
                  placeholder="e.g. Pipeline, Waikiki"
                />
              </div>
            </div>

            <div className="ns-form-group" style={{ marginTop: '16px' }}>
              <label className="ns-label">WAVE CONDITIONS</label>
              <div className="ns-conditions-grid">
                {[
                  { key: 'Easy', color: '#0D9488', desc: '1-3ft, friendly' },
                  { key: 'Moderate', color: '#F59E0B', desc: '4-6ft, consistent' },
                  { key: 'Hard', color: '#F43F5E', desc: '8ft+, extreme' },
                ].map(({ key, color, desc }) => (
                  <div
                    key={key}
                    className={`ns-cond-card ${form.condition === key ? `ns-cond-active-${key.toLowerCase()}` : ''}`}
                    onClick={() => setField('condition', key)}
                  >
                    <div className="ns-cond-title" style={{ color }}>{key}</div>
                    <div className="ns-cond-desc">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Upload & Notes */}
          <div className="ns-col-right">

            {/* Upload Media Card */}
            <div className="ns-upload-card">
              <h2 className="ns-section-title" style={{ color: '#FFF' }}>Upload Media</h2>

              <div 
                className="ns-dropzone"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('session-file-picker').click()}
                style={{ cursor: 'pointer' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <div className="ns-drop-text">
                  {uploading ? 'Uploading your footage...' : 'Drop drone footage or click to choose file'}
                </div>
                <input 
                  type="file" 
                  id="session-file-picker" 
                  style={{ display: 'none' }} 
                  onChange={handleFileSelect} 
                  accept="image/*,video/*"
                />
              </div>

              {mediaFiles.length > 0 && (
                <div className="ns-media-preview" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {mediaFiles.map((m, i) => {
                    const isVideo = isVideoUrl(m);
                    return (
                      <div 
                        key={i} 
                        className="ns-media-item" 
                        style={{ 
                          width: '100px',
                          height: '90px',
                          borderRadius: '10px',
                          backgroundImage: isVideo ? 'none' : `url('${m}')`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isVideo ? '#090D16' : undefined,
                          overflow: 'hidden',
                          position: 'relative',
                          border: '1.5px solid rgba(255,255,255,0.15)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                      >
                        {isVideo ? (
                          <>
                            <video 
                              src={m} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              muted 
                              loop 
                              playsInline 
                              onMouseOver={(e) => e.target.play()}
                              onMouseOut={(e) => e.target.pause()}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              background: 'rgba(13,148,136,0.85)',
                              color: '#FFF',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              pointerEvents: 'none'
                            }}>
                              VIDEO
                            </div>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeMedia(i); }}
                          title="Remove media"
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#FFF',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            lineHeight: 1,
                            zIndex: 10
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Wave Notes Card */}
            <div className="ns-notes-card">
              <h2 className="ns-section-title">Wave Notes</h2>

              <div className="ns-notes-list">
                {[
                  { key: 'leftBreak', label: 'Left break dominant' },
                  { key: 'offshoreWind', label: 'Offshore wind' },
                  { key: 'fastSections', label: 'Fast sections' },
                  { key: 'highTide', label: 'High tide start' }
                ].map(note => (
                  <div key={note.key} className="ns-note-item" onClick={() => toggleNote(note.key)}>
                    <div className="ns-checkbox">
                      {checkedNotes[note.key] && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      )}
                    </div>
                    <span className="ns-note-label">{note.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        .ns-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .ns-main { flex: 1; padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }

        /* Header */
        .ns-header { display: flex; justify-content: space-between; align-items: center; }
        .ns-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #000; margin: 0; line-height: 1.2; }
        .ns-sub { font-size: 15px; color: #64748B; margin: 4px 0 0 0; }
        .ns-actions { display: flex; gap: 16px; align-items: center; }
        .ns-btn-cancel {
          padding: 12px 24px; background: #FFFFFF; border: 1px solid #050B1A; border-radius: 8px;
          font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #050B1A; cursor: pointer;
        }
        .ns-btn-save {
          padding: 12px 24px; background: #F43F5E; border: none; border-radius: 8px;
          font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #FFFFFF; cursor: pointer;
          display: flex; align-items: center; gap: 8px; min-width: 140px; justify-content: center;
        }
        .ns-btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
        .ns-spinner {
          width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: #fff;
          border-radius: 50%; animation: ns-spin 0.7s linear infinite;
        }
        @keyframes ns-spin { to { transform: rotate(360deg); } }

        /* Error Banner */
        .ns-error {
          background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 10px; padding: 14px 20px; color: #F43F5E; font-size: 14px; font-weight: 500;
        }

        /* Layout */
        .ns-layout { display: flex; gap: 32px; align-items: flex-start; }

        /* Left Column (Session Details) */
        .ns-col-left {
          flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px;
          padding: 40px; display: flex; flex-direction: column; gap: 24px;
        }
        .ns-section-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #000; margin: 0; }

        .ns-form-row { display: flex; gap: 24px; }
        .ns-form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .ns-label { font-size: 13px; font-weight: 700; color: #000; text-transform: uppercase; }
        
        .ns-input-box {
          height: 48px; background: #F8F6F2; border-radius: 8px; display: flex; align-items: center;
          padding: 0 16px; font-size: 15px; color: #000; font-weight: 400;
        }
        .ns-input-icon { gap: 8px; }
        .ns-inline-input {
          border: none; outline: none; background: transparent; font-size: 15px; color: #000;
          font-family: 'Instrument Sans', sans-serif; flex: 1;
        }
        .ns-real-input {
          border: 1.5px solid #E2E8F0; background: #fff; outline: none;
          font-family: 'Instrument Sans', sans-serif; transition: border-color 0.2s;
        }
        .ns-real-input:focus { border-color: #F43F5E; box-shadow: 0 0 0 3px rgba(244,63,94,0.1); }
        .ns-select-box {
          height: 48px; background: #F8F6F2; border: 1.5px solid #E2E8F0; border-radius: 8px;
          padding: 0 16px; font-size: 14px; color: #000; outline: none; cursor: pointer;
          font-family: 'Instrument Sans', sans-serif; transition: border-color 0.2s;
        }
        .ns-select-box:focus { border-color: #F43F5E; box-shadow: 0 0 0 3px rgba(244,63,94,0.1); }

        .ns-conditions-grid { display: flex; gap: 16px; margin-top: 8px; }
        .ns-cond-card {
          flex: 1; background: #F8F6F2; border: 2px solid #E2E8F0; border-radius: 12px;
          padding: 20px; display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: all 0.2s;
        }
        .ns-cond-active-easy { background: #FFFFFF; border-color: #0D9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
        .ns-cond-active-moderate { background: #FFFFFF; border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
        .ns-cond-active-hard { background: #FFFFFF; border-color: #F43F5E; box-shadow: 0 0 0 3px rgba(244,63,94,0.1); }
        .ns-cond-title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; }
        .ns-cond-desc { font-size: 13px; color: #64748B; }

        /* Right Column (Upload & Notes) */
        .ns-col-right { display: flex; flex-direction: column; gap: 32px; width: 440px; flex-shrink: 0; }

        /* Upload Card */
        .ns-upload-card {
          background: #050B1A; border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 24px;
        }
        .ns-dropzone {
          border: 1px dashed rgba(255, 255, 255, 0.2); border-radius: 12px; height: 145px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
          cursor: pointer;
        }
        .ns-drop-text { font-size: 14px; color: rgba(255, 255, 255, 0.6); }
        .ns-media-preview { display: flex; gap: 12px; }
        .ns-media-item {
          flex: 1; height: 100px; border-radius: 8px; background-size: cover; background-position: center;
        }

        /* Wave Notes Card */
        .ns-notes-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; padding: 32px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .ns-notes-list { display: flex; flex-direction: column; gap: 12px; }
        .ns-note-item { display: flex; align-items: center; gap: 12px; cursor: pointer; height: 21px; }
        .ns-checkbox {
          width: 20px; height: 20px; border: 1px solid #0D9488; border-radius: 4px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .ns-note-label { font-size: 14px; color: #000; }
      `}</style>
    </div>
  );
};

export default NewSession;
