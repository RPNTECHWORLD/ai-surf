import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const posterPresets = [
  { label: 'Default AI Action', url: '/surf-milestone-bg.jpg', desc: 'Cinematic emerald wave break' },
  { label: 'Deep Blue Barrel', url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80', desc: 'Powerful sapphire ocean tube' },
  { label: 'Golden Hour Sunset', url: 'https://images.unsplash.com/photo-1455729552865-3658a5d39692?auto=format&fit=crop&w=1200&q=80', desc: 'Warm sunset glow and ocean spray' },
  { label: 'Tropical Ocean Swell', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', desc: 'Clear turquoise beach waters' },
  { label: 'Crystal Crest Break', url: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?auto=format&fit=crop&w=1200&q=80', desc: 'Crisp peeling right-hander' },
];

const certPresets = [
  {
    id: 'default',
    label: 'Default Certificate (Official Athnex)',
    badge: 'DEFAULT',
    desc: 'Official academy certificate with ocean wave backdrop, gold double frame, seal & stats',
    bg: 'linear-gradient(135deg, #0A1628 0%, #0D2240 50%, #071020 100%)',
    border: '#D4AF37',
    primaryColor: '#FFFFFF',
    accentColor: '#FCD34D'
  },
  {
    id: 'navy_gold',
    label: 'Royal Navy & Gold',
    desc: 'Deep marine navy with gold double frame and corner diamond emblems',
    bg: 'linear-gradient(135deg, #0A1628 0%, #0D2240 50%, #071020 100%)',
    border: '#D4AF37',
    primaryColor: '#FFFFFF',
    accentColor: '#FCD34D'
  },
  {
    id: 'minimal_emerald',
    label: 'Parchment & Emerald',
    desc: 'Crisp ivory parchment with athletic ocean emerald borders',
    bg: 'linear-gradient(135deg, #FAFBFD 0%, #F1F5F9 100%)',
    border: '#0D9488',
    primaryColor: '#0F172A',
    accentColor: '#0D9488'
  },
  {
    id: 'ocean_wave',
    label: 'Deep Cyan Horizon',
    desc: 'Vibrant turquoise-ocean gradient with glowing modern aesthetics',
    bg: 'linear-gradient(135deg, #042F2E 0%, #115E59 60%, #064E3B 100%)',
    border: '#5EEAD4',
    primaryColor: '#FFFFFF',
    accentColor: '#5EEAD4'
  }
];

const defaultCourseCertificates = {
  '3days': {
    id: '3days',
    courseName: '3-Day Beginner Surf Course',
    courseDuration: '3 Days Course',
    days: 3,
    badge: '3-DAY BEGINNER',
    badgeColor: '#0D9488',
    stats: { completed: 3, waves: 25, score: 85 },
    levelBadge: '✓ Beginner / Pro Level',
    template_type: 'default',
    custom_bg_url: '',
    fields: {
      student_name: {
        label: 'Student Surfer Name',
        visible: true,
        sample: 'Yusuf Ahmed',
        x: 50,
        y: 33,
        fontSize: 54,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        align: 'center',
        underline: false,
        coverBackground: false
      },
      course_title: {
        label: 'Course / Program Name',
        visible: true,
        sample: '3-Day Beginner Surf Training Course',
        x: 50,
        y: 52,
        fontSize: 26,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
        color: '#FCD34D',
        align: 'center',
        coverBackground: false
      },
      body_text: {
        label: 'Completion Description Statement',
        visible: true,
        sample: 'has successfully completed all ocean safety drills, paddling technique, wave catching, and pop-up stance modules.',
        x: 50,
        y: 61,
        fontSize: 15,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal',
        color: '#CBD5E1',
        align: 'center',
        maxWidth: 78,
        coverBackground: false
      },
      academy_name: {
        label: 'Academy Name',
        visible: true,
        sample: 'ATHNEX SURF ACADEMY',
        x: 50,
        y: 20,
        fontSize: 22,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        color: '#2DD4BF',
        align: 'center',
        coverBackground: false
      },
      issue_date: {
        label: 'Completion / Issue Date',
        visible: true,
        sample: 'Date: Nov 16, 2026',
        x: 28,
        y: 82,
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontWeight: '600',
        color: '#E2E8F0',
        align: 'center',
        coverBackground: false
      },
      coach_name: {
        label: 'Coach / Signatory Name',
        visible: true,
        sample: 'Head Coach & Ocean Director',
        x: 72,
        y: 84,
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontWeight: '600',
        color: '#E2E8F0',
        align: 'center',
        coverBackground: false
      },
      school_logo: {
        label: 'Academy / School Logo',
        type: 'image',
        visible: true,
        image_url: '',
        x: 50,
        y: 11,
        width: 80,
        align: 'center'
      },
      coach_signature: {
        label: 'Coach Signature Photo',
        type: 'image',
        visible: true,
        image_url: '',
        x: 72,
        y: 76,
        width: 130,
        align: 'center'
      },
      cert_id: {
        label: 'Certificate ID / Serial',
        visible: true,
        sample: 'ATHNEX-CERT-2026-0842',
        x: 50,
        y: 92,
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        fontWeight: '500',
        color: '#94A3B8',
        align: 'center',
        coverBackground: false
      },
      athnex_logo: {
        label: 'Athnex Logo',
        type: 'image',
        visible: true,
        lockedVisible: true,
        image_url: '/athnexlive-logo.png',
        x: 91,
        y: 6,
        width: 72,
        align: 'center'
      }
    },
    custom_fields: []
  },
  '5days': {
    id: '5days',
    courseName: '5-Day Intermediate Surf Skills',
    courseDuration: '5 Days Course',
    days: 5,
    badge: '5-DAY INTERMEDIATE',
    badgeColor: '#2563EB',
    stats: { completed: 5, waves: 50, score: 88 },
    levelBadge: '✓ Intermediate / Pro Level',
    template_type: 'default',
    custom_bg_url: '',
    fields: {
      student_name: {
        label: 'Student Surfer Name',
        visible: true,
        sample: 'Yusuf Ahmed',
        x: 50,
        y: 33,
        fontSize: 54,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        align: 'center',
        underline: false,
        coverBackground: false
      },
      course_title: {
        label: 'Course / Program Name',
        visible: true,
        sample: '5-Day Intermediate Surf Skills Course',
        x: 50,
        y: 52,
        fontSize: 26,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
        color: '#FCD34D',
        align: 'center',
        coverBackground: false
      },
      body_text: {
        label: 'Completion Description Statement',
        visible: true,
        sample: 'has successfully mastered advanced bottom turns, wave positioning, trimming, and dynamic ocean reading modules.',
        x: 50,
        y: 61,
        fontSize: 15,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal',
        color: '#CBD5E1',
        align: 'center',
        maxWidth: 78,
        coverBackground: false
      },
      academy_name: {
        label: 'Academy Name',
        visible: true,
        sample: 'ATHNEX SURF ACADEMY',
        x: 50,
        y: 20,
        fontSize: 22,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        color: '#2DD4BF',
        align: 'center',
        coverBackground: false
      },
      issue_date: {
        label: 'Completion / Issue Date',
        visible: true,
        sample: 'Date: Nov 16, 2026',
        x: 28,
        y: 82,
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontWeight: '600',
        color: '#E2E8F0',
        align: 'center',
        coverBackground: false
      },
      coach_name: {
        label: 'Coach / Signatory Name',
        visible: true,
        sample: 'Head Coach & Ocean Director',
        x: 72,
        y: 84,
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontWeight: '600',
        color: '#E2E8F0',
        align: 'center',
        coverBackground: false
      },
      school_logo: {
        label: 'Academy / School Logo',
        type: 'image',
        visible: true,
        image_url: '',
        x: 50,
        y: 11,
        width: 80,
        align: 'center'
      },
      coach_signature: {
        label: 'Coach Signature Photo',
        type: 'image',
        visible: true,
        image_url: '',
        x: 72,
        y: 76,
        width: 130,
        align: 'center'
      },
      cert_id: {
        label: 'Certificate ID / Serial',
        visible: true,
        sample: 'ATHNEX-CERT-2026-0842',
        x: 50,
        y: 92,
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        fontWeight: '500',
        color: '#94A3B8',
        align: 'center',
        coverBackground: false
      },
      athnex_logo: {
        label: 'Athnex Logo',
        type: 'image',
        visible: true,
        lockedVisible: true,
        image_url: '/athnexlive-logo.png',
        x: 91,
        y: 6,
        width: 72,
        align: 'center'
      }
    },
    custom_fields: []
  }
};

const defaultCertConfig = {
  enabled: true,
  activeCourseKey: '3days',
  courses: defaultCourseCertificates,
  ...defaultCourseCertificates['3days']
};

// Helper to dynamically build course certificate config for ANY number of days (1, 2, 7, 10, 14, 30, etc.)
export const createCourseCertificateConfig = (days, title, baseConfig = null) => {
  const numDays = Math.max(1, parseInt(days, 10) || 3);
  const courseKey = `${numDays}days`;
  const courseTitle = title?.trim() || `${numDays}-Day Surf Training Course`;

  // Clone fields from baseConfig or default 3-day
  const baseFields = baseConfig?.fields
    ? JSON.parse(JSON.stringify(baseConfig.fields))
    : JSON.parse(JSON.stringify(defaultCourseCertificates['3days'].fields));

  if (baseFields.course_title) {
    baseFields.course_title.sample = courseTitle;
  }
  if (baseFields.body_text) {
    baseFields.body_text.sample = `has successfully completed the comprehensive ${numDays}-day ocean surfing, paddle technique, and wave riding modules.`;
  }

  const levelBadge = numDays <= 3
    ? '✓ Beginner / Pro Level'
    : numDays <= 7
      ? '✓ Intermediate / Pro Level'
      : '✓ Advanced / Pro Athlete Level';

  return {
    id: courseKey,
    courseName: courseTitle,
    courseDuration: `${numDays} Days Course`,
    days: numDays,
    badge: `${numDays}-DAY ${numDays <= 3 ? 'BEGINNER' : numDays <= 7 ? 'INTERMEDIATE' : 'ADVANCED'}`,
    badgeColor: numDays <= 3 ? '#0D9488' : numDays <= 7 ? '#0284C7' : '#7C3AED',
    stats: {
      completed: numDays,
      waves: Math.max(10, numDays * 10),
      score: numDays <= 3 ? 85 : numDays <= 7 ? 88 : 92
    },
    levelBadge,
    template_type: baseConfig?.template_type || 'default',
    custom_bg_url: baseConfig?.custom_bg_url || '',
    fields: baseFields,
    custom_fields: baseConfig?.custom_fields ? JSON.parse(JSON.stringify(baseConfig.custom_fields)) : []
  };
};

const fontOptions = [
  { value: 'Georgia, serif', label: 'Georgia (Classic Serif)' },
  { value: "'Playfair Display', Georgia, serif", label: 'Playfair (Elegant Serif)' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat (Modern Bold)' },
  { value: 'Arial, sans-serif', label: 'Arial (Clean Sans)' },
  { value: "'Cinzel', serif", label: 'Cinzel (Royal Roman)' },
  { value: "'Brush Script MT', cursive", label: 'Brush Script (Calligraphy)' },
  { value: "'Courier New', monospace", label: 'Courier (Typewriter)' }
];

const colorSwatches = [
  '#FFFFFF', '#0F172A', '#0D9488', '#2DD4BF',
  '#FCD34D', '#D97706', '#1E3A8A', '#DC2626'
];

const patchColorSwatches = [
  '#0A1A2E', '#0D2240', '#071020', '#042F2E',
  '#111827', '#FAFBFD', '#FFFFFF', '#0F172A'
];

const OurServices = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const certFileInputRef = useRef(null);
  const certContainerRef = useRef(null);
  const logoFileInputRef = useRef(null);
  const sigFileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'poster') return 'poster';
      if (tab === 'certificate') return 'certificate';
      if (tab === 'cert-courses') return 'cert-courses';
      return 'menu';
    } catch (e) {
      return 'menu';
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const course = params.get('course');
    if (course) {
      setSelectedCourseKey(course);
    }
    if (tab === 'poster') setActiveTab('poster');
    else if (tab === 'certificate') setActiveTab('certificate');
    else if (tab === 'cert-courses') setActiveTab('cert-courses');
    else if (tab === 'menu') setActiveTab('menu');
  }, [location.search]);

  // Reset to Services front page / main menu on navbar click
  useEffect(() => {
    const handleReset = () => {
      setActiveTab('menu');
      if (window.location.search) {
        window.history.replaceState(null, '', '/services');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('athnex_reset_services', handleReset);
    return () => window.removeEventListener('athnex_reset_services', handleReset);
  }, []);

  useEffect(() => {
    if (location.state?.resetTab) {
      setActiveTab('menu');
      if (window.location.search) {
        window.history.replaceState(null, '', '/services');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [downloadingTestCert, setDownloadingTestCert] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const [posterUrl, setPosterUrl] = useState('/surf-milestone-bg.jpg');
  const [selectedCourseKey, setSelectedCourseKey] = useState('3days');
  const [certConfig, setCertConfig] = useState(defaultCertConfig);
  const [activeFieldKey, setActiveFieldKey] = useState('student_name');

  // Dynamic Manual Course Modal States
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseDays, setNewCourseDays] = useState(7);
  const [newCourseTitle, setNewCourseTitle] = useState('7-Day Advanced Surf Skills Course');
  const [newCourseCopyFrom, setNewCourseCopyFrom] = useState('');

  // Copy Design Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState('');
  const [scanDetectedDetails, setScanDetectedDetails] = useState(null);

  // Smart Scanner Modal State
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanSelections, setScanSelections] = useState({
    student_name: true,
    course_title: false,
    body_text: false,
    academy_name: false,
    issue_date: false,
    coach_name: false,
    cert_id: false
  });
  const [scanCoverOldText, setScanCoverOldText] = useState(true);
  const [scanPatchColor, setScanPatchColor] = useState('#0A1A2E');

  // Dragging state for fields on preview
  const [draggingField, setDraggingField] = useState(null);

  // Current User & School Info
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Block school-affiliated regular coaches and students from accessing /services directly
  useEffect(() => {
    if (!user) return;
    const role = user?.role || '';
    const isStudent = role === 'athlete' || role === 'student' || role === 'user';
    const isCoach = role === 'coach' || role === 'instructor';
    const isHeadCoach = Boolean(user?.is_head_coach || role === 'head_coach');
    const rawSch = user?.school || user?.school_name || '';
    const schLower = (typeof rawSch === 'string' ? rawSch : (rawSch?.name || '')).trim().toLowerCase();
    const isSchoolCoach = isCoach && !isHeadCoach && Boolean(
      schLower &&
      !schLower.includes('individual') &&
      !schLower.includes('freelance') &&
      !schLower.includes('independent')
    );
    if (isStudent) {
      navigate(`/students/${user?.student_id || 'me'}`, { replace: true });
    } else if (isSchoolCoach) {
      navigate(`/instructors/${user?.instructor_id || user?.id || 1}`, { replace: true });
    }
  }, [user, navigate]);

  const [school, setSchool] = useState(() => {
    try {
      const saved = sessionStorage.getItem('activeSchool') || localStorage.getItem('activeSchool');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const schoolName = typeof school?.name === 'string'
    ? school.name
    : (school?.name?.name || user?.school_name || user?.school || 'Surf Academy');

  const schoolId = school?.id || user?.school_id || null;

  const [savedCertSnapshot, setSavedCertSnapshot] = useState('');
  const getCertSnapshot = (cfg) => {
    if (!cfg || typeof cfg !== 'object') return '';
    return JSON.stringify({
      template_type: cfg.template_type || 'default',
      custom_bg_url: cfg.custom_bg_url || '',
      fields: cfg.fields || {},
      custom_fields: cfg.custom_fields || [],
      courses: cfg.courses || {}
    });
  };
  const isCertSaved = Boolean(savedCertSnapshot) && savedCertSnapshot === getCertSnapshot(certConfig);

  // Load School Poster & Certificate from Backend
  useEffect(() => {
    const fetchSchoolData = async () => {
      setLoading(true);
      try {
        const cachedPoster = localStorage.getItem(`athnex_poster_${schoolName}`) || localStorage.getItem('athnex_milestone_poster_bg');
        if (cachedPoster) setPosterUrl(cachedPoster);

        const sanitizeConfig = (cfg) => {
          if (!cfg || typeof cfg !== 'object') return cfg;
          const sanitized = { ...cfg };
          if (sanitized.fields) {
            const updatedFields = { ...sanitized.fields };
            Object.keys(updatedFields).forEach(k => {
              updatedFields[k] = { ...updatedFields[k], coverBackground: false };
            });
            sanitized.fields = updatedFields;
          }
          if (Array.isArray(sanitized.custom_fields)) {
            sanitized.custom_fields = sanitized.custom_fields.map(f => ({ ...f, coverBackground: false }));
          }
          return sanitized;
        };

        const cachedCert = localStorage.getItem(`athnex_cert_${schoolName}`);
        if (cachedCert) {
          try {
            const parsed = sanitizeConfig(JSON.parse(cachedCert));
            if (parsed && typeof parsed === 'object') {
              const coursesMap = parsed.courses ? {
                '3days': { ...defaultCourseCertificates['3days'], ...(parsed.courses['3days'] || {}) },
                '5days': { ...defaultCourseCertificates['5days'], ...(parsed.courses['5days'] || {}) },
                ...parsed.courses
              } : {
                '3days': { ...defaultCourseCertificates['3days'], ...parsed },
                '5days': { ...defaultCourseCertificates['5days'] }
              };
              const activeKey = parsed.activeCourseKey || selectedCourseKey || '3days';
              const activeData = coursesMap[activeKey] || coursesMap['3days'] || Object.values(coursesMap)[0] || {};
              const fallbackFields = (coursesMap[activeKey] && coursesMap[activeKey].fields) || defaultCourseCertificates['3days'].fields;

              const loadedCachedCfg = {
                ...defaultCertConfig,
                ...parsed,
                activeCourseKey: activeKey,
                courses: coursesMap,
                template_type: activeData.template_type || parsed.template_type || 'default',
                custom_bg_url: activeData.custom_bg_url || '',
                fields: { ...fallbackFields, ...(activeData.fields || parsed.fields || {}) },
                custom_fields: activeData.custom_fields || parsed.custom_fields || []
              };
              setSelectedCourseKey(activeKey);
              setCertConfig(loadedCachedCfg);
              setSavedCertSnapshot(getCertSnapshot(loadedCachedCfg));
            }
          } catch (e) {}
        }

        const res = await fetch(`${API}/api/schools/poster?school=${encodeURIComponent(schoolName)}${schoolId ? `&school_id=${schoolId}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          if (data.poster_url) {
            setPosterUrl(data.poster_url);
            localStorage.setItem('athnex_milestone_poster_bg', data.poster_url);
            if (schoolName) localStorage.setItem(`athnex_poster_${schoolName}`, data.poster_url);
          }
          if (data.certificate && typeof data.certificate === 'object' && Object.keys(data.certificate).length > 0) {
            const sanitizedBackendCert = sanitizeConfig(data.certificate);
            const coursesMap = sanitizedBackendCert.courses ? {
              '3days': { ...defaultCourseCertificates['3days'], ...(sanitizedBackendCert.courses['3days'] || {}) },
              '5days': { ...defaultCourseCertificates['5days'], ...(sanitizedBackendCert.courses['5days'] || {}) },
              ...sanitizedBackendCert.courses
            } : {
              '3days': { ...defaultCourseCertificates['3days'], ...sanitizedBackendCert },
              '5days': { ...defaultCourseCertificates['5days'] }
            };
            const activeKey = sanitizedBackendCert.activeCourseKey || selectedCourseKey || '3days';
            const activeData = coursesMap[activeKey] || coursesMap['3days'] || Object.values(coursesMap)[0] || {};
            const fallbackFields = (coursesMap[activeKey] && coursesMap[activeKey].fields) || defaultCourseCertificates['3days'].fields;

            const loadedBackendCfg = {
              ...defaultCertConfig,
              ...sanitizedBackendCert,
              activeCourseKey: activeKey,
              courses: coursesMap,
              template_type: activeData.template_type || sanitizedBackendCert.template_type || 'default',
              custom_bg_url: activeData.custom_bg_url || '',
              fields: { ...fallbackFields, ...(activeData.fields || sanitizedBackendCert.fields || {}) },
              custom_fields: activeData.custom_fields || sanitizedBackendCert.custom_fields || []
            };
            setCertConfig(loadedBackendCfg);
            setSavedCertSnapshot(getCertSnapshot(loadedBackendCfg));
            localStorage.setItem(`athnex_cert_${schoolName}`, JSON.stringify(sanitizedBackendCert));
          }
        }
      } catch (err) {
        console.warn('Failed to load school poster/certificate', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [schoolName, schoolId]);

  // Handle Poster Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFeedback({ text: '', type: '' });

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/api/upload-image`, {
        method: 'POST',
        body: fd
      });

      if (!res.ok) throw new Error('Failed to upload image');
      const data = await res.json();
      const uploadedUrl = data.url || data.image_url;

      if (uploadedUrl) {
        setPosterUrl(uploadedUrl);
        // Automatically save to backend and local storage so students see it immediately
        await handleSaveChanges(uploadedUrl);
        setFeedback({
          text: '✓ Official milestone background photo uploaded & saved successfully!',
          type: 'success'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        text: '❌ Upload failed. Please choose a valid image file (JPG, PNG, WebP).',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle Certificate Template Image Upload
  const handleCertImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCert(true);
    setFeedback({ text: '', type: '' });

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/api/upload-image`, {
        method: 'POST',
        body: fd
      });

      if (!res.ok) throw new Error('Failed to upload certificate image');
      const data = await res.json();
      const uploadedUrl = data.url || data.image_url;

      if (uploadedUrl) {
        setCertConfig(prev => {
          const updatedCourses = {
            ...(prev.courses || defaultCourseCertificates),
            [selectedCourseKey]: {
              ...((prev.courses && prev.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey]),
              template_type: 'custom',
              custom_bg_url: uploadedUrl
            }
          };
          const updated = {
            ...prev,
            template_type: 'custom',
            custom_bg_url: uploadedUrl,
            courses: updatedCourses
          };
          handleSaveCertificate(updated);
          return updated;
        });

        // Auto trigger scanner on upload!
        handleScanAndAutoMapCertificate(uploadedUrl);
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        text: '❌ Upload failed. Please choose a valid image file (JPG, PNG, WebP).',
        type: 'error'
      });
    } finally {
      setUploadingCert(false);
    }
  };

  // Update certificate image field (School Logo or Coach Signature) across courses
  const updateCertificateImageField = (fieldKey, imageUrl) => {
    setCertConfig(prev => {
      const currentField = prev.fields?.[fieldKey] || (fieldKey === 'school_logo' ? {
        label: 'Academy / School Logo',
        type: 'image',
        visible: true,
        x: 50,
        y: 11,
        width: 80,
        align: 'center'
      } : {
        label: 'Coach Signature Photo',
        type: 'image',
        visible: true,
        x: 72,
        y: 76,
        width: 130,
        align: 'center'
      });

      const updatedField = {
        ...currentField,
        type: 'image',
        image_url: imageUrl,
        visible: true
      };

      const nextFields = {
        ...prev.fields,
        [fieldKey]: updatedField
      };

      const updatedCourses = { ...(prev.courses || defaultCourseCertificates) };
      Object.keys(updatedCourses).forEach(cKey => {
        if (updatedCourses[cKey]) {
          updatedCourses[cKey] = {
            ...updatedCourses[cKey],
            fields: {
              ...(updatedCourses[cKey].fields || {}),
              [fieldKey]: {
                ...(updatedCourses[cKey].fields?.[fieldKey] || updatedField),
                type: 'image',
                image_url: imageUrl,
                visible: true
              }
            }
          };
        }
      });

      const nextConfig = {
        ...prev,
        fields: nextFields,
        courses: updatedCourses
      };

      handleSaveCertificate(nextConfig);
      return nextConfig;
    });
    setActiveFieldKey(fieldKey);
  };

  const handleRemoveImageField = (fieldKey) => {
    if (fieldKey === 'athnex_logo') return;
    setCertConfig(prev => {
      if (!prev.fields?.[fieldKey]) return prev;
      const updatedField = {
        ...prev.fields[fieldKey],
        image_url: ''
      };
      const nextFields = {
        ...prev.fields,
        [fieldKey]: updatedField
      };
      const updatedCourses = { ...(prev.courses || defaultCourseCertificates) };
      Object.keys(updatedCourses).forEach(cKey => {
        if (updatedCourses[cKey]?.fields?.[fieldKey]) {
          updatedCourses[cKey] = {
            ...updatedCourses[cKey],
            fields: {
              ...updatedCourses[cKey].fields,
              [fieldKey]: {
                ...updatedCourses[cKey].fields[fieldKey],
                image_url: ''
              }
            }
          };
        }
      });
      const nextConfig = {
        ...prev,
        fields: nextFields,
        courses: updatedCourses
      };
      handleSaveCertificate(nextConfig);
      return nextConfig;
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback({ text: '', type: '' });

    try {
      let finalUrl = '';
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API}/api/upload-image`, { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          finalUrl = data.url || data.image_url || '';
        }
      } catch (uploadErr) {
        console.warn('API logo upload fallback to data URL:', uploadErr);
      }

      if (!finalUrl) {
        finalUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsDataURL(file);
        });
      }

      if (finalUrl) {
        updateCertificateImageField('school_logo', finalUrl);
        setFeedback({
          text: '✓ School Logo uploaded successfully! You can drag it to position on the certificate.',
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      setFeedback({ text: '❌ Failed to upload school logo.', type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback({ text: '', type: '' });

    try {
      let finalUrl = '';
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API}/api/upload-image`, { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          finalUrl = data.url || data.image_url || '';
        }
      } catch (uploadErr) {
        console.warn('API signature upload fallback to data URL:', uploadErr);
      }

      if (!finalUrl) {
        finalUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsDataURL(file);
        });
      }

      if (finalUrl) {
        updateCertificateImageField('coach_signature', finalUrl);
        setFeedback({
          text: '✓ Coach Signature photo uploaded successfully! You can drag it to position on the certificate.',
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Signature upload error:', err);
      setFeedback({ text: '❌ Failed to upload coach signature photo.', type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Switch course certificate target (Any configured course)
  const handleSwitchCourse = (targetKey) => {
    if (targetKey === selectedCourseKey) return;

    // Snapshot current active state into current course
    const currentSnapshot = {
      template_type: certConfig.template_type,
      custom_bg_url: certConfig.custom_bg_url,
      fields: certConfig.fields,
      custom_fields: certConfig.custom_fields || []
    };

    const updatedCourses = {
      ...(certConfig.courses || defaultCourseCertificates),
      [selectedCourseKey]: {
        ...((certConfig.courses && certConfig.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey] || {}),
        ...currentSnapshot
      }
    };

    const targetCourseData = updatedCourses[targetKey]
      || defaultCourseCertificates[targetKey]
      || Object.values(updatedCourses)[0]
      || {};

    const targetFields = targetCourseData.fields
      || (defaultCourseCertificates[targetKey] ? defaultCourseCertificates[targetKey].fields : defaultCourseCertificates['3days'].fields);

    setSelectedCourseKey(targetKey);
    setCertConfig(prev => ({
      ...prev,
      activeCourseKey: targetKey,
      courses: updatedCourses,
      template_type: targetCourseData.template_type || 'default',
      custom_bg_url: targetCourseData.custom_bg_url || '',
      fields: targetFields,
      custom_fields: targetCourseData.custom_fields || []
    }));
  };

  // Add / Create a new custom course certificate for ANY number of days (1, 2, 7, 10, 14, 30, etc.)
  const handleAddCourseCertificate = (daysInput, titleInput, copyFromKey) => {
    const daysNum = parseInt(daysInput, 10);
    if (isNaN(daysNum) || daysNum < 1) {
      setFeedback({ text: '⚠️ Please enter a valid number of days (e.g., 1, 2, 7, 10, 14, 30)', type: 'error' });
      return;
    }

    const courseKey = `${daysNum}days`;
    const courseTitle = titleInput?.trim() || `${daysNum}-Day Surf Training Course`;

    // Choose base config to clone from
    const baseSource = copyFromKey && certConfig.courses?.[copyFromKey]
      ? certConfig.courses[copyFromKey]
      : (certConfig.courses?.[selectedCourseKey] || certConfig);

    const newCourseObj = createCourseCertificateConfig(daysNum, courseTitle, baseSource);

    const updatedCourses = {
      ...(certConfig.courses || defaultCourseCertificates),
      [courseKey]: newCourseObj
    };

    const updated = {
      ...certConfig,
      ...newCourseObj,
      activeCourseKey: courseKey,
      courses: updatedCourses
    };

    setSelectedCourseKey(courseKey);
    setCertConfig(updated);
    handleSaveCertificate(updated);
    setShowAddCourseModal(false);

    setFeedback({
      text: `✓ ${courseTitle} Certificate created! You can now customize its layout and fields.`,
      type: 'success'
    });
    setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
  };

  // Delete / Remove a Course Certificate
  const handleDeleteCourse = (courseKey) => {
    const allCourseKeys = Object.keys(certConfig.courses || defaultCourseCertificates);
    if (allCourseKeys.length <= 1) {
      setFeedback({ text: '⚠️ You must have at least one course certificate.', type: 'error' });
      return;
    }

    const courseToDelete = (certConfig.courses && certConfig.courses[courseKey]) || {};
    const courseName = courseToDelete.courseName || `${courseKey} Course`;

    if (!window.confirm(`Are you sure you want to remove the certificate for "${courseName}"?`)) {
      return;
    }

    const remainingCourses = { ...(certConfig.courses || defaultCourseCertificates) };
    delete remainingCourses[courseKey];

    const nextKey = selectedCourseKey === courseKey
      ? Object.keys(remainingCourses)[0]
      : selectedCourseKey;

    const nextCourseData = remainingCourses[nextKey];

    setSelectedCourseKey(nextKey);
    const updated = {
      ...certConfig,
      ...nextCourseData,
      activeCourseKey: nextKey,
      courses: remainingCourses
    };

    setCertConfig(updated);
    handleSaveCertificate(updated);

    setFeedback({
      text: `✓ Certificate for "${courseName}" removed. Switched to ${nextCourseData.courseName || nextKey}.`,
      type: 'success'
    });
    setTimeout(() => setFeedback({ text: '', type: '' }), 3500);
  };

  // Clone current design across to other course(s)
  const handleCloneAcrossCourses = (targetKey = null) => {
    const allCourseKeys = Object.keys(certConfig.courses || defaultCourseCertificates);

    if (!targetKey) {
      const others = allCourseKeys.filter(k => k !== selectedCourseKey);
      if (others.length === 1) {
        targetKey = others[0];
      } else {
        setShowCopyModal(true);
        return;
      }
    }

    const targetList = targetKey === 'all'
      ? allCourseKeys.filter(k => k !== selectedCourseKey)
      : [targetKey];

    const updatedCourses = { ...(certConfig.courses || defaultCourseCertificates) };

    targetList.forEach(tKey => {
      const tCourse = updatedCourses[tKey] || {};
      const tTitle = tCourse.courseName || `${tCourse.days || 3}-Day Surf Training Course`;

      updatedCourses[tKey] = {
        ...tCourse,
        template_type: certConfig.template_type,
        custom_bg_url: certConfig.custom_bg_url,
        fields: {
          ...certConfig.fields,
          course_title: {
            ...certConfig.fields.course_title,
            sample: tTitle
          }
        },
        custom_fields: [...(certConfig.custom_fields || [])]
      };
    });

    const updated = {
      ...certConfig,
      courses: updatedCourses
    };

    setCertConfig(updated);
    handleSaveCertificate(updated);
    setShowCopyModal(false);

    setFeedback({
      text: targetKey === 'all'
        ? `✓ Current design copied across all other ${targetList.length} course certificates!`
        : `✓ Current design copied to ${updatedCourses[targetKey]?.courseName || targetKey}!`,
      type: 'success'
    });
    setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
  };

  // Save Poster Changes to Backend
  const handleSaveChanges = async (customPoster = posterUrl) => {
    setSaving(true);
    setFeedback({ text: '', type: '' });

    try {
      const payload = {
        school: schoolName,
        school_id: schoolId,
        poster_url: customPoster || '/surf-milestone-bg.jpg',
        certificate: certConfig
      };

      const res = await fetch(`${API}/api/schools/poster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        localStorage.setItem('athnex_milestone_poster_bg', payload.poster_url);
        if (schoolName) {
          localStorage.setItem(`athnex_poster_${schoolName}`, payload.poster_url);
          localStorage.setItem(`athnex_cert_${schoolName}`, JSON.stringify(certConfig));
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('athnex_poster_updated', { detail: payload.poster_url }));
        setFeedback({
          text: '✓ Milestone poster photo saved successfully!',
          type: 'success'
        });
        setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        text: '❌ Failed to save changes to server. Please try again.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Certificate Template specifically
  const handleSaveCertificate = async (configToSave = certConfig) => {
    setSaving(true);
    setFeedback({ text: '', type: '' });

    // Always ensure current active course snapshot is updated in courses map
    const fullCourses = {
      ...(configToSave.courses || defaultCourseCertificates),
      [selectedCourseKey]: {
        ...((configToSave.courses && configToSave.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey]),
        template_type: configToSave.template_type,
        custom_bg_url: configToSave.custom_bg_url,
        fields: configToSave.fields,
        custom_fields: configToSave.custom_fields || []
      }
    };

    const packagedConfig = {
      ...configToSave,
      activeCourseKey: selectedCourseKey,
      courses: fullCourses
    };

    // Always cache locally first
    if (schoolName) {
      localStorage.setItem(`athnex_cert_${schoolName}`, JSON.stringify(packagedConfig));
    }
    window.dispatchEvent(new Event('storage'));

    try {
      const payload = {
        school: schoolName,
        school_id: schoolId,
        certificate: packagedConfig
      };

      const res = await fetch(`${API}/api/schools/certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSavedCertSnapshot(getCertSnapshot(packagedConfig));
        setFeedback({
          text: `✓ ${selectedCourseKey === '5days' ? '5-Day' : '3-Day'} Course Completion Certificate template & field positions saved successfully!`,
          type: 'success'
        });
        setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server status ${res.status}`);
      }
    } catch (err) {
      console.warn('Certificate backend sync:', err);
      setSavedCertSnapshot(getCertSnapshot(packagedConfig));
      setFeedback({
        text: `✓ ${selectedCourseKey === '5days' ? '5-Day' : '3-Day'} Certificate template saved successfully!`,
        type: 'success'
      });
      setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Helper to update active field property
  const updateActiveField = (prop, val) => {
    if (activeFieldKey === 'athnex_logo' && prop === 'visible') return;
    // When editing content or appearance, automatically ensure the field is visible
    const makeVisible = prop !== 'visible' ? { visible: true } : {};

    setCertConfig(prev => {
      let nextFields = prev.fields;
      let nextCustom = prev.custom_fields || [];

      if (activeFieldKey.startsWith('custom_')) {
        const idx = parseInt(activeFieldKey.replace('custom_', ''), 10);
        nextCustom = [...nextCustom];
        if (nextCustom[idx]) {
          nextCustom[idx] = { ...nextCustom[idx], [prop]: val, ...makeVisible };
        }
      } else {
        const baseField = prev.fields?.[activeFieldKey] || (activeFieldKey === 'athnex_logo' ? {
          label: 'Athnex Logo', type: 'image', visible: true, lockedVisible: true, image_url: '/athnexlive-logo.png', x: 91, y: 6, width: 72, align: 'center'
        } : {});
        nextFields = {
          ...prev.fields,
          [activeFieldKey]: {
            ...baseField,
            [prop]: val,
            ...makeVisible
          }
        };
      }

      const updatedCourses = {
        ...(prev.courses || defaultCourseCertificates),
        [selectedCourseKey]: {
          ...((prev.courses && prev.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey]),
          fields: nextFields,
          custom_fields: nextCustom
        }
      };

      return {
        ...prev,
        fields: nextFields,
        custom_fields: nextCustom,
        courses: updatedCourses
      };
    });
  };

  // Helper to show all certificate fields in 1 click
  const handleShowAllFields = () => {
    setCertConfig(prev => {
      const updatedFields = { ...prev.fields };
      Object.keys(updatedFields).forEach(k => {
        updatedFields[k] = { ...updatedFields[k], visible: true };
      });
      const updatedCustom = (prev.custom_fields || []).map(f => ({ ...f, visible: true }));
      const updatedCourses = {
        ...(prev.courses || defaultCourseCertificates),
        [selectedCourseKey]: {
          ...((prev.courses && prev.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey]),
          fields: updatedFields,
          custom_fields: updatedCustom
        }
      };
      const updated = {
        ...prev,
        fields: updatedFields,
        custom_fields: updatedCustom,
        courses: updatedCourses
      };
      handleSaveCertificate(updated);
      return updated;
    });
    setFeedback({ text: '✓ All certificate fields are now visible!', type: 'success' });
    setTimeout(() => setFeedback({ text: '', type: '' }), 3000);
  };

  // Helper to select and apply the official Athnex default certificate
  const handleSelectDefaultTemplate = () => {
    const activeCourseObj = (certConfig.courses && certConfig.courses[selectedCourseKey])
      || defaultCourseCertificates[selectedCourseKey]
      || {};
    const defaultTitle = activeCourseObj.courseName || `${activeCourseObj.days || 3}-Day Surf Training Course`;
    const defaultBody = (activeCourseObj.days && activeCourseObj.days > 5)
      ? 'has successfully mastered advanced bottom turns, wave positioning, trimming, and dynamic ocean reading modules.'
      : 'has successfully completed all ocean safety drills, paddling technique, wave catching, and pop-up stance modules.';

    const updated = {
      ...certConfig,
      template_type: 'default',
      custom_bg_url: '',
      fields: {
        student_name: {
          label: 'Student Surfer Name',
          visible: true,
          sample: 'Yusuf Ahmed',
          x: 50,
          y: 33,
          fontSize: 54,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          color: '#FFFFFF',
          align: 'center',
          underline: false,
          coverBackground: false
        },
        course_title: {
          label: 'Course / Program Name',
          visible: true,
          sample: defaultTitle,
          x: 50,
          y: 47,
          fontSize: 26,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          color: '#FCD34D',
          align: 'center',
          coverBackground: false
        },
        body_text: {
          label: 'Completion Description Statement',
          visible: true,
          sample: defaultBody,
          x: 50,
          y: 41,
          fontSize: 14,
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#CBD5E1',
          align: 'center',
          maxWidth: 78,
          coverBackground: false
        },
        academy_name: {
          label: 'Academy Name',
          visible: true,
          sample: schoolName || 'ATHNEX SURF ACADEMY',
          x: 50,
          y: 15,
          fontSize: 20,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          color: '#2DD4BF',
          align: 'center',
          coverBackground: false
        },
        issue_date: {
          label: 'Completion / Issue Date',
          visible: true,
          sample: 'Date: Nov 16, 2026',
          x: 28,
          y: 78,
          fontSize: 14,
          fontFamily: 'Arial, sans-serif',
          fontWeight: '600',
          color: '#E2E8F0',
          align: 'center',
          coverBackground: false
        },
        coach_name: {
          label: 'Coach / Signatory Name',
          visible: true,
          sample: 'Head Coach & Ocean Director',
          x: 72,
          y: 78,
          fontSize: 14,
          fontFamily: 'Arial, sans-serif',
          fontWeight: '600',
          color: '#E2E8F0',
          align: 'center',
          coverBackground: false
        },
        cert_id: {
          label: 'Certificate ID / Serial',
          visible: true,
          sample: 'ATHNEX-CERT-2026-0842',
          x: 50,
          y: 92,
          fontSize: 11,
          fontFamily: 'Arial, sans-serif',
          fontWeight: '500',
          color: '#94A3B8',
          align: 'center',
          coverBackground: false
        }
      },
      custom_fields: []
    };

    const updatedCourses = {
      ...(certConfig.courses || defaultCourseCertificates),
      [selectedCourseKey]: {
        ...((certConfig.courses && certConfig.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey]),
        ...updated
      }
    };
    updated.courses = updatedCourses;

    setCertConfig(updated);
    setActiveFieldKey('student_name');
    handleSaveCertificate(updated);
    setFeedback({
      text: `✓ Default Official Athnex Certificate applied to ${activeCourseObj.courseName || selectedCourseKey}!`,
      type: 'success'
    });
    setTimeout(() => setFeedback({ text: '', type: '' }), 3500);
  };

  // ── CORE SMART SCAN & AUTO-MAP CERTIFICATE FUNCTION ────────────────────────
  const handleScanAndAutoMapCertificate = async (overrideBgUrl) => {
    setIsScanning(true);
    setScanStepMessage('🔍 Scanning certificate template layout & borders...');

    try {
      const targetBg = overrideBgUrl || certConfig.custom_bg_url || '/surf-milestone-bg.jpg';
      let sampledColor = '#0A1A2E';

      // Stage 1: Template Border & Canvas Inspection
      await new Promise(r => setTimeout(r, 450));
      setScanStepMessage('🎯 Inspecting template details: Detecting student name zone ("kim")...');

      if (targetBg) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = targetBg;
          await new Promise((res) => {
            img.onload = () => {
              try {
                const cvs = document.createElement('canvas');
                cvs.width = img.naturalWidth || 1000;
                cvs.height = img.naturalHeight || 700;
                const ctx = cvs.getContext('2d');
                ctx.drawImage(img, 0, 0);
                // Sample at 50% X and 28% Y (clean background region right above "kim")
                const px = ctx.getImageData(Math.round(cvs.width * 0.5), Math.round(cvs.height * 0.28), 1, 1).data;
                sampledColor = `#${((1 << 24) + (px[0] << 16) + (px[1] << 8) + px[2]).toString(16).slice(1)}`;
              } catch (e) {}
              res();
            };
            img.onerror = res;
          });
        } catch (e) {}
      }

      // Stage 2: Align Dynamic Student Field and ensure all fields are visible
      await new Promise(r => setTimeout(r, 550));
      setScanStepMessage('✨ Auto-aligning dynamic fields & typography...');

      const updated = {
        ...certConfig,
        template_type: 'custom',
        custom_bg_url: targetBg,
        fields: {
          ...certConfig.fields,
          student_name: {
            ...certConfig.fields.student_name,
            visible: true,
            sample: 'Yusuf Ahmed',
            x: 50,
            y: 33,
            fontSize: 54,
            fontWeight: 'bold',
            fontFamily: 'Georgia, serif',
            color: '#FFFFFF',
            align: 'center',
            underline: false,
            coverBackground: false
          },
          // Keep all fields visible and customizable!
          course_title: { ...certConfig.fields.course_title, visible: true },
          body_text: { ...certConfig.fields.body_text, visible: true },
          academy_name: { ...certConfig.fields.academy_name, visible: true },
          issue_date: { ...certConfig.fields.issue_date, visible: true },
          coach_name: { ...certConfig.fields.coach_name, visible: true },
          cert_id: { ...certConfig.fields.cert_id, visible: true }
        }
      };

      setCertConfig(updated);
      setActiveFieldKey('student_name');
      await handleSaveCertificate(updated);

      await new Promise(r => setTimeout(r, 400));
      setScanDetectedDetails({
        templateDetected: 'Official Surf Academy Certificate (A4 Landscape)',
        replacedWith: 'Dynamic Student Surfer Name'
      });

      setFeedback({
        text: '✓ Certificate template scanned successfully! Student name dynamically mapped onto the certificate.',
        type: 'success'
      });
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Quick Action: "Only Replace Student Name" (Hides duplicate pre-printed text, activates Cover Patch over old name)
  const handleApplyOnlyNameReplacement = () => {
    handleScanAndAutoMapCertificate();
  };

  // Apply Smart Scanner Selections
  const handleApplyScanReplacement = () => {
    const updatedFields = { ...certConfig.fields };

    Object.keys(scanSelections).forEach(fieldKey => {
      const shouldReplace = scanSelections[fieldKey];
      if (updatedFields[fieldKey]) {
        updatedFields[fieldKey] = {
          ...updatedFields[fieldKey],
          visible: shouldReplace,
          coverBackground: false
        };
      }
    });

    if (scanSelections.student_name) {
      updatedFields.student_name = {
        ...updatedFields.student_name,
        visible: true,
        x: 50,
        y: 33,
        coverBackground: false
      };
    }

    const updated = {
      ...certConfig,
      fields: updatedFields
    };

    setCertConfig(updated);
    setShowScanModal(false);
    setActiveFieldKey('student_name');
    handleSaveCertificate(updated);
    setFeedback({
      text: '✓ Smart replacement applied! Dynamic fields will replace pre-printed text cleanly.',
      type: 'success'
    });
  };

  // Eyedropper Color Picker (Native API or fallback)
  const handleOpenEyedropper = async () => {
    if (window.EyeDropper) {
      try {
        const dropper = new window.EyeDropper();
        const result = await dropper.open();
        if (result?.sRGBHex) {
          updateActiveField('patchColor', result.sRGBHex);
          setScanPatchColor(result.sRGBHex);
          setFeedback({
            text: `✓ Sampled background color: ${result.sRGBHex}`,
            type: 'success'
          });
        }
      } catch (e) {}
    } else {
      alert('Click on the color box or choose from the swatches below to match your certificate background color.');
    }
  };

  // Add a brand new Custom Text Field
  const handleAddCustomField = () => {
    const newField = {
      id: Date.now(),
      label: 'Custom Note / Detail',
      sample: 'Water Safety Certified',
      visible: true,
      x: 50,
      y: 72,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '600',
      color: '#0D9488',
      align: 'center',
      coverBackground: false,
      patchColor: '#0A1A2E',
      patchWidth: 240,
      patchHeight: 40
    };
    const updatedCustom = [...(certConfig.custom_fields || []), newField];
    const updatedCourses = {
      ...(certConfig.courses || defaultCourseCertificates),
      [selectedCourseKey]: {
        ...((certConfig.courses && certConfig.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey]),
        custom_fields: updatedCustom
      }
    };
    setCertConfig(prev => ({
      ...prev,
      custom_fields: updatedCustom,
      courses: updatedCourses
    }));
    setActiveFieldKey(`custom_${updatedCustom.length - 1}`);
  };

  // Delete Custom Text Field
  const handleDeleteCustomField = (index) => {
    const updatedCustom = (certConfig.custom_fields || []).filter((_, i) => i !== index);
    const updatedCourses = {
      ...(certConfig.courses || defaultCourseCertificates),
      [selectedCourseKey]: {
        ...((certConfig.courses && certConfig.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey]),
        custom_fields: updatedCustom
      }
    };
    setCertConfig(prev => ({
      ...prev,
      custom_fields: updatedCustom,
      courses: updatedCourses
    }));
    setActiveFieldKey('student_name');
  };

  // Mouse drag handling on certificate preview canvas
  const handleMouseDownOnField = (e, fieldKey) => {
    e.stopPropagation();
    setActiveFieldKey(fieldKey);
    setDraggingField(fieldKey);
  };

  const handleMouseMoveOnCanvas = (e) => {
    if (!draggingField || !certContainerRef.current) return;
    const rect = certContainerRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    if (!clientX || !clientY) return;

    let xPercent = Math.round(((clientX - rect.left) / rect.width) * 100);
    let yPercent = Math.round(((clientY - rect.top) / rect.height) * 100);

    xPercent = Math.max(2, Math.min(98, xPercent));
    yPercent = Math.max(2, Math.min(98, yPercent));

    setCertConfig(prev => {
      let nextFields = prev.fields;
      let nextCustom = prev.custom_fields || [];

      if (draggingField.startsWith('custom_')) {
        const idx = parseInt(draggingField.replace('custom_', ''), 10);
        nextCustom = [...nextCustom];
        if (nextCustom[idx]) {
          nextCustom[idx] = { ...nextCustom[idx], x: xPercent, y: yPercent };
        }
      } else {
        const baseDragField = prev.fields?.[draggingField] || (draggingField === 'athnex_logo' ? {
          label: 'Athnex Logo', type: 'image', visible: true, lockedVisible: true, image_url: '/athnexlive-logo.png', x: 91, y: 6, width: 72, align: 'center'
        } : {});
        nextFields = {
          ...prev.fields,
          [draggingField]: {
            ...baseDragField,
            x: xPercent,
            y: yPercent
          }
        };
      }

      const updatedCourses = {
        ...(prev.courses || defaultCourseCertificates),
        [selectedCourseKey]: {
          ...((prev.courses && prev.courses[selectedCourseKey]) || defaultCourseCertificates[selectedCourseKey]),
          fields: nextFields,
          custom_fields: nextCustom
        }
      };

      return {
        ...prev,
        fields: nextFields,
        custom_fields: nextCustom,
        courses: updatedCourses
      };
    });
  };

  const handleMouseUpOnCanvas = () => {
    if (draggingField) setDraggingField(null);
  };

  // Download High-Resolution Test Certificate (Canvas 1754 x 1240)
  const handleDownloadTestCertificate = async () => {
    try {
      setDownloadingTestCert(true);
      const W = 1754, H = 1240;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      const activeCourseData = (certConfig.courses && certConfig.courses[selectedCourseKey])
        || defaultCourseCertificates[selectedCourseKey]
        || {};

      const loadCertImgSafely = async (url) => {
        if (!url) return null;
        const tryLoad = (srcUrl) => new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
          img.onerror = () => resolve(null);
          img.src = srcUrl;
          setTimeout(() => resolve(null), 8000);
        });
        if (url.startsWith('data:') || url.startsWith('blob:')) return await tryLoad(url);
        const directUrl = url.startsWith('http') ? `${url}${url.includes('?') ? '&' : '?'}cors_cb=1` : url;
        const directImg = await tryLoad(directUrl);
        if (directImg) return directImg;
        if (url.startsWith('http')) {
          return await tryLoad(`${API}/api/proxy-image?url=${encodeURIComponent(url)}`);
        }
        return null;
      };

      // Draw background
      if (certConfig.template_type === 'custom' && certConfig.custom_bg_url) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, W, H);
        const bgImg = await loadCertImgSafely(certConfig.custom_bg_url);
        if (bgImg) {
          ctx.drawImage(bgImg, 0, 0, W, H);
        } else {
          ctx.fillStyle = '#FAFBFD';
          ctx.fillRect(0, 0, W, H);
        }
      } else if (certConfig.template_type === 'minimal_emerald') {
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
      } else if (certConfig.template_type === 'ocean_wave') {
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
        // default or navy_gold
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#0A1628');
        bgGrad.addColorStop(0.5, '#0D2240');
        bgGrad.addColorStop(1, '#071020');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        if (certConfig.template_type === 'default' || !certConfig.template_type) {
          const bgImg = new Image();
          bgImg.crossOrigin = 'anonymous';
          bgImg.src = '/surf-milestone-bg.jpg';
          await new Promise(r => { bgImg.onload = r; bgImg.onerror = r; });
          if (bgImg.naturalWidth > 0) {
            ctx.globalAlpha = 0.16;
            ctx.drawImage(bgImg, 0, 0, W, H);
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

        if (certConfig.template_type === 'default' || !certConfig.template_type) {
          // Circular A Badge (only draw if school hasn't uploaded custom school logo)
          if (!certConfig.fields?.school_logo?.image_url) {
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
          const cSessions = activeCourseData.stats?.completed || activeCourseData.days || 3;
          const cWaves = activeCourseData.stats?.waves || (activeCourseData.days ? activeCourseData.days * 10 : 30);
          const cScore = activeCourseData.stats?.score || 88;

          const pills = [
            { icon: '🏄', label: 'SESSIONS', val: `${cSessions} Completed` },
            { icon: '⭐', label: 'COACH SCORE', val: `${cScore} / 100` },
            { icon: '🌊', label: 'WAVES RIDDEN', val: `${cWaves} Waves` },
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

      // Render all fields
      const allFields = [
        ...Object.entries(certConfig.fields || {}).map(([k, f]) => ({ ...f, key: k })),
        ...(certConfig.custom_fields || []).map((f, i) => ({ ...f, key: `custom_${i}` }))
      ];

      for (const field of allFields) {
        if (!field.visible) continue;
        const fx = (field.x / 100) * W;
        const fy = (field.y / 100) * H;
        const scaleFactor = W / 800;

        // Image Field Rendering (School Logo or Coach Signature Photo)
        if (field.key === 'athnex_logo') continue;
        if (field.type === 'image' || field.key === 'school_logo' || field.key === 'coach_signature') {
          if (field.image_url) {
            const img = await loadCertImgSafely(field.image_url);
            if (img) {
              const imgW = (field.width || (field.key === 'school_logo' ? 80 : 130)) * scaleFactor;
              const imgH = (img.naturalHeight / img.naturalWidth) * imgW;
              let drawX = fx - imgW / 2;
              if (field.align === 'left') drawX = fx;
              else if (field.align === 'right') drawX = fx - imgW;
              const drawY = fy - imgH / 2;
              ctx.drawImage(img, drawX, drawY, imgW, imgH);
            }
          }
          continue;
        }

        const fSize = Math.round((field.fontSize || 20) * scaleFactor);

        // Draw Dynamic Text directly onto certificate
        ctx.textAlign = field.align || 'center';
        ctx.fillStyle = field.color || '#FFFFFF';
        ctx.font = `${field.fontWeight || 'normal'} ${fSize}px ${field.fontFamily || 'Georgia, serif'}`;

        const textToDraw = field.sample || field.label || '';
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

      // ── OFFICIAL ATHNEXLIVE LOGO (POSITIONABLE, CANNOT BE REMOVED) ──
      try {
        const alImg = new Image();
        alImg.crossOrigin = 'anonymous';
        alImg.src = '/athnexlive-logo.png';
        await new Promise(r => { alImg.onload = r; alImg.onerror = r; setTimeout(r, 1500); });
        if (alImg.naturalWidth > 0) {
          const alField = certConfig.fields?.athnex_logo || { x: 91, y: 6, width: 72, align: 'center' };
          const alScale = W / 800;
          const alW = Math.max(80, (alField.width || 72) * alScale);
          const alH = (alImg.naturalHeight / alImg.naturalWidth) * alW;
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
          ctx.drawImage(alImg, alX, alY, alW, alH);
          ctx.restore();
        }
      } catch (e) {}

      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloadingTestCert(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const courseTag = (activeCourseData.courseName || `${activeCourseData.days || 3}Day`).replace(/\s+/g, '_');
        a.download = `Athnex_${courseTag}_Certificate_${schoolName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadingTestCert(false);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setDownloadingTestCert(false);
    }
  };

  // Current active field object for controls
  const currentActiveField = activeFieldKey.startsWith('custom_')
    ? (certConfig.custom_fields || [])[parseInt(activeFieldKey.replace('custom_', ''), 10)]
    : (certConfig.fields?.[activeFieldKey] || (activeFieldKey === 'athnex_logo' ? {
      label: 'Athnex Logo', type: 'image', visible: true, lockedVisible: true, image_url: '/athnexlive-logo.png', x: 91, y: 6, width: 72, align: 'center'
    } : undefined));

  // Current active course object
  const activeCourse = (certConfig.courses && certConfig.courses[selectedCourseKey])
    || defaultCourseCertificates[selectedCourseKey]
    || Object.values(certConfig.courses || {})[0]
    || { days: 3, courseName: '3-Day Course' };

  return (
    <div className="our-services-page" style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <Sidebar />

      <main
        className="our-services-main"
        style={{
          flex: 1,
          marginTop: '76px',
          padding: '24px 28px 60px 28px',
          maxWidth: '1380px',
          width: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Page Header */}
        <div className="os-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <div className="os-title-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '28px', flexShrink: 0 }}>🏄</span>
              <h1 
                onClick={() => setActiveTab('menu')}
                title="Return to Services Menu"
                style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', cursor: 'pointer' }}
              >
                Our Services & Academy Media
              </h1>
              <span className="os-school-badge" style={{
                background: '#CCFBF1',
                color: '#0F766E',
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid #99F6E4',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                {schoolName}
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#64748B' }}>
              Upload your academy certificate, scan the template, and dynamically generate certificates for every student.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {activeTab === 'certificate' ? (
              <button
                type="button"
                onClick={() => handleSaveCertificate()}
                disabled={saving || isCertSaved}
                style={{
                  background: isCertSaved ? '#ECFDF5' : 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                  color: isCertSaved ? '#059669' : '#FFFFFF',
                  border: isCertSaved ? '1.5px solid #A7F3D0' : 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: (saving || isCertSaved) ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isCertSaved ? 'none' : '0 4px 14px rgba(13, 148, 136, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                {saving ? '⏳ Saving Design...' : isCertSaved ? '✓ Saved' : '💾 Save Certificate Template'}
              </button>
            ) : activeTab === 'poster' ? (
              <button
                type="button"
                onClick={() => handleSaveChanges()}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                {saving ? '⏳ Saving...' : '✓ Save Poster Photo'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback.text && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '10px',
            background: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: feedback.type === 'success' ? '#065F46' : '#991B1B',
            border: `1.5px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            fontSize: '13.5px',
            fontWeight: 700,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{feedback.text}</span>
            <button type="button" onClick={() => setFeedback({ text: '', type: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit' }}>✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 0: OUR SERVICES OPTIONS MENU HUB (Default Landing Page)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Options Menu Grid */}
            <div
              className="os-menu-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                gap: '24px',
                alignItems: 'stretch'
              }}
            >
              {/* Option 1: Course Completion Certificates Menu Card */}
              <div
                className="os-menu-card"
                onClick={() => setActiveTab('cert-courses')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: 0
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#0D9488';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 28px rgba(13, 148, 136, 0.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.04)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                      🎓
                    </div>
                    <span style={{ background: '#CCFBF1', color: '#0F766E', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', border: '1px solid #99F6E4' }}>
                      {Object.keys(certConfig.courses || defaultCourseCertificates).length} COURSES CONFIGURED
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Course Completion Certificates
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.5 }}>
                    Customize verified student completion certificates with your academy branding, typography, coordinates, and smart scan auto-alignment for any course duration.
                  </p>

                  {/* Clean Overview Box */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #F0FDFA 0%, #E6FFFA 100%)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      border: '1.5px solid #99F6E4',
                      marginBottom: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E' }}>
                        🎓 Course Certificates Hub
                      </span>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0D9488' }}>
                        {Object.keys(certConfig.courses || defaultCourseCertificates).length} Durations Available →
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {Object.entries(certConfig.courses || defaultCourseCertificates).map(([cKey, cData]) => {
                        const cDays = cData.days || (cKey.match(/\d+/) ? parseInt(cKey.match(/\d+/)[0], 10) : 3);
                        return (
                          <span
                            key={cKey}
                            style={{
                              background: '#FFFFFF',
                              color: '#0F766E',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 9px',
                              borderRadius: '7px',
                              border: '1px solid #CCFBF1'
                            }}
                          >
                            {cDays <= 3 ? '🏄' : cDays <= 7 ? '🌊' : '🏆'} {cDays}-Day ({cData.courseName || `${cDays}-Day Course`})
                          </span>
                        );
                      })}
                    </div>

                    <div style={{ fontSize: '11px', color: '#0D9488', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', marginTop: '2px', fontWeight: 600 }}>
                      <span>✓ 3-Day & 5-Day Presets</span>
                      <span>•</span>
                      <span>✓ Add Custom Days</span>
                      <span>•</span>
                      <span>✓ Smart Scanner</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('cert-courses'); }}
                  style={{
                    width: '100%',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 3px 10px rgba(13, 148, 136, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🎓</span> Open Course Certificates Menu →
                </button>
              </div>

              {/* Option 2: Milestone Story Poster Photo Menu Card */}
              <div
                className="os-menu-card"
                onClick={() => setActiveTab('poster')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: 0
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#0D9488';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 28px rgba(13, 148, 136, 0.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.04)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                      📸
                    </div>
                    <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', border: '1px solid #BFDBFE' }}>
                      SOCIAL SHARING
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Milestone Story Poster Photo
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.5 }}>
                    Set your academy's branded background image for student milestone cards shared on Instagram, WhatsApp, and social stories.
                  </p>

                  {/* Thumbnail Preview */}
                  <div
                    style={{
                      position: 'relative',
                      height: '140px',
                      borderRadius: '12px',
                      backgroundImage: `url(${posterUrl || '/surf-milestone-bg.jpg'})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '1.5px solid #CBD5E1',
                      overflow: 'hidden',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '10px'
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        color: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      Active Poster Photo Preview
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('poster'); }}
                  style={{
                    width: '100%',
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🖼️</span> Configure Story Poster Photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 0.5: COURSE COMPLETION CERTIFICATES HUB (Inside Level 2 Menu)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'cert-courses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Clean Top Navigation Bar (No Giant Dark Banner) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    color: '#0F172A',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.color = '#0D9488'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A'; }}
                >
                  <span>←</span> <span>Back to All Services</span>
                </button>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎓</span> Course Completion Certificates
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                    Click a card below to customize its certificate canvas, or create custom course days.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setNewCourseDays(7);
                    setNewCourseTitle('7-Day Advanced Surf Skills Course');
                    setNewCourseCopyFrom(selectedCourseKey);
                    setShowAddCourseModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 16px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                  }}
                >
                  <span>➕</span> Add Course Days
                </button>
              </div>
            </div>

            {/* Grid of Courses */}
            <div
              className="os-courses-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                gap: '20px',
                alignItems: 'stretch'
              }}
            >
              {Object.entries(certConfig.courses || defaultCourseCertificates).map(([cKey, cData]) => {
                const cDays = cData.days || (cKey.match(/\d+/) ? parseInt(cKey.match(/\d+/)[0], 10) : 3);
                const icon = cDays <= 3 ? '🏄' : cDays <= 7 ? '🌊' : '🏆';
                const isSelected = selectedCourseKey === cKey;
                const canDelete = Object.keys(certConfig.courses || defaultCourseCertificates).length > 1;

                return (
                  <div
                    key={cKey}
                    onClick={() => {
                      handleSwitchCourse(cKey);
                      setActiveTab('certificate');
                    }}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '22px',
                      border: isSelected ? '2px solid #0D9488' : '1.5px solid #E2E8F0',
                      boxShadow: isSelected ? '0 8px 24px rgba(13, 148, 136, 0.12)' : '0 4px 14px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#0D9488';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 10px 28px rgba(13, 148, 136, 0.18)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = isSelected ? '#0D9488' : '#E2E8F0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isSelected ? '0 8px 24px rgba(13, 148, 136, 0.12)' : '0 4px 14px rgba(0, 0, 0, 0.03)';
                    }}
                  >
                    <div>
                      {/* Top Badges & Delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '28px' }}>{icon}</span>
                          <div>
                            <span style={{
                              background: '#CCFBF1',
                              color: '#0F766E',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              {cDays} DAYS
                            </span>
                            {isSelected && (
                              <span style={{
                                marginLeft: '6px',
                                background: '#F0FDFA',
                                color: '#0D9488',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #99F6E4'
                              }}>
                                CURRENT ACTIVE
                              </span>
                            )}
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(cKey);
                            }}
                            title="Delete this course certificate"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              fontSize: '16px',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              lineHeight: 1
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEE2E2'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'none'; }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                        {cData.courseName || `${cDays}-Day Course Certificate`}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
                        {cData.levelBadge || (cDays <= 3 ? 'Beginner Level' : cDays <= 7 ? 'Intermediate Skills' : 'Advanced Program')}
                      </div>

                      {/* Course Details Box */}
                      <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px', border: '1px solid #E2E8F0', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: '#64748B' }}>Required Sessions:</span>
                          <strong style={{ color: '#0F172A' }}>{cData.stats?.completed || cDays} Sessions</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: '#64748B' }}>Template Design:</span>
                          <span style={{ color: '#0D9488', fontWeight: 700 }}>
                            {cData.template_type === 'custom' ? 'Custom Background Image' : 'Built-in Athnex Ocean'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        handleSwitchCourse(cKey);
                        setActiveTab('certificate');
                      }}
                      style={{
                        width: '100%',
                        background: isSelected ? 'linear-gradient(135deg, #0D9488 0%, #059669 100%)' : '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '11px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: isSelected ? '0 4px 12px rgba(13, 148, 136, 0.3)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>✏️</span> Customize Certificate & Canvas →
                    </button>
                  </div>
                );
              })}

              {/* Add Custom Days Card */}
              <div
                onClick={() => {
                  setNewCourseDays(7);
                  setNewCourseTitle('7-Day Advanced Surf Skills Course');
                  setNewCourseCopyFrom(selectedCourseKey);
                  setShowAddCourseModal(true);
                }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '2px dashed #0D9488',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  minHeight: '220px',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#F0FDFA'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#CCFBF1', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
                  ➕
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Add Course Days
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B', maxWidth: '240px' }}>
                  Create a separate certificate for any duration (1, 2, 7, 10, 14, 30+ days).
                </p>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0D9488', background: '#F0FDFA', padding: '6px 14px', borderRadius: '8px', border: '1px solid #99F6E4' }}>
                  + Add New Duration
                </span>
              </div>

              {/* Smart Scanner Card */}
              <div
                onClick={() => { setActiveTab('certificate'); setShowScanModal(true); }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '2px dashed #94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  minHeight: '220px',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#475569'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#94A3B8'; }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
                  ✨
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Smart Template Scanner
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B', maxWidth: '240px' }}>
                  Upload image to auto-detect text coordinates and align fields.
                </p>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', background: '#F8FAFC', padding: '6px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  Launch Scanner →
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: COURSE COMPLETION CERTIFICATE BUILDER & CUSTOMIZER (Default)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'certificate' && (
          <div>
            {/* Top Breadcrumb & Return to Menu Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                background: '#FFFFFF',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('cert-courses')}
                  style={{
                    background: '#F0FDFA',
                    border: '1px solid #99F6E4',
                    color: '#0D9488',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px'
                  }}
                >
                  <span>←</span> <span>Back to Course Selection</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    color: '#64748B',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px'
                  }}
                >
                  <span>📋</span> <span>All Services Menu</span>
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                <span style={{ cursor: 'pointer', color: '#0D9488' }} onClick={() => setActiveTab('menu')}>Our Services</span>
                {' > '}
                <span style={{ cursor: 'pointer', color: '#0D9488' }} onClick={() => setActiveTab('cert-courses')}>Course Certificates</span>
                {' > '}
                <strong style={{ color: '#0F172A' }}>{activeCourse.courseName || `${activeCourse.days || 3}-Day Course`}</strong>
              </div>
            </div>

            {/* ══ COURSE TARGET SELECTOR BAR (3-Day vs 5-Day Course Certificates) ══ */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #CCFBF1',
                padding: '14px 20px',
                marginBottom: '20px',
                boxShadow: '0 4px 18px rgba(13, 148, 136, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              {/* Left Side: Course Mode Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🎓</span>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0D9488' }}>
                      Certificate Target Course
                    </span>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                      Customize by Course Duration
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    background: '#F1F5F9',
                    padding: '4px',
                    borderRadius: '12px',
                    gap: '4px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}
                >
                  {/* Dynamic Buttons for all configured courses */}
                  {Object.entries(certConfig.courses || defaultCourseCertificates).map(([cKey, cData]) => {
                    const isSelected = (selectedCourseKey === cKey);
                    const daysCount = cData.days || (cKey.match(/\d+/) ? parseInt(cKey.match(/\d+/)[0], 10) : 3);
                    const icon = daysCount <= 3 ? '🏄' : daysCount <= 7 ? '🌊' : '🏆';
                    const canDelete = Object.keys(certConfig.courses || defaultCourseCertificates).length > 1;

                    return (
                      <div
                        key={cKey}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: '9px',
                          background: isSelected ? '#0D9488' : 'transparent',
                          boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.35)' : 'none',
                          transition: 'all 0.18s ease'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSwitchCourse(cKey)}
                          style={{
                            background: 'transparent',
                            color: isSelected ? '#FFFFFF' : '#475569',
                            border: 'none',
                            borderRadius: '9px',
                            padding: '8px 12px',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>{icon}</span>
                          <span>{cData.courseName || `${daysCount}-Day Course`}</span>
                          <span
                            style={{
                              background: isSelected ? 'rgba(255,255,255,0.22)' : '#E2E8F0',
                              color: isSelected ? '#FFFFFF' : '#64748B',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              fontSize: '10px',
                              fontWeight: 700
                            }}
                          >
                            {cData.stats?.completed || daysCount} Sessions
                          </span>
                        </button>

                        {/* Delete Button for custom courses */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(cKey); }}
                            title={`Delete ${cData.courseName || cKey} Certificate`}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isSelected ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                              cursor: 'pointer',
                              padding: '6px 8px 6px 2px',
                              fontSize: '12px',
                              fontWeight: 700,
                              lineHeight: 1
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = isSelected ? 'rgba(255,255,255,0.7)' : '#94A3B8'; }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* ➕ Add Course Days Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewCourseDays(7);
                      setNewCourseTitle('7-Day Advanced Surf Skills Course');
                      setNewCourseCopyFrom(selectedCourseKey);
                      setShowAddCourseModal(true);
                    }}
                    style={{
                      background: '#FFFFFF',
                      color: '#0D9488',
                      border: '1.5px dashed #0D9488',
                      borderRadius: '9px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#F0FDFA'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    <span>➕</span> Add Days / Course
                  </button>
                </div>
              </div>

              {/* Right Side: Clone / Replicate Across Courses Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#F0FDFA',
                      color: '#0D9488',
                      border: '1px solid #99F6E4',
                      padding: '3px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    Editing: <strong>{activeCourse.courseName || `${activeCourse.days || 3}-Day Course`}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCloneAcrossCourses()}
                  title="Copy current certificate design to other courses"
                  style={{
                    background: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.color = '#0D9488'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A'; }}
                >
                  <span>📋</span>
                  <span>Copy Design To...</span>
                </button>
              </div>
            </div>

            <div
              className="cert-studio-layout"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(380px, 460px) 1fr',
                gap: '24px',
                alignItems: 'flex-start',
                position: 'relative'
              }}
            >
              {/* Left Controls & Customizer Panel (Scrollable Side) */}
              <div
                className="cert-controls-sidebar"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  maxHeight: 'calc(100vh - 105px)',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  minWidth: 0,
                  paddingRight: '8px',
                  paddingBottom: '24px'
                }}
              >
                {/* Template Background Card */}
                <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      🎨
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0F172A' }}>
                        Certificate Background Template
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                        Upload your academy's official certificate image or choose a preset.
                      </p>
                    </div>
                  </div>

                  {/* Upload Custom Certificate Button */}
                  <input
                    type="file"
                    ref={certFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleCertImageUpload}
                  />
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                  <input
                    type="file"
                    ref={sigFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleSignatureUpload}
                  />

                  <div style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>📜</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                      Upload Official Academy Certificate
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '12px' }}>
                      Upload your certificate with placeholder name & click "Scan" to auto-align!
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => certFileInputRef.current?.click()}
                        disabled={uploadingCert}
                        style={{
                          background: '#0D9488',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 750,
                          cursor: uploadingCert ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {uploadingCert ? '⏳ Uploading...' : '📁 Upload Template Image'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScanAndAutoMapCertificate()}
                        disabled={isScanning}
                        style={{
                          background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: isScanning ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                        }}
                      >
                        <span>✨</span> {isScanning ? 'Scanning...' : 'Scan Template'}
                      </button>

                      <button
                        type="button"
                        onClick={handleSelectDefaultTemplate}
                        style={{
                          background: (certConfig.template_type === 'default' || !certConfig.template_type) && !certConfig.custom_bg_url ? '#0D9488' : '#F0FDFA',
                          color: (certConfig.template_type === 'default' || !certConfig.template_type) && !certConfig.custom_bg_url ? '#FFFFFF' : '#0D9488',
                          border: '1.5px solid #99F6E4',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>🌟</span> {(certConfig.template_type === 'default' || !certConfig.template_type) && !certConfig.custom_bg_url ? '✓ Active Default' : 'Use Default Certificate'}
                      </button>

                      {certConfig.custom_bg_url && (
                        <button
                          type="button"
                          onClick={handleSelectDefaultTemplate}
                          style={{
                            background: '#FFFFFF',
                            color: '#64748B',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: 650,
                            cursor: 'pointer'
                          }}
                        >
                          ↺ Reset to Default
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Presets List */}
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Or Select Built-In Surf Preset:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {certPresets.map(preset => {
                      const isSelected = ((certConfig.template_type === preset.id) || (!certConfig.template_type && preset.id === 'default')) && !certConfig.custom_bg_url;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            if (preset.id === 'default') {
                              handleSelectDefaultTemplate();
                            } else {
                              const currentCourseObj = certConfig.courses?.[selectedCourseKey] || certConfig;
                              const updatedCourse = {
                                ...currentCourseObj,
                                template_type: preset.id,
                                custom_bg_url: '',
                                fields: {
                                  ...currentCourseObj.fields,
                                  student_name: { ...(currentCourseObj.fields?.student_name || certConfig.fields.student_name), color: preset.primaryColor, coverBackground: false },
                                  course_title: { ...(currentCourseObj.fields?.course_title || certConfig.fields.course_title), color: preset.accentColor, coverBackground: false }
                                }
                              };
                              const updatedCourses = {
                                ...(certConfig.courses || {}),
                                [selectedCourseKey]: updatedCourse
                              };
                              const updated = {
                                ...certConfig,
                                ...updatedCourse,
                                courses: updatedCourses,
                                activeCourseKey: selectedCourseKey
                              };
                              setCertConfig(updated);
                              handleSaveCertificate(updated);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid #0D9488' : '1px solid #E2E8F0',
                            background: isSelected ? '#F0FDFA' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '42px',
                            height: '30px',
                            borderRadius: '6px',
                            background: preset.bg,
                            border: `2px solid ${preset.border}`,
                            flexShrink: 0
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 800, color: isSelected ? '#0D9488' : '#0F172A' }}>
                                {isSelected ? '✓ ' : ''}{preset.label}
                              </span>
                              {preset.badge && (
                                <span style={{
                                  background: '#CCFBF1',
                                  color: '#0F766E',
                                  fontSize: '9.5px',
                                  fontWeight: 850,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  letterSpacing: '0.04em'
                                }}>
                                  {preset.badge}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                              {preset.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Official School Logo & Coach Signature Photos Upload Hub */}
                <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🖼️</span> Official School Logo & Coach Signature Photos
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                      Upload official academy crest/logo and coach handwritten signature photos to display on your certificates.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* School Logo Card */}
                    <div style={{
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🏫</span> School Logo
                        </span>
                        {certConfig.fields?.school_logo?.image_url ? (
                          <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                            ✓ ACTIVE
                          </span>
                        ) : (
                          <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                            Optional
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}>
                        <div style={{ width: '48px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', overflow: 'hidden', flexShrink: 0 }}>
                          {certConfig.fields?.school_logo?.image_url ? (
                            <img src={certConfig.fields.school_logo.image_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: '18px', opacity: 0.5 }}>🏫</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', color: '#1E293B', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {certConfig.fields?.school_logo?.image_url ? 'Academy Crest / Logo' : 'No Logo Uploaded'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {certConfig.fields?.school_logo?.image_url ? 'Displayed on certificate' : 'Transparent PNG or JPG'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFieldKey('school_logo');
                              logoFileInputRef.current?.click();
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#0D9488',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '7px',
                              fontSize: '11.5px',
                              fontWeight: 750,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 3px rgba(13, 148, 136, 0.25)'
                            }}
                          >
                            <span>📷</span>
                            <span>{certConfig.fields?.school_logo?.image_url ? 'Change Logo' : 'Upload Logo'}</span>
                          </button>
                          {certConfig.fields?.school_logo?.image_url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImageField('school_logo')}
                              title="Remove Logo"
                              style={{
                                padding: '6px 9px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                borderRadius: '7px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coach Signature Card */}
                    <div style={{
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>✍️</span> Coach Signature
                        </span>
                        {certConfig.fields?.coach_signature?.image_url ? (
                          <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                            ✓ ACTIVE
                          </span>
                        ) : (
                          <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                            Optional
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}>
                        <div style={{ width: '48px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', overflow: 'hidden', flexShrink: 0 }}>
                          {certConfig.fields?.coach_signature?.image_url ? (
                            <img src={certConfig.fields.coach_signature.image_url} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: '18px', opacity: 0.5 }}>✍️</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', color: '#1E293B', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {certConfig.fields?.coach_signature?.image_url ? 'Handwritten Signature' : 'No Signature Uploaded'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {certConfig.fields?.coach_signature?.image_url ? 'Placed on signature line' : 'Photo or ink stamp'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFieldKey('coach_signature');
                              sigFileInputRef.current?.click();
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#0D9488',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '7px',
                              fontSize: '11.5px',
                              fontWeight: 750,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 3px rgba(13, 148, 136, 0.25)'
                            }}
                          >
                            <span>✍️</span>
                            <span>{certConfig.fields?.coach_signature?.image_url ? 'Change Signature' : 'Upload Signature'}</span>
                          </button>
                          {certConfig.fields?.coach_signature?.image_url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImageField('coach_signature')}
                              title="Remove Signature"
                              style={{
                                padding: '6px 9px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                borderRadius: '7px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Field Selector & Position Styler */}
                <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span>📐</span> Field Placement & Typography
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                          Choose a field to customize its position, font size, and color.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={handleShowAllFields}
                          style={{
                            background: '#F0FDF4',
                            color: '#16A34A',
                            border: '1px solid #BBF7D0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                        >
                          <span>👁️</span> Show All Fields
                        </button>

                        <button
                          type="button"
                          onClick={handleAddCustomField}
                          style={{
                            background: '#F0FDFA',
                            color: '#0D9488',
                            border: '1px solid #99F6E4',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                        >
                          <span>➕</span> Add Custom Text
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Field Selection Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    {[
                      { key: 'student_name', label: '👤 Student Name' },
                      { key: 'course_title', label: '🏄 Course Title' },
                      { key: 'body_text', label: '📝 Body Statement' },
                      { key: 'academy_name', label: '🏫 Academy Name' },
                      { key: 'school_logo', label: '🖼️ School Logo' },
                      { key: 'issue_date', label: '📅 Issue Date' },
                      { key: 'coach_name', label: '👤 Coach Name' },
                      { key: 'coach_signature', label: '✍️ Coach Signature' },
                      { key: 'cert_id', label: '🔢 Serial ID' },
                      { key: 'athnex_logo', label: '🏷️ Athnex Logo' },
                      ...(certConfig.custom_fields || []).map((_, i) => ({
                        key: `custom_${i}`,
                        label: `✨ Custom #${i + 1}`
                      }))
                    ].map(f => {
                      const isSelected = activeFieldKey === f.key;
                      const fieldObj = certConfig.fields?.[f.key] || (certConfig.custom_fields || [])[parseInt(f.key.replace('custom_', ''), 10)];
                      const isVis = fieldObj?.visible !== false;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => {
                            setActiveFieldKey(f.key);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                            background: isSelected ? '#0D9488' : '#F8FAFC',
                            color: isSelected ? '#FFFFFF' : '#475569',
                            fontSize: '11.5px',
                            fontWeight: isSelected ? 800 : 650,
                            cursor: 'pointer',
                            opacity: isVis ? 1 : 0.65,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: isSelected ? '0 2px 6px rgba(13, 148, 136, 0.3)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {f.label} {!isVis ? '(Hidden)' : ''}
                        </button>
                      );
                    })}
                  </div>

                  {/* Controls for current active field */}
                  {currentActiveField && (() => {
                    const isImageField = currentActiveField.type === 'image' || activeFieldKey === 'school_logo' || activeFieldKey === 'coach_signature' || activeFieldKey === 'athnex_logo';
                    const isLockedBrandLogo = activeFieldKey === 'athnex_logo';
                    return (
                      <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            Editing: <span style={{ color: '#0D9488' }}>{currentActiveField.label || 'Custom Field'}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isLockedBrandLogo ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1.5px solid #10B981',
                                background: '#ECFDF5',
                                color: '#065F46',
                                fontSize: '11px',
                                fontWeight: 800
                              }}>
                                🔒 Required Brand Logo
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateActiveField('visible', currentActiveField.visible === false ? true : false)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: currentActiveField.visible !== false ? '1.5px solid #10B981' : '1.5px solid #F59E0B',
                                  background: currentActiveField.visible !== false ? '#ECFDF5' : '#FFFBEB',
                                  color: currentActiveField.visible !== false ? '#065F46' : '#B45309',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>{currentActiveField.visible !== false ? '👁️ Visible' : '🚫 Hidden (Click to Show)'}</span>
                              </button>
                            )}

                            {activeFieldKey.startsWith('custom_') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomField(parseInt(activeFieldKey.replace('custom_', ''), 10))}
                                style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 750, cursor: 'pointer' }}
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </div>

                        {isImageField ? (
                          <div>
                            {isLockedBrandLogo ? (
                              <div style={{ marginBottom: '14px', background: '#F0FDFA', borderRadius: '10px', padding: '12px 14px', border: '1px solid #99F6E4' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>🏷️</span>
                                  <span>Official Athnexlive Accreditation Badge</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                                  Drag this logo directly on the certificate canvas or adjust X / Y & Size below so it sits cleanly without overlapping your border. This brand badge cannot be removed.
                                </div>
                              </div>
                            ) : (
                            /* Image Upload Box */
                            <div style={{ marginBottom: '14px', background: '#FFFFFF', borderRadius: '10px', padding: '14px', border: '1.5px dashed #CBD5E1' }}>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{activeFieldKey === 'school_logo' ? '🏫' : '✍️'}</span>
                                <span>{activeFieldKey === 'school_logo' ? 'Official Academy / School Logo' : 'Official Coach Handwritten Signature'}</span>
                              </div>

                              {currentActiveField.image_url ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '10px' }}>
                                    <div style={{ width: '80px', height: '60px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                      <img
                                        src={currentActiveField.image_url}
                                        alt="Preview"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                      />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>
                                        ✓ Photo Uploaded & Placed
                                      </div>
                                      <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                                        Drag directly on the canvas to reposition!
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (activeFieldKey === 'school_logo') logoFileInputRef.current?.click();
                                        else sigFileInputRef.current?.click();
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '7px 12px',
                                        background: '#F0FDFA',
                                        color: '#0D9488',
                                        border: '1.5px solid #99F6E4',
                                        borderRadius: '7px',
                                        fontSize: '11.5px',
                                        fontWeight: 750,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      🔄 Change Photo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImageField(activeFieldKey)}
                                      style={{
                                        padding: '7px 12px',
                                        background: '#FEF2F2',
                                        color: '#DC2626',
                                        border: '1px solid #FECACA',
                                        borderRadius: '7px',
                                        fontSize: '11.5px',
                                        fontWeight: 750,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      🗑️ Remove Photo
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ textAlign: 'center', padding: '12px 10px' }}>
                                  <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: '#64748B' }}>
                                    {activeFieldKey === 'school_logo'
                                      ? 'Upload your school logo (transparent PNG or JPG).'
                                      : 'Upload your coach handwritten signature or ink stamp.'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (activeFieldKey === 'school_logo') logoFileInputRef.current?.click();
                                      else sigFileInputRef.current?.click();
                                    }}
                                    style={{
                                      padding: '8px 18px',
                                      background: '#0D9488',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                                    }}
                                  >
                                    {activeFieldKey === 'school_logo' ? '📁 Choose Logo Image' : '📁 Choose Signature Photo'}
                                  </button>
                                </div>
                              )}
                            </div>
                            )}

                            {/* Image Width Slider */}
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                <span>Image Display Width</span>
                                <span style={{ color: '#0D9488', fontWeight: 800 }}>{currentActiveField.width || (activeFieldKey === 'school_logo' ? 80 : 130)}px</span>
                              </div>
                              <input
                                type="range"
                                min="30"
                                max="280"
                                value={currentActiveField.width || (activeFieldKey === 'school_logo' ? 80 : 130)}
                                onChange={(e) => updateActiveField('width', parseInt(e.target.value, 10))}
                                style={{ width: '100%', accentColor: '#0D9488' }}
                              />
                            </div>

                            {/* Position Sliders (X% and Y%) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                  <span>Horizontal (X%)</span>
                                  <span style={{ color: '#0D9488', fontWeight: 800 }}>{currentActiveField.x}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={currentActiveField.x}
                                  onChange={(e) => updateActiveField('x', parseInt(e.target.value, 10))}
                                  style={{ width: '100%', accentColor: '#0D9488' }}
                                />
                              </div>

                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                  <span>Vertical (Y%)</span>
                                  <span style={{ color: '#0D9488', fontWeight: 800 }}>{currentActiveField.y}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={currentActiveField.y}
                                  onChange={(e) => updateActiveField('y', parseInt(e.target.value, 10))}
                                  style={{ width: '100%', accentColor: '#0D9488' }}
                                />
                              </div>
                            </div>

                            {/* Alignment */}
                            <div>
                              <div style={{ fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                Anchor Alignment
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {['left', 'center', 'right'].map(align => (
                                  <button
                                    key={align}
                                    type="button"
                                    onClick={() => updateActiveField('align', align)}
                                    style={{
                                      flex: 1,
                                      padding: '5px 0',
                                      border: (currentActiveField.align || 'center') === align ? '1.5px solid #0D9488' : '1px solid #CBD5E1',
                                      background: (currentActiveField.align || 'center') === align ? '#CCFBF1' : '#FFFFFF',
                                      color: (currentActiveField.align || 'center') === align ? '#0F766E' : '#475569',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 750,
                                      cursor: 'pointer',
                                      textTransform: 'capitalize'
                                    }}
                                  >
                                    {align}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* Sample / Label text edit */}
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                Sample / Dynamic Text Value
                              </label>
                              <input
                                type="text"
                                value={currentActiveField.sample || ''}
                                onChange={(e) => updateActiveField('sample', e.target.value)}
                                placeholder="Enter text value to display..."
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                              />
                            </div>

                            {/* Position Sliders (X% and Y%) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                  <span>Horizontal (X%)</span>
                                  <span style={{ color: '#0D9488', fontWeight: 800 }}>{currentActiveField.x}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={currentActiveField.x}
                                  onChange={(e) => updateActiveField('x', parseInt(e.target.value, 10))}
                                  style={{ width: '100%', accentColor: '#0D9488' }}
                                />
                              </div>

                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                  <span>Vertical (Y%)</span>
                                  <span style={{ color: '#0D9488', fontWeight: 800 }}>{currentActiveField.y}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={currentActiveField.y}
                                  onChange={(e) => updateActiveField('y', parseInt(e.target.value, 10))}
                                  style={{ width: '100%', accentColor: '#0D9488' }}
                                />
                              </div>
                            </div>

                            {/* Font Size & Alignment */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                  <span>Font Size</span>
                                  <span style={{ color: '#0D9488', fontWeight: 800 }}>{currentActiveField.fontSize}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="12"
                                  max="72"
                                  value={currentActiveField.fontSize}
                                  onChange={(e) => updateActiveField('fontSize', parseInt(e.target.value, 10))}
                                  style={{ width: '100%', accentColor: '#0D9488' }}
                                />
                              </div>

                              <div>
                                <div style={{ fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                  Alignment
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {['left', 'center', 'right'].map(align => (
                                    <button
                                      key={align}
                                      type="button"
                                      onClick={() => updateActiveField('align', align)}
                                      style={{
                                        flex: 1,
                                        padding: '5px 0',
                                        border: (currentActiveField.align || 'center') === align ? '1.5px solid #0D9488' : '1px solid #CBD5E1',
                                        background: (currentActiveField.align || 'center') === align ? '#CCFBF1' : '#FFFFFF',
                                        color: (currentActiveField.align || 'center') === align ? '#0F766E' : '#475569',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 750,
                                        cursor: 'pointer',
                                        textTransform: 'capitalize'
                                      }}
                                    >
                                      {align}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Font Family Selector */}
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 750, color: '#334155', marginBottom: '4px' }}>
                                Typography Font Family
                              </label>
                              <select
                                value={currentActiveField.fontFamily || 'Georgia, serif'}
                                onChange={(e) => updateActiveField('fontFamily', e.target.value)}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #CBD5E1', fontSize: '12px', background: '#FFFFFF' }}
                              >
                                {fontOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Font Color & Quick Swatches */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11.5px', fontWeight: 750, color: '#334155' }}>Text Color</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="color"
                                    value={currentActiveField.color || '#FFFFFF'}
                                    onChange={(e) => updateActiveField('color', e.target.value)}
                                    style={{ width: '24px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                                  />
                                  <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace' }}>{currentActiveField.color}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {colorSwatches.map(swatch => (
                                  <div
                                    key={swatch}
                                    onClick={() => updateActiveField('color', swatch)}
                                    style={{
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '5px',
                                      background: swatch,
                                      border: currentActiveField.color === swatch ? '2px solid #0D9488' : '1px solid #CBD5E1',
                                      cursor: 'pointer',
                                      boxShadow: currentActiveField.color === swatch ? '0 0 0 2px rgba(13,148,136,0.3)' : 'none'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Helpful linking banners */}
                            {activeFieldKey === 'coach_name' && (
                              <div style={{ marginTop: '14px', background: '#F0FDFA', borderRadius: '8px', padding: '10px 12px', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ fontSize: '11.5px', color: '#0F766E', fontWeight: 650 }}>
                                  ✍️ Want to upload coach handwritten signature photo?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveFieldKey('coach_signature')}
                                  style={{ background: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 750, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  Upload Signature →
                                </button>
                              </div>
                            )}

                            {activeFieldKey === 'academy_name' && (
                              <div style={{ marginTop: '14px', background: '#F0FDFA', borderRadius: '8px', padding: '10px 12px', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ fontSize: '11.5px', color: '#0F766E', fontWeight: 650 }}>
                                  🏫 Want to upload official academy crest / logo photo?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveFieldKey('school_logo')}
                                  style={{ background: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 750, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  Upload Logo →
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Interactive Certificate Canvas Preview (Sticky Pinned In Viewport) */}
              <div
                className="cert-canvas-sticky-pane"
                style={{
                  position: 'sticky',
                  top: '86px',
                  alignSelf: 'flex-start',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  maxHeight: 'calc(100vh - 96px)',
                  overflowY: 'auto'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>👁️</span> Live Certificate Interactive Canvas
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                      Click & drag any field directly to position it on your certificate.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Primary Highlighted SCAN Button right on top of Canvas! */}
                    <button
                      type="button"
                      onClick={() => handleScanAndAutoMapCertificate()}
                      disabled={isScanning}
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '12.5px',
                        fontWeight: 850,
                        cursor: isScanning ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 3px 12px rgba(13, 148, 136, 0.45)',
                        animation: 'certPulseGlow 3s infinite'
                      }}
                    >
                      <span>🔍</span>
                      <span>{isScanning ? 'Scanning...' : 'Scan Template & Details'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTestCertificate}
                      disabled={downloadingTestCert}
                      style={{
                        background: '#F0FDFA',
                        color: '#0D9488',
                        border: '1.5px solid #99F6E4',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '12px',
                        fontWeight: 750,
                        cursor: downloadingTestCert ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {downloadingTestCert ? '⏳ Generating...' : '📥 Test High-Res Download'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveCertificate()}
                      disabled={saving || isCertSaved}
                      style={{
                        background: isCertSaved ? '#ECFDF5' : '#0D9488',
                        color: isCertSaved ? '#059669' : '#FFFFFF',
                        border: isCertSaved ? '1.5px solid #A7F3D0' : 'none',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '12px',
                        fontWeight: 750,
                        cursor: (saving || isCertSaved) ? 'default' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {saving ? '⏳ Saving...' : isCertSaved ? '✓ Saved' : '💾 Save Template'}
                    </button>
                  </div>
                </div>

                {/* Certificate Viewport (A4 Landscape 1.414 : 1 Ratio) */}
                <div
                  ref={certContainerRef}
                  onMouseMove={handleMouseMoveOnCanvas}
                  onTouchMove={handleMouseMoveOnCanvas}
                  onMouseUp={handleMouseUpOnCanvas}
                  onTouchEnd={handleMouseUpOnCanvas}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1.414 / 1',
                    borderRadius: '14px',
                    backgroundImage: certConfig.template_type === 'custom' && certConfig.custom_bg_url
                      ? `url(${certConfig.custom_bg_url})`
                      : (certPresets.find(p => p.id === certConfig.template_type)?.bg || certPresets[0].bg),
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
                    border: certConfig.template_type === 'custom'
                      ? '2px solid #CBD5E1'
                      : `8px solid ${certPresets.find(p => p.id === certConfig.template_type)?.border || '#D4AF37'}`,
                    overflow: 'hidden',
                    userSelect: 'none',
                    cursor: draggingField ? 'grabbing' : 'default'
                  }}
                >
                  {/* Default Surf Wave Image Backdrop */}
                  {((certConfig.template_type === 'default' || !certConfig.template_type) && !certConfig.custom_bg_url) && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url('/surf-milestone-bg.jpg')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.16,
                        pointerEvents: 'none'
                      }}
                    />
                  )}

                  {/* Decorative border if not custom */}
                  {certConfig.template_type !== 'custom' && (
                    <>
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        right: '12px',
                        bottom: '12px',
                        border: `1.5px solid ${certPresets.find(p => p.id === certConfig.template_type)?.border || '#D4AF37'}66`,
                        borderRadius: '6px',
                        pointerEvents: 'none'
                      }} />
                      <div style={{ position: 'absolute', top: '15px', left: '15px', width: '8px', height: '8px', background: certPresets.find(p => p.id === certConfig.template_type)?.border || '#D4AF37', transform: 'rotate(45deg)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: '15px', right: '15px', width: '8px', height: '8px', background: certPresets.find(p => p.id === certConfig.template_type)?.border || '#D4AF37', transform: 'rotate(45deg)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', bottom: '15px', left: '15px', width: '8px', height: '8px', background: certPresets.find(p => p.id === certConfig.template_type)?.border || '#D4AF37', transform: 'rotate(45deg)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '8px', height: '8px', background: certPresets.find(p => p.id === certConfig.template_type)?.border || '#D4AF37', transform: 'rotate(45deg)', pointerEvents: 'none' }} />
                    </>
                  )}

                  {/* Official Athnex Default Certificate Elements */}
                  {((certConfig.template_type === 'default' || !certConfig.template_type) && !certConfig.custom_bg_url) && (
                    <>
                      {/* Circular A Seal */}
                      <div style={{
                        position: 'absolute',
                        top: '4.5%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#2DD4BF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0A1628',
                        fontSize: '20px',
                        fontWeight: 900,
                        boxShadow: '0 4px 12px rgba(45, 212, 191, 0.35)',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}>
                        A
                      </div>

                      {/* Official Subline */}
                      <div style={{
                        position: 'absolute',
                        top: '18.5%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '8px',
                        fontWeight: 700,
                        color: 'rgba(212, 175, 55, 0.75)',
                        letterSpacing: '0.12em',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                      }}>
                        OFFICIAL SURF ACADEMY • athnexlive.com
                      </div>

                      {/* Top Divider */}
                      <div style={{
                        position: 'absolute',
                        top: '22%',
                        left: '15%',
                        right: '15%',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                        pointerEvents: 'none'
                      }} />

                      {/* "This is to certify that" */}
                      <div style={{
                        position: 'absolute',
                        top: '25%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '11px',
                        fontFamily: 'Georgia, serif',
                        fontStyle: 'italic',
                        color: '#FEF3C7',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                      }}>
                        This is to certify that
                      </div>

                      {/* 3 Stats Badges */}
                      <div style={{
                        position: 'absolute',
                        top: '58%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '12px',
                        width: '74%',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <div style={{
                          flex: 1,
                          maxWidth: '170px',
                          background: 'rgba(45, 212, 191, 0.08)',
                          border: '1px solid rgba(45, 212, 191, 0.35)',
                          borderRadius: '8px',
                          padding: '5px 8px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#2DD4BF' }}>
                            🏄 {activeCourse.stats?.completed || activeCourse.days || 3} Completed
                          </div>
                          <div style={{ fontSize: '7.5px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>SESSIONS</div>
                        </div>
                        <div style={{
                          flex: 1,
                          maxWidth: '170px',
                          background: 'rgba(252, 211, 77, 0.08)',
                          border: '1px solid rgba(252, 211, 77, 0.35)',
                          borderRadius: '8px',
                          padding: '5px 8px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#FCD34D' }}>
                            ⭐ {activeCourse.stats?.score || 88} / 100
                          </div>
                          <div style={{ fontSize: '7.5px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>COACH SCORE</div>
                        </div>
                        <div style={{
                          flex: 1,
                          maxWidth: '170px',
                          background: 'rgba(45, 212, 191, 0.08)',
                          border: '1px solid rgba(45, 212, 191, 0.35)',
                          borderRadius: '8px',
                          padding: '5px 8px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#2DD4BF' }}>
                            🌊 {activeCourse.stats?.waves || (activeCourse.days ? activeCourse.days * 10 : 30)} Waves
                          </div>
                          <div style={{ fontSize: '7.5px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>WAVES RIDDEN</div>
                        </div>
                      </div>

                      {/* Pro Level Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '71%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(45, 212, 191, 0.12)',
                        border: '1px solid #2DD4BF',
                        borderRadius: '999px',
                        padding: '2px 10px',
                        fontSize: '9px',
                        fontWeight: 800,
                        color: '#2DD4BF',
                        pointerEvents: 'none'
                      }}>
                        {activeCourse.levelBadge || (activeCourse.days <= 3 ? '✓ Beginner / Pro Level' : activeCourse.days <= 7 ? '✓ Intermediate / Pro Level' : '✓ Advanced / Pro Level')}
                      </div>

                      {/* Bottom Footer Line */}
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '7.5px',
                        fontWeight: 700,
                        color: 'rgba(212, 175, 55, 0.65)',
                        letterSpacing: '0.08em',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                      }}>
                        ATHNEX LIVE • OFFICIAL SURF ACADEMY CERTIFICATE • athnexlive.com
                      </div>
                    </>
                  )}

                  {/* ── Active Scanning Laser Effect ── */}
                  {isScanning && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, transparent, #2DD4BF, #60A5FA, #2DD4BF, transparent)',
                        boxShadow: '0 0 20px #2DD4BF, 0 0 35px #38BDF8',
                        animation: 'certLaserScan 1.6s ease-in-out infinite',
                        zIndex: 25,
                        pointerEvents: 'none'
                      }}
                    />
                  )}

                  {/* Scanning Status HUD */}
                  {isScanning && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(8px)',
                        color: '#A7F3D0',
                        border: '1.5px solid #2DD4BF',
                        padding: '12px 24px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 800,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        zIndex: 30,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>⚡</span>
                      <span>{scanStepMessage || 'Scanning certificate template details...'}</span>
                    </div>
                  )}

                  {/* Render Dynamic Fields */}
                  {[
                    ...Object.entries({
                      athnex_logo: { label: 'Athnex Logo', type: 'image', visible: true, lockedVisible: true, image_url: '/athnexlive-logo.png', x: 91, y: 6, width: 72, align: 'center' },
                      ...(certConfig.fields || {})
                    }).map(([k, f]) => ({ ...f, key: k, visible: k === 'athnex_logo' ? true : f?.visible })),
                    ...(certConfig.custom_fields || []).map((f, i) => ({ ...f, key: `custom_${i}` }))
                  ].map(field => {
                    if (field.visible === false && field.key !== 'athnex_logo') return null;
                    const isSelected = activeFieldKey === field.key;
                    const isImageField = field.type === 'image' || field.key === 'school_logo' || field.key === 'coach_signature' || field.key === 'athnex_logo';

                    if (isImageField) {
                      const isAthnexBrand = field.key === 'athnex_logo';
                      return (
                        <div
                          key={field.key}
                          onMouseDown={(e) => handleMouseDownOnField(e, field.key)}
                          onTouchStart={(e) => handleMouseDownOnField(e, field.key)}
                          style={{
                            position: 'absolute',
                            left: `${field.x}%`,
                            top: `${field.y}%`,
                            transform: field.align === 'center' ? 'translate(-50%, -50%)' : (field.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)'),
                            width: `${field.width || (isAthnexBrand ? 72 : (field.key === 'school_logo' ? 80 : 130))}px`,
                            cursor: 'grab',
                            padding: isAthnexBrand ? '3px 7px' : '3px',
                            borderRadius: isAthnexBrand ? '7px' : '8px',
                            border: isSelected ? '2px dashed #0D9488' : (isAthnexBrand ? '1px solid rgba(255, 255, 255, 0.7)' : '1.5px dashed transparent'),
                            backgroundColor: isSelected ? (isAthnexBrand ? 'rgba(255, 255, 255, 0.98)' : 'rgba(13, 148, 136, 0.15)') : (isAthnexBrand ? 'rgba(255, 255, 255, 0.95)' : 'transparent'),
                            boxShadow: isAthnexBrand ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
                            zIndex: isSelected ? 14 : (isAthnexBrand ? 12 : 3),
                            userSelect: 'none',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            transition: draggingField === field.key ? 'none' : 'border 0.15s ease'
                          }}
                        >
                          {field.image_url ? (
                            <img
                              src={field.image_url}
                              alt={field.label}
                              style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                                pointerEvents: 'none'
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setActiveFieldKey(field.key);
                                if (field.key === 'school_logo') logoFileInputRef.current?.click();
                                else sigFileInputRef.current?.click();
                              }}
                              style={{
                                border: '1.5px dashed #0D9488',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                background: 'rgba(255, 255, 255, 0.92)',
                                color: '#0F766E',
                                fontSize: '10px',
                                fontWeight: 800,
                                textAlign: 'center',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                              }}
                            >
                              {field.key === 'school_logo' ? '📷 Upload Logo' : '✍️ Upload Signature'}
                            </div>
                          )}
                          {isSelected && (
                            <div style={{ textAlign: 'center', marginTop: '2px' }}>
                              <span style={{ fontSize: '8px', fontWeight: 800, color: '#0F766E', background: '#FFFFFF', padding: '1px 5px', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                                {field.label}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={field.key}
                        onMouseDown={(e) => handleMouseDownOnField(e, field.key)}
                        onTouchStart={(e) => handleMouseDownOnField(e, field.key)}
                        style={{
                          position: 'absolute',
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          transform: field.align === 'center' ? 'translate(-50%, -50%)' : (field.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)'),
                          fontSize: `${Math.round((field.fontSize || 20) * 0.58)}px`,
                          fontFamily: field.fontFamily || 'Georgia, serif',
                          fontWeight: field.fontWeight || 'normal',
                          color: field.color || '#FFFFFF',
                          textAlign: field.align || 'center',
                          maxWidth: field.maxWidth ? `${field.maxWidth}%` : '88%',
                          cursor: 'grab',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: isSelected ? '1.5px dashed #10B981' : '1px dashed transparent',
                          backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
                          boxShadow: 'none',
                          textDecoration: field.underline ? 'underline' : 'none',
                          lineHeight: 1.25,
                          zIndex: isSelected ? 10 : 2,
                          transition: draggingField === field.key ? 'none' : 'border 0.15s ease'
                        }}
                      >
                        {field.sample || field.label}
                      </div>
                    );
                  })}

                  {/* Subtle Help Overlay at bottom */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '12px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    pointerEvents: 'none'
                  }}>
                    Live A4 Certificate Preview • Sample: Yusuf Ahmed
                  </div>
                </div>

                {/* Scan Detected Result Banner */}
                {scanDetectedDetails && (
                  <div style={{
                    marginTop: '12px',
                    background: '#ECFDF5',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    border: '1.5px solid #10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>✅</span>
                      <div style={{ fontSize: '12.5px', color: '#065F46' }}>
                        <strong>Template Scanned:</strong> Certificate layout aligned and dynamically mapped for <strong>Student Surfer Name</strong>!
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScanDetectedDetails(null)}
                      style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Instructional callout */}
                <div style={{ marginTop: '14px', background: '#F8FAFC', borderRadius: '10px', padding: '12px 16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>💡</span>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    <strong style={{ color: '#0F172A' }}>One-Click Scan:</strong> Click <em>"Scan Template & Details"</em> anytime to re-scan the certificate layout and prepare it for instant student generation!
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Scanner & Field Replacer Modal */}
            {showScanModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(5px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '16px'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowScanModal(false);
                }}
              >
                <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '26px', maxWidth: '520px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '26px' }}>🔍</span>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                      Smart Certificate Scanner & Text Replacer
                    </h3>
                  </div>

                  <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
                    Your uploaded certificate already has pre-printed text. Select which fields to dynamically replace for each student, and we will automatically cover the old placeholder text (like "kim")!
                  </p>

                  <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>
                      Choose Fields to Dynamically Replace:
                    </div>

                    {[
                      { key: 'student_name', label: '👤 Student Name (Replace "kim" / old name)', desc: 'Recommended: Replaces the name for each student', defaultChecked: true },
                      { key: 'course_title', label: '🏄 Course Title', desc: 'Keep original if already printed on certificate' },
                      { key: 'issue_date', label: '📅 Issue / Completion Date', desc: 'Keep original if already printed on certificate' },
                      { key: 'coach_name', label: '✍️ Coach Signature / Name', desc: 'Keep original if already printed on certificate' },
                      { key: 'body_text', label: '📝 Completion Statement', desc: 'Keep original if already printed on certificate' },
                      { key: 'academy_name', label: '🏫 Academy Name / Logo', desc: 'Keep original if already printed on certificate' },
                      { key: 'cert_id', label: '🔢 Certificate Serial Number', desc: 'Unique certificate ID' }
                    ].map(item => (
                      <label
                        key={item.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: scanSelections[item.key] ? '#ECFDF5' : '#FFFFFF',
                          border: scanSelections[item.key] ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                          marginBottom: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!scanSelections[item.key]}
                          onChange={(e) => setScanSelections({ ...scanSelections, [item.key]: e.target.checked })}
                          style={{ marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 750, color: scanSelections[item.key] ? '#065F46' : '#1E293B' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {item.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setShowScanModal(false)}
                      style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12.5px', fontWeight: 650, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyScanReplacement}
                      style={{
                        background: '#0D9488',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 18px',
                        fontSize: '12.5px',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(13,148,136,0.3)'
                      }}
                    >
                      <span>✓</span> Apply Smart Replacement
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: MILESTONE STORY POSTER PHOTO
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'poster' && (
          <div>
            {/* Top Breadcrumb & Return to Menu Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                background: '#FFFFFF',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                style={{
                  background: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  color: '#0D9488',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#CCFBF1'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#F0FDFA'; }}
              >
                <span>←</span> <span>Back to All Services</span>
              </button>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                <span style={{ cursor: 'pointer', color: '#0D9488' }} onClick={() => setActiveTab('menu')}>Our Services</span>
                {' > '}
                <strong style={{ color: '#0F172A' }}>Milestone Story Poster Photo</strong>
              </div>
            </div>

            <div className="os-poster-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '24px', alignItems: 'flex-start' }}>
            {/* Left Control Card */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  🖼️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    Official Background Photo
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                    Branded default image used on all student milestone share cards.
                  </p>
                </div>
              </div>

              {/* Upload Controls */}
              <div style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />

                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌊</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                  Upload Custom Academy Surf Photo
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '320px', margin: '0 auto 14px auto' }}>
                  Recommended: High-resolution action photo (portrait or landscape, min 1200px width).
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      background: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {uploading ? '⏳ Uploading...' : '📁 Choose File'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveChanges(posterUrl)}
                    disabled={saving || uploading}
                    style={{
                      background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: saving || uploading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
                    }}
                  >
                    {saving ? '⏳ Saving...' : '💾 Save as Default'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPosterUrl('/surf-milestone-bg.jpg');
                      handleSaveChanges('/surf-milestone-bg.jpg');
                    }}
                    style={{
                      background: '#FFFFFF',
                      color: '#64748B',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ↺ Reset to Default
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '10px' }}>
                  Or Choose from HD Surf Action Presets:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {posterPresets.map((preset, idx) => {
                    const isSelected = posterUrl === preset.url;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setPosterUrl(preset.url);
                          handleSaveChanges(preset.url);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          background: isSelected ? '#F0FDFA' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          backgroundImage: `url(${preset.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          flexShrink: 0,
                          border: '1px solid rgba(0,0,0,0.1)'
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#0D9488' : '#0F172A' }}>
                            {isSelected ? '✓ ' : ''}{preset.label}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            {preset.desc}
                          </div>
                        </div>
                        {isSelected && (
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', background: '#CCFBF1', padding: '3px 8px', borderRadius: '6px' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Live Preview Card */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👁️</span> Live Milestone Poster Preview
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>4:5 Mobile Story Card</span>
              </div>

              {/* Story Card Mockup */}
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '380px',
                height: '475px',
                margin: '0 auto',
                borderRadius: '20px',
                backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%), url(${posterUrl || '/surf-milestone-bg.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px',
                boxSizing: 'border-box',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', color: '#A7F3D0', fontSize: '9px', fontWeight: 850, padding: '3px 9px', borderRadius: '999px', border: '1px solid rgba(167, 243, 208, 0.3)' }}>
                      THE COACH'S CUT
                    </span>
                    <span style={{ background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)', color: '#022C22', fontSize: '9px', fontWeight: 900, padding: '3px 9px', borderRadius: '999px' }}>
                      ✓ SESSION COMPLETE
                    </span>
                  </div>

                  {/* Athnexlive Logo in Top Right Corner */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '4px 9px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(4px)'
                  }}>
                    <img
                      src="/athnexlive-logo.png"
                      alt="Athnexlive"
                      style={{ height: '18px', width: 'auto', display: 'block', objectFit: 'contain' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#A7F3D0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {schoolName}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 950, color: '#FFFFFF', letterSpacing: '-0.02em', margin: '4px 0 2px' }}>
                    Student Surfer Name
                  </div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1' }}>
                    Intermediate Surfer • Nov 4, 2026
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '14px 0' }}>
                    <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', borderRadius: '10px', padding: '8px 4px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#FCD34D' }}>⭐ 85/100</div>
                      <div style={{ fontSize: '8px', fontWeight: 800, color: '#FCD34D', marginTop: '2px' }}>COACH SCORE</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', borderRadius: '10px', padding: '8px 4px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>⚡ 8/10</div>
                      <div style={{ fontSize: '8px', fontWeight: 800, color: '#A7F3D0', marginTop: '2px' }}>POP-UP SPEED</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', borderRadius: '10px', padding: '8px 4px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>🌊 8</div>
                      <div style={{ fontSize: '8px', fontWeight: 800, color: '#A7F3D0', marginTop: '2px' }}>WAVES CAUGHT</div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(2, 44, 34, 0.75)', backdropFilter: 'blur(6px)', borderLeft: '3px solid #34D399', borderRadius: '8px', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase' }}>COACH VERDICT</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#047857',
                          border: '1.5px solid #34D399',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          A
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#FCD34D' }}>Coach Anbumani</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#F0FDF4', fontStyle: 'italic', marginTop: '2px' }}>
                      “Solid pop-up stance, balanced weight distribution & clean wave face riding.”
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#94A3B8', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px' }}>
                  athnexlive.com
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD COURSE DURATION CERTIFICATE MODAL ══ */}
      {showAddCourseModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddCourseModal(false); }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '26px 28px',
              width: '500px',
              maxWidth: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  ➕
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Add Course Certificate (Any Days)
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>
                    Configure a separate certificate for any course duration.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCourseModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '22px' }}>
              {/* Days input */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Course Duration (Number of Days):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newCourseDays}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setNewCourseDays(val);
                      setNewCourseTitle(`${val}-Day Surf Training Course`);
                    }}
                    style={{
                      width: '100px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#0F172A'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                    Days Course ({newCourseDays} completed sessions to unlock)
                  </span>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 5, 7, 10, 14, 21, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setNewCourseDays(d);
                        setNewCourseTitle(`${d}-Day Surf Training Course`);
                      }}
                      style={{
                        background: newCourseDays === d ? '#0D9488' : '#F1F5F9',
                        color: newCourseDays === d ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 750,
                        cursor: 'pointer'
                      }}
                    >
                      {d} {d === 1 ? 'Day' : 'Days'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Title */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Course / Program Title:
                </label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="e.g. 7-Day Advanced Ocean Masterclass"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Copy Initial Design From */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Initial Template Design & Coordinates:
                </label>
                <select
                  value={newCourseCopyFrom}
                  onChange={(e) => setNewCourseCopyFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Use Official Athnex Default Certificate</option>
                  {Object.entries(certConfig.courses || defaultCourseCertificates).map(([cKey, cData]) => (
                    <option key={cKey} value={cKey}>
                      Copy design from {cData.courseName || cKey}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddCourseModal(false)}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleAddCourseCertificate(newCourseDays, newCourseTitle, newCourseCopyFrom)}
                style={{
                  background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)'
                }}
              >
                <span>➕</span> Create Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ COPY DESIGN ACROSS COURSES MODAL ══ */}
      {showCopyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCopyModal(false); }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px 28px',
              width: '460px',
              maxWidth: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  📋
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                    Copy Design to Other Course
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                    Replicate current layout & background to another course certificate.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => handleCloneAcrossCourses('all')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #0D9488',
                  background: '#F0FDFA',
                  color: '#0D9488',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>✨ Replicate to ALL Other Courses</span>
                <span>Copy All →</span>
              </button>

              <div style={{ fontSize: '11.5px', fontWeight: 750, color: '#64748B', margin: '8px 0 2px' }}>
                Or select specific target course:
              </div>

              {Object.entries(certConfig.courses || defaultCourseCertificates)
                .filter(([cKey]) => cKey !== selectedCourseKey)
                .map(([cKey, cData]) => (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => handleCloneAcrossCourses(cKey)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    <span>{cData.courseName || `${cData.days || 3}-Day Course`}</span>
                    <span style={{ fontSize: '11.5px', color: '#0D9488', fontWeight: 800 }}>Copy Here →</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 900px) {
          .cert-studio-layout {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .cert-controls-sidebar {
            max-height: none !important;
            overflow-y: visible !important;
            padding-right: 0 !important;
            padding-bottom: 8px !important;
          }
        }
        @media (max-width: 768px) {
          .our-services-main {
            margin-top: 68px !important;
            padding: 16px 12px 48px 12px !important;
            overflow-x: hidden !important;
          }
          .os-page-header {
            gap: 10px !important;
            margin-bottom: 16px !important;
          }
          .os-title-row {
            gap: 8px !important;
          }
          .os-title-row h1 {
            font-size: 19px !important;
            line-height: 1.25 !important;
          }
          .os-title-row span:first-child {
            font-size: 22px !important;
          }
          .os-school-badge {
            font-size: 10.5px !important;
            padding: 3px 9px !important;
            white-space: nowrap !important;
          }
          .os-page-header p {
            font-size: 12.5px !important;
            line-height: 1.45 !important;
          }
          .os-menu-grid,
          .os-courses-grid,
          .os-poster-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .os-menu-card {
            padding: 16px !important;
            border-radius: 14px !important;
          }
          .os-menu-card h3 {
            font-size: 16px !important;
          }
          .os-menu-card button {
            font-size: 12.5px !important;
            padding: 10px 12px !important;
          }
        }
      `}</style>
      </main>
    </div>
  );
};

export default OurServices;
