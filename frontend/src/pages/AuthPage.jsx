import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';


const calculateAge = (dobString) => {
  if (!dobString) return '';
  try {
    const today = new Date();
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : 0;
  } catch (e) {
    return '';
  }
};

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const urlSchool = searchParams.get('school');
  const [inviteData, setInviteData] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [inviteError, setInviteError] = useState('');
  const [isLogin, setIsLogin] = useState(!inviteToken && !urlSchool); // default to register when school or invite in URL
  const [role, setRole] = useState('athlete');
  const [loginRole, setLoginRole] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Saved device accounts (Only populated when real users save accounts on this device)
  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      localStorage.removeItem('savedAccounts'); // Clear any cached demo accounts
      return [];
    } catch (e) {
      return [];
    }
  });

  // Google SSO modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [customGoogleMode, setCustomGoogleMode] = useState(false);

  // Registration OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password states
  const [forgotStep, setForgotStep] = useState(0); // 0=none, 1=email, 2=otp, 3=new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    age: '',
    gender: 'Male',
    stance: 'regular',
    specializations: [],
    rates: '$75 / hr',
    location: '',
    school: 'Aquatic Indica Surf School',
    whatsapp_number: '',
    course_duration: '3 Days Course',
    start_date: new Date().toISOString().split('T')[0],
    session_time: 'Morning 6:00 AM',
    staying_at_school: 'Yes',
    reminder_preference: 'WhatsApp Text',
    guests_count: 0,
  });

  const [schoolsList, setSchoolsList] = useState([
    'Aquatic Indica Surf School'
  ]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-fill school and land directly on Student Registration when opening via ?school=...
  useEffect(() => {
    const urlSchool = searchParams.get('school');
    if (urlSchool) {
      setFormData(prev => ({ ...prev, school: urlSchool, password: '', confirmPassword: '' }));
      setSchoolsList(prev => Array.from(new Set([urlSchool, ...prev])));
      setRole('athlete');
      setOtpVerified(true);
      setIsLogin(false);
    }

  }, [searchParams]);

  // Always fetch all registered surf schools for dropdown options on load
  useEffect(() => {
    fetch(`${API}/api/schools`)
      .then(r => r.json())
      .then(data => {
        const deletedIds = new Set(JSON.parse(localStorage.getItem('deleted_school_ids') || '[]').map(String));
        const deletedNames = new Set(JSON.parse(localStorage.getItem('deleted_school_names') || '[]').map(n => String(n).toLowerCase().trim()));
        const deletedEmails = new Set(JSON.parse(localStorage.getItem('deleted_school_emails') || '[]').map(e => String(e).toLowerCase().trim()));

        let validNames = [];
        if (Array.isArray(data)) {
          validNames = data.filter(s => {
            if (!s) return false;
            if (s.id && deletedIds.has(String(s.id))) return false;
            if (s.name && deletedNames.has(String(s.name).toLowerCase().trim())) return false;
            if (s.email && deletedEmails.has(String(s.email).toLowerCase().trim())) return false;
            return true;
          }).map(s => s.name).filter(Boolean);
        }

        if (!deletedNames.has('aquatic indica surf school') && !validNames.some(n => n.toLowerCase().includes('aquatic indica'))) {
          validNames.unshift('Aquatic Indica Surf School');
        }

        const uniqueSchools = Array.from(new Set(validNames));
        setSchoolsList(uniqueSchools.length > 0 ? uniqueSchools : ['Aquatic Indica Surf School']);
        if (uniqueSchools.length > 0 && (!formData.school || !uniqueSchools.includes(formData.school))) {
          setFormData(prev => ({ ...prev, school: uniqueSchools[0] }));
        }
      })
      .catch(() => {
        setSchoolsList(['Aquatic Indica Surf School']);
      });
  }, []);

  // Fetch invite info if token present in URL
  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    fetch(`${API}/api/invite/${inviteToken}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setInviteData(data);
          const urlSchool = searchParams.get('school');
          const finalSchool = data.school_name || urlSchool || 'Aquatic Indica Surf School';
          setFormData(prev => ({
            ...prev,
            email: data.email || prev.email,
            name: data.name || prev.name,
            school: finalSchool,
          }));
          setSchoolsList(prev => Array.from(new Set([finalSchool, ...prev])));
          setOtpVerified(true); // skip OTP for invited students
          setIsLogin(false);
        } else {
          setInviteError(data.detail || 'Invalid invite link.');
        }
      })
      .catch(() => setInviteError('Could not load invite. Please try a fresh link.'))
      .finally(() => setInviteLoading(false));
  }, [inviteToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = { ...formData, [name]: value };
    if (name === 'dob') next.age = calculateAge(value);
    setFormData(next);
  };

  const handleGuestChange = (index, field, value) => {
    setFormData(prev => {
      const guests = [...(prev.guests_details || [])];
      while (guests.length <= index) {
        guests.push({ name: '', whatsapp_number: '', email: '' });
      }
      guests[index] = { ...guests[index], [field]: value };
      return { ...prev, guests_details: guests };
    });
  };

  const handleCheckboxChange = (spec) => {
    const specs = [...formData.specializations];
    setFormData({
      ...formData,
      specializations: specs.includes(spec) ? specs.filter(s => s !== spec) : [...specs, spec]
    });
  };

  const removeSavedAccount = (e, emailToRemove) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(a => a.email.toLowerCase() !== emailToRemove.toLowerCase());
    setSavedAccounts(updated);
    localStorage.setItem('savedAccounts', JSON.stringify(updated));
  };

  const [pendingApprovalUser, setPendingApprovalUser] = useState(null);

  const checkApprovalStatus = async () => {
    if (!pendingApprovalUser) return;
    setErrorMsg('');
    try {
      const studentEmail = pendingApprovalUser.email?.toLowerCase();

      // 1. First check remote backend API (server database)
      let isApprovedOnServer = false;
      let serverStudentId = null;

      try {
        const res = await fetch(`${API}/api/auth/check-approval?email=${encodeURIComponent(studentEmail)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.is_approved) {
            isApprovedOnServer = true;
            serverStudentId = data.student_id;
          }
        }
      } catch (err) {
        console.warn('Backend API unreachable, checking local cache', err);
      }

      // 2. Check local storage cache fallback
      const savedReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
      const currentReq = savedReqs.find(r => r.student_email?.toLowerCase() === studentEmail);
      const isApprovedInLocal = currentReq && currentReq.status === 'approved';

      const isApproved = isApprovedOnServer || isApprovedInLocal;

      if (isApproved) {
        // Sync local storage so subsequent local checks pass
        try {
          const updatedReqs = savedReqs.map(r => 
            r.student_email?.toLowerCase() === studentEmail ? { ...r, status: 'approved' } : r
          );
          if (!savedReqs.some(r => r.student_email?.toLowerCase() === studentEmail)) {
            updatedReqs.push({ student_email: studentEmail, status: 'approved' });
          }
          localStorage.setItem('school_join_requests', JSON.stringify(updatedReqs));
        } catch (e) {}

        const approvedUser = { ...pendingApprovalUser, approval_status: 'approved' };
        if (serverStudentId) approvedUser.student_id = serverStudentId;

        sessionStorage.setItem('token', sessionStorage.getItem('token') || 'session_active_token');
        sessionStorage.setItem('user', JSON.stringify(approvedUser));
        sessionStorage.setItem('activeSchool', JSON.stringify({
          name: approvedUser.school || 'Aquatic Indica Surf School',
          owner: approvedUser.name,
          email: approvedUser.email,
        }));
        setPendingApprovalUser(null);
        navigate(`/students/${serverStudentId || approvedUser.student_id || approvedUser.id || 1}`);
      } else {
        setErrorMsg(`⏳ Your join request to "${pendingApprovalUser.school || 'your selected Surf School'}" is STILL PENDING approval from the School Admin.`);
      }
    } catch (e) {
      setErrorMsg('Could not verify status. Please try again.');
    }
  };


  const handleAuthSuccess = (token, user) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    try {
      const existingSaved = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
      const filtered = existingSaved.filter(a => a.email && a.email.toLowerCase() !== user.email.toLowerCase());
      const updatedAccounts = [{
        name: user.name && user.name !== 'System Admin' ? user.name : 'School Admin',
        email: user.email.toLowerCase(),
        role: user.role === 'admin' ? 'School Admin' : (user.role || 'athlete'),
        school: user.school || formData.school || 'Aquatic Indica Surf School',
        image: user.image || '',
        approval_status: user.approval_status || (inviteToken ? 'approved' : 'pending'),
        whatsapp_number: formData.whatsapp_number || '',
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        session_time: formData.session_time || 'Morning 6:00 AM',
        lastLogin: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }, ...filtered];
      localStorage.setItem('savedAccounts', JSON.stringify(updatedAccounts));
      setSavedAccounts(updatedAccounts);

      if (user.role === 'athlete' || role === 'athlete') {
        const mockStudents = JSON.parse(localStorage.getItem('mock_students_data') || '[]');
        const filteredMock = mockStudents.filter(m => (m.email || '').toLowerCase() !== user.email.toLowerCase());
        filteredMock.unshift({
          id: user.student_id || user.id || Date.now(),
          name: user.name,
          email: user.email.toLowerCase(),
          role: 'athlete',
          school: user.school || formData.school || 'Aquatic Indica Surf School',
          approval_status: user.approval_status || (inviteToken ? 'approved' : 'pending'),
          whatsapp_number: formData.whatsapp_number || '',
          start_date: formData.start_date || new Date().toISOString().split('T')[0],
          session_time: formData.session_time || 'Morning 6:00 AM',
        });
        localStorage.setItem('mock_students_data', JSON.stringify(filteredMock));
      }
    } catch (e) {}

    // Check if student approval is pending (only for direct signups without invite link)
    const isDirectSignup = !inviteToken && !searchParams.get('school');
    let isApprovedInStorage = false;
    try {
      const savedReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
      const currentReq = savedReqs.find(r => r.student_email?.toLowerCase() === user.email?.toLowerCase());
      if (currentReq && currentReq.status === 'approved') {
        isApprovedInStorage = true;
      }
    } catch (e) {}

    const isPending = false; // Bypass pending approval

    if (isPending && !isApprovedInStorage) {
      setPendingApprovalUser(user);
      return;
    }

    sessionStorage.setItem('activeSchool', JSON.stringify({
      name: user.school_name || formData.school || (user.role === 'admin' ? 'School Admin' : user.role === 'coach' ? 'Coach Portal' : 'Student Portal'),
      owner: user.name,
      email: user.email,
    }));
    if (user.role === 'athlete') navigate(`/students/${user.student_id || user.id || 1}`);
    else if (user.role === 'coach') navigate(`/instructors/${user.instructor_id || user.id || 1}`);
    else navigate('/dashboard');
  };


  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e && e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!formData.email.trim() || !formData.password) {
      setErrorMsg('Please enter email and password.'); return;
    }
    setLoading(true);
    try {
      const payload = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      };
      if (loginRole && loginRole !== 'auto') {
        payload.role = loginRole;
      }
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) handleAuthSuccess(data.token, data.user);
      else setErrorMsg(data.detail || 'Incorrect email or password.');
    } catch (err) {
      setErrorMsg('Login request failed.');
    } finally { setLoading(false); }
  };

  // ── Registration OTP ───────────────────────────────────────────────────────
  const sendOTP = async (isResend = false) => {
    setErrorMsg(''); setSuccessMsg('');
    if (!formData.email.trim()) { setErrorMsg('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim(), purpose: 'signup', role })
      });
      const data = await res.json();
      if (res.ok) {
        setResendCooldown(60);
        if (!isResend) setOtpSent(true);
        const fallbackOtp = data.otp || data.message?.match(/\b\d{6}\b/)?.[0];
        if (fallbackOtp) {
          setOtpCode(fallbackOtp);
          setSuccessMsg(`Verification code: ${fallbackOtp}`);
        } else {
          setSuccessMsg(data.message || `Verification code sent to ${formData.email}`);
        }
      } else {
        setOtpSent(false);
        setErrorMsg(data.detail || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Failed to send OTP. Please check your network.');
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    setErrorMsg(''); setSuccessMsg('');
    if (!otpCode.trim()) { setErrorMsg('Please enter the OTP.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim(), otp: otpCode.trim(), purpose: 'signup', role })
      });
      const data = await res.json();
      if (res.ok) setOtpVerified(true);
      else setErrorMsg(data.detail || 'Invalid OTP. Please check and try again.');
    } catch (err) {
      setErrorMsg('OTP verification failed.');
    } finally { setLoading(false); }
  };

  const completeRegistration = async (e) => {
    e && e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!formData.name.trim() || !formData.password || !formData.confirmPassword) {
      setErrorMsg('Please fill in all credentials.'); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.'); return;
    }
    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          role,
          name: formData.name.trim(),
          dob: formData.dob,
          age: formData.dob ? calculateAge(formData.dob) : (formData.age ? parseInt(formData.age) : null),
          gender: formData.gender,
          stance: formData.stance,
          specializations: formData.specializations,
          rates: formData.rates,
          location: formData.location,
          whatsapp_number: formData.whatsapp_number,
          course_duration: formData.course_duration,
          start_date: formData.start_date,
          session_time: formData.session_time,
          staying_at_school: formData.staying_at_school,
          reminder_preference: formData.reminder_preference,
          guests_count: parseInt(formData.guests_count) || 0,
          guests_details: formData.guests_details || [],
          school: formData.school,
          // Pass invite token so backend links to pre-created student record
          ...(inviteToken ? { invite_token: inviteToken } : {}),
        })
      });
      const data = await res.json();
      if (res.ok) {
        const userObj = data.user || {
          id: Date.now(),
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          role: role,
          school: formData.school || 'Aquatic Indica Surf School',
          approval_status: inviteToken ? 'approved' : 'pending'
        };
        userObj.approval_status = inviteToken ? 'approved' : 'pending';

        // Save student into backend surfers table (correct backend)
        try {
          fetch(`${API}/api/surfers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name.trim(),
              school_name: formData.school || 'Aquatic Indica Surf School',
              email: formData.email.toLowerCase().trim(),
              phone: formData.whatsapp_number || '',
              gender: formData.gender || 'Male',
              age: formData.age ? parseInt(formData.age) : 20,
              state: 'Tamil Nadu',
              admin_id: 'admin'
            })
          }).catch(() => {});
        } catch (e) {}

        // If direct signup without invite token, ALWAYS record pending join request for school admin
        if (!inviteToken && role === 'athlete') {
          try {
            const existingReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
            const studentEmail = formData.email.toLowerCase().trim();
            const existingIdx = existingReqs.findIndex(r => (r.student_email || r.email || '').toLowerCase().trim() === studentEmail);
            const newReq = {
              id: `req_${Date.now()}`,
              student_id: userObj.student_id || userObj.id || Date.now(),
              student_name: formData.name.trim(),
              student_email: studentEmail,
              school_name: formData.school || 'Aquatic Indica Surf School',
              start_date: formData.start_date || new Date().toISOString().split('T')[0],
              session_time: formData.session_time || 'Morning 6:00 AM',
              whatsapp_number: formData.whatsapp_number || 'N/A',
              status: 'pending',
              request_date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString()
            };
            if (existingIdx >= 0) {
              existingReqs[existingIdx] = { ...existingReqs[existingIdx], ...newReq, status: 'pending' };
            } else {
              existingReqs.unshift(newReq);
            }
            localStorage.setItem('school_join_requests', JSON.stringify(existingReqs));
          } catch (e) {}
          userObj.approval_status = 'pending';
        }

        handleAuthSuccess(data.token || 'session_token', userObj);
      } else {
        setErrorMsg(data.detail || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.warn('Backend offline, completing registration in local store:', err);
      const userObj = {
        id: Date.now(),
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        role: role,
        school: formData.school || 'Aquatic Indica Surf School',
        approval_status: inviteToken ? 'approved' : 'pending'
      };

      if (!inviteToken && role === 'athlete') {
        try {
          const existingReqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
          const studentEmail = formData.email.toLowerCase().trim();
          const existingIdx = existingReqs.findIndex(r => (r.student_email || r.email || '').toLowerCase().trim() === studentEmail);
          const newReq = {
            id: `req_${Date.now()}`,
            student_id: userObj.id,
            student_name: formData.name.trim(),
            student_email: studentEmail,
            school_name: formData.school || 'Aquatic Indica Surf School',
            start_date: formData.start_date || new Date().toISOString().split('T')[0],
            session_time: formData.session_time || 'Morning 6:00 AM',
            whatsapp_number: formData.whatsapp_number || 'N/A',
            status: 'pending',
            request_date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
          };
          if (existingIdx >= 0) {
            existingReqs[existingIdx] = { ...existingReqs[existingIdx], ...newReq, status: 'pending' };
          } else {
            existingReqs.unshift(newReq);
          }
          localStorage.setItem('school_join_requests', JSON.stringify(existingReqs));
        } catch (e) {}
      }

      handleAuthSuccess('offline_token_' + Date.now(), userObj);
    } finally { setLoading(false); }
  };


  // ── Forgot Password ────────────────────────────────────────────────────────
  const sendForgotOtp = async (isResend = false) => {
    setErrorMsg(''); setSuccessMsg('');
    if (!forgotEmail.trim()) { setErrorMsg('Please enter your registered email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), purpose: 'reset' })
      });
      const data = await res.json();
      if (res.ok) {
        setResendCooldown(60);
        if (!isResend) setForgotStep(2);
        const fallbackOtp = data.otp || data.message?.match(/\b\d{6}\b/)?.[0];
        if (fallbackOtp) {
          setForgotOtp(fallbackOtp);
          setSuccessMsg(`Reset code: ${fallbackOtp}`);
        } else {
          setSuccessMsg(data.message || `Reset code sent to ${forgotEmail}`);
        }
      } else {
        setErrorMsg(data.detail || 'Failed to send reset code.');
      }
    } catch (err) {
      setErrorMsg('Failed to send OTP. Please check your network.');
    } finally { setLoading(false); }
  };

  const verifyForgotOtp = () => {
    setErrorMsg(''); setSuccessMsg('');
    if (!forgotOtp.trim() || forgotOtp.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit OTP code.'); return;
    }
    setForgotStep(3);
  };

  const resetForgotPassword = async (e) => {
    e && e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!newPassword || !confirmNewPassword) { setErrorMsg('Please enter and confirm the new password.'); return; }
    if (newPassword !== confirmNewPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), otp: forgotOtp.trim(), new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, email: forgotEmail.trim(), password: '' }));
        setForgotStep(0); setForgotOtp(''); setNewPassword(''); setConfirmNewPassword('');
        setSuccessMsg('Password reset successful. Please login with your new password.');
        setIsLogin(true);
      } else {
        setErrorMsg(data.detail || 'Failed to reset password. Please check OTP or try again.');
      }
    } catch (err) {
      setErrorMsg('Failed to reset password. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Google SSO ─────────────────────────────────────────────────────────────
  const executeGoogleLogin = async (email, name, image = '') => {
    setLoading(true); setErrorMsg('');
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanName = name || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const res = await fetch(`${API}/api/auth/sso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          social_id: `google_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: cleanEmail, name: cleanName, role: role || 'athlete',
          image: image || ''
        })
      });
      const data = await res.json();
      if (res.ok) { setShowGoogleModal(false); handleAuthSuccess(data.token, data.user); }
      else setErrorMsg(data.detail || 'Google sign-in failed.');
    } catch (err) {
      setErrorMsg('Error connecting to authentication server.');
    } finally { setLoading(false); }
  };

  const handleSSOLogin = (provider) => {
    if (provider === 'google') {
      const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const isConfigured = rawClientId && rawClientId.includes('.apps.googleusercontent.com');
      if (isConfigured && window.google?.accounts?.oauth2) {
        try {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: rawClientId, scope: 'email profile openid',
            callback: async (tokenResponse) => {
              if (tokenResponse.access_token) {
                setLoading(true);
                try {
                  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } });
                  const gUser = await userInfoRes.json();
                  executeGoogleLogin(gUser.email, gUser.name, gUser.picture);
                } catch (e) { setErrorMsg('Failed to fetch Google profile.'); setLoading(false); }
              }
            }
          });
          tokenClient.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (e) {}
      }
      setShowGoogleModal(true);
    }
  };

  const switchToLogin = () => {
    setIsLogin(true); setErrorMsg(''); setSuccessMsg('');
    setOtpSent(false); setOtpVerified(false); setOtpCode('');
  };

  const switchToRegister = () => {
    setIsLogin(false); setErrorMsg(''); setSuccessMsg('');
    setForgotStep(0);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  // Invite loading screen
  if (inviteLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050B1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,77,109,0.3)', borderTopColor: '#FF4D6D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#94A3B8', fontSize: '15px', fontFamily: 'Inter, sans-serif' }}>Loading your invite...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div style={{ minHeight: '100vh', background: '#050B1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px' }}>
        <div style={{ fontSize: '48px' }}>🔗</div>
        <h2 style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', margin: 0 }}>Invite Link Issue</h2>
        <p style={{ color: '#94A3B8', textAlign: 'center', maxWidth: '360px' }}>{inviteError}</p>
        <button onClick={() => navigate('/auth')} style={{ background: '#FF4D6D', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: 700, cursor: 'pointer' }}>Go to Login</button>
      </div>
    );
  }
  return (
    <div className="auth-page">

      {/* ── LEFT PANEL (Form) ── */}
      <div className="auth-panel-left">
        <div className="auth-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="auth-brand-dot" />
          <span className="auth-brand-name">AiSurf</span>
        </div>

        {pendingApprovalUser ? (

          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', textAlign: 'center' }}>⏳</div>
            <h2 className="auth-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Registration Pending</h2>
            <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: '24px' }}>
              Your join request to <strong style={{ color: '#00F2FE' }}>{pendingApprovalUser.school || 'your selected Surf School'}</strong> has been submitted successfully!
            </p>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '16px', color: '#FCD34D', fontSize: '13px', lineHeight: '1.6', marginBottom: '24px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔒</span> Status: Pending School Admin Approval
              </div>
              The School Admin has been notified of your registration. You will be able to access your student dashboard once approved.
            </div>

            {errorMsg && <div className="auth-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={checkApprovalStatus} 
                className="btn-primary auth-submit"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                🔄 Check Approval Status
              </button>

              <button 
                onClick={() => setPendingApprovalUser(null)} 
                className="auth-link-btn"
                style={{ textAlign: 'center', marginTop: '6px' }}
              >
                ← Back to Login
              </button>
            </div>
          </div>
        ) : forgotStep > 0 ? (

          <>
            <h2 className="auth-title">Reset Password</h2>
            <p className="auth-subtitle">
              {forgotStep === 1 && 'Enter your registered email to receive a reset code.'}
              {forgotStep === 2 && 'Enter the 6-digit code sent to your email.'}
              {forgotStep === 3 && 'Set your new password.'}
            </p>

            {errorMsg && <div className="auth-error">{errorMsg}</div>}
            {successMsg && <div className="auth-success">{successMsg}</div>}

            {/* Step 1: Email */}
            {forgotStep === 1 && (
              <div className="auth-form">
                <div className="auth-field">
                  <label>Registered Email</label>
                  <input type="email" placeholder="you@example.com" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)} autoFocus />
                </div>
                <button type="button" className="btn-primary auth-submit" disabled={loading || !forgotEmail.trim()} onClick={() => sendForgotOtp()}>
                  {loading ? <span className="auth-spinner" /> : 'Send Reset Code'}
                </button>
                <button type="button" className="auth-link-btn" onClick={() => { setForgotStep(0); setErrorMsg(''); setSuccessMsg(''); }}>
                  ← Back to Login
                </button>
              </div>
            )}

            {/* Step 2: OTP */}
            {forgotStep === 2 && (
              <div className="auth-form">
                <div className="auth-field">
                  <label style={{ color: '#00F2FE' }}>6-Digit Code (sent to {forgotEmail})</label>
                  <input type="text" placeholder="123456" value={forgotOtp}
                    onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6} style={{ fontSize: '22px', letterSpacing: '6px', textAlign: 'center', fontWeight: 800, color: '#00F2FE' }} autoFocus />
                </div>
                <button type="button" className="btn-primary auth-submit" disabled={loading || forgotOtp.length < 6} onClick={verifyForgotOtp}>
                  Verify Code →
                </button>
                <button type="button" className="auth-link-btn" disabled={resendCooldown > 0} onClick={() => sendForgotOtp(true)}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            )}

            {/* Step 3: New Password */}
            {forgotStep === 3 && (
              <form className="auth-form" onSubmit={resetForgotPassword}>
                <div className="auth-field">
                  <label>New Password</label>
                  <input type="password" placeholder="••••••••" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} autoFocus />
                </div>
                <div className="auth-field">
                  <label>Confirm New Password</label>
                  <input type="password" placeholder="••••••••" value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                  {loading ? <span className="auth-spinner" /> : 'Reset Password'}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Join AiSurf'}</h2>
            <p className="auth-subtitle">
              {isLogin ? 'Log in to continue your training' : 'Start your high-performance surf coaching journey'}
            </p>

            {errorMsg && (
              <div className="auth-error" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>{errorMsg}</div>
                {errorMsg.toLowerCase().includes('already registered') && (
                  <button type="button" onClick={switchToLogin}
                    style={{ background: '#FF4D6D', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
                    → Switch to Login
                  </button>
                )}
              </div>
            )}
            {successMsg && <div className="auth-success">{successMsg}</div>}

            <div className="auth-tabs">
              <button className={`auth-tab ${isLogin ? 'active' : ''}`} type="button" onClick={switchToLogin}>Login</button>
              <button className={`auth-tab ${!isLogin ? 'active' : ''}`} type="button" onClick={switchToRegister}>Register</button>
            </div>

            {/* ── LOGIN FORM ── */}
            {isLogin && (
              <>
                {/* Saved Accounts Quick-Login */}
                {savedAccounts.length > 0 && (
                  <div className="saved-accounts">
                    <div className="saved-accounts-label">Saved Accounts</div>
                    {savedAccounts.map((acc, idx) => (
                      <div key={idx} className="saved-account-row"
                        onClick={() => { setFormData(p => ({ ...p, email: acc.email, password: '' })); }}>
                        <div className="saved-account-avatar">
                          {acc.image
                            ? <img src={acc.image} alt={acc.name} />
                            : <span>{(acc.name || acc.email || 'U')[0].toUpperCase()}</span>
                          }
                        </div>
                        <div className="saved-account-info">
                          <div className="saved-account-name">{(!acc.name || acc.name === 'System Admin') ? 'School Admin' : acc.name}</div>
                          <div className="saved-account-email">{acc.email}</div>
                        </div>
                        <span className={`saved-account-badge role-${acc.role}`}>{acc.role === 'admin' ? 'School Admin' : acc.role}</span>
                        <button type="button" className="saved-account-remove"
                          onClick={e => removeSavedAccount(e, acc.email)} title="Remove">×</button>
                      </div>
                    ))}
                  </div>
                )}

                <form className="auth-form" onSubmit={handleLoginSubmit}>
                  <div className="auth-fields-row">
                    <div className="auth-field" style={{ flex: 1.4 }}>
                      <label>Email Address</label>
                      <input type="email" name="email" placeholder="you@example.com"
                        value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="auth-field" style={{ flex: 1 }}>
                      <label>Login As</label>
                      <select value={loginRole} onChange={e => setLoginRole(e.target.value)}>
                        <option value="auto">Auto-Detect</option>
                        <option value="athlete">Student</option>
                        <option value="coach">Coach</option>
                        <option value="admin">School Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Password</label>
                    <input type="password" name="password" placeholder="••••••••"
                      value={formData.password} onChange={handleChange} required />
                  </div>
                  <button type="button" className="auth-forgot-btn" onClick={() => { setForgotStep(1); setErrorMsg(''); setSuccessMsg(''); }}>
                    Forgot password?
                  </button>
                  <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                    {loading ? <span className="auth-spinner" /> : 'Log In'}
                  </button>

                  {/* Google SSO */}
                  <div className="auth-divider"><span>or</span></div>
                  <div className="auth-sso-buttons">
                    <button type="button" className="sso-btn" onClick={() => handleSSOLogin('google')}>
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── REGISTRATION FORM (3-Step) ── */}
            {!isLogin && (
              <>
                {/* Step indicator */}
                <div className="reg-steps">
                  <div className={`reg-step ${!otpSent ? 'active' : otpVerified ? 'done' : 'done'}`}>
                    <span className="reg-step-num">{otpVerified ? '✓' : '1'}</span>
                    <span className="reg-step-label">Email</span>
                  </div>
                  <div className="reg-step-line" />
                  <div className={`reg-step ${otpSent && !otpVerified ? 'active' : otpVerified ? 'done' : ''}`}>
                    <span className="reg-step-num">{otpVerified ? '✓' : '2'}</span>
                    <span className="reg-step-label">Verify</span>
                  </div>
                  <div className="reg-step-line" />
                  <div className={`reg-step ${otpVerified ? 'active' : ''}`}>
                    <span className="reg-step-num">3</span>
                    <span className="reg-step-label">Setup</span>
                  </div>
                </div>

                {/* Step 1: Email + Role → Send OTP */}
                {!otpSent && (
                  <div className="auth-form">
                    <div className="auth-fields-row">
                      <div className="auth-field" style={{ flex: 1.5 }}>
                        <label>Email Address</label>
                        <input type="email" name="email" placeholder="you@example.com"
                          value={formData.email} onChange={handleChange} required />
                      </div>
                      <div className="auth-field" style={{ flex: 1 }}>
                        <label>Register As</label>
                        <select value={role} onChange={e => setRole(e.target.value)}>
                          <option value="athlete">Student (Athlete)</option>
                          <option value="coach">Coach (Instructor)</option>
                          <option value="admin">School Admin (Surf School)</option>
                        </select>
                      </div>
                    </div>
                    <button type="button" className="btn-primary auth-submit"
                      disabled={loading || !formData.email.trim()} onClick={() => sendOTP()}>
                      {loading ? <span className="auth-spinner" /> : 'Send Verification Code →'}
                    </button>
                  </div>
                )}

                {/* Step 2: Verify OTP */}
                {otpSent && !otpVerified && (
                  <div className="auth-form">
                    <div className="auth-field">
                      <label style={{ color: '#00F2FE' }}>
                        Enter 6-Digit Code (Sent to {formData.email})
                      </label>
                      <input type="text" placeholder="123456" value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6} autoFocus
                        style={{ fontSize: '22px', letterSpacing: '6px', textAlign: 'center', fontWeight: 800, color: '#00F2FE' }} />
                    </div>
                    <button type="button" className="btn-primary auth-submit"
                      disabled={loading || otpCode.length < 6} onClick={verifyOTP}>
                      {loading ? <span className="auth-spinner" /> : 'Verify Code →'}
                    </button>
                    <button type="button" className="auth-link-btn"
                      disabled={resendCooldown > 0} onClick={() => sendOTP(true)}>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : '↻ Resend Code'}
                    </button>
                    <button type="button" className="auth-link-btn"
                      onClick={() => { setOtpSent(false); setOtpCode(''); setErrorMsg(''); }}>
                      ← Change Email
                    </button>
                  </div>
                )}

                {/* Step 3: Setup profile + password */}
                {otpVerified && (
                  <form className="auth-form" onSubmit={completeRegistration}>
                    {/* Invite banner or OTP verified banner */}
                    {inviteData ? (
                      <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>🏄</span>
                        <div>
                          <div style={{ fontSize: '13px', color: '#A5B4FC', fontWeight: 700, marginBottom: '2px' }}>You've been invited to AiSurf!</div>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                            Registered as <strong style={{ color: '#C7D2FE' }}>{inviteData.name}</strong> · Level: {inviteData.level}
                            {inviteData.session_time && ` · Session: ${inviteData.session_time}`}
                            <br />
                            <span style={{ color: '#10B981', fontWeight: 600 }}>🏫 School: {formData.school} (Auto-Selected)</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', color: '#6EE7B7', fontWeight: 600 }}>
                          ✔ Email Verified: {formData.email} ({role === 'athlete' ? 'Student' : role === 'coach' ? 'Coach' : 'School Admin'})
                        </span>
                        <button type="button" onClick={() => { setOtpVerified(false); setOtpSent(false); setOtpCode(''); }}
                          style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>
                          Change
                        </button>
                      </div>
                    )}

                    <div className="auth-field">
                      <label>Full Name</label>
                      <input type="text" name="name" placeholder="Your full name"
                        value={formData.name} onChange={handleChange} required />
                    </div>

                    <div className="auth-fields-row">
                      <div className="auth-field">
                        <label>Password</label>
                        <input type="password" name="password" placeholder="Enter password"
                          autoComplete="new-password"
                          value={formData.password || ''} onChange={handleChange} required />
                      </div>
                      <div className="auth-field">
                        <label>Confirm Password</label>
                        <input type="password" name="confirmPassword" placeholder="Re-enter password"
                          autoComplete="new-password"
                          value={formData.confirmPassword || ''} onChange={handleChange} required />
                      </div>
                    </div>


                    {/* Athlete extra fields */}
                    {role === 'athlete' && (
                      <div className="auth-role-subfields">
                        <h4 className="subfields-title">Student Profile Details</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.5fr', gap: '12px' }}>
                          <div className="auth-field">
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>DOB</span>
                              {formData.dob && <span style={{ color: '#00F2FE', fontSize: '11px', fontWeight: 700 }}>Age: {calculateAge(formData.dob)} yrs</span>}
                            </label>
                            <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange}
                              max={new Date().toISOString().split('T')[0]} style={{ colorScheme: 'dark' }} />
                          </div>
                          <div className="auth-field">
                            <label>Surf Stance</label>
                            <select name="stance" value={formData.stance} onChange={handleChange}>
                              <option value="regular">Regular</option>
                              <option value="goofy">Goofy</option>
                            </select>
                          </div>
                          <div className="auth-field">
                            <label>Gender</label>
                            <select name="gender" value={formData.gender || 'Male'} onChange={handleChange}>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="auth-fields-row" style={{ marginTop: '10px' }}>
                          <div className="auth-field" style={{ flex: 1.4 }}>
                            <label>📱 WhatsApp Number</label>
                            <input type="tel" name="whatsapp_number" placeholder="9876543210 (+91 auto)"
                              value={formData.whatsapp_number} onChange={handleChange} />
                          </div>
                          <div className="auth-field" style={{ flex: 1 }}>
                            <label>👥 Accompanying Guests</label>
                            <input type="number" name="guests_count" min={0} max={10}
                              value={formData.guests_count} onChange={handleChange} />
                          </div>
                        </div>

                        {parseInt(formData.guests_count || 0) > 0 && (
                          <div style={{ marginTop: '14px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                            <h5 style={{ margin: '0 0 12px 0', color: '#00F2FE', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              👥 Enter Details for {parseInt(formData.guests_count)} Accompanying Guest(s)
                            </h5>
                            {Array.from({ length: parseInt(formData.guests_count) }).map((_, gIdx) => (
                              <div key={gIdx} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px', marginBottom: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#FF4D6D', marginBottom: '8px' }}>Guest #{gIdx + 1} Profile</div>
                                <div className="guest-fields-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                  <div className="auth-field" style={{ minWidth: 0 }}>
                                    <label style={{ fontSize: '11px', color: '#94A3B8' }}>Full Name *</label>
                                    <input type="text" placeholder="Guest Full Name"
                                      value={formData.guests_details?.[gIdx]?.name || ''}
                                      onChange={e => handleGuestChange(gIdx, 'name', e.target.value)} required />
                                  </div>
                                  <div className="auth-field" style={{ minWidth: 0 }}>
                                    <label style={{ fontSize: '11px', color: '#94A3B8' }}>WhatsApp / Phone</label>
                                    <input type="tel" placeholder="Phone Number"
                                      value={formData.guests_details?.[gIdx]?.whatsapp_number || ''}
                                      onChange={e => handleGuestChange(gIdx, 'whatsapp_number', e.target.value)} />
                                  </div>
                                  <div className="auth-field" style={{ minWidth: 0 }}>
                                    <label style={{ fontSize: '11px', color: '#94A3B8' }}>Email Address</label>
                                    <input type="email" placeholder="guest@example.com"
                                      value={formData.guests_details?.[gIdx]?.email || ''}
                                      onChange={e => handleGuestChange(gIdx, 'email', e.target.value)} />
                                  </div>
                                  <div className="auth-field" style={{ minWidth: 0 }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
                                      <span>DOB</span>
                                      {formData.guests_details?.[gIdx]?.dob && (
                                        <span style={{ color: '#00F2FE', fontWeight: 700 }}>
                                          Age: {calculateAge(formData.guests_details[gIdx].dob)} yrs
                                        </span>
                                      )}
                                    </label>
                                    <input type="date"
                                      value={formData.guests_details?.[gIdx]?.dob || ''}
                                      onChange={e => {
                                        const dobVal = e.target.value;
                                        const computedAge = calculateAge(dobVal);
                                        setFormData(prev => {
                                          const guests = [...(prev.guests_details || [])];
                                          while (guests.length <= gIdx) {
                                            guests.push({ name: '', whatsapp_number: '', email: '', dob: '', age: '', stance: 'regular', level: 'Beginner' });
                                          }
                                          guests[gIdx] = { ...guests[gIdx], dob: dobVal, age: computedAge };
                                          return { ...prev, guests_details: guests };
                                        });
                                      }}
                                      max={new Date().toISOString().split('T')[0]}
                                      style={{ colorScheme: 'dark' }} />
                                  </div>
                                  <div className="auth-field" style={{ minWidth: 0 }}>
                                    <label style={{ fontSize: '11px', color: '#94A3B8' }}>Gender</label>
                                    <select value={formData.guests_details?.[gIdx]?.gender || 'Male'}
                                      onChange={e => handleGuestChange(gIdx, 'gender', e.target.value)}>
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                  <div className="auth-field" style={{ minWidth: 0 }}>
                                    <label style={{ fontSize: '11px', color: '#94A3B8' }}>Surf Stance</label>
                                    <select value={formData.guests_details?.[gIdx]?.stance || 'regular'}
                                      onChange={e => handleGuestChange(gIdx, 'stance', e.target.value)}>
                                      <option value="regular">Regular</option>
                                      <option value="goofy">Goofy</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="auth-fields-row" style={{ marginTop: '10px' }}>
                          <div className="auth-field">
                            <label>🏄 Course Duration</label>
                            <select name="course_duration" value={formData.course_duration} onChange={handleChange}>
                              <option value="3 Days Course">3 Days Course</option>
                              <option value="5 Days Course">5 Days Course</option>
                              <option value="7 Days Course">7 Days Course</option>
                              <option value="10 Days Course">10 Days Course</option>
                            </select>
                          </div>
                          <div className="auth-field">
                            <label>🗓️ Start Date</label>
                            <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} style={{ colorScheme: 'dark' }} />
                          </div>
                        </div>

                        <div className="auth-fields-row" style={{ marginTop: '10px' }}>
                          <div className="auth-field">
                            <label>⏰ Session Time Slot</label>
                            <select name="session_time" value={formData.session_time} onChange={handleChange}>
                              <option value="08:30 AM">08:30 AM · Morning Slot 1 (90m)</option>
                              <option value="10:30 AM">10:30 AM · Morning Slot 2 (90m)</option>
                              <option value="11:30 AM">11:30 AM · Midday Slot (60m)</option>
                              <option value="01:00 PM">01:00 PM · Afternoon Slot (120m)</option>
                              <option value="03:30 PM">03:30 PM · Late Afternoon (90m)</option>
                            </select>
                          </div>
                          <div className="auth-field">
                            <label>🏨 Staying at School?</label>
                            <select name="staying_at_school" value={formData.staying_at_school} onChange={handleChange}>
                              <option value="Yes">Yes (On-site Lodge)</option>
                              <option value="No">No (Off-site Stay)</option>
                            </select>
                          </div>
                        </div>

                        <div className="auth-field" style={{ marginTop: '10px' }}>
                          <label>🔔 Reminder Preference</label>
                          <select name="reminder_preference" value={formData.reminder_preference} onChange={handleChange}>
                            <option value="WhatsApp Text">WhatsApp Text Message</option>
                            <option value="Phone Call">Over the Call Alert</option>
                            <option value="Notice Board">Notice Board Only</option>
                          </select>
                        </div>

                        <div className="auth-field" style={{ marginTop: '12px' }}>
                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Assigned Surf School</span>
                            {(inviteData || searchParams.get('school')) && (
                              <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 700 }}>✓ Auto-Selected via Link</span>
                            )}
                          </label>
                          <select 
                            name="school" 
                            value={formData.school} 
                            onChange={handleChange} 
                            disabled={!!(inviteData || searchParams.get('school'))} 
                            style={{ 
                              borderColor: (inviteData || searchParams.get('school')) ? '#10B981' : undefined, 
                              background: (inviteData || searchParams.get('school')) ? 'rgba(16,185,129,0.06)' : undefined,
                              fontWeight: (inviteData || searchParams.get('school')) ? 700 : undefined
                            }}
                          >
                            {schoolsList.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Coach extra fields */}
                    {role === 'coach' && (
                      <div className="auth-role-subfields">
                        <h4 className="subfields-title">Coach Profile Details</h4>

                        <div className="auth-field" style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>🏄 Affiliation / Surf School</span>
                          </label>
                          <select
                            name="school"
                            value={formData.school || 'Individual / Freelance Coach'}
                            onChange={handleChange}
                          >
                            <option value="Individual / Freelance Coach">👤 Individual / Freelance Coach (Independent)</option>
                            {schoolsList.filter(s => s !== 'Individual / Freelance Coach').map(s => (
                              <option key={s} value={s}>🏫 {s}</option>
                            ))}
                          </select>
                          <small style={{ color: '#94A3B8', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            Select your affiliated surf school, or choose 'Individual / Freelance Coach' if you coach independently.
                          </small>
                        </div>

                        <div className="auth-fields-row">
                          <div className="auth-field">
                            <label>Hourly Rate</label>
                            <input type="text" name="rates" placeholder="$75 / hr"
                              value={formData.rates} onChange={handleChange} />
                          </div>
                          <div className="auth-field">
                            <label>Location / Region</label>
                            <input type="text" name="location" placeholder="North Shore, Oahu"
                              value={formData.location} onChange={handleChange} />
                          </div>
                        </div>
                        <div className="auth-field">
                          <label>Coaching Specializations</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {['S&C', 'Nutrition', 'Video Analysis', 'Competition Strategy', 'Water Safety'].map(spec => (
                              <label key={spec} className="checkbox-label">
                                <input type="checkbox" checked={formData.specializations.includes(spec)}
                                  onChange={() => handleCheckboxChange(spec)} />
                                <span style={{ fontSize: '11px' }}>{spec}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* School Admin extra fields */}
                    {role === 'admin' && (
                      <div className="auth-role-subfields">
                        <h4 className="subfields-title">School Admin Details</h4>
                        <div className="auth-field">
                          <label>Your Surf School Name</label>
                          <input type="text" name="school" placeholder="e.g. Aquatic Indica Surf School"
                            value={formData.school} onChange={handleChange} required />
                          <small style={{ color: '#94A3B8', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            This name will be saved dynamically as your official school dashboard name.
                          </small>
                        </div>
                      </div>
                    )}

                    <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                      {loading ? <span className="auth-spinner" /> : 'Create Account'}
                    </button>
                  </form>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── RIGHT PANEL (Image) ── */}
      <div className="auth-panel-right">
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px' }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '48px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '16px' }}>
            Master the ocean.
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>
            Elevate your technique with high-performance analytics, video review, and professional athletic intelligence tools.
          </p>
        </div>
      </div>

      {/* ── GOOGLE ACCOUNT SELECTOR MODAL ── */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(5, 11, 26, 0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', color: '#0F172A', borderRadius: '28px',
            width: '100%', maxWidth: '440px', padding: '32px 28px',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)',
            fontFamily: "'Inter', -apple-system, sans-serif", position: 'relative'
          }}>
            <button type="button" onClick={() => { setShowGoogleModal(false); setCustomGoogleMode(false); }}
              style={{ position: 'absolute', top: '20px', right: '20px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#F1F5F9', color: '#64748B', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ×
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px', marginTop: '4px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '21px', fontWeight: 700, color: '#0F172A' }}>Sign in with Google</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748B' }}>to continue to <strong style={{ color: '#0F172A' }}>AiSurf Coaching</strong></p>
            </div>

            {savedAccounts.length > 0 && !customGoogleMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 4px', marginBottom: '2px' }}>
                  Choose Account ({savedAccounts.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {savedAccounts.map((acc, idx) => (
                    <div key={idx} onClick={() => executeGoogleLogin(acc.email, acc.name, acc.image)}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '16px', border: '1.5px solid #F1F5F9', background: '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#4285F4'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#F1F5F9'; }}>
                      {acc.image
                        ? <img src={acc.image} alt={acc.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #4285F4, #2563EB)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                            {(acc.name || acc.email || 'U')[0].toUpperCase()}
                          </div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</div>
                      </div>
                      <button type="button" onClick={e => removeSavedAccount(e, acc.email)}
                        style={{ background: 'transparent', border: 'none', color: '#CBD5E1', fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEE2E2'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#CBD5E1'; e.currentTarget.style.background = 'transparent'; }}>×</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => { setCustomGoogleMode(true); setGoogleEmail(''); setGoogleName(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '16px', border: '1.5px dashed #CBD5E1', background: '#F8FAFC', cursor: 'pointer', marginTop: '4px', transition: 'all 0.2s' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>+</div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>Use another Google account</div>
                    <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>Sign in with a different email address</div>
                  </div>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Google Email Address</label>
                  <input type="email" placeholder="e.g. you@gmail.com" value={googleEmail}
                    onChange={e => setGoogleEmail(e.target.value)} autoFocus className="google-input-box"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontSize: '14.5px', boxSizing: 'border-box', color: '#0F172A', background: '#FFFFFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Your Full Name <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span></label>
                  <input type="text" placeholder="e.g. Eric Sheldon" value={googleName}
                    onChange={e => setGoogleName(e.target.value)} className="google-input-box"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontSize: '14.5px', boxSizing: 'border-box', color: '#0F172A', background: '#FFFFFF', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {savedAccounts.length > 0 && (
                    <button type="button" onClick={() => setCustomGoogleMode(false)}
                      style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: '#FFFFFF', color: '#475569', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}>
                      ← Back
                    </button>
                  )}
                  <button type="button" disabled={!googleEmail || loading} onClick={() => executeGoogleLogin(googleEmail, googleName)}
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', border: 'none', background: googleEmail ? 'linear-gradient(135deg, #4285F4, #2563EB)' : '#E2E8F0', color: googleEmail ? '#FFFFFF' : '#94A3B8', fontSize: '14px', fontWeight: 700, cursor: googleEmail ? 'pointer' : 'not-allowed' }}>
                    {loading ? 'Authenticating...' : 'Continue to AiSurf →'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', lineHeight: 1.4 }}>
                To continue, Google will securely share your credentials with AiSurf.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
};

const styles = `
.auth-page {
  display: flex;
  flex-direction: row-reverse;
  min-height: 100vh;
  background: #050B1A;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.auth-panel-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 80px;
  width: 720px;
  min-height: 100vh;
  background: #050B1A;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
  overflow-y: auto;
  flex-shrink: 0;
}

.auth-panel-right {
  flex: 1;
  height: 100vh;
  background-image: linear-gradient(90deg, rgba(5,11,26,0.1) 0%, #050B1A 100%),
    url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=1200');
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 80px;
  box-sizing: border-box;
  position: relative;
}

@media (max-width: 1024px) {
  .auth-panel-right { display: none; }
  .auth-panel-left { width: 100%; padding: 40px; }
}

.auth-form, .auth-tabs, .auth-brand, .auth-title, .auth-subtitle,
.auth-error, .auth-success, .saved-accounts, .reg-steps {
  width: 100%;
  max-width: 560px;
}

.auth-brand {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 20px; align-self: flex-start;
}

.auth-brand-dot {
  width: 12px; height: 12px;
  background-color: #FF4D6D; border-radius: 50%;
}

.auth-brand-name {
  font-family: 'Outfit', sans-serif; font-weight: 800;
  font-size: 24px; color: #FFFFFF; letter-spacing: -0.5px;
}

.auth-title {
  font-family: 'Outfit', sans-serif; font-size: 28px;
  font-weight: 800; color: #FFFFFF; margin: 0 0 4px; text-align: left;
}

.auth-subtitle {
  font-size: 14px; color: #94A3B8; margin: 0 0 20px; line-height: 1.5; text-align: left;
}

.auth-error {
  background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3);
  color: #FB7185; border-radius: 10px; padding: 12px 16px;
  font-size: 14px; font-weight: 500; margin-bottom: 16px;
}

.auth-success {
  background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3);
  color: #6EE7B7; border-radius: 10px; padding: 12px 16px;
  font-size: 14px; font-weight: 500; margin-bottom: 16px;
}

/* Saved accounts */
.saved-accounts {
  display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;
}

.saved-accounts-label {
  font-size: 11px; font-weight: 700; color: #64748B;
  text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
}

.saved-account-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03); cursor: pointer;
  transition: all 0.2s;
}

.saved-account-row:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.2);
}

.saved-account-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #FF4D6D, #c0153a);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; color: #fff; overflow: hidden; flex-shrink: 0;
}

.saved-account-avatar img { width: 100%; height: 100%; object-fit: cover; }

.saved-account-info { flex: 1; min-width: 0; }

.saved-account-name {
  font-size: 13px; font-weight: 700; color: #FFFFFF;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.saved-account-email {
  font-size: 11px; color: #64748B;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.saved-account-badge {
  font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;
  text-transform: capitalize; flex-shrink: 0;
}

.saved-account-badge.role-coach { background: #FEF3C7; color: #D97706; }
.saved-account-badge.role-admin { background: #EDE9FE; color: #7C3AED; }
.saved-account-badge.role-athlete { background: rgba(0,242,254,0.1); color: #00F2FE; }

.saved-account-remove {
  background: transparent; border: none; color: rgba(255,255,255,0.3);
  font-size: 18px; cursor: pointer; padding: 4px 6px; border-radius: 6px;
  line-height: 1; transition: all 0.15s;
}
.saved-account-remove:hover { color: #EF4444; background: rgba(239,68,68,0.1); }

/* Tabs */
.auth-tabs {
  display: flex; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px; gap: 0;
}

.auth-tab {
  flex: 1; background: none; border: none;
  border-bottom: 2px solid transparent; color: #64748B;
  padding-bottom: 12px; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}

.auth-tab.active { color: #FF4D6D; border-bottom-color: #FF4D6D; }

/* Registration step indicator */
.reg-steps {
  display: flex; align-items: center; gap: 0;
  margin-bottom: 24px;
}

.reg-step {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}

.reg-step-num {
  width: 30px; height: 30px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #64748B;
  transition: all 0.3s;
}

.reg-step.active .reg-step-num {
  background: #FF4D6D; border-color: #FF4D6D; color: #FFFFFF;
}

.reg-step.done .reg-step-num {
  background: rgba(16,185,129,0.2); border-color: #10B981; color: #10B981;
}

.reg-step-label {
  font-size: 10px; font-weight: 600; color: #64748B;
  text-transform: uppercase; letter-spacing: 0.5px;
}

.reg-step.active .reg-step-label { color: #FF4D6D; }
.reg-step.done .reg-step-label { color: #10B981; }

.reg-step-line {
  flex: 1; height: 1px; background: rgba(255,255,255,0.1);
  margin: 0 8px; margin-bottom: 14px;
}

/* Form */
.auth-form {
  display: flex; flex-direction: column; gap: 14px;
  width: 100%; max-width: 560px;
}

.auth-field {
  display: flex; flex-direction: column; gap: 6px;
}

.auth-field label {
  font-size: 13px; font-weight: 600; color: #E2E8F0; letter-spacing: 0.2px;
}

.auth-field input,
.auth-field select {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px; font-size: 14px; color: #FFFFFF;
  outline: none; transition: all 0.2s;
}

.auth-field input::placeholder { color: #64748B; }

.auth-field select option { background-color: #0D2040; color: #FFFFFF; }

.auth-field input:focus,
.auth-field select:focus {
  border-color: #FF4D6D;
  box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

input:-webkit-autofill, input:-webkit-autofill:hover,
input:-webkit-autofill:focus, input:-webkit-autofill:active {
  transition: background-color 5000s ease-in-out 0s;
  -webkit-text-fill-color: #FFFFFF !important;
}

.auth-fields-row { display: flex; gap: 16px; flex-wrap: wrap; }
.auth-fields-row .auth-field { flex: 1; min-width: 0; }

.auth-submit {
  margin-top: 4px; padding: 12px;
  font-size: 15px; font-weight: 700;
  background: #FF4D6D; color: #FFFFFF;
  border-radius: 10px; border: none;
  cursor: pointer; display: flex; align-items: center;
  justify-content: center; min-height: 46px;
  transition: background 0.2s, transform 0.15s;
}
.auth-submit:hover:not(:disabled) { background: #e8374f; transform: translateY(-1px); }
.auth-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.auth-forgot-btn {
  background: none; border: none; color: #64748B;
  font-size: 13px; cursor: pointer; text-align: right;
  padding: 0; margin-top: -6px; transition: color 0.2s;
  align-self: flex-end;
}
.auth-forgot-btn:hover { color: #FF4D6D; }

.auth-link-btn {
  background: none; border: none; color: #64748B;
  font-size: 13px; cursor: pointer; text-align: center;
  padding: 4px; transition: color 0.2s; width: 100%;
}
.auth-link-btn:hover:not(:disabled) { color: #00F2FE; }
.auth-link-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.auth-role-subfields {
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  display: flex; flex-direction: column; gap: 14px;
}

.subfields-title {
  font-size: 13px; font-weight: 700; color: #FF4D6D;
  text-transform: uppercase; letter-spacing: 0.5px; margin: 0;
}

.checkbox-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #E2E8F0; cursor: pointer;
}

.checkbox-label input { cursor: pointer; accent-color: #FF4D6D; }

.auth-spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.auth-divider {
  display: flex; align-items: center; color: #64748B;
  font-size: 13px; gap: 12px; margin: 4px 0;
}
.auth-divider::before, .auth-divider::after {
  content: ''; flex: 1; border-bottom: 1px solid rgba(255,255,255,0.1);
}

.auth-sso-buttons { display: flex; gap: 16px; }

.sso-btn {
  flex: 1; padding: 11px; border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05); color: #FFFFFF;
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  gap: 10px; transition: all 0.2s;
}
.sso-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.3);
}

.google-input-box {
  color: #0F172A !important; background-color: #FFFFFF !important;
  border: 1.5px solid #CBD5E1 !important; box-sizing: border-box !important;
}
.google-input-box:focus {
  color: #0F172A !important; background-color: #FFFFFF !important;
  border-color: #4285F4 !important;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.2) !important;
}

@media (max-width: 640px) {
  .auth-panel-left {
    width: 100% !important;
    padding: 24px 16px !important;
  }
  .auth-title {
    font-size: 24px !important;
  }
  .auth-subtitle {
    font-size: 13px !important;
    margin-bottom: 16px !important;
  }
  .auth-fields-row {
    flex-direction: column !important;
    gap: 12px !important;
  }
  .auth-fields-row .auth-field {
    width: 100% !important;
  }
  .guest-fields-grid {
    grid-template-columns: 1fr !important;
  }
  .auth-role-subfields {
    padding: 14px 12px !important;
  }
  .auth-sso-buttons {
    flex-direction: column !important;
  }
  .sso-btn {
    width: 100% !important;
  }
}
`;

export default AuthPage;
