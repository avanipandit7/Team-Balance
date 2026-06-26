import React, { useState, useMemo, useEffect } from 'react';
import { db } from './firebase';
import { auth } from './firebase';
import { collection, addDoc, onSnapshot, query, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

const THEME = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  accent: '#38bdf8',
  success: '#2dd4bf',
  warning: '#fbbf24',
  error: '#ef4444',
  chartColors: ['#38bdf8', '#818cf8', '#c084fc', '#fb7185']
};

export default function App() {
  // Auth State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Task Board State
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', member: '', weight: 1, deadline: '' });
  const [evidenceInput, setEvidenceInput] = useState({});
  const [evidenceFile, setEvidenceFile] = useState({});
  const [showEvidenceModal, setShowEvidenceModal] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Tasks Listener
  useEffect(() => {
    if (user) {
      const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const taskArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTasks(taskArray);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // AUTH FUNCTIONS
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone) => {
    return /^[\d\s\-\+\(\)]{10,}$/.test(phone);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!validatePhone(formData.phone)) {
      setError('Please enter a valid phone number (min 10 digits)');
      return;
    }
    if (!validatePassword(formData.password)) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      await updateProfile(userCredential.user, {
        displayName: formData.username
      });

      setSuccessMessage('Account created successfully! Logging you in...');
      setFormData({
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError('Failed to create account. Please try again.');
      }
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      setSuccessMessage('Login successful!');
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please check your email and password.');
      } else {
        setError('Failed to login. Please try again.');
      }
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setFormData({
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccessMessage('');
  };

  // TASK BOARD FUNCTIONS
  const addTask = async (e) => {
    if (e) e.preventDefault();
    if (!newTask.title.trim() || !newTask.member.trim()) {
      alert('Please enter both task name and assignee name');
      return;
    }
    await addDoc(collection(db, "tasks"), {
      ...newTask,
      status: 'pending',
      weight: Number(newTask.weight),
      createdAt: serverTimestamp(),
      evidence: null
    });
    setNewTask({ title: '', member: '', weight: 1, deadline: '' });
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    const taskRef = doc(db, "tasks", id);
    if (task.status === 'pending') {
      setShowEvidenceModal(id);
    } else {
      await updateDoc(taskRef, { status: 'pending', evidence: null });
    }
  };

  const completeTaskWithEvidence = async (id) => {
    const link = evidenceInput[id] || '';
    const file = evidenceFile[id] || null;
    const taskRef = doc(db, "tasks", id);

    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const evidence = {
          type: 'file',
          name: file.name,
          url: e.target.result,
          mimeType: file.type,
          size: file.size
        };
        await updateDoc(taskRef, { status: 'completed', evidence });
        setShowEvidenceModal(null);
        setEvidenceInput(prev => ({ ...prev, [id]: '' }));
        setEvidenceFile(prev => ({ ...prev, [id]: null }));
      };
      reader.readAsDataURL(file);
    } else if (link.trim()) {
      const evidence = { type: 'link', url: link.trim() };
      await updateDoc(taskRef, { status: 'completed', evidence });
      setShowEvidenceModal(null);
      setEvidenceInput(prev => ({ ...prev, [id]: '' }));
      setEvidenceFile(prev => ({ ...prev, [id]: null }));
    } else {
      await updateDoc(taskRef, { status: 'completed', evidence: null });
      setShowEvidenceModal(null);
      setEvidenceInput(prev => ({ ...prev, [id]: '' }));
      setEvidenceFile(prev => ({ ...prev, [id]: null }));
    }
  };

  const skipEvidence = async (id) => {
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, { status: 'completed', evidence: null });
    setShowEvidenceModal(null);
    setEvidenceInput(prev => ({ ...prev, [id]: '' }));
    setEvidenceFile(prev => ({ ...prev, [id]: null }));
  };

  const getDeadlineStatus = (deadline, isCompleted) => {
    if (!deadline || isCompleted) return { status: 'none', color: THEME.border, text: '' };

    const now = new Date();
    const dueDate = new Date(deadline);
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'overdue', color: '#ef4444', text: `Overdue by ${Math.abs(diffDays)} day(s)` };
    } else if (diffDays === 0) {
      return { status: 'today', color: '#f59e0b', text: 'Due today!' };
    } else if (diffDays <= 2) {
      return { status: 'urgent', color: '#f59e0b', text: `Due in ${diffDays} day(s)` };
    } else if (diffDays <= 7) {
      return { status: 'soon', color: THEME.warning, text: `Due in ${diffDays} days` };
    } else {
      return { status: 'safe', color: THEME.border, text: `Due in ${diffDays} days` };
    }
  };

  const chartData = useMemo(() => {
    const counts = {};
    const displayNames = {};

    tasks.filter(t => t.status === 'completed').forEach(t => {
      const memberKey = t.member.trim().toLowerCase();
      counts[memberKey] = (counts[memberKey] || 0) + t.weight;
      if (!displayNames[memberKey]) {
        displayNames[memberKey] = t.member.trim();
      }
    });

    return Object.entries(counts).map(([key, value]) => ({
      name: displayNames[key],
      value
    }));
  }, [tasks]);

  const memberStats = useMemo(() => {
    const stats = {};

    tasks.forEach(t => {
      const memberKey = t.member.trim().toLowerCase();
      if (!stats[memberKey]) {
        stats[memberKey] = {
          name: t.member.trim(),
          completed: 0,
          pending: 0,
          totalPoints: 0,
          completedPoints: 0
        };
      }

      if (t.status === 'completed') {
        stats[memberKey].completed++;
        stats[memberKey].completedPoints += t.weight;
      } else {
        stats[memberKey].pending++;
      }
      stats[memberKey].totalPoints += t.weight;
    });

    return Object.values(stats);
  }, [tasks]);

  const totalPoints = tasks.reduce((a, b) => a + (b.status === 'completed' ? b.weight : 0), 0);

  // LOADING STATE
  if (loading) {
    return (
      <div style={{
        backgroundColor: THEME.bg,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: THEME.text,
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: `4px solid ${THEME.border}`,
            borderTop: `4px solid ${THEME.accent}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: THEME.muted }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // LOGIN/SIGNUP SCREEN
  if (!user) {
    return (
      <div style={{
        backgroundColor: THEME.bg,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          backgroundColor: THEME.card,
          padding: '3rem',
          borderRadius: '1.5rem',
          border: `1px solid ${THEME.border}`,
          maxWidth: '450px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              margin: '0 0 0.5rem 0',
              color: THEME.text
            }}>
              TEAM<span style={{ color: THEME.accent }}>BALANCE</span>
            </h1>
            <p style={{ color: THEME.muted, margin: 0, fontSize: '0.95rem' }}>
              {isLogin ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div style={{
              backgroundColor: `${THEME.error}22`,
              border: `1px solid ${THEME.error}`,
              color: THEME.error,
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          {successMessage && (
            <div style={{
              backgroundColor: `${THEME.success}22`,
              border: `1px solid ${THEME.success}`,
              color: THEME.success,
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              ✓ {successMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleSignup}>
            {!isLogin && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: THEME.muted,
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: THEME.bg,
                    color: THEME.text,
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = THEME.accent}
                  onBlur={(e) => e.target.style.borderColor = THEME.border}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                color: THEME.muted,
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: THEME.bg,
                  color: THEME.text,
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = THEME.accent}
                onBlur={(e) => e.target.style.borderColor = THEME.border}
              />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: THEME.muted,
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: THEME.bg,
                    color: THEME.text,
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = THEME.accent}
                  onBlur={(e) => e.target.style.borderColor = THEME.border}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                color: THEME.muted,
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: THEME.bg,
                  color: THEME.text,
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = THEME.accent}
                onBlur={(e) => e.target.style.borderColor = THEME.border}
              />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: THEME.muted,
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: THEME.bg,
                    color: THEME.text,
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = THEME.accent}
                  onBlur={(e) => e.target.style.borderColor = THEME.border}
                />
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: THEME.accent,
                color: '#000',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '0.5rem',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 10px 20px rgba(56, 189, 248, 0.3)`;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{
            marginTop: '2rem',
            textAlign: 'center',
            paddingTop: '1.5rem',
            borderTop: `1px solid ${THEME.border}`
          }}>
            <p style={{ color: THEME.muted, fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccessMessage('');
                setFormData({
                  username: '',
                  email: '',
                  phone: '',
                  password: '',
                  confirmPassword: ''
                });
              }}
              style={{
                backgroundColor: 'transparent',
                color: THEME.accent,
                border: `1px solid ${THEME.accent}`,
                padding: '0.7rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = THEME.accent;
                e.target.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = THEME.accent;
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          <p style={{
            marginTop: '2rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: THEME.muted
          }}>
            🔒 Your data is secure and encrypted
          </p>
        </div>
      </div>
    );
  }

  // MAIN APP (when logged in)
  return (
    <div style={{ backgroundColor: THEME.bg, color: THEME.text, minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Logout Button */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        backgroundColor: THEME.card,
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        border: `1px solid ${THEME.border}`
      }}>
        <span style={{ color: THEME.muted, fontSize: '0.9rem' }}>
          👤 {user.displayName || user.email}
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: THEME.error,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: '2rem', borderBottom: `1px solid ${THEME.border}`, paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>TEAM<span style={{ color: THEME.accent }}>BALANCE</span></h1>
          <p style={{ color: THEME.muted, margin: '0.5rem 0 0 0' }}>Stop the ghosting. Quantify the effort.</p>
        </header>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: `1px solid ${THEME.border}`
        }}>
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'tasks' ? THEME.card : 'transparent',
              color: activeTab === 'tasks' ? THEME.accent : THEME.muted,
              border: 'none',
              borderBottom: activeTab === 'tasks' ? `2px solid ${THEME.accent}` : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            📋 Tasks
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'dashboard' ? THEME.card : 'transparent',
              color: activeTab === 'dashboard' ? THEME.accent : THEME.muted,
              border: 'none',
              borderBottom: activeTab === 'dashboard' ? `2px solid ${THEME.accent}` : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            📊 Dashboard
          </button>
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem' }}>
            {/* Left Sidebar */}
            <aside>
              {/* New Task Input */}
              <section style={{ backgroundColor: THEME.card, padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: `1px solid ${THEME.border}` }}>
                <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>➕ New Task</h3>
                <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    placeholder="Task Name (e.g. Final Edit)"
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    style={{ padding: '0.8rem', borderRadius: '0.5rem', border: `1px solid ${THEME.border}`, backgroundColor: THEME.bg, color: THEME.text }}
                  />
                  <input
                    placeholder="Assignee Name"
                    value={newTask.member}
                    onChange={e => setNewTask({ ...newTask, member: e.target.value })}
                    style={{ padding: '0.8rem', borderRadius: '0.5rem', border: `1px solid ${THEME.border}`, backgroundColor: THEME.bg, color: THEME.text }}
                  />
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: THEME.muted, marginBottom: '0.5rem' }}>Deadline (Optional)</label>
                    <input
                      type="date"
                      value={newTask.deadline}
                      onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: `1px solid ${THEME.border}`, backgroundColor: THEME.bg, color: THEME.text, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: THEME.muted, marginBottom: '0.5rem' }}>Task Weight (1-10)</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newTask.weight}
                      onChange={e => setNewTask({ ...newTask, weight: e.target.value })}
                      style={{ width: '100%' }}
                    />
                    <div style={{ textAlign: 'center', fontWeight: 'bold', color: THEME.accent }}>{newTask.weight} Points</div>
                  </div>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: THEME.accent,
                      color: '#000',
                      padding: '0.8rem',
                      borderRadius: '0.5rem',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Add to Project
                  </button>
                </form>
              </section>

              {/* Point Guide */}
              <section style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, borderLeft: `4px solid ${THEME.warning}`, padding: '1.5rem', borderRadius: '1rem' }}>
                <h4 style={{ margin: '0 0 10px 0', color: THEME.warning }}>💡 Point Guide</h4>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: THEME.muted, lineHeight: '1.6' }}>
                  <li><b>1-2 pts:</b> Minor tweaks, emails, formatting.</li>
                  <li><b>3-5 pts:</b> Researching, writing a section.</li>
                  <li><b>8-10 pts:</b> Complex coding, whole-project synthesis.</li>
                </ul>
              </section>
            </aside>

            {/* Main Task List */}
            <main>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Task Board</h3>
                <div style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, padding: '0.75rem 1.5rem', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: THEME.muted }}>Total: </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: THEME.accent }}>{totalPoints} pts</span>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', border: `2px dashed ${THEME.border}`, borderRadius: '1rem', color: THEME.muted }}>
                  No tasks added yet. Start by adding a task in the sidebar!
                </div>
              ) : (
                tasks.map(task => {
                  const deadlineStatus = getDeadlineStatus(task.deadline, task.status === 'completed');
                  return (
                    <div key={task.id} style={{ backgroundColor: THEME.card, padding: '1rem 1.5rem', borderRadius: '0.8rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `2px solid ${task.status === 'completed' ? THEME.success : deadlineStatus.color}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', backgroundColor: THEME.bg, padding: '2px 8px', borderRadius: '10px', color: THEME.accent }}>{task.member}</span>
                          <span style={{
                            fontSize: '0.7rem',
                            backgroundColor: task.status === 'completed' ? THEME.success : THEME.warning,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            color: '#000',
                            fontWeight: 'bold'
                          }}>
                            {task.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                          </span>
                          {task.evidence && (
                            <span style={{ fontSize: '0.7rem', backgroundColor: THEME.accent, padding: '2px 8px', borderRadius: '10px', color: '#000', fontWeight: 'bold' }}>
                              📎 Evidence Added
                            </span>
                          )}
                          {task.deadline && task.status !== 'completed' && (
                            <span style={{ fontSize: '0.7rem', backgroundColor: deadlineStatus.color, padding: '2px 8px', borderRadius: '10px', color: '#000', fontWeight: 'bold' }}>
                              {deadlineStatus.status === 'overdue' ? '🔴' : deadlineStatus.status === 'today' || deadlineStatus.status === 'urgent' ? '⚠️' : '📅'} {deadlineStatus.text}
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: '5px 0', textDecoration: task.status === 'completed' ? 'line-through' : 'none', color: task.status === 'completed' ? THEME.muted : THEME.text }}>{task.title}</h4>
                        {task.evidence && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ color: THEME.muted }}>📎</span>
                            {task.evidence.type === 'file' ? (
                              <>
                                <span style={{ color: THEME.accent, wordBreak: 'break-all', flex: 1, minWidth: '200px' }}>
                                  {task.evidence.name}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const link = document.createElement('a');
                                    link.href = task.evidence.url;
                                    link.download = task.evidence.name;
                                    link.click();
                                  }}
                                  style={{
                                    padding: '0.3rem 0.8rem',
                                    borderRadius: '0.3rem',
                                    border: `1px solid ${THEME.accent}`,
                                    backgroundColor: 'transparent',
                                    color: THEME.accent,
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  Download 📥
                                </button>
                              </>
                            ) : (
                              <>
                                <span style={{ color: THEME.accent, wordBreak: 'break-all', flex: 1, minWidth: '200px' }}>
                                  {task.evidence.url.length > 60 ? task.evidence.url.substring(0, 60) + '...' : task.evidence.url}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(task.evidence.url, '_blank', 'noopener,noreferrer');
                                  }}
                                  style={{
                                    padding: '0.3rem 0.8rem',
                                    borderRadius: '0.3rem',
                                    border: `1px solid ${THEME.accent}`,
                                    backgroundColor: 'transparent',
                                    color: THEME.accent,
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  Open Link ↗
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 'bold', color: THEME.warning }}>{task.weight} pts</span>
                        <button
                          onClick={() => toggleTask(task.id)}
                          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', backgroundColor: task.status === 'completed' ? THEME.success : '#fff', color: '#000', fontWeight: 'bold' }}
                        >
                          {task.status === 'completed' ? 'Done ✓' : 'Finish'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </main>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: THEME.muted, margin: 0 }}>GROUP PROGRESS</p>
                <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{totalPoints} <span style={{ fontSize: '1rem', color: THEME.muted }}>Total Pts</span></h2>
              </div>

              <div style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, padding: '1.5rem', borderRadius: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: THEME.muted, marginBottom: '1rem', textAlign: 'center' }}>CONTRIBUTION SPLIT</p>
                {chartData.length > 0 ? (
                  <div style={{ display: 'flex', gap: '5px', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    {chartData.map((d, i) => (
                      <div key={i} style={{ width: `${(d.value / totalPoints) * 100}%`, backgroundColor: THEME.chartColors[i % 4] }} title={`${d.name}: ${d.value} pts`} />
                    ))}
                  </div>
                ) : <p style={{ fontSize: '0.8rem', textAlign: 'center', color: THEME.muted }}>Complete tasks to see chart</p>}

                {chartData.length > 0 && (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {chartData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: THEME.chartColors[i % 4], borderRadius: '2px' }} />
                        <span style={{ fontSize: '0.75rem', color: THEME.muted }}>{d.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <section style={{ backgroundColor: THEME.card, padding: '2rem', borderRadius: '1rem', border: `1px solid ${THEME.border}` }}>
              <h3 style={{ marginTop: 0, fontSize: '1.5rem', marginBottom: '1.5rem' }}>Team Member Statistics</h3>

              {memberStats.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: THEME.muted, textAlign: 'center', padding: '2rem' }}>
                  No team members yet. Add tasks to see member statistics.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {memberStats.map((member, index) => {
                    const completionRate = member.totalPoints > 0
                      ? Math.round((member.completedPoints / member.totalPoints) * 100)
                      : 0;

                    return (
                      <div key={index} style={{ padding: '1.5rem', backgroundColor: THEME.bg, borderRadius: '0.75rem', border: `1px solid ${THEME.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: THEME.chartColors[index % 4] }}>
                            {member.name}
                          </span>
                          <span style={{ fontSize: '0.9rem', color: THEME.muted }}>
                            {member.completedPoints}/{member.totalPoints} points
                          </span>
                        </div>

                        <div style={{ width: '100%', height: '12px', backgroundColor: THEME.border, borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                          <div style={{ width: `${completionRate}%`, height: '100%', backgroundColor: THEME.chartColors[index % 4], transition: 'width 0.3s ease' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                          <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: THEME.card, borderRadius: '0.5rem' }}>
                            <div style={{ color: THEME.success, fontSize: '1.5rem', marginBottom: '0.25rem' }}>✅</div>
                            <div style={{ color: THEME.text, fontWeight: 'bold' }}>{member.completed}</div>
                            <div style={{ color: THEME.muted, fontSize: '0.75rem' }}>completed</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: THEME.card, borderRadius: '0.5rem' }}>
                            <div style={{ color: THEME.warning, fontSize: '1.5rem', marginBottom: '0.25rem' }}>⏳</div>
                            <div style={{ color: THEME.text, fontWeight: 'bold' }}>{member.pending}</div>
                            <div style={{ color: THEME.muted, fontSize: '0.75rem' }}>pending</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: THEME.card, borderRadius: '0.5rem' }}>
                            <div style={{ color: THEME.chartColors[index % 4], fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</div>
                            <div style={{ color: THEME.text, fontWeight: 'bold' }}>{completionRate}%</div>
                            <div style={{ color: THEME.muted, fontSize: '0.75rem' }}>completion</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Evidence Modal */}
        {showEvidenceModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: THEME.card,
              padding: '2rem',
              borderRadius: '1rem',
              border: `1px solid ${THEME.border}`,
              maxWidth: '500px',
              width: '90%'
            }}>
              <h3 style={{ marginTop: 0, color: THEME.text }}>📎 Add Evidence (Optional)</h3>
              <p style={{ color: THEME.muted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Attach a link or upload a file (JPG, PDF, DOCX)
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: THEME.muted, marginBottom: '0.5rem' }}>
                  🔗 Paste a Link
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/document"
                  value={evidenceInput[showEvidenceModal] || ''}
                  onChange={(e) => {
                    setEvidenceInput(prev => ({ ...prev, [showEvidenceModal]: e.target.value }));
                    setEvidenceFile(prev => ({ ...prev, [showEvidenceModal]: null }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: THEME.bg,
                    color: THEME.text,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', gap: '1rem' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: THEME.border }}></div>
                <span style={{ color: THEME.muted, fontSize: '0.8rem' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: THEME.border }}></div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: THEME.muted, marginBottom: '0.5rem' }}>
                  📄 Upload a File
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.docx,.doc"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEvidenceFile(prev => ({ ...prev, [showEvidenceModal]: e.target.files[0] }));
                      setEvidenceInput(prev => ({ ...prev, [showEvidenceModal]: '' }));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: THEME.bg,
                    color: THEME.text,
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                />
                {evidenceFile[showEvidenceModal] && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: THEME.accent }}>
                    ✓ Selected: {evidenceFile[showEvidenceModal].name}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowEvidenceModal(null);
                    setEvidenceInput(prev => ({ ...prev, [showEvidenceModal]: '' }));
                    setEvidenceFile(prev => ({ ...prev, [showEvidenceModal]: null }));
                  }}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: 'transparent',
                    color: THEME.muted,
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => skipEvidence(showEvidenceModal)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: THEME.muted,
                    color: '#000',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={() => completeTaskWithEvidence(showEvidenceModal)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: THEME.success,
                    color: '#000',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Complete Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
