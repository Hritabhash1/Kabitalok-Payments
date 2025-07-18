// src/App.jsx
import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentPayments from './pages/StudentPayments';
import Reports from './pages/Reports';
import { db } from './utils/db';
import InactiveStudents from './pages/InactiveStudents';
import AdminsManagement from './pages/AdminsManagement';
export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) setUser(storedUser);
  }, []);

  const handleLogin = (username) => {
    localStorage.setItem('loggedInUser', username);
    setUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={styles.appContainer}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard onLogout={handleLogout} user={user}/>} />
          <Route path="/reports"element={<Reports currentAdmin={user} />} />
          <Route path="/student/:id" element={<StudentPaymentsWrapper user={user} />} />
          <Route path="/inactive"element={<InactiveStudents />} />
          <Route path="/admins" element={<AdminsManagement currentAdmin={user} />} />          
        </Routes>
      </HashRouter>
    </div>
  );
}

function StudentPaymentsWrapper({ user }) {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    db.students.get(parseInt(id, 10)).then(setStudent);
  }, [id]);

  if (!student) {
    return (
      <div style={styles.loadingContainer}>
        Loading student...
      </div>
    );
  }

  return <StudentPayments student={student} onBack={() => navigate('/')} 
      user={{ username: user, name: user }}
  />;
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    padding: 40,
    textAlign: 'center',
    color: '#6B7280', // gray-500
    fontSize: 16,
  },
};
