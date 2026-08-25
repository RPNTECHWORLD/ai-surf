// Global fetch interceptor for fully offline / backend-less mock mode

const originalFetch = window.fetch;

// Initialize Seed Data (Reset on page refresh as per client's request)
const INITIAL_INSTRUCTORS = [
  {
    id: 1,
    name: "Kai Lenny",
    email: "kai@aisurf.com",
    age: 30,
    gender: "Male",
    fitness_level: "Elite",
    experience: "12 Years",
    certifications: ["ISA Level 2", "CPR"],
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
    bio: "Big wave charger and multi-discipline waterman.",
    specializations: ["S&C", "Video Analysis", "Big Wave"],
    rates: "$150 / hr",
    location: "Maui, Hawaii",
    reviews: [
      { student: "Emma Watson", rating: 5, comment: "Kai is an incredible coach! He breaks down paddling technique so clearly." }
    ]
  },
  {
    id: 2,
    name: "Bethany Hamilton",
    email: "bethany@aisurf.com",
    age: 34,
    gender: "Female",
    fitness_level: "Elite",
    experience: "15 Years",
    certifications: ["ISA Level 3", "First Aid"],
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100",
    bio: "Professional surfer and inspirational speaker.",
    specializations: ["S&C", "Nutrition"],
    rates: "$200 / hr",
    location: "Kauai, Hawaii",
    reviews: []
  },
  {
    id: 3,
    name: "Kolohe Andino",
    email: "kolohe@aisurf.com",
    age: 28,
    gender: "Male",
    fitness_level: "Advanced",
    experience: "8 Years",
    certifications: ["ISA Level 1", "CPR"],
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
    bio: "CT surfer specializing in heat strategy and performance techniques.",
    specializations: ["Competition Strategy", "Video Analysis"],
    rates: "$120 / hr",
    location: "San Clemente, CA",
    reviews: []
  },
  {
    id: 4,
    name: "Carissa Moore",
    email: "carissa@aisurf.com",
    age: 31,
    gender: "Female",
    fitness_level: "Elite",
    experience: "14 Years",
    certifications: ["ISA Level 3", "First Aid", "Water Safety"],
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100",
    bio: "5x World Champion passionate about youth coaching.",
    specializations: ["S&C", "Competition Strategy"],
    rates: "$180 / hr",
    location: "Honolulu, Hawaii",
    reviews: []
  },
  {
    id: 5,
    name: "Marcus Silva",
    email: "marcus@aisurf.com",
    age: 27,
    gender: "Male",
    fitness_level: "Advanced",
    experience: "6 Years",
    certifications: ["ISA Level 2", "Water Safety"],
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
    bio: "Experienced surf instructor specializing in beginners.",
    specializations: ["Video Analysis", "Water Safety"],
    rates: "$80 / hr",
    location: "Gold Coast, AUS",
    reviews: []
  }
];

const INITIAL_STUDENTS = [
  {
    id: 1,
    name: "Chloe Kim",
    email: "chloe@aisurf.com",
    level: "Intermediate",
    instructor_id: 5,
    instructor: "Marcus Silva",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100",
    last_active: "Today",
    bio: "Olympic gold medalist snowboarder finding my wave rhythm.",
    age: 23,
    division: "Women's Open",
    stance: "regular",
    surf_stats: { waves_ridden: 42, max_speed: "24 mph", avg_session_mins: 75 },
    performance_logs: ["Pipeline clean swell - pop-up speed fast.", "Waikiki session - balanced weight distribution."]
  },
  {
    id: 2,
    name: "John Miller",
    email: "john@aisurf.com",
    level: "Beginner",
    instructor_id: 2,
    instructor: "Bethany Hamilton",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
    last_active: "Today",
    bio: "Stoked to learn and charge big waves.",
    age: 19,
    division: "Juniors",
    stance: "goofy",
    surf_stats: { waves_ridden: 18, max_speed: "16 mph", avg_session_mins: 60 },
    performance_logs: []
  },
  {
    id: 3,
    name: "Emma Watson",
    email: "emma@aisurf.com",
    level: "Intermediate",
    instructor_id: 1,
    instructor: "Kai Lenny",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100",
    last_active: "Today",
    bio: "Surfing is my peace from screen acting.",
    age: 25,
    division: "Women's Amateur",
    stance: "regular",
    surf_stats: { waves_ridden: 31, max_speed: "18 mph", avg_session_mins: 90 },
    performance_logs: ["Intro to duck diving success."]
  },
  {
    id: 4,
    name: "Rick Grimes",
    email: "rick@aisurf.com",
    level: "Advanced",
    instructor_id: 4,
    instructor: "Carissa Moore",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
    last_active: "Today",
    bio: "Looking to refine my rail-to-rail transitions.",
    age: 35,
    division: "Men's Open",
    stance: "regular",
    surf_stats: { waves_ridden: 55, max_speed: "22 mph", avg_session_mins: 80 },
    performance_logs: []
  },
  {
    id: 5,
    name: "Sarah Connor",
    email: "sarah@aisurf.com",
    level: "Beginner",
    instructor_id: 3,
    instructor: "Kolohe Andino",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100",
    last_active: "Today",
    bio: "Getting surf-fit and mastering the basics.",
    age: 29,
    division: "Women's Amateur",
    stance: "regular",
    surf_stats: { waves_ridden: 12, max_speed: "12 mph", avg_session_mins: 60 },
    performance_logs: []
  },
  {
    id: 6,
    name: "James Bond",
    email: "james@aisurf.com",
    level: "Master",
    instructor_id: 5,
    instructor: "Marcus Silva",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
    last_active: "Today",
    bio: "Secret mission on the high seas.",
    age: 38,
    division: "Men's Open",
    stance: "regular",
    surf_stats: { waves_ridden: 112, max_speed: "31 mph", avg_session_mins: 100 },
    performance_logs: []
  }
];

const INITIAL_SESSIONS = [
  {
    id: 1,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: "08:00 AM",
    duration_mins: 90,
    student_id: 2,
    student: "John Miller",
    instructor_id: 1,
    instructor: "Kai Lenny",
    location: "Pipeline",
    condition: "Hard",
    type: "Advanced",
    status: "IN PROGRESS",
    notes: "Strong offshore wind, good form",
    video_url: ""
  },
  {
    id: 2,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: "09:30 AM",
    duration_mins: 60,
    student_id: 3,
    student: "Emma Watson",
    instructor_id: 2,
    instructor: "Bethany Hamilton",
    location: "Waikiki",
    condition: "Easy",
    type: "Beginner",
    status: "Upcoming",
    notes: "",
    video_url: ""
  },
  {
    id: 3,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: "11:00 AM",
    duration_mins: 120,
    student_id: 4,
    student: "Rick Grimes",
    instructor_id: 3,
    instructor: "Kolohe Andino",
    location: "Sunset Beach",
    condition: "Moderate",
    type: "Intermediate",
    status: "Upcoming",
    notes: "",
    video_url: ""
  },
  {
    id: 4,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: "02:00 PM",
    duration_mins: 90,
    student_id: 5,
    student: "Sarah Connor",
    instructor_id: 4,
    instructor: "Carissa Moore",
    location: "Pipeline",
    condition: "Hard",
    type: "Master",
    status: "Upcoming",
    notes: "",
    video_url: ""
  },
  {
    id: 5,
    date: "12 Jun 2025",
    time: "08:00 AM",
    duration_mins: 90,
    student_id: 1,
    student: "Chloe Kim",
    instructor_id: 1,
    instructor: "Kai Lenny",
    location: "Pipeline",
    condition: "Hard",
    type: "Advanced",
    status: "Completed",
    notes: "Excellent session",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  },
  {
    id: 6,
    date: "12 Jun 2025",
    time: "10:30 AM",
    duration_mins: 60,
    student_id: 3,
    student: "Emma Watson",
    instructor_id: 2,
    instructor: "Bethany Hamilton",
    location: "Waikiki",
    condition: "Easy",
    type: "Beginner",
    status: "Completed",
    notes: "",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
  }
];

const INITIAL_BADGES = [
  { id: 1, student_id: 1, badge_level: "WHITE" },
  { id: 2, student_id: 1, badge_level: "YELLOW" },
  { id: 3, student_id: 2, badge_level: "WHITE" },
  { id: 4, student_id: 3, badge_level: "WHITE" },
  { id: 5, student_id: 3, badge_level: "YELLOW" },
  { id: 6, student_id: 3, badge_level: "GREEN" },
  { id: 7, student_id: 4, badge_level: "WHITE" },
  { id: 8, student_id: 4, badge_level: "YELLOW" },
  { id: 9, student_id: 4, badge_level: "GREEN" },
  { id: 10, student_id: 4, badge_level: "BLUE" },
  { id: 11, student_id: 5, badge_level: "WHITE" },
  { id: 12, student_id: 6, badge_level: "WHITE" },
  { id: 13, student_id: 6, badge_level: "YELLOW" },
  { id: 14, student_id: 6, badge_level: "GREEN" },
  { id: 15, student_id: 6, badge_level: "BLUE" },
  { id: 16, student_id: 6, badge_level: "RED" }
];

const INITIAL_ACTIVITIES = [
  { id: 1, text: "Emma Watson earned 'First Barrel' badge", type: "badge", time: "10m ago" },
  { id: 2, text: "John Miller completed session with Kai", type: "session", time: "1h ago" },
  { id: 3, text: "Rick Grimes joined 'Intermediate' cohort", type: "group", time: "3h ago" },
  { id: 4, text: "Chloe Kim scored personal best this session", type: "session", time: "1d ago" },
  { id: 5, text: "James Bond earned RED badge — Master level!", type: "badge", time: "2d ago" }
];

const INITIAL_SCHOOLS = [
  {
    id: 1,
    name: "Aquatic Indica Surf School",
    owner: "Aquatic Admin",
    email: "rpntechworld@gmail.com",
    phone: "+91 9876543210",
    country: "India",
    city: "Kovalam / Chennai",
    instructor_count: "5–15",
    website: "https://aquaticindica.com"
  },
  {
    id: 2,
    name: "Pipeline Surf School",
    owner: "John Doe",
    email: "hello@pipeline.com",
    phone: "+1 808 555 0100",
    country: "United States",
    city: "Honolulu",
    instructor_count: "6–15",
    website: "https://pipeline.com"
  }
];

// In-Memory Database State
const registeredUsers = {};

const state = {
  instructors: [...INITIAL_INSTRUCTORS],
  students: [...INITIAL_STUDENTS],
  sessions: [...INITIAL_SESSIONS],
  badges: [...INITIAL_BADGES],
  activityLogs: [...INITIAL_ACTIVITIES],
  schools: [...INITIAL_SCHOOLS],
  
  // Vitals logs keyed by student_id
  nutritionLogs: {
    1: [
      { id: 1, date: "01 Aug 2026", calories: 2400, hydration_liters: 3.0, protein_g: 140, carbs_g: 300, fats_g: 70, meal_timing: "Pre-heat smoothie 9AM, Post-surf lunch 1PM" },
      { id: 2, date: "02 Aug 2026", calories: 2600, hydration_liters: 3.5, protein_g: 150, carbs_g: 320, fats_g: 75, meal_timing: "Pre-heat oatmeal 8AM, Competition snack 11AM" },
      { id: 3, date: "03 Aug 2026", calories: 2500, hydration_liters: 3.2, protein_g: 145, carbs_g: 310, fats_g: 72, meal_timing: "Energy bar 9:30AM, Post-heat dinner 6PM" }
    ]
  },
  scLogs: {
    1: [
      { id: 1, date: "01 Aug 2026", workout_details: "Strength Session: Deadlifts 3x5, Squats 4x6, Core workout", mobility_notes: "Good hip mobility, slight stiffness in thoracic spine", sleep_score: 82, recovery_score: 85, injury_notes: "" },
      { id: 2, date: "02 Aug 2026", workout_details: "Active Recovery: Swim 30 mins, light stretching", mobility_notes: "Thoracic spine mobility drills", sleep_score: 90, recovery_score: 92, injury_notes: "" },
      { id: 3, date: "03 Aug 2026", workout_details: "Power Session: Box jumps 4x5, Kettlebell swings 4x10", mobility_notes: "Full body dynamic warm-up", sleep_score: 85, recovery_score: 88, injury_notes: "Mild left shoulder tightness" }
    ]
  },
  technicalLogs: {
    1: [
      { id: 1, date: "01 Aug 2026", session_notes: "Felt good in 4-6ft barrels. Focus on pop-up speed.", wave_count: 12, board_setup: "6'1 Channel Islands Shortboard, Thruster fin setup", wave_type: "Reef break barrel", video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
      { id: 2, date: "02 Aug 2026", session_notes: "Clean beach break session. Practice snaps and cutbacks.", wave_count: 18, board_setup: "6'0 Firewire, Quad fin setup", wave_type: "Beach break A-frame", video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
      { id: 3, date: "03 Aug 2026", session_notes: "Tested thruster fin configuration in heavy surf.", wave_count: 14, board_setup: "6'2 Pyzel Gun, Thruster setup", wave_type: "Point break, fast and hollow", video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }
    ]
  },
  mentalLogs: {
    1: [
      { id: 1, date: "01 Aug 2026", pre_heat_anxiety: 4, focus_level: 8, reflection_notes: "Stayed calm before paddling out. Visualization helped." },
      { id: 2, date: "02 Aug 2026", pre_heat_anxiety: 3, focus_level: 9, reflection_notes: "Highly focused today. Flow state achieved in early waves." },
      { id: 3, date: "03 Aug 2026", pre_heat_anxiety: 5, focus_level: 7, reflection_notes: "Anxiety was a bit high due to heavy swell. Focus improved after first wave." }
    ]
  }
};

// Map generated tokens to user data
const activeSessions = {};

// Helper to make Response objects
const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

const errorResponse = (detail, status = 400) => {
  return jsonResponse({ detail }, status);
};

// Global window.fetch Override
window.fetch = async function (input, init) {
  let urlStr = typeof input === 'string' ? input : input.url;

  // Check if target is backend API
  if (urlStr.includes('http://localhost:8000') || urlStr.includes('/api/')) {
    const method = (init && init.method || 'GET').toUpperCase();
    const headers = init && init.headers || {};
    
    // Parse route path e.g. /api/auth/login
    let path = '';
    try {
      const parsedUrl = new URL(urlStr, window.location.origin);
      path = parsedUrl.pathname;
    } catch (e) {
      // Fallback manual parse
      const apiIdx = urlStr.indexOf('/api/');
      if (apiIdx !== -1) {
        path = urlStr.substring(apiIdx);
      }
    }

    console.log(`[Mock API Interceptor] ${method} ${path}`, init);

    // Extract auth token
    let authUser = null;
    let authHeader = headers['Authorization'] || (headers.get && headers.get('Authorization'));
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      authUser = activeSessions[token] || null;
    }

    // ─── 1. Stats and Features for Landing Page ───
    if (path === '/api/stats') {
      return jsonResponse([
        { value: `${max(500, state.schools.length)}+`, label: "SURF SCHOOLS" },
        { value: `${max(12000, state.students.length * 100).toLocaleString()}+`, label: "STUDENTS" },
        { value: "98%", label: "SATISFACTION RATE" },
        { value: "45", label: "COUNTRIES" }
      ]);
    }
    if (path === '/api/features') {
      return jsonResponse([
        { icon: "camera", title: "AI Video Analysis", description: "Break down every turn with frame-by-frame posture and wave positioning analysis." },
        { icon: "activity", title: "Session Tracking", description: "Log every wave. Track speed, duration, and performance metrics in real-time." },
        { icon: "award", title: "Badge System", description: "Gamify progress. Award students with dynamic badges as they level up skills." },
        { icon: "users", title: "Competition Hub", description: "Organize, judge, and live-stream local competitions with pro-grade tools." }
      ]);
    }

    // Helper for stats logic matching backend code
    function max(a, b) { return a > b ? a : b; }

    // ─── 2. Auth Routes ───
    if (path === '/api/auth/login' && method === 'POST') {
      const body = JSON.parse(init.body);
      const email = body.email.toLowerCase();
      const password = body.password;

      // Find user from seeded records or check names
      let matchingUser = null;
      
      // Seeded accounts check
      if (email === 'rpntechworld@gmail.com' && password === '12345678') {
        matchingUser = { id: 99, email: 'rpntechworld@gmail.com', role: 'admin', name: 'School Admin', image: '' };
      } else if (email === 'admin@aisurf.com' && password === 'admin123') {
        matchingUser = { id: 99, email: 'admin@aisurf.com', role: 'admin', name: 'School Admin', image: '' };
      } else {
        // Check coaches
        const inst = state.instructors.find(i => i.email === email);
        if (inst && password === `${inst.name.split(' ')[0].toLowerCase()}123`) {
          matchingUser = { id: inst.id, email: inst.email, role: 'coach', instructor_id: inst.id, name: inst.name, image: inst.image };
        } else {
          // Check students
          const stud = state.students.find(s => s.email === email);
          if (stud && password === `${stud.name.split(' ')[0].toLowerCase()}123`) {
            matchingUser = { id: stud.id, email: stud.email, role: 'athlete', student_id: stud.id, name: stud.name, image: stud.image };
          } else if (registeredUsers[email] && registeredUsers[email].password === password) {
            matchingUser = registeredUsers[email].user;
          }
        }
      }

      if (!matchingUser) {
        return errorResponse("Invalid email or password", 401);
      }

      const token = `mock_token_${matchingUser.email}_${Math.random().toString(36).substring(7)}`;
      activeSessions[token] = matchingUser;

      return jsonResponse({
        token,
        user: matchingUser
      });
    }

    if (path === '/api/auth/signup' && method === 'POST') {
      const body = JSON.parse(init.body);
      const email = body.email.toLowerCase();
      
      // Check existing
      if (email === 'admin@aisurf.com' || state.instructors.some(i => i.email === email) || state.students.some(s => s.email === email)) {
        return errorResponse("Email is already registered", 400);
      }

      const role = body.role.toLowerCase();
      let newUser = { id: Math.floor(Math.random() * 1000) + 10, email, role, name: body.name, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" };

      if (role === 'athlete') {
        const newStudent = {
          id: state.students.length + 1,
          name: body.name,
          email,
          level: "Beginner",
          instructor_id: 1,
          instructor: "Kai Lenny",
          image: newUser.image,
          last_active: "Today",
          bio: "",
          age: body.age || 20,
          division: body.division || "Men's Open",
          stance: body.stance || "regular",
          surf_stats: { waves_ridden: 0, max_speed: "0 mph", avg_session_mins: 0 },
          performance_logs: []
        };
        state.students.push(newStudent);
        newUser.student_id = newStudent.id;
        state.activityLogs.unshift({ id: Date.now(), text: `${body.name} signed up as a new Student`, type: "group", time: "Just now" });
      } else if (role === 'coach') {
        const newInstructor = {
          id: state.instructors.length + 1,
          name: body.name,
          email,
          age: 30,
          gender: "Male",
          fitness_level: "Advanced",
          experience: "1 Year",
          certifications: [],
          image: newUser.image,
          bio: "",
          specializations: body.specializations || [],
          rates: body.rates || "$50 / hr",
          location: body.location || "Gold Coast, AUS",
          reviews: []
        };
        state.instructors.push(newInstructor);
        newUser.instructor_id = newInstructor.id;
        state.activityLogs.unshift({ id: Date.now(), text: `New Coach ${body.name} registered on the platform`, type: "group", time: "Just now" });
      } else if (role === 'admin') {
        const schName = (body.school || "").trim() || `${body.name}'s Surf School`;
        newUser.school_name = schName;
        newUser.name = body.name || "School Admin";
        if (!state.schools.some(s => s.email === email || s.name === schName)) {
          state.schools.push({
            id: state.schools.length + 1,
            name: schName,
            owner: body.name,
            email: email,
            phone: body.whatsapp_number || "+91 9876543210",
            country: "India",
            city: "Kovalam / Chennai",
            instructor_count: "5-15",
            website: ""
          });
        }
        state.activityLogs.unshift({ id: Date.now(), text: `School Admin ${body.name} registered ${schName}`, type: "group", time: "Just now" });
      }

      registeredUsers[email] = {
        user: newUser,
        password: body.password
      };

      const token = `mock_token_${newUser.email}_${Math.random().toString(36).substring(7)}`;
      activeSessions[token] = newUser;

      return jsonResponse({
        token,
        user: newUser
      });
    }

    if (path === '/api/auth/sso' && method === 'POST') {
      const body = JSON.parse(init.body);
      const email = body.email.toLowerCase();

      // Check if user exists
      let matchingUser = null;
      const inst = state.instructors.find(i => i.email === email);
      if (inst) {
        matchingUser = { id: inst.id, email: inst.email, role: 'coach', instructor_id: inst.id, name: inst.name, image: inst.image };
      } else {
        const stud = state.students.find(s => s.email === email);
        if (stud) {
          matchingUser = { id: stud.id, email: stud.email, role: 'athlete', student_id: stud.id, name: stud.name, image: stud.image };
        }
      }

      if (!matchingUser) {
        if (!body.role) {
          // Send request back requesting role choice
          return jsonResponse({
            needs_role: true,
            email: body.email,
            name: body.name,
            social_id: body.social_id,
            provider: body.provider
          });
        }

        // Register new SSO user
        const role = body.role.toLowerCase();
        matchingUser = { id: Math.floor(Math.random() * 1000) + 10, email, role, name: body.name, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" };

        if (role === 'athlete') {
          const newStudent = {
            id: state.students.length + 1,
            name: body.name,
            email,
            level: "Beginner",
            instructor_id: 1,
            instructor: "Kai Lenny",
            image: matchingUser.image,
            last_active: "Today",
            bio: "SSO Athlete profile",
            age: 21,
            division: "Men's Open",
            stance: "regular",
            surf_stats: { waves_ridden: 0, max_speed: "0 mph", avg_session_mins: 0 },
            performance_logs: []
          };
          state.students.push(newStudent);
          matchingUser.student_id = newStudent.id;
        } else if (role === 'coach') {
          const newInstructor = {
            id: state.instructors.length + 1,
            name: body.name,
            email,
            age: 28,
            gender: "Male",
            fitness_level: "Advanced",
            experience: "2 Years",
            certifications: [],
            image: matchingUser.image,
            bio: "SSO Coach profile",
            specializations: [],
            rates: "$60 / hr",
            location: "Gold Coast, AUS",
            reviews: []
          };
          state.instructors.push(newInstructor);
          matchingUser.instructor_id = newInstructor.id;
        }
      }

      const token = `mock_token_${matchingUser.email}_${Math.random().toString(36).substring(7)}`;
      activeSessions[token] = matchingUser;

      return jsonResponse({
        token,
        user: matchingUser
      });
    }

    if (path === '/api/auth/me' && method === 'GET') {
      if (!authUser) return errorResponse("Not authenticated", 401);
      return jsonResponse(authUser);
    }

    // ─── 3. Video Upload Route ───
    if (path === '/api/upload-video' && method === 'POST') {
      let file = null;
      if (init && init.body instanceof FormData) {
        file = init.body.get('file');
      }
      
      // Cache file locally in browser tab memory
      let localBlobUrl = file ? URL.createObjectURL(file) : '';
      if (localBlobUrl && file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.avi') || file.name.endsWith('.mkv'))) {
        localBlobUrl += '#video.mp4';
      }
      console.log("[Mock API] Created local Blob URL for uploaded video:", localBlobUrl);
      return jsonResponse({
        video_url: localBlobUrl
      });
    }

    // ─── 4. Students Routes ───
    if (path === '/api/students' && method === 'GET') {
      return jsonResponse(state.students);
    }

    if (path === '/api/students' && method === 'POST') {
      const body = JSON.parse(init.body);
      const studentInst = state.instructors.find(i => i.id === body.instructor_id);
      const newStudent = {
        id: state.students.length + 1,
        name: body.name,
        email: body.email,
        level: body.level,
        instructor_id: body.instructor_id,
        instructor: studentInst ? studentInst.name : "",
        image: body.image || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
        last_active: "Today",
        bio: "",
        age: 20,
        division: "Men's Open",
        stance: "regular",
        surf_stats: { waves_ridden: 0, max_speed: "0 mph", avg_session_mins: 0 },
        performance_logs: []
      };
      state.students.push(newStudent);
      state.activityLogs.unshift({ id: Date.now(), text: `${body.name} joined as a new student`, type: "group", time: "Just now" });
      return jsonResponse(newStudent);
    }

    // Dynamic matches for students/:id
    const studentIdMatch = path.match(/^\/api\/students\/(\d+)$/);
    if (studentIdMatch) {
      const id = parseInt(studentIdMatch[1]);
      const studentIdx = state.students.findIndex(s => s.id === id);

      if (studentIdx === -1) {
        return errorResponse("Student not found", 404);
      }

      if (method === 'GET') {
        const student = state.students[studentIdx];
        const studentBadges = state.badges.filter(b => b.student_id === id).map(b => b.badge_level);
        const studentSessions = state.sessions.filter(s => s.student_id === id);
        return jsonResponse({
          ...student,
          badges: studentBadges,
          session_count: studentSessions.length,
          sessions: studentSessions
        });
      }

      if (method === 'PUT') {
        const body = JSON.parse(init.body);
        const student = state.students[studentIdx];
        
        if (body.name !== undefined) student.name = body.name;
        if (body.level !== undefined) student.level = body.level;
        if (body.bio !== undefined) student.bio = body.bio;
        if (body.stance !== undefined) student.stance = body.stance;
        if (body.age !== undefined) student.age = body.age;
        if (body.division !== undefined) student.division = body.division;
        if (body.surf_stats !== undefined) student.surf_stats = body.surf_stats;
        if (body.performance_logs !== undefined) student.performance_logs = body.performance_logs;

        return jsonResponse(student);
      }

      if (method === 'DELETE') {
        state.students.splice(studentIdx, 1);
        return jsonResponse({ message: "Deleted" });
      }
    }

    // ─── 5. Instructors Routes ───
    if (path === '/api/instructors' && method === 'GET') {
      return jsonResponse(state.instructors);
    }

    if (path === '/api/instructors' && method === 'POST') {
      const body = JSON.parse(init.body);
      const newInst = {
        id: state.instructors.length + 1,
        name: body.name,
        age: body.age,
        gender: body.gender,
        fitness_level: body.fitness_level,
        experience: body.experience,
        certifications: body.certifications || [],
        image: body.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
        bio: "",
        specializations: [],
        rates: "$75 / hr",
        location: "Gold Coast, AUS",
        reviews: []
      };
      state.instructors.push(newInst);
      state.activityLogs.unshift({ id: Date.now(), text: `New instructor ${body.name} joined the team`, type: "group", time: "Just now" });
      return jsonResponse(newInst);
    }

    // Dynamic matches for instructors/:id
    const instIdMatch = path.match(/^\/api\/instructors\/(\d+)$/);
    if (instIdMatch) {
      const id = parseInt(instIdMatch[1]);
      const instIdx = state.instructors.findIndex(i => i.id === id);

      if (instIdx === -1) {
        return errorResponse("Instructor not found", 404);
      }

      if (method === 'GET') {
        const instructor = state.instructors[instIdx];
        const instSessions = state.sessions.filter(s => s.instructor_id === id).map(s => ({
          date: s.date,
          time: s.time,
          student: s.student,
          location: s.location,
          status: s.status
        }));
        const uniqueStudentCount = new Set(state.sessions.filter(s => s.instructor_id === id).map(s => s.student_id)).size;

        return jsonResponse({
          ...instructor,
          sessions: instSessions,
          student_count: uniqueStudentCount
        });
      }

      if (method === 'PUT') {
        const body = JSON.parse(init.body);
        const instructor = state.instructors[instIdx];
        
        if (body.name !== undefined) instructor.name = body.name;
        if (body.bio !== undefined) instructor.bio = body.bio;
        if (body.experience !== undefined) instructor.experience = body.experience;
        if (body.fitness_level !== undefined) instructor.fitness_level = body.fitness_level;
        if (body.specializations !== undefined) instructor.specializations = body.specializations;
        if (body.rates !== undefined) instructor.rates = body.rates;
        if (body.location !== undefined) instructor.location = body.location;
        if (body.certifications !== undefined) instructor.certifications = body.certifications;

        return jsonResponse(instructor);
      }

      if (method === 'DELETE') {
        state.instructors.splice(instIdx, 1);
        return jsonResponse({ message: "Deleted" });
      }
    }

    // ─── 6. Sessions Routes ───
    if (path === '/api/sessions' && method === 'GET') {
      return jsonResponse(state.sessions);
    }

    if (path === '/api/sessions' && method === 'POST') {
      const body = JSON.parse(init.body);
      const student = state.students.find(s => s.id === parseInt(body.student_id));
      const instructor = state.instructors.find(i => i.id === parseInt(body.instructor_id));

      const newSession = {
        id: state.sessions.length + 1,
        date: body.date,
        time: body.time,
        duration_mins: parseInt(body.duration_mins) || 60,
        student_id: parseInt(body.student_id),
        student: student ? student.name : "Unknown",
        instructor_id: parseInt(body.instructor_id),
        instructor: instructor ? instructor.name : "Unknown",
        location: body.location,
        condition: body.condition,
        type: body.type,
        status: body.status || "Upcoming",
        notes: body.notes || "",
        video_url: body.video_url || ""
      };
      state.sessions.unshift(newSession); // New session on top of UI

      state.activityLogs.unshift({
        id: Date.now(),
        text: `${student ? student.name : 'Unknown'} session with ${instructor ? instructor.name : 'Unknown'} scheduled at ${body.location}`,
        type: "session",
        time: "Just now"
      });

      return jsonResponse(newSession);
    }

    const sessionIdMatch = path.match(/^\/api\/sessions\/(\d+)$/);
    if (sessionIdMatch) {
      const id = parseInt(sessionIdMatch[1]);
      const sessionIdx = state.sessions.findIndex(s => s.id === id);

      if (sessionIdx === -1) {
        return errorResponse("Session not found", 404);
      }

      if (method === 'GET') {
        return jsonResponse(state.sessions[sessionIdx]);
      }

      if (method === 'PUT') {
        const body = JSON.parse(init.body);
        const session = state.sessions[sessionIdx];
        
        if (body.date !== undefined) session.date = body.date;
        if (body.time !== undefined) session.time = body.time;
        if (body.duration_mins !== undefined) session.duration_mins = parseInt(body.duration_mins);
        if (body.student_id !== undefined) {
          session.student_id = parseInt(body.student_id);
          const student = state.students.find(s => s.id === session.student_id);
          session.student = student ? student.name : "Unknown";
        }
        if (body.instructor_id !== undefined) {
          session.instructor_id = parseInt(body.instructor_id);
          const instructor = state.instructors.find(i => i.id === session.instructor_id);
          session.instructor = instructor ? instructor.name : "Unknown";
        }
        if (body.location !== undefined) session.location = body.location;
        if (body.condition !== undefined) session.condition = body.condition;
        if (body.type !== undefined) session.type = body.type;
        if (body.status !== undefined) session.status = body.status;
        if (body.notes !== undefined) session.notes = body.notes;
        if (body.video_url !== undefined) session.video_url = body.video_url;

        return jsonResponse(session);
      }

      if (method === 'DELETE') {
        state.sessions.splice(sessionIdx, 1);
        return jsonResponse({ message: "Deleted" });
      }
    }

    // ─── 7. Dashboard Routes ───
    if (path === '/api/dashboard/stats' && method === 'GET') {
      const completedThisMonth = state.sessions.filter(s => s.status === 'Completed').length;
      const upcoming = state.sessions.filter(s => s.status === 'Upcoming').length;
      return jsonResponse({
        active_instructors: state.instructors.length,
        active_students: state.students.length,
        sessions_this_month: completedThisMonth,
        upcoming_sessions: upcoming
      });
    }

    if (path === '/api/dashboard/sessions' && method === 'GET') {
      const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const todaySessions = state.sessions.filter(s => s.date === todayStr);
      return jsonResponse(
        todaySessions.map(s => ({
          time: s.time,
          instructor: s.instructor,
          student: s.student,
          status: s.status
        }))
      );
    }

    if (path === '/api/dashboard/activity' && method === 'GET') {
      return jsonResponse(state.activityLogs.slice(0, 5));
    }

    // ─── 8. Analytics Routes ───
    if (path === '/api/analytics/badges' && method === 'GET') {
      const BADGE_ORDER = ["WHITE", "YELLOW", "GREEN", "BLUE", "RED"];
      const result = BADGE_ORDER.map(level => {
        const count = state.badges.filter(b => b.badge_level === level).length;
        return { label: level, count };
      });
      return jsonResponse(result);
    }

    if (path === '/api/analytics/students' && method === 'GET') {
      const result = state.students.map(s => {
        const studentBadges = state.badges.filter(b => b.student_id === s.id).map(b => b.badge_level);
        const badgeCount = studentBadges.length;

        let nextTime = "2 months";
        let nextColor = "#64748B";

        if (badgeCount >= 5) {
          nextTime = "Max Level";
          nextColor = "#0D9488";
        } else if (badgeCount === 4) {
          nextTime = "3 months";
        } else if (badgeCount === 3) {
          nextTime = "Ready Now";
          nextColor = "#0D9488";
        } else if (badgeCount === 2) {
          nextTime = "1 month";
        } else if (badgeCount === 1) {
          nextTime = "3 weeks";
        }

        return {
          name: s.name,
          badges: badgeCount,
          badge_levels: studentBadges,
          nextTime,
          nextColor,
          instructor: s.instructor
        };
      });
      return jsonResponse(result);
    }

    // ─── 9. Schools Routes ───
    if (path === '/api/schools' && method === 'GET') {
      return jsonResponse(state.schools);
    }

    if (path === '/api/schools' && method === 'POST') {
      const body = JSON.parse(init.body);
      const newSchool = {
        id: state.schools.length + 1,
        name: body.name,
        owner: body.owner,
        email: body.email,
        phone: body.phone || "",
        country: body.country,
        city: body.city,
        instructor_count: body.instructor_count || "",
        website: body.website || ""
      };
      state.schools.push(newSchool);
      return jsonResponse({
        id: newSchool.id,
        message: `School '${body.name}' registered successfully!`
      });
    }

    // ─── 10. Student Logs Routes (Athlete Intelligence Dashboard) ───
    
    // Nutrition logs
    const nutritionLogMatch = path.match(/^\/api\/students\/(\d+)\/logs\/nutrition$/);
    if (nutritionLogMatch) {
      const studentId = parseInt(nutritionLogMatch[1]);
      if (method === 'GET') {
        const logs = state.nutritionLogs[studentId] || [];
        return jsonResponse([...logs].reverse()); // desc order
      }
      if (method === 'POST') {
        const body = JSON.parse(init.body);
        if (!state.nutritionLogs[studentId]) {
          state.nutritionLogs[studentId] = [];
        }
        const newLog = {
          id: state.nutritionLogs[studentId].length + 1,
          date: body.date,
          calories: parseInt(body.calories) || 0,
          hydration_liters: parseFloat(body.hydration_liters) || 0.0,
          protein_g: parseInt(body.protein_g) || 0,
          carbs_g: parseInt(body.carbs_g) || 0,
          fats_g: parseInt(body.fats_g) || 0,
          meal_timing: body.meal_timing || ""
        };
        state.nutritionLogs[studentId].push(newLog);
        return jsonResponse({ message: "Success", id: newLog.id });
      }
    }

    // S&C logs
    const scLogMatch = path.match(/^\/api\/students\/(\d+)\/logs\/sc$/);
    if (scLogMatch) {
      const studentId = parseInt(scLogMatch[1]);
      if (method === 'GET') {
        const logs = state.scLogs[studentId] || [];
        return jsonResponse([...logs].reverse());
      }
      if (method === 'POST') {
        const body = JSON.parse(init.body);
        if (!state.scLogs[studentId]) {
          state.scLogs[studentId] = [];
        }
        const newLog = {
          id: state.scLogs[studentId].length + 1,
          date: body.date,
          workout_details: body.workout_details,
          mobility_notes: body.mobility_notes || "",
          sleep_score: parseInt(body.sleep_score) || 0,
          recovery_score: parseInt(body.recovery_score) || 0,
          injury_notes: body.injury_notes || ""
        };
        state.scLogs[studentId].push(newLog);
        return jsonResponse({ message: "Success", id: newLog.id });
      }
    }

    // Technical logs
    const techLogMatch = path.match(/^\/api\/students\/(\d+)\/logs\/technical$/);
    if (techLogMatch) {
      const studentId = parseInt(techLogMatch[1]);
      if (method === 'GET') {
        const logs = state.technicalLogs[studentId] || [];
        return jsonResponse([...logs].reverse());
      }
      if (method === 'POST') {
        const body = JSON.parse(init.body);
        if (!state.technicalLogs[studentId]) {
          state.technicalLogs[studentId] = [];
        }
        const newLog = {
          id: state.technicalLogs[studentId].length + 1,
          date: body.date,
          session_notes: body.session_notes,
          wave_count: parseInt(body.wave_count) || 0,
          board_setup: body.board_setup || "",
          wave_type: body.wave_type || "",
          video_url: body.video_url || ""
        };
        state.technicalLogs[studentId].push(newLog);
        return jsonResponse({ message: "Success", id: newLog.id });
      }
    }

    // Mental logs
    const mentalLogMatch = path.match(/^\/api\/students\/(\d+)\/logs\/mental$/);
    if (mentalLogMatch) {
      const studentId = parseInt(mentalLogMatch[1]);
      if (method === 'GET') {
        const logs = state.mentalLogs[studentId] || [];
        return jsonResponse([...logs].reverse());
      }
      if (method === 'POST') {
        const body = JSON.parse(init.body);
        if (!state.mentalLogs[studentId]) {
          state.mentalLogs[studentId] = [];
        }
        const newLog = {
          id: state.mentalLogs[studentId].length + 1,
          date: body.date,
          pre_heat_anxiety: parseInt(body.pre_heat_anxiety) || 0,
          focus_level: parseInt(body.focus_level) || 0,
          reflection_notes: body.reflection_notes || ""
        };
        state.mentalLogs[studentId].push(newLog);
        return jsonResponse({ message: "Success", id: newLog.id });
      }
    }

    // Vitals logs summary
    const summaryMatch = path.match(/^\/api\/students\/(\d+)\/logs\/summary$/);
    if (summaryMatch) {
      const studentId = parseInt(summaryMatch[1]);

      const nutList = state.nutritionLogs[studentId] || [];
      const avgCalories = nutList.length ? Math.round(nutList.reduce((acc, curr) => acc + curr.calories, 0) / nutList.length) : 0;
      const avgHydration = nutList.length ? parseFloat((nutList.reduce((acc, curr) => acc + curr.hydration_liters, 0) / nutList.length).toFixed(1)) : 0.0;

      const scList = state.scLogs[studentId] || [];
      const avgSleep = scList.length ? Math.round(scList.reduce((acc, curr) => acc + curr.sleep_score, 0) / scList.length) : 0;
      const avgRecovery = scList.length ? Math.round(scList.reduce((acc, curr) => acc + curr.recovery_score, 0) / scList.length) : 0;

      const techList = state.technicalLogs[studentId] || [];
      const totalWaves = techList.reduce((acc, curr) => acc + curr.wave_count, 0);

      const mentalList = state.mentalLogs[studentId] || [];
      const avgAnxiety = mentalList.length ? parseFloat((mentalList.reduce((acc, curr) => acc + curr.pre_heat_anxiety, 0) / mentalList.length).toFixed(1)) : 0.0;
      const avgFocus = mentalList.length ? parseFloat((mentalList.reduce((acc, curr) => acc + curr.focus_level, 0) / mentalList.length).toFixed(1)) : 0.0;

      return jsonResponse({
        nutrition: { avg_calories: avgCalories, avg_hydration: avgHydration, log_count: nutList.length },
        sc: { avg_sleep: avgSleep, avg_recovery: avgRecovery, log_count: scList.length },
        technical: { total_waves: totalWaves, log_count: techList.length },
        mental: { avg_anxiety: avgAnxiety, avg_focus: avgFocus, log_count: mentalList.length }
      });
    }

    // ─── 13. Surf Schools Routes ───
    if (path === '/api/schools') {
      if (method === 'GET') {
        return jsonResponse(state.schools);
      }
      if (method === 'POST') {
        const body = JSON.parse(init.body);
        const newSchool = {
          id: state.schools.length + 1,
          name: body.name || "New Surf School",
          owner: body.owner || "School Owner",
          email: body.email || "",
          phone: body.phone || "",
          country: body.country || "Global",
          city: body.city || "Coastal",
          instructor_count: body.instructor_count || "1-5",
          website: body.website || ""
        };
        state.schools.push(newSchool);
        return jsonResponse({ id: newSchool.id, message: `School '${newSchool.name}' registered successfully!` });
      }
    }

    if (path.startsWith('/api/schools/') && method === 'DELETE') {
      const schId = parseInt(path.split('/')[3]);
      state.schools = state.schools.filter(s => s.id !== schId);
      return jsonResponse({ message: "School deleted successfully" });
    }

    // Default API 404
    return errorResponse(`Mock API path ${path} not implemented`, 404);
  }

  // Fallback to real fetch for standard web assets
  return originalFetch.apply(this, arguments);
};
