import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import LandingPage from './pages/LandingPage';
import SchoolRegistration from './pages/SchoolRegistration';
import SchoolDashboard from './pages/SchoolDashboard';
import InstructorManagement from './pages/InstructorManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<SchoolRegistration />} />
        <Route path="/dashboard" element={<SchoolDashboard />} />
        <Route path="/instructors" element={<InstructorManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
