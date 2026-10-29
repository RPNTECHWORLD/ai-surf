import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const getInitials = (name) => {
  if (!name) return 'SA';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function UserProfileMenu({ user, school, onLogout }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [switchFeedback, setSwitchFeedback] = useState('');
  const menuRef = useRef(null);

  // Modals state
  const [showGuestAdminModal, setShowGuestAdminModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Guest Admin Management State
  const [guestAdmins, setGuestAdmins] = useState([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [guestSuccess, setGuestSuccess] = useState('');
  const [guestForm, setGuestForm] = useState({ name: '', email: '', password: '' });
  const [copiedPasswordId, setCopiedPasswordId] = useState(null);
  const [revealedPasswords, setRevealedPasswords] = useState({});

  // Delete Account State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccessModal, setDeleteSuccessModal] = useState({
    isOpen: false,
    message: '',
    daysRemaining: 30
  });

  // Edit Profile State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editSchoolLocation, setEditSchoolLocation] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // Coach Edit Profile State
  const [coachInstructorId, setCoachInstructorId] = useState(null);
  const [editCoachDob, setEditCoachDob] = useState('');
  const [editCoachAge, setEditCoachAge] = useState('');
  const [editCoachGender, setEditCoachGender] = useState('Male');
  const [editCoachExperience, setEditCoachExperience] = useState('1');
  const [editCoachFitnessLevel, setEditCoachFitnessLevel] = useState('Beginner');
  const [editCoachRates, setEditCoachRates] = useState('');
  const [editCoachSchool, setEditCoachSchool] = useState('');
  const [editCoachLocation, setEditCoachLocation] = useState('');
  const [editCoachIsActive, setEditCoachIsActive] = useState(true);
  const [editCoachLanguages, setEditCoachLanguages] = useState(['English']);
  const [customEditLangInput, setCustomEditLangInput] = useState('');
  const [editCoachSpecializations, setEditCoachSpecializations] = useState([]);
  const [editCoachCertifications, setEditCoachCertifications] = useState('');
  const [schoolsList, setSchoolsList] = useState([]);
  const [schoolsData, setSchoolsData] = useState([]);

  // Student Edit Profile State
  const [studentRecordId, setStudentRecordId] = useState(null);
  const [editStudentDob, setEditStudentDob] = useState('');
  const [editStudentGender, setEditStudentGender] = useState('Male');
  const [editStudentLevel, setEditStudentLevel] = useState('Beginner');
  const [editStudentFitnessLevel, setEditStudentFitnessLevel] = useState('Intermediate');
  const [editStudentStance, setEditStudentStance] = useState('Regular');
  const [editStudentEmergencyName, setEditStudentEmergencyName] = useState('');
  const [editStudentEmergencyPhone, setEditStudentEmergencyPhone] = useState('');
  const [editStudentAddress, setEditStudentAddress] = useState('');

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const str = String(dobString).trim();
    const birthDate = new Date(str);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  const getSchoolLocation = (schoolName, list) => {
    if (!schoolName || schoolName === 'Individual / Freelance Coach') return '';
    const cleanName = schoolName.toLowerCase().trim();
    const found = (list || []).find(s => (s.name || '').toLowerCase().trim() === cleanName);
    if (found) {
      const city = (found.city || '').trim();
      const country = (found.country || '').trim();
      if (!city && !country) return '';
      if (!country) return city;
      if (!city) return country;
      if (city.toLowerCase().includes(country.toLowerCase())) return city;
      return `${city}, ${country}`;
    }
    if (cleanName.includes('dapoli')) return 'Dapoli, Maharashtra';
    if (cleanName.includes('mulki')) return 'Mulki / Mangalore, India';
    if (cleanName.includes('kovalam')) return 'Kovalam / Chennai, India';
    return '';
  };

  useEffect(() => {
    fetch(`${API}/api/schools`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSchoolsData(data);
          const names = data.map(s => s.name).filter(Boolean);
          setSchoolsList(Array.from(new Set(names)));
        }
      })
      .catch(() => {});
  }, []);

  // Location Auto-Suggest State
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationDebounceTimer = useRef(null);
  const locationDropdownRef = useRef(null);

  const POPULAR_LOCATIONS = [
    'Dapoli, Maharashtra',
    'Mulki, Karnataka',
    'Mangalore, Karnataka',
    'Kovalam, Chennai, Tamil Nadu',
    'Mahabalipuram, Tamil Nadu',
    'Varkala, Kerala',
    'Gokarna, Karnataka',
    'Goa, India',
    'Pondicherry, India',
    'Puri, Odisha',
    'Visakhapatnam, Andhra Pradesh',
    'Alappuzha, Kerala',
    'Kochi, Kerala',
    'Kozhikode, Kerala',
    'Kannur, Kerala',
    'Udupi, Karnataka',
    'Kanyakumari, Tamil Nadu',
    'Rameswaram, Tamil Nadu',
    'Manapad, Tamil Nadu',
    'Mumbai, Maharashtra',
    'Bengaluru, Karnataka',
    'Chennai, Tamil Nadu',
    'Andaman and Nicobar Islands',
    'Lakshadweep'
  ];

  const handleLocationInputChange = (val) => {
    setEditSchoolLocation(val);
    if (!val || val.trim().length === 0) {
      setLocationSuggestions(POPULAR_LOCATIONS.slice(0, 6));
      setShowLocationDropdown(true);
      return;
    }

    const query = val.trim().toLowerCase();
    const localMatches = POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(query));
    setLocationSuggestions(localMatches);
    setShowLocationDropdown(true);

    if (locationDebounceTimer.current) {
      clearTimeout(locationDebounceTimer.current);
    }

    if (val.trim().length >= 2) {
      locationDebounceTimer.current = setTimeout(async () => {
        try {
          setLocationSearching(true);
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val.trim())}&addressdetails=1&limit=6`, {
            headers: { 'Accept': 'application/json' }
          });
          const data = await res.json();
          if (Array.isArray(data)) {
            const apiSuggestions = data.map(item => {
              const addr = item.address || {};
              const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || item.name;
              const state = addr.state || addr.region || '';
              const country = addr.country || '';
              const parts = [city, state, country].filter(Boolean);
              return parts.length >= 2 ? parts.slice(0, 2).join(', ') : (item.display_name?.split(',').slice(0, 2).join(',') || item.name);
            }).filter(Boolean);

            const combined = Array.from(new Set([...localMatches, ...apiSuggestions]));
            setLocationSuggestions(combined.slice(0, 8));
            setShowLocationDropdown(true);
          }
        } catch (err) {
          // Keep local matches if offline / rate limited
        } finally {
          setLocationSearching(false);
        }
      }, 250);
    }
  };

  const selectLocationSuggestion = (loc) => {
    setEditSchoolLocation(loc);
    setShowLocationDropdown(false);
  };


  // Synchronized user state
  const [localUser, setLocalUser] = useState(() => {
    if (user) return user;
    try {
      const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (user) setLocalUser(user);
  }, [user]);

  useEffect(() => {
    const syncUser = () => {
      try {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (saved) setLocalUser(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('storage', syncUser);
    window.addEventListener('user_updated', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('user_updated', syncUser);
    };
  }, []);

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

  // Close menu on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowGuestAdminModal(false);
        setShowDeleteAccountModal(false);
        setShowLocationDropdown(false);
      }
    };

    if (isOpen || showGuestAdminModal || showDeleteAccountModal || showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showGuestAdminModal, showDeleteAccountModal, showLocationDropdown]);

  // Fetch Guest Admins for current school
  const fetchGuestAdmins = async () => {
    setGuestLoading(true);
    setGuestError('');
    try {
      const schName = typeof school?.name === 'string' ? school.name : (school?.name?.name || user?.school_name || user?.school || '');
      const schId = school?.id || user?.school_id;
      let url = `${API}/api/school/guest-admins?`;
      if (schId) url += `school_id=${schId}&`;
      if (schName) url += `school_name=${encodeURIComponent(schName)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGuestAdmins(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load guest admins:', err);
    } finally {
      setGuestLoading(false);
    }
  };

  useEffect(() => {
    if (showGuestAdminModal) {
      fetchGuestAdmins();
    }
  }, [showGuestAdminModal]);

  // Handle Create Guest Admin
  const handleCreateGuestAdmin = async (e) => {
    e.preventDefault();
    setGuestError('');
    setGuestSuccess('');

    if (!guestForm.email.trim() || !guestForm.password.trim()) {
      setGuestError('Email/ID and Password are required.');
      return;
    }
    if (guestForm.password.length < 4) {
      setGuestError('Password must be at least 4 characters.');
      return;
    }

    setGuestLoading(true);
    try {
      const schName = typeof school?.name === 'string' ? school.name : (school?.name?.name || user?.school_name || user?.school || '');
      const schId = school?.id || user?.school_id;

      const res = await fetch(`${API}/api/school/guest-admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guestForm.name.trim() || 'Guest Admin',
          email: guestForm.email.trim(),
          password: guestForm.password,
          school_name: schName,
          school_id: schId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create Guest Admin.');
      }

      setGuestSuccess(`Guest Admin "${data.email}" created successfully! They can now log in and access all pages.`);
      setGuestForm({ name: '', email: '', password: '' });
      fetchGuestAdmins();
    } catch (err) {
      setGuestError(err.message || 'Failed to create Guest Admin.');
    } finally {
      setGuestLoading(false);
    }
  };

  // Handle Delete Guest Admin
  const handleDeleteGuestAdmin = async (guestId, guestEmail) => {
    if (!window.confirm(`Are you sure you want to revoke and delete Guest Admin "${guestEmail}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/api/school/guest-admins/${guestId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setGuestSuccess(`Guest Admin "${guestEmail}" deleted successfully.`);
        fetchGuestAdmins();
      }
    } catch (err) {
      setGuestError('Failed to delete guest admin.');
    }
  };

  const handleCopyPassword = async (guestId, password) => {
    if (!password) {
      setGuestError('No password available for this guest admin.');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(password);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = password;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedPasswordId(guestId);
      setTimeout(() => setCopiedPasswordId(null), 2500);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const toggleRevealPassword = (guestId) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [guestId]: !prev[guestId]
    }));
  };

  // Handle Delete My Account (Password verification & 30-Day Retention Grace Period)
  const handleDeleteMyAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your account password to authorize deletion.');
      return;
    }
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE in the confirmation box.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API}/api/users/delete-my-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          email: user?.email,
          password: deletePassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to schedule account deletion.');
      }

      // Close confirmation dialog and open software UI success modal
      setShowDeleteAccountModal(false);
      setDeleteSuccessModal({
        isOpen: true,
        message: data.message || 'Your account has been scheduled for deletion. All your data is safely retained for 7 days. You can log back in anytime within 7 days to retain and restore your account.',
        daysRemaining: data.days_remaining || 7
      });
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleProceedAfterDeletion = () => {
    sessionStorage.clear();
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('activeSchool');
    setDeleteSuccessModal({ isOpen: false, message: '', daysRemaining: 7 });
    navigate('/auth');
  };

  const effectiveUser = localUser || user;
  const effectiveImage = effectiveUser?.image || effectiveUser?.school_logo || school?.logo || '';
  const userName = effectiveUser?.name || effectiveUser?.username || (typeof school?.owner === 'string' ? school.owner : '') || 'School Admin';
  const userEmail = effectiveUser?.email || (effectiveUser?.role === 'admin' ? 'admin@athnexlive.com' : 'user@athnexlive.com');
  const userInitials = getInitials(userName);
  const currentRole = effectiveUser?.role || 'admin';
  const currentSchoolName = typeof school?.name === 'string' ? school.name : (school?.name?.name || effectiveUser?.school_name || effectiveUser?.school || '');

  const isSchoolAdmin = currentRole === 'admin' || !user?.role;
  const isGuestAdmin = currentRole === 'guest_admin';
  const isCoach = currentRole === 'coach' || currentRole === 'instructor';
  const isStudent = currentRole === 'athlete' || currentRole === 'student';
  const isCoachSchoolAffiliated = Boolean(editCoachSchool) && editCoachSchool !== 'Individual / Freelance Coach';

  const storedSchool = (() => {
    try {
      const s = sessionStorage.getItem('activeSchool') || localStorage.getItem('activeSchool');
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  })();

  const currentSchoolLocation = school?.city || school?.location || storedSchool?.city || storedSchool?.location || effectiveUser?.school_location || effectiveUser?.location || '';

  const openEditProfileModal = async () => {
    const u = effectiveUser;
    setEditName(u?.name || u?.username || (typeof school?.owner === 'string' ? school.owner : '') || '');
    setEditPhone(u?.phone || u?.whatsapp_number || school?.phone || '');
    setEditSchoolName(typeof school?.name === 'string' ? school.name : (u?.school_name || u?.school || ''));
    setEditSchoolLocation(currentSchoolLocation || '');
    setEditBio(u?.bio || '');
    setEditImagePreview(effectiveImage);
    setEditImageFile(null);
    setEditError('');
    setEditSuccessMsg('');

    if (isCoach) {
      setEditCoachDob(u?.dob || '');
      setEditCoachAge(u?.age || (u?.dob ? calculateAge(u?.dob) : '') || '');
      setEditCoachGender(u?.gender || 'Male');
      setEditCoachExperience(String(u?.experience || '1').replace(/[^0-9]/g, '') || '1');
      setEditCoachFitnessLevel(u?.fitness_level || 'Beginner');
      setEditCoachRates(u?.rates || '');
      const uSchool = u?.school || currentSchoolName || 'Individual / Freelance Coach';
      setEditCoachSchool(uSchool);
      setEditCoachLocation(u?.location || currentSchoolLocation || '');
      setEditCoachIsActive(u?.is_active !== false);

      let langs = u?.languages;
      if (typeof langs === 'string') {
        try { langs = JSON.parse(langs); } catch(e) { langs = [langs]; }
      }
      setEditCoachLanguages(Array.isArray(langs) && langs.length > 0 ? langs : ['English']);

      let specs = u?.specializations;
      if (typeof specs === 'string') {
        try { specs = JSON.parse(specs); } catch(e) { specs = []; }
      }
      setEditCoachSpecializations(Array.isArray(specs) ? specs : []);

      let certs = u?.certifications;
      if (Array.isArray(certs)) {
        certs = certs.join('\n');
      } else if (typeof certs === 'string' && certs.startsWith('[')) {
        try { certs = JSON.parse(certs).join('\n'); } catch(e) {}
      }
      setEditCoachCertifications(certs || '');

      setShowEditProfileModal(true);

      // Fetch fresh data from backend
      try {
        const coachId = u?.instructor_id || u?.id;
        const [schRes, instRes] = await Promise.all([
          fetch(`${API}/api/schools`).catch(() => null),
          (async () => {
            let found = null;
            if (coachId) {
              try {
                const r = await fetch(`${API}/api/instructors/${coachId}`);
                if (r.ok) found = await r.json();
              } catch(e) {}
            }
            if (!found) {
              try {
                const r = await fetch(`${API}/api/instructors`);
                if (r.ok) {
                  const list = await r.json();
                  if (Array.isArray(list)) {
                    found = list.find(i =>
                      (coachId && String(i.id) === String(coachId)) ||
                      (coachId && String(i.user_id) === String(coachId)) ||
                      (u?.email && i.email && i.email.toLowerCase().trim() === u.email.toLowerCase().trim()) ||
                      (u?.name && i.name && i.name.toLowerCase().trim() === u.name.toLowerCase().trim())
                    );
                  }
                }
              } catch(e) {}
            }
            return found;
          })()
        ]);

        if (schRes && schRes.ok) {
          const sData = await schRes.json();
          if (Array.isArray(sData)) {
            setSchoolsData(sData);
            setSchoolsList(Array.from(new Set(sData.map(s => s.name).filter(Boolean))));
          }
        }

        if (instRes) {
          setCoachInstructorId(instRes.id);
          if (instRes.name) setEditName(instRes.name);
          if (instRes.phone) setEditPhone(instRes.phone);
          if (instRes.image) setEditImagePreview(instRes.image);
          if (instRes.dob) setEditCoachDob(instRes.dob);
          if (instRes.age || instRes.dob) setEditCoachAge(instRes.age || calculateAge(instRes.dob) || '');
          if (instRes.gender) setEditCoachGender(instRes.gender);
          if (instRes.experience) setEditCoachExperience(String(instRes.experience).replace(/[^0-9]/g, '') || '1');
          if (instRes.fitness_level) setEditCoachFitnessLevel(instRes.fitness_level);
          if (instRes.rates) setEditCoachRates(instRes.rates);
          if (instRes.school) setEditCoachSchool(instRes.school);
          if (instRes.location) setEditCoachLocation(instRes.location);
          if (instRes.is_active !== undefined) setEditCoachIsActive(instRes.is_active !== false);
          if (instRes.bio) setEditBio(instRes.bio);

          let freshLangs = instRes.languages;
          if (typeof freshLangs === 'string') {
            try { freshLangs = JSON.parse(freshLangs); } catch(e) { freshLangs = [freshLangs]; }
          }
          if (Array.isArray(freshLangs) && freshLangs.length > 0) setEditCoachLanguages(freshLangs);

          let freshSpecs = instRes.specializations;
          if (typeof freshSpecs === 'string') {
            try { freshSpecs = JSON.parse(freshSpecs); } catch(e) { freshSpecs = []; }
          }
          if (Array.isArray(freshSpecs)) setEditCoachSpecializations(freshSpecs);

          let freshCerts = instRes.certifications;
          if (Array.isArray(freshCerts)) {
            freshCerts = freshCerts.join('\n');
          } else if (typeof freshCerts === 'string' && freshCerts.startsWith('[')) {
            try { freshCerts = JSON.parse(freshCerts).join('\n'); } catch(e) {}
          }
          if (freshCerts) setEditCoachCertifications(freshCerts);
        }
      } catch (err) {
        console.error('Error fetching fresh coach details:', err);
      }
    } else if (isStudent) {
      setEditStudentDob(u?.dob || '');
      setEditStudentGender(u?.gender || 'Male');
      setEditStudentLevel(u?.level || 'Beginner');
      setEditStudentFitnessLevel(u?.fitness_level || 'Intermediate');
      setEditStudentStance(u?.stance || 'Regular');
      setEditStudentEmergencyName(u?.emergency_contact_name || '');
      setEditStudentEmergencyPhone(u?.emergency_contact_phone || '');
      setEditStudentAddress(u?.address || '');
      setShowEditProfileModal(true);

      try {
        const stId = u?.student_id || u?.id;
        const res = await fetch(`${API}/api/students/${stId}`);
        if (res.ok) {
          const stData = await res.json();
          setStudentRecordId(stData.id);
          if (stData.name) setEditName(stData.name);
          if (stData.whatsapp_number || stData.phone) setEditPhone(stData.whatsapp_number || stData.phone);
          if (stData.image) setEditImagePreview(stData.image);
          if (stData.dob) setEditStudentDob(stData.dob);
          if (stData.gender) setEditStudentGender(stData.gender);
          if (stData.level) setEditStudentLevel(stData.level);
          if (stData.fitness_level) setEditStudentFitnessLevel(stData.fitness_level);
          if (stData.stance) setEditStudentStance(stData.stance);
          if (stData.emergency_contact_name) setEditStudentEmergencyName(stData.emergency_contact_name);
          if (stData.emergency_contact_phone) setEditStudentEmergencyPhone(stData.emergency_contact_phone);
          if (stData.address) setEditStudentAddress(stData.address);
          if (stData.bio) setEditBio(stData.bio);
        }
      } catch(e) {}
    } else {
      setShowEditProfileModal(true);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setEditError('Image size should be less than 10MB.');
        return;
      }
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
      if (editError) setEditError('');
    }
  };

  const handleRemoveImage = () => {
    setEditImageFile(null);
    setEditImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError('');
    setEditSuccessMsg('');

    try {
      let finalImageUrl = editImagePreview;

      // Upload file if new file was selected
      if (editImageFile) {
        setEditUploading(true);
        const fd = new FormData();
        fd.append('file', editImageFile);
        const upRes = await fetch(`${API}/api/upload-image`, {
          method: 'POST',
          body: fd
        });
        if (!upRes.ok) {
          throw new Error('Failed to upload image. Please try again.');
        }
        const upData = await upRes.json();
        finalImageUrl = upData.url || upData.image_url || '';
        setEditUploading(false);
      }

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');

      if (isCoach) {
        if (!editName.trim()) throw new Error('Full Name is required.');
        if (!editPhone.trim()) throw new Error('Phone Number is required.');
        if (!editCoachDob) throw new Error('Date of Birth is required.');
        if (!editCoachRates.trim()) throw new Error('Hourly Rate is required.');
        if (!editBio.trim()) throw new Error('Bio is required.');

        if (editCoachIsActive) {
          const origSchool = (effectiveUser?.school || 'Individual / Freelance Coach').trim().toLowerCase();
          const newSchool = (editCoachSchool || 'Individual / Freelance Coach').trim().toLowerCase();
          if (origSchool && origSchool !== 'individual / freelance coach' && origSchool !== newSchool) {
            throw new Error(`Active coaches cannot switch schools. Your School Admin must set your status to Inactive before transferring to another school.`);
          }
        }

        const calcAge = calculateAge(editCoachDob);
        const finalLocation = isCoachSchoolAffiliated
          ? (getSchoolLocation(editCoachSchool, schoolsData) || editCoachLocation)
          : editCoachLocation;

        const coachPayload = {
          name: editName.trim(),
          phone: editPhone.trim(),
          dob: editCoachDob,
          age: calcAge || (editCoachAge ? parseInt(editCoachAge) : null),
          gender: editCoachGender || 'Male',
          experience: editCoachExperience,
          fitness_level: editCoachFitnessLevel,
          rates: editCoachRates.trim(),
          location: finalLocation || '',
          school: editCoachSchool || 'Individual / Freelance Coach',
          bio: editBio.trim(),
          languages: editCoachLanguages && editCoachLanguages.length > 0 ? editCoachLanguages : ['English'],
          specializations: editCoachSpecializations,
          certifications: Array.isArray(editCoachCertifications)
            ? editCoachCertifications
            : String(editCoachCertifications || '').split('\n').map(c => c.trim()).filter(Boolean),
          image: finalImageUrl && !finalImageUrl.startsWith('blob:') ? finalImageUrl : undefined
        };

        const targetInstId = coachInstructorId || effectiveUser?.instructor_id || effectiveUser?.id;
        if (targetInstId) {
          try {
            await fetch(`${API}/api/instructors/${targetInstId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(coachPayload)
            });
          } catch(e) {
            console.error('Error updating instructor record:', e);
          }
        }

        const res = await fetch(`${API}/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: effectiveUser?.id,
            email: effectiveUser?.email,
            ...coachPayload
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to update profile.');
        }

        const updatedUser = {
          ...effectiveUser,
          ...coachPayload,
          school_name: coachPayload.school,
          school_location: coachPayload.location,
          image: finalImageUrl || effectiveUser?.image
        };

        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setLocalUser(updatedUser);

        window.dispatchEvent(new Event('user_updated'));
        window.dispatchEvent(new Event('storage'));

        setEditSuccessMsg('Coach profile updated successfully!');
        setTimeout(() => {
          setShowEditProfileModal(false);
          setEditSuccessMsg('');
        }, 1200);
        return;
      }

      if (isStudent) {
        const calcAge = calculateAge(editStudentDob);
        const studentPayload = {
          name: editName.trim(),
          whatsapp_number: editPhone.trim(),
          phone: editPhone.trim(),
          dob: editStudentDob,
          age: calcAge,
          gender: editStudentGender,
          level: editStudentLevel,
          fitness_level: editStudentFitnessLevel,
          stance: editStudentStance,
          emergency_contact_name: editStudentEmergencyName,
          emergency_contact_phone: editStudentEmergencyPhone,
          address: editStudentAddress,
          bio: editBio.trim(),
          image: finalImageUrl && !finalImageUrl.startsWith('blob:') ? finalImageUrl : undefined
        };

        const targetStId = studentRecordId || effectiveUser?.student_id || effectiveUser?.id;
        if (targetStId) {
          try {
            await fetch(`${API}/api/students/${targetStId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(studentPayload)
            });
          } catch(e) {}
        }

        const res = await fetch(`${API}/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: effectiveUser?.id,
            email: effectiveUser?.email,
            ...studentPayload
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to update profile.');
        }

        const updatedUser = {
          ...effectiveUser,
          ...studentPayload,
          image: finalImageUrl || effectiveUser?.image
        };

        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setLocalUser(updatedUser);

        window.dispatchEvent(new Event('user_updated'));
        window.dispatchEvent(new Event('storage'));

        setEditSuccessMsg('Student profile updated successfully!');
        setTimeout(() => {
          setShowEditProfileModal(false);
          setEditSuccessMsg('');
        }, 1200);
        return;
      }

      // If School Admin (default)
      const res = await fetch(`${API}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: effectiveUser?.id,
          email: effectiveUser?.email,
          name: editName.trim(),
          phone: editPhone.trim(),
          image: finalImageUrl,
          school_name: isSchoolAdmin ? editSchoolName.trim() : undefined,
          school_location: isSchoolAdmin ? editSchoolLocation.trim() : undefined,
          bio: editBio.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update profile.');
      }

      const updatedUser = data.user || {
        ...effectiveUser,
        name: editName.trim(),
        phone: editPhone.trim(),
        image: finalImageUrl,
        school_name: isSchoolAdmin ? editSchoolName.trim() : effectiveUser?.school_name
      };

      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setLocalUser(updatedUser);

      if (isSchoolAdmin && editSchoolName.trim()) {
        const curSch = {
          name: editSchoolName.trim(),
          owner: editName.trim(),
          logo: finalImageUrl,
          city: editSchoolLocation.trim(),
          location: editSchoolLocation.trim()
        };
        sessionStorage.setItem('activeSchool', JSON.stringify(curSch));
        localStorage.setItem('activeSchool', JSON.stringify(curSch));
      }

      window.dispatchEvent(new Event('user_updated'));
      window.dispatchEvent(new Event('storage'));

      setEditSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setShowEditProfileModal(false);
        setEditSuccessMsg('');
      }, 1000);
    } catch (err) {
      setEditError(err.message || 'Error updating profile.');
    } finally {
      setEditSaving(false);
      setEditUploading(false);
    }
  };

  const showFeedback = (msg) => {
    setSwitchFeedback(msg);
    setTimeout(() => setSwitchFeedback(''), 2500);
  };

  const roleDisplayNames = {
    admin: 'School Admin',
    guest_admin: 'Guest Admin',
    coach: 'Surf Coach',
    athlete: 'Student',
    student: 'Student',
    guest: 'Guest Viewer',
    superadmin: 'Super Admin'
  };

  return (
    <div className="db-profile-menu-container" ref={menuRef} style={{ position: 'relative' }}>
      {/* Profile Trigger Button in Top Header */}
      <button
        type="button"
        className="db-header-profile-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: 'pointer',
          padding: '5px 12px 5px 14px',
          borderRadius: '12px',
          background: isOpen
            ? 'rgba(0, 209, 178, 0.14)'
            : 'rgba(255, 255, 255, 0.08)',
          border: isOpen
            ? '1.5px solid #00D1B2'
            : '1.5px solid rgba(255, 255, 255, 0.18)',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(0, 209, 178, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 2px 6px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          outline: 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          userSelect: 'none',
          fontFamily: "'Outfit', 'Inter', sans-serif"
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.borderColor = '#00D1B2';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 209, 178, 0.25)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
        title="Open Profile Menu"
      >
        <div className="db-header-usertext" style={{ textAlign: 'right' }}>
          <div className="db-header-user-name" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
            {userName}
          </div>
          {currentSchoolName && (
            <div className="db-header-school-name" style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSchoolName}
            </div>
          )}
          <div className="db-header-user-role" style={{ fontSize: '10px', fontWeight: 700, color: isGuestAdmin ? '#F59E0B' : '#00D1B2', textTransform: 'capitalize' }}>
            {roleDisplayNames[currentRole] || currentRole}
          </div>
        </div>

        {/* Avatar Circle */}
        <div
          className="db-header-avatar"
          style={{
            backgroundImage: effectiveImage ? `url(${effectiveImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: isGuestAdmin ? '#F59E0B' : '#0D9488',
            boxShadow: isOpen ? '0 0 0 2px #00D1B2' : 'none',
            border: '1.5px solid rgba(255, 255, 255, 0.4)',
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '12px'
          }}
        >
          {!effectiveImage && userInitials}
        </div>

        {/* Distinct Button Chevron Badge */}
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: isOpen ? '#00D1B2' : 'rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isOpen ? '#0B0E17' : '#FFFFFF'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div
          className="db-profile-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '320px',
            background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
            border: theme === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
            borderRadius: '16px',
            boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            overflow: 'hidden',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            animation: 'profileDropdownFade 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header Identity Card */}
          <div
            style={{
              padding: '16px',
              background: theme === 'dark'
                ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(30, 41, 59, 1) 100%)'
                : 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(240, 253, 250, 0.6) 100%)',
              borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundImage: effectiveImage ? `url(${effectiveImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: isGuestAdmin ? '#F59E0B' : '#0D9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '16px',
                boxShadow: isGuestAdmin ? '0 4px 12px rgba(245, 158, 11, 0.35)' : '0 4px 12px rgba(13, 148, 136, 0.35)',
                flexShrink: 0,
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.4)'
              }}
            >
              {!effectiveImage && userInitials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14.5px',
                  fontWeight: 800,
                  color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: theme === 'dark' ? '#94A3B8' : '#64748B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '1px'
                }}
              >
                {userEmail}
              </div>
              <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: isGuestAdmin ? '#F59E0B' : '#0D9488',
                    color: '#FFFFFF',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}
                >
                  {roleDisplayNames[currentRole] || currentRole}
                </span>
                {currentSchoolName && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: theme === 'dark' ? '#334155' : '#F1F5F9',
                      color: theme === 'dark' ? '#CBD5E1' : '#475569',
                      maxWidth: '160px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={currentSchoolName}
                  >
                    🏫 {currentSchoolName}
                  </span>
                )}
                {currentSchoolLocation && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: theme === 'dark' ? '#1E293B' : '#F0FDFA',
                      color: theme === 'dark' ? '#2DD4BF' : '#0F766E',
                      border: theme === 'dark' ? '1px solid #115E59' : '1px solid #99F6E4',
                      maxWidth: '170px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={`Location: ${currentSchoolLocation}`}
                  >
                    📍 {currentSchoolLocation}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Banner */}
          {switchFeedback && (
            <div
              style={{
                background: '#ECFDF5',
                borderBottom: '1px solid #A7F3D0',
                color: '#065F46',
                padding: '7px 14px',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>✓</span> {switchFeedback}
            </div>
          )}

          {/* EDIT PROFILE ACTION (Available for School Admin, Coach, Student) */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #F1F5F9'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openEditProfileModal();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '10px',
                border: theme === 'dark' ? '1px solid #1E3A8A' : '1px solid #DBEAFE',
                background: theme === 'dark' ? 'rgba(30, 58, 138, 0.22)' : '#EFF6FF',
                color: '#2563EB',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                fontFamily: "'Outfit', sans-serif"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563EB';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(30, 58, 138, 0.22)' : '#EFF6FF';
                e.currentTarget.style.color = '#2563EB';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>✏️</span>
                <span>Edit Profile</span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 800
                }}
              >
                {isSchoolAdmin ? 'Logo & Info' : 'Photo & Info'}
              </span>
            </button>
          </div>

          {/* GUEST ADMIN ACTION (Only available for School Admin) */}
          {isSchoolAdmin && (
            <div
              style={{
                padding: '8px 12px',
                borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #F1F5F9'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowGuestAdminModal(true);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: theme === 'dark' ? '1px solid #115E59' : '1px solid #CCFBF1',
                  background: theme === 'dark' ? 'rgba(13, 148, 136, 0.15)' : '#F0FDFA',
                  color: '#0D9488',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  fontFamily: "'Outfit', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0D9488';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(13, 148, 136, 0.15)' : '#F0FDFA';
                  e.currentTarget.style.color = '#0D9488';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px' }}>🛡️</span>
                  <span>Guest Admin Access</span>
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    fontWeight: 800
                  }}
                >
                  Create
                </span>
              </button>
            </div>
          )}

          {/* 3. DANGER ACTIONS: DELETE ACCOUNT & LOGOUT */}
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Delete My Account Button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setDeleteConfirmText('');
                setDeletePassword('');
                setShowDeletePassword(false);
                setDeleteError('');
                setShowDeleteAccountModal(true);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px dashed #FECACA',
                background: 'transparent',
                color: '#EF4444',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: "'Outfit', sans-serif"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.border = '1px solid #EF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.border = '1px dashed #FECACA';
              }}
            >
              <span>🗑️</span>
              <span>Delete My Account</span>
            </button>

            {/* Log Out Button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '9px',
                border: theme === 'dark' ? '1px solid #7F1D1D' : '1px solid #FEE2E2',
                background: theme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FFF5F5',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: "'Outfit', sans-serif"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EF4444';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FFF5F5';
                e.currentTarget.style.color = '#EF4444';
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: GUEST ADMIN MANAGEMENT (Create & Manage Guest Admins)
          ========================================================================= */}
      {showGuestAdminModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuestAdminModal(false);
          }}
        >
          <div
            style={{
              width: '520px',
              maxWidth: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
              border: theme === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              fontFamily: "'Outfit', sans-serif",
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: theme === 'dark' ? '#0F172A' : '#F8FAFC',
                borderRadius: '20px 20px 0 0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '17px',
                      fontWeight: 800,
                      color: theme === 'dark' ? '#F8FAFC' : '#0F172A'
                    }}
                  >
                    Guest Admin Management
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Create temporary credentials to access all pages of {currentSchoolName || 'this school'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuestAdminModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#94A3B8'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Alert Feedback */}
              {guestError && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '16px'
                  }}
                >
                  ⚠️ {guestError}
                </div>
              )}
              {guestSuccess && (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#15803D',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '16px'
                  }}
                >
                  ✓ {guestSuccess}
                </div>
              )}

              {/* Create Form */}
              <form onSubmit={handleCreateGuestAdmin}>
                <div style={{ marginBottom: '14px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: theme === 'dark' ? '#CBD5E1' : '#334155',
                      marginBottom: '6px'
                    }}
                  >
                    Guest Admin Title / Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Guest Auditor / Event Manager"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: theme === 'dark' ? '1.5px solid #334155' : '1.5px solid #CBD5E1',
                      background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                      color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: theme === 'dark' ? '#CBD5E1' : '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Login ID / Email *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. guest.inspector@surf.com"
                      value={guestForm.email}
                      onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: theme === 'dark' ? '1.5px solid #334155' : '1.5px solid #CBD5E1',
                        background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none',
                        fontFamily: "'Outfit', sans-serif"
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: theme === 'dark' ? '#CBD5E1' : '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Password *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Guest@123"
                      value={guestForm.password}
                      onChange={(e) => setGuestForm({ ...guestForm, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: theme === 'dark' ? '1.5px solid #334155' : '1.5px solid #CBD5E1',
                        background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none',
                        fontFamily: "'Outfit', sans-serif"
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guestLoading}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: guestLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                    fontFamily: "'Outfit', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {guestLoading ? (
                    'Creating Guest Admin...'
                  ) : (
                    <>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '19px',
                          height: '19px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.22)',
                          color: '#FFFFFF',
                          fontSize: '16px',
                          fontWeight: 900,
                          lineHeight: 1
                        }}
                      >
                        +
                      </span>
                      <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                        Create Guest Admin Account
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Existing Guest Admins List */}
              <div style={{ marginTop: '28px' }}>
                <h4
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#64748B',
                    marginBottom: '12px'
                  }}
                >
                  Active Guest Admins ({guestAdmins.length})
                </h4>

                {guestAdmins.length === 0 ? (
                  <div
                    style={{
                      padding: '20px',
                      textAlign: 'center',
                      borderRadius: '12px',
                      background: theme === 'dark' ? '#0F172A' : '#F8FAFC',
                      color: '#94A3B8',
                      fontSize: '12.5px'
                    }}
                  >
                    No guest admins created yet for {currentSchoolName || 'this school'}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {guestAdmins.map((ga) => (
                      <div
                        key={ga.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: theme === 'dark' ? '#0F172A' : '#F8FAFC',
                          border: theme === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '13.5px',
                                fontWeight: 700,
                                color: theme === 'dark' ? '#F8FAFC' : '#0F172A'
                              }}
                            >
                              {ga.name}
                            </span>
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#F59E0B',
                                color: '#FFFFFF',
                                letterSpacing: '0.4px',
                                textTransform: 'uppercase'
                              }}
                            >
                              Guest Admin
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                            ID / Email: <strong style={{ color: theme === 'dark' ? '#E2E8F0' : '#1E293B' }}>{ga.email}</strong>
                          </div>

                          {/* Password Display & Copy Row */}
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#64748B',
                              marginTop: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <span>Password:</span>
                            <code
                              style={{
                                background: theme === 'dark' ? '#1E293B' : '#E2E8F0',
                                color: theme === 'dark' ? '#38BDF8' : '#0369A1',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                letterSpacing: revealedPasswords[ga.id] ? '0.3px' : '2px',
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                              }}
                            >
                              {revealedPasswords[ga.id]
                                ? (ga.password_plain || ga.password || '••••••••')
                                : '••••••••'}
                            </code>

                            {/* View / Hide button */}
                            <button
                              type="button"
                              onClick={() => toggleRevealPassword(ga.id)}
                              title={revealedPasswords[ga.id] ? 'Hide password' : 'View password'}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                padding: '2px 4px',
                                color: '#64748B',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              {revealedPasswords[ga.id] ? '🙈' : '👁️'}
                            </button>

                            {/* Copy Password Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(ga.id, ga.password_plain || ga.password)}
                              title="Copy password to clipboard"
                              style={{
                                background: copiedPasswordId === ga.id ? '#DCFCE7' : (theme === 'dark' ? '#1E293B' : '#FFFFFF'),
                                border: `1px solid ${copiedPasswordId === ga.id ? '#86EFAC' : (theme === 'dark' ? '#475569' : '#CBD5E1')}`,
                                color: copiedPasswordId === ga.id ? '#15803D' : (theme === 'dark' ? '#F8FAFC' : '#334155'),
                                borderRadius: '6px',
                                padding: '3px 9px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}
                            >
                              <span>{copiedPasswordId === ga.id ? '✓' : '📋'}</span>
                              <span>{copiedPasswordId === ga.id ? 'Copied!' : 'Copy Password'}</span>
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteGuestAdmin(ga.id, ga.email)}
                          style={{
                            background: '#FEE2E2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            borderRadius: '7px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }}
                          title="Revoke and delete this guest admin account"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DELETE MY ACCOUNT CONFIRMATION (30-DAY RETENTION POLICY)
          ========================================================================= */}
      {showDeleteAccountModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteAccountModal(false);
          }}
        >
          <div
            style={{
              width: '480px',
              maxWidth: '100%',
              background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.3)',
              fontFamily: "'Outfit', sans-serif",
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                background: theme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                borderBottom: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                ⏳
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#DC2626' }}>
                    Schedule Account Deletion
                  </h3>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      background: '#FEE2E2',
                      color: '#991B1B',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    30-Day Grace Period
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: theme === 'dark' ? '#CBD5E1' : '#64748B' }}>
                  Account for <strong>{userEmail}</strong>
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px' }}>
              {deleteError && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>⚠️</span>
                  <span>{deleteError}</span>
                </div>
              )}

              {/* 30-Day Retention Notice Card */}
              <div
                style={{
                  background: theme === 'dark' ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF',
                  border: `1px solid ${theme === 'dark' ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD'}`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px' }}>🛡️</span>
                  <strong style={{ fontSize: '12.5px', color: theme === 'dark' ? '#38BDF8' : '#0369A1' }}>
                    30-Day Data Retention Guarantee
                  </strong>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '18px',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: theme === 'dark' ? '#CBD5E1' : '#334155'
                  }}
                >
                  <li>Your account access will be deactivated immediately.</li>
                  <li><strong>Your data will NOT be deleted now.</strong> All student records, sessions, instructors, and reports remain safely preserved for <strong>7 days</strong>.</li>
                  <li><strong>How to retain:</strong> If you change your mind, simply log back in with your password within 7 days to retain and restore your account along with all your data.</li>
                  <li>After 7 days, un-retained accounts and associated data are permanently wiped.</li>
                </ul>
              </div>

              {/* Password Input (MANDATORY SECURITY CONFIRMATION) */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: theme === 'dark' ? '#E2E8F0' : '#334155',
                    marginBottom: '6px'
                  }}
                >
                  Account Password <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    placeholder="Enter your account password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      if (deleteError) setDeleteError('');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                      color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                      fontSize: '13px',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#EF4444')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                    title={showDeletePassword ? 'Hide password' : 'Show password'}
                  >
                    {showDeletePassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                  Confirm your identity by entering your current password.
                </span>
              </div>

              {/* Text Confirmation Input */}
              <div style={{ marginBottom: '22px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: theme === 'dark' ? '#E2E8F0' : '#334155',
                    marginBottom: '6px'
                  }}
                >
                  Type <strong>DELETE</strong> below to confirm <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => {
                    setDeleteConfirmText(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                    color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                    outline: 'none',
                    letterSpacing: '1px'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#EF4444')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: theme === 'dark' ? '#334155' : '#FFFFFF',
                    color: theme === 'dark' ? '#F8FAFC' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteMyAccount}
                  disabled={
                    deleteLoading ||
                    !deletePassword.trim() ||
                    deleteConfirmText.trim().toUpperCase() !== 'DELETE'
                  }
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background:
                      deletePassword.trim() && deleteConfirmText.trim().toUpperCase() === 'DELETE'
                        ? '#DC2626'
                        : '#FCA5A5',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor:
                      deletePassword.trim() &&
                      deleteConfirmText.trim().toUpperCase() === 'DELETE' &&
                      !deleteLoading
                        ? 'pointer'
                        : 'not-allowed',
                    boxShadow:
                      deletePassword.trim() && deleteConfirmText.trim().toUpperCase() === 'DELETE'
                        ? '0 4px 14px rgba(220, 38, 38, 0.4)'
                        : 'none',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {deleteLoading ? (
                    <>
                      <span>⏳</span>
                      <span>Scheduling Deletion...</span>
                    </>
                  ) : (
                    <>
                      <span>🗑️</span>
                      <span>Schedule Deletion (7 Days)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IN-APP SOFTWARE UI MODAL: DELETION SCHEDULED SUCCESS ── */}
      {deleteSuccessModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
              color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '460px',
              padding: '32px 28px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            {/* Top Hourglass Icon with Glowing Ring */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '2px solid rgba(245, 158, 11, 0.35)',
                boxShadow: '0 0 24px rgba(245, 158, 11, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                marginBottom: '16px'
              }}
            >
              ⏳
            </div>

            {/* Title & Grace Period Badge */}
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800 }}>
              Account Deletion Scheduled
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  color: '#92400E',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 12px',
                  borderRadius: '20px'
                }}
              >
                30-Day Retention Grace Period Active
              </span>
            </div>

            {/* In-App Information Card */}
            <div
              style={{
                background: theme === 'dark' ? '#0F172A' : '#F8FAFC',
                border: `1.5px solid ${theme === 'dark' ? '#334155' : '#E2E8F0'}`,
                borderRadius: '16px',
                padding: '16px 18px',
                marginBottom: '22px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>🛡️</span>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: theme === 'dark' ? '#E2E8F0' : '#334155', fontWeight: 700 }}>
                  Your data will NOT be deleted now.
                </p>
              </div>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#64748B' }}>
                All student records, coaching sessions, instructors, and reports remain safely preserved for <strong>7 days</strong>. If you change your mind, simply log back in with your password within 7 days to retain and restore your account along with all your data.
              </p>
            </div>

            {/* In-App Button */}
            <button
              type="button"
              onClick={handleProceedAfterDeletion}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <span>OK, Understood</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {showEditProfileModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(5, 11, 26, 0.82)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !editSaving) setShowEditProfileModal(false);
          }}
        >
          <div
            style={{
              background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
              color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
              borderRadius: '24px',
              width: '100%',
              maxWidth: isCoach ? '560px' : (isStudent ? '540px' : '500px'),
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: isCoach ? '24px 26px' : '28px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCoach ? '18px' : '20px', borderBottom: isCoach ? '1px solid #E2E8F0' : 'none', paddingBottom: isCoach ? '14px' : 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }}>
                  {isCoach ? 'Edit Coach Profile' : (isStudent ? 'Edit Student Profile' : 'Edit Profile & Info')}
                </h3>
                {!isCoach && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                    {isSchoolAdmin
                      ? 'Update your academy brand, school logo, and administrator profile.'
                      : 'Update your student avatar, contact information, and details.'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => !editSaving && setShowEditProfileModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '26px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                &times;
              </button>
            </div>

            {/* Error & Success Feedback Banners */}
            {editError && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚠️</span>
                <span>{editError}</span>
              </div>
            )}

            {editSuccessMsg && (
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  color: '#15803D',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>✓</span>
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              {/* ── COACH PROFILE FORM (EXACT MATCH TO EDIT COACH PROFILE) ── */}
              {isCoach ? (
                <>
                  {/* Profile Photo Upload */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                      Profile Photo
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageSelect}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        width: '100%',
                        padding: '12px 16px',
                        background: theme === 'dark' ? '#0F172A' : '#F8FAFC',
                        border: '2px dashed #CBD5E1',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                        {editImagePreview ? (
                          <img
                            src={editImagePreview}
                            alt="Coach Avatar"
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #00D1B2'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                              color: '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '20px'
                            }}
                          >
                            {editName ? editName.charAt(0).toUpperCase() : 'C'}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }}>
                          {editUploading ? 'Uploading to cloud...' : (editImagePreview ? '✓ Change Photo' : 'Upload Profile Photo')}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          Click to select image (JPG, PNG, WEBP)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row: Full Name & Phone Number */}
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                        Full Name <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                        Phone Number (WhatsApp) <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        required
                        style={{
                          width: '100%',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Row: DOB & Gender */}
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                        <span>Date of Birth (DOB) <span style={{ color: '#EF4444' }}>*</span></span>
                        {editCoachDob && calculateAge(editCoachDob) && (
                          <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700 }}>
                            Age: {calculateAge(editCoachDob)} yrs
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={editCoachDob}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditCoachDob(val);
                          const cAge = calculateAge(val);
                          if (cAge) setEditCoachAge(cAge);
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                        Gender <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <select
                        value={editCoachGender}
                        onChange={(e) => setEditCoachGender(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13.5px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Row: Experience & Fitness Level */}
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                        Experience (Years) <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={editCoachExperience}
                        onChange={(e) => setEditCoachExperience(e.target.value)}
                        placeholder="e.g. 5"
                        required
                        style={{
                          width: '100%',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                        Fitness Level <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <select
                        value={editCoachFitnessLevel}
                        onChange={(e) => setEditCoachFitnessLevel(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13.5px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Elite">Elite</option>
                      </select>
                    </div>
                  </div>

                  {/* Row: Hourly Rate & Location / Region */}
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                        Hourly Rate <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editCoachRates}
                        onChange={(e) => setEditCoachRates(e.target.value)}
                        placeholder="e.g. $100 / hr"
                        required
                        style={{
                          width: '100%',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                        <span>Location / Region <span style={{ color: '#EF4444' }}>*</span></span>
                        {isCoachSchoolAffiliated && (
                          <span style={{ fontSize: '11px', color: '#0F766E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🔒 Locked to School
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={isCoachSchoolAffiliated ? (getSchoolLocation(editCoachSchool, schoolsData) || editCoachLocation) : editCoachLocation}
                        onChange={(e) => setEditCoachLocation(e.target.value)}
                        placeholder={isCoachSchoolAffiliated ? 'School location...' : 'e.g. Mulki / Mangalore'}
                        readOnly={isCoachSchoolAffiliated}
                        disabled={isCoachSchoolAffiliated}
                        required={!isCoachSchoolAffiliated}
                        style={{
                          width: '100%',
                          padding: '11px 13px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: isCoachSchoolAffiliated ? (theme === 'dark' ? '#0F172A' : '#F1F5F9') : (theme === 'dark' ? '#0F172A' : '#FFFFFF'),
                          color: isCoachSchoolAffiliated ? '#64748B' : (theme === 'dark' ? '#F8FAFC' : '#0F172A'),
                          fontSize: '13.5px',
                          fontWeight: isCoachSchoolAffiliated ? 600 : 500,
                          cursor: isCoachSchoolAffiliated ? 'not-allowed' : 'text',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Affiliation / Surf School */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                      <span>Affiliation / Surf School <span style={{ color: '#EF4444' }}>*</span></span>
                      {editCoachIsActive && (
                        <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          🔒 Active Coach (School Locked)
                        </span>
                      )}
                    </label>
                    <select
                      value={editCoachSchool || 'Individual / Freelance Coach'}
                      disabled={editCoachIsActive}
                      onChange={(e) => {
                        const chosen = e.target.value;
                        const isAff = chosen && chosen !== 'Individual / Freelance Coach';
                        setEditCoachSchool(chosen);
                        setEditCoachLocation(isAff ? (getSchoolLocation(chosen, schoolsData) || editCoachLocation) : '');
                      }}
                      required
                      style={{
                        width: '100%',
                        padding: '11px 13px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        background: editCoachIsActive ? (theme === 'dark' ? '#0F172A' : '#F1F5F9') : (theme === 'dark' ? '#0F172A' : '#FFFFFF'),
                        color: editCoachIsActive ? '#64748B' : (theme === 'dark' ? '#F8FAFC' : '#0F172A'),
                        cursor: editCoachIsActive ? 'not-allowed' : 'pointer',
                        fontSize: '13.5px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Individual / Freelance Coach">👤 Individual / Freelance Coach (Independent)</option>
                      {schoolsList.filter(s => s !== 'Individual / Freelance Coach').map(s => (
                        <option key={s} value={s}>🏫 {s}</option>
                      ))}
                    </select>
                    {editCoachIsActive && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#B45309', fontWeight: 500 }}>
                        Active coaches cannot switch schools. Your School Admin must set your status to Inactive before transferring to another school.
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                      Bio <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Write your coaching bio..."
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Languages Spoken */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                      Languages Spoken
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px', minHeight: '34px', padding: '6px 8px', background: theme === 'dark' ? '#0F172A' : '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', alignItems: 'center' }}>
                      {(Array.isArray(editCoachLanguages) ? editCoachLanguages : []).map((lang, idx) => (
                        <span key={idx} style={{ background: '#0D9488', color: '#FFF', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {lang}
                          <button
                            type="button"
                            onClick={() => {
                              setEditCoachLanguages(editCoachLanguages.filter((_, i) => i !== idx));
                            }}
                            style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 0, fontSize: '12px', fontWeight: 800, lineHeight: 1 }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {(!editCoachLanguages || editCoachLanguages.length === 0) && (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', padding: '2px 4px' }}>No languages selected yet</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                      {['English', 'Tamil', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Malayalam', 'Telugu'].map(preset => {
                        const cur = Array.isArray(editCoachLanguages) ? editCoachLanguages : [];
                        const isSel = cur.some(l => l.toLowerCase() === preset.toLowerCase());
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              if (isSel) {
                                setEditCoachLanguages(cur.filter(l => l.toLowerCase() !== preset.toLowerCase()));
                              } else {
                                setEditCoachLanguages([...cur, preset]);
                              }
                            }}
                            style={{
                              background: isSel ? 'rgba(13, 148, 136, 0.15)' : (theme === 'dark' ? '#334155' : '#F1F5F9'),
                              color: isSel ? '#0D9488' : (theme === 'dark' ? '#CBD5E1' : '#475569'),
                              border: `1px solid ${isSel ? '#0D9488' : '#CBD5E1'}`,
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '4px 9px',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            {isSel ? `✓ ${preset}` : `+ ${preset}`}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Type another language (e.g. Italian)..."
                        value={customEditLangInput}
                        onChange={e => setCustomEditLangInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customEditLangInput.trim()) {
                              const cur = Array.isArray(editCoachLanguages) ? editCoachLanguages : [];
                              if (!cur.some(l => l.toLowerCase() === customEditLangInput.trim().toLowerCase())) {
                                setEditCoachLanguages([...cur, customEditLangInput.trim()]);
                              }
                              setCustomEditLangInput('');
                            }
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customEditLangInput.trim()) {
                            const cur = Array.isArray(editCoachLanguages) ? editCoachLanguages : [];
                            if (!cur.some(l => l.toLowerCase() === customEditLangInput.trim().toLowerCase())) {
                              setEditCoachLanguages([...cur, customEditLangInput.trim()]);
                            }
                            setCustomEditLangInput('');
                          }
                        }}
                        style={{
                          background: '#0D9488',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Coaching Specializations */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                      Coaching Specializations
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '6px' }}>
                      {['S&C', 'Nutrition', 'Video Analysis', 'Competition Strategy', 'Water Safety', 'Big Wave'].map(spec => (
                        <label key={spec} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme === 'dark' ? '#CBD5E1' : '#475569', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editCoachSpecializations.includes(spec)}
                            onChange={() => {
                              const cur = [...editCoachSpecializations];
                              if (cur.includes(spec)) {
                                setEditCoachSpecializations(cur.filter(s => s !== spec));
                              } else {
                                setEditCoachSpecializations([...cur, spec]);
                              }
                            }}
                          />
                          <span>{spec}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>
                      Certifications (one certification per line) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={editCoachCertifications}
                      onChange={(e) => setEditCoachCertifications(e.target.value)}
                      placeholder="e.g. ISA Level 2 Coach"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              ) : isStudent ? (
                /* ── STUDENT PROFILE FORM ── */
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: '6px' }}>Profile Photo</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '12px 16px',
                        background: theme === 'dark' ? '#0F172A' : '#F8FAFC',
                        border: '2px dashed #CBD5E1',
                        borderRadius: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                        {editImagePreview ? (
                          <img src={editImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>{editName ? editName.charAt(0).toUpperCase() : 'S'}</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }}>
                          {editUploading ? 'Uploading...' : (editImagePreview ? '✓ Change Photo' : 'Upload Student Photo')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Click to select JPG, PNG, WEBP</div>
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>
                      Full Name <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>
                        WhatsApp Number
                      </label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>
                        <span>DOB</span>
                        {editStudentDob && calculateAge(editStudentDob) && (
                          <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700 }}>Age: {calculateAge(editStudentDob)} yrs</span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={editStudentDob}
                        onChange={(e) => setEditStudentDob(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>Gender</label>
                      <select
                        value={editStudentGender}
                        onChange={(e) => setEditStudentGender(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: theme === 'dark' ? '#0F172A' : '#FFFFFF', color: theme === 'dark' ? '#F8FAFC' : '#0F172A', fontSize: '13px' }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>Surfing Level</label>
                      <select
                        value={editStudentLevel}
                        onChange={(e) => setEditStudentLevel(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: theme === 'dark' ? '#0F172A' : '#FFFFFF', color: theme === 'dark' ? '#F8FAFC' : '#0F172A', fontSize: '13px' }}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Pro">Pro</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>Bio / Notes</label>
                    <textarea
                      rows={2}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Surfing background or goals..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: theme === 'dark' ? '#0F172A' : '#FFFFFF', color: theme === 'dark' ? '#F8FAFC' : '#0F172A', fontSize: '13px' }}
                    />
                  </div>
                </>
              ) : (
                /* ── SCHOOL ADMIN PROFILE FORM ── */
                <>
                  <div
                    style={{
                      background: theme === 'dark' ? '#0F172A' : '#F8FAFC',
                      border: `1.5px solid ${theme === 'dark' ? '#334155' : '#E2E8F0'}`,
                      borderRadius: '18px',
                      padding: '18px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '18px'
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div
                        style={{
                          width: '74px',
                          height: '74px',
                          borderRadius: '50%',
                          backgroundImage: editImagePreview ? `url(${editImagePreview})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          backgroundColor: isGuestAdmin ? '#F59E0B' : '#0D9488',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontSize: '24px',
                          fontWeight: 800,
                          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                          border: '3px solid #FFFFFF',
                          overflow: 'hidden'
                        }}
                      >
                        {!editImagePreview && userInitials}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#0D9488',
                          color: '#FFFFFF',
                          border: '2px solid #FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                        }}
                        title="Choose photo"
                      >
                        📷
                      </button>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: theme === 'dark' ? '#F8FAFC' : '#0F172A', marginBottom: '3px' }}>
                        {isSchoolAdmin ? 'School Logo / Profile Picture' : 'Profile Picture'}
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: '#64748B', lineHeight: '1.4' }}>
                        JPG, PNG, GIF or WEBP. Max 10MB.
                      </p>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                        >
                          <span>📁</span>
                          <span>{editImagePreview ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>

                        {editImagePreview && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #FECACA',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>
                      Full Name <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Eric Sheldon RS"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                        fontSize: '13px',
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>
                      Phone / WhatsApp Number
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                        fontSize: '13px',
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {isSchoolAdmin && (
                    <>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>
                          Academy / School Name
                        </label>
                        <input
                          type="text"
                          value={editSchoolName}
                          onChange={(e) => setEditSchoolName(e.target.value)}
                          placeholder="e.g. Aquatic Indica Surf School"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1.5px solid #CBD5E1',
                            background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                            color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                            fontSize: '13px',
                            fontWeight: 700,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '14px', position: 'relative' }} ref={locationDropdownRef}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📍 School Location / Region</span>
                          </label>
                          {editSchoolLocation && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditSchoolLocation('');
                                setLocationSuggestions([]);
                                setShowLocationDropdown(false);
                              }}
                              style={{
                                background: '#FEE2E2',
                                border: '1px solid #FECACA',
                                color: '#DC2626',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>🗑️</span>
                              <span>Delete Location</span>
                            </button>
                          )}
                        </div>

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editSchoolLocation}
                            onChange={(e) => handleLocationInputChange(e.target.value)}
                            onFocus={() => {
                              if (editSchoolLocation && editSchoolLocation.trim().length > 0) {
                                handleLocationInputChange(editSchoolLocation);
                              } else {
                                setLocationSuggestions(POPULAR_LOCATIONS.slice(0, 6));
                                setShowLocationDropdown(true);
                              }
                            }}
                            placeholder="Type location (e.g. Dapoli, Goa, Kovalam, Mulki)..."
                            autoComplete="off"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              paddingRight: editSchoolLocation ? '38px' : '14px',
                              borderRadius: '10px',
                              border: `1.5px solid ${showLocationDropdown ? '#0D9488' : '#CBD5E1'}`,
                              background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                              color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                              fontSize: '13px',
                              fontWeight: 700,
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {showLocationDropdown && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              left: 0,
                              right: 0,
                              zIndex: 1050,
                              background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                              border: `1.5px solid ${theme === 'dark' ? '#334155' : '#E2E8F0'}`,
                              borderRadius: '10px',
                              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)',
                              maxHeight: '220px',
                              overflowY: 'auto',
                              padding: '6px 0'
                            }}
                          >
                            {locationSuggestions.map((loc, idx) => (
                              <div
                                key={idx}
                                onClick={() => selectLocationSuggestion(loc)}
                                style={{
                                  padding: '9px 14px',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  color: theme === 'dark' ? '#F1F5F9' : '#1E293B',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <span>📍</span>
                                <span>{loc}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>
                      Bio / Notes
                    </label>
                    <textarea
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Brief intro or training background..."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        resize: 'none'
                      }}
                    />
                  </div>
                </>
              )}

              {/* Account Email (Read-Only) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme === 'dark' ? '#CBD5E1' : '#334155', marginBottom: '6px' }}>
                  Account Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={userEmail}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 14px',
                      borderRadius: '10px',
                      border: `1.5px solid ${theme === 'dark' ? '#334155' : '#E2E8F0'}`,
                      background: theme === 'dark' ? '#0F172A' : '#F1F5F9',
                      color: '#64748B',
                      fontSize: '13px',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                      cursor: 'not-allowed'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.6 }}>
                    🔒
                  </span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  disabled={editSaving}
                  style={{
                    padding: '11px 20px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    background: theme === 'dark' ? '#334155' : '#FFFFFF',
                    color: theme === 'dark' ? '#F8FAFC' : '#475569',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: editSaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editSaving || editUploading}
                  style={{
                    padding: '11px 26px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isCoach ? '#FF4D6D' : 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: editSaving || editUploading ? 'not-allowed' : 'pointer',
                    boxShadow: isCoach ? '0 4px 14px rgba(255, 77, 109, 0.39)' : '0 4px 14px rgba(13, 148, 136, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  {editSaving || editUploading ? (
                    <>
                      <span>⏳</span>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
