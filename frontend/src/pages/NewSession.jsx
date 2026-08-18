import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const NewSession = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [mediaFiles, setMediaFiles] = useState([
    'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=300',
    'https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&q=80&w=300'
  ]);
  const [uploading, setUploading] = useState(false);

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
        setMediaFiles(prev => [...prev, data.video_url]);
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

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const [form, setForm] = useState({
    date: todayStr,
    time: '08:30 AM',
    duration_mins: '90',
    location: 'Banzai Pipeline, North Shore, Oahu',
    condition: 'Moderate',
    type: 'Intermediate',
    student_id: '',
    instructor_id: '',
    status: 'Upcoming',
    notes: '',
  });

  const [checkedNotes, setCheckedNotes] = useState({
    leftBreak: true,
    offshoreWind: true,
    fastSections: true,
    highTide: true,
  });

  const toggleNote = (key) => {
    setCheckedNotes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetch(`${API}/api/students`).then(r => r.json()).then(setStudents).catch(() => {});
    fetch(`${API}/api/instructors`).then(r => r.json()).then(setInstructors).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetch(`${API}/api/sessions/${id}`)
        .then(r => r.json())
        .then(data => {
          setForm({
            date: data.date,
            time: data.time,
            duration_mins: String(data.duration_mins),
            location: data.location,
            condition: data.condition,
            type: data.type,
            student_id: String(data.student_id),
            instructor_id: String(data.instructor_id),
            status: data.status,
            notes: data.notes || '',
          });
          if (data.video_url) {
            setMediaFiles(prev => prev.includes(data.video_url) ? prev : [...prev, data.video_url]);
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
    if (!form.student_id || !form.instructor_id) {
      setError('Please select both a student and an instructor.');
      return;
    }
    setSaving(true);
    setError('');
    const uploadedVideo = mediaFiles.find(m => m.toLowerCase().endsWith('.mp4') || m.startsWith('blob:') || m.includes('#video') || m.includes('/uploads/')) || '';
    try {
      const url = isEdit ? `${API}/api/sessions/${id}` : `${API}/api/sessions`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          time: form.time,
          duration_mins: parseInt(form.duration_mins) || 60,
          student_id: parseInt(form.student_id),
          instructor_id: parseInt(form.instructor_id),
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
    } catch (err) {
      setError('Could not connect to backend. Is it running?');
    }
    setSaving(false);
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

            {/* Student & Instructor */}
            <div className="ns-form-row">
              <div className="ns-form-group">
                <label className="ns-label">STUDENT</label>
                <select
                  className="ns-select-box"
                  value={form.student_id}
                  onChange={e => setField('student_id', e.target.value)}
                >
                  <option value="">— Select student —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
                  ))}
                </select>
              </div>
              <div className="ns-form-group">
                <label className="ns-label">INSTRUCTOR</label>
                <select
                  className="ns-select-box"
                  value={form.instructor_id}
                  onChange={e => setField('instructor_id', e.target.value)}
                >
                  <option value="">— Select instructor —</option>
                  {instructors.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ns-form-row">
              <div className="ns-form-group">
                <label className="ns-label">DATE</label>
                <input
                  className="ns-input-box ns-real-input"
                  type="text"
                  value={form.date}
                  onChange={e => setField('date', e.target.value)}
                  placeholder="31 Jul 2026"
                />
              </div>
              <div className="ns-form-group">
                <label className="ns-label">START TIME</label>
                <input
                  className="ns-input-box ns-real-input"
                  type="text"
                  value={form.time}
                  onChange={e => setField('time', e.target.value)}
                  placeholder="08:30 AM"
                />
              </div>
              <div className="ns-form-group">
                <label className="ns-label">DURATION (min)</label>
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

              <div className="ns-media-preview">
                {mediaFiles.map((m, i) => {
                  const isVideo = m.toLowerCase().endsWith('.mp4') || m.toLowerCase().endsWith('.mov') || m.toLowerCase().endsWith('.avi') || m.toLowerCase().endsWith('.mkv') || m.includes('/uploads/') || m.includes('#video') || m.startsWith('blob:');
                  return (
                    <div 
                      key={i} 
                      className="ns-media-item" 
                      style={{ 
                        backgroundImage: isVideo ? 'none' : `url('${m}')`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isVideo ? '#000' : undefined,
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      {isVideo && (
                        <video 
                          src={m} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          muted 
                          loop 
                          playsInline 
                          onMouseOver={(e) => e.target.play()}
                          onMouseOut={(e) => e.target.pause()}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
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
