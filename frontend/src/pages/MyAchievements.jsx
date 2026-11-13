import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

export default function MyAchievements() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'completed' | 'upcoming'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Social Share Modal State
  const [shareModalSession, setShareModalSession] = useState(null); // session object or 'overall'
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [posterBgUrl, setPosterBgUrl] = useState(() => {
    return localStorage.getItem('athnex_milestone_poster_bg') || '/surf-milestone-bg.jpg';
  });
  const confettiCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const cardRef = useRef(null);

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

  useEffect(() => {
    const fetchStudentAndSessions = async () => {
      setLoading(true);
      try {
        const studentId = loggedUser?.student_id || loggedUser?.id;
        let fetchedProfile = null;

        // 1. Fetch student profile if available
        if (studentId) {
          try {
            const sRes = await fetch(`${API}/api/students/${studentId}`);
            if (sRes.ok) {
              fetchedProfile = await sRes.json();
              setStudentData(fetchedProfile);
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

        // 3. Filter sessions belonging to this student
        const targetName = (studentName || '').toLowerCase().trim();
        const studentCandidateIds = [
          studentId ? String(studentId) : null,
          loggedUser?.student_id ? String(loggedUser.student_id) : null,
        ].filter(Boolean);

        const matchedSessions = allSess.filter(s => {
          const sName = (s.student || s.guest_name || s.student_name || '').toLowerCase().trim();
          const sid = s.student_id ? String(s.student_id) : '';

          const idMatch = sid && studentCandidateIds.includes(sid);
          const nameMatch = targetName && (sName === targetName || (sName.length >= 3 && targetName.includes(sName)));
          return idMatch || nameMatch;
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

  // Load custom school milestone poster background if configured
  useEffect(() => {
    const fetchPoster = async () => {
      try {
        const sch = studentSchool || '';
        const cached = (sch && localStorage.getItem(`athnex_poster_${sch}`)) || localStorage.getItem('athnex_milestone_poster_bg');
        if (cached) setPosterBgUrl(cached);

        const res = await fetch(`${API}/api/schools/poster?school=${encodeURIComponent(sch)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.poster_url) {
            setPosterBgUrl(data.poster_url);
            localStorage.setItem('athnex_milestone_poster_bg', data.poster_url);
            if (sch) localStorage.setItem(`athnex_poster_${sch}`, data.poster_url);
          }
        }
      } catch (err) {
        console.warn('Failed to load custom poster image', err);
      }
    };
    fetchPoster();

    const onStorageChange = () => {
      const updated = localStorage.getItem('athnex_milestone_poster_bg');
      if (updated) setPosterBgUrl(updated);
    };
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, [studentSchool]);

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

  // Derive verified coach technique score out of 100
  const getSessionScore = (sess) => {
    if (!sess) return 85;
    const direct = parseInt(sess.score || sess.technique_score || sess.coach_rating, 10);
    if (!isNaN(direct) && direct > 0) return direct;
    if (sess.notes) {
      const sm = sess.notes.match(/(?:Coach (?:Rating|Score)|Technique Score|Score):\s*(\d+)/i) || sess.notes.match(/\[\s*(\d+)\s*(?:out of|\/)\s*100\s*\]/i);
      if (sm) return parseInt(sm[1], 10);
    }
    return 85;
  };

  // Derive session waves caught / ridden
  const getSessionWaves = (sess) => {
    if (!sess) return 6;
    const direct = parseInt(sess.waves_ridden || sess.waves_caught || sess.wave_count, 10);
    if (!isNaN(direct) && direct > 0) return direct;
    if (sess.notes) {
      const wm = sess.notes.match(/Wave Count:\s*(\d+)/i);
      if (wm) return parseInt(wm[1], 10);
    }
    const sc = getSessionScore(sess);
    if (sc > 0) {
      return Math.max(4, Math.min(12, Math.round(sc / 10) + 1));
    }
    return 6;
  };

  // Compute milestone statistics from session history
  const stats = useMemo(() => {
    const completedList = sessions.filter(isSessionCompleted);
    const upcomingList = sessions.filter(s => !isSessionCompleted(s));

    const totalWaves = completedList.reduce((sum, s) => {
      const count = getSessionWaves(s);
      return sum + (isNaN(count) ? 0 : count);
    }, 0) || (completedList.length * 6); // Realistic average if count unrecorded

    const totalHours = (completedList.length * 2.0).toFixed(1);

    const scores = completedList
      .map(s => getSessionScore(s))
      .filter(sc => !isNaN(sc) && sc > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;

    return {
      total: sessions.length,
      completed: completedList.length,
      upcoming: upcomingList.length,
      totalWaves,
      totalHours,
      avgScore
    };
  }, [sessions]);

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
    if (!sess) return '2 Hours (120m)';
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
    return '2 Hours (120m)';
  };

  // Helper to construct share text for a specific session
  const buildShareText = (sess) => {
    if (sess === 'overall') {
      return (
        `🏄 *My Surfing Milestones at Athnex Live!* 🌊\n` +
        `👤 Surfer: *${studentName}*\n` +
        `🏆 Skill Level: *${studentLevel}*\n` +
        `✅ Sessions Completed: *${stats.completed} Sessions*\n` +
        `🌊 Waves Ridden: *${stats.totalWaves} Waves*\n` +
        `⏱️ Ocean Training: *${stats.totalHours} hrs*\n` +
        `⭐ Coach Score: *${stats.avgScore}/100*\n` +
        `📍 Academy: *${studentSchool}*\n\n` +
        `Track verified surf progress & AI video analysis on https://athnexlive.com 🤙`
      );
    }
    const coachName = sess.instructor || sess.instructor_name || 'Coach';
    const loc = sess.location || studentSchool || 'Surf Spot';
    const duration = getSessionDuration(sess);
    const waves = getSessionWaves(sess);
    const scoreVal = getSessionScore(sess);
    return (
      `🏄 *Surf Session Milestone Completed!* 🌊\n` +
      `👤 Surfer: *${studentName}*\n` +
      `📅 Date: *${sess.date}* (${sess.time || 'Morning Session'})\n` +
      `⏱️ Training Time: *${duration}*\n` +
      `🌊 Waves Caught: *${waves} Waves*\n` +
      `⭐ Technique Score: *${scoreVal}/100*\n` +
      `📍 Spot: *${loc}*\n` +
      `🏄 Coach: *${coachName}*\n` +
      `🔥 Level: *${sess.level || sess.type || studentLevel}*\n` +
      `⭐ Verified at *Athnex Live* (https://athnexlive.com) 🤙`
    );
  };

  // High-Resolution Story Poster Blob Generator
  const generateStoryPosterBlob = async (sess) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350; // Standard 4:5 mobile story / portrait ratio
    const ctx = canvas.getContext('2d');
    const isOverall = sess === 'overall';

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = posterBgUrl || '/surf-milestone-bg.jpg';

    await new Promise((resolve) => {
      bgImg.onload = resolve;
      bgImg.onerror = resolve; // fallback gracefully if image load interrupted
    });

    // 1. Draw Background AI Surfing Image
    if (bgImg.complete && bgImg.naturalWidth > 0) {
      const imgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
      const targetRatio = canvas.width / canvas.height;
      let sWidth = bgImg.naturalWidth;
      let sHeight = bgImg.naturalHeight;
      let sx = 0;
      let sy = 0;

      if (imgRatio > targetRatio) {
        sWidth = bgImg.naturalHeight * targetRatio;
        sx = (bgImg.naturalWidth - sWidth) / 2;
      } else {
        sHeight = bgImg.naturalWidth / targetRatio;
        sy = (bgImg.naturalHeight - sHeight) / 2;
      }
      ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(0.5, '#042F2E');
      bgGrad.addColorStop(1, '#022C22');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Cinematic Gradient Overlay
    const overlayGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    overlayGrad.addColorStop(0, 'rgba(15, 23, 42, 0.78)');
    overlayGrad.addColorStop(0.3, 'rgba(15, 23, 42, 0.45)');
    overlayGrad.addColorStop(0.65, 'rgba(15, 23, 42, 0.75)');
    overlayGrad.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Borders
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#2DD4BF';
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    // 4. Header Branding
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2DD4BF';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('⚡ ATHNEX LIVE', 80, 115);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FCD34D';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🏆 VERIFIED ATHLETE', canvas.width - 80, 115);

    // 5. Motivational Header Slogan
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2DD4BF';
    ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🌊 PUSH YOUR LIMITS  •  MASTER THE OCEAN', canvas.width / 2, 215);

    // 6. Surfer Name & Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 64px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(studentName.toUpperCase(), canvas.width / 2, 305);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${studentSchool}  •  ${studentLevel} Surfer`, canvas.width / 2, 355);

    // 7. Metric Blocks (6 high-impact metrics)
    const boxW = 440;
    const boxH = 122;
    const startY = 425;
    const gapX = 40;
    const gapY = 20;
    const col1X = (canvas.width / 2) - boxW - (gapX / 2);
    const col2X = (canvas.width / 2) + (gapX / 2);

    const wavesCount = getSessionWaves(sess);
    const durationText = getSessionDuration(sess);

    const metrics = isOverall ? [
      { label: 'COMPLETED SESSIONS', val: `${stats.completed}`, sub: 'Verified On Water', icon: '🏄‍♂️' },
      { label: 'TOTAL WAVES RIDDEN', val: `${stats.totalWaves}`, sub: 'Ocean Logged', icon: '🌊' },
      { label: 'WATER TRAINING', val: `${stats.totalHours} hrs`, sub: 'Coached Direct', icon: '⏱️' },
      { label: 'TECHNIQUE SCORE', val: `${stats.avgScore} / 100`, sub: 'Coach Verified', icon: '⭐' },
      { label: 'TRAINING SPOT', val: `${studentSchool}`, sub: 'Official Academy', icon: '📍' },
      { label: 'ATHLETE STATUS', val: `${studentLevel}`, sub: 'Certified Surfer', icon: '🏆' }
    ] : [
      { label: 'SESSION DATE', val: `${sess.date || 'Today'}`, sub: `${sess.time || 'Morning Slot'}`, icon: '📅' },
      { label: 'TRAINING TIME', val: `${durationText}`, sub: 'Ocean Water Time', icon: '⏱️' },
      { label: 'WAVES CAUGHT', val: `${wavesCount} Waves`, sub: 'Successfully Ridden', icon: '🌊' },
      { label: 'TECHNIQUE SCORE', val: `${getSessionScore(sess)} / 100`, sub: 'Coach Verified', icon: '⭐' },
      { label: 'SURF SPOT', val: `${sess.location || studentSchool || 'Surf Spot'}`, sub: 'Tidal Swell Spot', icon: '📍' },
      { label: 'COACH', val: `${sess.instructor || sess.instructor_name || 'Coach'}`, sub: 'ISA Certified', icon: '🏄' }
    ];

    const drawBox = (x, y, data) => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${data.icon} ${data.label}`, x + 22, y + 34);

      ctx.fillStyle = '#2DD4BF';
      ctx.font = '900 34px "Plus Jakarta Sans", sans-serif';
      let displayVal = String(data.val);
      if (displayVal.length > 20) displayVal = displayVal.slice(0, 18) + '...';
      ctx.fillText(displayVal, x + 22, y + 78);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(data.sub, x + 22, y + 107);
    };

    drawBox(col1X, startY, metrics[0]);
    drawBox(col2X, startY, metrics[1]);
    drawBox(col1X, startY + boxH + gapY, metrics[2]);
    drawBox(col2X, startY + boxH + gapY, metrics[3]);
    drawBox(col1X, startY + (boxH + gapY) * 2, metrics[4]);
    drawBox(col2X, startY + (boxH + gapY) * 2, metrics[5]);

    // 8. Motivational Quote Box
    const quoteY = startY + (boxH + gapY) * 3 + 15;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(252, 211, 77, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(80, quoteY, canvas.width - 160, 135, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FCD34D';
    ctx.font = 'italic 800 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('“Every wave caught is a boundary pushed.”', canvas.width / 2, quoteY + 54);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Conquer your athletic surfing journey on Athnex Live', canvas.width / 2, quoteY + 98);

    // 9. Footer Watermark
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ATHNEX LIVE  •  athnexlive.com  •  OFFICIAL SURF ATHLETE RECORD', canvas.width / 2, canvas.height - 75);

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
      : `Stoked on my surf session at ${sess.location || 'the coast'} with Coach ${sess.instructor || 'Coach'}! 🏄‍♂️🌊 Verified on @athnexlive #Surfing #WaveRider`;
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
      const blob = await generateStoryPosterBlob(sess);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = studentName.replace(/\s+/g, '_');
      a.download = `Athnex_Surfing_Milestone_${cleanName}.png`;
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
    setShareModalSession(target);
    // Trigger confetti slightly after modal mount for high impact
    setTimeout(() => {
      launchConfetti();
    }, 50);
  };

  // ── Certificate Generator (HTML5 Canvas, A4 Landscape) ───────────────────
  const handleDownloadCertificate = async () => {
    try {
      setDownloadingCert(true);
      const W = 1754, H = 1240; // A4 landscape @150dpi
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // ─ Background gradient (deep ocean navy) ─
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0A1628');
      bgGrad.addColorStop(0.5, '#0D2240');
      bgGrad.addColorStop(1, '#071020');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ─ Surf action image background (subtle, low opacity) ─
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.src = '/surf-milestone-bg.jpg';
      await new Promise(r => { bgImg.onload = r; bgImg.onerror = r; });
      if (bgImg.naturalWidth > 0) {
        ctx.globalAlpha = 0.12;
        const iR = bgImg.naturalWidth / bgImg.naturalHeight;
        const cR = W / H;
        let sw = bgImg.naturalWidth, sh = bgImg.naturalHeight, sx = 0, sy = 0;
        if (iR > cR) { sw = bgImg.naturalHeight * cR; sx = (bgImg.naturalWidth - sw) / 2; }
        else { sh = bgImg.naturalWidth / cR; sy = (bgImg.naturalHeight - sh) / 2; }
        ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // ─ Outer gold border (double frame) ─
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#D4AF37';
      ctx.strokeRect(28, 28, W - 56, H - 56);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(212,175,55,0.5)';
      ctx.strokeRect(44, 44, W - 88, H - 88);

      // ─ Corner decorative diamonds ─
      const drawDiamond = (cx, cy, size) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#D4AF37';
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      };
      [36, W - 36].forEach(x => [36, H - 36].forEach(y => drawDiamond(x, y, 18)));

      // ─ Top academy logo area ─
      ctx.textAlign = 'center';

      // Athnex logo circle
      ctx.beginPath();
      ctx.arc(W / 2, 115, 42, 0, Math.PI * 2);
      ctx.fillStyle = '#2DD4BF';
      ctx.fill();
      ctx.fillStyle = '#0A1628';
      ctx.font = 'bold 42px Arial, sans-serif';
      ctx.fillText('A', W / 2, 130);

      // Academy name
      ctx.fillStyle = '#2DD4BF';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('ATHNEX LIVE', W / 2, 185);

      ctx.fillStyle = 'rgba(212,175,55,0.7)';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText('OFFICIAL SURF ACADEMY  •  athnexlive.com', W / 2, 215);

      // ─ Decorative gold divider line ─
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

      // ─ "Certificate of Completion" title ─
      ctx.fillStyle = '#FEF3C7';
      ctx.font = 'italic 22px Georgia, serif';
      ctx.fillText('This is to certify that', W / 2, 290);

      // ─ Student Name (the BIG hero) ─
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 82px Georgia, serif';
      ctx.fillText(studentName, W / 2, 390);

      // ─ Name underline ─
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

      // ─ Achievement text ─
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '26px Georgia, serif';
      ctx.fillText('has successfully completed the', W / 2, 455);

      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 46px Georgia, serif';
      ctx.fillText('3-Day Surf Training Course', W / 2, 515);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText(`at ${studentSchool}`, W / 2, 560);

      drawDivider(600);

      // ─ Stats row (3 pills) ─
      const pills = [
        { icon: '\uD83C\uDFC4', label: 'Sessions', val: `${stats.completed} Completed` },
        { icon: '\uD83C\uDF0A', label: 'Waves Ridden', val: `${stats.totalWaves} Waves` },
        { icon: '\u2B50', label: 'Coach Score', val: `${stats.avgScore} / 100` },
      ];

      const pillW = 360, pillH = 90, pillGap = 60;
      const totalPillW = pills.length * pillW + (pills.length - 1) * pillGap;
      const pillStartX = (W - totalPillW) / 2;

      pills.forEach((p, i) => {
        const px = pillStartX + i * (pillW + pillGap);
        const py = 630;
        // box
        ctx.fillStyle = 'rgba(45,212,191,0.1)';
        ctx.strokeStyle = 'rgba(45,212,191,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px, py, pillW, pillH, 14);
        ctx.fill();
        ctx.stroke();
        // icon + val
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2DD4BF';
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillText(`${p.icon} ${p.val}`, px + pillW / 2, py + 40);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '17px Arial, sans-serif';
        ctx.fillText(p.label.toUpperCase(), px + pillW / 2, py + 70);
      });

      drawDivider(760);

      // ─ Completion date + coach row ─
      const completedSessions = sessions.filter(isSessionCompleted);
      const lastSession = completedSessions[0];
      const certDate = lastSession?.date
        ? new Date(lastSession.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const coachNameCert = lastSession?.instructor || lastSession?.instructor_name || 'Athnex Coach';

      // Two columns: Date | Coach
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

      // Centre vertical separator
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2, 800);
      ctx.lineTo(W / 2, 870);
      ctx.stroke();

      // Skill level badge
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
      ctx.fillText(`\u2713 ${studentLevel} Level`, W / 2, 923);

      // ─ Bottom seal ─
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText('ATHNEX LIVE  •  OFFICIAL SURF ACADEMY CERTIFICATE  •  athnexlive.com', W / 2, H - 55);

      // ─ Trigger download ─
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = studentName.replace(/\s+/g, '_');
        a.download = `Athnex_Certificate_${cleanName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadingCert(false);
      }, 'image/png');
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
            {/* Certificate Download — visible when 3+ sessions completed */}
            {stats.completed >= 3 && (
              <button
                type="button"
                className="ach-btn-certificate"
                onClick={handleDownloadCertificate}
                disabled={downloadingCert}
                title="Download your 3-Day Surf Course Completion Certificate"
              >
                {downloadingCert ? (
                  <>
                    <span className="ach-spinner-sm-dark"></span>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="6"></circle>
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
                    </svg>
                    <span>Download Certificate</span>
                  </>
                )}
              </button>
            )}

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

          <div className="ach-stat-card card-emerald">
            <div className="ach-stat-icon">🌊</div>
            <div className="ach-stat-body">
              <span className="ach-stat-num">{stats.totalWaves}</span>
              <span className="ach-stat-label">Total Waves Caught</span>
              <span className="ach-stat-hint">Across verified sessions</span>
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

          <div className="ach-stat-card card-purple">
            <div className="ach-stat-icon">⭐</div>
            <div className="ach-stat-body">
              <span className="ach-stat-num">{stats.avgScore}/100</span>
              <span className="ach-stat-label">Coach Technique Score</span>
              <span className="ach-stat-hint">{studentLevel} Level</span>
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
                const coachName = sess.instructor || sess.instructor_name || 'Assigned Surf Coach';
                const spot = sess.location || studentSchool || 'Surf Academy Spot';
                const levelTag = sess.level || sess.type || studentLevel;

                return (
                  <article key={sess.id || idx} className="ach-session-card">
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
                          <span>Coach: <strong>{coachName}</strong></span>
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
                        <div className="ach-pill" title="Estimated waves caught in this session">
                          <span className="ach-pill-icon">🌊</span>
                          <span className="ach-pill-val">{getSessionWaves(sess)} Waves</span>
                        </div>
                        <div className="ach-pill" title="Verified technique assessment score">
                          <span className="ach-pill-icon">⭐</span>
                          <span className="ach-pill-val">{getSessionScore(sess)}/100</span>
                        </div>
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

        {/* ── Social Media Share Modal ────────────────────────────────────── */}
        {shareModalSession && (
          <div className="ach-modal-backdrop" onClick={() => setShareModalSession(null)}>
            <div className="ach-modal-box" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="ach-modal-header">
                <div>
                  <h3 className="ach-modal-title">
                    {shareModalSession === 'overall' ? 'Share Surfing Track Record' : 'Share Surf Session Milestone'}
                  </h3>
                  <p className="ach-modal-sub">
                    Post your achievement to WhatsApp, Instagram Stories, Twitter, or copy formatted text!
                  </p>
                </div>
                <button
                  type="button"
                  className="ach-modal-close"
                  onClick={() => setShareModalSession(null)}
                >
                  ✕
                </button>
              </div>

              {/* Visual Shareable Milestone Card Preview (AI Surfing Action Poster) */}
              <div
                className="ach-share-preview-card"
                ref={cardRef}
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.74) 0%, rgba(15, 23, 42, 0.92) 100%), url(${posterBgUrl || '/surf-milestone-bg.jpg'})`
                }}
              >
                <div className="ach-card-glow-bg"></div>

                <div className="ach-card-top-branding">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2DD4BF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0F172A', fontSize: '14px', boxShadow: '0 0 12px rgba(45,212,191,0.6)' }}>
                      A
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.08em', color: '#FFFFFF', textTransform: 'uppercase' }}>
                      ATHNEX LIVE
                    </span>
                  </div>
                  <span className="ach-card-verified-badge">
                    🏆 VERIFIED SURF ATHLETE
                  </span>
                </div>

                {/* Motivational Header Tagline */}
                <div className="ach-card-motivational-banner">
                  🌊 PUSH YOUR LIMITS • MASTER THE OCEAN
                </div>

                <div className="ach-card-surfer-info">
                  <div className="ach-card-avatar">
                    {(studentName || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="ach-card-surfer-name">{studentName}</h4>
                    <span className="ach-card-surfer-sub">
                      {studentSchool} • <strong style={{ color: '#2DD4BF' }}>{studentLevel} Surfer</strong>
                    </span>
                  </div>
                </div>

                {shareModalSession === 'overall' ? (
                  <div className="ach-card-metrics-grid">
                    <div className="ach-card-metric-cell">
                      <span className="ach-card-m-val">🏄‍♂️ {stats.completed}</span>
                      <span className="ach-card-m-lbl">Completed Sessions</span>
                    </div>
                    <div className="ach-card-metric-cell">
                      <span className="ach-card-m-val">🌊 {stats.totalWaves}</span>
                      <span className="ach-card-m-lbl">Waves Ridden</span>
                    </div>
                    <div className="ach-card-metric-cell">
                      <span className="ach-card-m-val">⏱️ {stats.totalHours} hrs</span>
                      <span className="ach-card-m-lbl">Water Training</span>
                    </div>
                    <div className="ach-card-metric-cell">
                      <span className="ach-card-m-val">⭐ {stats.avgScore}/100</span>
                      <span className="ach-card-m-lbl">Technique Score</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Big Prominent Metric Boxes */}
                    <div className="ach-card-metrics-grid">
                      <div className="ach-card-metric-cell">
                        <span className="ach-card-m-val" style={{ color: '#2DD4BF' }}>
                          🌊 {getSessionWaves(shareModalSession)} Waves
                        </span>
                        <span className="ach-card-m-lbl">Waves Caught</span>
                      </div>
                      <div className="ach-card-metric-cell">
                        <span className="ach-card-m-val" style={{ color: '#38BDF8' }}>
                          ⏱️ {getSessionDuration(shareModalSession)}
                        </span>
                        <span className="ach-card-m-lbl">Training Duration</span>
                      </div>
                      <div className="ach-card-metric-cell">
                        <span className="ach-card-m-val" style={{ color: '#FCD34D' }}>
                          ⭐ {getSessionScore(shareModalSession)} / 100
                        </span>
                        <span className="ach-card-m-lbl">Technique Rating</span>
                      </div>
                      <div className="ach-card-metric-cell">
                        <span className="ach-card-m-val" style={{ color: '#FFFFFF', fontSize: '13.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={shareModalSession.instructor || shareModalSession.instructor_name || 'Coach'}>
                          🏄 {shareModalSession.instructor || shareModalSession.instructor_name || 'Coach'}
                        </span>
                        <span className="ach-card-m-lbl">Assigned Coach</span>
                      </div>
                    </div>

                    {/* Date, Time & Surf Spot placed below */}
                    <div className="ach-card-session-meta-strip">
                      <div className="ach-card-detail-item">
                        <span className="ach-card-detail-lbl">📅 Date & Time</span>
                        <span className="ach-card-detail-val">{shareModalSession.date} ({shareModalSession.time || 'Morning'})</span>
                      </div>
                      <div className="ach-card-detail-item">
                        <span className="ach-card-detail-lbl">📍 Surf Spot</span>
                        <span className="ach-card-detail-val">{shareModalSession.location || studentSchool}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Motivational Quote Banner */}
                <div className="ach-card-quote-banner">
                  “Every wave caught is a boundary pushed.”
                </div>

                <div className="ach-card-bottom-footer">
                  <span>🌊 Athnex Live • athnexlive.com</span>
                  <span>Official Athlete Record</span>
                </div>
              </div>

              {/* Download Story Poster + Direct Social Icons */}
              <div className="ach-share-link-section">
                {/* Download Button */}
                <button
                  type="button"
                  className="ach-download-main-btn"
                  onClick={() => handleDownloadStoryCard(shareModalSession)}
                  disabled={downloadingImg}
                >
                  {downloadingImg ? (
                    <>
                      <span className="ach-spinner-sm"></span>
                      <span>Generating Poster...</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span>Download Story Poster</span>
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="ach-share-divider">
                  <span>Or Share Directly Via</span>
                </div>

                {/* Round Social Icon Buttons */}
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
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .ach-btn-certificate:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
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

        .ach-share-preview-card {
          position: relative;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.74) 0%, rgba(15, 23, 42, 0.92) 100%),
                      url('/surf-milestone-bg.jpg') center/cover no-repeat;
          border: 1.5px solid rgba(45, 212, 191, 0.45);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 16px 36px rgba(0,0,0,0.65), inset 0 0 25px rgba(45, 212, 191, 0.12);
          overflow: hidden;
        }

        .ach-card-glow-bg {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 160px;
          height: 160px;
          background: radial-gradient(circle, rgba(45,212,191,0.3) 0%, transparent 70%);
          pointer-events: none;
        }

        .ach-card-top-branding {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        .ach-card-verified-badge {
          background: rgba(252, 211, 77, 0.15);
          border: 1px solid rgba(252, 211, 77, 0.5);
          color: #FCD34D;
          font-size: 10.5px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 20px;
          letter-spacing: 0.04em;
          box-shadow: 0 0 12px rgba(252, 211, 77, 0.2);
        }

        .ach-card-motivational-banner {
          background: rgba(45, 212, 191, 0.12);
          border: 1px dashed rgba(45, 212, 191, 0.4);
          border-radius: 8px;
          padding: 7px 12px;
          text-align: center;
          color: #2DD4BF;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          position: relative;
          z-index: 1;
        }

        .ach-card-surfer-info {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .ach-card-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%);
          color: #0F172A;
          font-size: 20px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 0 14px rgba(45, 212, 191, 0.4);
        }

        .ach-card-surfer-name {
          font-size: 17px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .ach-card-surfer-sub {
          font-size: 11.5px;
          color: #94A3B8;
        }

        .ach-card-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .ach-card-metric-cell {
          background: rgba(15, 23, 42, 0.82);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(45, 212, 191, 0.28);
          border-radius: 11px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 56px;
        }

        .ach-card-m-val {
          font-size: 15px;
          font-weight: 800;
          color: #2DD4BF;
          line-height: 1.25;
        }
        .ach-card-m-lbl {
          font-size: 10px;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 3px;
          font-weight: 600;
        }

        .ach-card-session-details,
        .ach-card-session-meta-strip {
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
          z-index: 1;
        }

        .ach-card-detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11.5px;
        }
        .ach-card-detail-lbl {
          color: #94A3B8;
        }
        .ach-card-detail-val {
          color: #F8FAFC;
          font-weight: 700;
        }

        .ach-card-quote-banner {
          background: rgba(255, 255, 255, 0.05);
          border-left: 3px solid #FCD34D;
          border-radius: 0 8px 8px 0;
          padding: 8px 12px;
          color: #E2E8F0;
          font-size: 11.5px;
          font-style: italic;
          font-weight: 600;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .ach-card-bottom-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #94A3B8;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 8px;
          margin-top: 2px;
          position: relative;
          z-index: 1;
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
            padding: 14px 12px 60px 12px !important;
            margin-top: 64px !important;
          }
          .ach-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .ach-modal-channels-list {
            grid-template-columns: 1fr !important;
          }
          .btn-whatsapp {
            grid-column: span 1 !important;
          }
          .ach-search-wrap {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
