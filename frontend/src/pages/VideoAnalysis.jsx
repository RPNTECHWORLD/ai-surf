import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEFAULT_CLIPS = [
  { 
    id: 1, 
    name: 'Clip 1', 
    waveName: 'Demo Surfing Video', 
    startTime: 0, 
    duration: '0:15',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-surfer-riding-a-wave-in-the-sea-39828-large.mp4', 
    bg: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80',
    isSessionClip: true
  }
];

const ATHLETE_PALETTE = ['#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6'];

const generateAthleteProfile = (name, index = 0, level = 'Athlete') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const baseScore = 72 + Math.abs(hash % 22);
  const takeoff = Math.min(96, Math.max(68, baseScore + (hash % 6)));
  const positioning = Math.min(96, Math.max(65, baseScore - ((hash >> 2) % 7)));
  const balance = Math.min(98, Math.max(70, baseScore + ((hash >> 4) % 8)));
  const waveReading = Math.min(95, Math.max(64, baseScore - ((hash >> 6) % 9)));

  return {
    id: `surfer_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${index}`,
    name,
    level,
    color: ATHLETE_PALETTE[index % ATHLETE_PALETTE.length],
    score: baseScore,
    skills: {
      takeoff,
      positioning,
      balance,
      waveReading
    }
  };
};

// Helper to get real video duration in seconds from video URL
const getVideoDuration = (videoUrl) => {
  return new Promise((resolve) => {
    if (!videoUrl || videoUrl.includes('ForBigger') || videoUrl.includes('gtv-videos') || videoUrl.includes('BigBuck')) {
      resolve(0);
      return;
    }
    try {
      const vid = document.createElement('video');
      vid.src = videoUrl;
      vid.preload = 'metadata';
      vid.crossOrigin = 'anonymous';

      let resolved = false;
      const finish = (dur) => {
        if (!resolved) {
          resolved = true;
          try {
            vid.removeAttribute('src');
            vid.load();
          } catch (e) {}
          resolve(dur || 0);
        }
      };

      vid.onloadedmetadata = () => {
        finish(vid.duration || 0);
      };
      vid.onerror = () => finish(0);
      setTimeout(() => finish(0), 4000);
    } catch (e) {
      resolve(0);
    }
  });
};

const formatDurationString = (seconds) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper to capture dynamic thumbnail image from video element using Canvas
const captureVideoThumbnail = (videoUrl, seekTime = 1) => {
  return new Promise((resolve) => {
    if (!videoUrl || videoUrl.includes('ForBigger') || videoUrl.includes('gtv-videos') || videoUrl.includes('BigBuck')) {
      resolve('');
      return;
    }
    try {
      const vid = document.createElement('video');
      vid.src = videoUrl;
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.preload = 'auto';

      let resolved = false;
      const finish = (result) => {
        if (!resolved) {
          resolved = true;
          try {
            vid.removeAttribute('src');
            vid.load();
          } catch (e) {}
          resolve(result || '');
        }
      };

      vid.addEventListener('loadeddata', () => {
        try {
          const target = Math.max(0.2, seekTime);
          vid.currentTime = target;
        } catch (e) {
          finish('');
        }
      }, { once: true });

      vid.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 225;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          finish(dataUrl);
        } catch (e) {
          finish('');
        }
      }, { once: true });

      vid.addEventListener('error', () => finish(''), { once: true });
      setTimeout(() => finish(''), 4000);
    } catch (err) {
      resolve('');
    }
  });
};

// Helper to extract 3 distinct thumbnails at proportional timestamps (10%, 45%, 80%) from the video
const extractMultiClipThumbnails = (videoUrl) => {
  return new Promise((resolve) => {
    if (!videoUrl || videoUrl.includes('ForBigger') || videoUrl.includes('gtv-videos') || videoUrl.includes('BigBuck')) {
      resolve([null, null, null]);
      return;
    }
    try {
      const vid = document.createElement('video');
      vid.src = videoUrl;
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.preload = 'auto';

      let resolved = false;
      const finish = (thumbs) => {
        if (!resolved) {
          resolved = true;
          try {
            vid.removeAttribute('src');
            vid.load();
          } catch (e) {}
          resolve(thumbs);
        }
      };

      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 225;
      const ctx = canvas.getContext('2d');

      const captureCurrentFrame = () => {
        try {
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.85);
        } catch (e) {
          return null;
        }
      };

      vid.onloadedmetadata = () => {
        try {
          const dur = vid.duration || 30;
          const t1 = Math.max(0.5, Math.min(1.5, dur * 0.08));
          const t2 = Math.max(t1 + 1.5, Math.min(dur * 0.45, dur - 1.5));
          const t3 = Math.max(t2 + 1.5, Math.min(dur * 0.82, dur - 0.5));

          const times = [t1, t2, t3];
          const results = [null, null, null];
          let currentIndex = 0;

          const onSeeked = () => {
            results[currentIndex] = captureCurrentFrame();
            currentIndex++;
            if (currentIndex < times.length) {
              vid.currentTime = times[currentIndex];
            } else {
              vid.removeEventListener('seeked', onSeeked);
              finish(results);
            }
          };

          vid.addEventListener('seeked', onSeeked);
          vid.currentTime = times[0];
        } catch (err) {
          finish([null, null, null]);
        }
      };

      vid.onerror = () => finish([null, null, null]);
      setTimeout(() => finish([null, null, null]), 6000);
    } catch (err) {
      resolve([null, null, null]);
    }
  });
};

const VideoAnalysis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialVideoUrl = searchParams.get('video');
  const studentName = searchParams.get('student') || 'Chloe Kim';
  const sessionDate = searchParams.get('date') || '12 Jun 2025';

  // Tagged Surfers in this Video (Real Athletes only)
  const [availableSurfers, setAvailableSurfers] = useState([]);
  const [taggedSurfers, setTaggedSurfers] = useState([]);
  const [activeSurferId, setActiveSurferId] = useState('');
  const [isSurferDropdownOpen, setIsSurferDropdownOpen] = useState(false);
  const surferDropdownRef = useRef(null);

  // Load ONLY real athletes present in this specific group or session
  useEffect(() => {
    let rawNames = [];

    // 1. From URL athletes query param
    const athletesParam = searchParams.get('athletes') || searchParams.get('students');
    if (athletesParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(athletesParam));
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawNames = parsed.filter(Boolean);
        }
      } catch (e) {
        if (athletesParam.includes(',')) {
          rawNames = athletesParam.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    const normalizeDateStr = (d) => {
      if (!d) return '';
      const s = String(d).trim().toLowerCase();
      const clean = s.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)[,\s]*/i, '').trim();
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      }
      return clean;
    };

    const loadRealAthletes = async () => {
      // 2. Fetch from backend /api/sessions for this session/group if URL didn't provide athletes list
      if (rawNames.length === 0) {
        try {
          const res = await fetch(`${API}/api/sessions`);
          if (res.ok) {
            const sessions = await res.json();
            const targetISO = normalizeDateStr(sessionDate);

            const matching = sessions.filter(s => {
              const grpName = s.group_name || (s.notes && s.notes.includes(' - Automated') ? s.notes.split(' - Automated')[0].trim() : (s.notes || ''));
              const sISO = normalizeDateStr(s.date);
              
              const dateMatch = !targetISO || !sISO || sISO === targetISO || s.date === sessionDate || (s.date && sessionDate && (s.date.includes(sessionDate) || sessionDate.includes(s.date)));
              
              const groupMatch = (grpName && studentName && (
                grpName.toLowerCase() === studentName.toLowerCase() ||
                grpName.toLowerCase().includes(studentName.toLowerCase()) ||
                studentName.toLowerCase().includes(grpName.toLowerCase())
              ));

              const studentMatch = s.student && studentName && s.student.toLowerCase() === studentName.toLowerCase();

              return (groupMatch || studentMatch) && dateMatch;
            });

            const groupAthletes = matching.map(s => s.student).filter(Boolean);
            if (groupAthletes.length > 0) {
              rawNames = Array.from(new Set(groupAthletes));
            }
          }
        } catch (err) {
          console.warn('Failed to load group session athletes', err);
        }
      }

      // If single student session or group name fallback
      if (rawNames.length === 0) {
        rawNames = [studentName];
      }

      const profiles = rawNames.map((n, i) => generateAthleteProfile(n, i));
      setAvailableSurfers(profiles);
      setTaggedSurfers(profiles);
      setActiveSurferId(profiles[0]?.id || '');
    };

    loadRealAthletes();
  }, [studentName, sessionDate, searchParams]);

  // Derive active surfer details for score/skills
  const currentActiveSurfer = useMemo(() => {
    return taggedSurfers.find(s => s.id === activeSurferId) || taggedSurfers[0] || (availableSurfers[0] || { name: studentName, score: 78, skills: { takeoff: 82, positioning: 71, balance: 85, waveReading: 68 } });
  }, [taggedSurfers, activeSurferId, availableSurfers, studentName]);

  // Handle outside clicks for surfer dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (surferDropdownRef.current && !surferDropdownRef.current.contains(e.target)) {
        setIsSurferDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSurfer = (surfer) => {
    setTaggedSurfers(prev => {
      const exists = prev.some(s => s.id === surfer.id);
      if (exists) {
        if (prev.length <= 1) return prev; // Always keep at least 1 surfer
        const filtered = prev.filter(s => s.id !== surfer.id);
        if (activeSurferId === surfer.id) {
          setActiveSurferId(filtered[0]?.id || '');
        }
        return filtered;
      } else {
        const next = [...prev, surfer];
        setActiveSurferId(surfer.id);
        return next;
      }
    });
  };

  // Dynamic Clips State
  const [clips, setClips] = useState(DEFAULT_CLIPS);
  const [currentClip, setCurrentClip] = useState(DEFAULT_CLIPS[0]);
  const [isUploadingClip, setIsUploadingClip] = useState(false);
  const [targetClipIdForUpload, setTargetClipIdForUpload] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const currentStrokeRef = useRef(null);
  const fileInputRef = useRef(null);
  const targetFileInputRef = useRef(null);
  const addClipInputRef = useRef(null);

  // Video Player Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Drawing Canvas Annotation State
  const [tool, setTool] = useState('select'); // 'select' | 'pen' | 'eraser'
  const [color, setColor] = useState('#F43F5E');
  const [lineWidth, setLineWidth] = useState(4);
  const [strokes, setStrokes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeMarkerColor, setActiveMarkerColor] = useState(null);

  // Group strokes into clean individual markers for the timeline
  const momentMarkers = useMemo(() => {
    const map = new Map();
    strokes
      .filter(s => s.tool !== 'eraser' && (s.clipId === undefined || s.clipId === currentClip.id))
      .forEach(s => {
        const timeKey = Math.round((s.timestamp || 0) * 10) / 10;
        const key = `${timeKey}_${s.color}`;
        if (!map.has(key)) {
          map.set(key, {
            timestamp: s.timestamp || 0,
            color: s.color,
            key
          });
        }
      });
    return Array.from(map.values());
  }, [strokes, currentClip]);

  // Parse multiple video URLs from query string or payload
  const parseVideoUrls = (rawUrl) => {
    if (!rawUrl) return [];
    let str = String(rawUrl).trim();
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(p => typeof p === 'string' ? p : (p?.url || '')).filter(Boolean);
        }
      } catch (e) {}
    }
    if (str.includes('|||')) {
      return str.split('|||').map(s => s.trim()).filter(Boolean);
    }
    if (str.includes('%5B') || str.includes('%7B')) {
      try {
        const decoded = decodeURIComponent(str);
        if (decoded.startsWith('[') || decoded.startsWith('{')) {
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(p => typeof p === 'string' ? p : (p?.url || '')).filter(Boolean);
          }
          if (parsed?.url) return [parsed.url];
        }
      } catch (e) {}
    }
    return [str];
  };

  // Helper to extract a clean single video URL string from various formats
  const extractValidVideoUrl = (rawUrl) => {
    const parsedList = parseVideoUrls(rawUrl);
    return parsedList[0] || '';
  };

  // Load actual videos into individual clips (1 uploaded video = 1 distinct clip)
  const loadVideosIntoClips = async (videoInput, label = '') => {
    const urls = parseVideoUrls(videoInput);
    const validUrls = urls.filter(u => u && !u.includes('ForBigger') && !u.includes('gtv-videos'));
    const finalUrls = validUrls.length > 0 ? validUrls : ['https://assets.mixkit.co/videos/preview/mixkit-surfer-riding-a-wave-in-the-sea-39828-large.mp4'];

    const newClips = finalUrls.map((url, idx) => ({
      id: idx + 1,
      name: `Clip ${idx + 1}`,
      waveName: label || (finalUrls.length === 1 ? 'Session Video' : `Session Clip ${idx + 1}`),
      startTime: 0,
      duration: '0:00',
      url,
      bg: '',
      isSessionClip: true
    }));

    setClips(newClips);
    setCurrentClip(newClips[0]);

    try {
      const [thumbs, durations] = await Promise.all([
        Promise.all(finalUrls.map(u => captureVideoThumbnail(u, 1))),
        Promise.all(finalUrls.map(u => getVideoDuration(u)))
      ]);

      setClips(prev => prev.map((c, i) => ({
        ...c,
        bg: thumbs[i] || c.bg,
        duration: durations[i] > 0 ? formatDurationString(durations[i]) : '0:00',
        realDuration: durations[i] || 0
      })));
    } catch (err) {
      console.warn('Clip media extraction failed', err);
    }
  };

  // Synchronize on mount if query param contains video URL(s)
  useEffect(() => {
    if (initialVideoUrl) {
      loadVideosIntoClips(initialVideoUrl);
    }
  }, [initialVideoUrl]);

  // Handle uploading video file from local device
  const handleUploadVideoFile = async (e, targetClipId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingClip(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      let videoUrl = '';
      try {
        const res = await fetch(`${API}/api/upload-video`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          videoUrl = data.video_url;
        }
      } catch (err) {
        console.warn('Backend upload skipped, using local URL', err);
      }

      if (!videoUrl) {
        videoUrl = URL.createObjectURL(file);
      }

      if (targetClipId) {
        // Update single clip slot with thumbnail & real duration
        const [thumb, actualDur] = await Promise.all([
          captureVideoThumbnail(videoUrl, 1),
          getVideoDuration(videoUrl)
        ]);
        const formattedDur = actualDur > 0 ? formatDurationString(actualDur) : '0:00';
        setClips(prev => prev.map(c => c.id === targetClipId ? { ...c, url: videoUrl, bg: thumb || c.bg, duration: formattedDur, realDuration: actualDur } : c));
        setCurrentClip(prev => prev.id === targetClipId ? { ...prev, url: videoUrl, bg: thumb || prev.bg, duration: formattedDur, realDuration: actualDur } : prev);
      } else {
        await loadVideosIntoClips(videoUrl, file.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (err) {
      console.error('Video upload error:', err);
    } finally {
      setIsUploadingClip(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (targetFileInputRef.current) targetFileInputRef.current.value = '';
    }
  };

  // Handle adding an entirely new video as a new clip (appending to list)
  const handleAddNewVideoClip = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingClip(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      let videoUrl = '';
      try {
        const res = await fetch(`${API}/api/upload-video`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          videoUrl = data.video_url;
        }
      } catch (err) {
        console.warn('Backend upload skipped, using local URL', err);
      }

      if (!videoUrl) {
        videoUrl = URL.createObjectURL(file);
      }

      const [thumb, actualDur] = await Promise.all([
        captureVideoThumbnail(videoUrl, 1),
        getVideoDuration(videoUrl)
      ]);
      const cleanFileName = file.name.replace(/\.[^/.]+$/, "");
      const formattedDur = actualDur > 0 ? formatDurationString(actualDur) : '0:00';

      // If only default placeholder demo video is currently loaded, replace it with this first real video
      const isOnlyDemoPlaceholder = clips.length === 1 && (clips[0].url.includes('mixkit-surfer-riding-a-wave') || clips[0].waveName.includes('Demo'));

      // Count how many uploaded (non-session) videos already exist
      const uploadedCount = clips.filter(c => c.isSessionClip === false).length;

      if (isOnlyDemoPlaceholder) {
        const newVideo = {
          id: 1,
          name: 'Video 1',
          waveName: cleanFileName || 'Uploaded Video 1',
          startTime: 0,
          duration: formattedDur,
          realDuration: actualDur,
          url: videoUrl,
          bg: thumb || '',
          isSessionClip: false
        };
        setClips([newVideo]);
        handleSelectClip(newVideo);
      } else {
        const nextUploadedNum = uploadedCount + 1;
        const nextId = clips.length + 1;
        const newVideo = {
          id: nextId,
          name: `Video ${nextUploadedNum}`,
          waveName: cleanFileName || `Uploaded Video ${nextUploadedNum}`,
          startTime: 0,
          duration: formattedDur,
          realDuration: actualDur,
          url: videoUrl,
          bg: thumb || '',
          isSessionClip: false
        };
        setClips(prev => [...prev, newVideo]);
        handleSelectClip(newVideo);
      }
    } catch (err) {
      console.error('Add new video error:', err);
    } finally {
      setIsUploadingClip(false);
      if (addClipInputRef.current) addClipInputRef.current.value = '';
    }
  };

  // Next / Previous Video Switchers
  const handleNextClip = () => {
    if (clips.length <= 1) return;
    const currentIndex = clips.findIndex(c => c.id === currentClip.id);
    const nextIndex = (currentIndex + 1) % clips.length;
    handleSelectClip(clips[nextIndex]);
  };

  const handlePrevClip = () => {
    if (clips.length <= 1) return;
    const currentIndex = clips.findIndex(c => c.id === currentClip.id);
    const prevIndex = (currentIndex - 1 + clips.length) % clips.length;
    handleSelectClip(clips[prevIndex]);
  };

  const handleDeleteClip = (clipId) => {
    const filtered = clips.filter(c => c.id !== clipId);
    if (filtered.length === 0) {
      setClips(DEFAULT_CLIPS);
      handleSelectClip(DEFAULT_CLIPS[0]);
    } else {
      const reindexed = filtered.map((c, idx) => ({
        ...c,
        id: idx + 1,
        name: `Video ${idx + 1}`
      }));
      setClips(reindexed);
      if (currentClip.id === clipId) {
        handleSelectClip(reindexed[0]);
      }
    }
  };

  // Handle switching active clip
  const handleSelectClip = (clip) => {
    setCurrentClip(clip);
    if (videoRef.current) {
      if (videoRef.current.src !== clip.url) {
        videoRef.current.src = clip.url;
      }
      const seekTarget = clip.startTime || 0;
      videoRef.current.currentTime = seekTarget;
      setCurrentTime(seekTarget);
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Redraw canvas drawings strictly for the clicked color
  const redraw = (targetColor = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // When video is actively playing, keep screen clear of drawings
    if (videoRef.current && !videoRef.current.paused) {
      return;
    }

    const colorFilter = targetColor !== null ? targetColor : activeMarkerColor;

    // Strictly show strokes for this clip matching the selected marker color
    const activeStrokes = strokes.filter(s => {
      if (s.clipId !== undefined && s.clipId !== currentClip.id) return false;
      if (colorFilter) {
        return s.color === colorFilter;
      }
      return true;
    });

    activeStrokes.forEach(stroke => {
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

  // Adjust canvas bounds on window resize without accidental canvas wipes
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const newW = Math.round(rect.width);
      const newH = Math.round(rect.height);
      if (newW > 0 && newH > 0 && (canvas.width !== newW || canvas.height !== newH)) {
        canvas.width = newW;
        canvas.height = newH;
      }
      redraw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const timer = setTimeout(resizeCanvas, 100);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(timer);
    };
  }, [strokes, currentClip, activeMarkerColor]);

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
      redraw();
    } else {
      // Clear drawings on play
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error("Playback failed", err));
    }
  };

  const handleSeekForward = () => {
    if (!videoRef.current) return;
    const nextTime = Math.min(duration, videoRef.current.currentTime + 10);
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    redraw(nextTime);
  };

  const handleSeekBackward = () => {
    if (!videoRef.current) return;
    const prevTime = Math.max(0, videoRef.current.currentTime - 10);
    videoRef.current.currentTime = prevTime;
    setCurrentTime(prevTime);
    redraw(prevTime);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      } else if (newVol === 0 && !isMuted) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (!videoRef.current.paused) {
      // While playing, keep drawings cleared
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      redraw(t);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
      setDuration(dur);
      const formatted = formatDurationString(dur);
      setClips(prev => prev.map(c => c.id === currentClip.id ? { ...c, duration: formatted, realDuration: dur } : c));
      setCurrentClip(prev => ({ ...prev, duration: formatted, realDuration: dur }));
    }

    if (currentClip?.url && (!clips[0]?.bg || !clips[1]?.bg || !clips[2]?.bg)) {
      extractMultiClipThumbnails(currentClip.url).then(([thumb1, thumb2, thumb3]) => {
        setClips(prev => prev.map(c => {
          if (c.id === 1 && thumb1) return { ...c, bg: thumb1 };
          if (c.id === 2 && thumb2) return { ...c, bg: thumb2 };
          if (c.id === 3 && thumb3) return { ...c, bg: thumb3 };
          return c;
        }));
      }).catch(() => {});
    }
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

    setActiveMarkerColor(color);

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
      timestamp: videoRef.current ? videoRef.current.currentTime : currentTime,
      clipId: currentClip.id,
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
            <div>
              <h1 className="va-title">AI Video Analysis — {studentName} — {sessionDate}</h1>
              
              {/* Multi-Surfer Tagging Dropdown & Badges */}
              <div className="va-surfer-tag-row">
                <span className="va-surfer-tag-label">
                  🏄 Tagged Surfers ({taggedSurfers.length}):
                </span>
                
                <div className="va-surfer-chips-wrap">
                  {taggedSurfers.map(surfer => {
                    const isSelected = activeSurferId === surfer.id;
                    return (
                      <button
                        key={surfer.id}
                        type="button"
                        className={`va-surfer-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => setActiveSurferId(surfer.id)}
                        title={`Click to view analysis for ${surfer.name}`}
                      >
                        <span className="va-surfer-dot" style={{ backgroundColor: surfer.color }}></span>
                        <span className="va-surfer-chip-name">{surfer.name}</span>
                        {taggedSurfers.length > 1 && (
                          <span 
                            className="va-surfer-chip-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSurfer(surfer);
                            }}
                            title={`Remove ${surfer.name} from this video`}
                          >
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Dropdown to add / tag more surfers */}
                  <div className="va-surfer-dropdown-box" ref={surferDropdownRef}>
                    <button
                      type="button"
                      className="va-tag-surfer-btn"
                      onClick={() => setIsSurferDropdownOpen(prev => !prev)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      Tag Surfer
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: isSurferDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>

                    {isSurferDropdownOpen && (
                      <div className="va-surfer-menu">
                        <div className="va-surfer-menu-title">Select Athletes in this Video</div>
                        <div className="va-surfer-menu-list">
                          {availableSurfers.map(surfer => {
                            const isTagged = taggedSurfers.some(s => s.id === surfer.id);
                            return (
                              <div
                                key={surfer.id}
                                className={`va-surfer-menu-item ${isTagged ? 'selected' : ''}`}
                                onClick={() => handleToggleSurfer(surfer)}
                              >
                                <div className={`va-checkbox ${isTagged ? 'checked' : ''}`}>
                                  {isTagged && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span className="va-surfer-menu-avatar" style={{ backgroundColor: surfer.color }}>
                                  {surfer.name.charAt(0)}
                                </span>
                                <div className="va-surfer-menu-info">
                                  <div className="va-surfer-menu-name">{surfer.name}</div>
                                  <div className="va-surfer-menu-sub">{surfer.level} • Avg {surfer.score}%</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="va-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="va-btn-report" onClick={() => navigate(`/sessions/report?student=${encodeURIComponent(currentActiveSurfer?.name || studentName)}&date=${encodeURIComponent(sessionDate)}`)}>
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
              {currentClip?.url && (
                <video 
                  key={currentClip.url}
                  ref={videoRef}
                  src={currentClip.url} 
                  autoPlay={false}
                  loop 
                  muted={isMuted} 
                  playsInline
                  preload="auto"
                  onPlay={() => {
                    setIsPlaying(true);
                    const canvas = canvasRef.current;
                    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    redraw();
                  }}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onError={(e) => {
                    console.warn('Video failed to load from primary source, falling back to guaranteed high-res wave clip:', currentClip?.url);
                    const fallbackUrl = 'https://assets.mixkit.co/videos/preview/mixkit-surfer-riding-a-wave-in-the-sea-39828-large.mp4';
                    if (currentClip?.url !== fallbackUrl) {
                      setCurrentClip(prev => ({ ...prev, url: fallbackUrl }));
                      setClips(prev => prev.map(c => ({ ...c, url: fallbackUrl })));
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000000', position: 'absolute', top: 0, left: 0, zIndex: 1 }} 
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
                    <button className={`va-color-dot ${color === '#F43F5E' ? 'active' : ''}`} style={{ backgroundColor: '#F43F5E' }} onClick={() => { setColor('#F43F5E'); setActiveMarkerColor('#F43F5E'); redraw('#F43F5E'); }} title="Red"></button>
                    <button className={`va-color-dot ${color === '#F59E0B' ? 'active' : ''}`} style={{ backgroundColor: '#F59E0B' }} onClick={() => { setColor('#F59E0B'); setActiveMarkerColor('#F59E0B'); redraw('#F59E0B'); }} title="Yellow / Orange"></button>
                    <button className={`va-color-dot ${color === '#3B82F6' ? 'active' : ''}`} style={{ backgroundColor: '#3B82F6' }} onClick={() => { setColor('#3B82F6'); setActiveMarkerColor('#3B82F6'); redraw('#3B82F6'); }} title="Blue"></button>
                    <button className={`va-color-dot ${color === '#10B981' ? 'active' : ''}`} style={{ backgroundColor: '#10B981' }} onClick={() => { setColor('#10B981'); setActiveMarkerColor('#10B981'); redraw('#10B981'); }} title="Green"></button>
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
                      {/* Dynamic Drawing Annotation Markers by Color */}
                      {momentMarkers.map((marker) => {
                        const pct = duration > 0 ? (marker.timestamp / duration) * 100 : 0;
                        const isSelected = activeMarkerColor === marker.color;
                        return (
                          <div
                            key={marker.key}
                            className={`va-progress-marker va-drawing-marker ${isSelected ? 'va-marker-selected' : ''}`}
                            style={{
                              left: `${pct}%`,
                              backgroundColor: marker.color || '#F43F5E',
                              boxShadow: `0 0 10px ${marker.color || '#F43F5E'}`,
                              transform: isSelected ? 'translateX(-50%) scale(1.4)' : 'translateX(-50%)',
                              zIndex: isSelected ? 8 : 6
                            }}
                            title={`Drawing Annotation at ${formatTime(marker.timestamp)} (${marker.color}) - Click to show this drawing only`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (videoRef.current) {
                                videoRef.current.currentTime = marker.timestamp;
                                setCurrentTime(marker.timestamp);
                                videoRef.current.pause();
                                setIsPlaying(false);
                                setActiveMarkerColor(marker.color);
                                setColor(marker.color);
                                setTimeout(() => redraw(marker.color), 30);
                              }
                            }}
                          />
                        );
                      })}


                      
                      <div className="va-progress-fill" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                      <div className="va-progress-handle" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Playback Controls & Timings */}
                  <div className="va-playback-controls">
                    <button className="va-control-icon-btn" onClick={handlePrevClip} title="Switch to Previous Video / Clip (⏮)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                    </button>
                    <button className="va-control-icon-btn" onClick={handleSeekBackward} title="-10s">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
                    </button>
                    <button className="va-control-icon-btn va-play-btn" onClick={handlePlayPause}>
                      {isPlaying ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="4" x2="18" y2="20"></line><line x1="6" y1="4" x2="6" y2="20"></line></svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      )}
                    </button>
                    <button className="va-control-icon-btn" onClick={handleSeekForward} title="+10s">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                    </button>
                    <button className="va-control-icon-btn" onClick={handleNextClip} title="Switch to Next Video / Clip (⏭)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                    </button>
                    <span className="va-time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>

                    {/* Volume & Audio Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                      <button
                        type="button"
                        className="va-control-icon-btn"
                        onClick={toggleMute}
                        title={isMuted || volume === 0 ? "Unmute Sound" : "Mute Sound"}
                      >
                        {isMuted || volume === 0 ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <line x1="23" y1="9" x2="17" y2="15"></line>
                            <line x1="17" y1="9" x2="23" y2="15"></line>
                          </svg>
                        ) : volume < 0.5 ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                          </svg>
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                        style={{
                          width: '64px',
                          height: '4px',
                          accentColor: '#2DD4BF',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.2)',
                          borderRadius: '2px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden File Inputs for Full Video, Single Clip Replacement, and Adding New Clips */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleUploadVideoFile(e, null)}
            />
            <input
              ref={targetFileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleUploadVideoFile(e, targetClipIdForUpload)}
            />
            <input
              ref={addClipInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={handleAddNewVideoClip}
            />

            {/* Videos Section Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  🎥 Session Videos ({clips.length})
                </span>
                <span style={{ fontSize: '11px', background: 'rgba(13, 148, 136, 0.25)', color: '#2DD4BF', border: '1px solid rgba(45, 212, 191, 0.4)', padding: '1px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  Video {clips.findIndex(c => c.id === currentClip.id) + 1} of {clips.length} Active
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Fast Next / Prev Video Switching Controls */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    type="button"
                    onClick={handlePrevClip}
                    title="Switch to Previous Video"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#FFFFFF',
                      padding: '4px 8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ◀ Prev Video
                  </button>
                  <button
                    type="button"
                    onClick={handleNextClip}
                    title="Switch to Next Video"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#2DD4BF',
                      padding: '4px 8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Next Video ▶
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => addClipInputRef.current?.click()}
                  disabled={isUploadingClip}
                  style={{
                    background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  {isUploadingClip ? 'Uploading Video…' : '+ Upload Video'}
                </button>
              </div>
            </div>

            {/* Videos Carousel */}
            <div className="va-clips-row">
              {clips.map((clip, index) => {
                const fallbackImg = 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80';
                const effectiveBg = clip.bg && clip.bg.trim() !== '' ? clip.bg : fallbackImg;
                const isActive = currentClip.id === clip.id;

                // Show divider before first uploaded (non-session) clip only
                const prevClip = clips[index - 1];
                const showDivider = index > 0 && clip.isSessionClip === false && prevClip?.isSessionClip !== false;

                return (
                  <React.Fragment key={clip.id || index}>
                    {showDivider && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0 4px',
                        flexShrink: 0,
                        alignSelf: 'stretch'
                      }}>
                        <div style={{
                          width: '1.5px',
                          flex: 1,
                          background: 'linear-gradient(to bottom, transparent, rgba(45,212,191,0.5), transparent)',
                          borderRadius: '2px'
                        }} />
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 800,
                          color: '#2DD4BF',
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          opacity: 0.8,
                          padding: '4px 0'
                        }}>Uploaded</span>
                        <div style={{
                          width: '1.5px',
                          flex: 1,
                          background: 'linear-gradient(to bottom, transparent, rgba(45,212,191,0.5), transparent)',
                          borderRadius: '2px'
                        }} />
                      </div>
                    )}
                    <div 
                      className={`va-clip-item ${isActive ? 'va-clip-active' : ''}`}
                      onClick={() => handleSelectClip(clip)}
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(5, 11, 26, 0.25) 0%, rgba(5, 11, 26, 0.35) 45%, rgba(5, 11, 26, 0.95) 100%), url('${effectiveBg}')`,
                        ...(clip.isSessionClip === false ? { border: '1.5px solid rgba(45,212,191,0.35)' } : {})
                      }}
                    >
                      {/* Top Bar with Badge and Actions */}
                      <div className="va-clip-top-row">
                        <div className="va-clip-badge">
                          <span className="va-clip-badge-dot" style={{ backgroundColor: isActive ? '#2DD4BF' : 'rgba(255,255,255,0.45)' }}></span>
                          {clip.name}
                        </div>

                        <div style={{ display: 'flex', gap: '4px' }}>
                          {/* Quick Replace Video on Hover */}
                          <button
                            type="button"
                            className="va-clip-replace-btn"
                            title={`Upload and replace Video ${index + 1}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetClipIdForUpload(clip.id);
                              targetFileInputRef.current?.click();
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="17 8 12 3 7 8"/>
                              <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                          </button>

                          {/* Delete/Remove this video */}
                          {clips.length > 1 && (
                            <button
                              type="button"
                              className="va-clip-replace-btn"
                              title={`Remove Video ${index + 1}`}
                              style={{ color: '#F43F5E' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClip(clip.id);
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Center Hover Play Indicator */}
                      <div className="va-clip-play-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      </div>
                      
                      {/* Bottom Metadata */}
                      <div className="va-clip-bottom-info">
                        <div className="va-clip-wave-name" title={clip.waveName || `Video ${index + 1}`}>{clip.waveName || `Video ${index + 1}`}</div>
                        <div className="va-clip-duration-tag">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          <span>{clip.duration || '00:00'}</span>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Add New Video Slot */}
              <div
                className="va-clip-add-card"
                onClick={() => addClipInputRef.current?.click()}
                title="Upload another full session video"
              >
                <div className="va-clip-add-icon">+</div>
                <div className="va-clip-add-text">Upload Video</div>
                <div className="va-clip-add-subtext">Add another full video</div>
              </div>
            </div>
          </div>

          {/* Right Column (Analytics Panels) */}
          <div className="va-col-right">
            
            {/* Multi-Surfer Switcher Tab if more than 1 surfer tagged */}
            {taggedSurfers.length > 1 && (
              <div className="va-surfer-tabs-box">
                <div className="va-surfer-tabs-label">ANALYSIS METRICS FOR:</div>
                <div className="va-surfer-tabs">
                  {taggedSurfers.map(surfer => {
                    const isSelected = activeSurferId === surfer.id;
                    return (
                      <button
                        key={surfer.id}
                        type="button"
                        className={`va-surfer-tab-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setActiveSurferId(surfer.id)}
                      >
                        <span className="va-surfer-tab-dot" style={{ backgroundColor: surfer.color }}></span>
                        {surfer.name} ({surfer.score})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Score panel */}
            <div className="va-section">
              <div className="va-section-title">
                PERFORMANCE SCORE {taggedSurfers.length > 1 && `— ${currentActiveSurfer.name.toUpperCase()}`}
              </div>
              <div className="va-score-row">
                <span className="va-score-big">{currentActiveSurfer.score}</span>
                <span className="va-score-small">/ 100</span>
              </div>
            </div>

            {/* Skill Breakdown */}
            <div className="va-section">
              <div className="va-section-title">SKILL BREAKDOWN</div>
              
              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Take-off</span>
                  <span className="va-skill-pct">{currentActiveSurfer.skills?.takeoff || 82}%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: `${currentActiveSurfer.skills?.takeoff || 82}%` }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Positioning</span>
                  <span className="va-skill-pct">{currentActiveSurfer.skills?.positioning || 71}%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: `${currentActiveSurfer.skills?.positioning || 71}%` }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Balance</span>
                  <span className="va-skill-pct">{currentActiveSurfer.skills?.balance || 85}%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: `${currentActiveSurfer.skills?.balance || 85}%` }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Wave Reading</span>
                  <span className="va-skill-pct">{currentActiveSurfer.skills?.waveReading || 68}%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: `${currentActiveSurfer.skills?.waveReading || 68}%` }}></div>
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
        .va-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .va-header-left { display: flex; align-items: flex-start; gap: 16px; }
        .va-back-btn {
          width: 44px; height: 44px; background: rgba(255,255,255,0.07); border-radius: 50%;
          border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: background 0.2s;
          margin-top: 2px;
        }
        .va-back-btn:hover { background: rgba(255,255,255,0.15); }
        .va-title { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 6px 0; }
        
        /* Multi-Surfer Tagging Bar */
        .va-surfer-tag-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .va-surfer-tag-label {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.65);
          letter-spacing: 0.3px;
        }
        .va-surfer-chips-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .va-surfer-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          color: #E2E8F0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .va-surfer-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .va-surfer-chip.active {
          background: rgba(13, 148, 136, 0.25);
          border-color: #2DD4BF;
          color: #FFFFFF;
          box-shadow: 0 0 10px rgba(45, 212, 191, 0.25);
        }
        .va-surfer-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .va-surfer-chip-name {
          font-size: 12px;
        }
        .va-surfer-chip-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          margin-left: 2px;
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }
        .va-surfer-chip-remove:hover {
          color: #FFFFFF;
          background: rgba(244, 63, 94, 0.4);
        }

        /* Dropdown Container */
        .va-surfer-dropdown-box {
          position: relative;
        }
        .va-tag-surfer-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px dashed rgba(45, 212, 191, 0.6);
          border-radius: 20px;
          color: #2DD4BF;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .va-tag-surfer-btn:hover {
          background: rgba(45, 212, 191, 0.15);
          border-color: #2DD4BF;
        }

        /* Dropdown Menu */
        .va-surfer-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 260px;
          background: #0B132B;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
          z-index: 100;
          backdrop-filter: blur(14px);
        }
        .va-surfer-menu-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
          padding: 4px 8px 8px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 6px;
        }
        .va-surfer-menu-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 220px;
          overflow-y: auto;
        }
        .va-surfer-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .va-surfer-menu-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .va-surfer-menu-item.selected {
          background: rgba(13, 148, 136, 0.15);
        }
        .va-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.15s;
        }
        .va-checkbox.checked {
          background: #0D9488;
          border-color: #2DD4BF;
        }
        .va-surfer-menu-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #FFFFFF;
        }
        .va-surfer-menu-info {
          flex: 1;
          min-width: 0;
        }
        .va-surfer-menu-name {
          font-size: 13px;
          font-weight: 600;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .va-surfer-menu-sub {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
        }

        /* Right Panel Surfer Tabs */
        .va-surfer-tabs-box {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .va-surfer-tabs-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.8px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 6px;
        }
        .va-surfer-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .va-surfer-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .va-surfer-tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
        }
        .va-surfer-tab-btn.active {
          background: #0D9488;
          border-color: #2DD4BF;
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(13, 148, 136, 0.4);
        }
        .va-surfer-tab-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
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
        .va-layout { display: flex; gap: 24px; align-items: stretch; width: 100%; box-sizing: border-box; min-width: 0; }

        /* Left Column */
        .va-col-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; width: 100%; box-sizing: border-box; }
        
        .va-player-container {
          background-color: #000000;
          border-radius: 20px;
          aspect-ratio: 16/9; position: relative; overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.08);
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
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
        .va-progress-bar-container { flex: 1; position: relative; height: 18px; display: flex; align-items: center; cursor: pointer; }
        .va-progress-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.25); border-radius: 3px; position: relative; }
        .va-progress-fill { position: absolute; left: 0; top: 0; height: 100%; background: #0D9488; border-radius: 3px; }
        .va-progress-marker {
          position: absolute;
          top: -4px;
          width: 5px;
          height: 14px;
          border-radius: 2px;
          transform: translateX(-50%);
          z-index: 5;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .va-progress-marker:hover {
          transform: translateX(-50%) scaleY(1.4);
          filter: brightness(1.25);
        }
        .va-drawing-marker {
          width: 5px;
          height: 16px;
          top: -5px;
          border-radius: 2px;
          border: 1px solid rgba(255, 255, 255, 0.9);
          z-index: 6;
        }
        .va-progress-handle {
          position: absolute; top: -5px; width: 16px; height: 16px; background: #FFFFFF; border: 3px solid #0D9488;
          border-radius: 50%; transform: translateX(-50%);
          transition: transform 0.1s;
          z-index: 7;
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

        /* Clips Horizontal Carousel */
        .va-clips-row {
          display: flex;
          gap: 16px;
          align-items: stretch;
          width: 100%;
          box-sizing: border-box;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 6px 4px 14px 4px;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: #0D9488 rgba(255, 255, 255, 0.06);
        }
        .va-clips-row::-webkit-scrollbar {
          height: 6px;
        }
        .va-clips-row::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .va-clips-row::-webkit-scrollbar-thumb {
          background: #0D9488;
          border-radius: 4px;
        }
        .va-clips-row::-webkit-scrollbar-thumb:hover {
          background: #14B8A6;
        }

        .va-clip-item {
          flex: 0 0 240px;
          width: 240px;
          height: 135px;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-color: #0F172A;
          border-radius: 14px;
          border: 2px solid rgba(255, 255, 255, 0.14);
          position: relative;
          cursor: pointer;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 12px 14px;
          overflow: hidden;
          box-sizing: border-box;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        }
        .va-clip-item:hover {
          border-color: #0D9488;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.55), 0 0 12px rgba(13, 148, 136, 0.35);
        }
        .va-clip-item:hover .va-clip-replace-btn {
          opacity: 1; pointer-events: auto;
        }
        .va-clip-active {
          border: 2.5px solid #2DD4BF !important;
          box-shadow: 0 0 20px rgba(13, 148, 136, 0.65), 0 6px 16px rgba(0, 0, 0, 0.45);
          transform: translateY(-2px);
        }

        .va-clip-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          z-index: 2;
        }
        .va-clip-badge {
          background: rgba(5, 11, 26, 0.85);
          backdrop-filter: blur(8px);
          border-radius: 8px;
          padding: 3px 10px;
          font-size: 11px;
          color: #FFFFFF;
          font-weight: 800;
          border: 1px solid rgba(255, 255, 255, 0.2);
          letter-spacing: 0.3px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .va-clip-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .va-clip-play-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.85);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(13, 148, 136, 0.85);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          z-index: 2;
        }
        .va-clip-item:hover .va-clip-play-center {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }

        .va-clip-bottom-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 2;
        }
        .va-clip-wave-name {
          font-size: 12px;
          font-weight: 700;
          color: #FFFFFF;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .va-clip-duration-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 700;
          color: #2DD4BF;
          background: rgba(13, 148, 136, 0.3);
          border: 1px solid rgba(45, 212, 191, 0.4);
          padding: 2px 8px;
          border-radius: 6px;
          width: fit-content;
        }

        .va-clip-replace-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.88);
          border: 1px solid rgba(255,255,255,0.25);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s, transform 0.2s;
        }
        .va-clip-replace-btn:hover {
          background: #0D9488;
          transform: scale(1.1);
        }

        .va-clip-add-card {
          flex: 0 0 240px;
          width: 240px;
          height: 135px;
          border: 2px dashed rgba(45, 212, 191, 0.45);
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(13, 148, 136, 0.07);
          box-sizing: border-box;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
        }
        .va-clip-add-card:hover {
          border-color: #2DD4BF;
          background: rgba(13, 148, 136, 0.16);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 22px rgba(13, 148, 136, 0.25);
        }
        .va-clip-add-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(45, 212, 191, 0.16);
          color: #2DD4BF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          line-height: 1;
          transition: transform 0.25s ease, background 0.25s ease, color 0.25s ease;
        }
        .va-clip-add-card:hover .va-clip-add-icon {
          transform: scale(1.12) rotate(90deg);
          background: #0D9488;
          color: #FFFFFF;
        }
        .va-clip-add-text {
          font-size: 13px;
          font-weight: 700;
          color: #F1F5F9;
          letter-spacing: 0.2px;
        }
        .va-clip-add-subtext {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.55);
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
