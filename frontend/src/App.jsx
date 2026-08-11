import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import LandingPage from './pages/LandingPage';
import SchoolRegistration from './pages/SchoolRegistration';
import SchoolDashboard from './pages/SchoolDashboard';
import InstructorManagement from './pages/InstructorManagement';
import InstructorProfile from './pages/InstructorProfile';
import StudentsManagement from './pages/StudentsManagement';
import StudentProfile from './pages/StudentProfile';
import Analytics from './pages/Analytics';
import Sessions from './pages/Sessions';
import NewSession from './pages/NewSession';
import Competitions from './pages/Competitions';
import VideoAnalysis from './pages/VideoAnalysis';
import CoachingReport from './pages/CoachingReport';
import AuthPage from './pages/AuthPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/register" element={<SchoolRegistration />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<PrivateRoute><SchoolDashboard /></PrivateRoute>} />
        <Route path="/instructors" element={<PrivateRoute><InstructorManagement /></PrivateRoute>} />
        <Route path="/instructors/:id" element={<PrivateRoute><InstructorProfile /></PrivateRoute>} />
        <Route path="/students" element={<PrivateRoute><StudentsManagement /></PrivateRoute>} />
        <Route path="/students/:id" element={<PrivateRoute><StudentProfile /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/sessions" element={<PrivateRoute><Sessions /></PrivateRoute>} />
        <Route path="/sessions/new" element={<PrivateRoute><NewSession /></PrivateRoute>} />
        <Route path="/sessions/:id/edit" element={<PrivateRoute><NewSession /></PrivateRoute>} />
        <Route path="/competitions" element={<PrivateRoute><Competitions /></PrivateRoute>} />
        <Route path="/analysis" element={<PrivateRoute><VideoAnalysis /></PrivateRoute>} />
        <Route path="/sessions/report" element={<PrivateRoute><CoachingReport /></PrivateRoute>} />
        <Route path="/rpnsuperadmin" element={<SuperAdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
