import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<SchoolRegistration />} />
        <Route path="/dashboard" element={<SchoolDashboard />} />
        <Route path="/instructors" element={<InstructorManagement />} />
        <Route path="/instructors/:id" element={<InstructorProfile />} />
        <Route path="/students" element={<StudentsManagement />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/new" element={<NewSession />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/analysis" element={<VideoAnalysis />} />
      </Routes>
    </Router>
  );
}

export default App;
