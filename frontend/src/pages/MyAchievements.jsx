import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { toBlob } from 'html-to-image';

const API = import.meta.env.VITE_API_URL || '';

export default function MyAchievements() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetSessionParam = searchParams.get('session') || searchParams.get('openSession') || searchParams.get('sessionId');
  const [studentData, setStudentData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'completed' | 'upcoming'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Social Share Modal State
  const [shareModalSession, setShareModalSession] = useState(null); // session object or 'overall'
  const [shareTemplate, setShareTemplate] = useState('spotlight'); // 'spotlight' | 'keepsake'
  const [customPhotoUrl, setCustomPhotoUrl] = useState(null);
  const [selectedCoachOverride, setSelectedCoachOverride] = useState(null);
  const [instructorsList, setInstructorsList] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' | 'environment'
  const [cameraTimer, setCameraTimer] = useState(0); // 0 or 3
  const [cameraCountdown, setCameraCountdown] = useState(null);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [photoFilter, setPhotoFilter] = useState('normal'); // 'normal' | 'golden' | 'ocean' | 'vivid'
  const [photoPosY, setPhotoPosY] = useState(15); // 0 (top) to 100 (bottom) - default 15% focuses on head/face
  const [photoFit, setPhotoFit] = useState('cover'); // 'cover' | 'contain'
  const [captionCopied, setCaptionCopied] = useState(false);
  const [shareCardBusy, setShareCardBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [certLockModal, setCertLockModal] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  const loggedUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  }, []);

  const studentName = studentData?.name || loggedUser?.name || 'Athlete';
  const studentSchool = studentData?.school || loggedUser?.school || 'Athnex Surf Academy';
  const studentLevel = studentData?.level || loggedUser?.level || 'Beginner';

  const effectiveSchool = useMemo(() => {
    let sch = studentData?.school || loggedUser?.school || loggedUser?.school_name;
    if (!sch || sch === 'Athnex Surf Academy') {
      try {
        const act = localStorage.getItem('activeSchool');
        if (act) {
          const p = JSON.parse(act);
          if (p?.name) sch = p.name;
        }
      } catch (e) {}
    }
    return sch || '';
  }, [studentData, loggedUser]);

  const isCertificateImageUrl = (url, certCfg) => {
    if (!url || !certCfg || typeof certCfg !== 'object') return false;
    const certUrls = new Set([
      certCfg.custom_bg_url,
      ...Object.values(certCfg.courses || {}).map(c => c?.custom_bg_url)
    ].filter(Boolean));
    return certUrls.has(url);
  };

  const [posterBgUrl, setPosterBgUrl] = useState(() => {
    try {
      let sch = '';
      try {
        const act = localStorage.getItem('activeSchool');
        if (act) sch = JSON.parse(act)?.name || '';
      } catch (e) {}
      const cached = sch ? localStorage.getItem(`athnex_poster_${sch}`) : localStorage.getItem('athnex_milestone_poster_bg');
      return (cached && cached !== '/surf-milestone-bg.jpg') ? cached : '/surf-milestone-bg.jpg';
    } catch (e) {
      return '/surf-milestone-bg.jpg';
    }
  });
  const [schoolCertConfig, setSchoolCertConfig] = useState(() => {
    try {
      const sch = localStorage.getItem('activeSchool');
      const schoolName = sch ? JSON.parse(sch)?.name : '';
      const cached = schoolName ? localStorage.getItem(`athnex_cert_${schoolName}`) : null;
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const confettiCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const fetchStudentAndSessions = async () => {
      setLoading(true);
      try {
        const uEmail = (loggedUser?.email || '').toLowerCase().trim();
        const uName = (loggedUser?.name || '').toLowerCase().trim();
        let studentId = loggedUser?.student_id || null;
        let fetchedProfile = null;

        let allStds = [];
        // 1. Fetch all students to accurately match by email (100% unique), student_id, or name
        try {
          const fallbackRes = await fetch(`${API}/api/students?school=all`);
          if (fallbackRes.ok) {
            allStds = await fallbackRes.json();
            if (Array.isArray(allStds) && allStds.length > 0) {
              // Filter candidates matching email or student_id or user_id or name
              const candidates = allStds.filter(s => {
                const sEmail = (s.email || '').toLowerCase().trim();
                const sName = (s.name || '').toLowerCase().trim();
                const sUserId = s.user_id ? String(s.user_id) : '';
                const sId = s.id ? String(s.id) : '';

                if (uEmail && sEmail && sEmail === uEmail) return true;
                if (loggedUser?.student_id && sId === String(loggedUser.student_id)) return true;
                if (sUserId && loggedUser?.id && sUserId === String(loggedUser.id)) return true;
                if (uName && sName && (sName === uName || (sName.length >= 3 && uName === sName))) return true;
                return false;
              });

              // From candidates, pick the best match (prioritize candidate with sessions, or linked user_id, or matching student_id)
              let matched = null;
              if (candidates.length > 0) {
                matched = candidates.find(c => loggedUser?.student_id && String(c.id) === String(loggedUser.student_id))
                  || candidates.find(c => loggedUser?.id && c.user_id && String(c.user_id) === String(loggedUser.id))
                  || candidates.find(c => c.session_count && c.session_count > 0)
                  || candidates.find(c => Array.isArray(c.sessions) && c.sessions.length > 0)
                  || candidates[0];
              }

              if (matched) {
                fetchedProfile = matched;
                setStudentData(matched);
                studentId = matched.id;
                // Sync session cache so loggedUser stays up-to-date with course duration
                try {
                  const currUserStr = sessionStorage.getItem('user');
                  if (currUserStr) {
                    const parsedUser = JSON.parse(currUserStr);
                    parsedUser.student_id = matched.id;
                    parsedUser.course_duration = matched.course_duration;
                    if (matched.school) parsedUser.school = matched.school;
                    sessionStorage.setItem('user', JSON.stringify(parsedUser));
                  }
                } catch (e) { }
              }
            }
          }
        } catch (e) {
          console.warn('Fallback student fetch error:', e);
        }

        // If not matched from list, or if profile has no sessions, fetch direct /api/students/${studentId}
        if ((!fetchedProfile || !Array.isArray(fetchedProfile.sessions) || fetchedProfile.sessions.length === 0) && studentId) {
          try {
            const sRes = await fetch(`${API}/api/students/${studentId}`);
            if (sRes.ok) {
              const singleStd = await sRes.json();
              const sEmail = (singleStd?.email || '').toLowerCase().trim();
              const sName = (singleStd?.name || '').toLowerCase().trim();
              if ((uEmail && sEmail && sEmail === uEmail) || (uName && sName && (sName === uName || sName.includes(uName)))) {
                fetchedProfile = singleStd;
                setStudentData(singleStd);
              }
            }
          } catch (e) {
            console.warn('Could not fetch student detail:', e);
          }
        }

        // 2. Fetch all sessions
        const sessRes = await fetch(`${API}/api/sessions`);
        let allSess = [];
        if (sessRes.ok) {
          allSess = await sessRes.json();
        }

        // Also merge direct profile sessions if available
        if (fetchedProfile && Array.isArray(fetchedProfile.sessions)) {
          const existingIds = new Set(allSess.map(s => String(s.id)));
          fetchedProfile.sessions.forEach(s => {
            if (s && s.id && !existingIds.has(String(s.id))) {
              allSess.push(s);
            }
          });
        }

        // 3. Filter sessions belonging strictly to this student
        const activeStudent = fetchedProfile || studentData;
        const targetName = (activeStudent?.name || uName || '').toLowerCase().trim();
        const studentSchool = (activeStudent?.school || effectiveSchool || loggedUser?.school || '').toLowerCase().trim();
        const isGenericSchool = (sch) => !sch || ['surf academy', 'no school selected', 'your selected surf school', 'athnex', 'athnex live', 'all'].includes(sch);

        const studentCandidateIds = new Set([
          activeStudent?.id ? String(activeStudent.id) : null,
          studentId ? String(studentId) : null,
          loggedUser?.student_id ? String(loggedUser.student_id) : null,
        ].filter(Boolean));

        // Add all student IDs from allStds associated with this user's verified email
        if (uEmail && Array.isArray(allStds)) {
          allStds.forEach(st => {
            if ((st.email || '').toLowerCase().trim() === uEmail && st.id) {
              studentCandidateIds.add(String(st.id));
            }
          });
        }

        const matchedSessions = allSess.filter(s => {
          const sid = s.student_id ? String(s.student_id) : '';
          const sSchool = (s.school || '').toLowerCase().trim();

          // 1. Direct verified ID match (Session booked directly for this student)
          if (sid && studentCandidateIds.has(sid)) {
            return true;
          }

          // If session is already assigned to another student ID, do NOT match
          if (sid && !studentCandidateIds.has(sid)) {
            return false;
          }

          // School isolation: if both have explicit schools and they don't match, reject unassigned session!
          if (studentSchool && sSchool && !isGenericSchool(studentSchool) && !isGenericSchool(sSchool)) {
            if (studentSchool !== sSchool && !studentSchool.includes(sSchool) && !sSchool.includes(studentSchool)) {
              return false;
            }
          }

          // 2. Unassigned session with exact name match
          if (targetName && targetName.length >= 2) {
            const sName = (s.student || '').toLowerCase().trim();
            const sStudentName = (s.student_name || '').toLowerCase().trim();
            const sGuest = (s.guest_name || '').toLowerCase().trim();
            if (sName === targetName || sStudentName === targetName || sGuest === targetName) {
              return true;
            }
          }

          return false;
        });

        // 4. Sort sessions: newest first
        matchedSessions.sort((a, b) => {
          const dateA = String(a.date || '');
          const dateB = String(b.date || '');
          return dateB.localeCompare(dateA);
        });

        setSessions(matchedSessions);
      } catch (err) {
        console.warn('Failed to load session history data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAndSessions();
  }, [loggedUser, studentName]);

  // Auto-open session milestone & remarks share modal if session query param is provided
  useEffect(() => {
    if (!targetSessionParam || sessions.length === 0) return;
    const target = sessions.find(s => String(s.id) === String(targetSessionParam));
    if (target) {
      openShareModal(target);
      setTimeout(() => {
        const el = document.getElementById(`ach-session-${target.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [targetSessionParam, sessions]);

  // Load custom school milestone poster background if configured
  useEffect(() => {
    const fetchPoster = async () => {
      try {
        const sch = effectiveSchool;
        const cached = sch ? localStorage.getItem(`athnex_poster_${sch}`) : localStorage.getItem('athnex_milestone_poster_bg');
        if (cached && cached !== '/surf-milestone-bg.jpg' && !isCertificateImageUrl(cached, schoolCertConfig)) {
          setPosterBgUrl(cached);
        } else {
          setPosterBgUrl('/surf-milestone-bg.jpg');
        }

        const url = sch ? `${API}/api/schools/poster?school=${encodeURIComponent(sch)}` : `${API}/api/schools/poster`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const latestCert = (data.certificate && typeof data.certificate === 'object' && Object.keys(data.certificate).length > 0)
            ? data.certificate
            : schoolCertConfig;

          if (data.certificate && typeof data.certificate === 'object' && Object.keys(data.certificate).length > 0) {
            setSchoolCertConfig(data.certificate);
            if (sch) localStorage.setItem(`athnex_cert_${sch}`, JSON.stringify(data.certificate));
          }

          if (data.poster_url && data.poster_url !== '/surf-milestone-bg.jpg' && !isCertificateImageUrl(data.poster_url, latestCert)) {
            setPosterBgUrl(data.poster_url);
            if (sch) localStorage.setItem(`athnex_poster_${sch}`, data.poster_url);
            else localStorage.setItem('athnex_milestone_poster_bg', data.poster_url);
          } else {
            setPosterBgUrl('/surf-milestone-bg.jpg');
          }
        }
      } catch (err) {
        console.warn('Failed to load custom poster image', err);
      }
    };
    fetchPoster();

    const onStorageChange = () => {
      const sch = effectiveSchool;
      const updated = (sch && localStorage.getItem(`athnex_poster_${sch}`)) || localStorage.getItem('athnex_milestone_poster_bg');
      if (updated && updated !== '/surf-milestone-bg.jpg') setPosterBgUrl(updated);
    };
    const onPosterUpdate = (e) => {
      if (e.detail && e.detail !== '/surf-milestone-bg.jpg') {
        setPosterBgUrl(e.detail);
      }
    };
    window.addEventListener('storage', onStorageChange);
    window.addEventListener('athnex_poster_updated', onPosterUpdate);
    return () => {
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('athnex_poster_updated', onPosterUpdate);
    };
  }, [effectiveSchool]);

  // Fetch coaches & instructors for matching coach avatars
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const res = await fetch(`${API}/api/instructors`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setInstructorsList(data);
        }
      } catch (e) {
        console.warn('Could not load instructors list:', e);
      }
    };
    fetchInstructors();
  }, []);

  const getCoachAvatar = (cName) => {
    if (!cName || !Array.isArray(instructorsList) || instructorsList.length === 0) return null;
    const target = String(cName).replace(/^coach\s+/i, '').toLowerCase().trim();
    const matched = instructorsList.find(inst => {
      const instName = (inst.name || '').toLowerCase().trim();
      return instName === target || instName.includes(target) || (target.length > 2 && target.includes(instName));
    });
    return matched?.image || matched?.avatar || matched?.photo_url || null;
  };

  const getCoachPhotoForSession = (sess, cName) => {
    if (sess && typeof sess === 'object') {
      if (sess.primary_instructor_image) return sess.primary_instructor_image;
      if (sess.instructor_image) return sess.instructor_image;
      if (sess.coach_image) return sess.coach_image;
      if (sess.coach_avatar) return sess.coach_avatar;
    }
    return getCoachAvatar(cName);
  };

  // Determine if a session is finished / completed
  const isSessionCompleted = (sess) => {
    if (!sess) return false;
    const st = String(sess.status || '').toLowerCase().trim();
    if (st === 'completed' || st === 'finished' || st === 'attended') return true;
    const att = String(sess.attendance || '').toLowerCase().trim();
    if (att === 'present' || att === 'completed') return true;
    // Check if session date is in the past
    if (sess.date) {
      const today = new Date().toISOString().split('T')[0];
      if (sess.date < today && st !== 'cancelled') return true;
    }
    return false;
  };

  // Derive verified coach technique score out of 100 dynamically from coach notes
  const getSessionScore = (sess) => {
    if (!sess) return null;
    
    // 1. Direct explicit score field
    const direct = parseFloat(sess.score || sess.technique_score || sess.coach_rating);
    if (!isNaN(direct) && direct > 0) return direct <= 10 ? Math.round(direct * 10) : Math.min(100, Math.round(direct));

    // 2. Extract score or points from notes
    if (sess.notes) {
      const notes = String(sess.notes);

      // A. Direct score out of 10 or 100 in notes (e.g. "Coach Rating: 8/10", "Coach Rating: 85/100")
      const sm100 = notes.match(/(?:Coach (?:Rating|Score)|Technique Score|Score):\s*(\d+(?:\.\d+)?)/i)
        || notes.match(/\[\s*(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*100\s*\]/i)
        || notes.match(/\(\s*(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*100\s*\)/i);
      if (sm100) {
        const val = parseFloat(sm100[1]);
        if (!isNaN(val) && val > 0) return val <= 10 ? Math.round(val * 10) : Math.min(100, Math.round(val));
      }

      // B. Points out of 10 in "What You did Well" / "What to Improve" / general notes
      // e.g. "[6 out of 10]", "[5/10]", "(7 out of 10)", "pop up [6 out of 10]"
      const matches10 = [...notes.matchAll(/(?:\[|\()?\s*(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*10\s*(?:\]|\))?/gi)];
      if (matches10.length > 0) {
        const points = matches10
          .map(m => parseFloat(m[1]))
          .filter(v => !isNaN(v) && v >= 0 && v <= 10);
        if (points.length > 0) {
          const avgOutOf10 = points.reduce((sum, v) => sum + v, 0) / points.length;
          return Math.min(100, Math.max(10, Math.round(avgOutOf10 * 10)));
        }
      }

      // C. Standalone points/rating e.g. "Rating: 8" or "Points: 7"
      const smStandalone = notes.match(/(?:Rating|Points|Score|Grade)\s*[:=-]\s*(\d+(?:\.\d+)?)/i);
      if (smStandalone) {
        const val = parseFloat(smStandalone[1]);
        if (!isNaN(val) && val > 0) {
          return val <= 10 ? Math.round(val * 10) : Math.min(100, Math.round(val));
        }
      }
    }

    // Real coach inputs only: do not invent artificial fallbacks
    return null;
  };

  // Derive pop-up rating out of 10 from coach notes or score
  const getSessionPopUpRating = (sess, fallbackScore = null) => {
    if (sess && sess.notes) {
      const match = sess.notes.match(/pop[- ]?up.*?\[?(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*10/i)
        || sess.notes.match(/What You did Well:.*?\[?(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*10/i);
      if (match) {
        const p = parseFloat(match[1]);
        if (!isNaN(p) && p >= 1 && p <= 10) return Math.round(p);
      }
    }
    const realScore = fallbackScore !== null ? fallbackScore : getSessionScore(sess);
    if (realScore !== null) {
      return Math.min(10, Math.max(1, Math.round(realScore / 10)));
    }
    return null;
  };

  // Derive paddling rating out of 10 from notes or score
  const getSessionPaddlingRating = (sess, fallbackScore = null) => {
    if (sess && sess.notes) {
      const match = sess.notes.match(/paddl(?:e|ing).*?\[?(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*10/i)
        || sess.notes.match(/paddling\s*:\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const p = parseFloat(match[1]);
        if (!isNaN(p) && p >= 1 && p <= 10) return Math.round(p);
      }
    }
    if (sess && (sess.paddling_score || sess.paddling)) {
      const p = parseFloat(sess.paddling_score || sess.paddling);
      if (!isNaN(p)) return Math.min(10, Math.max(1, Math.round(p > 10 ? p / 10 : p)));
    }
    const realScore = fallbackScore !== null ? fallbackScore : getSessionScore(sess);
    if (realScore !== null) {
      return Math.min(10, Math.max(1, Math.round((realScore / 10) * 0.85)));
    }
    return null;
  };

  // Derive session waves caught / ridden (real coach inputs only)
  const getSessionWaves = (sess) => {
    if (!sess) return null;
    const direct = parseInt(sess.waves_ridden || sess.waves_caught || sess.wave_count, 10);
    if (!isNaN(direct) && direct > 0) return direct;
    if (sess.notes) {
      const wm = sess.notes.match(/Wave Count:\s*(\d+)/i)
        || sess.notes.match(/(\d+)\s*waves?(?:\s*caught|\s*ridden)?/i);
      if (wm) {
        const count = parseInt(wm[1], 10);
        if (!isNaN(count) && count > 0) return count;
      }
    }
    // Real coach inputs only: do not invent wave numbers
    return null;
  };

  // Compute milestone statistics from session history
  const stats = useMemo(() => {
    const completedList = sessions.filter(isSessionCompleted);
    const upcomingList = sessions.filter(s => !isSessionCompleted(s));

    const totalWaves = completedList.reduce((sum, s) => {
      const count = getSessionWaves(s);
      return sum + (count !== null && !isNaN(count) ? count : 0);
    }, 0);

    const totalHours = (completedList.length * 2.0).toFixed(1);

    const scores = completedList
      .map(s => getSessionScore(s))
      .filter(sc => sc !== null && !isNaN(sc) && sc > 0);
    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : null;

    return {
      total: sessions.length,
      completed: completedList.length,
      upcoming: upcomingList.length,
      totalWaves,
      totalHours,
      avgScore
    };
  }, [sessions]);

  // Derive course duration requirements (e.g. 3 Days Course requires 3 sessions, 5 Days Course requires 5 sessions)
  const requiredSessions = useMemo(() => {
    const durStr = studentData?.course_duration || loggedUser?.course_duration || studentData?.course || '';
    const match = String(durStr).match(/(\d+)\s*-?\s*Day/i);
    if (match) return parseInt(match[1], 10);
    const numOnly = parseInt(durStr, 10);
    if (!isNaN(numOnly) && numOnly > 0 && numOnly <= 60) return numOnly;
    if (studentData?.total_days && !isNaN(parseInt(studentData.total_days, 10)) && parseInt(studentData.total_days, 10) > 0) {
      return parseInt(studentData.total_days, 10);
    }
    return 1; // Default standard course
  }, [studentData, loggedUser]);

  const isCertificateUnlocked = useMemo(() => {
    return requiredSessions > 0 && stats.completed >= requiredSessions;
  }, [stats.completed, requiredSessions]);

  // Filtered sessions based on active tab and search query
  const displayedSessions = useMemo(() => {
    return sessions.filter(sess => {
      if (activeTab === 'completed' && !isSessionCompleted(sess)) return false;
      if (activeTab === 'upcoming' && isSessionCompleted(sess)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const spot = (sess.location || '').toLowerCase();
        const coach = (sess.instructor || sess.instructor_name || '').toLowerCase();
        const dateStr = (sess.date || '').toLowerCase();
        const typeStr = (sess.type || '').toLowerCase();
        if (!spot.includes(q) && !coach.includes(q) && !dateStr.includes(q) && !typeStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, activeTab, searchQuery]);

  // Derive ocean training time / duration
  const getSessionDuration = (sess) => {
    if (!sess) return '--';
    if (sess.duration_mins) {
      const mins = parseInt(sess.duration_mins, 10);
      if (!isNaN(mins) && mins > 0) {
        if (mins % 60 === 0) {
          const hrs = mins / 60;
          return `${hrs} ${hrs === 1 ? 'Hour' : 'Hours'} (${mins}m)`;
        }
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        return hrs > 0 ? `${hrs}h ${rem}m (${mins}m)` : `${mins} Mins`;
      }
    }
    if (sess.duration) return String(sess.duration);
    if (sess.time && sess.time.includes('-')) {
      const parts = sess.time.split('-');
      if (parts.length === 2) {
        const parseMinutes = (tStr) => {
          const m = tStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (!m) return null;
          let h = parseInt(m[1], 10);
          const min = parseInt(m[2], 10);
          const meridiem = (m[3] || '').toUpperCase();
          if (meridiem === 'PM' && h < 12) h += 12;
          if (meridiem === 'AM' && h === 12) h = 0;
          return h * 60 + min;
        };
        const startM = parseMinutes(parts[0]);
        const endM = parseMinutes(parts[1]);
        if (startM !== null && endM !== null) {
          let diff = endM - startM;
          if (diff < 0) diff += 24 * 60;
          if (diff > 0) {
            const hrs = Math.floor(diff / 60);
            const rem = diff % 60;
            if (rem === 0) return `${hrs} ${hrs === 1 ? 'Hour' : 'Hours'} (${diff}m)`;
            return hrs > 0 ? `${hrs}h ${rem}m (${diff}m)` : `${diff} Mins`;
          }
        }
      }
    }
    return '--';
  };

  // Helper to construct share text for a specific session
  const buildShareText = (sess) => {
    if (sess === 'overall') {
      return (
        `🏄 *My Surfing Milestones at Athnex Live!* 🌊\n` +
        `👤 Surfer: *${studentName}*\n` +
        `🏆 Skill Level: *${studentLevel}*\n` +
        `✅ Sessions Completed: *${stats.completed} Sessions*\n` +
        `🌊 Waves Ridden: *${stats.totalWaves > 0 ? `${stats.totalWaves} Waves` : 'In Training'}*\n` +
        `⏱️ Ocean Training: *${stats.totalHours} hrs*\n` +
        (stats.avgScore !== null ? `⭐ Coach Score: *${getScoreOutOfTen(stats.avgScore)}/10*\n` : '') +
        `📍 Academy: *${studentSchool}*\n\n` +
        `Track verified surf progress & AI video analysis on https://athnexlive.com 🤙`
      );
    }
    const coachName = getCleanCoachName(sess, selectedCoachOverride);
    const loc = sess.location || studentSchool || 'Surf Spot';
    const duration = getSessionDuration(sess);
    const waves = getSessionWaves(sess);
    const scoreVal = getSessionScore(sess);
    return (
      `🏄 *Surf Session Milestone Completed!* 🌊\n` +
      `👤 Surfer: *${studentName}*\n` +
      `📅 Date: *${sess.date}* (${sess.time || 'Morning Session'})\n` +
      `⏱️ Training Time: *${duration}*\n` +
      (waves !== null ? `🌊 Waves Caught: *${waves} Waves*\n` : '') +
      (scoreVal !== null ? `⭐ Technique Score: *${getScoreOutOfTen(scoreVal)}/10*\n` : '') +
      `📍 Spot: *${loc}*\n` +
      `🏄 Coach: *${coachName}*\n` +
      `🔥 Level: *${sess.level || sess.type || studentLevel}*\n` +
      `⭐ Verified at *Athnex Live* (https://athnexlive.com) 🤙`
    );
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomPhotoUrl(event.target.result);
      setPhotoPosY(15); // Auto-position near top so faces & heads are never cropped
      setPhotoFit('cover');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getFilterCss = (filter = photoFilter) => {
    if (filter === 'golden') return 'brightness(1.05) saturate(1.25) sepia(0.15)';
    if (filter === 'ocean') return 'contrast(1.08) saturate(1.2) hue-rotate(-8deg)';
    if (filter === 'vivid') return 'contrast(1.15) saturate(1.3)';
    return 'none';
  };

  const startCamera = async (facing = cameraFacing) => {
    setCameraModalOpen(true);
    setCameraLoading(true);
    setCameraError(null);

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Direct camera not supported on this device. Opening file capture.');
      setCameraLoading(false);
      setTimeout(() => {
        setCameraModalOpen(false);
        cameraInputRef.current?.click();
      }, 1200);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      });
      cameraStreamRef.current = stream;
      setCameraLoading(false);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
      }, 80);
    } catch (err) {
      console.warn('getUserMedia error:', err);
      setCameraLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access permission was denied. Please allow camera permissions in your browser or select an image.');
        setTimeout(() => {
          stopCamera();
          cameraInputRef.current?.click();
        }, 1500);
      } else {
        setCameraError('Could not start live camera. Falling back to camera/file capture.');
        setTimeout(() => {
          stopCamera();
          cameraInputRef.current?.click();
        }, 1200);
      }
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraModalOpen(false);
    setCameraLoading(false);
    setCameraError(null);
    setCameraCountdown(null);
    setCameraFlash(false);
  };

  const handleSnapClick = () => {
    if (cameraTimer > 0) {
      let count = cameraTimer;
      setCameraCountdown(count);
      const timerInt = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(timerInt);
          setCameraCountdown(null);
          triggerSnap();
        } else {
          setCameraCountdown(count);
        }
      }, 1000);
    } else {
      triggerSnap();
    }
  };

  const triggerSnap = () => {
    setCameraFlash(true);
    setTimeout(() => {
      setCameraFlash(false);
      captureSelfiePhoto();
    }, 200);
  };

  const captureSelfiePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      stopCamera();
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      // Mirror horizontally if front user camera
      if (cameraFacing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCustomPhotoUrl(dataUrl);
      setPhotoPosY(15); // Auto-focus on face/head
      setPhotoFit('cover');
    } catch (e) {
      console.error('Failed to capture from video:', e);
    } finally {
      stopCamera();
    }
  };

  const handleCopyCaption = async (sess) => {
    const isOverall = sess === 'overall';
    const wavesVal = isOverall ? stats.totalWaves : getSessionWaves(sess);
    const scoreVal = isOverall ? stats.avgScore : getSessionScore(sess);
    const coach = getCleanCoachName(sess);
    const spot = sess?.location || studentSchool || 'Athnex Surf Academy';
    
    const wavesPart = wavesVal !== null ? `🌊 ${wavesVal} Waves Caught` : '🌊 Ocean Training Complete';
    const scorePart = scoreVal !== null ? ` | ⭐ ${getScoreOutOfTen(scoreVal)}/10 Coach Technique Score` : '';
    const caption = `Pushing limits in the ocean! 🏄‍♂️✨\n` +
      `${wavesPart}${scorePart}\n` +
      `📍 ${spot} • Coached by ${coach}\n\n` +
      `#AthnexSurfing #SurfLife #OceanAthlete #PushYourLimits #SurfingIndia`;
    
    try {
      await navigator.clipboard.writeText(caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2500);
    } catch (e) {
      console.warn('Copy caption failed', e);
    }
  };

  const getSessionGroupName = (sess) => {
    if (!sess || sess === 'overall') return 'Group I';
    return sess.group_name || 'Group I';
  };

  const getSessionFormattedDate = (sess) => {
    if (!sess || sess === 'overall') return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    if (!sess.date) return '--';
    try {
      const d = new Date(sess.date);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return sess.date;
  };

  const getSessionWaterTime = (sess) => {
    if (!sess || sess === 'overall') return `${stats.totalHours || 2.0} hrs`;
    if (sess.duration_mins && !isNaN(sess.duration_mins) && Number(sess.duration_mins) > 0) {
      const hrs = Math.round((Number(sess.duration_mins) / 60) * 10) / 10;
      return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
    }
    if (sess.time && typeof sess.time === 'string' && sess.time.includes('-')) {
      try {
        const [startStr, endStr] = sess.time.split('-').map(t => t.trim());
        const parseH = (s) => {
          const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (!m) return null;
          let h = parseInt(m[1], 10);
          const min = parseInt(m[2], 10);
          const ampm = m[3] ? m[3].toUpperCase() : null;
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          return h + min / 60;
        };
        const h1 = parseH(startStr);
        const h2 = parseH(endStr);
        if (h1 !== null && h2 !== null && h2 > h1) {
          const diff = Math.round((h2 - h1) * 10) / 10;
          return `${diff} ${diff === 1 ? 'hr' : 'hrs'}`;
        }
      } catch (e) {}
    }
    return '2.0 hrs';
  };

  const getScoreOutOfTen = (rawScore) => {
    if (rawScore === null || rawScore === undefined || rawScore === '' || rawScore === '--') return '--';
    const num = Number(rawScore);
    if (isNaN(num)) return '--';
    if (num <= 10) return num;
    return (num % 10 === 0) ? (num / 10) : (num / 10).toFixed(1);
  };

  const getCoachCandidates = (sess) => {
    if (!sess || sess === 'overall') {
      const sCoach = studentData?.instructor || '';
      return sCoach ? [sCoach.trim().replace(/\b(coaches|coach|instructors|instructor)\b/gi, '').trim()] : [];
    }
    const list = [];
    if (Array.isArray(sess.instructors_list)) {
      sess.instructors_list.forEach(c => {
        if (c && typeof c === 'string' && c.trim()) {
          const clean = c.trim().replace(/\b(coaches|coach|instructors|instructor)\b/gi, '').trim();
          if (clean && !list.some(x => x.toLowerCase() === clean.toLowerCase())) {
            list.push(clean.charAt(0).toUpperCase() + clean.slice(1));
          }
        }
      });
    }
    const raw = sess.instructor || sess.instructor_name || sess.coach || '';
    if (raw) {
      const clean = raw.replace(/^group\s+[a-z0-9]+[^:]*:\s*/i, '').replace(/\s*-\s*\d+\s*students.*/i, '');
      clean.split(/[,&/]+/).forEach(p => {
        const c = p.trim().replace(/\b(coaches|coach|instructors|instructor|instruc)\b/gi, '').trim();
        if (c.length > 1 && !/^\d+$/.test(c) && !list.some(x => x.toLowerCase() === c.toLowerCase())) {
          list.push(c.charAt(0).toUpperCase() + c.slice(1));
        }
      });
    }
    if (studentData?.instructor) {
      const si = studentData.instructor.trim().replace(/\b(coaches|coach|instructors|instructor)\b/gi, '').trim();
      if (si.length > 1 && !list.some(x => x.toLowerCase() === si.toLowerCase())) {
        list.unshift(si.charAt(0).toUpperCase() + si.slice(1));
      }
    }
    return list;
  };

  const getCleanCoachName = (sess, overrideCoach = null) => {
    if (overrideCoach && typeof overrideCoach === 'string' && overrideCoach.trim()) {
      const clean = overrideCoach.trim().replace(/\b(coaches|coach|instructors|instructor)\b/gi, '').trim();
      return clean ? `Coach ${clean.charAt(0).toUpperCase() + clean.slice(1)}` : 'Certified Ocean Coach';
    }
    if (!sess || sess === 'overall') {
      const sCoach = studentData?.instructor || '';
      if (sCoach && sCoach.trim()) {
        const clean = sCoach.trim().replace(/\b(coaches|coach|instructors|instructor)\b/gi, '').trim();
        return `Coach ${clean.charAt(0).toUpperCase() + clean.slice(1)}`;
      }
      return 'Certified Ocean Coach';
    }

    // 1. Direct single instructor field if provided
    if (sess.primary_instructor && typeof sess.primary_instructor === 'string') {
      const pi = sess.primary_instructor.trim().replace(/\b(coaches|coach|instructors|instructor)\b/gi, '').trim();
      if (pi) return `Coach ${pi.charAt(0).toUpperCase() + pi.slice(1)}`;
    }

    let raw = sess.instructor_name || sess.assigned_coach || sess.instructor || sess.coach || '';
    if (!raw || !raw.trim()) {
      if (studentData?.instructor) {
        raw = studentData.instructor;
      }
    }
    if (!raw || !raw.trim()) return 'Certified Ocean Coach';

    // Remove group/schedule prefixes e.g. "Group A (02:00 PM - 04:00 PM) - Coaches: "
    raw = raw.replace(/^group\s+[a-z0-9]+[^:]*:\s*/i, '');
    raw = raw.replace(/\s*-\s*\d+\s*students.*/i, '');
    const parts = raw
      .split(/[,&/]+/)
      .map(p => p.trim().replace(/\b(coaches|coach|instructors|instructor|instruc)\b/gi, '').trim())
      .filter(p => p.length > 1 && !/^\d+$/.test(p));

    if (parts.length === 0) {
      if (studentData?.instructor) {
        const si = studentData.instructor.trim().replace(/\b(coaches|coach|instructors|instructor)\b/gi, '').trim();
        if (si) return `Coach ${si.charAt(0).toUpperCase() + si.slice(1)}`;
      }
      return 'Certified Ocean Coach';
    }

    // 2. If student has an assigned instructor that matches one of the coaches in parts, prioritize that coach!
    const stdCoach = (studentData?.instructor || '').toLowerCase().trim();
    if (stdCoach) {
      const matched = parts.find(p => p.toLowerCase() === stdCoach || stdCoach.includes(p.toLowerCase()) || p.toLowerCase().includes(stdCoach));
      if (matched) {
        return `Coach ${matched.charAt(0).toUpperCase() + matched.slice(1)}`;
      }
    }

    // 3. Fallback to the single primary coach name, never plural joined list
    const primary = parts[0];
    const cap = primary.charAt(0).toUpperCase() + primary.slice(1);
    return `Coach ${cap}`;
  };

  const getCoachQuote = (sess) => {
    if (!sess || sess === 'overall') return 'Small wins. Big ocean energy.';
    const notes = sess.notes || sess.coach_notes || sess.feedback || '';

    // Check if notes contains genuine coach technique feedback
    if (notes) {
      const wellMatch = notes.match(/What You did Well:\s*([^.\n;\-]+)/i) || notes.match(/Well:\s*([^.\n;\-]+)/i);
      if (wellMatch && wellMatch[1].trim()) {
        const text = wellMatch[1].replace(/\[\d+\s*out of\s*10\]/gi, '').replace(/\s*-\s*/g, '').trim();
        if (text && text.length > 3) {
          return text.charAt(0).toUpperCase() + text.slice(1);
        }
      }

      // Check if notes has real human commentary not matching admin templates
      const isAdminTemplate = /Group\s+[A-Z]/i.test(notes) || 
                              /Coaches:/i.test(notes) || 
                              /\d+\s*students/i.test(notes) || 
                              /^\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(notes);

      if (!isAdminTemplate) {
        const firstLine = notes.split('\n')[0].replace(/^Coach Notes:\s*/i, '').replace(/^Wave Count:\s*\d+/i, '').trim();
        const clean = firstLine.replace(/\[\d+\s*out of\s*10\]/gi, '').trim();
        if (clean && clean.length > 5) {
          return clean.slice(0, 80);
        }
      }
    }

    // Dynamic authentic Coach Technique Praise based on score and performance
    const score = getSessionScore(sess);
    const waves = getSessionWaves(sess);

    if (score >= 85) {
      return 'Explosive takeoff speed, confident wave positioning & fluid ocean control!';
    } else if (score >= 75) {
      return 'Solid pop-up stance, balanced weight distribution & clean wave face riding.';
    } else if (score >= 65) {
      return 'Great paddle commitment, smooth pop-up timing & steady technique gains!';
    } else if (waves >= 6) {
      return 'Relentless ocean stamina, fearless wave entry & great wave count today!';
    } else {
      return 'Every wave caught is a boundary pushed. Master the ocean with confidence!';
    }
  };

  // High-Resolution Story Poster Generator (WYSIWYG DOM Capture with Canvas Fallback)
  const generateStoryPosterBlob = async (sess, template = shareTemplate, photoDataUrl = customPhotoUrl, filter = photoFilter, posY = photoPosY, fit = photoFit) => {
    // 1. WYSIWYG DOM Capture: If the active preview card is mounted, capture it directly so the
    // downloaded image matches 100% what the user sees on screen (typography, badges, colors, layout).
    if (cardRef.current) {
      try {
        const domBlob = await toBlob(cardRef.current, {
          pixelRatio: 2.5,
          cacheBust: false,
          skipFonts: true,
          fontEmbedCSS: '',
          style: {
            boxShadow: 'none',
            transform: 'none',
            margin: '0',
          },
        });
        if (domBlob && domBlob.size > 2000) {
          return domBlob;
        }
      } catch (domErr) {
        console.warn('DOM card capture fallback to canvas:', domErr);
      }
    }

    // 2. Fallback: High-Resolution Story Poster Canvas Generator (1080x1350, 4:5 portrait)
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350; // Standard 4:5 mobile story / portrait ratio
    const ctx = canvas.getContext('2d');
    const isOverall = sess === 'overall';

    // Prioritize user's uploaded custom photo first and foremost!
    const activePhoto = customPhotoUrl || photoDataUrl || (sess && sess.image_url) || posterBgUrl || '/surf-milestone-bg.jpg';

    const photoImg = new Image();
    const isDataOrBlob = typeof activePhoto === 'string' && (activePhoto.startsWith('data:') || activePhoto.startsWith('blob:'));
    if (!isDataOrBlob) {
      photoImg.crossOrigin = 'anonymous';
    }
    photoImg.src = activePhoto;

    await new Promise((resolve) => {
      if (photoImg.complete && photoImg.naturalWidth > 0) {
        return resolve();
      }
      photoImg.onload = resolve;
      photoImg.onerror = () => {
        console.warn('Poster image failed to load, falling back to default ocean image');
        if (photoImg.src !== '/surf-milestone-bg.jpg') {
          photoImg.removeAttribute('crossorigin');
          photoImg.src = '/surf-milestone-bg.jpg';
          photoImg.onload = resolve;
          photoImg.onerror = resolve;
        } else {
          resolve();
        }
      };
    });

    const athnexLogo = new Image();
    athnexLogo.src = '/athnexlive-logo.png';
    await new Promise((resolve) => {
      if (athnexLogo.complete && athnexLogo.naturalWidth > 0) return resolve();
      athnexLogo.onload = resolve;
      athnexLogo.onerror = resolve;
    });

    const drawAthnexLogoBadge = (rightX, topY, height = 34) => {
      if (!athnexLogo.complete || !athnexLogo.naturalWidth) return;
      const aspect = athnexLogo.naturalWidth / athnexLogo.naturalHeight;
      const logoW = height * aspect;
      const padX = 12, padY = 6;
      const boxW = logoW + padX * 2;
      const boxH = height + padY * 2;
      const boxX = rightX - boxW;
      const boxY = topY;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(athnexLogo, boxX + padX, boxY + padY, logoW, height);
    };

    const isCustomUserPhoto = Boolean(customPhotoUrl);

    const drawCover = (dx, dy, dw, dh) => {
      if (!photoImg.complete || !photoImg.naturalWidth) return;
      ctx.save();
      if (!isCustomUserPhoto) {
        ctx.globalAlpha = 0.42;
      }
      if (filter === 'golden') {
        ctx.filter = 'brightness(1.05) saturate(1.25) sepia(0.15)';
      } else if (filter === 'ocean') {
        ctx.filter = 'contrast(1.08) saturate(1.2) hue-rotate(-8deg)';
      } else if (filter === 'vivid') {
        ctx.filter = 'contrast(1.15) saturate(1.3)';
      } else {
        ctx.filter = 'none';
      }

      if (fit === 'contain') {
        // Subtle dark backdrop behind contained full image
        ctx.fillStyle = template === 'keepsake' ? '#E2E8F0' : template === 'scorecard' ? '#064E3B' : '#0B1120';
        ctx.fillRect(dx, dy, dw, dh);
        const scale = Math.min(dw / photoImg.naturalWidth, dh / photoImg.naturalHeight);
        const cw = photoImg.naturalWidth * scale;
        const ch = photoImg.naturalHeight * scale;
        const cx = dx + (dw - cw) / 2;
        const cy = dy + (dh - ch) / 2;
        ctx.drawImage(photoImg, 0, 0, photoImg.naturalWidth, photoImg.naturalHeight, cx, cy, cw, ch);
      } else {
        const iR = photoImg.naturalWidth / photoImg.naturalHeight;
        const tR = dw / dh;
        let sx = 0, sy = 0, sw = photoImg.naturalWidth, sh = photoImg.naturalHeight;
        if (iR > tR) {
          sw = photoImg.naturalHeight * tR;
          sx = (photoImg.naturalWidth - sw) / 2;
          sy = 0;
        } else {
          sh = photoImg.naturalWidth / tR;
          sx = 0;
          const maxSy = photoImg.naturalHeight - sh;
          sy = Math.max(0, Math.min(maxSy, maxSy * (posY / 100)));
        }
        ctx.drawImage(photoImg, sx, sy, sw, sh, dx, dy, dw, dh);
      }
      ctx.restore();
    };

    const rawWaves = isOverall ? stats.totalWaves : getSessionWaves(sess);
    const rawScore = isOverall ? stats.avgScore : getSessionScore(sess);
    const wavesCount = rawWaves !== null ? rawWaves : '--';
    const scoreVal = rawScore !== null ? rawScore : '--';
    const scoreOutOf10 = getScoreOutOfTen(scoreVal);
    const waterTime = getSessionWaterTime(sess);
    const rawPopUp = isOverall ? (rawScore ? Math.round(rawScore / 10) : null) : getSessionPopUpRating(sess, rawScore);
    const rawPaddling = isOverall ? (rawScore ? Math.round(rawScore / 12) : null) : getSessionPaddlingRating(sess, rawScore);
    const popUpRating = rawPopUp !== null ? `${rawPopUp}/10` : '--';
    const paddlingRating = rawPaddling !== null ? `${rawPaddling}/10` : '--';
    const coachName = getCleanCoachName(sess, selectedCoachOverride);
    const displaySchoolName = (sess && (sess.school || sess.student_school)) || studentData?.school || effectiveSchool || loggedUser?.school || studentSchool || 'Surf Academy';
    const dateFormatted = getSessionFormattedDate(sess);
    const quoteText = getCoachQuote(sess);
    const shortDuration = isOverall ? `${stats.totalHours} hrs` : (sess && sess.duration_mins ? `${Math.round(sess.duration_mins / 60 * 10) / 10} hrs` : '2.0 hrs');
    const sessionLoc = isOverall ? studentSchool : ((sess && sess.location) || studentSchool || 'Surf Beach');

    if (template === 'keepsake') {
      // ══════ TEMPLATE 2: OCEAN KEEPSAKE (Warm Cream / Minimal Sand) ══════
      ctx.fillStyle = '#FAF6F0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top-Right Athnexlive Logo Badge
      drawAthnexLogoBadge(1000, 60, 32);

      // Header Tag
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0D9488';
      ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("THE COACH'S CUT  /  SESSION KEEPSAKE", 90, 105);

      // Headline
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 58px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Small wins.', 90, 175);
      ctx.fillText('Big ocean energy.', 90, 235);

      // Highlighted Student Name on Canvas
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 34px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(studentName, 90, 282);

      // Subline (School Name instead of Group Name)
      ctx.fillStyle = '#64748B';
      ctx.font = '600 21px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${displaySchoolName}  •  ${dateFormatted}`, 90, 318);

      // Framed Photo in Center
      const frameX = 80, frameY = 340, frameW = 920, frameH = 570;
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(frameX, frameY, frameW, frameH, 20);
      ctx.fill();
      ctx.restore();

      // Inner Photo
      const pad = 16;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(frameX + pad, frameY + pad, frameW - pad * 2, frameH - pad * 2, 14);
      ctx.clip();
      drawCover(frameX + pad, frameY + pad, frameW - pad * 2, frameH - pad * 2);
      ctx.restore();

      // Floating Circular Gold Badge pinned at bottom-right of photo
      const badgeR = 66;
      const badgeCX = frameX + frameW - 78;
      const badgeCY = frameY + frameH - 18;
      ctx.save();
      ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      const goldGrad = ctx.createLinearGradient(badgeCX - badgeR, badgeCY - badgeR, badgeCX + badgeR, badgeCY + badgeR);
      goldGrad.addColorStop(0, '#FDE68A');
      goldGrad.addColorStop(1, '#F59E0B');
      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      // Top: WAVES
      ctx.fillStyle = '#78350F';
      ctx.font = '900 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('WAVES', badgeCX, badgeCY - 22);
      // Center: wavesCount
      ctx.font = '900 48px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${wavesCount}`, badgeCX, badgeCY + 14);
      // Bottom: CAUGHT
      ctx.fillStyle = '#92400E';
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(wavesCount !== '--' ? 'waves' : 'caught', badgeCX, badgeCY + 36);
      ctx.restore();

      // Quote & Notes Below
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748B';
      ctx.font = 'italic 500 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('A little salt. A lot of progress.', 90, 950);

      ctx.fillStyle = '#0F172A';
      ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`“${quoteText}”`, 90, 1015);

      ctx.fillStyle = '#0D9488';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(coachName, 90, 1065);

      // Bottom Stats Row
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(90, 1115, 900, 2);

      ctx.fillStyle = '#059669';
      ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('✓ Completed', 90, 1165);

      ctx.fillStyle = '#334155';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(scoreOutOf10 !== '--' ? `⭐ ${scoreOutOf10}/10 coach score` : '⭐ Coach score pending', 380, 1165);
      ctx.fillText(`⏱️ ${waterTime} in water`, 720, 1165);

      // Watermark
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('athnexlive.com', canvas.width / 2, 1285);

    } else if (template === 'scorecard') {
      // ══════ TEMPLATE 3: PERSONAL SCORECARD (Exact Reference Match) ══════
      ctx.fillStyle = '#006859';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top-Right Athnexlive Logo Badge
      drawAthnexLogoBadge(1000, 60, 32);

      // Top Tag: THE COACH'S CUT
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("THE COACH'S CUT", 80, 95);

      // Headline
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 62px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Progress,', 80, 170);
      ctx.fillText('worth sharing.', 80, 240);

      // Pill: ✓ SESSION COMPLETE
      ctx.fillStyle = '#99F6E4';
      ctx.beginPath();
      ctx.roundRect(80, 285, 290, 48, 24);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#042F2C';
      ctx.font = '900 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('✓ SESSION COMPLETE', 225, 316);

      // Middle Section - Left Column
      ctx.textAlign = 'left';
      ctx.fillStyle = '#5EEAD4';
      ctx.font = '950 145px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${wavesCount}`, 80, 520);
      const waveW = ctx.measureText(`${wavesCount}`).width;

      if (wavesCount !== '--') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('waves', 80 + waveW + 12, 490);
      }

      // Wave Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('WAVES CAUGHT', 80, 565);

      // Athlete Details (Highlighted Hero)
      ctx.fillStyle = '#5EEAD4';
      ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(studentName, 80, 655);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${displaySchoolName}  •  ${dateFormatted}`, 80, 695);

      // Right Column: Arched Surfer Photo Frame (Expanded to utilize space)
      const archX = 560, archY = 240, archW = 440, archH = 620;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(archX, archY, archW, archH, [220, 220, 44, 44]);
      ctx.clip();
      drawCover(archX, archY, archW, archH);
      ctx.restore();

      // Divider Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 900);
      ctx.lineTo(1000, 900);
      ctx.stroke();

      // Bottom Row: 3 Metrics Columns (Plain text, no boxes)
      const metrics = [
        { x: 80, val: `${scoreOutOf10 !== '--' ? `${scoreOutOf10}/10` : '--'}`, lbl: 'COACH SCORE' },
        { x: 400, val: waterTime, lbl: 'WATER TIME' },
        { x: 740, val: `${wavesCount}`, lbl: 'WAVES CAUGHT' }
      ];

      metrics.forEach((m) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 52px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(m.val, m.x, 975);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(m.lbl, m.x, 1018);
      });

      // Coach Quote Box at Bottom (Pale Mint Rounded Box)
      const qBoxY = 1070;
      ctx.fillStyle = '#D1FAE5';
      ctx.beginPath();
      ctx.roundRect(80, qBoxY, 920, 155, 24);
      ctx.fill();

      // Quote Text
      ctx.textAlign = 'left';
      ctx.fillStyle = '#064E3B';
      ctx.font = '750 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`“${quoteText}”`, 120, qBoxY + 65);

      // Coach Signature
      ctx.fillStyle = '#047857';
      ctx.font = '650 21px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(coachName, 120, qBoxY + 115);

      // Watermark
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('athnexlive.com', canvas.width / 2, 1295);

    } else {
      // ══════ TEMPLATE 1: PHOTO SPOTLIGHT (Dark Slate Theme / Big Hero Photo) ══════
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Hero Photo occupying top half (0 to 760)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, 760);
      ctx.clip();
      drawCover(0, 0, canvas.width, 760);
      ctx.restore();

      // Smooth Bottom Gradient on Photo
      const fGrad = ctx.createLinearGradient(0, 520, 0, 765);
      fGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      fGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = fGrad;
      ctx.fillRect(0, 520, canvas.width, 245);

      // Top-Left Pill: Athlete Surfer Name ("Name inga varalaam")
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      const pillText = `🏄 ${studentName.toUpperCase()}`;
      const pillTextW = ctx.measureText(pillText).width;
      const pillW = Math.max(200, Math.min(380, pillTextW + 36));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(70, 70, pillW, 48, 10);
      ctx.fill();
      ctx.fillStyle = '#2DD4BF';
      ctx.textAlign = 'center';
      ctx.fillText(pillText, 70 + pillW / 2, 100);

      // Top-Right Athnexlive Logo Badge
      drawAthnexLogoBadge(1010, 70, 32);

      // Photo Bottom-Left Pill: "✓ SESSION COMPLETE"
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.roundRect(70, 670, 220, 42, 8);
      ctx.fill();
      ctx.fillStyle = '#92400E';
      ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('✓ SESSION COMPLETE', 70 + 110, 696);

      // Lower Section (780 to 1350)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 58px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('A session to be', 70, 840);
      ctx.fillText('proud of.', 70, 910);

      // Right Side Waves Box (Swapped from Score)
      const scBoxX = 770, scBoxY = 780;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(scBoxX, scBoxY, 240, 130, 18);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#2DD4BF';
      ctx.font = '900 64px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${wavesCount}`, scBoxX + 90, scBoxY + 70);

      if (wavesCount !== '--') {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('waves', scBoxX + 175, scBoxY + 68);
      }

      ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('WAVES CAUGHT', scBoxX + 120, scBoxY + 106);

      // Subline
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${displaySchoolName}  •  ${dateFormatted}`, 70, 985);

      // Divider
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(70, 1045, 940, 2);

      // Metrics Trio on Canvas
      const pY = 1055, pW = 290, pH = 75, pGap = 35;
      const spotPills = [
        { val: scoreOutOf10 !== '--' ? `${scoreOutOf10}/10` : 'Unrated', lbl: 'COACH SCORE' },
        { val: waterTime, lbl: 'WATER TIME' },
        { val: wavesCount !== '--' ? `${wavesCount} Waves` : 'In Training', lbl: 'WAVES CAUGHT' },
      ];
      spotPills.forEach((p, i) => {
        const px = 70 + i * (pW + pGap);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(px, pY, pW, pH, 14);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 24px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(p.val, px + pW / 2, pY + 36);
        ctx.fillStyle = '#2DD4BF';
        ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(p.lbl, px + pW / 2, pY + 60);
      });

      // Coach Verdict Banner on Canvas
      const qBoxY = 1145;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(70, qBoxY, 940, 90, 14);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#2DD4BF';
      ctx.font = '800 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('COACH VERDICT', 95, qBoxY + 30);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#FCD34D';
      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(coachName, 985, qBoxY + 30);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#F1F5F9';
      ctx.font = 'italic 600 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`“${quoteText}”`, 95, qBoxY + 66);

      // Watermark
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748B';
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('athnexlive.com', canvas.width / 2, 1290);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  // WhatsApp Share Handler — Shares actual image poster on mobile or auto-downloads & copies to clipboard on desktop
  const handleShareWhatsApp = async (sess) => {
    const text = buildShareText(sess);
    const cleanName = studentName.replace(/\s+/g, '_');

    try {
      setDownloadingImg(true);
      const blob = await generateStoryPosterBlob(sess);
      if (blob) {
        const file = new File([blob], `Athnex_Surfing_Milestone_${cleanName}.png`, { type: 'image/png' });

        // Native file share (Mobile devices with WhatsApp)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Athnex Surf Milestone - ${studentName}`,
            text: text
          });
          setDownloadingImg(false);
          return;
        }

        // Desktop fallback: Auto-download the high-res poster and copy image to clipboard
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Athnex_Surfing_Milestone_${cleanName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
          }
        } catch (clipErr) {
          console.warn('Clipboard image write not permitted in context', clipErr);
        }
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 3500);
      }
    } catch (err) {
      console.warn('WhatsApp poster share preparation error', err);
    } finally {
      setDownloadingImg(false);
    }

    // Open WhatsApp Web with text
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Twitter / X Share Handler
  const handleShareTwitter = (sess) => {
    const isOverall = sess === 'overall';
    const tweetText = isOverall
      ? `Stoked! Just hit ${stats.completed} surf sessions and ${stats.totalWaves} waves logged on @athnexlive! 🏄‍♂️🌊 #Surfing #AthnexLive #SurfTraining`
      : `Stoked on my surf session at ${sess.location || 'the coast'} with ${getCleanCoachName(sess)}! 🏄‍♂️🌊 Verified on @athnexlive #Surfing #WaveRider`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent('https://athnexlive.com')}`, '_blank');
  };

  // Facebook Share Handler
  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://athnexlive.com')}`, '_blank');
  };

  // Native Mobile Web Share API Handler — Direct Photo Share
  const handleNativeShare = async (sess) => {
    const text = buildShareText(sess);
    const cleanName = studentName.replace(/\s+/g, '_');

    try {
      setDownloadingImg(true);
      const blob = await generateStoryPosterBlob(sess);
      if (blob) {
        const file = new File([blob], `Athnex_Surfing_Milestone_${cleanName}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `🏄 Surf Session Milestone - ${studentName}`,
            text: text
          });
          setDownloadingImg(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Native file share failed', e);
    } finally {
      setDownloadingImg(false);
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `🏄 Surf Session Milestone - ${studentName}`,
          text: text,
          url: 'https://athnexlive.com'
        });
      } catch (e) {
        // Fallback to clipboard if cancelled or dismissed
      }
    } else {
      handleCopyText(sess);
    }
  };

  // Clipboard Copy Handler
  const handleCopyText = async (sess) => {
    const text = buildShareText(sess);
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch (e) {
      console.warn('Copy to clipboard failed', e);
    }
  };

  // High-Quality Motivational Story Poster Canvas Downloader
  const handleDownloadStoryCard = async (sess) => {
    try {
      setDownloadingImg(true);
      const blob = await generateStoryPosterBlob(sess, shareTemplate, customPhotoUrl, photoFilter, photoPosY, photoFit);
      if (!blob) return;
      launchConfetti();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = studentName.replace(/\s+/g, '_');
      a.download = `Athnex_Session_${shareTemplate}_${cleanName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate story image card:', err);
    } finally {
      setDownloadingImg(false);
    }
  };

  const handleNativeShareCard = async (sess) => {
    try {
      setShareCardBusy(true);
      const blob = await generateStoryPosterBlob(sess, shareTemplate, customPhotoUrl, photoFilter, photoPosY, photoFit);
      if (!blob) return;
      launchConfetti();
      const cleanName = studentName.replace(/\s+/g, '_');
      const file = new File([blob], `Athnex_Session_${shareTemplate}_${cleanName}.png`, { type: 'image/png' });
      const text = buildShareText(sess);

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Athnex Surf Session - ${studentName}`,
          text: text
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: `Athnex Surf Session - ${studentName}`,
          text: text,
          url: 'https://athnexlive.com'
        });
        return;
      }

      handleShareWhatsApp(sess);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Native share error, falling back:', err);
        handleShareWhatsApp(sess);
      }
    } finally {
      setShareCardBusy(false);
    }
  };

  // ── Confetti Party Popper Animation on Share Open ────────────────────────
  const launchConfetti = useCallback(() => {
    setConfettiActive(true);
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = [
      '#F59E0B', '#10B981', '#3B82F6', '#EC4899',
      '#8B5CF6', '#2DD4BF', '#FCD34D', '#EF4444', '#06B6D4'
    ];
    const particleCount = 140;
    const particles = [];

    // Dual party poppers: left & right bursts exploding toward center-top!
    for (let i = 0; i < particleCount; i++) {
      const isLeft = i % 2 === 0;
      const angle = isLeft
        ? (-Math.PI / 4 + (Math.random() - 0.5) * 0.7)
        : (-3 * Math.PI / 4 + (Math.random() - 0.5) * 0.7);
      const speed = 15 + Math.random() * 18;

      particles.push({
        x: isLeft ? 60 : canvas.width - 60,
        y: canvas.height - 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 14,
        shape: Math.random() > 0.35 ? 'rect' : 'circle',
        alpha: 1,
        gravity: 0.38 + Math.random() * 0.22,
        decay: 0.005 + Math.random() * 0.006
      });
    }

    const startTime = performance.now();
    const render = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.988;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;

          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      if (alive && (now - startTime < 4200)) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setConfettiActive(false);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(render);
  }, []);

  const openShareModal = (target) => {
    setSelectedCoachOverride(null);
    setShareModalSession(target);
    // Trigger confetti slightly after modal mount for high impact
    setTimeout(() => {
      launchConfetti();
    }, 50);
  };

  // ── Certificate Generator (HTML5 Canvas, A4 Landscape) ───────────────────
  const handleDownloadCertificate = async () => {
    if (!isCertificateUnlocked) {
      setCertLockModal(true);
      return;
    }
    try {
      setDownloadingCert(true);
      const W = 1754, H = 1240; // A4 landscape @150dpi
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Safe image loader with same-origin proxy fallback for S3/CORS images
      const loadSingleImg = (srcUrl) => new Promise((resolve) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
          img.onerror = () => resolve(null);
          img.src = srcUrl;
          setTimeout(() => resolve(null), 8000);
        } catch (e) {
          resolve(null);
        }
      });

      const loadImgSafely = async (url) => {
        if (!url) return null;
        if (url.startsWith('data:') || url.startsWith('blob:')) {
          return await loadSingleImg(url);
        }
        // For external http(s) URLs (like S3), try proxy first or fallback to proxy if CORS blocks direct load
        const directUrl = url.startsWith('http')
          ? `${url}${url.includes('?') ? '&' : '?'}cors_cb=1`
          : url;
        const directImg = await loadSingleImg(directUrl);
        if (directImg) return directImg;

        if (url.startsWith('http')) {
          const proxyUrl = `${API}/api/proxy-image?url=${encodeURIComponent(url)}`;
          return await loadSingleImg(proxyUrl);
        }
        return null;
      };

      // Guaranteed file downloader with Blob and DataURL fallback and safe revocation
      const triggerCanvasDownload = (targetCanvas, filename) => {
        const deliverFile = (urlOrDataUrl, isBlob) => {
          try {
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = urlOrDataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              try {
                document.body.removeChild(a);
                if (isBlob) URL.revokeObjectURL(urlOrDataUrl);
              } catch (e) {}
            }, 60000);
          } catch (err) {
            console.error('Download link error:', err);
          } finally {
            setDownloadingCert(false);
          }
        };

        try {
          targetCanvas.toBlob((blob) => {
            if (blob) {
              const objUrl = URL.createObjectURL(blob);
              deliverFile(objUrl, true);
            } else {
              // Fallback to Data URL if toBlob returned null
              try {
                const dataUrl = targetCanvas.toDataURL('image/png');
                deliverFile(dataUrl, false);
              } catch (e) {
                console.error('DataURL fallback failed:', e);
                setDownloadingCert(false);
              }
            }
          }, 'image/png');
        } catch (err) {
          try {
            const dataUrl = targetCanvas.toDataURL('image/png');
            deliverFile(dataUrl, false);
          } catch (e2) {
            console.error('All canvas exports failed:', e2);
            setDownloadingCert(false);
          }
        }
      };

      const completedSessions = sessions.filter(isSessionCompleted);
      const lastSession = completedSessions[0];
      const certDate = lastSession?.date
        ? new Date(lastSession.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const coachNameCert = getCleanCoachName(lastSession) || 'Certified Ocean Coach';

      // Check if the academy has a customized certificate template configured
      const rawCertConfig = schoolCertConfig || (() => {
        try {
          const cached = studentSchool ? localStorage.getItem(`athnex_cert_${studentSchool}`) : null;
          return cached ? JSON.parse(cached) : null;
        } catch (e) {
          return null;
        }
      })();

      // Resolve course-specific certificate dynamically using tiered bracket matching:
      // e.g. with 3-Day, 5-Day, 10-Day templates: 1-4 -> 3-Day, 5-9 -> 5-Day, 10+ -> 10-Day
      const targetCourseKey = (() => {
        if (!rawCertConfig?.courses) return null;
        const entries = Object.entries(rawCertConfig.courses)
          .filter(([_, c]) => Boolean(c))
          .map(([key, c]) => {
            const parsedDays = parseInt(c.days, 10) || (String(key).match(/\d+/) ? parseInt(String(key).match(/\d+/)[0], 10) : 0);
            return { key, days: parsedDays };
          })
          .filter(item => item.days > 0)
          .sort((a, b) => a.days - b.days);

        if (entries.length > 0) {
          // Largest configured template with days <= requiredSessions; if enrolled days < smallest template, use smallest
          const eligible = entries.filter(item => item.days <= requiredSessions);
          if (eligible.length > 0) {
            return eligible[eligible.length - 1].key;
          }
          return entries[0].key;
        }

        return rawCertConfig.activeCourseKey || Object.keys(rawCertConfig.courses)[0] || null;
      })();

      const activeCertConfig = (targetCourseKey && rawCertConfig?.courses?.[targetCourseKey])
        ? rawCertConfig.courses[targetCourseKey]
        : (rawCertConfig?.courses?.[rawCertConfig.activeCourseKey] || rawCertConfig);

      if (activeCertConfig && (activeCertConfig.custom_bg_url || activeCertConfig.fields)) {
        // ── CUSTOM ACADEMY CERTIFICATE RENDERER ──
        if (activeCertConfig.template_type === 'custom' && activeCertConfig.custom_bg_url) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, W, H);
          const bgImg = await loadImgSafely(activeCertConfig.custom_bg_url);
          if (bgImg) {
            try { ctx.drawImage(bgImg, 0, 0, W, H); } catch (e) {
              ctx.fillStyle = '#FAFBFD'; ctx.fillRect(0, 0, W, H);
            }
          } else {
            ctx.fillStyle = '#FAFBFD'; ctx.fillRect(0, 0, W, H);
          }
        } else if (activeCertConfig.template_type === 'minimal_emerald') {
          const bgGrad = ctx.createLinearGradient(0, 0, W, H);
          bgGrad.addColorStop(0, '#FAFBFD');
          bgGrad.addColorStop(1, '#F1F5F9');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);

          ctx.lineWidth = 12;
          ctx.strokeStyle = '#0D9488';
          ctx.strokeRect(36, 36, W - 72, H - 72);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(13, 148, 136, 0.4)';
          ctx.strokeRect(52, 52, W - 104, H - 104);
        } else if (activeCertConfig.template_type === 'ocean_wave') {
          const bgGrad = ctx.createLinearGradient(0, 0, W, H);
          bgGrad.addColorStop(0, '#042F2E');
          bgGrad.addColorStop(0.5, '#115E59');
          bgGrad.addColorStop(1, '#064E3B');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);

          ctx.lineWidth = 10;
          ctx.strokeStyle = '#5EEAD4';
          ctx.strokeRect(36, 36, W - 72, H - 72);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(94, 234, 212, 0.4)';
          ctx.strokeRect(52, 52, W - 104, H - 104);
        } else {
          // navy_gold or default preset
          const bgGrad = ctx.createLinearGradient(0, 0, W, H);
          bgGrad.addColorStop(0, '#0A1628');
          bgGrad.addColorStop(0.5, '#0D2240');
          bgGrad.addColorStop(1, '#071020');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);

          if (activeCertConfig.template_type === 'default' || !activeCertConfig.template_type) {
            const bgImg = await loadImgSafely('/surf-milestone-bg.jpg');
            if (bgImg && bgImg.naturalWidth > 0) {
              ctx.globalAlpha = 0.16;
              try { ctx.drawImage(bgImg, 0, 0, W, H); } catch (e) {}
              ctx.globalAlpha = 1;
            }
          }

          ctx.lineWidth = 12;
          ctx.strokeStyle = '#D4AF37';
          ctx.strokeRect(36, 36, W - 72, H - 72);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
          ctx.strokeRect(52, 52, W - 104, H - 104);

          const drawDiamond = (cx, cy, size) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#D4AF37';
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.restore();
          };
          [44, W - 44].forEach(x => [44, H - 44].forEach(y => drawDiamond(x, y, 22)));

          if (activeCertConfig.template_type === 'default' || !activeCertConfig.template_type) {
            // Circular A Badge (only draw if school hasn't uploaded custom school logo)
            if (!activeCertConfig.fields?.school_logo?.image_url) {
              ctx.textAlign = 'center';
              ctx.beginPath();
              ctx.arc(W / 2, 115, 42, 0, Math.PI * 2);
              ctx.fillStyle = '#2DD4BF';
              ctx.fill();
              ctx.fillStyle = '#0A1628';
              ctx.font = 'bold 42px Arial, sans-serif';
              ctx.fillText('A', W / 2, 130);
            }

            ctx.fillStyle = 'rgba(212,175,55,0.7)';
            ctx.font = '18px Arial, sans-serif';
            ctx.fillText('OFFICIAL SURF ACADEMY • athnexlive.com', W / 2, 215);

            const drawDivider = (y) => {
              const grad = ctx.createLinearGradient(200, y, W - 200, y);
              grad.addColorStop(0, 'transparent');
              grad.addColorStop(0.3, '#D4AF37');
              grad.addColorStop(0.7, '#D4AF37');
              grad.addColorStop(1, 'transparent');
              ctx.strokeStyle = grad;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(200, y);
              ctx.lineTo(W - 200, y);
              ctx.stroke();
            };
            drawDivider(240);

            ctx.fillStyle = '#FEF3C7';
            ctx.font = 'italic 22px Georgia, serif';
            ctx.fillText('This is to certify that', W / 2, 290);

            drawDivider(600);
            const pills = [
              { icon: '🏄', label: 'SESSIONS', val: `${stats.completed || completedSessions.length} Completed` },
              { icon: '🌊', label: 'WAVES RIDDEN', val: `${stats.totalWaves || 0} Waves` },
              { icon: '⭐', label: 'COACH SCORE', val: `${stats.avgScore || 88} / 100` },
            ];
            const pillW = 360, pillH = 90, pillGap = 60;
            const totalPillW = pills.length * pillW + (pills.length - 1) * pillGap;
            const pillStartX = (W - totalPillW) / 2;

            pills.forEach((p, i) => {
              const px = pillStartX + i * (pillW + pillGap);
              const py = 630;
              ctx.fillStyle = 'rgba(45,212,191,0.08)';
              ctx.strokeStyle = 'rgba(45,212,191,0.35)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(px, py, pillW, pillH, 14);
              ctx.fill();
              ctx.stroke();
              ctx.textAlign = 'center';
              ctx.fillStyle = '#2DD4BF';
              ctx.font = 'bold 30px Arial, sans-serif';
              ctx.fillText(`${p.icon} ${p.val}`, px + pillW / 2, py + 40);
              ctx.fillStyle = '#94A3B8';
              ctx.font = '17px Arial, sans-serif';
              ctx.fillText(p.label, px + pillW / 2, py + 70);
            });

            drawDivider(760);
          }
        }

        // Render each configured field at exact coordinates
        const allFields = [
          ...Object.entries(activeCertConfig.fields || {}).map(([k, f]) => ({ ...f, key: k })),
          ...(activeCertConfig.custom_fields || []).map((f, i) => ({ ...f, key: `custom_${i}` }))
        ];

        const studentDays = Math.max(1, parseInt(requiredSessions, 10) || 1);
        const dayWordCap = studentDays === 1 ? 'Day' : 'Days';
        const dayWordLower = studentDays === 1 ? 'day' : 'days';

        // Dynamically replace any hardcoded day count (e.g. 10-Day, 3-Day) with the student's actual course duration
        const formatWithStudentDays = (text) => {
          if (!text || typeof text !== 'string') return text;
          return text
            // 1. Hyphenated: e.g. "10-Day", "10-day", "3-Day", "1-Day", "5 - Days"
            .replace(/\b\d+\s*-\s*day(s)?\b/gi, (match) => {
              const isCap = match.includes('D');
              return `${studentDays}-${isCap ? 'Day' : 'day'}`;
            })
            // 2. Space separated: e.g. "10 Days", "10 days", "10 Day", "3 Days", "1 Day"
            .replace(/\b\d+\s+day(s)?\b/gi, (match) => {
              const isCap = match.includes('D');
              return `${studentDays} ${isCap ? dayWordCap : dayWordLower}`;
            })
            // 3. Compact: e.g. "10days", "3day"
            .replace(/\b\d+day(s)?\b/gi, (match) => {
              const isCap = match.includes('D');
              return `${studentDays}-${isCap ? 'Day' : 'day'}`;
            });
        };

        for (const field of allFields) {
          if (field.visible === false) continue;
          const fx = (field.x / 100) * W;
          const fy = (field.y / 100) * H;
          const scaleFactor = W / 800;

          // Image Field Rendering (School Logo or Coach Signature Photo)
          if (field.key === 'athnex_logo') continue;
          if (field.type === 'image' || field.key === 'school_logo' || field.key === 'coach_signature') {
            if (field.image_url) {
              const img = await loadImgSafely(field.image_url);
              if (img && img.naturalWidth > 0) {
                const imgW = (field.width || (field.key === 'school_logo' ? 80 : 130)) * scaleFactor;
                const imgH = (img.naturalHeight / img.naturalWidth) * imgW;
                let drawX = fx - imgW / 2;
                if (field.align === 'left') drawX = fx;
                else if (field.align === 'right') drawX = fx - imgW;
                const drawY = fy - imgH / 2;
                try { ctx.drawImage(img, drawX, drawY, imgW, imgH); } catch (e) {}
              }
            }
            continue;
          }

          const fSize = Math.round((field.fontSize || 20) * scaleFactor);

          // Draw Dynamic Text directly onto certificate
          ctx.textAlign = field.align || 'center';
          ctx.fillStyle = field.color || '#FFFFFF';
          ctx.font = `${field.fontWeight || 'normal'} ${fSize}px ${field.fontFamily || 'Georgia, serif'}`;

          let textToDraw = '';
          if (field.key === 'student_name') {
            textToDraw = studentName;
          } else if (field.key === 'course_title') {
            const rawTitle = field.sample || `${studentDays}-Day Surf Training Course`;
            textToDraw = formatWithStudentDays(rawTitle);
          } else if (field.key === 'body_text') {
            const rawBody = field.sample || `has successfully completed the comprehensive ${studentDays}-day ocean surfing, paddle technique, and wave riding modules.`;
            textToDraw = formatWithStudentDays(rawBody);
          } else if (field.key === 'academy_name') {
            textToDraw = studentSchool || field.sample || 'Athnex Surf Academy';
          } else if (field.key === 'issue_date') {
            textToDraw = `Date: ${certDate}`;
          } else if (field.key === 'coach_name') {
            textToDraw = coachNameCert || field.sample || 'Certified Head Coach';
          } else if (field.key === 'cert_id') {
            textToDraw = `ATHNEX-CERT-${studentDays}D-${Date.now().toString().slice(-4)}`;
          } else {
            let sampleTxt = field.sample || field.label || '';
            if (field.key !== 'issue_date' && field.key !== 'student_name' && field.key !== 'coach_name' && field.key !== 'academy_name' && typeof sampleTxt === 'string') {
              sampleTxt = formatWithStudentDays(sampleTxt);
            }
            textToDraw = sampleTxt;
          }

          ctx.fillText(textToDraw, fx, fy + (fSize * 0.32));

          if (field.underline) {
            const textW = ctx.measureText(textToDraw).width;
            let startX = fx - textW / 2;
            if (field.align === 'left') startX = fx;
            else if (field.align === 'right') startX = fx - textW;

            ctx.beginPath();
            ctx.strokeStyle = field.color || '#FFFFFF';
            ctx.lineWidth = 2 * scaleFactor;
            ctx.moveTo(startX, fy + fSize * 0.42);
            ctx.lineTo(startX + textW, fy + fSize * 0.42);
            ctx.stroke();
          }
        }

        // ── OFFICIAL ATHNEXLIVE LOGO (POSITIONABLE, ALWAYS VISIBLE) ──
        const athnexLogo = await loadImgSafely('/athnexlive-logo.png');
        if (athnexLogo && athnexLogo.naturalWidth > 0) {
          const alField = activeCertConfig.fields?.athnex_logo || { x: 91, y: 6, width: 72, align: 'center' };
          const alScale = W / 800;
          const alW = Math.max(80, (alField.width || 72) * alScale);
          const alH = (athnexLogo.naturalHeight / athnexLogo.naturalWidth) * alW;
          const rawFx = ((alField.x ?? 91) / 100) * W;
          const rawFy = ((alField.y ?? 6) / 100) * H;
          let alX = rawFx - alW / 2;
          if (alField.align === 'left') alX = rawFx;
          else if (alField.align === 'right') alX = rawFx - alW;
          const alY = rawFy - alH / 2;
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(alX - 10, alY - 6, alW + 20, alH + 12, 8);
          ctx.fill();
          ctx.strokeStyle = 'rgba(13, 148, 136, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.drawImage(athnexLogo, alX, alY, alW, alH);
          ctx.restore();
        }

        // Trigger download
        const cleanName = (studentName || 'Athlete').replace(/\s+/g, '_');
        const courseTag = `${studentDays}Day`;
        const fileName = `${(studentSchool || 'Athnex').replace(/\s+/g, '_')}_${courseTag}_Certificate_${cleanName}.png`;
        triggerCanvasDownload(canvas, fileName);
        return;
      }

      // ─ FALLBACK DEFAULT ATHNEX CERTIFICATE GENERATOR ─
      const studentDays = Math.max(1, parseInt(requiredSessions, 10) || 1);
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0A1628');
      bgGrad.addColorStop(0.5, '#0D2240');
      bgGrad.addColorStop(1, '#071020');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Surf action image background (official default ocean wave, independent of Milestone Poster)
      const bgImg = await loadImgSafely('/surf-milestone-bg.jpg');
      if (bgImg && bgImg.naturalWidth > 0) {
        ctx.globalAlpha = 0.12;
        const iR = bgImg.naturalWidth / bgImg.naturalHeight;
        const cR = W / H;
        let sw = bgImg.naturalWidth, sh = bgImg.naturalHeight, sx = 0, sy = 0;
        if (iR > cR) { sw = bgImg.naturalHeight * cR; sx = (bgImg.naturalWidth - sw) / 2; }
        else { sh = bgImg.naturalWidth / cR; sy = (bgImg.naturalHeight - sh) / 2; }
        try { ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H); } catch (e) {}
        ctx.globalAlpha = 1;
      }

      // Outer gold border (double frame)
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#D4AF37';
      ctx.strokeRect(28, 28, W - 56, H - 56);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(212,175,55,0.5)';
      ctx.strokeRect(44, 44, W - 88, H - 88);

      const drawDiamond = (cx, cy, size) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#D4AF37';
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      };
      [36, W - 36].forEach(x => [36, H - 36].forEach(y => drawDiamond(x, y, 18)));

      ctx.textAlign = 'center';
      ctx.beginPath();
      ctx.arc(W / 2, 115, 42, 0, Math.PI * 2);
      ctx.fillStyle = '#2DD4BF';
      ctx.fill();
      ctx.fillStyle = '#0A1628';
      ctx.font = 'bold 42px Arial, sans-serif';
      ctx.fillText('A', W / 2, 130);

      ctx.fillStyle = '#2DD4BF';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillText(studentSchool.toUpperCase(), W / 2, 185);

      ctx.fillStyle = 'rgba(212,175,55,0.7)';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText('OFFICIAL SURF ACADEMY • athnexlive.com', W / 2, 215);

      const drawDivider = (y) => {
        const grad = ctx.createLinearGradient(200, y, W - 200, y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, '#D4AF37');
        grad.addColorStop(0.7, '#D4AF37');
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(200, y);
        ctx.lineTo(W - 200, y);
        ctx.stroke();
      };
      drawDivider(240);

      ctx.fillStyle = '#FEF3C7';
      ctx.font = 'italic 22px Georgia, serif';
      ctx.fillText('This is to certify that', W / 2, 290);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 82px Georgia, serif';
      ctx.fillText(studentName, W / 2, 390);

      const nameW = ctx.measureText(studentName).width;
      const grad2 = ctx.createLinearGradient(W / 2 - nameW / 2, 400, W / 2 + nameW / 2, 400);
      grad2.addColorStop(0, 'transparent');
      grad2.addColorStop(0.5, '#2DD4BF');
      grad2.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 - nameW / 2, 405);
      ctx.lineTo(W / 2 + nameW / 2, 405);
      ctx.stroke();

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '26px Georgia, serif';
      ctx.fillText('has successfully completed the', W / 2, 455);

      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 46px Georgia, serif';
      ctx.fillText(`${studentDays}-Day Surf Training Course`, W / 2, 515);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText(`at ${studentSchool}`, W / 2, 560);

      drawDivider(600);

      const pills = [
        { icon: '🏄', label: 'Sessions', val: `${stats.completed} Completed` },
        { icon: '🌊', label: 'Waves Ridden', val: `${stats.totalWaves} Waves` },
        { icon: '⭐', label: 'Coach Score', val: `${stats.avgScore} / 100` },
      ];

      const pillW = 360, pillH = 90, pillGap = 60;
      const totalPillW = pills.length * pillW + (pills.length - 1) * pillGap;
      const pillStartX = (W - totalPillW) / 2;

      pills.forEach((p, i) => {
        const px = pillStartX + i * (pillW + pillGap);
        const py = 630;
        ctx.fillStyle = 'rgba(45,212,191,0.1)';
        ctx.strokeStyle = 'rgba(45,212,191,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px, py, pillW, pillH, 14);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2DD4BF';
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillText(`${p.icon} ${p.val}`, px + pillW / 2, py + 40);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '17px Arial, sans-serif';
        ctx.fillText(p.label.toUpperCase(), px + pillW / 2, py + 70);
      });

      drawDivider(760);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText('Date of Completion', W / 2 - 300, 820);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText(certDate, W / 2 - 300, 850);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText('Certified By', W / 2 + 300, 820);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText(coachNameCert, W / 2 + 300, 850);

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2, 800);
      ctx.lineTo(W / 2, 870);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(45,212,191,0.15)';
      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 100, 895, 200, 44, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2DD4BF';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText(`✓ ${studentLevel} Level`, W / 2, 923);

      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText('ATHNEX LIVE • OFFICIAL SURF ACADEMY CERTIFICATE • athnexlive.com', W / 2, H - 55);

      // ── OFFICIAL ATHNEXLIVE LOGO IN RIGHT CORNER OF CERTIFICATE ──
      const athnexLogoFallback = await loadImgSafely('/athnexlive-logo.png');
      if (athnexLogoFallback && athnexLogoFallback.naturalWidth > 0) {
        const alW = 165;
        const alH = (athnexLogoFallback.naturalHeight / athnexLogoFallback.naturalWidth) * alW;
        const alX = W - alW - 65;
        const alY = 60;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(alX - 10, alY - 6, alW + 20, alH + 12, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(13, 148, 136, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.drawImage(athnexLogoFallback, alX, alY, alW, alH);
        ctx.restore();
      }

      const cleanName = (studentName || 'Athlete').replace(/\s+/g, '_');
      const fileName = `Athnex_${studentDays}Day_Certificate_${cleanName}.png`;
      triggerCanvasDownload(canvas, fileName);
    } catch (err) {
      console.error('Certificate generation failed:', err);
      setDownloadingCert(false);
    }
  };

  return (
    <div className="ach-page">
      <Sidebar />

      <main className="ach-main">
        {/* Top Header */}
        <header className="ach-header">
          <div className="ach-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="ach-title">History of Sessions</h1>
              <span className="ach-badge-verified">✓ Verified Tracker</span>
            </div>
            <p className="ach-sub">
              Your verified surf session history, training duration, wave counts, and coach technique logs. Share your surf milestones on social media!
            </p>
          </div>

          <div className="ach-header-actions">
            {/* Certificate Download Button — ALWAYS visible; unlocked only upon completing course sessions */}
            <button
              type="button"
              className={`ach-btn-certificate ${!isCertificateUnlocked ? 'locked' : ''}`}
              onClick={isCertificateUnlocked ? handleDownloadCertificate : () => setCertLockModal(true)}
              disabled={downloadingCert}
              title={
                isCertificateUnlocked
                  ? `Download your official ${requiredSessions}-Day Course Completion Certificate`
                  : `Certificate Locked: Complete all ${requiredSessions} sessions to unlock (${stats.completed}/${requiredSessions} completed)`
              }
            >
              {downloadingCert ? (
                <>
                  <span className="ach-spinner-sm-dark"></span>
                  <span>Generating...</span>
                </>
              ) : isCertificateUnlocked ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6"></circle>
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
                  </svg>
                  <span>Download Certificate</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Download Certificate ({stats.completed}/{requiredSessions})</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="ach-btn-share-overall"
              onClick={() => openShareModal('overall')}
              title="Share your overall surf track record to WhatsApp, Instagram & Social Media"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>Share Track Record</span>
            </button>
          </div>
        </header>

        {/* Milestone Statistics Cards Row */}
        <div className="ach-stats-grid">
          <div className="ach-stat-card card-cyan">
            <div className="ach-stat-icon">🏄‍♂️</div>
            <div className="ach-stat-body">
              <span className="ach-stat-num">{stats.completed}</span>
              <span className="ach-stat-label">Sessions Completed</span>
              <span className="ach-stat-hint">{stats.total} total booked</span>
            </div>
          </div>

          <div className="ach-stat-card card-purple">
            <div className="ach-stat-icon">⭐</div>
            <div className="ach-stat-body">
              <span className="ach-stat-num">{stats.avgScore !== null ? `${getScoreOutOfTen(stats.avgScore)}/10` : 'Unrated'}</span>
              <span className="ach-stat-label">Coach Technique Score</span>
              <span className="ach-stat-hint">{stats.avgScore !== null ? `${studentLevel} Level` : 'Awaiting coach review'}</span>
            </div>
          </div>

          <div className="ach-stat-card card-amber">
            <div className="ach-stat-icon">⏱️</div>
            <div className="ach-stat-body">
              <span className="ach-stat-num">{stats.totalHours} hrs</span>
              <span className="ach-stat-label">Water Training Time</span>
              <span className="ach-stat-hint">Direct ocean coaching</span>
            </div>
          </div>

          <div className="ach-stat-card card-emerald">
            <div className="ach-stat-icon">🌊</div>
            <div className="ach-stat-body">
              <span className="ach-stat-num">{stats.totalWaves > 0 ? stats.totalWaves : '--'}</span>
              <span className="ach-stat-label">Total Waves Caught</span>
              <span className="ach-stat-hint">{stats.totalWaves > 0 ? 'Across verified sessions' : 'Pending coach wave log'}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="ach-controls-bar">
          {/* Status Tabs */}
          <div className="ach-tabs">
            <button
              type="button"
              className={`ach-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Sessions ({sessions.length})
            </button>
            <button
              type="button"
              className={`ach-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              ✓ Completed ({stats.completed})
            </button>
            <button
              type="button"
              className={`ach-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              📅 Upcoming ({stats.upcoming})
            </button>
          </div>

          {/* Search Input */}
          <div className="ach-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by spot, coach, date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ach-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0 4px', fontSize: '13px' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sessions History List */}
        <section className="ach-sessions-section">
          {loading ? (
            <div className="ach-empty-box">
              <div className="ach-spinner"></div>
              <p style={{ marginTop: '12px', color: '#64748B', fontWeight: 600 }}>Loading your session history...</p>
            </div>
          ) : displayedSessions.length === 0 ? (
            <div className="ach-empty-box">
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>🏄‍♂️</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                {searchQuery ? 'No matching sessions found' : 'No Sessions in this category'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto 16px auto', lineHeight: '1.5' }}>
                {searchQuery
                  ? `No sessions match "${searchQuery}". Try searching for another surf spot, date, or coach.`
                  : 'As you attend your scheduled surf training sessions with your coach, your completed session history, coach scores, and shareable milestones will appear here!'}
              </p>
              <button
                type="button"
                className="ach-btn-action"
                onClick={() => navigate('/sessions')}
              >
                📅 View My Sessions Calendar
              </button>
            </div>
          ) : (
            <div className="ach-sessions-list">
              {displayedSessions.map((sess, idx) => {
                const completed = isSessionCompleted(sess);
                const coachName = getCleanCoachName(sess);
                const spot = sess.location || studentSchool || 'Surf Academy Spot';
                const levelTag = sess.level || sess.type || studentLevel;
                const isTargeted = Boolean(targetSessionParam && String(sess.id) === String(targetSessionParam));

                return (
                  <article
                    key={sess.id || idx}
                    id={sess.id ? `ach-session-${sess.id}` : undefined}
                    className={`ach-session-card ${isTargeted ? 'ach-session-card-targeted' : ''}`}
                    style={isTargeted ? { border: '2px solid #0D9488', boxShadow: '0 0 0 3px rgba(13, 148, 136, 0.18)' } : undefined}
                  >
                    {/* Left Date / Status Badge */}
                    <div className="ach-session-date-col">
                      <div className="ach-session-date-badge">
                        <span className="ach-session-month">
                          {sess.date ? new Date(sess.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : 'SURF'}
                        </span>
                        <span className="ach-session-day">
                          {sess.date ? new Date(sess.date).getDate() : (idx + 1)}
                        </span>
                        <span className="ach-session-year">
                          {sess.date ? new Date(sess.date).getFullYear() : '2026'}
                        </span>
                      </div>

                      <span className={`ach-status-pill ${completed ? 'status-completed' : 'status-upcoming'}`}>
                        {completed ? '✓ Completed' : '⏱ Scheduled'}
                      </span>
                    </div>

                    {/* Middle Info Details */}
                    <div className="ach-session-main-info">
                      <div className="ach-session-title-row">
                        <h3 className="ach-session-title">
                          Surf Training Session #{sessions.length - idx}
                        </h3>
                        <span className="ach-session-level-badge">{levelTag}</span>
                      </div>

                      <div className="ach-session-meta-row">
                        <span className="ach-meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <span>{sess.time || '06:30 AM - 08:30 AM'}</span>
                        </span>

                        <span className="ach-meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>{spot}</span>
                        </span>

                        <span className="ach-meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <span>Coach: <strong>{coachName.replace(/^Coach\s+/i, '')}</strong></span>
                        </span>
                      </div>

                      {/* Coach Notes or Feedback if present */}
                      {sess.notes && (
                        <div className="ach-session-notes">
                          <span style={{ fontWeight: 700, color: '#0D9488' }}>Coach Notes:</span> {sess.notes}
                        </div>
                      )}
                    </div>

                    {/* Right Performance Metrics & Share Actions */}
                    <div className="ach-session-actions-col">
                      <div className="ach-metric-pills">
                        {getSessionScore(sess) !== null ? (
                          <div className="ach-pill" title="Verified technique assessment score">
                            <span className="ach-pill-icon">⭐</span>
                            <span className="ach-pill-val">{getScoreOutOfTen(getSessionScore(sess))}/10</span>
                          </div>
                        ) : (
                          <div className="ach-pill ach-pill-unrated" title="Technique score pending coach evaluation">
                            <span className="ach-pill-icon" style={{ opacity: 0.55 }}>⭐</span>
                            <span className="ach-pill-val" style={{ color: '#94A3B8', fontWeight: 600 }}>Unrated</span>
                          </div>
                        )}

                        {getSessionWaves(sess) !== null ? (
                          <div className="ach-pill" title="Verified waves caught in this session">
                            <span className="ach-pill-icon">🌊</span>
                            <span className="ach-pill-val">{getSessionWaves(sess)} Waves</span>
                          </div>
                        ) : (
                          <div className="ach-pill ach-pill-unrecorded" title="Wave count pending coach entry">
                            <span className="ach-pill-icon" style={{ opacity: 0.55 }}>🌊</span>
                            <span className="ach-pill-val" style={{ color: '#94A3B8', fontWeight: 600 }}>-- Waves</span>
                          </div>
                        )}
                      </div>

                      <div className="ach-btn-row">
                        <button
                          type="button"
                          className="ach-btn-share"
                          onClick={() => openShareModal(sess)}
                          title="Share your surf achievement milestone with friends on WhatsApp & Social Media"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                          </svg>
                          <span>Share Achievement with Friends</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Certificate Locked Guidance Modal ───────────────────────────── */}
        {certLockModal && (
          <div className="ach-modal-backdrop" onClick={() => setCertLockModal(false)}>
            <div className="ach-modal-box" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
              <div className="ach-modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#FEF3C7',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0
                  }}>
                    🔒
                  </div>
                  <div>
                    <h3 className="ach-modal-title" style={{ fontSize: '17px', margin: 0 }}>Certificate Locked</h3>
                    <p className="ach-modal-sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                      {requiredSessions}-Day Course Completion Requirement
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ach-modal-close"
                  onClick={() => setCertLockModal(false)}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '20px 24px', textAlign: 'center' }}>
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    <span>Course Progress</span>
                    <span style={{ color: stats.completed >= requiredSessions ? '#059669' : '#D97706' }}>
                      {stats.completed} of {requiredSessions} Sessions
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.round((stats.completed / Math.max(1, requiredSessions)) * 100))}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #0284C7 0%, #0D9488 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', textAlign: 'right' }}>
                    {Math.max(0, requiredSessions - stats.completed)} session{requiredSessions - stats.completed === 1 ? '' : 's'} remaining
                  </div>
                </div>

                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 18px' }}>
                  You are enrolled in the <strong>{requiredSessions}-Day Surf Training Course</strong>. Your official verified completion certificate will be automatically unlocked and ready to download once you complete all <strong>{requiredSessions} sessions</strong>!
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCertLockModal(false)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Social Media Share Modal ────────────────────────────────────── */}
        {shareModalSession && (() => {
          const isOverall = shareModalSession === 'overall';
          const rawWaves = isOverall ? stats.totalWaves : getSessionWaves(shareModalSession);
          const rawScore = isOverall ? stats.avgScore : getSessionScore(shareModalSession);
          const wavesCount = rawWaves !== null ? rawWaves : '--';
          const scoreVal = rawScore !== null ? rawScore : '--';
          const scoreOutOf10 = getScoreOutOfTen(scoreVal);
          const waterTime = getSessionWaterTime(shareModalSession);
          const rawPopUp = isOverall ? (rawScore ? Math.round(rawScore / 10) : null) : getSessionPopUpRating(shareModalSession, rawScore);
          const rawPaddling = isOverall ? (rawScore ? Math.round(rawScore / 12) : null) : getSessionPaddlingRating(shareModalSession, rawScore);
          const popUpRating = rawPopUp !== null ? `${rawPopUp}/10` : '--';
          const paddlingRating = rawPaddling !== null ? `${rawPaddling}/10` : '--';
          const coachCandidates = getCoachCandidates(shareModalSession);
          const coachName = getCleanCoachName(shareModalSession, selectedCoachOverride);
          const coachPhoto = getCoachPhotoForSession(shareModalSession, coachName);
          const coachInitial = (coachName.replace(/^coach\s+/i, '').trim().charAt(0) || 'C').toUpperCase();
          const displaySchoolName = shareModalSession.school || shareModalSession.student_school || studentData?.school || effectiveSchool || loggedUser?.school || studentSchool || 'Athnex Surf Academy';
          const dateFormatted = getSessionFormattedDate(shareModalSession);
          const quoteText = getCoachQuote(shareModalSession);
          const safePosterBg = (posterBgUrl && !isCertificateImageUrl(posterBgUrl, schoolCertConfig)) ? posterBgUrl : '/surf-milestone-bg.jpg';
          const previewPhoto = customPhotoUrl || safePosterBg;
          const isDefaultPhoto = !customPhotoUrl;
          const shortDuration = isOverall ? `${stats.totalHours} hrs` : (shareModalSession.duration_mins ? `${Math.round(shareModalSession.duration_mins / 60 * 10) / 10} hrs` : '2.0 hrs');
          const sessionLoc = isOverall ? displaySchoolName : (shareModalSession.location || displaySchoolName || 'Surf Beach');

          return (
            <div className="ach-modal-backdrop" onClick={() => setShareModalSession(null)}>
              <div className="ach-modal-box ach-share-studio-box" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="ach-modal-header" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
                  <div>
                    <h3 className="ach-modal-title" style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Share your session
                    </h3>
                    <p className="ach-modal-sub" style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>
                      {displaySchoolName} • {dateFormatted}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ach-modal-close"
                    onClick={() => setShareModalSession(null)}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* Optional Coach Selector if multiple coaches are on record */}
                {coachCandidates.length > 1 && (
                  <div className="ach-coach-switcher-strip">
                    <span className="ach-coach-switcher-label">Assigned Coach:</span>
                    {coachCandidates.map(c => {
                      const isAct = coachName === `Coach ${c}` || coachName === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`ach-coach-pill-btn ${isAct ? 'active' : ''}`}
                          onClick={() => setSelectedCoachOverride(`Coach ${c}`)}
                        >
                          {isAct ? '✓ ' : ''}Coach {c}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── Active Story Card Preview ────────────────────────────────────── */}
                <div className="ach-story-card-wrapper" ref={cardRef}>
                  {/* Template 1: Photo spotlight */}
                  {shareTemplate === 'spotlight' && (
                    <div className="ach-card-spotlight">
                      <div
                        className="ach-spotlight-photo"
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          backgroundColor: '#0F172A',
                        }}
                      >
                        <img
                          src={previewPhoto}
                          alt=""
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: photoFit === 'contain' ? 'contain' : 'cover',
                            objectPosition: `center ${photoPosY}%`,
                            filter: getFilterCss(photoFilter),
                            opacity: isDefaultPhoto ? 0.38 : 1,
                            transition: 'opacity 0.25s ease',
                            display: previewPhoto ? 'block' : 'none',
                          }}
                        />
                        {isDefaultPhoto && (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            title="Click to upload your session photo"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '24px 20px',
                              textAlign: 'center',
                              zIndex: 3,
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.78)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              border: '1.5px dashed rgba(45, 212, 191, 0.7)',
                              borderRadius: '16px',
                              padding: '16px 20px',
                              maxWidth: '290px',
                              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.4)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              pointerEvents: 'auto'
                            }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(45, 212, 191, 0.15)',
                                border: '1px solid rgba(45, 212, 191, 0.45)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                              }}>
                                📸
                              </div>
                              <div style={{
                                color: '#FFFFFF',
                                fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                                fontSize: '13.5px',
                                fontWeight: 800,
                                lineHeight: 1.35,
                                letterSpacing: '0.2px'
                              }}>
                                Upload your session Photo and Inspire your friends
                              </div>
                              <div style={{
                                color: '#2DD4BF',
                                fontSize: '11px',
                                fontWeight: 600,
                                letterSpacing: '0.3px',
                                textTransform: 'uppercase'
                              }}>
                                Tap here to upload
                              </div>
                            </div>
                          </div>
                        )}
                        <span className="ach-cut-pill" style={{ zIndex: 4 }}>🏄 {studentName.toUpperCase()}</span>
                        <span className="ach-session-badge-yellow" style={{ zIndex: 4 }}>✓ SESSION COMPLETE</span>
                        {/* Athnexlive Logo in Top Right Corner */}
                        <div className="ach-athnex-corner-logo" style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          zIndex: 4,
                          background: 'rgba(255, 255, 255, 0.95)',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255,255,255,0.7)',
                          backdropFilter: 'blur(4px)'
                        }}>
                          <img
                            src="/athnexlive-logo.png"
                            alt="Athnexlive"
                            crossOrigin="anonymous"
                            style={{ height: '20px', width: 'auto', display: 'block', objectFit: 'contain' }}
                          />
                        </div>
                      </div>
                      <div className="ach-spotlight-slate">
                        <div className="ach-spotlight-slate-top">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 className="ach-spotlight-title">A session to be proud of.</h4>
                            <div className="ach-spotlight-sub-line" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                              <span className="ach-student-group-badge">{displaySchoolName}</span>
                              <span style={{ color: '#94A3B8', fontSize: '11.5px', fontWeight: 600 }}>
                                {dateFormatted}{!isOverall && shareModalSession.time ? ` • ${shareModalSession.time}` : ' • 07:00-09:00 AM'}
                              </span>
                            </div>
                          </div>
                          <div className="ach-spotlight-score-block">
                            <div className="ach-spotlight-score-val">
                              {wavesCount !== '--' ? wavesCount : '--'}{wavesCount !== '--' && <span>waves</span>}
                            </div>
                            <div className="ach-spotlight-score-lbl">WAVES CAUGHT</div>
                          </div>
                        </div>

                        <div className="ach-spotlight-divider"></div>

                        {/* 3-Pill Performance Metric Trio */}
                        <div className="ach-spotlight-metric-trio">
                          <div className="ach-spot-metric-pill">
                            <span className="ach-spot-metric-val">⭐ {scoreOutOf10 !== '--' ? `${scoreOutOf10}/10` : 'Unrated'}</span>
                            <span className="ach-spot-metric-sub">Coach Score</span>
                          </div>
                          <div className="ach-spot-metric-pill">
                            <span className="ach-spot-metric-val">⏱️ {waterTime}</span>
                            <span className="ach-spot-metric-sub">Water Time</span>
                          </div>
                          <div className="ach-spot-metric-pill">
                            <span className="ach-spot-metric-val">🌊 {wavesCount !== '--' ? `${wavesCount} Waves` : 'In Training'}</span>
                            <span className="ach-spot-metric-sub">Waves Caught</span>
                          </div>
                        </div>

                        {/* Verified Coach Verdict Banner */}
                        <div className="ach-spotlight-quote-box">
                          <div className="ach-spotlight-quote-head">
                            <span className="ach-spotlight-verdict-tag">COACH VERDICT</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '1.5px solid #2DD4BF',
                                background: '#134E4A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                color: '#2DD4BF',
                                flexShrink: 0,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
                              }}>
                                {coachPhoto ? (
                                  <img
                                    src={coachPhoto}
                                    alt={coachName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : (
                                  <span>{coachInitial}</span>
                                )}
                              </div>
                              <span className="ach-spotlight-coach">{coachName}</span>
                            </div>
                          </div>
                          <p className="ach-spotlight-quote">“{quoteText}”</p>
                        </div>

                        {/* Clean Watermark */}
                        <div className="ach-card-footer-watermark">
                          athnexlive.com
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Template 2: Ocean keepsake */}
                  {shareTemplate === 'keepsake' && (
                    <div className="ach-card-keepsake" style={{ position: 'relative' }}>
                      {/* Athnexlive Logo in Top Right Corner */}
                      <div className="ach-athnex-corner-logo" style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        zIndex: 4,
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '4px 9px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.7)'
                      }}>
                        <img
                          src="/athnexlive-logo.png"
                          alt="Athnexlive"
                          crossOrigin="anonymous"
                          style={{ height: '18px', width: 'auto', display: 'block', objectFit: 'contain' }}
                        />
                      </div>
                      <div className="ach-keepsake-tag">THE COACH'S CUT / SESSION KEEPSAKE</div>
                      <h4 className="ach-keepsake-title">
                        Small wins.<br />Big ocean energy.
                      </h4>
                      <div className="ach-keepsake-student-highlight">
                        <span className="ach-keepsake-student-name">{studentName}</span>
                        <span className="ach-keepsake-group-badge">{displaySchoolName}</span>
                      </div>
                      <div className="ach-keepsake-date-sub">{dateFormatted}</div>

                      <div className="ach-keepsake-frame-outer">
                        <div
                          className="ach-keepsake-photo"
                          style={{
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: '#0F172A',
                          }}
                        >
                          <img
                            src={previewPhoto}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: photoFit === 'contain' ? 'contain' : 'cover',
                              objectPosition: `center ${photoPosY}%`,
                              filter: getFilterCss(photoFilter),
                              opacity: isDefaultPhoto ? 0.38 : 1,
                              transition: 'opacity 0.25s ease',
                              display: 'block',
                            }}
                          />
                          {isDefaultPhoto && (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              title="Click to upload your session photo"
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '16px',
                                textAlign: 'center',
                                zIndex: 3,
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{
                                background: 'rgba(15, 23, 42, 0.78)',
                                backdropFilter: 'blur(6px)',
                                WebkitBackdropFilter: 'blur(6px)',
                                border: '1.5px dashed rgba(45, 212, 191, 0.65)',
                                borderRadius: '14px',
                                padding: '12px 16px',
                                maxWidth: '280px',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <div style={{ fontSize: '20px' }}>📸</div>
                                <div style={{
                                  color: '#FFFFFF',
                                  fontSize: '12.5px',
                                  fontWeight: 800,
                                  lineHeight: 1.35
                                }}>
                                  Upload your session Photo and Inspire your friends
                                </div>
                                <div style={{
                                  color: '#2DD4BF',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  letterSpacing: '0.3px',
                                  textTransform: 'uppercase'
                                }}>
                                  Tap here to upload
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="ach-keepsake-gold-badge">
                          <span className="ach-gold-top-lbl">WAVES</span>
                          <span className="ach-gold-score">{wavesCount}</span>
                          <span className="ach-gold-den">{wavesCount !== '--' ? 'waves' : 'caught'}</span>
                        </div>
                      </div>

                      <div className="ach-keepsake-caption">A little salt. A lot of progress.</div>

                      <div className="ach-keepsake-quote-box">
                        <div className="ach-keepsake-quote-head">
                          <span className="ach-keepsake-verdict-tag">COACH VERDICT</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              border: '1.5px solid #0D9488',
                              background: '#CCFBF1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              color: '#0F766E',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                            }}>
                              {coachPhoto ? (
                                <img
                                  src={coachPhoto}
                                  alt={coachName}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <span>{coachInitial}</span>
                              )}
                            </div>
                            <span className="ach-keepsake-coach">{coachName}</span>
                          </div>
                        </div>
                        <div className="ach-keepsake-quote">“{quoteText}”</div>
                      </div>

                      <div className="ach-keepsake-footer-row">
                        <span>✓ Completed</span>
                        <span>{scoreOutOf10 !== '--' ? `⭐ ${scoreOutOf10}/10 coach score` : '⭐ Coach score pending'}</span>
                        <span>⏱️ {waterTime} in water</span>
                      </div>

                      {/* Clean Watermark */}
                      <div className="ach-card-footer-watermark ach-keepsake-watermark">
                        athnexlive.com
                      </div>
                    </div>
                  )}

                  {/* Template 3: Personal scorecard (Exact Reference Match) */}
                  {shareTemplate === 'scorecard' && (
                    <div className="ach-card-scorecard" style={{ position: 'relative' }}>
                      {/* Athnexlive Logo in Top Right Corner */}
                      <div className="ach-athnex-corner-logo" style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        zIndex: 4,
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '4px 9px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.7)'
                      }}>
                        <img
                          src="/athnexlive-logo.png"
                          alt="Athnexlive"
                          crossOrigin="anonymous"
                          style={{ height: '18px', width: 'auto', display: 'block', objectFit: 'contain' }}
                        />
                      </div>
                      {/* Top Section with Content on Left & Expanded Arch Photo on Right */}
                      <div className="ach-sc-top-section">
                        <div className="ach-sc-left-col">
                          <div className="ach-sc-tag">THE COACH'S CUT</div>

                          <h4 className="ach-sc-title">
                            Progress,<br />worth sharing.
                          </h4>

                          <div className="ach-sc-pill">
                            ✓ SESSION COMPLETE
                          </div>

                          <div className="ach-sc-score-block">
                            <div className="ach-sc-score-line">
                              <span className="ach-sc-score-num">{wavesCount}</span>
                              {wavesCount !== '--' && <span className="ach-sc-score-den" style={{ fontSize: '18px' }}> waves</span>}
                            </div>
                            <div className="ach-sc-score-lbl">WAVES CAUGHT</div>
                          </div>

                          <div className="ach-sc-ath-info">
                            <div className="ach-sc-ath-name-highlight">{studentName}</div>
                            <div className="ach-sc-ath-sub">{displaySchoolName} · {dateFormatted}</div>
                          </div>
                        </div>

                        <div className="ach-sc-right-col">
                          <div
                            className="ach-sc-arch-photo"
                            style={{
                              position: 'relative',
                              overflow: 'hidden',
                              backgroundColor: '#004D40',
                            }}
                          >
                            <img
                              src={previewPhoto}
                              alt="Surfer scorecard"
                              crossOrigin={previewPhoto && !previewPhoto.startsWith('data:') && !previewPhoto.startsWith('blob:') ? 'anonymous' : undefined}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: photoFit === 'contain' ? 'contain' : 'cover',
                                objectPosition: `center ${photoPosY}%`,
                                filter: getFilterCss(photoFilter),
                                opacity: isDefaultPhoto ? 0.38 : 1,
                                transition: 'opacity 0.25s ease',
                                display: 'block',
                              }}
                            />
                            {isDefaultPhoto && (
                              <div
                                onClick={() => fileInputRef.current?.click()}
                                title="Click to upload your session photo"
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '12px',
                                  textAlign: 'center',
                                  zIndex: 3,
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{
                                  background: 'rgba(4, 47, 44, 0.88)',
                                  backdropFilter: 'blur(6px)',
                                  WebkitBackdropFilter: 'blur(6px)',
                                  border: '1.5px dashed rgba(94, 234, 212, 0.75)',
                                  borderRadius: '12px',
                                  padding: '12px 14px',
                                  maxWidth: '185px',
                                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <div style={{ fontSize: '18px' }}>📸</div>
                                  <div style={{
                                    color: '#FFFFFF',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    lineHeight: 1.3
                                  }}>
                                    Upload your session Photo and Inspire your friends
                                  </div>
                                  <div style={{
                                    color: '#5EEAD4',
                                    fontSize: '9.5px',
                                    fontWeight: 600,
                                    letterSpacing: '0.3px',
                                    textTransform: 'uppercase'
                                  }}>
                                    Tap to upload
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Thin Divider Line */}
                      <div className="ach-sc-divider" />

                      {/* 3 Metric Stats Columns */}
                      <div className="ach-sc-metrics-grid">
                        <div className="ach-sc-metric-col">
                          <div className="ach-sc-metric-val">{scoreOutOf10 !== '--' ? `${scoreOutOf10}/10` : '--'}</div>
                          <div className="ach-sc-metric-lbl">COACH SCORE</div>
                        </div>
                        <div className="ach-sc-metric-col">
                          <div className="ach-sc-metric-val">{waterTime}</div>
                          <div className="ach-sc-metric-lbl">WATER TIME</div>
                        </div>
                        <div className="ach-sc-metric-col">
                          <div className="ach-sc-metric-val">{wavesCount}</div>
                          <div className="ach-sc-metric-lbl">WAVES CAUGHT</div>
                        </div>
                      </div>

                      {/* Coach Quote Box at Bottom */}
                      <div className="ach-sc-quote-box">
                        <div className="ach-sc-quote-msg">“{quoteText}”</div>
                        <div className="ach-sc-quote-by" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '1.5px solid #2DD4BF',
                            background: '#047857',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            color: '#FFFFFF',
                            flexShrink: 0
                          }}>
                            {coachPhoto ? (
                              <img
                                src={coachPhoto}
                                alt={coachName}
                                crossOrigin={coachPhoto && !coachPhoto.startsWith('data:') && !coachPhoto.startsWith('blob:') ? 'anonymous' : undefined}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <span>{coachInitial}</span>
                            )}
                          </div>
                          <span>{coachName}</span>
                        </div>
                      </div>

                      {/* Clean Watermark */}
                      <div className="ach-card-footer-watermark ach-scorecard-watermark">
                        athnexlive.com
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Template Switcher & Dimension Indicator ─────────────────────── */}
                <div className="ach-template-meta-strip">
                  <span className="ach-template-label-active">
                    {shareTemplate === 'keepsake' ? 'Ocean keepsake' : 'Photo spotlight'}
                  </span>
                  <span className="ach-template-ratio">4:5 portrait • 1080 × 1350</span>
                </div>

                {/* 2 Template Selection Buttons */}
                <div className="ach-template-selector-pills">
                  <button
                    type="button"
                    className={`ach-tmpl-btn ${shareTemplate === 'spotlight' ? 'active' : ''}`}
                    onClick={() => setShareTemplate('spotlight')}
                  >
                    Photo spotlight
                  </button>
                  <button
                    type="button"
                    className={`ach-tmpl-btn ${shareTemplate === 'keepsake' ? 'active' : ''}`}
                    onClick={() => setShareTemplate('keepsake')}
                  >
                    Ocean keepsake
                  </button>
                </div>

                {/* ── "Make it personal" Section ───────────────────────────────────── */}
                <div className="ach-personal-section">
                  <div className="ach-personal-head">
                    <span className="ach-personal-title">Make it personal</span>
                    <span className="ach-personal-opt">Optional</span>
                  </div>
                  <p className="ach-personal-sub">
                    Add a photo or selfie from this session.
                  </p>

                  <div className="ach-personal-btn-row">
                    <button
                      type="button"
                      className="ach-personal-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span>Upload photo</span>
                    </button>

                    <button
                      type="button"
                      className="ach-personal-upload-btn"
                      onClick={startCamera}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      <span>Take a selfie</span>
                    </button>

                    {customPhotoUrl && (
                      <button
                        type="button"
                        className="ach-personal-remove-btn"
                        onClick={() => setCustomPhotoUrl(null)}
                        title="Reset to default surfing photo"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoSelect}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    style={{ display: 'none' }}
                    onChange={handlePhotoSelect}
                  />

                  <div className="ach-personal-note">
                    Your photo appears only inside the share-card preview.
                  </div>
                </div>

                {/* ── Main Action Buttons: Share card & Save ────────────────────────── */}
                <div className="ach-main-cta-row">
                  <button
                    type="button"
                    className="ach-cta-share-btn"
                    onClick={() => handleNativeShareCard(shareModalSession)}
                    disabled={shareCardBusy || downloadingImg}
                  >
                    {shareCardBusy ? (
                      <>
                        <span className="ach-spinner-sm" style={{ borderTopColor: '#FFFFFF' }}></span>
                        <span>Preparing Share...</span>
                      </>
                    ) : (
                      <>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <circle cx="18" cy="5" r="3"/>
                          <circle cx="6" cy="12" r="3"/>
                          <circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        <span>Share card</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="ach-cta-save-btn"
                    onClick={() => handleDownloadStoryCard(shareModalSession)}
                    disabled={downloadingImg || shareCardBusy}
                  >
                    {downloadingImg ? (
                      <>
                        <span className="ach-spinner-sm" style={{ borderTopColor: '#0F172A' }}></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 1-Click Copy Story Caption Button */}
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    className="ach-copy-caption-btn"
                    onClick={() => handleCopyCaption(shareModalSession)}
                    title="Copy formatted story caption with surf score and hashtags"
                  >
                    {captionCopied ? (
                      <>
                        <span style={{ color: '#059669', fontSize: '15px' }}>✓</span>
                        <span style={{ color: '#065F46', fontWeight: 700 }}>Caption & Hashtags Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>Copy Story Caption & Hashtags</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="ach-preview-disclaimer">
                  Preview • Example photo and illustrative session data.
                </div>

                {/* ── Direct 1-Tap Social Icons Row ─────────────────────────────────── */}
                <div className="ach-share-divider">
                  <span>Or Share Directly Via</span>
                </div>

                <div className="ach-share-icons-row">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    className="ach-icon-btn ach-icon-wa"
                    onClick={() => handleShareWhatsApp(shareModalSession)}
                    title="Share via WhatsApp"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.45 1.03 2.62.13.17 1.78 2.71 4.31 3.8.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z"/>
                    </svg>
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    className="ach-icon-btn ach-icon-fb"
                    onClick={() => handleShareFacebook(shareModalSession)}
                    title="Share on Facebook"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>

                  {/* Instagram / Native Share */}
                  <button
                    type="button"
                    className="ach-icon-btn ach-icon-ig"
                    onClick={() => handleNativeShare(shareModalSession)}
                    title="Share on Instagram / More Apps"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                    </svg>
                  </button>

                  {/* X / Twitter */}
                  <button
                    type="button"
                    className="ach-icon-btn ach-icon-x"
                    onClick={() => handleShareTwitter(shareModalSession)}
                    title="Post on X / Twitter"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </button>
                </div>

                {copyFeedback && (
                  <div className="ach-copy-toast-banner">
                    ✓ High-Res Story Poster Downloaded & Copied! Ready to paste (Ctrl+V) in WhatsApp
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Live Selfie Camera Viewfinder Modal ─────────────────────────── */}
        {cameraModalOpen && (
          <div className="ach-modal-backdrop" style={{ zIndex: 10001 }} onClick={stopCamera}>
            <div className="ach-modal-box ach-camera-box" onClick={(e) => e.stopPropagation()}>
              <div className="ach-camera-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📸</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                      Take a Surf Selfie
                    </h4>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Look at the camera and snap your achievement selfie!
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="ach-cam-control-btn"
                    onClick={toggleCameraFacing}
                    title="Flip between front and rear camera"
                  >
                    🔄 {cameraFacing === 'user' ? 'Front Cam' : 'Back Cam'}
                  </button>
                  <button
                    type="button"
                    className={`ach-cam-control-btn ${cameraTimer > 0 ? 'active' : ''}`}
                    onClick={() => setCameraTimer(t => t === 3 ? 0 : 3)}
                    title="Toggle 3-second countdown timer"
                  >
                    ⏱️ {cameraTimer > 0 ? '3s Timer' : 'Timer Off'}
                  </button>
                  <button
                    type="button"
                    className="ach-modal-close"
                    onClick={stopCamera}
                    title="Close Camera"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="ach-camera-viewfinder-wrap">
                {cameraLoading && (
                  <div className="ach-camera-loading-overlay">
                    <div className="ach-spinner"></div>
                    <span style={{ marginTop: '12px', fontSize: '13px', color: '#F8FAFC', fontWeight: 700 }}>
                      Starting Camera...
                    </span>
                  </div>
                )}

                {cameraError && (
                  <div className="ach-camera-error-banner">
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#DC2626', textAlign: 'center' }}>
                      {cameraError}
                    </p>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="ach-camera-video-preview"
                />

                {/* Reticle Focus Corners */}
                <div className="ach-camera-reticle">
                  <span className="ach-reticle-corner top-left"></span>
                  <span className="ach-reticle-corner top-right"></span>
                  <span className="ach-reticle-corner bottom-left"></span>
                  <span className="ach-reticle-corner bottom-right"></span>
                </div>

                {/* 3s Countdown Overlay */}
                {cameraCountdown !== null && (
                  <div className="ach-camera-countdown-overlay">
                    <span className="ach-countdown-digit">{cameraCountdown}</span>
                  </div>
                )}

                {/* Screen Flash Animation */}
                {cameraFlash && <div className="ach-camera-flash-overlay" />}
              </div>

              <div className="ach-camera-actions">
                <button
                  type="button"
                  className="ach-camera-snap-btn"
                  onClick={handleSnapClick}
                  disabled={cameraLoading || !!cameraError || cameraCountdown !== null}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>{cameraCountdown !== null ? `Snapping in ${cameraCountdown}...` : cameraTimer > 0 ? 'Snap (3s Timer)' : 'Snap Selfie'}</span>
                </button>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="ach-camera-sub-link"
                    onClick={() => {
                      stopCamera();
                      cameraInputRef.current?.click();
                    }}
                  >
                    Switch to File / Photo Upload
                  </button>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <button
                    type="button"
                    className="ach-camera-sub-link"
                    onClick={stopCamera}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confetti Party Celebration Canvas */}
        <canvas
          ref={confettiCanvasRef}
          className="ach-confetti-canvas"
        />
      </main>

      <style>{`
        .ach-page {
          min-height: 100vh;
          background: #F8FAFC;
          display: flex;
          flex-direction: column;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .ach-main {
          margin-top: 72px;
          min-height: calc(100vh - 72px);
          max-width: 1280px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          padding: 24px 28px 70px 28px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .ach-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }

        .ach-title {
          font-size: 26px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .ach-badge-verified {
          background: #DCFCE7;
          border: 1px solid #86EFAC;
          color: #15803D;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
        }

        .ach-sub {
          font-size: 13.5px;
          color: #64748B;
          margin: 4px 0 0 0;
          max-width: 650px;
          line-height: 1.5;
        }

        .ach-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ach-btn-certificate {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: #0F172A;
          border: 1px solid #FCD34D;
          font-size: 12.5px;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
        }
        .ach-btn-certificate:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
        }
        .ach-btn-certificate.locked {
          background: #F1F5F9;
          color: #475569;
          border: 1px solid #CBD5E1;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
        }
        .ach-btn-certificate.locked:hover {
          background: #E2E8F0;
          color: #0F172A;
          border-color: #94A3B8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }
        .ach-btn-certificate:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .ach-spinner-sm-dark {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(15,23,42,0.25);
          border-top-color: #0F172A;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .ach-confetti-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 10001;
        }

        .ach-btn-share-overall {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: linear-gradient(135deg, #0D9488 0%, #0284C7 100%);
          color: #FFFFFF;
          border: none;
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(13, 148, 136, 0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .ach-btn-share-overall:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(13, 148, 136, 0.35);
        }

        .ach-btn-video {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0F172A;
          color: #FFFFFF;
          border: 1px solid #1E293B;
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .ach-btn-video:hover {
          background: #1E293B;
        }

        /* ── Stats Grid ──────────────────────── */
        .ach-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .ach-stat-card {
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1.5px solid transparent;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .ach-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.04);
        }

        .card-cyan {
          background: #F0FDFA;
          border-color: #CCFBF1;
        }
        .card-emerald {
          background: #F0FDF4;
          border-color: #DCFCE7;
        }
        .card-amber {
          background: #FFFBEB;
          border-color: #FEF3C7;
        }
        .card-purple {
          background: #FAF5FF;
          border-color: #F3E8FF;
        }

        .ach-stat-icon {
          font-size: 28px;
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: rgba(255,255,255,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }

        .ach-stat-body {
          display: flex;
          flex-direction: column;
        }

        .ach-stat-num {
          font-size: 22px;
          font-weight: 800;
          color: #0F172A;
          line-height: 1.1;
        }

        .ach-stat-label {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          margin-top: 3px;
        }

        .ach-stat-hint {
          font-size: 11px;
          color: #64748B;
        }

        /* ── Controls Bar ────────────────────── */
        .ach-controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          background: #FFFFFF;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
        }

        .ach-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #F1F5F9;
          padding: 3px;
          border-radius: 10px;
        }

        .ach-tab-btn {
          background: transparent;
          border: none;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ach-tab-btn.active {
          background: #FFFFFF;
          color: #0F172A;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }

        .ach-search-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 6px 12px;
          width: 280px;
          max-width: 100%;
        }

        .ach-search-input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 12.5px;
          color: #0F172A;
          width: 100%;
        }

        /* ── Sessions List ───────────────────── */
        .ach-sessions-section {
          width: 100%;
        }

        .ach-sessions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ach-session-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 18px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .ach-session-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
          border-color: #CBD5E1;
        }

        .ach-session-date-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 80px;
        }

        .ach-session-date-badge {
          width: 64px;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 6px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .ach-session-month {
          font-size: 10.5px;
          font-weight: 800;
          color: #0D9488;
          letter-spacing: 0.04em;
        }

        .ach-session-day {
          font-size: 20px;
          font-weight: 900;
          color: #0F172A;
          line-height: 1.1;
        }

        .ach-session-year {
          font-size: 9.5px;
          color: #94A3B8;
          font-weight: 600;
        }

        .ach-status-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          white-space: nowrap;
        }
        .status-completed {
          background: #DCFCE7;
          color: #15803D;
        }
        .status-upcoming {
          background: #FEF3C7;
          color: #B45309;
        }

        .ach-session-main-info {
          flex: 1 1 0%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ach-session-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ach-session-title {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }

        .ach-session-level-badge {
          background: #E0F2FE;
          border: 1px solid #BAE6FD;
          color: #0369A1;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .ach-session-meta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .ach-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          color: #475569;
        }

        .ach-session-notes {
          background: #F8FAFC;
          border-left: 3px solid #0D9488;
          padding: 6px 10px;
          border-radius: 0 6px 6px 0;
          font-size: 12px;
          color: #334155;
          margin-top: 2px;
        }

        .ach-session-actions-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }

        .ach-metric-pills {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ach-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #F1F5F9;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          color: #1E293B;
        }
        .ach-pill-icon {
          font-size: 12px;
        }

        .ach-btn-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ach-btn-share {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: linear-gradient(135deg, #0D9488 0%, #0284C7 100%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 9999px;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ach-btn-share:hover {
          background: linear-gradient(135deg, #0F766E 0%, #0369A1 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.5);
        }
        .ach-btn-share:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
        }

        .ach-btn-analysis {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ach-btn-analysis:hover {
          background: #E2E8F0;
        }

        .ach-empty-box {
          background: #FFFFFF;
          border: 1.5px dashed #CBD5E1;
          border-radius: 14px;
          padding: 44px 20px;
          text-align: center;
        }

        .ach-btn-action {
          background: #0F172A;
          color: #FFFFFF;
          border: none;
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
        }

        .ach-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #E2E8F0;
          border-top-color: #0D9488;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Modal & Visual Share Card ──────── */
        .ach-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }

        .ach-modal-box {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          width: 480px;
          max-width: 100%;
          max-height: 94vh;
          overflow-y: auto;
          padding: 22px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.18);
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeInModal 0.2s ease-out;
        }
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .ach-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .ach-modal-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }

        .ach-modal-sub {
          font-size: 12px;
          color: #64748B;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }

        .ach-modal-close {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          color: #64748B;
          font-size: 14px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }
        .ach-modal-close:hover {
          background: #E2E8F0;
          color: #0F172A;
        }

        /* ── New "Share your session" Multi-Template Studio Styles ─── */
        .ach-share-studio-box {
          max-width: 500px !important;
          width: 95% !important;
          max-height: 92vh !important;
          overflow-y: auto !important;
          padding: 20px 22px !important;
          border-radius: 22px !important;
          background: #FFFFFF !important;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28) !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }

        .ach-coach-switcher-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 4px;
          flex-wrap: wrap;
          padding: 6px 12px;
          background: #F8FAFC;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
        }
        .ach-coach-switcher-label {
          font-size: 11px;
          font-weight: 800;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ach-coach-pill-btn {
          padding: 4px 11px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #334155;
          transition: all 0.15s ease;
        }
        .ach-coach-pill-btn:hover {
          border-color: #0D9488;
          color: #0D9488;
        }
        .ach-coach-pill-btn.active {
          border-color: #0D9488;
          background: #0D9488;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
        }

        .ach-story-card-wrapper {
          width: 100%;
          max-width: 440px;
          height: 550px;
          aspect-ratio: 4 / 5;
          margin: 0 auto;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 48px rgba(0,0,0,0.26);
          transition: transform 0.2s ease;
          flex-shrink: 0;
          position: relative;
        }

        /* ── Template 1: Photo spotlight ── */
        .ach-card-spotlight {
          display: flex;
          flex-direction: column;
          background: #0E1B2A;
          border-radius: 20px;
          overflow: hidden;
          flex-shrink: 0;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          justify-content: space-between;
        }
        .ach-spotlight-photo {
          height: 270px;
          position: relative;
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }
        .ach-cut-pill {
          position: absolute;
          top: 12px;
          left: 14px;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(6px);
          color: #2DD4BF;
          font-size: 10.5px;
          font-weight: 850;
          letter-spacing: 0.05em;
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid rgba(45, 212, 191, 0.4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          max-width: 80%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ach-session-badge-yellow {
          position: absolute;
          bottom: 12px;
          left: 14px;
          background: #FDE047;
          color: #1E293B;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.04em;
          padding: 4px 10px;
          border-radius: 999px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .ach-spotlight-slate {
          background: #0E1B2A;
          padding: 13px 18px 8px 18px;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
          box-sizing: border-box;
        }
        .ach-spotlight-slate-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .ach-spotlight-title {
          font-size: 21px;
          font-weight: 850;
          color: #FFFFFF;
          margin: 0 0 3px 0;
          line-height: 1.2;
        }
        .ach-spotlight-student-highlight {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 3px 0 2px;
          flex-wrap: wrap;
        }
        .ach-student-name-hero {
          font-size: 16px;
          font-weight: 900;
          color: #38BDF8;
          letter-spacing: -0.01em;
          text-shadow: 0 1px 4px rgba(56, 189, 248, 0.25);
        }
        .ach-student-group-badge {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #F1F5F9;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }
        .ach-spotlight-meta-line {
          font-size: 12.5px;
          color: #94A3B8;
          font-weight: 600;
        }
        .ach-spotlight-sub-line {
          font-size: 11px;
          color: #94A3B8;
          margin-top: 2px;
        }
        .ach-spotlight-score-block {
          text-align: right;
          min-width: 80px;
        }
        .ach-spotlight-score-val {
          font-size: 36px;
          font-weight: 900;
          color: #FDE047;
          line-height: 1;
        }
        .ach-spotlight-score-val span {
          font-size: 13px;
          font-weight: 600;
          color: #94A3B8;
          margin-left: 2px;
        }
        .ach-spotlight-score-lbl {
          font-size: 8.5px;
          font-weight: 800;
          color: #94A3B8;
          letter-spacing: 0.06em;
          margin-top: 3px;
        }
        .ach-spotlight-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.12);
          margin: 2px 0;
        }
        .ach-spotlight-metric-trio {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          margin: 1px 0;
        }
        .ach-spot-metric-pill {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 9px;
          padding: 7px 5px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .ach-spot-metric-val {
          font-size: 12.5px;
          font-weight: 850;
          color: #FFFFFF;
        }
        .ach-spot-metric-sub {
          font-size: 8px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ach-spotlight-quote-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(45, 212, 191, 0.25);
          border-left: 3px solid #2DD4BF;
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .ach-spotlight-quote-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ach-spotlight-verdict-tag {
          font-size: 8px;
          font-weight: 850;
          color: #2DD4BF;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .ach-spotlight-quote {
          font-size: 12px;
          font-style: italic;
          color: #F1F5F9;
          line-height: 1.35;
          margin: 0;
        }
        .ach-spotlight-coach {
          font-size: 10.5px;
          font-weight: 700;
          color: #FCD34D;
          text-align: right;
        }

        .ach-card-footer-watermark {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.42);
          margin-top: 4px;
          padding-bottom: 2px;
          text-transform: lowercase;
        }
        .ach-card-footer-watermark.ach-keepsake-watermark {
          color: #64748B;
          margin-top: 6px;
        }
        .ach-card-footer-watermark.ach-scorecard-watermark {
          color: rgba(255, 255, 255, 0.45);
          margin-top: 5px;
        }

        /* ── Template 2: Ocean keepsake ── */
        .ach-card-keepsake {
          background: #FAF6F0;
          border: 1.5px solid #EBE4DA;
          border-radius: 20px;
          padding: 18px 20px 14px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #1E293B;
          flex-shrink: 0;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .ach-keepsake-tag {
          color: #0D9488;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .ach-keepsake-title {
          font-size: 21px;
          font-weight: 850;
          color: #0F172A;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin: 3px 0 1px 0;
        }
        .ach-keepsake-student-highlight {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 4px 0 1px 0;
          flex-wrap: wrap;
        }
        .ach-keepsake-student-name {
          font-size: 16px;
          font-weight: 900;
          color: #0F172A;
          letter-spacing: -0.01em;
        }
        .ach-keepsake-group-badge {
          background: #0D9488;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
        }
        .ach-keepsake-date-sub {
          font-size: 11px;
          color: #78716C;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .ach-keepsake-meta {
          font-size: 11.5px;
          color: #78716C;
          font-weight: 600;
        }
        .ach-keepsake-frame-outer {
          background: #FFFFFF;
          padding: 8px;
          border-radius: 15px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          position: relative;
          margin: 2px 0 4px 0;
        }
        .ach-keepsake-photo {
          height: 215px;
          border-radius: 10px;
          background-size: cover;
          background-position: center;
        }
        .ach-keepsake-gold-badge {
          position: absolute;
          bottom: -15px;
          right: 14px;
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFE895 0%, #F59E0B 50%, #D97706 100%);
          color: #78350F;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(217, 119, 6, 0.45);
          border: 3.5px solid #FFFFFF;
          box-sizing: border-box;
          z-index: 2;
          padding: 2px;
          overflow: hidden;
        }
        .ach-gold-top-lbl {
          font-size: 7.5px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #78350F;
          line-height: 1;
          margin-bottom: 2px;
          opacity: 0.95;
        }
        .ach-gold-score {
          font-size: 28px;
          font-weight: 950;
          line-height: 0.95;
          color: #78350F;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .ach-gold-den {
          font-size: 9.5px;
          font-weight: 850;
          color: #92400E;
          opacity: 0.9;
          line-height: 1;
          margin-top: 2px;
        }
        .ach-keepsake-caption {
          font-size: 11px;
          font-style: italic;
          color: #78716C;
          text-align: center;
          margin-top: 4px;
          font-weight: 500;
        }
        .ach-keepsake-quote-box {
          background: #FFFFFF;
          border-radius: 11px;
          padding: 9px 13px;
          border: 1px solid #EAE3D7;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .ach-keepsake-quote-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }
        .ach-keepsake-verdict-tag {
          font-size: 8px;
          font-weight: 850;
          color: #0D9488;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .ach-keepsake-quote {
          font-size: 12.5px;
          font-weight: 800;
          color: #1E293B;
          line-height: 1.35;
        }
        .ach-keepsake-coach {
          font-size: 10.5px;
          font-weight: 700;
          color: #0D9488;
        }
        .ach-keepsake-footer-row {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          font-weight: 800;
          color: #57534E;
          border-top: 1px solid #E7E0D6;
          padding-top: 8px;
        }

        /* ── Template 3: Personal scorecard (Exact Reference Match) ── */
        .ach-card-scorecard {
          background: #006859;
          border-radius: 20px;
          padding: 22px 24px 18px 24px;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex-shrink: 0;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .ach-sc-top-section {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 16px;
          flex: 1;
          min-height: 0;
          margin-bottom: 4px;
        }
        .ach-sc-left-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
          padding-bottom: 2px;
        }
        .ach-sc-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          line-height: 1;
        }
        .ach-sc-title {
          font-size: 24px;
          font-weight: 900;
          line-height: 1.15;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          margin: 6px 0 8px 0;
        }
        .ach-sc-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #99F6E4;
          color: #042F2C;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.04em;
          padding: 3.5px 11px;
          border-radius: 999px;
          width: fit-content;
          margin-bottom: 12px;
        }
        .ach-sc-score-block {
          margin-top: auto;
          margin-bottom: 8px;
        }
        .ach-sc-score-line {
          display: flex;
          align-items: baseline;
          line-height: 1;
        }
        .ach-sc-score-num {
          font-size: 58px;
          font-weight: 950;
          color: #FCD34D;
          letter-spacing: -0.03em;
          line-height: 0.95;
        }
        .ach-sc-score-den {
          font-size: 17px;
          font-weight: 750;
          color: rgba(255, 255, 255, 0.85);
          margin-left: 4px;
        }
        .ach-sc-score-lbl {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 5px;
        }
        .ach-sc-ath-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ach-sc-ath-name-highlight {
          font-size: 16px;
          font-weight: 900;
          color: #5EEAD4;
          letter-spacing: -0.01em;
          text-shadow: 0 1px 4px rgba(94, 234, 212, 0.2);
        }
        .ach-sc-ath-sub {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 600;
          margin-top: 2px;
        }
        .ach-sc-ath-name {
          font-size: 13.5px;
          font-weight: 800;
          color: #FFFFFF;
        }
        .ach-sc-ath-date {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.75);
        }
        .ach-sc-right-col {
          flex-shrink: 0;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
        }
        .ach-sc-arch-photo {
          width: 205px;
          height: 280px;
          border-radius: 102px 102px 22px 22px;
          background-size: cover;
          background-position: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.28);
        }
        .ach-sc-divider {
          width: 100%;
          height: 1px;
          background: rgba(255, 255, 255, 0.16);
          margin: 14px 0 12px 0;
        }
        .ach-sc-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .ach-sc-metric-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .ach-sc-metric-val {
          font-size: 24px;
          font-weight: 900;
          color: #FFFFFF;
          line-height: 1;
        }
        .ach-sc-metric-lbl {
          font-size: 8.5px;
          font-weight: 750;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.75);
          text-transform: uppercase;
          margin-top: 4px;
        }
        .ach-sc-quote-box {
          background: #D1FAE5;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .ach-sc-quote-msg {
          font-size: 12px;
          font-weight: 750;
          color: #064E3B;
          line-height: 1.35;
        }
        .ach-sc-quote-by {
          font-size: 10.5px;
          font-weight: 650;
          color: #047857;
        }

        /* ── Template Switcher & Dimension Indicator ── */
        .ach-template-meta-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 10px auto 4px auto;
          max-width: 440px;
          width: 100%;
          font-size: 11.5px;
          color: #64748B;
          flex-shrink: 0;
        }
        .ach-template-label-active {
          font-weight: 700;
          color: #0F172A;
          font-size: 12.5px;
        }
        .ach-template-ratio {
          color: #94A3B8;
          font-size: 11px;
        }
        .ach-template-selector-pills {
          display: flex;
          gap: 8px;
          max-width: 440px;
          margin: 4px auto 10px auto;
          width: 100%;
          flex-shrink: 0;
        }
        .ach-tmpl-btn {
          flex: 1;
          padding: 9px 10px;
          border-radius: 9px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #475569;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        .ach-tmpl-btn:hover {
          border-color: #CBD5E1;
          color: #0F172A;
        }
        .ach-tmpl-btn.active {
          background: #0D9488;
          color: #FFFFFF;
          border-color: #0D9488;
          box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
        }

        /* ── "Make it personal" Section ── */
        .ach-personal-section {
          max-width: 440px;
          width: 100%;
          margin: 0 auto 10px auto;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 12px 14px;
          flex-shrink: 0;
        }
        .ach-personal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ach-personal-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #0F172A;
        }
        .ach-personal-opt {
          font-size: 10px;
          color: #94A3B8;
          font-weight: 600;
          text-transform: uppercase;
        }
        .ach-personal-sub {
          font-size: 11.5px;
          color: #64748B;
          margin: 3px 0 10px 0;
        }
        .ach-personal-btn-row {
          display: flex;
          gap: 10px;
        }
        .ach-personal-upload-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 9px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #1E293B;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ach-personal-upload-btn:hover {
          border-color: #0D9488;
          color: #0D9488;
          background: #F0FDFA;
        }
        .ach-personal-remove-btn {
          padding: 9px 12px;
          border-radius: 9px;
          border: 1px solid #FCA5A5;
          background: #FEF2F2;
          color: #DC2626;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .ach-personal-note {
          font-size: 10.5px;
          color: #94A3B8;
          margin-top: 8px;
          text-align: center;
        }

        /* ── Photo Vibe Filters ── */
        .ach-vibe-filter-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .ach-vibe-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
        }
        .ach-vibe-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ach-vibe-chip {
          padding: 4px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ach-vibe-chip:hover {
          border-color: #0D9488;
          color: #0D9488;
          background: #F0FDFA;
        }
        .ach-vibe-chip.active {
          background: #065F46;
          border-color: #065F46;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(6, 95, 70, 0.25);
        }

        /* ── Photo Framing & Position Adjuster ── */
        .ach-photo-adjust-box {
          margin-top: 10px;
          padding: 10px 12px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
        }
        .ach-photo-adjust-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 7px;
        }
        .ach-pos-badge {
          font-size: 10px;
          font-weight: 800;
          background: #065F46;
          color: #FFFFFF;
          padding: 1px 6px;
          border-radius: 5px;
        }
        .ach-pos-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ach-pos-chip {
          padding: 4px 8px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 700;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ach-pos-chip:hover {
          border-color: #0D9488;
          color: #0D9488;
          background: #F0FDFA;
        }
        .ach-pos-chip.active {
          background: #0D9488;
          border-color: #0D9488;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
        }
        .ach-slider-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px dashed #E2E8F0;
        }
        .ach-slider-hint {
          font-size: 10px;
          color: #64748B;
          font-weight: 700;
          white-space: nowrap;
        }
        .ach-pos-slider {
          flex: 1;
          accent-color: #0D9488;
          cursor: pointer;
          height: 6px;
        }

        /* ── Copy Story Caption Button ── */
        .ach-copy-caption-btn {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 10px;
          background: #F0FDF4;
          border: 1px dashed #059669;
          color: #065F46;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ach-copy-caption-btn:hover {
          background: #DCFCE7;
          border-style: solid;
          transform: translateY(-1px);
        }

        /* ── Main Action Buttons: Share card & Save ── */
        .ach-main-cta-row {
          display: flex;
          gap: 10px;
          max-width: 440px;
          width: 100%;
          margin: 0 auto 6px auto;
          flex-shrink: 0;
        }
        .ach-cta-share-btn {
          flex: 1.4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: #065F46;
          color: #FFFFFF;
          font-size: 13.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(6, 95, 70, 0.3);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .ach-cta-share-btn:hover:not(:disabled) {
          background: #047857;
          transform: translateY(-1px);
        }
        .ach-cta-share-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .ach-cta-save-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1.5px solid #065F46;
          background: #FFFFFF;
          color: #065F46;
          font-size: 13.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ach-cta-save-btn:hover:not(:disabled) {
          background: #ECFDF5;
          transform: translateY(-1px);
        }
        .ach-cta-save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .ach-preview-disclaimer {
          font-size: 9.5px;
          color: #94A3B8;
          text-align: center;
          max-width: 440px;
          margin: 4px auto 12px auto;
        }
        
        .ach-modal-channels-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .ach-social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .ach-social-btn:hover {
          transform: translateY(-1px);
          opacity: 0.94;
        }

        .btn-download-story {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: #0F172A;
          font-weight: 800;
          grid-column: span 2;
          font-size: 13px;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
        }
        .btn-download-story:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
        }

        .ach-spinner-sm {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(15,23,42,0.3);
          border-top-color: #0F172A;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .btn-whatsapp {
          background: #25D366;
          color: #FFFFFF;
          grid-column: span 2;
          font-size: 13px;
        }

        .btn-native {
          background: linear-gradient(135deg, #E1306C 0%, #F56040 100%);
          color: #FFFFFF;
        }

        .btn-twitter {
          background: #1D9BF0;
          color: #FFFFFF;
        }

        .btn-facebook {
          background: #1877F2;
          color: #FFFFFF;
        }

        .btn-copy {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          color: #F8FAFC;
        }

        /* ── Share Section (Download + Social Icons) ─── */
        .ach-share-link-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .ach-download-main-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 13px 20px;
          background: linear-gradient(135deg, #0D9488 0%, #0284C7 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 16px rgba(13, 148, 136, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .ach-download-main-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(13, 148, 136, 0.5);
        }
        .ach-download-main-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .ach-share-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 2px 0;
        }
        .ach-share-divider::before,
        .ach-share-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #E2E8F0;
        }
        .ach-share-divider span {
          font-size: 11px;
          color: #94A3B8;
          white-space: nowrap;
          font-weight: 500;
        }

        .ach-share-icons-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .ach-icon-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .ach-icon-btn:hover {
          transform: translateY(-2px) scale(1.07);
          box-shadow: 0 6px 18px rgba(0,0,0,0.3);
        }

        .ach-icon-wa  { background: #25D366; }
        .ach-icon-fb  { background: #1877F2; }
        .ach-icon-ig  { background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%); }
        .ach-icon-x   { background: #000000; }

        .ach-copy-toast-banner {
          margin-top: 10px;
          padding: 9px 12px;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid #10B981;
          border-radius: 8px;
          color: #059669;
          font-size: 11.5px;
          font-weight: 700;
          text-align: center;
          line-height: 1.4;
        }

        /* ── Live Selfie Camera Modal Styles ── */
        .ach-camera-box {
          max-width: 420px !important;
          width: 95% !important;
          background: #FFFFFF !important;
          border-radius: 20px !important;
          padding: 18px 20px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 14px !important;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35) !important;
        }
        .ach-camera-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ach-camera-viewfinder-wrap {
          position: relative;
          width: 100%;
          height: 380px;
          background: #0F172A;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 25px rgba(0,0,0,0.6);
        }
        .ach-camera-video-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* mirror selfie view */
        }
        .ach-camera-reticle {
          position: absolute;
          inset: 24px;
          border-radius: 14px;
          pointer-events: none;
        }
        .ach-reticle-corner {
          position: absolute;
          width: 22px;
          height: 22px;
          border-color: #2DD4BF;
          border-style: solid;
        }
        .ach-reticle-corner.top-left {
          top: 0;
          left: 0;
          border-width: 3px 0 0 3px;
          border-top-left-radius: 8px;
        }
        .ach-reticle-corner.top-right {
          top: 0;
          right: 0;
          border-width: 3px 3px 0 0;
          border-top-right-radius: 8px;
        }
        .ach-reticle-corner.bottom-left {
          bottom: 0;
          left: 0;
          border-width: 0 0 3px 3px;
          border-bottom-left-radius: 8px;
        }
        .ach-reticle-corner.bottom-right {
          bottom: 0;
          right: 0;
          border-width: 0 3px 3px 0;
          border-bottom-right-radius: 8px;
        }
        .ach-camera-loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 5;
        }
        .ach-camera-error-banner {
          position: absolute;
          inset: 20px;
          background: rgba(254, 242, 242, 0.95);
          border: 1px solid #FCA5A5;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 6;
        }
        .ach-camera-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 2px;
        }
        .ach-camera-snap-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 13px 20px;
          background: linear-gradient(135deg, #0D9488 0%, #065F46 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(13, 148, 136, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .ach-camera-snap-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.5);
        }
        .ach-camera-snap-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .ach-camera-sub-link {
          background: none;
          border: none;
          color: #64748B;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 4px;
          transition: color 0.15s ease;
        }
        .ach-camera-sub-link:hover {
          color: #0F172A;
          text-decoration: underline;
        }

        .ach-cam-control-btn {
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          color: #334155;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s ease;
        }
        .ach-cam-control-btn:hover {
          background: #E2E8F0;
          color: #0F172A;
        }
        .ach-cam-control-btn.active {
          background: #0D9488;
          border-color: #0D9488;
          color: #FFFFFF;
        }

        .ach-camera-countdown-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          z-index: 8;
          pointer-events: none;
        }
        .ach-countdown-digit {
          font-size: 88px;
          font-weight: 900;
          color: #FFFFFF;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8), 0 0 40px #2DD4BF;
          animation: achCountdownPop 1s ease-out infinite;
        }
        @keyframes achCountdownPop {
          0% { transform: scale(1.4); opacity: 0; }
          40% { transform: scale(1); opacity: 1; }
          90% { transform: scale(0.9); opacity: 0.9; }
          100% { transform: scale(0.8); opacity: 0; }
        }

        .ach-camera-flash-overlay {
          position: absolute;
          inset: 0;
          background: #FFFFFF;
          z-index: 10;
          pointer-events: none;
          animation: achFlashAnim 0.35s ease-out forwards;
        }
        @keyframes achFlashAnim {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }

        @media (max-width: 900px) {
          .ach-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .ach-session-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .ach-session-date-col {
            flex-direction: row !important;
            width: 100% !important;
            justify-content: space-between !important;
          }
          .ach-session-actions-col {
            width: 100% !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        }

        @media (max-width: 600px) {
          .ach-main {
            padding: 10px 10px 56px 10px !important;
            margin-top: 62px !important;
            gap: 10px !important;
            overflow-x: hidden !important;
          }
          .ach-header {
            gap: 8px !important;
            margin-bottom: 2px !important;
          }
          .ach-title {
            font-size: 19px !important;
            line-height: 1.2 !important;
          }
          .ach-badge-verified {
            font-size: 9.5px !important;
            padding: 2px 7px !important;
          }
          .ach-sub {
            font-size: 11.5px !important;
            line-height: 1.4 !important;
            margin-top: 4px !important;
          }
          .ach-header-actions {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .ach-header-actions button {
            flex: 1 1 135px !important;
            padding: 7px 10px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
            justify-content: center !important;
            white-space: nowrap !important;
          }
          .ach-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .ach-stat-card {
            padding: 10px !important;
            border-radius: 12px !important;
            gap: 8px !important;
            align-items: center !important;
            min-width: 0 !important;
          }
          .ach-stat-icon {
            width: 34px !important;
            height: 34px !important;
            font-size: 16px !important;
            border-radius: 9px !important;
            flex-shrink: 0 !important;
          }
          .ach-stat-body {
            min-width: 0 !important;
          }
          .ach-stat-num {
            font-size: 17px !important;
            line-height: 1.15 !important;
          }
          .ach-stat-label {
            font-size: 10px !important;
            line-height: 1.2 !important;
          }
          .ach-stat-hint {
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
          .ach-controls-bar {
            padding: 8px !important;
            gap: 8px !important;
            border-radius: 12px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .ach-tabs {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 4px !important;
            box-sizing: border-box !important;
          }
          .ach-tab-btn {
            padding: 5px 4px !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
            text-align: center !important;
            justify-content: center !important;
            white-space: normal !important;
          }
          .ach-search-wrap {
            width: 100% !important;
            padding: 6px 10px !important;
          }
          .ach-search-input {
            font-size: 12px !important;
          }
          .ach-session-card {
            padding: 12px !important;
            border-radius: 12px !important;
            gap: 8px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .ach-session-title {
            font-size: 14px !important;
          }
          .ach-session-actions-col {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .ach-metric-pills {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 5px !important;
            width: 100% !important;
          }
          .ach-pill {
            white-space: nowrap !important;
            font-size: 10.5px !important;
            padding: 3px 8px !important;
          }
          .ach-btn-row {
            width: 100% !important;
          }
          .ach-btn-share {
            width: 100% !important;
            justify-content: center !important;
            font-size: 11.5px !important;
            padding: 7px 10px !important;
            border-radius: 8px !important;
            box-sizing: border-box !important;
          }
          .ach-modal-channels-list {
            grid-template-columns: 1fr !important;
          }
          .btn-whatsapp {
            grid-column: span 1 !important;
          }
          .ach-modal-backdrop {
            align-items: center !important;
            justify-content: center !important;
            padding: 10px 8px !important;
            height: 100dvh !important;
            overflow: hidden !important;
          }
          .ach-share-studio-box {
            width: 100% !important;
            max-width: 100% !important;
            max-height: calc(100dvh - 20px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain !important;
            padding: 14px 12px !important;
            border-radius: 16px !important;
            gap: 10px !important;
            box-sizing: border-box !important;
          }
          .ach-modal-title {
            font-size: 16px !important;
          }
          .ach-modal-sub {
            font-size: 11px !important;
          }
          .ach-coach-switcher-strip {
            padding: 6px 8px !important;
            gap: 5px !important;
          }
          .ach-coach-pill-btn {
            font-size: 10.5px !important;
            padding: 3px 9px !important;
          }
          .ach-story-card-wrapper {
            height: auto !important;
            aspect-ratio: auto !important;
            border-radius: 14px !important;
          }
          .ach-card-spotlight,
          .ach-card-keepsake,
          .ach-card-scorecard {
            height: auto !important;
            border-radius: 14px !important;
          }
          .ach-spotlight-photo {
            height: 195px !important;
          }
          .ach-spotlight-slate {
            padding: 10px 12px 8px 12px !important;
            gap: 6px !important;
          }
          .ach-spotlight-title {
            font-size: 16px !important;
            line-height: 1.2 !important;
          }
          .ach-spotlight-meta-line,
          .ach-spotlight-sub-line {
            font-size: 10.5px !important;
          }
          .ach-spotlight-score-block {
            min-width: 64px !important;
          }
          .ach-spotlight-score-val {
            font-size: 24px !important;
          }
          .ach-spotlight-score-lbl {
            font-size: 7.5px !important;
            white-space: nowrap !important;
          }
          .ach-spotlight-metric-trio {
            gap: 5px !important;
          }
          .ach-spot-metric-pill {
            padding: 5px 4px !important;
            border-radius: 7px !important;
          }
          .ach-spot-metric-val {
            font-size: 10.5px !important;
            line-height: 1.2 !important;
          }
          .ach-spot-metric-sub {
            font-size: 7px !important;
          }
          .ach-spotlight-quote-box {
            padding: 7px 9px !important;
          }
          .ach-spotlight-quote {
            font-size: 10.5px !important;
            line-height: 1.3 !important;
          }
          .ach-spotlight-coach {
            font-size: 9.5px !important;
          }
          .ach-cta-share-btn,
          .ach-cta-save-btn {
            padding: 9px 10px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
          }
          /* Template 2: Ocean keepsake mobile */
          .ach-card-keepsake {
            padding: 14px 12px 10px 12px !important;
            gap: 6px !important;
          }
          .ach-keepsake-tag {
            font-size: 8px !important;
            letter-spacing: 0.04em !important;
            display: block !important;
            padding-right: 68px !important;
            line-height: 1.25 !important;
          }
          .ach-keepsake-title {
            font-size: 16px !important;
          }
          .ach-keepsake-photo {
            height: 165px !important;
          }
          .ach-keepsake-gold-badge {
            width: 56px !important;
            height: 56px !important;
            bottom: -10px !important;
            right: 10px !important;
          }
          .ach-gold-top-lbl {
            font-size: 6.5px !important;
            margin-bottom: 1px !important;
          }
          .ach-gold-score {
            font-size: 18px !important;
          }
          .ach-gold-den {
            font-size: 8px !important;
            margin-top: 1px !important;
          }
          .ach-keepsake-quote-box {
            padding: 7px 10px !important;
          }
          .ach-keepsake-quote {
            font-size: 11px !important;
          }
          .ach-keepsake-footer-row {
            font-size: 9.5px !important;
            gap: 6px 10px !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            text-align: center !important;
          }
          .ach-keepsake-footer-row > span {
            white-space: nowrap !important;
          }
          /* Template 3: Personal scorecard mobile */
          .ach-card-scorecard {
            padding: 14px 12px 12px 12px !important;
          }
          .ach-sc-top-section {
            gap: 10px !important;
            align-items: center !important;
          }
          .ach-sc-arch-photo {
            width: 118px !important;
            height: 175px !important;
            border-radius: 60px 60px 14px 14px !important;
          }
          .ach-sc-tag {
            font-size: 8.5px !important;
          }
          .ach-sc-title {
            font-size: 16px !important;
            margin: 4px 0 6px 0 !important;
          }
          .ach-sc-pill {
            font-size: 8px !important;
            padding: 2.5px 8px !important;
            margin-bottom: 6px !important;
            white-space: nowrap !important;
          }
          .ach-sc-score-num {
            font-size: 32px !important;
          }
          .ach-sc-score-lbl {
            font-size: 7.5px !important;
          }
          .ach-sc-ath-name-highlight {
            font-size: 13px !important;
          }
          .ach-sc-ath-sub {
            font-size: 9.5px !important;
            line-height: 1.3 !important;
          }
          .ach-sc-divider {
            margin: 10px 0 8px 0 !important;
          }
          .ach-sc-metric-val {
            font-size: 16px !important;
          }
          .ach-sc-metric-lbl {
            font-size: 7.5px !important;
          }
          .ach-sc-quote-box {
            padding: 8px 10px !important;
          }
          .ach-sc-quote-msg {
            font-size: 11px !important;
          }
          .ach-sc-quote-by {
            font-size: 9.5px !important;
          }
        }
      `}</style>
    </div>
  );
}
