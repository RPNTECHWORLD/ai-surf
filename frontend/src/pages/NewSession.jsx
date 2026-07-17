import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const NewSession = () => {
  const navigate = useNavigate();
  const [selectedCondition, setSelectedCondition] = useState('Moderate');
  const [checkedNotes, setCheckedNotes] = useState({
    leftBreak: true,
    offshoreWind: true,
    fastSections: true,
    highTide: true
  });

  const toggleNote = (key) => {
    setCheckedNotes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="ns-page">
      <Sidebar />
      <main className="ns-main">
        {/* Header */}
        <header className="ns-header">
          <div>
            <h1 className="ns-title">New Session Log</h1>
            <p className="ns-sub">Document session metadata and wave conditions.</p>
          </div>
          <div className="ns-actions">
            <button className="ns-btn-cancel" onClick={() => navigate('/sessions')}>Cancel</button>
            <button className="ns-btn-save" onClick={() => navigate('/sessions')}>Save Session</button>
          </div>
        </header>

        {/* Layout */}
        <div className="ns-layout">
          {/* Left Column: Session Details */}
          <div className="ns-col-left">
            <h2 className="ns-section-title">Session Details</h2>
            
            <div className="ns-form-row">
              <div className="ns-form-group">
                <label className="ns-label">DATE</label>
                <div className="ns-input-box">12 Jun 2025</div>
              </div>
              <div className="ns-form-group">
                <label className="ns-label">START TIME</label>
                <div className="ns-input-box">08:30 AM</div>
              </div>
              <div className="ns-form-group">
                <label className="ns-label">DURATION</label>
                <div className="ns-input-box">90 Minutes</div>
              </div>
            </div>

            <div className="ns-form-group" style={{ marginTop: '8px' }}>
              <label className="ns-label">LOCATION</label>
              <div className="ns-input-box ns-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Banzai Pipeline, North Shore, Oahu
              </div>
            </div>

            <div className="ns-form-group" style={{ marginTop: '16px' }}>
              <label className="ns-label">WAVE CONDITIONS</label>
              <div className="ns-conditions-grid">
                
                <div 
                  className={`ns-cond-card ${selectedCondition === 'Easy' ? 'ns-cond-active-easy' : ''}`}
                  onClick={() => setSelectedCondition('Easy')}
                >
                  <div className="ns-cond-title" style={{ color: '#0D9488' }}>Easy</div>
                  <div className="ns-cond-desc">1-3ft, friendly</div>
                </div>

                <div 
                  className={`ns-cond-card ${selectedCondition === 'Moderate' ? 'ns-cond-active-moderate' : ''}`}
                  onClick={() => setSelectedCondition('Moderate')}
                >
                  <div className="ns-cond-title" style={{ color: '#F59E0B' }}>Moderate</div>
                  <div className="ns-cond-desc">4-6ft, consistent</div>
                </div>

                <div 
                  className={`ns-cond-card ${selectedCondition === 'Hard' ? 'ns-cond-active-hard' : ''}`}
                  onClick={() => setSelectedCondition('Hard')}
                >
                  <div className="ns-cond-title" style={{ color: '#F43F5E' }}>Hard</div>
                  <div className="ns-cond-desc">8ft+, extreme</div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column: Upload & Notes */}
          <div className="ns-col-right">
            
            {/* Upload Media Card */}
            <div className="ns-upload-card">
              <h2 className="ns-section-title" style={{ color: '#FFF' }}>Upload Media</h2>
              
              <div className="ns-dropzone">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <div className="ns-drop-text">Drop drone footage or photos here</div>
              </div>

              <div className="ns-media-preview">
                <div className="ns-media-item" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=300')" }}></div>
                <div className="ns-media-item" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&q=80&w=300')" }}></div>
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
        .ns-actions { display: flex; gap: 16px; }
        .ns-btn-cancel {
          padding: 12px 24px; background: #FFFFFF; border: 1px solid #050B1A; border-radius: 8px;
          font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #050B1A; cursor: pointer;
        }
        .ns-btn-save {
          padding: 12px 24px; background: #F43F5E; border: none; border-radius: 8px;
          font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #FFFFFF; cursor: pointer;
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

        .ns-conditions-grid { display: flex; gap: 16px; margin-top: 8px; }
        .ns-cond-card {
          flex: 1; background: #F8F6F2; border: 2px solid #E2E8F0; border-radius: 12px;
          padding: 20px; display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: all 0.2s;
        }
        .ns-cond-active-easy { background: #FFFFFF; border-color: #0D9488; }
        .ns-cond-active-moderate { background: #FFFFFF; border-color: #F59E0B; }
        .ns-cond-active-hard { background: #FFFFFF; border-color: #F43F5E; }
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
