
import React, { useState, useMemo, useEffect } from 'react';
import { db, storage } from './firebase'; 
import { collection, addDoc, onSnapshot, query, updateDoc, doc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const THEME = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  accent: '#38bdf8',
  success: '#2dd4bf',
  warning: '#fbbf24',
  chartColors: ['#38bdf8', '#818cf8', '#c084fc', '#fb7185']
};

export default function AccountabilityBoard() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', member: '', weight: 1, deadline: '' });
  const [evidenceInput, setEvidenceInput] = useState({});
  const [evidenceFile, setEvidenceFile] = useState({});
  const [showEvidenceModal, setShowEvidenceModal] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(taskArray);
    });
    return () => unsubscribe();
  }, []);

  // Add Task Function
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

  const completeTaskWithEvidence = (id) => {
    const link = evidenceInput[id] || '';
    const file = evidenceFile[id] || null;
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const evidence = { 
          type: 'file', 
          name: file.name, 
          url: e.target.result,
          mimeType: file.type,
          size: file.size
        };
        setTasks(tasks.map(t => t.id === id ? { ...t, status: 'completed', evidence } : t));
      };
      reader.readAsDataURL(file);
      setShowEvidenceModal(null);
      setEvidenceInput(prev => ({ ...prev, [id]: '' }));
      setEvidenceFile(prev => ({ ...prev, [id]: null }));
    } else if (link) {
      const evidence = { type: 'link', url: link };
      setTasks(tasks.map(t => t.id === id ? { ...t, status: 'completed', evidence } : t));
      setShowEvidenceModal(null);
      setEvidenceInput(prev => ({ ...prev, [id]: '' }));
      setEvidenceFile(prev => ({ ...prev, [id]: null }));
    }
  };

  const skipEvidence = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'completed', evidence: null } : t));
    setShowEvidenceModal(null);
    setEvidenceInput(prev => ({ ...prev, [id]: '' }));
    setEvidenceFile(prev => ({ ...prev, [id]: null }));
  };

  // Deadline helper function
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

  // Stats Logic - Fixed to aggregate by person (case-insensitive)
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

  // Member statistics for dashboard
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

  return (
    <div style={{ backgroundColor: THEME.bg, color: THEME.text, minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ marginBottom: '3rem', borderBottom: `1px solid ${THEME.border}`, paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>TEAM<span style={{ color: THEME.accent }}>BALANCE</span></h1>
          <p style={{ color: THEME.muted }}>Stop the ghosting. Quantify the effort.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem' }}>
          
          {/* Left Column: Dashboard, Input & Education */}
          <aside>
            {/* Dashboard Section */}
            <section style={{ backgroundColor: THEME.card, padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: `1px solid ${THEME.border}` }}>
              <h3 style={{ marginTop: 0, fontSize: '1.2rem', marginBottom: '1.5rem' }}>📊 Dashboard</h3>
              
              {memberStats.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: THEME.muted, textAlign: 'center', padding: '1rem' }}>
                  No team members yet. Add tasks to see member statistics.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {memberStats.map((member, index) => {
                    const completionRate = member.totalPoints > 0 
                      ? Math.round((member.completedPoints / member.totalPoints) * 100) 
                      : 0;
                    
                    return (
                      <div 
                        key={index} 
                        style={{ 
                          padding: '1rem', 
                          backgroundColor: THEME.bg, 
                          borderRadius: '0.5rem',
                          border: `1px solid ${THEME.border}`
                        }}
                      >
                        {/* Member Name */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ 
                            fontWeight: 'bold', 
                            fontSize: '0.9rem',
                            color: THEME.chartColors[index % 4]
                          }}>
                            {member.name}
                          </span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: THEME.muted 
                          }}>
                            {member.completedPoints}/{member.totalPoints} pts
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          backgroundColor: THEME.border, 
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ 
                            width: `${completionRate}%`, 
                            height: '100%', 
                            backgroundColor: THEME.chartColors[index % 4],
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        
                        {/* Task Stats */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: THEME.muted
                        }}>
                          <span>✅ {member.completed} completed</span>
                          <span>⏳ {member.pending} pending</span>
                          <span>{completionRate}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* New Task Input */}
            <section style={{ backgroundColor: THEME.card, padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: `1px solid ${THEME.border}` }}>
              <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>➕ New Task</h3>
              <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input 
                  placeholder="Task Name (e.g. Final Edit)" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  style={{ padding: '0.8rem', borderRadius: '0.5rem', border: `1px solid ${THEME.border}`, backgroundColor: THEME.bg, color: THEME.text }}
                />
                <input 
                  placeholder="Assignee Name" 
                  value={newTask.member}
                  onChange={e => setNewTask({...newTask, member: e.target.value})}
                  style={{ padding: '0.8rem', borderRadius: '0.5rem', border: `1px solid ${THEME.border}`, backgroundColor: THEME.bg, color: THEME.text }}
                />
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: THEME.muted, marginBottom: '0.5rem' }}>Deadline (Optional)</label>
                  <input 
                    type="date"
                    value={newTask.deadline}
                    onChange={e => setNewTask({...newTask, deadline: e.target.value})}
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
                    onChange={e => setNewTask({...newTask, weight: e.target.value})}
                    style={{ width: '100%' }}
                  />
                  <div style={{ textAlign: 'center', fontWeight: 'bold', color: THEME.accent }}>{newTask.weight} Points</div>
                </div>
                <button 
                  type="submit" 
                  onClick={(e) => {
                    e.preventDefault();
                    addTask();
                  }}
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

          {/* Right Column: Visuals & List */}
          <main>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: THEME.muted, margin: 0 }}>GROUP PROGRESS</p>
                <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{totalPoints} <span style={{ fontSize: '1rem', color: THEME.muted }}>Total Pts</span></h2>
              </div>
              
              <div style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, padding: '1.5rem', borderRadius: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: THEME.muted, marginBottom: '1rem', textAlign: 'center' }}>CONTRIBUTION SPLIT</p>
                {chartData.length > 0 ? (
                   <div style={{ display: 'flex', gap: '5px', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      {chartData.map((d, i) => (
                        <div key={i} style={{ width: `${(d.value/totalPoints)*100}%`, backgroundColor: THEME.chartColors[i % 4] }} title={d.name} />
                      ))}
                   </div>
                ) : <p style={{ fontSize: '0.8rem', textAlign: 'center', color: THEME.muted }}>Complete tasks to see chart</p>}
              </div>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>📋 Task Board</h3>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', backgroundColor: THEME.bg, padding: '2px 8px', borderRadius: '10px', color: THEME.accent }}>{task.member}</span>
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
                            <span style={{ 
                              color: THEME.accent, 
                              wordBreak: 'break-all',
                              flex: 1,
                              minWidth: '200px'
                            }}>
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newWindow = window.open('', '_blank');
                                if (newWindow) {
                                  const fileExtension = task.evidence.name.split('.').pop().toLowerCase();
                                  
                                  if (fileExtension === 'pdf') {
                                    newWindow.document.write(`
                                      <!DOCTYPE html>
                                      <html>
                                      <head>
                                        <title>${task.evidence.name}</title>
                                        <style>
                                          body { margin: 0; padding: 0; }
                                          iframe { width: 100%; height: 100vh; border: none; }
                                        </style>
                                      </head>
                                      <body>
                                        <iframe src="${task.evidence.url}" type="application/pdf"></iframe>
                                      </body>
                                      </html>
                                    `);
                                  } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                                    newWindow.document.write(`
                                      <!DOCTYPE html>
                                      <html>
                                      <head>
                                        <title>${task.evidence.name}</title>
                                        <style>
                                          body { margin: 0; padding: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
                                          img { max-width: 100%; max-height: 100%; object-fit: contain; }
                                        </style>
                                      </head>
                                      <body>
                                        <img src="${task.evidence.url}" alt="${task.evidence.name}" />
                                      </body>
                                      </html>
                                    `);
                                  } else {
                                    newWindow.document.write(`
                                      <!DOCTYPE html>
                                      <html>
                                      <head>
                                        <title>${task.evidence.name}</title>
                                        <style>
                                          body { font-family: system-ui; padding: 2rem; background: #0f172a; color: #f1f5f9; }
                                          .container { max-width: 600px; margin: 0 auto; text-align: center; }
                                          h1 { color: #38bdf8; }
                                          button { background: #38bdf8; color: #000; padding: 1rem 2rem; border: none; border-radius: 0.5rem; font-weight: bold; cursor: pointer; font-size: 1rem; margin-top: 1rem; }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="container">
                                          <h1>📄 ${task.evidence.name}</h1>
                                          <p>This file type (.${fileExtension}) cannot be previewed in the browser.</p>
                                          <p>Click the button below to download and open it with the appropriate application.</p>
                                          <button onclick="downloadFile()">Download File 📥</button>
                                        </div>
                                        <script>
                                          function downloadFile() {
                                            const link = document.createElement('a');
                                            link.href = '${task.evidence.url}';
                                            link.download = '${task.evidence.name}';
                                            link.click();
                                          }
                                        </script>
                                      </body>
                                      </html>
                                    `);
                                  }
                                }
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
                              View 👁️
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ 
                              color: THEME.accent, 
                              wordBreak: 'break-all',
                              flex: 1,
                              minWidth: '200px'
                            }}>
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
              
              {/* Link Input */}
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

              {/* OR Divider */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                margin: '1rem 0',
                gap: '1rem'
              }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: THEME.border }}></div>
                <span style={{ color: THEME.muted, fontSize: '0.8rem' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: THEME.border }}></div>
              </div>

              {/* File Upload */}
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
