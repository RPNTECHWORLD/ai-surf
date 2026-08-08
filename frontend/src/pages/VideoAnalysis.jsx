import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const CLIPS = [
  { id: 1, name: 'Clip 1', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', bg: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=400' },
  { id: 2, name: 'Clip 2', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', bg: 'https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&q=80&w=400' },
  { id: 3, name: 'Clip 3', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', bg: 'https://images.unsplash.com/photo-1518182170546-076616fd6738?auto=format&fit=crop&q=80&w=400' },
];

const VideoAnalysis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialVideoUrl = searchParams.get('video') || CLIPS[0].url;
  const studentName = searchParams.get('student') || 'Chloe Kim';
  const sessionDate = searchParams.get('date') || '12 Jun 2025';

  // Video State
  const foundClip = CLIPS.find(c => c.url === initialVideoUrl);
  const [currentClip, setCurrentClip] = useState(foundClip || { id: 99, name: 'Custom Video', url: initialVideoUrl, bg: '' });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Drawing State
  const [tool, setTool] = useState('pen'); // 'select' | 'pen' | 'eraser'
  const [color, setColor] = useState('#F43F5E'); // Default crimson red
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const currentStrokeRef = useRef(null);

  // Synchronize playback state on mount/src change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setStrokes([]);
  }, [currentClip]);

  // Redraw canvas drawings when strokes state changes or canvas resizes
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      if (!stroke || !stroke.points || stroke.points.length < 1) return;
      ctx.beginPath();
      
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.lineWidth * 6; // Eraser is thicker
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = stroke.lineWidth;
        ctx.strokeStyle = stroke.color;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  // Adjust canvas bounds on window resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Give browser a split second to settle layout before checking bounding rect
    const timer = setTimeout(resizeCanvas, 100);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(timer);
    };
  }, [strokes, currentClip]);

  // Video time format helper
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Video Control Handlers
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error("Playback failed", err));
    }
  };

  const handleSeekForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
  };

  const handleSeekBackward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleProgressBarClick = (e) => {
    if (!videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    const newTime = pct * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Drawing Canvas coordinates mapper
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support mouse or touch input
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    
    if (clientX === undefined || clientY === undefined) return { x: 0, y: 0 };

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Drawing Handlers
  const handleMouseDown = (e) => {
    if (tool === 'select') return;

    // Auto pause video on draw to allow accurate annotations
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lineWidth * 6;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    currentStrokeRef.current = {
      tool,
      color,
      lineWidth,
      points: [{ x, y }]
    };
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || tool === 'select') return;
    const canvas = canvasRef.current;
    if (!canvas || !currentStrokeRef.current) return;
    const ctx = canvas.getContext('2d');
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    currentStrokeRef.current.points.push({ x, y });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentStrokeRef.current) {
      const strokeToSave = currentStrokeRef.current;
      setStrokes(prev => [...prev, strokeToSave]);
    }
    setIsDrawing(false);
    currentStrokeRef.current = null;
  };

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
  };

  // Seek video and pause on clicking Key Moments
  const handleSeekToMoment = (timestampStr) => {
    if (!videoRef.current) return;
    const parts = timestampStr.split(':');
    if (parts.length === 2) {
      const seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="va-page">
      <Sidebar />
      <main className="va-main">
        {/* Header */}
        <header className="va-header">
          <div className="va-header-left">
            <button className="va-back-btn" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <h1 className="va-title">AI Video Analysis — {studentName} — {sessionDate}</h1>
          </div>
          <div className="va-header-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="va-btn-report" onClick={() => navigate(`/sessions/report?student=${encodeURIComponent(studentName)}&date=${encodeURIComponent(sessionDate)}`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              View Coaching Report
            </button>
            <button className="va-btn-export" onClick={() => window.print()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export PDF
            </button>
          </div>
        </header>

        {/* Layout */}
        <div className="va-layout">
          
          {/* Left Column (Player) */}
          <div className="va-col-left">
            {/* Main Player Container */}
            <div className="va-player-container">
              {currentClip.url && (
                <video 
                  ref={videoRef}
                  src={currentClip.url} 
                  autoPlay={false}
                  loop 
                  muted 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }} 
                />
              )}

              {/* HTML5 Canvas overlay for drawing */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                className="va-canvas"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 2,
                  cursor: tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
                  pointerEvents: tool === 'select' ? 'none' : 'auto'
                }}
              />

              {/* Drawing Annotation Toolbar */}
              <div className="va-drawing-toolbar">
                <button 
                  className={`va-drawing-btn ${tool === 'select' ? 'active' : ''}`} 
                  onClick={() => setTool('select')}
                  title="Playback / Cursor mode"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 3 3 16 8 11 13 21 16 19 11 10 16 10 3 3" /></svg>
                </button>
                <button 
                  className={`va-drawing-btn ${tool === 'pen' ? 'active' : ''}`} 
                  onClick={() => setTool('pen')}
                  title="Pen Draw mode"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                
                {/* Pen color selectors */}
                {tool === 'pen' && (
                  <div className="va-color-picker">
                    <button className={`va-color-dot ${color === '#F43F5E' ? 'active' : ''}`} style={{ backgroundColor: '#F43F5E' }} onClick={() => setColor('#F43F5E')} title="Red"></button>
                    <button className={`va-color-dot ${color === '#F59E0B' ? 'active' : ''}`} style={{ backgroundColor: '#F59E0B' }} onClick={() => setColor('#F59E0B')} title="Yellow"></button>
                    <button className={`va-color-dot ${color === '#3B82F6' ? 'active' : ''}`} style={{ backgroundColor: '#3B82F6' }} onClick={() => setColor('#3B82F6')} title="Blue"></button>
                    <button className={`va-color-dot ${color === '#10B981' ? 'active' : ''}`} style={{ backgroundColor: '#10B981' }} onClick={() => setColor('#10B981')} title="Green"></button>
                  </div>
                )}

                {/* Pen size selector */}
                {tool === 'pen' && (
                  <div className="va-size-picker">
                    <button className={`va-size-btn ${lineWidth === 2 ? 'active' : ''}`} onClick={() => setLineWidth(2)} title="Thin">1x</button>
                    <button className={`va-size-btn ${lineWidth === 4 ? 'active' : ''}`} onClick={() => setLineWidth(4)} title="Medium">2x</button>
                    <button className={`va-size-btn ${lineWidth === 8 ? 'active' : ''}`} onClick={() => setLineWidth(8)} title="Thick">4x</button>
                  </div>
                )}

                <button 
                  className={`va-drawing-btn ${tool === 'eraser' ? 'active' : ''}`} 
                  onClick={() => setTool('eraser')}
                  title="Eraser tool"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                </button>
                <button 
                  className="va-drawing-btn" 
                  onClick={handleUndo} 
                  disabled={strokes.length === 0} 
                  title="Undo last stroke"
                  style={{ opacity: strokes.length === 0 ? 0.4 : 1 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                </button>
                <button 
                  className="va-drawing-btn" 
                  onClick={handleClear} 
                  disabled={strokes.length === 0} 
                  title="Clear all drawings"
                  style={{ opacity: strokes.length === 0 ? 0.4 : 1 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>

              {/* Player Bottom Control Overlay */}
              <div className="va-player-overlay" style={{ zIndex: 10 }}>
                <div className="va-player-controls-row">
                  {/* Progress Bar */}
                  <div className="va-progress-bar-container" onClick={handleProgressBarClick}>
                    <div className="va-progress-bar-bg">
                      {/* Detected Key Moments indicators on timeline */}
                      <div className="va-progress-marker" style={{ left: '13.6%', backgroundColor: '#F43F5E' }} title="Late pop-up (0:34)"></div>
                      <div className="va-progress-marker" style={{ left: '28.8%', backgroundColor: '#F59E0B' }} title="Weight shifting (1:12)"></div>
                      <div className="va-progress-marker" style={{ left: '66%', backgroundColor: '#0D9488' }} title="Perfect stance (2:45)"></div>
                      
                      <div className="va-progress-fill" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                      <div className="va-progress-handle" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Playback Controls & Timings */}
                  <div className="va-playback-controls">
                    <button className="va-control-icon-btn" onClick={handlePlayPause}>
                      {isPlaying ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="4" x2="18" y2="20"></line><line x1="6" y1="4" x2="6" y2="20"></line></svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      )}
                    </button>
                    <button className="va-control-icon-btn" onClick={handleSeekBackward} title="-10s">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                    </button>
                    <button className="va-control-icon-btn" onClick={handleSeekForward} title="+10s">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                    </button>
                    <span className="va-time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clips Selector */}
            <div className="va-clips-row">
              {CLIPS.map(clip => (
                <div 
                  key={clip.id} 
                  className={`va-clip-item ${currentClip.id === clip.id ? 'va-clip-active' : ''}`}
                  onClick={() => setCurrentClip(clip)}
                  style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.3), rgba(0,0,0,0.1)), url('${clip.bg}')` }}
                >
                  <div className="va-clip-badge">{clip.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (Analytics Panels) */}
          <div className="va-col-right">
            
            {/* Score panel */}
            <div className="va-section">
              <div className="va-section-title">PERFORMANCE SCORE</div>
              <div className="va-score-row">
                <span className="va-score-big">78</span>
                <span className="va-score-small">/ 100</span>
              </div>
            </div>

            {/* Skill Breakdown */}
            <div className="va-section">
              <div className="va-section-title">SKILL BREAKDOWN</div>
              
              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Take-off</span>
                  <span className="va-skill-pct">82%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: '82%' }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Positioning</span>
                  <span className="va-skill-pct">71%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: '71%' }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Balance</span>
                  <span className="va-skill-pct">85%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Wave Reading</span>
                  <span className="va-skill-pct">68%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: '68%' }}></div>
                </div>
              </div>
            </div>

            {/* Key Moments - Click seeking functionality */}
            <div className="va-section" style={{ flex: 1 }}>
              <div className="va-section-title">DETECTED KEY MOMENTS (CLICK TO SEEK)</div>
              
              <div className="va-moments-list">
                <div className="va-moment-card" onClick={() => handleSeekToMoment('0:34')} title="Jump to 0:34">
                  <div className="va-moment-thumb" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=150')" }}></div>
                  <div className="va-moment-info">
                    <div className="va-moment-name">Late pop-up</div>
                    <div className="va-moment-time">Timestamp 0:34</div>
                  </div>
                  <div className="va-moment-dot" style={{ backgroundColor: '#F43F5E' }}></div>
                </div>

                <div className="va-moment-card" onClick={() => handleSeekToMoment('1:12')} title="Jump to 1:12">
                  <div className="va-moment-thumb" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&q=80&w=150')" }}></div>
                  <div className="va-moment-info">
                    <div className="va-moment-name">Weight shifting</div>
                    <div className="va-moment-time">Timestamp 1:12</div>
                  </div>
                  <div className="va-moment-dot" style={{ backgroundColor: '#F59E0B' }}></div>
                </div>

                <div className="va-moment-card" onClick={() => handleSeekToMoment('2:45')} title="Jump to 2:45">
                  <div className="va-moment-thumb" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518182170546-076616fd6738?auto=format&fit=crop&q=80&w=150')" }}></div>
                  <div className="va-moment-info">
                    <div className="va-moment-name">Perfect stance</div>
                    <div className="va-moment-time">Timestamp 2:45</div>
                  </div>
                  <div className="va-moment-dot" style={{ backgroundColor: '#0D9488' }}></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        .va-page { display: flex; min-height: 100vh; background: #050B1A !important; font-family: 'Instrument Sans', sans-serif; }
        .va-main { flex: 1; padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; background: #050B1A !important; }

        /* Global Header dark-mode overrides */
        .va-page .db-top-header {
          background: #050B1A !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        .va-page .db-logo-name {
          color: #FFFFFF !important;
        }
        .va-page .db-header-nav-item {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        .va-page .db-header-nav-item:hover {
          color: #FFFFFF !important;
        }
        .va-page .db-header-nav-item.active {
          color: #0D9488 !important;
        }
        .va-page .db-header-nav-item.active::after {
          background: #0D9488 !important;
        }
        .va-page .db-header-school-name {
          color: #FFFFFF !important;
        }
        .va-page .db-header-user-role {
          color: rgba(255, 255, 255, 0.4) !important;
        }
        .va-page .db-header-logout {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        .va-page .db-header-logout:hover {
          background: rgba(244, 63, 94, 0.15) !important;
          color: #F43F5E !important;
        }
        .va-page .db-mobile-toggle {
          color: #FFFFFF !important;
        }
        .va-page .db-mobile-menu {
          background: #050B1A !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4) !important;
        }
        .va-page .db-mobile-menu-item {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        .va-page .db-mobile-menu-item:hover, .va-page .db-mobile-menu-item.active {
          background: rgba(13, 148, 136, 0.1) !important;
          color: #0D9488 !important;
        }
        .va-page .db-mobile-menu-item.logout {
          border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #EF4444 !important;
        }

        /* Header */
        .va-header { display: flex; justify-content: space-between; align-items: center; }
        .va-header-left { display: flex; align-items: center; gap: 16px; }
        .va-back-btn {
          width: 44px; height: 44px; background: rgba(255,255,255,0.07); border-radius: 50%;
          border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: background 0.2s;
        }
        .va-back-btn:hover { background: rgba(255,255,255,0.15); }
        .va-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #FFFFFF; margin: 0; }
        .va-btn-report {
          padding: 8px 16px; background: #0D9488; border-radius: 8px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF;
          display: flex; align-items: center; gap: 8px; cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        .va-btn-report:hover { transform: translateY(-1px); background: #0F766E; }
        .va-btn-export {
          padding: 8px 16px; background: #F43F5E; border-radius: 8px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF;
          display: flex; align-items: center; gap: 8px; cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        .va-btn-export:hover { transform: translateY(-1px); background: #E11D48; }

        /* Layout */
        .va-layout { display: flex; gap: 32px; align-items: stretch; }

        /* Left Column */
        .va-col-left { flex: 1; display: flex; flex-direction: column; gap: 16px; }
        
        .va-player-container {
          background-color: #0F172A;
          border-radius: 24px;
          aspect-ratio: 16/9; position: relative; overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.05);
        }

        .va-canvas {
          background: transparent;
        }

        /* Drawing Toolbar */
        .va-drawing-toolbar {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 10;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .va-drawing-btn {
          width: 36px;
          height: 36px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .va-drawing-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #FFFFFF;
        }
        .va-drawing-btn.active {
          background: #0D9488;
          color: #FFFFFF;
        }

        /* Color Picker */
        .va-color-picker {
          display: flex;
          align-items: center;
          gap: 6px;
          border-left: 1px solid rgba(255,255,255,0.15);
          border-right: 1px solid rgba(255,255,255,0.15);
          padding: 0 10px;
        }
        .va-color-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
        }
        .va-color-dot:hover {
          transform: scale(1.2);
        }
        .va-color-dot.active {
          border-color: #FFFFFF;
          transform: scale(1.1);
        }

        /* Size Picker */
        .va-size-picker {
          display: flex;
          align-items: center;
          gap: 4px;
          border-right: 1px solid rgba(255,255,255,0.15);
          padding-right: 10px;
        }
        .va-size-btn {
          padding: 2px 6px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 4px;
          color: rgba(255,255,255,0.7);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .va-size-btn:hover, .va-size-btn.active {
          background: rgba(255,255,255,0.15);
          color: #FFFFFF;
          border-color: rgba(255,255,255,0.4);
        }

        .va-player-overlay {
          position: absolute; bottom: 0; left: 0; right: 0; height: 100px;
          display: flex; align-items: center; padding: 0 24px;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          pointer-events: auto;
        }
        .va-player-controls-row {
          width: 100%; display: flex; align-items: center; gap: 20px;
        }
        
        /* Progress Bar */
        .va-progress-bar-container { flex: 1; position: relative; height: 16px; display: flex; align-items: center; cursor: pointer; }
        .va-progress-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.25); border-radius: 3px; position: relative; }
        .va-progress-fill { position: absolute; left: 0; top: 0; height: 100%; background: #0D9488; border-radius: 3px; }
        .va-progress-marker { position: absolute; top: -3px; width: 4px; height: 12px; border-radius: 2px; }
        .va-progress-handle {
          position: absolute; top: -5px; width: 16px; height: 16px; background: #FFFFFF; border: 3px solid #0D9488;
          border-radius: 50%; transform: translateX(-50%);
          transition: transform 0.1s;
        }
        .va-progress-bar-container:hover .va-progress-handle {
          transform: translateX(-50%) scale(1.2);
        }

        /* Controls */
        .va-playback-controls { display: flex; align-items: center; gap: 20px; }
        .va-control-icon-btn {
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .va-control-icon-btn:hover {
          background: rgba(255,255,255,0.15);
        }
        .va-time-display { font-size: 15px; font-weight: 700; color: #FFFFFF; margin-left: 8px; }

        /* Clips */
        .va-clips-row { display: flex; gap: 16px; height: 140px; }
        .va-clip-item {
          flex: 1;
          background-size: cover; background-position: center; border-radius: 16px;
          border: 2px solid rgba(255,255,255,0.1); position: relative; cursor: pointer;
          transition: all 0.3s;
        }
        .va-clip-item:hover {
          border-color: rgba(255,255,255,0.4);
          transform: translateY(-2px);
        }
        .va-clip-active { border: 3px solid #0D9488; box-shadow: 0 0 15px rgba(13, 148, 136, 0.4); }
        .va-clip-badge {
          position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.65); border-radius: 6px;
          padding: 4px 8px; font-size: 11px; color: #FFFFFF; font-weight: 700;
        }

        /* Right Column (Analytics) */
        .va-col-right {
          width: 400px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px); border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 32px;
          flex-shrink: 0;
        }
        
        .va-section { display: flex; flex-direction: column; gap: 20px; }
        .va-section-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.5); letter-spacing: 1px; text-transform: uppercase; margin: 0; }
        
        /* Score */
        .va-score-row { display: flex; align-items: baseline; gap: 8px; }
        .va-score-big { font-family: 'Outfit', sans-serif; font-size: 48px; font-weight: 800; color: #FFFFFF; line-height: 1; }
        .va-score-small { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.4); }

        /* Skill Breakdown */
        .va-skill-row { display: flex; flex-direction: column; gap: 8px; }
        .va-skill-header { display: flex; justify-content: space-between; font-size: 14px; color: #FFFFFF; }
        .va-skill-pct { font-weight: 700; color: #0D9488; }
        .va-skill-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; }
        .va-skill-bar-fill { height: 100%; background: #0D9488; border-radius: 3px; }

        /* Key Moments */
        .va-moments-list { display: flex; flex-direction: column; gap: 12px; }
        .va-moment-card {
          background: rgba(255,255,255,0.02); border-radius: 12px; padding: 14px;
          display: flex; align-items: center; gap: 12px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.02);
          transition: all 0.2s;
        }
        .va-moment-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.1);
          transform: translateX(2px);
        }
        .va-moment-thumb { width: 60px; height: 40px; border-radius: 4px; background-size: cover; background-position: center; }
        .va-moment-info { flex: 1; display: flex; flex-direction: column; }
        .va-moment-name { font-size: 14px; font-weight: 700; color: #FFFFFF; }
        .va-moment-time { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; }
        .va-moment-dot { width: 8px; height: 8px; border-radius: 4px; flex-shrink: 0; }

        /* Responsive Layout Media Queries */
        @media (max-width: 1024px) {
          .va-main { padding: 20px; gap: 24px; }
          .va-layout { flex-direction: column; gap: 24px; }
          .va-col-right { width: 100%; }
          .va-title { font-size: 24px; }
        }

        @media (max-width: 768px) {
          .va-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .va-btn-export { width: 100%; justify-content: center; }
          
          /* Toolbar scale down for small screens */
          .va-drawing-toolbar {
            top: 10px;
            right: 10px;
            padding: 4px 8px;
            gap: 6px;
          }
          .va-drawing-btn {
            width: 30px;
            height: 30px;
          }
          .va-color-picker {
            padding: 0 6px;
            gap: 4px;
          }
          .va-color-dot {
            width: 14px;
            height: 14px;
          }
          .va-size-picker {
            padding-right: 6px;
            gap: 2px;
          }
          .va-size-btn {
            padding: 1px 4px;
            font-size: 9px;
          }
          .va-playback-controls {
            gap: 16px;
          }
          .va-time-display {
            font-size: 13px;
          }
          .va-clips-row {
            height: 100px;
            gap: 10px;
          }
          .va-clip-badge {
            top: 8px;
            left: 8px;
            font-size: 10px;
            padding: 2px 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoAnalysis;
