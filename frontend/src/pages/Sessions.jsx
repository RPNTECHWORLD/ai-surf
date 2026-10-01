import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NewSession from './NewSession';
import CoachProfileModal from '../components/CoachProfileModal';

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

// Renders user-uploaded image if present; otherwise renders initials fallback
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

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: getAvatarColor(name),
        color: '#FFFFFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${Math.max(10, Math.floor(size * 0.4))}px`,
        letterSpacing: '0.5px',
        flexShrink: 0,
        userSelect: 'none',
        ...style
      }}
      title={name || ''}
    >
      {getInitials(name)}
    </div>
  );
};


const conditionColor = (c) => {
  if (c === 'Hard') return '#F43F5E';
  if (c === 'Easy') return '#0D9488';
  return '#F59E0B';
};

const normalizeToYYYYMMDD = (dVal) => {
  if (!dVal) return '';
  const str = String(dVal).trim();
  
  // Check YYYY-MM-DD prefix
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (yyyymmdd) {
    return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
  }
  
  // Check DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  
  // Parse via new Date() and extract LOCAL year, month, day to avoid UTC offset shift
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  return str;
};

const getTodayYYYYMMDD = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatCalendarLongDate = (isoStr) => {
  if (!isoStr) return '';
  const parts = String(isoStr).split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }
  return isoStr;
};

const parseTimeStrToMinutes = (t) => {
  if (!t) return null;
  const match = String(t).match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
};

const formatSessionStatus = (s, dateStr, timeStr, durationMins) => {
  let rawStatus = s;
  let rawDate = dateStr;
  let rawTime = timeStr;
  let rawDuration = durationMins;

  if (typeof s === 'object' && s !== null) {
    rawStatus = s.status;
    rawDate = s.date || dateStr;
    rawTime = s.time || timeStr;
    rawDuration = s.duration_mins !== undefined ? s.duration_mins : durationMins;
  }

  const str = String(rawStatus || '').trim();
  const lower = str.toLowerCase();
  
  // Explicitly completed stays Completed
  if (lower === 'completed') return 'Completed';
  // Explicitly cancelled stays Cancelled
  if (lower === 'cancelled') return 'Cancelled';
  // Explicitly pending for review
  if (lower === 'pending for review' || lower === 'pending review' || lower === 'pending_review') {
    return 'Pending for Review';
  }

  // Check if session scheduled date & time has ended
  if (rawDate) {
    const sessionISO = normalizeToYYYYMMDD(rawDate);
    const todayISO = getTodayYYYYMMDD();
    if (sessionISO) {
      if (sessionISO < todayISO) {
        // Scheduled date has already passed -> Session time finished, auto Pending for Review!
        return 'Pending for Review';
      } else if (sessionISO > todayISO) {
        // Future date -> Upcoming!
        return 'Upcoming';
      } else {
        // Session date is TODAY! Check time vs current clock:
        if (rawTime) {
          const timeParts = String(rawTime).split(/\s*(?:[-–—]|to)\s*/i);
          const startMins = parseTimeStrToMinutes(timeParts[0]);

          if (startMins !== null) {
            let endMins = null;
            if (timeParts.length >= 2) {
              endMins = parseTimeStrToMinutes(timeParts[1]);
            }
            if (endMins === null || endMins <= startMins) {
              const dur = Number(rawDuration) || 60;
              endMins = startMins + dur;
            }

            const now = new Date();
            const nowMins = now.getHours() * 60 + now.getMinutes();

            if (nowMins < startMins) {
              // Session start time is in future today -> Upcoming
              return 'Upcoming';
            } else if (nowMins >= endMins) {
              // Scheduled session time is finished -> Automatically Pending for Review!
              return 'Pending for Review';
            } else {
              // Right now in the middle of active session!
              return 'In Progress';
            }
          }
        }

        // Today with no parseable time
        if (lower === 'in progress' || lower === 'in_progress') return 'In Progress';
        return 'In Progress';
      }
    }
  }

  if (lower === 'in progress' || lower === 'pending' || lower === 'in_progress') return 'In Progress';
  return 'Upcoming';
};

const statusColor = (s, dateStr, timeStr, durationMins) => {
  const norm = formatSessionStatus(s, dateStr, timeStr, durationMins);
  if (norm === 'Upcoming') return '#0284C7';
  if (norm === 'Completed') return '#0D9488';
  if (norm === 'Pending for Review' || norm === 'Pending Review') return '#D97706';
  if (norm === 'IN PROGRESS' || norm === 'In Progress') return '#00D1B2';
  return '#00D1B2';
};

const statusBg = (s, dateStr, timeStr, durationMins) => {
  const norm = formatSessionStatus(s, dateStr, timeStr, durationMins);
  if (norm === 'Upcoming') return 'rgba(2, 132, 199, 0.12)';
  if (norm === 'Completed') return 'rgba(13, 148, 136, 0.12)';
  if (norm === 'Pending for Review' || norm === 'Pending Review') return 'rgba(217, 119, 6, 0.12)';
  if (norm === 'IN PROGRESS' || norm === 'In Progress') return 'rgba(0, 209, 178, 0.15)';
  return 'rgba(0, 209, 178, 0.15)';
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Sessions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // User Context for Role-Based Data Isolation
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const isStudent = currentUser?.role === 'athlete' || currentUser?.role === 'student' || currentUser?.role === 'user';
  const isCoach = currentUser?.role === 'coach';
  const currentStudentName = currentUser?.name || 'Eric Sheldon';
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

  const [allInstructorsList, setAllInstructorsList] = useState([]);
  const [allStudentsList, setAllStudentsList] = useState([]);

  const schoolLower = (activeSchoolName || '').toLowerCase().trim();
  const isSuperAdmin = currentUser?.role === 'superadmin' || schoolLower === 'super admin';
  const isAdminOrSuperAdmin = isSuperAdmin || currentUser?.role === 'admin' || currentUser?.role === 'school_admin' || currentUser?.role === 'schooladmin' || schoolLower === 'school admin';

  const isIndividualSurfer = (
    (currentUser?.school || currentUser?.school_name || '').toLowerCase().trim().includes('individual') ||
    (currentUser?.school || currentUser?.school_name || '').toLowerCase().trim().includes('freelance') ||
    currentUser?.is_individual === true ||
    schoolLower.includes('individual') ||
    schoolLower.includes('freelance')
  );

  const loggedInCoach = useMemo(() => {
    if (!allInstructorsList || allInstructorsList.length === 0) return null;
    return allInstructorsList.find(i => 
      (currentCoachId && (String(i.id) === String(currentCoachId) || parseInt(i.id) === parseInt(currentCoachId))) ||
      (currentCoachName && i.name && i.name.toLowerCase().trim() === currentCoachName.toLowerCase().trim())
    );
  }, [allInstructorsList, currentCoachId, currentCoachName]);

  const coachAffiliatedSchool = (loggedInCoach?.school || currentUser?.school || currentUser?.school_name || activeSchoolName || '').trim();
  const isCoachFreelance = isCoach && (
    coachAffiliatedSchool.toLowerCase() === 'individual / freelance coach' ||
    (currentUser?.school || '').toLowerCase().trim() === 'individual / freelance coach' ||
    isIndividualSurfer
  );

  // Only Individual/Freelance Surfers/Coaches and Admins can Schedule, Configure & Delete sessions.
  // School Coaches & School Students cannot schedule/configure/delete school sessions.
  const canManageSessions = Boolean(isAdminOrSuperAdmin || isIndividualSurfer || isCoachFreelance);

  // Filter States
  const [dateFilter, setDateFilter] = useState('');
  const [slotFilter, setSlotFilter] = useState('All');
  const [instructorFilter, setInstructorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Live clock tick to automatically transition expired sessions to 'Pending for Review' every 30s
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClockTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  
  // Schedule Session Popup Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(() => {
    const isNewAction = searchParams.get('action') === 'new_session' || searchParams.get('action') === 'schedule' || searchParams.get('new_session') === 'true';
    return Boolean(canManageSessions && isNewAction);
  });
  const [scheduleModalInitialDate, setScheduleModalInitialDate] = useState(null);

  // Edit Session Wizard State (uses the same NewSession modal)
  const [editSessionData, setEditSessionData] = useState(null); // null | hubSession object

  useEffect(() => {
    const isNewSessionAction = searchParams.get('action') === 'new_session' || searchParams.get('action') === 'schedule' || searchParams.get('new_session') === 'true';
    if (isNewSessionAction) {
      if (canManageSessions) {
        setShowScheduleModal(true);
      } else {
        // Clear unauthorized query parameters from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('action');
        newParams.delete('new_session');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, canManageSessions]);

  // Multi-Selection State for Bulk Actions
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);

  // Collapsible Group Rows State
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroupExpand = (key) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Group Video Modal State
  const [showGroupVideoModal, setShowGroupVideoModal] = useState(false);
  const [selectedGroupForVideo, setSelectedGroupForVideo] = useState(null);
  const [groupVideoInput, setGroupVideoInput] = useState('');
  const [selectedGroupFile, setSelectedGroupFile] = useState(null);
  const [isSavingGroupVideo, setIsSavingGroupVideo] = useState(false);
  // In-App Confirmation Modal & Toast Notification State (Replaces native browser confirm/alert)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDanger: true,
    onConfirm: null
  });

  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' | 'info' }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Coach Profile & Review Modal State
  const [selectedCoachForModal, setSelectedCoachForModal] = useState(null); // { id, name }

  const handleOpenCoachModal = (instName, instId, e) => {
    if (e) e.stopPropagation();
    if (!instName || instName === '—') return;
    setSelectedCoachForModal({
      id: instId || null,
      name: instName
    });
  };

  const renderCoachBadge = (instName, instId) => {
    if (!instName || instName === '—' || instName.trim() === '') {
      return <span style={{ color: '#94A3B8', fontSize: '13px', fontStyle: 'italic' }}>—</span>;
    }
    const initial = instName.charAt(0).toUpperCase();
    return (
      <button
        type="button"
        onClick={(e) => handleOpenCoachModal(instName, instId, e)}
        title={`Click to view coach ${instName}'s profile & submit a review`}
        style={{
          background: 'linear-gradient(135deg, #F0FDFA 0%, #E6FFFA 100%)',
          border: '1px solid #99F6E4',
          borderRadius: '20px',
          padding: '4px 10px 4px 5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 3px rgba(13, 148, 136, 0.08)',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.22)';
          e.currentTarget.style.borderColor = '#0D9488';
          e.currentTarget.style.background = '#CCFBF1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(13, 148, 136, 0.08)';
          e.currentTarget.style.borderColor = '#99F6E4';
          e.currentTarget.style.background = 'linear-gradient(135deg, #F0FDFA 0%, #E6FFFA 100%)';
        }}
      >
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: '0 2px 5px rgba(13, 148, 136, 0.3)'
        }}>
          {initial}
        </div>
        <span style={{
          color: '#0F766E',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '-0.2px'
        }}>
          {instName}
        </span>
        <span style={{
          fontSize: '10px',
          background: '#0D9488',
          color: '#FFFFFF',
          padding: '1px 6px',
          borderRadius: '10px',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          letterSpacing: '0.2px'
        }}>
          ★ Coach
        </span>
      </button>
    );
  };

  const handleGroupFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedGroupFile(file);
    const blobUrl = URL.createObjectURL(file);
    setGroupVideoInput(blobUrl);
  };

  const handleSaveGroupVideo = async () => {
    if (!selectedGroupForVideo || !groupVideoInput.trim()) return;
    setIsSavingGroupVideo(true);

    try {
      const targetVideoUrl = groupVideoInput.trim();
      const sessionIds = selectedGroupForVideo.sessions.map(s => s.id);

      // Update all sessions in group via API
      await Promise.all(
        sessionIds.map(id =>
          fetch(`${API}/api/sessions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_url: targetVideoUrl })
          }).catch(err => console.error('Failed updating session video', id, err))
        )
      );

      // Update local state for all sessions in this group
      setSessions(prev =>
        prev.map(s => {
          if (sessionIds.includes(s.id)) {
            return { ...s, video_url: targetVideoUrl };
          }
          return s;
        })
      );

      setShowGroupVideoModal(false);
      setSelectedGroupForVideo(null);
      setGroupVideoInput('');
    } catch (err) {
      console.error('Error saving group video:', err);
    } finally {
      setIsSavingGroupVideo(false);
    }
  };

  // Helper to parse multiple video URLs from session
  const parseSessionVideos = (videoUrlData, fallbackUrl = '') => {
    if (!videoUrlData && !fallbackUrl) return [];
    const raw = videoUrlData || fallbackUrl;
    if (Array.isArray(raw)) {
      return raw.map((v, i) => typeof v === 'string' ? { id: `vid-${i+1}`, url: v, title: `Wave Clip ${i+1}` } : { id: v.id || `vid-${i+1}`, url: v.url, title: v.title || `Wave Clip ${i+1}` });
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((v, i) => typeof v === 'string' ? { id: `vid-${i+1}`, url: v, title: `Wave Clip ${i+1}` } : { id: v.id || `vid-${i+1}`, url: v.url, title: v.title || `Wave Clip ${i+1}` });
          }
        } catch (e) {}
      }
      if (trimmed.includes('|||')) {
        return trimmed.split('|||').filter(Boolean).map((u, i) => ({ id: `vid-${i+1}`, url: u.trim(), title: `Wave Clip ${i+1}` }));
      }
      if (trimmed) {
        return [{ id: 'vid-1', url: trimmed, title: 'Wave Clip 1' }];
      }
    }
    return [];
  };

  // Helper to parse multiple image URLs from session
  const parseSessionImages = (imageUrlData, fallbackUrl = '') => {
    if (!imageUrlData && !fallbackUrl) return [];
    const raw = imageUrlData || fallbackUrl;
    if (Array.isArray(raw)) {
      return raw.map((v, i) => typeof v === 'string' ? { id: `img-${i+1}`, url: v, title: `Photo ${i+1}` } : { id: v.id || `img-${i+1}`, url: v.url, title: v.title || `Photo ${i+1}` });
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((v, i) => typeof v === 'string' ? { id: `img-${i+1}`, url: v, title: `Photo ${i+1}` } : { id: v.id || `img-${i+1}`, url: v.url, title: v.title || `Photo ${i+1}` });
          }
        } catch (e) {}
      }
      if (trimmed.includes('|||')) {
        return trimmed.split('|||').filter(Boolean).map((u, i) => ({ id: `img-${i+1}`, url: u.trim(), title: `Photo ${i+1}` }));
      }
      if (trimmed) {
        return [{ id: 'img-1', url: trimmed, title: 'Photo 1' }];
      }
    }
    return [];
  };

  // Detailed Session & Group Media Hub State
  const [selectedHubSession, setSelectedHubSession] = useState(null);
  const [hubActiveTab, setHubActiveTab] = useState('overview'); // 'overview' | 'video' | 'photos' | 'notes'
  const [hubVideos, setHubVideos] = useState([]); // Array of { id, url, title, uploadedAt }
  const [hubActiveVideoId, setHubActiveVideoId] = useState(null);
  const [hubNewVideoUrl, setHubNewVideoUrl] = useState('');
  const [hubImages, setHubImages] = useState([]); // Array of { id, url, title, uploadedAt }
  const [hubActiveImageId, setHubActiveImageId] = useState(null);
  const [hubImageUrl, setHubImageUrl] = useState('');
  const [hubNotes, setHubNotes] = useState('');
  const [hubStatus, setHubStatus] = useState('Upcoming');
  const [hubIsUploadingVideo, setHubIsUploadingVideo] = useState(false);
  const [hubIsUploadingImage, setHubIsUploadingImage] = useState(false);
  const [hubIsSaving, setHubIsSaving] = useState(false);
  const [hubSaveSuccess, setHubSaveSuccess] = useState(false);
  const [hubHasChanges, setHubHasChanges] = useState(false);
  const [hubZoomImage, setHubZoomImage] = useState(null);
  const hubVideoFileRef = useRef(null);
  const hubImageFileRef = useRef(null);

  const openSessionHub = (data, initialTab = 'overview') => {
    setSelectedHubSession(data);
    setHubActiveTab(initialTab);
    const videoSource = data.isGroup
      ? (data.video_urls || data.video_url || (data.sessions && data.sessions.find(s => s.video_url)?.video_url) || '')
      : (data.video_urls || data.video_url || '');
    const parsedVideos = parseSessionVideos(videoSource);
    setHubVideos(parsedVideos);
    setHubActiveVideoId(parsedVideos.length > 0 ? parsedVideos[0].id : null);
    setHubNewVideoUrl('');
    
    const imageSource = data.isGroup
      ? (data.image_urls || data.image_url || (data.sessions && data.sessions.find(s => s.image_url)?.image_url) || '')
      : (data.image_urls || data.image_url || '');
    const parsedImages = parseSessionImages(imageSource);
    setHubImages(parsedImages);
    setHubActiveImageId(parsedImages.length > 0 ? parsedImages[0].id : null);
    setHubImageUrl(parsedImages[0]?.url || data.image_url || '');

    setHubNotes(data.notes || '');
    const resolvedStatus = (data.status || '').toLowerCase().trim() === 'completed'
      ? 'Completed'
      : formatSessionStatus(data);
    setHubStatus(resolvedStatus);
    setHubSaveSuccess(false);
    setHubHasChanges(false);
  };

  const handleHubVideoUpload = async (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setHubIsUploadingVideo(true);
    try {
      const newUploadedVideos = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append('file', file);
        let uploadedUrl = '';
        try {
          const res = await fetch(`${API}/api/upload-video`, {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            uploadedUrl = data.video_url || data.url || URL.createObjectURL(file);
          } else {
            uploadedUrl = URL.createObjectURL(file);
          }
        } catch (e) {
          uploadedUrl = URL.createObjectURL(file);
        }

        const clipNum = hubVideos.length + i + 1;
        newUploadedVideos.push({
          id: `vid-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          url: uploadedUrl,
          title: file.name ? file.name.replace(/\.[^/.]+$/, "") : `Wave Clip ${clipNum}`,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      const combined = [...hubVideos, ...newUploadedVideos];
      setHubVideos(combined);
      if (!hubActiveVideoId && combined.length > 0) {
        setHubActiveVideoId(combined[0].id);
      }

      // Do NOT auto save: mark as modified so user explicitly clicks "Save Changes"
      setHubHasChanges(true);
      setHubSaveSuccess(false);
    } catch (err) {
      console.error('Video upload error:', err);
    } finally {
      setHubIsUploadingVideo(false);
      if (hubVideoFileRef.current) hubVideoFileRef.current.value = '';
    }
  };

  const handleDeleteHubVideo = (vidId) => {
    const remaining = hubVideos.filter(v => v.id !== vidId);
    setHubVideos(remaining);
    if (hubActiveVideoId === vidId) {
      setHubActiveVideoId(remaining.length > 0 ? remaining[0].id : null);
    }
    setHubHasChanges(true);
    setHubSaveSuccess(false);
  };

  const handleHubImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setHubIsUploadingImage(true);
    try {
      const newUploadedImages = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append('file', file);
        let uploadedUrl = '';
        try {
          const res = await fetch(`${API}/api/upload-image`, {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            uploadedUrl = data.image_url || data.url || URL.createObjectURL(file);
          } else {
            uploadedUrl = URL.createObjectURL(file);
          }
        } catch (e) {
          uploadedUrl = URL.createObjectURL(file);
        }

        const photoNum = hubImages.length + i + 1;
        newUploadedImages.push({
          id: `img-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          url: uploadedUrl,
          title: file.name ? file.name.replace(/\.[^/.]+$/, "") : `Photo ${photoNum}`,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      const combined = [...hubImages, ...newUploadedImages];
      setHubImages(combined);
      if (!hubActiveImageId && combined.length > 0) {
        setHubActiveImageId(combined[0].id);
      }
      setHubImageUrl(combined[0]?.url || '');
      setHubHasChanges(true);
      setHubSaveSuccess(false);
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      setHubIsUploadingImage(false);
      if (hubImageFileRef.current) hubImageFileRef.current.value = '';
    }
  };

  const handleDeleteHubImage = (imgId) => {
    const remaining = hubImages.filter(img => img.id !== imgId);
    setHubImages(remaining);
    if (hubActiveImageId === imgId) {
      setHubActiveImageId(remaining.length > 0 ? remaining[0].id : null);
    }
    setHubImageUrl(remaining.length > 0 ? remaining[0].url : '');
    setHubHasChanges(true);
    setHubSaveSuccess(false);
  };

  const handleHubStatusChange = async (newVal) => {
    if (!selectedHubSession) return;
    const isGroupSession = Boolean(selectedHubSession.isGroup);
    const sessionIds = (isGroupSession && selectedHubSession.sessions)
      ? selectedHubSession.sessions.map(s => s.id)
      : [selectedHubSession.id];

    const targetStatus = newVal === 'Completed' ? 'Completed' : 'Upcoming';
    setHubStatus(newVal);

    try {
      await Promise.all(
        sessionIds.map(id =>
          fetch(`${API}/api/sessions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus })
          })
        )
      );

      // Update parent sessions list
      setSessions(prev =>
        prev.map(s => {
          if (sessionIds.includes(s.id)) {
            return { ...s, status: targetStatus };
          }
          return s;
        })
      );

      // Update selectedHubSession
      setSelectedHubSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: targetStatus,
          sessions: prev.sessions ? prev.sessions.map(s => ({ ...s, status: targetStatus })) : prev.sessions
        };
      });

      if (newVal === 'Completed') {
        showToast('✓ Session marked as Completed!', 'success');
      } else {
        showToast('Session status reverted to automatic mode.', 'info');
      }
    } catch (err) {
      console.error('Error saving session status:', err);
      showToast('Failed to update status: ' + err.message, 'error');
    }
  };

  const handleSaveHubChanges = async () => {
    if (!selectedHubSession) return;
    setHubIsSaving(true);
    try {
      const isGroupSession = Boolean(selectedHubSession.isGroup);
      const sessionIds = (isGroupSession && selectedHubSession.sessions)
        ? selectedHubSession.sessions.map(s => s.id)
        : [selectedHubSession.id];
      const serializedVideoUrl = hubVideos.length === 1
        ? hubVideos[0].url
        : (hubVideos.length > 1 ? JSON.stringify(hubVideos) : '');
      const primaryVideoUrl = hubVideos[0]?.url || '';

      const serializedImageUrl = hubImages.length === 1
        ? hubImages[0].url
        : (hubImages.length > 1 ? JSON.stringify(hubImages.map(img => img.url)) : (hubImageUrl || ''));
      const primaryImageUrl = hubImages[0]?.url || hubImageUrl || '';

      const payload = {
        status: hubStatus,
        notes: hubNotes,
        video_url: serializedVideoUrl || primaryVideoUrl,
        image_url: serializedImageUrl || primaryImageUrl,
      };

      await Promise.all(
        sessionIds.map(id =>
          fetch(`${API}/api/sessions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(err => console.error('Failed updating session', id, err))
        )
      );

      // Update local sessions state
      setSessions(prev =>
        prev.map(s => {
          if (sessionIds.includes(s.id)) {
            return {
              ...s,
              status: hubStatus,
              notes: hubNotes,
              video_url: serializedVideoUrl || primaryVideoUrl,
              video_urls: hubVideos,
              image_url: serializedImageUrl || primaryImageUrl,
              image_urls: hubImages,
            };
          }
          return s;
        })
      );

      // Update selectedHubSession
      setSelectedHubSession(prev => ({
        ...prev,
        status: hubStatus,
        notes: hubNotes,
        video_url: serializedVideoUrl || primaryVideoUrl,
        video_urls: hubVideos,
        image_url: serializedImageUrl || primaryImageUrl,
        image_urls: hubImages,
        sessions: prev.sessions ? prev.sessions.map(s => ({
          ...s,
          status: hubStatus,
          notes: hubNotes,
          video_url: serializedVideoUrl || primaryVideoUrl,
          video_urls: hubVideos,
          image_url: serializedImageUrl || primaryImageUrl,
          image_urls: hubImages,
        })) : [{
          ...prev,
          status: hubStatus,
          notes: hubNotes,
          video_url: serializedVideoUrl || primaryVideoUrl,
          video_urls: hubVideos,
          image_url: serializedImageUrl || primaryImageUrl,
          image_urls: hubImages,
        }]
      }));

      setHubSaveSuccess(true);
      setHubHasChanges(false);
      setTimeout(() => setHubSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving session updates:', err);
    } finally {
      setHubIsSaving(false);
    }
  };

  // Delete Handlers with In-App Confirmation
  const handleDeleteSingleSession = (sessionId, studentName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Session',
      message: `Are you sure you want to delete the session for ${studentName || 'this student'}?`,
      confirmText: 'Delete Session',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`${API}/api/sessions/${sessionId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete session');
          setSessions(prev => prev.filter(s => s.id !== sessionId));
          showToast('Session deleted successfully', 'success');
        } catch (err) {
          console.error('Delete session error:', err);
          showToast('Failed to delete session: ' + err.message, 'error');
        }
      }
    });
  };

  const handleDeleteGroupSessions = (groupObj) => {
    const count = groupObj.sessions?.length || 0;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${groupObj.groupName || 'Group'}`,
      message: `Are you sure you want to delete all ${count} sessions in "${groupObj.groupName}" on ${groupObj.date}?`,
      confirmText: 'Delete All Sessions',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await Promise.all(
            groupObj.sessions.map(s => fetch(`${API}/api/sessions/${s.id}`, { method: 'DELETE' }))
          );
          const sessionIdsToDelete = new Set(groupObj.sessions.map(s => s.id));
          setSessions(prev => prev.filter(s => !sessionIdsToDelete.has(s.id)));
          showToast(`Deleted all sessions in ${groupObj.groupName}`, 'success');
        } catch (err) {
          console.error('Delete group sessions error:', err);
          showToast('Failed to delete group sessions: ' + err.message, 'error');
        }
      }
    });
  };

  // Open Edit Session — launches the full Schedule Session wizard pre-filled with existing data
  const handleOpenEditSession = (hubSession) => {
    setEditSessionData(hubSession);
  };

  // Calendar Modal State
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 8, 15)); // Default September 2026
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [selectedDayDetailsModal, setSelectedDayDetailsModal] = useState(null);

  const effectiveSchool = (isCoach && isCoachFreelance)
    ? 'Individual / Freelance Coach'
    : (activeSchoolName && schoolLower !== 'school admin' && schoolLower !== 'super admin')
      ? activeSchoolName
      : 'Aquatic Indica Surf School';
  const effectiveSchoolLower = effectiveSchool.toLowerCase().trim();

  const fetchSessions = () => {
    setLoading(true);
    const targetSchool = (isCoach && isCoachFreelance)
      ? 'Individual / Freelance Coach'
      : (effectiveSchool && !isSuperAdmin ? effectiveSchool : '');
    const url = targetSchool
      ? `${API}/api/sessions?school=${encodeURIComponent(targetSchool)}`
      : `${API}/api/sessions`;
    fetch(url)
      .then(r => r.json())
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching sessions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
    const instUrl = (effectiveSchool && !isSuperAdmin)
      ? `${API}/api/instructors?school=${encodeURIComponent(effectiveSchool)}`
      : `${API}/api/instructors`;
    fetch(instUrl)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllInstructorsList(data); })
      .catch(() => {});

    const stUrl = (activeSchoolName && !isSuperAdmin)
      ? `${API}/api/students?school=${encodeURIComponent(activeSchoolName)}`
      : `${API}/api/students`;
    fetch(stUrl)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllStudentsList(data); })
      .catch(() => {});
  }, [activeSchoolName, isSuperAdmin, isCoachFreelance]);

  // Role-Scoped Base Sessions List
  const roleScopedSessions = useMemo(() => {
    // Coach Role: Only show sessions where THIS coach is the instructor
    if (isCoach && (currentCoachName || currentCoachId)) {
      return sessions.filter(s => {
        const sSchool = (s.school || '').toLowerCase().trim();

        if (isCoachFreelance) {
          if (sSchool && sSchool !== 'individual / freelance coach') return false;
        } else if (coachAffiliatedSchool) {
          if (sSchool && sSchool !== coachAffiliatedSchool.toLowerCase() && sSchool !== effectiveSchoolLower) {
            return false;
          }
          if (sSchool === 'individual / freelance coach') return false;
        }

        const cNameLower = (currentCoachName || '').toLowerCase().trim();
        const sInstLower = (s.instructor || s.instructor_name || '').toLowerCase().trim();
        const nameMatch = cNameLower && sInstLower && (sInstLower === cNameLower || sInstLower.includes(cNameLower) || cNameLower.includes(sInstLower));
        const idMatch = currentCoachId && (
          s.instructor_id === currentCoachId ||
          String(s.instructor_id) === String(currentCoachId) ||
          parseInt(s.instructor_id) === parseInt(currentCoachId) ||
          (Array.isArray(s.instructor_ids) && (s.instructor_ids.includes(currentCoachId) || s.instructor_ids.includes(parseInt(currentCoachId)) || s.instructor_ids.includes(String(currentCoachId))))
        );
        return nameMatch || idMatch;
      });
    }

    // Student Role: Strictly isolate to ONLY sessions belonging to this specific student
    if (isStudent) {
      const sNameLower = (currentStudentName || '').toLowerCase().trim();
      const mySessions = sessions.filter(s => {
        const itemStudent = (s.student || '').toLowerCase().trim();
        if (sNameLower && itemStudent && (itemStudent === sNameLower || itemStudent.includes(sNameLower) || sNameLower.includes(itemStudent))) return true;
        if (currentUser?.student_id && (s.student_id === currentUser.student_id || String(s.student_id) === String(currentUser.student_id))) return true;
        return false;
      });
      return mySessions.length > 0 ? mySessions : sessions.filter(s => (s.student || '').toLowerCase().includes(sNameLower));
    }

    // Admin / School: Filter by active school
    if (!isSuperAdmin && !isCoach && effectiveSchoolLower) {
      return sessions.filter(s => {
        const sSchool = (s.school || '').toLowerCase().trim();
        if (sSchool === 'individual / freelance coach') return false;
        return sSchool === effectiveSchoolLower;
      });
    }

    return sessions;
  }, [sessions, currentUser, isStudent, isCoach, currentStudentName, currentCoachName, currentCoachId, effectiveSchoolLower, isSuperAdmin]);

  // Extract unique instructors and students for dropdowns
  const availableInstructors = useMemo(() => {
    const names = new Set(roleScopedSessions.map(s => s.instructor).filter(Boolean));
    allInstructorsList.forEach(i => { if (i.name) names.add(i.name); });
    return Array.from(names);
  }, [roleScopedSessions, allInstructorsList]);

  const availableStudents = useMemo(() => {
    const names = new Set(roleScopedSessions.map(s => s.student).filter(Boolean));
    allStudentsList.forEach(st => { if (st.name) names.add(st.name); });
    return Array.from(names);
  }, [roleScopedSessions, allStudentsList]);

  // Extract unique slots / times (combining configured slots + active sessions)
  const availableSlots = useMemo(() => {
    const timesSet = new Set();
    try {
      const raw = localStorage.getItem('session_slots');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.filter(s => s.active !== false).forEach(s => {
            const t = s.time || s.startTime;
            if (t) timesSet.add(t);
          });
        }
      }
    } catch (e) {}

    roleScopedSessions.forEach(s => {
      if (s.time) {
        const cleanT = s.time.includes(' - ') ? s.time.split(' - ')[0].trim() : s.time;
        timesSet.add(cleanT);
      }
    });

    if (timesSet.size === 0) {
      ['08:30 AM', '10:30 AM', '11:30 AM', '01:00 PM', '04:00 PM'].forEach(t => timesSet.add(t));
    }

    return Array.from(timesSet);
  }, [roleScopedSessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return roleScopedSessions.filter(s => {
      // Date filter
      if (dateFilter) {
        const sessionDateISO = normalizeToYYYYMMDD(s.date);
        const filterISO = normalizeToYYYYMMDD(dateFilter);
        if (sessionDateISO !== filterISO && !String(s.date || '').toLowerCase().includes(dateFilter.toLowerCase())) {
          return false;
        }
      }

      // Slot (Time) filter
      if (slotFilter !== 'All') {
        const sTimeLower = (s.time || '').toLowerCase();
        const fTimeLower = slotFilter.toLowerCase();
        if (!sTimeLower.includes(fTimeLower) && sTimeLower !== fTimeLower) {
          return false;
        }
      }

      // Instructor filter
      if (instructorFilter !== 'All') {
        const iFilterLower = instructorFilter.toLowerCase().trim();
        const sInstLower = (s.instructor || s.instructor_name || '').toLowerCase().trim();
        const matches = sInstLower === iFilterLower || sInstLower.includes(iFilterLower) || iFilterLower.includes(sInstLower) || String(s.instructor_id) === String(instructorFilter);
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        const normStatus = formatSessionStatus(s);
        if (normStatus !== statusFilter) {
          return false;
        }
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          (s.student || '').toLowerCase().includes(q) ||
          (s.instructor || '').toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q) ||
          (s.notes || '').toLowerCase().includes(q) ||
          (s.date || '').toLowerCase().includes(q) ||
          (s.time || '').toLowerCase().includes(q) ||
          (s.group_name || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [roleScopedSessions, dateFilter, slotFilter, instructorFilter, statusFilter, searchQuery, clockTick]);

  // Helper function to group sessions by explicit group_name OR by Date + Time + Instructor
  const buildSessionGrouping = (sessionList) => {
    const buckets = new Map();

    (sessionList || []).forEach(session => {
      let explicitGrp = (session.group_name && session.group_name.trim() !== '') ? session.group_name.trim() : null;

      // Extract explicit group name (e.g. "Group A", "Group B") from notes if group_name is missing
      if (!explicitGrp && session.notes) {
        const notesStr = session.notes.trim();
        const groupMatch = notesStr.match(/\b(Group\s+[A-Za-z0-9]+)\b/i);
        if (groupMatch) {
          explicitGrp = groupMatch[1].trim();
        } else if (notesStr.includes(' - Automated')) {
          explicitGrp = notesStr.split(' - Automated')[0].trim();
        } else if (notesStr.includes(' - Coaches:')) {
          const prefix = notesStr.split(' - Coaches:')[0].trim();
          explicitGrp = prefix.replace(/\s*\([^)]*\)/g, '').trim() || prefix;
        }
      }

      let key;
      let groupTitle;
      let isExplicit = false;

      const datePart = (session.date || '').trim();
      const timePart = (session.time || '').trim();
      const instPart = (session.instructor || '').trim();

      if (explicitGrp) {
        key = `EXPLICIT__${explicitGrp}__${datePart}__${timePart}`;
        groupTitle = explicitGrp;
        isExplicit = true;
      } else {
        key = `AUTO__${datePart}__${timePart}__${instPart}`;
        groupTitle = `${timePart || 'Session'} Group`;
        isExplicit = false;
      }

      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          groupName: groupTitle,
          isExplicit,
          date: session.date,
          time: session.time,
          duration_mins: session.duration_mins,
          instructor: session.instructor,
          location: session.location,
          condition: session.condition,
          type: session.type,
          status: formatSessionStatus(session),
          sessions: []
        });
      }
      buckets.get(key).sessions.push(session);
    });

    const groups = [];
    const ungrouped = [];

    buckets.forEach(bucket => {
      // Sort students inside each group alphabetically by student name
      bucket.sessions.sort((s1, s2) => (s1.student || '').localeCompare(s2.student || ''));
      // If a group has multiple sessions/participants, always display as a collapsible group row
      if (bucket.sessions.length > 1) {
        groups.push(bucket);
      } else {
        bucket.sessions.forEach(sess => {
          if (!sess.group_name && bucket.groupName) {
            sess.group_name = bucket.groupName;
          }
        });
        ungrouped.push(...bucket.sessions);
      }
    });

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const match = String(timeStr).match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toUpperCase() : null;
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + mins;
    };

    // Sort groups: Date DESC -> Time Slot ASC -> Group Name ASC (e.g. Group A before Group B)
    groups.sort((a, b) => {
      const dateA = normalizeToYYYYMMDD(a.date) || a.date || '';
      const dateB = normalizeToYYYYMMDD(b.date) || b.date || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // Newer date first
      }

      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) {
        return timeA - timeB; // Earlier time slot first (e.g. 08:30 AM before 10:30 AM)
      }

      // Natural alphabetical order: "Group A" before "Group B", "Group 1" before "Group 2"
      const nameA = a.groupName || '';
      const nameB = b.groupName || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

    ungrouped.sort((a, b) => {
      const dateA = normalizeToYYYYMMDD(a.date) || a.date || '';
      const dateB = normalizeToYYYYMMDD(b.date) || b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) return timeA - timeB;
      return (a.student || '').localeCompare(b.student || '');
    });

    return { groups, ungrouped };
  };

  // Group filtered sessions into parent Group objects and ungrouped sessions
  const groupedData = useMemo(() => {
    return buildSessionGrouping(filteredSessions);
  }, [filteredSessions]);

  // Extract unique group names (group_name field OR parsed from notes for legacy sessions)
  const availableGroups = useMemo(() => {
    const names = new Set();
    roleScopedSessions.forEach(s => {
      if (s.group_name && s.group_name.trim()) {
        names.add(s.group_name.trim());
      } else if (s.notes) {
        const groupMatch = s.notes.match(/\b(Group\s+[A-Za-z0-9]+)\b/i);
        if (groupMatch) {
          names.add(groupMatch[1].trim());
        } else if (s.notes.includes(' - Automated')) {
          const parsed = s.notes.split(' - Automated')[0].trim();
          if (parsed) names.add(parsed);
        }
      }
    });
    return Array.from(names).sort();
  }, [roleScopedSessions]);

  const hasActiveFilters = 
    dateFilter !== '' ||
    slotFilter !== 'All' ||
    instructorFilter !== 'All' ||
    statusFilter !== 'All' ||
    searchQuery.trim() !== '';

  const resetFilters = () => {
    setDateFilter('');
    setSlotFilter('All');
    setInstructorFilter('All');
    setStatusFilter('All');
    setSearchQuery('');
  };

  // Helper to count unique group sessions (1 group on a date = 1 session, + ungrouped sessions)
  const getGroupSessionCount = (sessionList) => {
    const { groups, ungrouped } = buildSessionGrouping(sessionList);
    return groups.length + ungrouped.length;
  };

  // Derived stats (1 group = 1 session)
  const totalSessions = getGroupSessionCount(roleScopedSessions);
  const filteredSessionsCount = getGroupSessionCount(filteredSessions);

  // Multi-Selection Helper Functions (Properly placed after filteredSessions)
  const allFilteredSessionIds = useMemo(() => {
    return filteredSessions.map(s => s.id);
  }, [filteredSessions]);

  const isAllSelected = allFilteredSessionIds.length > 0 && allFilteredSessionIds.every(id => selectedSessionIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(allFilteredSessionIds);
    }
  };

  const toggleSelectGroup = (groupObj, e) => {
    e?.stopPropagation();
    const groupIds = groupObj.sessions.map(s => s.id);
    const allInGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedSessionIds.includes(id));
    if (allInGroupSelected) {
      setSelectedSessionIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedSessionIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const toggleSelectSession = (sessionId, e) => {
    e?.stopPropagation();
    setSelectedSessionIds(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedSessionIds.length === 0) return;
    const count = selectedSessionIds.length;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Selected Sessions',
      message: `Are you sure you want to delete ${count} selected session${count > 1 ? 's' : ''}?`,
      confirmText: `Delete (${count})`,
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await Promise.all(
            selectedSessionIds.map(id => fetch(`${API}/api/sessions/${id}`, { method: 'DELETE' }))
          );
          const toDelete = new Set(selectedSessionIds);
          setSessions(prev => prev.filter(s => !toDelete.has(s.id)));
          setSelectedSessionIds([]);
          showToast(`${count} sessions deleted successfully`, 'success');
        } catch (err) {
          console.error('Bulk delete error:', err);
          showToast('Failed to delete selected sessions: ' + err.message, 'error');
        }
      }
    });
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedSessionIds.length === 0) return;
    try {
      await Promise.all(
        selectedSessionIds.map(id =>
          fetch(`${API}/api/sessions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          })
        )
      );
      const targetIds = new Set(selectedSessionIds);
      setSessions(prev =>
        prev.map(s => (targetIds.has(s.id) ? { ...s, status: newStatus } : s))
      );
      showToast(`Updated ${selectedSessionIds.length} session(s) to ${newStatus}`, 'success');
      setSelectedSessionIds([]);
    } catch (err) {
      console.error('Bulk status update error:', err);
      showToast('Failed updating session statuses: ' + err.message, 'error');
    }
  };

  const avgDuration = roleScopedSessions.length > 0
    ? Math.round(roleScopedSessions.reduce((sum, s) => sum + (s.duration_mins || 60), 0) / roleScopedSessions.length)
    : 0;

  // Status Metrics (Upcoming / In Progress / Pending for Review / Completed)
  const upcomingSessionsList = roleScopedSessions.filter(s => formatSessionStatus(s) === 'Upcoming');
  const upcomingCount = getGroupSessionCount(upcomingSessionsList);
  const upcomingDays = new Set(upcomingSessionsList.map(s => s.date).filter(Boolean)).size;

  const inProgressSessionsList = roleScopedSessions.filter(s => {
    const norm = formatSessionStatus(s);
    return norm === 'In Progress' || norm === 'IN PROGRESS';
  });
  const inProgressCount = getGroupSessionCount(inProgressSessionsList);
  const inProgressDays = new Set(inProgressSessionsList.map(s => s.date).filter(Boolean)).size;

  const pendingReviewSessionsList = roleScopedSessions.filter(s => {
    const norm = formatSessionStatus(s);
    return norm === 'Pending for Review' || norm === 'Pending Review';
  });
  const pendingReviewCount = getGroupSessionCount(pendingReviewSessionsList);
  const pendingReviewDays = new Set(pendingReviewSessionsList.map(s => s.date).filter(Boolean)).size;

  const bookedSessionsList = roleScopedSessions;
  const bookedCount = getGroupSessionCount(bookedSessionsList);
  const bookedDays = new Set(bookedSessionsList.map(s => s.date).filter(Boolean)).size;

  const completedSessionsList = roleScopedSessions.filter(s => formatSessionStatus(s) === 'Completed');
  const completedCount = getGroupSessionCount(completedSessionsList);
  const completedDays = new Set(completedSessionsList.map(s => s.date).filter(Boolean)).size;

  // Student Metrics in Sessions
  const allUniqueStudentKeys = useMemo(() => {
    const set = new Set();
    roleScopedSessions.forEach(s => {
      const key = s.student_id ? String(s.student_id) : (s.student || '').trim().toLowerCase();
      if (key) set.add(key);
    });
    return set;
  }, [roleScopedSessions]);
  const totalStudentsCount = allUniqueStudentKeys.size;

  const upcomingStudentKeys = useMemo(() => {
    const set = new Set();
    upcomingSessionsList.forEach(s => {
      const key = s.student_id ? String(s.student_id) : (s.student || '').trim().toLowerCase();
      if (key) set.add(key);
    });
    return set;
  }, [upcomingSessionsList]);
  const upcomingStudentsCount = upcomingStudentKeys.size;

  const inProgressStudentKeys = useMemo(() => {
    const set = new Set();
    inProgressSessionsList.forEach(s => {
      const key = s.student_id ? String(s.student_id) : (s.student || '').trim().toLowerCase();
      if (key) set.add(key);
    });
    return set;
  }, [inProgressSessionsList]);
  const inProgressStudentsCount = inProgressStudentKeys.size;

  const pendingReviewStudentKeys = useMemo(() => {
    const set = new Set();
    pendingReviewSessionsList.forEach(s => {
      const key = s.student_id ? String(s.student_id) : (s.student || '').trim().toLowerCase();
      if (key) set.add(key);
    });
    return set;
  }, [pendingReviewSessionsList]);
  const pendingReviewStudentsCount = pendingReviewStudentKeys.size;

  const completedStudentKeys = useMemo(() => {
    const set = new Set();
    completedSessionsList.forEach(s => {
      const key = s.student_id ? String(s.student_id) : (s.student || '').trim().toLowerCase();
      if (key) set.add(key);
    });
    return set;
  }, [completedSessionsList]);
  const completedStudentsCount = completedStudentKeys.size;

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group sessions by ISO date string e.g. "2026-09-15"
  const sessionsByISO = useMemo(() => {
    const map = {};
    roleScopedSessions.forEach(s => {
      const iso = normalizeToYYYYMMDD(s.date);
      if (iso) {
        if (!map[iso]) map[iso] = [];
        map[iso].push(s);
      }
    });
    return map;
  }, [roleScopedSessions]);

  // List of distinct dates that have assigned sessions
  const assignedDatesList = useMemo(() => {
    const map = new Map();
    roleScopedSessions.forEach(s => {
      const iso = normalizeToYYYYMMDD(s.date);
      if (iso) {
        if (!map.has(iso)) {
          map.set(iso, {
            iso,
            displayDate: s.date,
            sessions: []
          });
        }
        map.get(iso).sessions.push(s);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.iso.localeCompare(b.iso));
  }, [roleScopedSessions]);

  // Selected date's sessions (matching by ISO or raw date string)
  const activeDaySessions = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const targetISO = normalizeToYYYYMMDD(selectedCalendarDate);
    return roleScopedSessions.filter(s => {
      const sISO = normalizeToYYYYMMDD(s.date);
      return sISO === targetISO || s.date === selectedCalendarDate;
    });
  }, [roleScopedSessions, selectedCalendarDate]);

  // Group breakdown for active day roster drawer
  const activeDayGroups = useMemo(() => {
    const { groups, ungrouped } = buildSessionGrouping(activeDaySessions);
    return {
      groupedList: groups,
      ungroupedList: ungrouped
    };
  }, [activeDaySessions]);

  return (
    <div className="ses-page">
      <Sidebar />
      <main className="ses-main">
        {/* Header */}
        <header className="ses-header">
          <div className="ses-header-info">
            <div className="ses-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="ses-title">{isStudent || isCoach ? 'My Sessions' : 'Surf Sessions'}</h1>
              <span className="ses-live-pill">
                <span className="ses-pulsing-dot"></span> LIVE SCHEDULE
              </span>
            </div>
            <p className="ses-subtitle" style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              {isStudent
                ? 'Your personalized surf coaching, training logs & scheduled slots'
                : (isCoach
                  ? 'Your assigned coaching roster, student trainees & scheduled slots'
                  : 'Aquatic Indica Ground Operations & Coaching Management Platform')}
            </p>
          </div>
          <div className="ses-actions">
            <button
              className="ses-btn-secondary"
              onClick={() => {
                if (assignedDatesList.length > 0) {
                  const first = assignedDatesList[0];
                  const parts = first.iso.split('-');
                  if (parts.length === 3) {
                    setCurrentDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
                    setSelectedCalendarDate(first.iso);
                  }
                }
                setShowCalendarModal(true);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Interactive Calendar & Schedule
            </button>
            {canManageSessions && (
              <>
                <button
                  className="ses-btn-primary"
                  onClick={() => {
                    setScheduleModalInitialDate(null);
                    setShowScheduleModal(true);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Schedule Session
                </button>
                <button className="ses-btn-primary" onClick={() => navigate('/sessions/configure')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Configure Sessions
                </button>
              </>
            )}
          </div>
        </header>

        {/* Search & Filter Bar */}
        <div className="ses-filters-container">
          <div className="ses-filters-top">
            {/* Search Input */}
            <div className="ses-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search student, coach, spot, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ses-search-input"
              />
              {searchQuery && (
                <button className="ses-clear-btn" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>

            {/* Date Filter */}
            <div className="ses-select-wrap ses-date-filter-wrap">
              <label className="ses-select-label">Date</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="date"
                  className="ses-select"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    width: '100%',
                    paddingRight: dateFilter ? '26px' : '10px',
                    fontWeight: dateFilter ? 700 : 500,
                    color: dateFilter ? '#0D9488' : '#0F172A',
                    borderColor: dateFilter ? '#0D9488' : '#E2E8F0',
                    background: dateFilter ? '#E6F9F5' : '#F8FAFC'
                  }}
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      background: 'none',
                      border: 'none',
                      color: '#0D9488',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: 800,
                      padding: '2px 4px'
                    }}
                    title="Clear date filter"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Instructor Filter (Hidden for Coach & Student roles) */}
            {!isCoach && !isStudent && (
              <div className="ses-select-wrap">
                <label className="ses-select-label">Instructor</label>
                <select
                  className="ses-select"
                  value={instructorFilter}
                  onChange={(e) => setInstructorFilter(e.target.value)}
                  style={{
                    fontWeight: instructorFilter !== 'All' ? 700 : 500,
                    color: instructorFilter !== 'All' ? '#0D9488' : '#0F172A',
                    borderColor: instructorFilter !== 'All' ? '#0D9488' : '#E2E8F0',
                    background: instructorFilter !== 'All' ? '#E6F9F5' : '#F8FAFC'
                  }}
                >
                  <option value="All">All Instructors</option>
                  {availableInstructors.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div className="ses-select-wrap">
              <label className="ses-select-label">Status</label>
              <select
                className="ses-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  fontWeight: statusFilter !== 'All' ? 700 : 500,
                  color: statusFilter !== 'All' ? '#0284C7' : '#0F172A',
                  borderColor: statusFilter !== 'All' ? '#0284C7' : '#E2E8F0',
                  background: statusFilter !== 'All' ? '#F0F9FF' : '#F8FAFC'
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending for Review">Pending for Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button className="ses-reset-btn" onClick={resetFilters} title="Reset all filters">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Reset
              </button>
            )}
          </div>

          {/* Horizontal Slot Tabs Bar (Hidden for Students) */}
          {!isStudent && (
            <div className="ses-slot-tabs-bar">
              <div className="ses-slot-tabs-label">
                <span style={{ fontSize: '15px' }}>⏰</span> Select Time Slot:
              </div>

              <div className="ses-slot-tabs-scroll">
                {/* All Slots Tab */}
              {(() => {
                const isSelected = slotFilter === 'All';
                const count = getGroupSessionCount(roleScopedSessions);
                return (
                  <button
                    type="button"
                    key="All"
                    onClick={() => setSlotFilter('All')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '24px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid #0D9488' : '1px solid #CBD5E1',
                      background: isSelected ? '#ECFDF5' : '#FFFFFF',
                      color: isSelected ? '#0D9488' : '#475569',
                      boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.15)' : 'none'
                    }}
                  >
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isSelected ? '#0D9488' : '#94A3B8',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 800
                    }}>
                      ★
                    </span>
                    <span>All Slots</span>
                    {isSelected && (
                      <span style={{
                        background: '#0D9488',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10.5px',
                        fontWeight: 800
                      }}>
                        ✓ SELECTED TAB
                      </span>
                    )}
                  </button>
                );
              })()}

              {/* Dynamic Slot Tabs */}
              {availableSlots.map((slotTime, index) => {
                const isSelected = slotFilter === slotTime || (slotFilter !== 'All' && (slotTime.includes(slotFilter) || slotFilter.includes(slotTime)));

                return (
                  <button
                    type="button"
                    key={slotTime}
                    onClick={() => setSlotFilter(slotTime)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '24px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid #0D9488' : '1px solid #CBD5E1',
                      background: isSelected ? '#ECFDF5' : '#FFFFFF',
                      color: isSelected ? '#0D9488' : '#475569',
                      boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.15)' : 'none'
                    }}
                  >
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isSelected ? '#0D9488' : '#94A3B8',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 800
                    }}>
                      {index + 1}
                    </span>
                    <span>{slotTime}</span>
                    {isSelected && (
                      <span style={{
                        background: '#0D9488',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10.5px',
                        fontWeight: 800
                      }}>
                        ✓ SELECTED TAB
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            </div>
          )}

          <div className="ses-filter-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>
                Showing <strong>{filteredSessionsCount}</strong> of <strong>{totalSessions}</strong> sessions
              </span>
              {hasActiveFilters && (
                <span className="ses-filter-active-pill">
                  Active Filter Applied
                </span>
              )}
            </div>

            {/* Select All / Deselect All Button */}
            {canManageSessions && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="ses-btn-select-all"
                onClick={toggleSelectAll}
                title={isAllSelected ? "Deselect All filtered sessions" : "Select All filtered sessions"}
              >
                {isAllSelected ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>Select All</span>
                  </>
                )}
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Floating Bulk Action Bar (When 1 or more sessions selected) */}
        {selectedSessionIds.length > 0 && (
          <div className="ses-bulk-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="ses-bulk-count-badge">
                ✓ {selectedSessionIds.length} Selected
              </span>
              <button
                type="button"
                className="ses-bulk-btn-clear"
                onClick={() => setSelectedSessionIds([])}
              >
                Clear Selection
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="ses-bulk-btn-complete"
                onClick={() => handleBulkStatusChange('Completed')}
                title="Mark all selected sessions as Completed"
              >
                ✓ Mark Completed
              </button>
              <button
                type="button"
                className="ses-bulk-btn-delete"
                onClick={handleBulkDelete}
                title="Permanently delete selected sessions"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete Selected ({selectedSessionIds.length})
              </button>
            </div>
          </div>
        )}

        {/* Metric Cards Row - Placed Between Filters & Table */}
        <div className="ses-metrics-row">
          <div
            className={`ses-status-metric-card upcoming-card ${statusFilter === 'Upcoming' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter(prev => prev === 'Upcoming' ? 'All' : 'Upcoming')}
            style={{ cursor: 'pointer' }}
            title="Click to filter by Upcoming sessions"
          >
            <div className="ses-smc-label">UPCOMING SESSIONS</div>
            <div className="ses-smc-value">{loading ? '…' : upcomingCount}</div>
            <div className="ses-smc-sub">Days Upcoming: {loading ? '…' : upcomingDays}</div>
          </div>

          <div
            className={`ses-status-metric-card inprogress-card ${statusFilter === 'In Progress' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter(prev => prev === 'In Progress' ? 'All' : 'In Progress')}
            style={{ cursor: 'pointer' }}
            title="Click to filter by In Progress sessions"
          >
            <div className="ses-smc-label">IN PROGRESS SESSIONS</div>
            <div className="ses-smc-value">{loading ? '…' : inProgressCount}</div>
            <div className="ses-smc-sub">Days In Progress: {loading ? '…' : inProgressDays}</div>
          </div>

          <div
            className={`ses-status-metric-card pending-review-card ${statusFilter === 'Pending for Review' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter(prev => prev === 'Pending for Review' ? 'All' : 'Pending for Review')}
            style={{ cursor: 'pointer' }}
            title="Click to filter by Pending for Review sessions (Assigned sessions whose scheduled time has finished)"
          >
            <div className="ses-smc-label">PENDING FOR REVIEW</div>
            <div className="ses-smc-value">{loading ? '…' : pendingReviewCount}</div>
            <div className="ses-smc-sub">Days Pending: {loading ? '…' : pendingReviewDays}</div>
          </div>

          <div
            className={`ses-status-metric-card completed-card ${statusFilter === 'Completed' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter(prev => prev === 'Completed' ? 'All' : 'Completed')}
            style={{ cursor: 'pointer' }}
            title="Click to filter by Completed sessions"
          >
            <div className="ses-smc-label">SESSIONS COMPLETED</div>
            <div className="ses-smc-value">{loading ? '…' : completedCount}</div>
            <div className="ses-smc-sub">Days Completed: {loading ? '…' : completedDays}</div>
          </div>

          <div
            className={`ses-status-metric-card students-card ${statusFilter === 'All' ? '' : ''}`}
            onClick={() => setStatusFilter('All')}
            style={{ cursor: 'pointer' }}
            title="Click to show all students & sessions"
          >
            <div className="ses-smc-label">NUMBER OF STUDENTS</div>
            <div className="ses-smc-value">{loading ? '…' : totalStudentsCount}</div>
            <div className="ses-smc-sub">
              Upcoming: {loading ? '…' : upcomingStudentsCount} &bull; In Progress: {loading ? '…' : inProgressStudentsCount} &bull; Pending: {loading ? '…' : pendingReviewStudentsCount} &bull; Completed: {loading ? '…' : completedStudentsCount}
            </div>
          </div>
        </div>

        {/* Full-Width Sessions Table */}
        <div className="ses-table-container">
          {loading ? (
            <div className="ses-loading">
              <div className="ses-spinner" />
              <span style={{ color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Loading sessions from AWS Cloud...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="ses-empty-state-card">
              <div style={{ fontSize: '38px', marginBottom: '10px' }}>🏄‍♂️</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                No sessions match your filter criteria
              </div>
              <p style={{ margin: '0 auto 16px', fontSize: '13.5px', color: '#64748B', maxWidth: '380px', lineHeight: '1.5' }}>
                {isStudent
                  ? 'No sessions found for your account.'
                  : !canManageSessions
                  ? 'No sessions currently scheduled. Sessions can only be scheduled by school administrators.'
                  : 'Try clearing filters or schedule a new session for this time slot.'}
              </p>
              {hasActiveFilters ? (
                <button className="ses-btn-secondary" style={{ margin: '0 auto' }} onClick={resetFilters}>
                  Clear Filters
                </button>
              ) : canManageSessions ? (
                <button
                  className="ses-btn-primary"
                  style={{ margin: '0 auto' }}
                  onClick={() => {
                    setScheduleModalInitialDate(null);
                    setShowScheduleModal(true);
                  }}
                >
                  + Schedule First Session
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="ses-mobile-scroll-indicator">
                <span>👉 Swipe horizontally on the table to view students & actions</span>
              </div>
              <table className="ses-table">
              <thead>
                <tr>
                  {canManageSessions && (
                    <th style={{ width: '42px', minWidth: '42px', textAlign: 'center', padding: '14px 6px 14px 14px' }}>
                      <input
                        type="checkbox"
                        className="ses-checkbox-custom"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        title={isAllSelected ? "Deselect All" : "Select All"}
                      />
                    </th>
                  )}
                  <th style={{ width: '18%', minWidth: '160px' }}>DATE & TIME</th>
                  <th style={{ width: '22%', minWidth: '180px' }}>SESSION / STUDENT</th>
                  <th style={{ width: '14%', minWidth: '130px' }}>INSTRUCTOR</th>
                  <th style={{ width: '10%', minWidth: '95px' }}>TYPE</th>
                  <th style={{ width: '11%', minWidth: '105px' }}>STATUS</th>
                  <th style={{ width: '25%', minWidth: '270px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. PARENT GROUP ROWS (Collapsible) */}
                {groupedData.groups.map((groupObj) => {
                  const isExpanded = Boolean(expandedGroups[groupObj.key]);
                  const studentNames = groupObj.sessions.map(s => s.student).filter(Boolean);
                  const groupIds = groupObj.sessions.map(s => s.id);
                  const allInGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedSessionIds.includes(id));
                  
                  // Check if any session in this group already has a video attached
                  const groupVideoUrl = groupObj.sessions.find(s => s.video_url && s.video_url.trim() !== '')?.video_url || '';
                  const hasGroupMedia = Boolean(groupVideoUrl);

                  return (
                    <React.Fragment key={groupObj.key}>
                      {/* Parent Group Header Row */}
                      <tr
                        className="ses-table-row ses-group-header-row"
                        style={{
                          backgroundColor: isExpanded ? '#F0FDFA' : '#F8FAFC',
                          borderLeft: '4px solid #0D9488',
                          borderBottom: isExpanded ? '1px solid #CCFBF1' : '1px solid #E2E8F0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => openSessionHub({
                          isGroup: true,
                          key: groupObj.key,
                          groupName: groupObj.groupName,
                          date: groupObj.date,
                          time: groupObj.time,
                          duration_mins: groupObj.duration_mins,
                          location: groupObj.location,
                          condition: groupObj.condition,
                          type: groupObj.type,
                          status: groupObj.status,
                          instructor: groupObj.instructor,
                          instructor_id: groupObj.sessions[0]?.instructor_id,
                          sessions: groupObj.sessions,
                          video_url: groupVideoUrl,
                          image_url: groupObj.sessions.find(s => s.image_url)?.image_url || '',
                          notes: groupObj.sessions[0]?.notes || '',
                        })}
                        title="Click to view Group Roster, upload Videos & Photos"
                      >
                        {canManageSessions && (
                          <td style={{ textAlign: 'center', width: '42px', padding: '14px 6px 14px 14px' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="ses-checkbox-custom"
                              checked={allInGroupSelected}
                              onChange={(e) => toggleSelectGroup(groupObj, e)}
                              title={`Select all ${groupObj.sessions.length} students in ${groupObj.groupName}`}
                            />
                          </td>
                        )}
                        <td>
                          <div className="ses-td-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {groupObj.date || '—'}
                          </div>
                          <div className="ses-td-secondary" style={{ whiteSpace: 'nowrap' }}>{groupObj.time || '—'} · {groupObj.duration_mins || 60} mins</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#CCFBF1',
                              color: '#0F766E',
                              border: '1px solid #99F6E4',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                              </svg>
                              {groupObj.groupName}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ({groupObj.sessions.length} Students)
                            </span>
                          </div>
                        </td>
                        <td>
                          {renderCoachBadge(groupObj.instructor, groupObj.sessions[0]?.instructor_id)}
                        </td>
                        <td>
                          <span className="ses-badge-type">{groupObj.type || 'Beginner'}</span>
                        </td>
                        <td>
                          <span
                            className="ses-status-pill"
                            style={{
                              backgroundColor: statusBg(groupObj),
                              color: statusColor(groupObj),
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <span className="ses-status-dot" style={{ backgroundColor: statusColor(groupObj) }}></span>
                            {formatSessionStatus(groupObj)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="ses-actions-row" style={{ justifyContent: 'flex-end', gap: '6px', flexWrap: 'nowrap' }}>
                            {/* Analysis Button for Group (When Video is Attached) */}
                            {hasGroupMedia && (
                              <button
                                className="ses-btn-view-analysis ses-btn-analysis-active"
                                title="View AI Video Analysis for this session group"
                                style={{
                                  padding: '6px 10px',
                                  fontWeight: 700,
                                  fontSize: '11.5px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#0284C7',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const allGroupVideos = Array.from(new Set(groupObj.sessions.map(s => s.video_url).filter(Boolean)));
                                  const videoParamVal = allGroupVideos.length > 1 ? JSON.stringify(allGroupVideos) : (groupVideoUrl || '');
                                  navigate(`/analysis?student=${encodeURIComponent(groupObj.groupName || studentNames[0] || 'Group')}&date=${encodeURIComponent(groupObj.date || '')}&video=${encodeURIComponent(videoParamVal)}&athletes=${encodeURIComponent(JSON.stringify(studentNames))}`);
                                }}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                Analysis
                              </button>
                            )}

                            {/* View Session & Media Hub Button */}
                            <button
                              className="ses-btn-view-analysis"
                              title="Open Full Details, Roster, Video & Photo Upload Hub"
                              style={{
                                padding: '6px 10px',
                                fontWeight: 600,
                                fontSize: '11.5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#0D9488',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openSessionHub({
                                  isGroup: true,
                                  key: groupObj.key,
                                  groupName: groupObj.groupName,
                                  date: groupObj.date,
                                  time: groupObj.time,
                                  duration_mins: groupObj.duration_mins,
                                  location: groupObj.location,
                                  condition: groupObj.condition,
                                  type: groupObj.type,
                                  status: groupObj.status,
                                  instructor: groupObj.instructor,
                                  instructor_id: groupObj.sessions[0]?.instructor_id,
                                  sessions: groupObj.sessions,
                                  video_url: groupVideoUrl,
                                  image_url: groupObj.sessions.find(s => s.image_url)?.image_url || '',
                                  notes: groupObj.sessions[0]?.notes || '',
                                });
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                              </svg>
                              Details & Media
                            </button>

                            {/* Toggle Expand Athletes */}
                            <button
                              className="ses-btn-view-analysis"
                              style={{
                                background: isExpanded ? '#0F766E' : '#FFFFFF',
                                color: isExpanded ? '#FFFFFF' : '#0F766E',
                                border: '1px solid #0D948860',
                                padding: '5px 9px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroupExpand(groupObj.key);
                              }}
                            >
                              <span>{isExpanded ? 'Hide' : `Students (${groupObj.sessions.length})`}</span>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>

                            {/* Delete Entire Group */}
                            {canManageSessions && (
                              <button
                                type="button"
                                className="ses-btn-delete-session"
                                title="Delete entire session group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGroupSessions(groupObj);
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Child Athlete Rows when Expanded */}
                      {isExpanded && groupObj.sessions.map((session, sIdx) => {
                        const studentClips = parseSessionVideos(session.video_urls || session.video_url || '');
                        const hasStudentVideo = Boolean(session.video_url && session.video_url.trim() !== '');
                        const clipCount = studentClips.length;

                        return (
                          <tr
                            key={session.id}
                            className="ses-table-row ses-child-row"
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderLeft: '4px solid #0D9488',
                              borderBottom: (sIdx === groupObj.sessions.length - 1) ? '2px solid #CBD5E1' : '1px solid #F1F5F9',
                              cursor: 'pointer'
                            }}
                            onClick={() => openSessionHub({
                              isGroup: false,
                              id: session.id,
                              groupName: groupObj.groupName,
                              date: session.date,
                              time: session.time,
                              duration_mins: session.duration_mins,
                              location: session.location,
                              condition: session.condition,
                              type: session.type,
                              status: session.status,
                              student: session.student,
                              student_id: session.student_id,
                              instructor: session.instructor,
                              instructor_id: session.instructor_id,
                              sessions: [session],
                              video_url: session.video_url || '',
                              video_urls: session.video_urls || session.video_url || '',
                              image_url: session.image_url || '',
                              notes: session.notes || '',
                            }, 'video')}
                            title={`Click to view & upload personal video for ${session.student}`}
                          >
                            {canManageSessions && (
                              <td style={{ textAlign: 'center', width: '42px', padding: '14px 6px 14px 14px' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="ses-checkbox-custom"
                                  checked={selectedSessionIds.includes(session.id)}
                                  onChange={(e) => toggleSelectSession(session.id, e)}
                                  title={`Select ${session.student}`}
                                />
                              </td>
                            )}
                            <td style={{ paddingLeft: '18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                <span style={{ color: '#0D9488', fontWeight: 800, fontSize: '14px' }}>└─</span>
                                <span>{session.date}</span>
                              </div>
                              <div className="ses-td-secondary" style={{ paddingLeft: '18px', whiteSpace: 'nowrap' }}>{session.time} · {session.duration_mins || 60} mins</div>
                            </td>
                            <td>
                              <div className="ses-td-primary" style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                <span>{session.student || '—'}</span>
                                {(session.is_guest || session.guest_name) && (
                                  <span style={{
                                    fontSize: '11px',
                                    background: '#FEF3C7',
                                    color: '#92400E',
                                    border: '1px solid #FDE68A',
                                    borderRadius: '4px',
                                    padding: '1px 5px',
                                    fontWeight: 700,
                                    letterSpacing: '0.02em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}>
                                    👥 Guest
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {renderCoachBadge(session.instructor, session.instructor_id)}
                            </td>
                            <td>
                              <span className="ses-badge-type">{session.type || 'Beginner'}</span>
                            </td>
                            <td>
                              <span
                                className="ses-status-pill"
                                style={{
                                  backgroundColor: statusBg(session),
                                  color: statusColor(session),
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span className="ses-status-dot" style={{ backgroundColor: statusColor(session) }}></span>
                                {formatSessionStatus(session)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="ses-actions-row" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                                {/* Individual Student Video Button */}
                                {hasStudentVideo ? (
                                  <button
                                    type="button"
                                    className="ses-btn-student-video has-video"
                                    title={`Personal video attached for ${session.student} (${clipCount} clip${clipCount > 1 ? 's' : ''}). Click to manage.`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSessionHub({
                                        isGroup: false,
                                        id: session.id,
                                        groupName: groupObj.groupName,
                                        date: session.date,
                                        time: session.time,
                                        duration_mins: session.duration_mins,
                                        location: session.location,
                                        condition: session.condition,
                                        type: session.type,
                                        status: session.status,
                                        student: session.student,
                                        student_id: session.student_id,
                                        instructor: session.instructor,
                                        instructor_id: session.instructor_id,
                                        sessions: [session],
                                        video_url: session.video_url || '',
                                        video_urls: session.video_urls || session.video_url || '',
                                        image_url: session.image_url || '',
                                        notes: session.notes || '',
                                      }, 'video');
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                    <span>Video ({clipCount})</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="ses-btn-student-video no-video"
                                    title={`Upload personal video for ${session.student} (Private to this student)`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSessionHub({
                                        isGroup: false,
                                        id: session.id,
                                        groupName: groupObj.groupName,
                                        date: session.date,
                                        time: session.time,
                                        duration_mins: session.duration_mins,
                                        location: session.location,
                                        condition: session.condition,
                                        type: session.type,
                                        status: session.status,
                                        student: session.student,
                                        student_id: session.student_id,
                                        instructor: session.instructor,
                                        instructor_id: session.instructor_id,
                                        sessions: [session],
                                        video_url: session.video_url || '',
                                        video_urls: session.video_urls || session.video_url || '',
                                        image_url: session.image_url || '',
                                        notes: session.notes || '',
                                      }, 'video');
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    <span>+ Video</span>
                                  </button>
                                )}

                                {/* Individual Analysis Button */}
                                <button
                                  className={`ses-btn-view-analysis ${hasStudentVideo ? 'ses-btn-analysis-active' : 'ses-btn-analysis-muted'}`}
                                  style={{ padding: '5px 10px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                                  title={hasStudentVideo ? `Open Video Analysis for ${session.student}` : "No personal footage uploaded yet"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const videoParam = hasStudentVideo ? `&video=${encodeURIComponent(session.video_url)}` : '';
                                    navigate(`/analysis?student=${encodeURIComponent(session.student || '')}&date=${encodeURIComponent(session.date || '')}${videoParam}&athletes=${encodeURIComponent(JSON.stringify([session.student]))}`);
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: hasStudentVideo ? 1 : 0.6 }}>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                  Analysis
                                </button>
                                {canManageSessions && (
                                  <button
                                    type="button"
                                    className="ses-btn-delete-session"
                                    title="Delete this session"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSingleSession(session.id, session.student);
                                    }}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      <line x1="10" y1="11" x2="10" y2="17"></line>
                                      <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* 2. UNGROUPED SESSIONS */}
                {groupedData.ungrouped.map((session, i) => {
                  const hasMedia = Boolean(session.video_url && session.video_url.trim() !== '');

                  return (
                    <tr
                      key={session.id}
                      className="ses-table-row"
                      style={{
                        borderBottom: i === groupedData.ungrouped.length - 1 ? 'none' : '1px solid #F1F5F9',
                        cursor: 'pointer'
                      }}
                      onClick={() => openSessionHub({
                        isGroup: false,
                        id: session.id,
                        groupName: session.group_name || '',
                        date: session.date,
                        time: session.time,
                        duration_mins: session.duration_mins,
                        location: session.location,
                        condition: session.condition,
                        type: session.type,
                        status: session.status,
                        student: session.student,
                        student_id: session.student_id,
                        instructor: session.instructor,
                        instructor_id: session.instructor_id,
                        sessions: [session],
                        video_url: session.video_url || '',
                        image_url: session.image_url || '',
                        notes: session.notes || '',
                      })}
                      title="Click to view details, upload video & photo"
                    >
                      {canManageSessions && (
                        <td style={{ textAlign: 'center', width: '42px', padding: '14px 6px 14px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="ses-checkbox-custom"
                            checked={selectedSessionIds.includes(session.id)}
                            onChange={(e) => toggleSelectSession(session.id, e)}
                            title={`Select ${session.student}`}
                          />
                        </td>
                      )}
                      <td>
                        <div className="ses-td-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          {session.date}
                        </div>
                        <div className="ses-td-secondary" style={{ whiteSpace: 'nowrap' }}>{session.time} · {session.duration_mins || 60} mins</div>
                      </td>
                      <td>
                        <div className="ses-td-primary" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {session.group_name && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#CCFBF1',
                              color: '#0F766E',
                              border: '1px solid #99F6E4',
                              borderRadius: '6px',
                              padding: '2px 7px',
                              fontSize: '12px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                              </svg>
                              {session.group_name}
                            </span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span>{session.student || '—'}</span>
                            {(session.is_guest || session.guest_name) && (
                              <span style={{
                                fontSize: '11px',
                                background: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FDE68A',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                👥 Guest
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        {renderCoachBadge(session.instructor, session.instructor_id)}
                      </td>
                      <td>
                        <span className="ses-badge-type">{session.type || 'Beginner'}</span>
                      </td>
                      <td>
                        <span
                          className="ses-status-pill"
                          style={{
                            backgroundColor: statusBg(session),
                            color: statusColor(session),
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span className="ses-status-dot" style={{ backgroundColor: statusColor(session) }}></span>
                          {formatSessionStatus(session)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="ses-actions-row" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                          {hasMedia ? (
                            <button
                              type="button"
                              className="ses-btn-student-video has-video"
                              title={`Personal footage attached for ${session.student}. Click to view or manage.`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openSessionHub({
                                  isGroup: false,
                                  id: session.id,
                                  groupName: session.group_name || '',
                                  date: session.date,
                                  time: session.time,
                                  duration_mins: session.duration_mins,
                                  location: session.location,
                                  condition: session.condition,
                                  type: session.type,
                                  status: session.status,
                                  student: session.student,
                                  student_id: session.student_id,
                                  instructor: session.instructor,
                                  instructor_id: session.instructor_id,
                                  sessions: [session],
                                  video_url: session.video_url || '',
                                  video_urls: session.video_urls || session.video_url || '',
                                  image_url: session.image_url || '',
                                  notes: session.notes || '',
                                }, 'video');
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                              </svg>
                              <span>Video</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="ses-btn-student-video no-video"
                              title={`Upload personal video for ${session.student}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openSessionHub({
                                  isGroup: false,
                                  id: session.id,
                                  groupName: session.group_name || '',
                                  date: session.date,
                                  time: session.time,
                                  duration_mins: session.duration_mins,
                                  location: session.location,
                                  condition: session.condition,
                                  type: session.type,
                                  status: session.status,
                                  student: session.student,
                                  student_id: session.student_id,
                                  instructor: session.instructor,
                                  instructor_id: session.instructor_id,
                                  sessions: [session],
                                  video_url: session.video_url || '',
                                  video_urls: session.video_urls || session.video_url || '',
                                  image_url: session.image_url || '',
                                  notes: session.notes || '',
                                }, 'video');
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                              <span>+ Video</span>
                            </button>
                          )}
                          <button
                            className={`ses-btn-view-analysis ${hasMedia ? 'ses-btn-analysis-active' : 'ses-btn-analysis-muted'}`}
                            style={{ padding: '5px 10px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={hasMedia ? "View Video Analysis (Footage Attached)" : "No footage uploaded yet"}
                            onClick={(e) => {
                              e.stopPropagation();
                              const videoParam = hasMedia ? `&video=${encodeURIComponent(session.video_url)}` : '';
                              navigate(`/analysis?student=${encodeURIComponent(session.student || '')}&date=${encodeURIComponent(session.date || '')}${videoParam}&athletes=${encodeURIComponent(JSON.stringify([session.student]))}`);
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: hasMedia ? 1 : 0.6 }}>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Analysis
                          </button>
                          {canManageSessions && (
                            <button
                              type="button"
                              className="ses-btn-delete-session"
                              title="Delete this session"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingleSession(session.id, session.student);
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>
          )}
        </div>

        {/* ─── COMPREHENSIVE SESSION & GROUP MEDIA HUB MODAL ─── */}
        {selectedHubSession && (
          <div className="ses-modal-overlay" onClick={() => setSelectedHubSession(null)}>
            <div
              className="ses-modal-box ses-hub-modal"
              style={{
                maxWidth: '820px',
                width: '95%',
                height: 'min(580px, 90vh)',
                minHeight: 'min(540px, 90vh)',
                maxHeight: '90vh',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header - Clean, Light & Minimal */}
              <div
                style={{
                  padding: '16px 24px',
                  background: '#FFFFFF',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#0F172A' }}>
                      {selectedHubSession.isGroup
                        ? selectedHubSession.groupName
                        : (selectedHubSession.student ? `${selectedHubSession.student}'s Session` : 'Session Details')}
                    </h2>
                    {selectedHubSession.isGroup ? (
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                        ({selectedHubSession.sessions ? selectedHubSession.sessions.length : 1} Students)
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#0D9488',
                        background: '#CCFBF1',
                        border: '1px solid #99F6E4',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        🔒 Private to {selectedHubSession.student || 'Athlete'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: '#64748B', flexWrap: 'wrap' }}>
                    <span>{selectedHubSession.date}</span>
                    <span>•</span>
                    <span>{selectedHubSession.time}</span>
                    <span>•</span>
                    <span>Coach: <strong style={{ color: '#0F172A' }}>{selectedHubSession.instructor || 'Unassigned'}</strong></span>
                    <span>•</span>
                    <span>{selectedHubSession.location || 'Aquatic Indica Surf Beach'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isStudent ? (
                    <span
                      style={{
                        background: statusBg(hubStatus),
                        color: statusColor(hubStatus),
                        border: `1px solid ${statusColor(hubStatus)}40`,
                        borderRadius: '8px',
                        padding: '5px 10px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      {hubStatus}
                    </span>
                  ) : (() => {
                    const autoStatus = formatSessionStatus(selectedHubSession);
                    const isCompleted = hubStatus === 'Completed' || (selectedHubSession?.status || '').toLowerCase().trim() === 'completed';

                    return (
                      <select
                        value={isCompleted ? 'Completed' : (autoStatus !== 'Completed' ? autoStatus : 'Pending for Review')}
                        onChange={(e) => handleHubStatusChange(e.target.value)}
                        style={{
                          background: statusBg(isCompleted ? 'Completed' : autoStatus),
                          color: statusColor(isCompleted ? 'Completed' : autoStatus),
                          border: `1.5px solid ${statusColor(isCompleted ? 'Completed' : autoStatus)}60`,
                          borderRadius: '8px',
                          padding: '5px 12px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          outline: 'none',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}
                      >
                        {isCompleted ? (
                          <>
                            <option value="Completed">Completed</option>
                            <option value={autoStatus !== 'Completed' ? autoStatus : 'Pending for Review'}>
                              {autoStatus !== 'Completed' ? autoStatus : 'Pending for Review'}
                            </option>
                          </>
                        ) : (
                          <>
                            <option value={autoStatus !== 'Completed' ? autoStatus : 'Pending for Review'}>
                              {autoStatus !== 'Completed' ? autoStatus : 'Pending for Review'}
                            </option>
                            <option value="Completed">Completed</option>
                          </>
                        )}
                      </select>
                    );
                  })()}

                  <button
                    className="ses-modal-close"
                    onClick={() => setSelectedHubSession(null)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Navigation Tabs - Simple & Clean */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  background: '#F8FAFC',
                  padding: '8px 20px',
                  borderBottom: '1px solid #E2E8F0'
                }}
              >
                <button
                  className={`ses-modal-tab ${hubActiveTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setHubActiveTab('overview')}
                >
                  {selectedHubSession.isGroup ? `Students (${selectedHubSession.sessions ? selectedHubSession.sessions.length : 1})` : 'Athlete Profile'}
                </button>

                <button
                  className={`ses-modal-tab ${hubActiveTab === 'video' ? 'active' : ''}`}
                  onClick={() => setHubActiveTab('video')}
                >
                  Video Footage {hubVideos.length > 0 ? `(${hubVideos.length}) ✓` : ''}
                </button>

                <button
                  className={`ses-modal-tab ${hubActiveTab === 'photos' ? 'active' : ''}`}
                  onClick={() => setHubActiveTab('photos')}
                >
                  Photos {hubImages.length > 0 ? `(${hubImages.length}) ✓` : (hubImageUrl ? '✓' : '')}
                </button>

                <button
                  className={`ses-modal-tab ${hubActiveTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setHubActiveTab('notes')}
                >
                  Notes
                </button>
              </div>

              {/* Scrollable Tab Content */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                {/* ─── TAB 1: ATHLETES ROSTER ─── */}
                {hubActiveTab === 'overview' && (
                  <div>
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                      <table className="ses-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px', padding: '10px 14px' }}>#</th>
                            <th style={{ padding: '10px 14px' }}>Student Name</th>
                            <th style={{ padding: '10px 14px' }}>Level</th>
                            <th style={{ padding: '10px 14px' }}>Status</th>
                            <th style={{ textAlign: 'right', padding: '10px 14px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedHubSession.sessions || [selectedHubSession]).map((s, idx) => (
                            <tr key={s.id || idx} className="ses-table-row">
                              <td style={{ fontWeight: 600, color: '#94A3B8', padding: '12px 14px' }}>{idx + 1}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284C7', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                                    {(s.student || 'A').charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{s.student || 'Student'}</span>
                                    {(s.is_guest || s.guest_name) && (
                                      <span style={{
                                        fontSize: '11px',
                                        background: '#FEF3C7',
                                        color: '#92400E',
                                        border: '1px solid #FDE68A',
                                        borderRadius: '4px',
                                        padding: '1px 5px',
                                        fontWeight: 700,
                                        letterSpacing: '0.02em',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}>
                                        👥 Guest
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span className="ses-badge-type" style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}>
                                  {s.type || selectedHubSession.type || 'Beginner'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span className="ses-status-pill" style={{ backgroundColor: statusBg(s.status || hubStatus), color: statusColor(s.status || hubStatus), fontSize: '11px', padding: '3px 8px' }}>
                                  {s.status || hubStatus}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div className="ses-actions-row" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                                  {selectedHubSession.isGroup && (
                                    s.video_url ? (
                                      <button
                                        type="button"
                                        className="ses-btn-student-video has-video"
                                        style={{ padding: '4px 8px', fontSize: '11px' }}
                                        title={`Manage individual footage for ${s.student}`}
                                        onClick={() => {
                                          openSessionHub({
                                            isGroup: false,
                                            id: s.id,
                                            groupName: selectedHubSession.groupName,
                                            date: s.date || selectedHubSession.date,
                                            time: s.time || selectedHubSession.time,
                                            duration_mins: s.duration_mins || selectedHubSession.duration_mins,
                                            location: s.location || selectedHubSession.location,
                                            condition: s.condition || selectedHubSession.condition,
                                            type: s.type || selectedHubSession.type,
                                            status: s.status || selectedHubSession.status,
                                            student: s.student,
                                            student_id: s.student_id,
                                            instructor: s.instructor || selectedHubSession.instructor,
                                            instructor_id: s.instructor_id || selectedHubSession.instructor_id,
                                            sessions: [s],
                                            video_url: s.video_url || '',
                                            image_url: s.image_url || '',
                                            notes: s.notes || '',
                                          }, 'video');
                                        }}
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                        Video Attached
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="ses-btn-student-video no-video"
                                        style={{ padding: '4px 8px', fontSize: '11px' }}
                                        title={`Upload private video specifically for ${s.student}`}
                                        onClick={() => {
                                          openSessionHub({
                                            isGroup: false,
                                            id: s.id,
                                            groupName: selectedHubSession.groupName,
                                            date: s.date || selectedHubSession.date,
                                            time: s.time || selectedHubSession.time,
                                            duration_mins: s.duration_mins || selectedHubSession.duration_mins,
                                            location: s.location || selectedHubSession.location,
                                            condition: s.condition || selectedHubSession.condition,
                                            type: s.type || selectedHubSession.type,
                                            status: s.status || selectedHubSession.status,
                                            student: s.student,
                                            student_id: s.student_id,
                                            instructor: s.instructor || selectedHubSession.instructor,
                                            instructor_id: s.instructor_id || selectedHubSession.instructor_id,
                                            sessions: [s],
                                            video_url: s.video_url || '',
                                            image_url: s.image_url || '',
                                            notes: s.notes || '',
                                          }, 'video');
                                        }}
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                        + Video
                                      </button>
                                    )
                                  )}
                                  <button
                                    className="ses-btn-view-analysis ses-btn-analysis-active"
                                    style={{ padding: '5px 12px', fontSize: '11.5px', borderRadius: '6px' }}
                                    title="Open Video Analysis for this student"
                                    onClick={() => {
                                      const effVid = s.video_url || hubVideos[0]?.url || '';
                                      const vParam = effVid ? `&video=${encodeURIComponent(effVid)}` : '';
                                      navigate(`/analysis?student=${encodeURIComponent(s.student || '')}&date=${encodeURIComponent(s.date || selectedHubSession.date || '')}${vParam}&athletes=${encodeURIComponent(JSON.stringify([s.student]))}`);
                                    }}
                                  >
                                    Analysis
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: VIDEO & AI ANALYSIS (Multi-Video Footage Hub) ─── */}
                {hubActiveTab === 'video' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <input
                      ref={hubVideoFileRef}
                      type="file"
                      accept="video/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleHubVideoUpload(e.target.files);
                        }
                      }}
                    />

                    {/* Header Controls: Upload Buttons & Count */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                          🎥 {selectedHubSession.isGroup ? 'Group Session Video Clips' : `${selectedHubSession.student || 'Athlete'}'s Video Footage`}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, background: '#CCFBF1', color: '#0F766E', padding: '2px 8px', borderRadius: '12px', border: '1px solid #99F6E4' }}>
                          {hubVideos.length} {hubVideos.length === 1 ? 'Video' : 'Videos'} Attached
                        </span>
                      </div>
                    </div>

                    {/* Privacy notice banner */}
                    {!selectedHubSession.isGroup ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#F0FDFA',
                        border: '1.5px solid #99F6E4',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        color: '#0F766E',
                        fontSize: '12.5px'
                      }}>
                        <span style={{ fontSize: '18px' }}>🔒</span>
                        <div>
                          <strong>Private Video for {selectedHubSession.student}:</strong> This video is saved exclusively to <strong>{selectedHubSession.student}</strong>'s session record. It will only appear on this student's profile under Video Analysis and will NOT be shared with other students in the group.
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        color: '#475569',
                        fontSize: '12.5px'
                      }}>
                        <span style={{ fontSize: '18px' }}>👥</span>
                        <div>
                          <strong>Group Training Footage:</strong> Videos uploaded here apply to all students in <strong>{selectedHubSession.groupName}</strong>. To upload private footage for an individual athlete only, expand the group in the table and click <em>"+ Video"</em> on their row.
                        </div>
                      </div>
                    )}

                    {/* If Videos Exist: Video Clips Strip / List */}
                    {hubVideos.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Select Clip to Play or Analyze:
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                            Click any clip to switch player
                          </span>
                        </div>

                        {/* Horizontal Scrollable Clips Row */}
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                          {hubVideos.map((vid, idx) => {
                            const isCurrent = vid.id === hubActiveVideoId || (!hubActiveVideoId && idx === 0);
                            return (
                              <div
                                key={vid.id || idx}
                                onClick={() => setHubActiveVideoId(vid.id)}
                                style={{
                                  minWidth: '180px',
                                  maxWidth: '220px',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  border: isCurrent ? '2px solid #0D9488' : '1.5px solid #E2E8F0',
                                  background: isCurrent ? '#F0FDFA' : '#FFFFFF',
                                  boxShadow: isCurrent ? '0 0 0 3px rgba(13, 148, 136, 0.15)' : 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  flexShrink: 0
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: isCurrent ? '#0D9488' : '#64748B', background: isCurrent ? '#CCFBF1' : '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                                    Clip {idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteHubVideo(vid.id);
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '13px', padding: '2px' }}
                                    title="Delete this clip"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {vid.title || `Wave Clip ${idx + 1}`}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
                                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{vid.uploadedAt || 'Ready'}</span>
                                  <button
                                    type="button"
                                    style={{
                                      background: isCurrent ? '#0D9488' : '#F1F5F9',
                                      color: isCurrent ? '#FFFFFF' : '#0F766E',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '3px 8px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const hubStudents = (selectedHubSession.sessions || []).map(s => s.student).filter(Boolean);
                                      if (hubStudents.length === 0 && selectedHubSession.student) hubStudents.push(selectedHubSession.student);
                                      const allHubUrls = hubVideos.map(v => v.url).filter(Boolean);
                                      const activeFirst = [vid.url, ...allHubUrls.filter(u => u !== vid.url)];
                                      const videoParamVal = activeFirst.length > 1 ? JSON.stringify(activeFirst) : (vid.url || '');
                                      navigate(`/analysis?video=${encodeURIComponent(videoParamVal)}&student=${encodeURIComponent(selectedHubSession.groupName || selectedHubSession.student || '')}&date=${encodeURIComponent(selectedHubSession.date || '')}&athletes=${encodeURIComponent(JSON.stringify(hubStudents))}`);
                                    }}
                                  >
                                    ▶ Analyze
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Quick Add More Card in Row */}
                          <div
                            onClick={() => hubVideoFileRef.current?.click()}
                            style={{
                              minWidth: '130px',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: '1.5px dashed #0D9488',
                              background: '#F0FDFA',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              flexShrink: 0,
                              color: '#0D9488',
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                          >
                            <span style={{ fontSize: '20px', lineHeight: 1 }}>+</span>
                            <span>Add Video</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Active Video Player */}
                    {(() => {
                      const activeVideo = hubVideos.find(v => v.id === hubActiveVideoId) || hubVideos[0];
                      if (!activeVideo) {
                        return (
                          /* Clean Dropzone when NO videos uploaded */
                          <div>
                            <div
                              style={{
                                border: '2px dashed #0D9488',
                                borderRadius: '16px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                background: '#F0FDFA',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.05)'
                              }}
                              onClick={() => hubVideoFileRef.current?.click()}
                            >
                              <div
                                style={{
                                  width: '58px',
                                  height: '58px',
                                  borderRadius: '50%',
                                  background: '#0D948818',
                                  color: '#0D9488',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto 14px'
                                }}
                              >
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M23 7l-7 5 7 5V7z"/>
                                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                </svg>
                              </div>

                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '6px', fontFamily: 'Outfit, sans-serif' }}>
                                {hubIsUploadingVideo ? 'Uploading Video(s) to AWS Cloud…' : 'Click to Upload Multiple Wave Videos'}
                              </div>
                              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                                {hubIsUploadingVideo ? 'Processing video files...' : 'Select one or multiple MP4, MOV, WebM clips from your device or camera'}
                              </p>
                              {hubIsUploadingVideo && (
                                <div style={{ marginTop: '12px' }}>
                                  <div className="ses-spinner" style={{ width: '26px', height: '26px', margin: '0 auto' }} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                                ▶ Playing: {activeVideo.title}
                              </span>
                            </div>
                            {!isStudent && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  className="ses-btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  onClick={() => hubVideoFileRef.current?.click()}
                                  disabled={hubIsUploadingVideo}
                                >
                                  + Upload More Videos
                                </button>
                                <button
                                  type="button"
                                  style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                  onClick={() => handleDeleteHubVideo(activeVideo.id)}
                                >
                                  🗑️ Remove Clip
                                </button>
                              </div>
                            )}
                          </div>

                          <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#0F172A', border: '2px solid #334155', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                            <video key={activeVideo.url} src={activeVideo.url} controls style={{ width: '100%', maxHeight: '320px', display: 'block' }} />
                          </div>

                          {/* Direct Launch AI Analysis CTA */}
                          <div style={{ marginTop: '16px', background: '#F0FDFA', border: '1.5px solid #0D948840', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                                🚀 Ready for AI Pose & Wave Analysis
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                Analyze pop-up speed, stance balance, wave trajectory & posture for <strong>{activeVideo.title}</strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="ses-btn-primary"
                              style={{ padding: '9px 18px', fontSize: '13px' }}
                              onClick={() => {
                                const hubStudents = (selectedHubSession.sessions || []).map(s => s.student).filter(Boolean);
                                if (hubStudents.length === 0 && selectedHubSession.student) hubStudents.push(selectedHubSession.student);
                                const allHubUrls = hubVideos.map(v => v.url).filter(Boolean);
                                const activeFirst = [activeVideo.url, ...allHubUrls.filter(u => u !== activeVideo.url)];
                                const videoParamVal = activeFirst.length > 1 ? JSON.stringify(activeFirst) : (activeVideo.url || '');
                                navigate(`/analysis?video=${encodeURIComponent(videoParamVal)}&student=${encodeURIComponent(selectedHubSession.groupName || selectedHubSession.student || '')}&date=${encodeURIComponent(selectedHubSession.date || '')}&athletes=${encodeURIComponent(JSON.stringify(hubStudents))}`);
                              }}
                            >
                              Launch AI Video Analysis ↗
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ─── TAB 3: ACTION PHOTOS & IMAGES (MULTIPLE GALLERY) ─── */}
                {hubActiveTab === 'photos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <input
                      ref={hubImageFileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleHubImageUpload(e.target.files);
                        }
                      }}
                    />

                    {hubImages.length > 0 ? (
                      <div>
                        {/* Gallery Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                              📸 Session Photos ({hubImages.length})
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              • Click photo to view fullscreen
                            </span>
                          </div>
                          {!isStudent && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="ses-btn-secondary"
                                style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                                onClick={() => hubImageFileRef.current?.click()}
                                disabled={hubIsUploadingImage}
                              >
                                <span>+</span> Upload More Photos
                              </button>
                              <button
                                type="button"
                                style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                  const targetId = hubActiveImageId || hubImages[0]?.id;
                                  if (targetId) handleDeleteHubImage(targetId);
                                }}
                              >
                                🗑️ Remove Photo
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Active Hero Image */}
                        {(() => {
                          const activePhoto = hubImages.find(img => img.id === hubActiveImageId) || hubImages[0];
                          if (!activePhoto) return null;
                          const activeIdx = hubImages.findIndex(img => img.id === activePhoto.id);
                          return (
                            <div>
                              <div
                                style={{
                                  borderRadius: '14px',
                                  overflow: 'hidden',
                                  border: '2px solid #334155',
                                  background: '#0F172A',
                                  height: '380px',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                                }}
                                onClick={() => setHubZoomImage(activePhoto.url)}
                                title="Click to view full screen"
                              >
                                <img
                                  src={activePhoto.url}
                                  alt={activePhoto.title || 'Session Action Shot'}
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  bottom: '12px',
                                  left: '14px',
                                  background: 'rgba(15, 23, 42, 0.75)',
                                  backdropFilter: 'blur(6px)',
                                  color: '#FFFFFF',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600
                                }}>
                                  Photo {activeIdx + 1} of {hubImages.length} • {activePhoto.title}
                                </div>
                                <div style={{
                                  position: 'absolute',
                                  top: '12px',
                                  right: '12px',
                                  background: 'rgba(15, 23, 42, 0.75)',
                                  backdropFilter: 'blur(6px)',
                                  color: '#FFFFFF',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  🔍 Click to Zoom
                                </div>
                              </div>

                              {/* Multiple Photos Thumbnails Strip */}
                              <div style={{ marginTop: '14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Gallery Thumbnails ({hubImages.length})
                                </div>
                                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                                  {hubImages.map((img, idx) => {
                                    const isSelected = (hubActiveImageId === img.id) || (!hubActiveImageId && idx === 0);
                                    return (
                                      <div
                                        key={img.id || idx}
                                        style={{
                                          width: '76px',
                                          height: '58px',
                                          flexShrink: 0,
                                          borderRadius: '8px',
                                          overflow: 'hidden',
                                          cursor: 'pointer',
                                          border: isSelected ? '2.5px solid #0D9488' : '1.5px solid #CBD5E1',
                                          position: 'relative',
                                          background: '#0F172A',
                                          boxShadow: isSelected ? '0 0 0 2px rgba(13, 148, 136, 0.3)' : 'none',
                                          transition: 'all 0.15s ease'
                                        }}
                                        onClick={() => {
                                          setHubActiveImageId(img.id);
                                          setHubImageUrl(img.url);
                                        }}
                                      >
                                        <img src={img.url} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        {!isStudent && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteHubImage(img.id);
                                            }}
                                            style={{
                                              position: 'absolute',
                                              top: '2px',
                                              right: '2px',
                                              background: 'rgba(239, 68, 68, 0.9)',
                                              color: '#FFFFFF',
                                              border: 'none',
                                              borderRadius: '50%',
                                              width: '18px',
                                              height: '18px',
                                              fontSize: '11px',
                                              fontWeight: 800,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              padding: 0
                                            }}
                                            title="Delete this photo"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Quick Add Thumbnail Card */}
                                  {!isStudent && (
                                    <div
                                      style={{
                                        width: '76px',
                                        height: '58px',
                                        flexShrink: 0,
                                        borderRadius: '8px',
                                        border: '1.5px dashed #0D9488',
                                        background: '#F0FDFA',
                                        color: '#0D9488',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        gap: '2px'
                                      }}
                                      onClick={() => hubImageFileRef.current?.click()}
                                      title="Add more photos"
                                    >
                                      <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
                                      <span>Add</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* Clean Dropzone for Uploading Multiple Images */
                      <div>
                        <div
                          style={{
                            border: '2px dashed #0284C7',
                            borderRadius: '16px',
                            padding: '36px 20px',
                            textAlign: 'center',
                            background: '#F0F9FF',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)'
                          }}
                          onClick={() => hubImageFileRef.current?.click()}
                        >
                          <div
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '50%',
                              background: '#0284C718',
                              color: '#0284C7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto 14px'
                            }}
                          >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>

                          <div style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', marginBottom: '6px', fontFamily: 'Outfit, sans-serif' }}>
                            {hubIsUploadingImage ? 'Uploading Photos to AWS Cloud…' : 'Click to Upload Multiple Session Photos'}
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                            {hubIsUploadingImage ? 'Processing photo files...' : 'Select multiple JPG, PNG, WebP photos taken during the session'}
                          </p>
                          {hubIsUploadingImage && (
                            <div style={{ marginTop: '12px' }}>
                              <div className="ses-spinner" style={{ width: '26px', height: '26px', margin: '0 auto' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 4: COACH NOTES & OBJECTIVES ─── */}
                {hubActiveTab === 'notes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                        📝 Coach Feedback, Wave Counts & Tactical Briefing
                      </label>
                      <textarea
                        rows="6"
                        placeholder={isStudent ? "No coach notes available yet..." : "Add training goals, wave count, board setup notes, pop-up corrections, or student feedback for this session..."}
                        value={hubNotes}
                        readOnly={isStudent}
                        onChange={(e) => {
                          setHubNotes(e.target.value);
                          setHubHasChanges(true);
                          setHubSaveSuccess(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Sticky Action Footer */}
              <div
                style={{
                  padding: '14px 24px',
                  background: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  borderRadius: '0 0 16px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div>
                  {hubSaveSuccess ? (
                    <span style={{ color: '#0D9488', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F0FDFA', border: '1px solid #99F6E4', padding: '6px 12px', borderRadius: '8px' }}>
                      ✓ All changes saved successfully!
                    </span>
                  ) : canManageSessions ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="ses-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', borderRadius: '8px' }}
                        onClick={() => handleOpenEditSession(selectedHubSession)}
                      >
                        Edit Session
                      </button>
                      <button
                        type="button"
                        style={{ padding: '6px 14px', fontSize: '12px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          if (selectedHubSession.isGroup) {
                            handleDeleteGroupSessions(selectedHubSession);
                          } else {
                            const targetSessionId = selectedHubSession.sessions ? selectedHubSession.sessions[0]?.id : selectedHubSession.id;
                            handleDeleteSingleSession(targetSessionId, selectedHubSession.student);
                          }
                          setSelectedHubSession(null);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    onClick={() => setSelectedHubSession(null)}
                    disabled={hubIsSaving}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '7px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: hubHasChanges ? '#0D9488' : '#CBD5E1',
                      color: hubHasChanges ? '#FFFFFF' : '#64748B',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: hubHasChanges ? 'pointer' : 'default',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: hubHasChanges ? '0 2px 10px rgba(13, 148, 136, 0.3)' : 'none'
                    }}
                    onClick={hubHasChanges ? handleSaveHubChanges : undefined}
                    disabled={hubIsSaving || !hubHasChanges}
                  >
                    {hubIsSaving ? (
                      <>
                        <span className="ses-spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', display: 'inline-block' }} />
                        Saving…
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zoom Photo Lightbox */}
        {hubZoomImage && (
          <div className="ses-modal-overlay" style={{ zIndex: 1200 }} onClick={() => setHubZoomImage(null)}>
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
              <button
                style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
                onClick={() => setHubZoomImage(null)}
              >
                ✕
              </button>
              <img src={hubZoomImage} alt="Zoomed" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', display: 'block' }} />
            </div>
          </div>
        )}

        {/* Group Video Upload Modal */}
        {showGroupVideoModal && selectedGroupForVideo && (
          <div className="ses-modal-overlay" onClick={() => setShowGroupVideoModal(false)}>
            <div className="ses-modal-box" style={{ maxWidth: '480px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#0D948815', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D9488' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Upload Group Video</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                      Select 1 video file for <strong>{selectedGroupForVideo.sessions.length} students</strong> in {selectedGroupForVideo.groupName}
                    </p>
                  </div>
                </div>
                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: '20px' }} onClick={() => setShowGroupVideoModal(false)}>✕</button>
              </div>

              {/* Clean File Upload Dropzone */}
              <input
                ref={groupFileInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleGroupFileSelect}
              />

              <div
                style={{
                  border: '2px dashed #0D9488',
                  borderRadius: '12px',
                  padding: '28px 16px',
                  textAlign: 'center',
                  background: '#F0FDFA',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '20px'
                }}
                onClick={() => groupFileInputRef.current?.click()}
              >
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#0D948818',
                  color: '#0D9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>

                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  {selectedGroupFile ? selectedGroupFile.name : 'Click to Upload Video File'}
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                  {selectedGroupFile
                    ? `${(selectedGroupFile.size / (1024 * 1024)).toFixed(1)} MB · Ready to attach`
                    : 'Select video (MP4, MOV, WebM) from your device'}
                </p>
              </div>

              {/* Video Preview if file selected or video exists */}
              {groupVideoInput.trim() && (
                <div style={{ marginBottom: '20px', borderRadius: '10px', overflow: 'hidden', background: '#0F172A', border: '1px solid #334155' }}>
                  <video src={groupVideoInput} controls style={{ width: '100%', maxHeight: '180px', display: 'block' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  onClick={() => setShowGroupVideoModal(false)}
                  disabled={isSavingGroupVideo}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)', color: '#FFFFFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  onClick={handleSaveGroupVideo}
                  disabled={isSavingGroupVideo || !groupVideoInput.trim()}
                >
                  {isSavingGroupVideo ? 'Uploading Video…' : `Upload & Save for ${selectedGroupForVideo.sessions.length} Students`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Pro Calendar Modal (Assigned Sessions & Group Rosters Only) */}
        {showCalendarModal && (
          <div className="ses-modal-overlay" onClick={() => { setShowCalendarModal(false); setSelectedSessionDetail(null); }}>
            <div className="ses-modal-box" onClick={(e) => e.stopPropagation()}>
              {/* Modal Topbar */}
              <div className="ses-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="ses-modal-icon-badge">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontFamily: 'Outfit, sans-serif', color: '#050B1A', fontWeight: 700 }}>
                      Surf Sessions Calendar & Roster
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                      Visual schedule of assigned training sessions, groups & student rosters
                    </p>
                  </div>
                </div>

                <button className="ses-modal-close" onClick={() => { setShowCalendarModal(false); setSelectedSessionDetail(null); }}>✕</button>
              </div>

              {/* Modal Body */}
              <div className="ses-modal-content-scroll">
                
                {/* MONTHLY INTERACTIVE CALENDAR VIEW */}
                <div className="ses-cal-month-view">
                  {/* Month Navigator Header */}
                  <div className="ses-cal-nav-bar">
                    <div className="ses-cal-month-title">
                      {MONTH_NAMES[month]} {year}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="ses-cal-nav-btn" onClick={handlePrevMonth}>‹ Prev</button>
                      <button
                        className="ses-cal-nav-btn"
                        onClick={() => {
                          if (assignedDatesList.length > 0) {
                            const first = assignedDatesList[0];
                            const parts = first.iso.split('-');
                            if (parts.length === 3) {
                              setCurrentDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
                              setSelectedCalendarDate(first.iso);
                            }
                          } else {
                            setCurrentDate(new Date());
                          }
                        }}
                      >
                        Active Month
                      </button>
                      <button className="ses-cal-nav-btn" onClick={handleNextMonth}>Next ›</button>
                    </div>
                  </div>

                  {/* Weekday Names Header */}
                  <div className="ses-cal-grid-header">
                    {DAYS_OF_WEEK.map(d => (
                      <div key={d} className="ses-cal-grid-th">{d}</div>
                    ))}
                  </div>

                    {/* Days Matrix */}
                    {(() => {
                      const todayObj = new Date();
                      const todayISO = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

                      return (
                        <div className="ses-cal-days-grid">
                          {/* Blank pads for start of month */}
                          {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`pad-${i}`} className="ses-cal-day-cell empty"></div>
                          ))}

                          {/* Day cells */}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const cellISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            const daySessions = sessionsByISO[cellISO] || [];
                            const isSelected = selectedCalendarDate && (normalizeToYYYYMMDD(selectedCalendarDate) === cellISO);
                            const hasSessions = daySessions.length > 0;
                            const isToday = cellISO === todayISO;
                            const isPastDate = cellISO < todayISO;

                            // Count groups for clean summary
                            const dayGroups = {};
                            let ungroupedCount = 0;
                            daySessions.forEach(s => {
                              const grp = s.group_name || (s.notes && s.notes.includes(' - Automated') ? s.notes.split(' - Automated')[0].trim() : null);
                              if (grp) {
                                dayGroups[grp] = (dayGroups[grp] || 0) + 1;
                              } else {
                                ungroupedCount++;
                              }
                            });

                            return (
                              <div
                                key={dayNum}
                                className={`ses-cal-day-cell ${isSelected ? 'selected' : ''} ${hasSessions ? 'has-sessions' : ''} ${isToday ? 'today' : ''} ${isPastDate ? 'past-date' : ''}`}
                                style={{
                                  backgroundColor: isToday
                                    ? (isSelected ? '#DBEAFE' : '#EFF6FF')
                                    : isSelected
                                      ? 'rgba(13, 148, 136, 0.08)'
                                      : isPastDate
                                        ? '#F8FAFC'
                                        : (hasSessions ? '#F0FDFA' : '#FFFFFF'),
                                  borderColor: isToday
                                    ? '#2563EB'
                                    : isSelected
                                      ? '#0D9488'
                                      : isPastDate
                                        ? '#E2E8F0'
                                        : (hasSessions ? '#5EEAD4' : '#CBD5E1'),
                                  boxShadow: isToday ? '0 0 0 2px rgba(37, 99, 235, 0.25)' : undefined,
                                  opacity: isPastDate && !hasSessions ? 0.65 : 1,
                                  cursor: isPastDate && !hasSessions ? 'default' : 'pointer'
                                }}
                                title={isPastDate ? `${cellISO} (Past Date - Cannot create session)` : `Date: ${cellISO}`}
                                onClick={() => {
                                  setSelectedCalendarDate(cellISO);
                                  setSelectedDayDetailsModal(cellISO);
                                }}
                              >
                                <div className="ses-cal-day-num">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      fontWeight: (isToday || hasSessions || isSelected) ? 700 : 500,
                                      color: isToday ? '#1D4ED8' : isSelected ? '#0D9488' : isPastDate ? '#94A3B8' : (hasSessions ? '#0F766E' : '#334155')
                                    }}>
                                      {dayNum}
                                    </span>
                                    {isToday && (
                                      <span style={{
                                        background: '#2563EB',
                                        color: '#FFFFFF',
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        letterSpacing: '0.4px'
                                      }}>
                                        TODAY
                                      </span>
                                    )}
                                  </div>

                                  {hasSessions && (
                                    <span className="ses-cal-session-count-badge" style={{ background: isToday ? '#2563EB' : '#0D9488', color: '#FFFFFF' }}>
                                      {daySessions.length} {daySessions.length === 1 ? 'slot' : 'slots'}
                                    </span>
                                  )}
                                  {isPastDate && !hasSessions && (
                                    <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>Past</span>
                                  )}
                                </div>

                                {/* Session Pills Inside Day */}
                                <div className="ses-cal-day-events">
                                  {Object.entries(dayGroups)
                                    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                                    .map(([gName, count]) => (
                                    <div
                                      key={gName}
                                      className="ses-cal-event-pill"
                                      style={{
                                        borderLeftColor: isToday ? '#2563EB' : '#0D9488',
                                        backgroundColor: isToday ? '#DBEAFE' : '#CCFBF1',
                                        color: isToday ? '#1E40AF' : '#0F766E',
                                        fontWeight: 600,
                                        fontSize: '11px',
                                        padding: '2px 6px',
                                        cursor: 'pointer'
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCalendarDate(cellISO);
                                        setSelectedDayDetailsModal(cellISO);
                                      }}
                                      title={`Click to view ${gName} roster & details`}
                                    >
                                      🏄‍♂️ {gName} ({count})
                                    </div>
                                  ))}
                                  {ungroupedCount > 0 && (
                                    daySessions.filter(s => !s.group_name && (!s.notes || !s.notes.includes(' - Automated'))).slice(0, 2).map(s => (
                                      <div
                                        key={s.id}
                                        className="ses-cal-event-pill"
                                        style={{
                                          borderLeftColor: statusColor(s.status, s.date),
                                          backgroundColor: statusBg(s.status, s.date),
                                          cursor: 'pointer'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCalendarDate(cellISO);
                                          setSelectedDayDetailsModal(cellISO);
                                        }}
                                        title="Click to view session details"
                                      >
                                        <strong>{s.time}</strong> {s.student}
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* Quick + Create Button for Future/Today Dates */}
                                {!isPastDate && canManageSessions && (
                                  <button
                                    type="button"
                                    className="ses-cal-add-btn"
                                    style={{
                                      marginTop: 'auto',
                                      width: '100%',
                                      padding: '3px 6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      borderRadius: '6px',
                                      border: isSelected ? '1px solid #0D9488' : '1px dashed #99F6E4',
                                      background: isSelected ? '#0D9488' : '#F0FDFA',
                                      color: isSelected ? '#FFFFFF' : '#0F766E',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCalendarDate(cellISO);
                                      setScheduleModalInitialDate(cellISO);
                                      setShowScheduleModal(true);
                                    }}
                                    title={`Click to schedule session on ${cellISO}`}
                                  >
                                    + Create
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                {/* Selected Date Details Roster Section (Embedded below calendar) */}
                {selectedCalendarDate && (
                  <div className="ses-cal-day-drawer" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#0D9488', color: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', fontSize: '16px' }}>
                          📅
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', color: '#0F172A', fontWeight: 700 }}>
                            {formatCalendarLongDate(selectedCalendarDate)}
                          </h3>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            {activeDaySessions.length} total session{activeDaySessions.length === 1 ? '' : 's'} scheduled
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {canManageSessions && normalizeToYYYYMMDD(selectedCalendarDate) >= getTodayYYYYMMDD() && (
                          <button
                            type="button"
                            className="ses-btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setScheduleModalInitialDate(selectedCalendarDate);
                              setShowScheduleModal(true);
                            }}
                          >
                            + Schedule on this Date
                          </button>
                        )}
                        <button
                          type="button"
                          className="ses-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => {
                            setDateFilter(selectedCalendarDate);
                            setShowCalendarModal(false);
                          }}
                        >
                          Filter in Table →
                        </button>
                      </div>
                    </div>

                    {activeDaySessions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '28px 16px', background: '#FFFFFF', borderRadius: '10px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>🏄‍♂️</div>
                        <div style={{ fontWeight: 600, color: '#334155' }}>No surf sessions scheduled on this date</div>
                        <div style={{ fontSize: '12px', marginTop: '2px' }}>Click "+ Schedule on this Date" to organize training groups.</div>
                      </div>
                    ) : (
                      <div className="ses-cal-drawer-cards">
                        {activeDayGroups.groupedList.map(grp => (
                          <div
                            key={grp.key || grp.groupName}
                            className="ses-cal-drawer-item"
                            style={{ cursor: 'default' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <h4 style={{ margin: '0 0 2px', fontSize: '15px', color: '#0F172A', fontWeight: 700 }}>
                                  🏄‍♂️ {grp.groupName}
                                </h4>
                                <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 600 }}>
                                  ⏰ {grp.time}
                                </span>
                              </div>
                              <span
                                className="ses-status-pill"
                                style={{
                                  backgroundColor: statusBg(grp),
                                  color: statusColor(grp),
                                  fontSize: '11px',
                                  padding: '2px 8px'
                                }}
                              >
                                {formatSessionStatus(grp)}
                              </span>
                            </div>

                            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>Coach: <strong style={{ color: '#0F172A' }}>{grp.instructor || 'Assigned Coach'}</strong></span>
                              {grp.location && <span>&bull; 🌊 {grp.location}</span>}
                            </div>

                            {/* Students list chips */}
                            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '10px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                Students ({grp.sessions.length}):
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {grp.sessions.map((sess, sIdx) => (
                                  <span
                                    key={sess.id || sIdx}
                                    style={{
                                      background: '#FFFFFF',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '6px',
                                      padding: '2px 8px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#0F172A',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    👤 {sess.student}
                                    <span style={{ fontSize: '10px', color: '#0D9488' }}>({sess.type || 'General'})</span>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="ses-btn-secondary"
                                style={{ flex: 1, padding: '6px 12px', fontSize: '11.5px', justifyContent: 'center' }}
                                onClick={() => {
                                  setDateFilter(grp.date || selectedCalendarDate);
                                  setShowCalendarModal(false);
                                }}
                              >
                                View in Sessions Table →
                              </button>
                            </div>
                          </div>
                        ))}

                        {activeDayGroups.ungroupedList.map((sess, uIdx) => (
                          <div
                            key={sess.id || uIdx}
                            className="ses-cal-drawer-item"
                            style={{ cursor: 'default' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <h4 style={{ margin: '0 0 2px', fontSize: '14px', color: '#0F172A', fontWeight: 700 }}>
                                  👤 {sess.student}
                                </h4>
                                <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 600 }}>
                                  ⏰ {sess.time}
                                </span>
                              </div>
                              <span
                                className="ses-status-pill"
                                style={{
                                  backgroundColor: statusBg(sess),
                                  color: statusColor(sess),
                                  fontSize: '11px',
                                  padding: '2px 8px'
                                }}
                              >
                                {formatSessionStatus(sess)}
                              </span>
                            </div>

                            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                              Coach: <strong style={{ color: '#0F172A' }}>{sess.instructor || 'Assigned Coach'}</strong>
                              {sess.location && <span> &bull; 🌊 {sess.location}</span>}
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="ses-btn-secondary"
                                style={{ flex: 1, padding: '6px 10px', fontSize: '11.5px', justifyContent: 'center' }}
                                onClick={() => setSelectedSessionDetail(sess)}
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Day Details Popup Modal (Triggered on date touch/click) */}
            {selectedDayDetailsModal && (() => {
              const targetISO = selectedDayDetailsModal;
              const targetDaySessions = sessionsByISO[targetISO] || roleScopedSessions.filter(s => normalizeToYYYYMMDD(s.date) === targetISO);
              const { groups: modalGroups, ungrouped: modalUngrouped } = buildSessionGrouping(targetDaySessions);
              const isPast = targetISO < getTodayYYYYMMDD();
              const isToday = targetISO === getTodayYYYYMMDD();

              return (
                <div className="ses-modal-overlay" style={{ zIndex: 10002 }} onClick={() => setSelectedDayDetailsModal(null)}>
                  <div
                    className="ses-modal-box"
                    style={{ maxWidth: '640px', width: '92%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFFFFF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>📅</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                              {formatCalendarLongDate(targetISO)}
                            </h3>
                            {isToday && (
                              <span style={{ background: '#2563EB', color: '#FFFFFF', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                                TODAY
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                            {targetDaySessions.length} total session{targetDaySessions.length === 1 ? '' : 's'} scheduled &bull; {modalGroups.length} group{modalGroups.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                      <button
                        className="ses-modal-close"
                        style={{ width: '28px', height: '28px', fontSize: '12px', color: '#FFFFFF', background: 'rgba(255,255,255,0.1)' }}
                        onClick={() => setSelectedDayDetailsModal(null)}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', background: '#F8FAFC', flex: 1 }}>
                      {targetDaySessions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 16px', background: '#FFFFFF', borderRadius: '12px', border: '1.5px dashed #CBD5E1' }}>
                          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏖️</div>
                          <h4 style={{ margin: '0 0 6px', color: '#0F172A', fontSize: '16px', fontWeight: 700 }}>
                            No Sessions Scheduled
                          </h4>
                          <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: '13px' }}>
                            No surf coaching sessions are scheduled for {formatCalendarLongDate(targetISO)}.
                          </p>
                          {canManageSessions && !isPast && (
                            <button
                              type="button"
                              className="ses-btn-primary"
                              style={{ margin: '0 auto' }}
                              onClick={() => {
                                setScheduleModalInitialDate(targetISO);
                                setShowScheduleModal(true);
                                setSelectedDayDetailsModal(null);
                              }}
                            >
                              + Schedule Session for this Date
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Groups list */}
                          {modalGroups.map(grp => {
                            const statusColorCode = statusColor(grp);
                            const statusBgCode = statusBg(grp);
                            return (
                              <div
                                key={grp.key || grp.groupName}
                                style={{
                                  background: '#FFFFFF',
                                  border: '1.5px solid #E2E8F0',
                                  borderRadius: '12px',
                                  padding: '16px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                  <div>
                                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>
                                      🏄‍♂️ {grp.groupName}
                                    </h4>
                                    <div style={{ fontSize: '13px', color: '#0D9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>⏰ {grp.time || '08:30 AM'}</span>
                                      {grp.duration_mins && <span>({grp.duration_mins} mins)</span>}
                                    </div>
                                  </div>
                                  <span
                                    className="ses-status-pill"
                                    style={{
                                      backgroundColor: statusBgCode,
                                      color: statusColorCode,
                                      whiteSpace: 'nowrap',
                                      fontSize: '11px',
                                      padding: '3px 9px'
                                    }}
                                  >
                                    <span className="ses-status-dot" style={{ backgroundColor: statusColorCode }}></span>
                                    {formatSessionStatus(grp)}
                                  </span>
                                </div>

                                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span>Coach: <strong style={{ color: '#0F172A' }}>{grp.instructor || 'Assigned Coach'}</strong></span>
                                  {grp.location && <span>&bull; 🌊 Spot: <strong style={{ color: '#0F172A' }}>{grp.location}</strong></span>}
                                </div>

                                {/* Enrolled Students */}
                                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Enrolled Students ({grp.sessions.length}):
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {grp.sessions.map((sess, sIdx) => (
                                      <div
                                        key={sess.id || sIdx}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          background: '#FFFFFF',
                                          border: '1px solid #E2E8F0',
                                          borderRadius: '8px',
                                          padding: '6px 10px'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <UserAvatar src={sess.image || ''} name={sess.student} size={26} />
                                          <div>
                                            <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                                              {sess.student}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>
                                              &bull; {sess.type || 'General'}
                                            </span>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          className="ses-btn-secondary"
                                          style={{ padding: '3px 8px', fontSize: '11px' }}
                                          onClick={() => setSelectedSessionDetail(sess)}
                                        >
                                          Details
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Group Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    className="ses-btn-secondary"
                                    style={{ flex: 1, padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, justifyContent: 'center' }}
                                    onClick={() => {
                                      setDateFilter(targetISO);
                                      setShowCalendarModal(false);
                                      setSelectedDayDetailsModal(null);
                                    }}
                                  >
                                    View in Sessions Table →
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Ungrouped sessions */}
                          {modalUngrouped.map((sess, uIdx) => (
                            <div
                              key={sess.id || uIdx}
                              style={{
                                background: '#FFFFFF',
                                border: '1.5px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '14px 16px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <UserAvatar src={sess.image || ''} name={sess.student} size={32} />
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '14.5px', color: '#0F172A', fontWeight: 700 }}>
                                      {sess.student}
                                    </h4>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                                      ⏰ {sess.time} &bull; Coach: {sess.instructor || 'Coach'}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="ses-btn-secondary"
                                    style={{ padding: '5px 12px', fontSize: '12px' }}
                                    onClick={() => setSelectedSessionDetail(sess)}
                                  >
                                    Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
                      {canManageSessions && !isPast ? (
                        <button
                          type="button"
                          className="ses-btn-primary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => {
                            setScheduleModalInitialDate(targetISO);
                            setShowScheduleModal(true);
                            setSelectedDayDetailsModal(null);
                          }}
                        >
                          + Schedule on this Date
                        </button>
                      ) : <div />}

                      <button
                        type="button"
                        className="ses-btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                        onClick={() => setSelectedDayDetailsModal(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

              {/* Single Session Detail Popup (When clicked) */}
              {selectedSessionDetail && (
                <div className="ses-detail-popup-overlay" onClick={() => setSelectedSessionDetail(null)}>
                  <div className="ses-detail-popup" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🏄‍♂️</span>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#050B1A', fontFamily: 'Outfit, sans-serif' }}>
                          Session Details
                        </h3>
                      </div>
                      <button className="ses-modal-close" style={{ width: '28px', height: '28px', fontSize: '12px' }} onClick={() => setSelectedSessionDetail(null)}>✕</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Student</span>
                        <span className="ses-detail-val" style={{ fontWeight: 700, color: '#0F172A' }}>{selectedSessionDetail.student}</span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Instructor / Coach</span>
                        <span className="ses-detail-val" style={{ color: '#0F766E', fontWeight: 600 }}>{selectedSessionDetail.instructor}</span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Date & Time</span>
                        <span className="ses-detail-val">{selectedSessionDetail.date} at {selectedSessionDetail.time} ({selectedSessionDetail.duration_mins}m)</span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Surf Spot</span>
                        <span className="ses-detail-val">🌊 {selectedSessionDetail.location}</span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Ocean Conditions</span>
                        <span className="ses-badge-cond" style={{ backgroundColor: `${conditionColor(selectedSessionDetail.condition)}18`, color: conditionColor(selectedSessionDetail.condition) }}>
                          {selectedSessionDetail.condition}
                        </span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Status</span>
                        <span className="ses-status-pill" style={{ backgroundColor: statusBg(selectedSessionDetail.status), color: statusColor(selectedSessionDetail.status) }}>
                          {selectedSessionDetail.status}
                        </span>
                      </div>
                      {selectedSessionDetail.notes && (
                        <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Coach Notes:</span>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#334155' }}>{selectedSessionDetail.notes}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button
                        className="ses-btn-primary"
                        style={{ flex: 1, padding: '10px' }}
                        onClick={() => {
                          const videoParam = selectedSessionDetail.video_url ? `&video=${encodeURIComponent(selectedSessionDetail.video_url)}` : '';
                          navigate(`/analysis?student=${encodeURIComponent(selectedSessionDetail.student || '')}&date=${encodeURIComponent(selectedSessionDetail.date || '')}${videoParam}&athletes=${encodeURIComponent(JSON.stringify([selectedSessionDetail.student]))}`);
                        }}
                      >
                        Launch AI Video Analysis
                      </button>
                      {!isStudent && (
                        <button
                          className="ses-btn-secondary"
                          onClick={() => navigate(`/sessions/${selectedSessionDetail.id}/edit`)}
                        >
                          Edit Slot
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ─── SCHEDULE SESSION POPUP MODAL (STEP 1, 2, 3 WIZARD) ─── */}
        {showScheduleModal && canManageSessions && (
          <NewSession
            isModal={true}
            initialDate={scheduleModalInitialDate}
            onClose={() => {
              setShowScheduleModal(false);
              if (searchParams.get('action') === 'new_session' || searchParams.get('action') === 'schedule' || searchParams.get('new_session') === 'true') {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('action');
                newParams.delete('new_session');
                setSearchParams(newParams, { replace: true });
              }
            }}
            onSessionCreated={() => {
              setShowScheduleModal(false);
              if (searchParams.get('action') === 'new_session' || searchParams.get('action') === 'schedule' || searchParams.get('new_session') === 'true') {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('action');
                newParams.delete('new_session');
                setSearchParams(newParams, { replace: true });
              }
              fetchSessions();
            }}
          />
        )}

        {/* ─── EDIT SESSION WIZARD (NewSession pre-filled) ─── */}
        {editSessionData && canManageSessions && (
          <NewSession
            isModal={true}
            editSession={editSessionData}
            onClose={() => {
              setEditSessionData(null);
            }}
            onSessionCreated={() => {
              setEditSessionData(null);
              setSelectedHubSession(null);
              showToast('Session updated successfully', 'success');
              fetchSessions();
            }}
          />
        )}

        {/* In-App Confirmation Modal (Replaces Native Browser window.confirm) */}
        {confirmModal.isOpen && (
          <div
            className="ses-confirm-overlay"
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
              animation: 'sesFadeIn 0.15s ease-out'
            }}
          >
            <div
              className="ses-confirm-box"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '28px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                animation: 'sesPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: confirmModal.isDanger ? '#FEE2E2' : '#EFF6FF',
                  color: confirmModal.isDanger ? '#EF4444' : '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {confirmModal.isDanger ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                    {confirmModal.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#64748B' }}>
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    color: '#475569',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: confirmModal.isDanger ? '#EF4444' : '#0D9488',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: confirmModal.isDanger ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(13, 148, 136, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = confirmModal.isDanger ? '#DC2626' : '#0F766E'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = confirmModal.isDanger ? '#EF4444' : '#0D9488'; }}
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In-App Toast Notification (Replaces Native Browser alert) */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#FFFFFF',
              border: `1.5px solid ${toast.type === 'error' ? '#FECACA' : toast.type === 'info' ? '#BAE6FD' : '#A7F3D0'}`,
              borderRadius: '14px',
              padding: '12px 20px',
              boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18)',
              animation: 'sesSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              maxWidth: '90%',
              width: 'max-content'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: toast.type === 'error' ? '#FEE2E2' : toast.type === 'info' ? '#E0F2FE' : '#D1FAE5',
              color: toast.type === 'error' ? '#EF4444' : toast.type === 'info' ? '#0284C7' : '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {toast.type === 'error' ? '✕' : toast.type === 'info' ? 'ℹ' : '✓'}
            </div>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
              {toast.message}
            </span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '2px 4px',
                marginLeft: '8px',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Coach Profile & Student Review Modal */}
        <CoachProfileModal
          isOpen={Boolean(selectedCoachForModal)}
          onClose={() => setSelectedCoachForModal(null)}
          coachId={selectedCoachForModal?.id}
          coachName={selectedCoachForModal?.name}
          currentUser={currentUser}
        />
      </main>

      <style>{`
        .ses-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; padding-top: 0px; box-sizing: border-box; width: 100%; }
        .ses-main { flex: 1; padding: 24px 40px 120px 40px; display: flex; flex-direction: column; gap: 24px; width: 100%; box-sizing: border-box; }

        /* Header */
        .ses-header { display: flex; justify-content: space-between; align-items: center; }
        .ses-title { font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 700; color: #050B1A; margin: 0; }
        .ses-live-pill {
          display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px;
          background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3);
          border-radius: 20px; font-size: 11px; font-weight: 700; color: #0D9488; letter-spacing: 0.5px;
        }
        .ses-pulsing-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #0D9488;
          box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.7); animation: ses-pulse 1.8s infinite;
        }
        @keyframes ses-pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(13, 148, 136, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
        }

        .ses-actions { display: flex; gap: 12px; }
        .ses-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
          background: #FFFFFF; border: 1.5px solid #CBD5E1; border-radius: 10px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #0F172A; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .ses-btn-secondary:hover { background: #F1F5F9; border-color: #94A3B8; }
        
        .ses-btn-primary {
          display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
          background: #F43F5E; border: none; border-radius: 10px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25);
        }
        .ses-btn-primary:hover { background: #E11D48; transform: translateY(-1px); }

        /* Filters Container */
        .ses-filters-container {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px 20px;
          display: flex; flex-direction: column; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .ses-filters-top {
          display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;
        }

        .ses-search-box {
          display: flex; align-items: center; gap: 8px; padding: 0 14px; height: 42px;
          background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 8px;
          flex: 1; min-width: 220px; transition: border-color 0.2s;
        }
        .ses-search-box:focus-within { border-color: #0D9488; background: #FFFFFF; }
        .ses-search-input {
          border: none; outline: none; background: transparent; width: 100%; font-size: 14px; color: #0F172A;
        }
        .ses-clear-btn {
          border: none; background: #CBD5E1; color: #475569; width: 18px; height: 18px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 12px; cursor: pointer;
        }

        .ses-select-wrap {
          display: flex; flex-direction: column; gap: 4px; min-width: 140px;
        }
        .ses-select-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;
        }
        .ses-select {
          height: 42px; padding: 0 12px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: #0F172A; cursor: pointer; outline: none; transition: border-color 0.2s;
        }
        .ses-select:focus { border-color: #0D9488; background: #FFFFFF; }

        .ses-reset-btn {
          display: flex; align-items: center; gap: 6px; height: 42px; padding: 0 14px;
          background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px;
          color: #DC2626; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .ses-reset-btn:hover { background: #FCA5A5; color: #991B1B; }

        .ses-filter-summary {
          display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748B;
          padding-top: 8px; border-top: 1px solid #F1F5F9;
        }
        .ses-filter-active-pill {
          background: #CCFBF1; color: #0F766E; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 12px;
        }

        .ses-btn-select-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #E0F2FE;
          color: #0284C7;
          border: 1.5px solid #BAE6FD;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ses-btn-select-all:hover {
          background: #BAE6FD;
          color: #0369A1;
        }

        .ses-bulk-bar {
          background: #0F172A;
          color: #FFFFFF;
          border-radius: 12px;
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
          animation: ses-slide-down 0.2s ease-out;
        }
        @keyframes ses-slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ses-bulk-count-badge {
          background: rgba(255, 255, 255, 0.18);
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          padding: 4px 12px;
          border-radius: 20px;
        }
        .ses-bulk-btn-clear {
          background: none; border: none; color: #94A3B8; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: underline;
        }
        .ses-bulk-btn-clear:hover { color: #FFFFFF; }
        .ses-bulk-btn-delete {
          display: inline-flex; align-items: center; gap: 6px; background: #EF4444; color: #FFFFFF;
          border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.15s ease;
        }
        .ses-bulk-btn-delete:hover { background: #DC2626; transform: scale(1.02); }
        .ses-bulk-btn-complete {
          display: inline-flex; align-items: center; gap: 6px; background: #0D9488; color: #FFFFFF;
          border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.15s ease;
        }
        .ses-bulk-btn-complete:hover { background: #0F766E; transform: scale(1.02); }
        
        .ses-checkbox-custom {
          width: 17px; height: 17px; border-radius: 4px; border: 1.5px solid #CBD5E1;
          background: #FFFFFF; cursor: pointer; accent-color: #0D9488;
          display: inline-block; vertical-align: middle;
        }

        .ses-table-container {
          width: 100%; box-sizing: border-box; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow-x: auto;
        }
        .ses-table { width: 100%; min-width: 1050px; border-collapse: collapse; text-align: left; table-layout: fixed; }
        .ses-table th {
          padding: 14px 16px; font-size: 11px; font-weight: 700;
          color: #64748B; text-transform: uppercase; background: #F8FAFC;
          position: sticky; top: 0; z-index: 1; letter-spacing: 0.6px;
          border-bottom: 1px solid #E2E8F0;
          box-sizing: border-box;
        }
        .ses-table td { padding: 14px 16px; vertical-align: middle; box-sizing: border-box; }
        .ses-table-row:hover { background-color: #F8FAFC; }
        .ses-td-primary { font-size: 13.5px; font-weight: 600; color: #0F172A; line-height: 1.4; }
        .ses-td-secondary { font-size: 12px; color: #64748B; line-height: 1.4; margin-top: 2px; }
        
        .ses-badge-cond {
          display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;
        }
        .ses-badge-type {
          display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;
          background: rgba(100, 116, 139, 0.12); color: #475569; white-space: nowrap;
        }
        .ses-status-pill {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px;
          font-size: 11.5px; font-weight: 700; text-transform: uppercase;
        }
        .ses-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
        }

        .ses-actions-row { display: flex; gap: 6px; justify-content: flex-end; align-items: center; white-space: nowrap; flex-shrink: 0; }
        .ses-icon-btn {
          width: 30px; height: 30px; border-radius: 6px; border: 1px solid #E2E8F0;
          background: #FFFFFF; color: #64748B; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .ses-icon-btn:hover { background: #F1F5F9; color: #0F172A; border-color: #CBD5E1; }

        .ses-btn-delete-session {
          width: 30px; height: 30px; border-radius: 6px; border: 1px solid #FECACA;
          background: #FEF2F2; color: #EF4444; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
        }
        .ses-btn-delete-session:hover {
          background: #FEE2E2; border-color: #F87171; color: #DC2626; transform: scale(1.06);
        }
        
        .ses-btn-student-video {
          display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px;
          border-radius: 6px; font-family: 'Outfit', sans-serif; font-size: 11.5px;
          cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; white-space: nowrap;
        }
        .ses-btn-student-video.has-video {
          background: #CCFBF1; color: #0F766E; border: 1px solid #0D9488; font-weight: 700;
          box-shadow: 0 1px 3px rgba(13, 148, 136, 0.15);
        }
        .ses-btn-student-video.has-video:hover {
          background: #99F6E4; border-color: #0F766E; color: #115E59; transform: translateY(-1px);
        }
        .ses-btn-student-video.no-video {
          background: #F8FAFC; color: #0D9488; border: 1px dashed #0D9488; font-weight: 600;
        }
        .ses-btn-student-video.no-video:hover {
          background: #F0FDFA; border-color: #0F766E; color: #0F766E; transform: translateY(-1px);
        }

        .ses-btn-view-analysis {
          display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px;
          border-radius: 6px;
          font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease;
          border: 1px solid transparent; flex-shrink: 0;
        }
        .ses-btn-view-analysis.ses-btn-analysis-active {
          background: #0D9488; color: #FFFFFF; border-color: #0D9488;
          box-shadow: 0 2px 5px rgba(13, 148, 136, 0.2);
        }
        .ses-btn-view-analysis.ses-btn-analysis-active:hover {
          background: #0F766E; border-color: #0F766E; transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(13, 148, 136, 0.3);
        }
        .ses-btn-view-analysis.ses-btn-analysis-muted {
          background: #F1F5F9; color: #94A3B8; border-color: #E2E8F0;
          font-weight: 500;
        }
        .ses-btn-view-analysis.ses-btn-analysis-muted:hover {
          background: #E2E8F0; color: #475569; border-color: #CBD5E1;
        }

        .ses-whatsapp-quick-btn {
          display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
          background: #25D366; color: #FFFFFF; font-size: 11px; font-weight: 700;
          border-radius: 6px; text-decoration: none; transition: all 0.2s;
        }
        .ses-whatsapp-quick-btn:hover { background: #1EBE5B; transform: translateY(-1px); }

        /* Metrics Row - Placed Horizontally Between Filters & Table */
        .ses-metrics-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }
        @media (max-width: 1200px) {
          .ses-metrics-row {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 768px) {
          .ses-metrics-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 500px) {
          .ses-metrics-row {
            grid-template-columns: 1fr;
          }
        }
        
        .ses-status-metric-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 20px;
          display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.2s ease;
        }
        .ses-status-metric-card.upcoming-card {
          background: #F0F9FF; border: 1.5px solid #BAE6FD;
        }
        .ses-status-metric-card.upcoming-card .ses-smc-label {
          color: #0369A1;
        }
        .ses-status-metric-card.inprogress-card {
          background: #F0FDFA; border: 1.5px solid #99F6E4;
        }
        .ses-status-metric-card.inprogress-card .ses-smc-label {
          color: #0F766E;
        }
        .ses-status-metric-card.pending-review-card,
        .ses-status-metric-card.pending-card {
          background: #FFFBEB; border: 1.5px solid #FDE68A;
        }
        .ses-status-metric-card.pending-review-card .ses-smc-label,
        .ses-status-metric-card.pending-card .ses-smc-label {
          color: #B45309;
        }
        .ses-status-metric-card.booked-card {
          background: #F8FAFC; border: 1.5px solid #E2E8F0;
        }
        .ses-status-metric-card.completed-card {
          background: #F0FDF4; border: 1.5px solid #BBF7D0;
        }
        .ses-status-metric-card.completed-card .ses-smc-label {
          color: #15803D;
        }
        .ses-status-metric-card.students-card {
          background: #FAF5FF; border: 1.5px solid #E9D5FF;
        }
        .ses-status-metric-card.students-card .ses-smc-label {
          color: #7E22CE;
        }
        .ses-status-metric-card.active-filter {
          box-shadow: 0 0 0 2.5px #0284C7, 0 6px 16px rgba(2, 132, 199, 0.2);
          transform: translateY(-2px);
        }
        .ses-status-metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0,0,0,0.04);
        }
        .ses-smc-label {
          font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.6px;
        }
        .ses-smc-value {
          font-family: 'Outfit', sans-serif; font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1.1; margin: 2px 0;
        }
        .ses-smc-sub {
          font-size: 13px; color: #64748B; font-weight: 500;
        }

        /* Calendar & Ground Ops Modal */
        .ses-modal-overlay {
          position: fixed; inset: 0; background: rgba(5, 11, 26, 0.8); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px;
        }
        .ses-modal-box {
          background: #FFFFFF; border-radius: 20px; max-width: 1100px; width: 100%; max-height: 90vh;
          display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .ses-hub-modal {
          height: min(580px, 90vh) !important;
          min-height: min(540px, 90vh) !important;
        }
        .ses-modal-header {
          display: flex; justify-content: space-between; align-items: center; padding: 20px 28px;
          border-bottom: 1px solid #E2E8F0; background: #FFFFFF;
        }
        .ses-modal-icon-badge {
          width: 44px; height: 44px; border-radius: 12px; background: #CCFBF1;
          display: flex; align-items: center; justify-content: center;
        }
        .ses-modal-tabs {
          display: flex; gap: 6px; background: #F1F5F9; padding: 4px; border-radius: 10px; margin-left: 20px;
        }
        .ses-modal-tab {
          padding: 6px 14px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
          color: #64748B; background: transparent; cursor: pointer; transition: all 0.2s;
        }
        .ses-modal-tab.active {
          background: #FFFFFF; color: #0F172A; box-shadow: 0 2px 4px rgba(0,0,0,0.06);
        }
        .ses-modal-close {
          background: #F1F5F9; border: none; width: 34px; height: 34px; border-radius: 50%;
          font-size: 15px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s;
        }
        .ses-modal-close:hover { background: #E2E8F0; color: #0F172A; }

        .ses-modal-content-scroll {
          padding: 24px 28px; overflow-y: auto; flex: 1;
        }

        /* Month View */
        .ses-cal-nav-bar {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
        }
        .ses-cal-month-title {
          font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; color: #050B1A;
        }
        .ses-cal-nav-btn {
          padding: 6px 14px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.2s;
        }
        .ses-cal-nav-btn:hover { background: #E2E8F0; }

        .ses-cal-grid-header {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 8px; text-align: center;
        }
        .ses-cal-grid-th {
          font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; padding: 6px 0;
        }

        .ses-cal-days-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;
        }
        .ses-cal-day-cell {
          min-height: 90px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 10px;
          padding: 8px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: all 0.2s;
        }
        .ses-cal-day-cell:hover { border-color: #0D9488; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.04); }
        .ses-cal-day-cell.selected { border-color: #0D9488; background: rgba(13, 148, 136, 0.03); }
        .ses-cal-day-cell.today { border-color: #F43F5E; }
        .ses-cal-day-cell.empty { background: transparent; border-color: transparent; cursor: default; }

        .ses-cal-day-num {
          display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: #0F172A;
        }
        .ses-cal-today-badge {
          background: #F43F5E; color: #FFFFFF; padding: 2px 6px; border-radius: 6px; font-size: 11px;
        }
        .ses-cal-session-count-badge {
          background: #0D9488; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px;
        }

        .ses-cal-day-events { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
        .ses-cal-event-pill {
          font-size: 11px; padding: 3px 6px; border-radius: 4px; border-left: 3px solid #0D9488;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #334155;
        }
        .ses-cal-more-events { font-size: 10px; color: #64748B; font-weight: 600; text-align: center; }

        .ses-cal-day-drawer {
          margin-top: 20px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 18px;
        }
        .ses-cal-drawer-cards {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;
        }
        .ses-cal-drawer-item {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;
          cursor: pointer; transition: all 0.2s;
        }
        .ses-cal-drawer-item:hover { border-color: #0D9488; box-shadow: 0 4px 8px rgba(0,0,0,0.04); }

        /* Timeline View */
        .ses-timeline-grid { display: flex; flex-direction: column; gap: 14px; }
        .ses-timeline-row {
          background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px;
          display: flex; gap: 20px; align-items: center;
        }
        .ses-timeline-time-label { width: 180px; flex-shrink: 0; display: flex; flex-direction: column; }
        .ses-timeline-cards-flex { display: flex; gap: 12px; flex: 1; flex-wrap: wrap; }
        .ses-timeline-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;
          min-width: 220px; cursor: pointer; transition: all 0.2s;
        }
        .ses-timeline-card:hover { border-color: #0D9488; transform: translateY(-1px); }
        .ses-timeline-empty-slot {
          padding: 10px 16px; border: 1.5px dashed #CBD5E1; border-radius: 8px; font-size: 12px;
          font-weight: 600; color: #64748B; cursor: pointer; transition: all 0.2s;
        }
        .ses-timeline-empty-slot:hover { border-color: #0D9488; color: #0D9488; background: #CCFBF1; }

        /* Detail Popup */
        .ses-detail-popup-overlay {
          position: fixed; inset: 0; background: rgba(5, 11, 26, 0.5); backdrop-filter: blur(2px);
          display: flex; align-items: center; justify-content: center; z-index: 1100;
        }
        .ses-detail-popup {
          background: #FFFFFF; border-radius: 16px; max-width: 480px; width: 90%; padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        }
        .ses-detail-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; border-bottom: 1px solid #F1F5F9;
        }
        .ses-detail-label { color: #64748B; font-size: 13px; }
        .ses-detail-val { font-size: 14px; }

        .ses-loading { display: flex; flex-direction: column; gap: 12px; justify-content: center; align-items: center; height: 260px; }
        .ses-spinner {
          width: 38px; height: 38px;
          border: 3.5px solid rgba(13, 148, 136, 0.2); border-top-color: #0D9488;
          border-radius: 50%; animation: ses-spin 0.7s linear infinite;
        }
        @keyframes ses-spin { to { transform: rotate(360deg); } }
        @keyframes sesPopIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes sesSlideDown {
          from { opacity: 0; transform: translate(-50%, -15px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes sesFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Mobile Scroll Indicator */
        .ses-mobile-scroll-indicator {
          display: none;
          background: #F0FDFA;
          border-bottom: 1px solid #CCFBF1;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #0F766E;
          text-align: center;
        }

        /* Empty State Card */
        .ses-empty-state-card {
          text-align: center;
          padding: 48px 20px;
          width: 100%;
          box-sizing: border-box;
          background: #FFFFFF;
        }

        .ses-slot-tabs-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #FFFFFF;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          margin: 12px 0 16px 0;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .ses-slot-tabs-label {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          font-weight: 700;
          font-size: 13px;
          color: #0F172A;
          margin-right: 4px;
          flex-shrink: 0;
        }
        .ses-slot-tabs-scroll {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: nowrap;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }

        /* Responsive Media Queries */
        @media (max-width: 900px) {
          .ses-page {
            flex-direction: column !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }
          .ses-main {
            margin-top: 64px !important;
            padding: 16px 12px 100px 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            gap: 16px !important;
            overflow-x: hidden !important;
          }
          .ses-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .ses-title-wrap {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .ses-title {
            font-size: 24px !important;
          }
          .ses-subtitle {
            font-size: 12.5px !important;
          }
          .ses-actions {
            flex-direction: column !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .ses-btn-secondary,
          .ses-btn-primary {
            width: 100% !important;
            justify-content: center !important;
            padding: 10px 14px !important;
            box-sizing: border-box !important;
          }
          .ses-filters-container {
            padding: 14px 12px !important;
            gap: 12px !important;
          }
          .ses-filters-top {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .ses-search-box {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .ses-select-wrap {
            width: 100% !important;
            min-width: 0 !important;
          }
          .ses-select {
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .ses-slot-tabs-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
            padding: 10px 12px !important;
            overflow-x: hidden !important;
          }
          .ses-slot-tabs-scroll {
            width: 100% !important;
            padding-bottom: 4px !important;
          }
          .ses-metrics-row {
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
            gap: 10px !important;
          }
          .ses-status-metric-card {
            padding: 12px 14px !important;
          }
          .ses-smc-label {
            font-size: 10px !important;
          }
          .ses-smc-value {
            font-size: 26px !important;
          }
          .ses-smc-sub {
            font-size: 11.5px !important;
          }
          .ses-mobile-scroll-indicator {
            display: block !important;
          }
          .ses-bulk-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            padding: 12px 14px !important;
          }
          .ses-modal-box {
            width: 95% !important;
            max-height: 92vh !important;
            border-radius: 14px !important;
          }
          .ses-modal-overlay {
            padding: 12px !important;
          }
          .ses-modal-header {
            padding: 14px 16px !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          .ses-modal-content-scroll {
            padding: 16px 14px !important;
          }
          .ses-cal-days-grid {
            gap: 4px !important;
          }
          .ses-cal-day-cell {
            min-height: 60px !important;
            padding: 4px !important;
          }
          .ses-cal-day-num {
            font-size: 11.5px !important;
          }
          .ses-cal-drawer-cards {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Sessions;
