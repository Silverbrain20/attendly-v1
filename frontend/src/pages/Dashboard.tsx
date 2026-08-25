import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import {
  MapPin, AlertTriangle, Plus, Download, BookOpen, BarChart3,
  Radio, Shield, LogOut, Key, Clock, Inbox
} from 'lucide-react';


const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  
  // Student Specific
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [myActiveSessions, setMyActiveSessions] = useState<any[]>([]);

  // Class Rep Specific
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionQr, setSessionQr] = useState<string | null>(null);
  
  // Create Course Form
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');

  // Create Session Form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionRadius, setSessionRadius] = useState(100);
  const [sessionDuration, setSessionDuration] = useState(120);

  // Invite Code Management
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [inviteCodeSuccess, setInviteCodeSuccess] = useState('');

  // Manual Overrides State
  const [overrideStudentId, setOverrideStudentId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideRemaining, setOverrideRemaining] = useState(10);
  const [overrideCount, setOverrideCount] = useState(0);
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [sessionOverrides, setSessionOverrides] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const coursesRes = await apiRequest('GET', '/api/courses');
      setCourses(coursesRes.data || []);

      if (user?.role === 'student') {
        const summaryRes = await apiRequest('GET', '/api/attendance/my-summary');
        setSummaryData(summaryRes.data || []);
        
        const allRes = await apiRequest('GET', '/api/courses/all');
        setAllCourses(allRes.data || []);

        const activeSessRes = await apiRequest('GET', '/api/sessions/my-active');
        setMyActiveSessions(activeSessRes.data || []);
      } else {
        if (coursesRes.data && coursesRes.data.length > 0) {
          const firstCourse = coursesRes.data[0].id;
          setSelectedCourse(firstCourse);
          await loadSessionAndOverrides(firstCourse);
        }
      }
    } catch (e: any) {
      setActionError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionAndOverrides = async (courseId: string) => {
    try {
      const activeRes = await apiRequest('GET', `/api/sessions/active/${courseId}`);
      const session = activeRes.data;
      setActiveSession(session);

      if (session) {
        if (session.qr_code_image) {
          setSessionQr(session.qr_code_image);
        } else {
          const qrRes = await apiRequest('GET', `/api/sessions/${session.id}/qr`);
          setSessionQr(qrRes.qr_code_image);
        }

        const countRes = await apiRequest('GET', `/api/overrides/session/${session.id}/count`);
        setOverrideCount(countRes.count);
        setOverrideRemaining(countRes.remaining);

        const studentsRes = await apiRequest('GET', `/api/courses/${courseId}/students`);
        setCourseStudents(studentsRes.data || []);

        const overridesRes = await apiRequest('GET', `/api/overrides/session/${session.id}`);
        setSessionOverrides(overridesRes.data || []);
      } else {
        setSessionQr(null);
        setSessionOverrides([]);
        setCourseStudents([]);
      }
    } catch (e: any) {
      console.error(e);
    }
  };


  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId);
    await loadSessionAndOverrides(courseId);
  };

  const handleEnroll = async (courseId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      await apiRequest('POST', `/api/courses/enroll/${courseId}`);
      setActionSuccess('Successfully enrolled in course!');
      await fetchData();
    } catch (e: any) {
      setActionError(e.message || 'Enrollment failed');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    try {
      const res = await apiRequest('POST', '/api/courses', {
        course_code: newCourseCode,
        course_title: newCourseTitle
      });
      if (res.status === 'success' && res.data) {
        const createdCourse = res.data;
        setActionSuccess(`Course ${createdCourse.course_code} created successfully!`);
        setNewCourseCode('');
        setNewCourseTitle('');
        setShowCourseForm(false);
        const updatedCourses = [...courses, createdCourse];
        setCourses(updatedCourses);
        setSelectedCourse(createdCourse.id);
        await loadSessionAndOverrides(createdCourse.id);
      }
    } catch (e: any) {
      setActionError(e.message || 'Course creation failed');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!selectedCourse) {
      setActionError('Please select or create a course first before launching a session.');
      return;
    }

    if (!navigator.geolocation) {
      setActionError('Geolocation is not supported by your browser.');
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await apiRequest('POST', '/api/sessions', {
              course_id: selectedCourse,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              geofence_radius_m: sessionRadius,
              duration_minutes: sessionDuration
            });
            if (res.status === 'success' && res.data) {
              setActionSuccess('Session started successfully!');
              setShowSessionForm(false);
              setActiveSession(res.data);
              if (res.data.qr_code_image) {
                setSessionQr(res.data.qr_code_image);
              }
              await loadSessionAndOverrides(selectedCourse);
            }
          } catch (err: any) {
            setActionError(err.message || 'Session creation failed');
          }
        },
        (error) => {
          setActionError(
            error.code === error.PERMISSION_DENIED
              ? 'Location permission denied. Please allow GPS location access in your browser to start a session.'
              : 'Could not acquire GPS position. Please ensure location services are enabled.'
          );
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (e: any) {
      setActionError(e.message || 'Failed to initialize session location');
    }
  };


  const handleEndSession = async () => {
    if (!activeSession) return;
    setActionError('');
    setActionSuccess('');
    try {
      await apiRequest('POST', `/api/sessions/${activeSession.id}/end`);
      setActionSuccess('Session ended successfully');
      await loadSessionAndOverrides(selectedCourse);
    } catch (e: any) {
      setActionError(e.message || 'Failed to end session');
    }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !overrideStudentId || !overrideReason) return;
    setActionError('');
    setActionSuccess('');
    try {
      await apiRequest('POST', '/api/overrides', {
        session_id: activeSession.id,
        student_id: overrideStudentId,
        reason: overrideReason
      });
      setActionSuccess('Manual override recorded successfully');
      setOverrideStudentId('');
      setOverrideReason('');
      await loadSessionAndOverrides(selectedCourse);
    } catch (e: any) {
      setActionError(e.message || 'Failed to process manual override');
    }
  };

  const handleExportCSV = async () => {
    if (!activeSession) return;
    try {
      const response = await apiRequest('GET', `/api/export/session/${activeSession.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeSession.course_code}_attendance.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setActionError('CSV export failed');
    }
  };

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteCodeError('');
    setInviteCodeSuccess('');
    try {
      const res = await apiRequest('POST', '/api/courses/redeem-invite', { code: inviteCode });
      setInviteCodeSuccess(res.message);
      setInviteCode('');
      setTimeout(() => logout(), 2500);
    } catch (e: any) {
      setInviteCodeError(e.message || 'Code redemption failed');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Top Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">
            <MapPin size={20} />
            Attendly
          </div>
          <div className="nav-actions">
            <span className="badge badge-primary hide-mobile">
              {user?.role === 'class_rep' ? 'Class Rep' : 'Student'}
            </span>
            <button onClick={() => setShowInviteForm(!showInviteForm)} className="btn btn-ghost btn-sm" title="Invite Code">
              <Key size={18} />
            </button>
            <button onClick={logout} className="btn btn-ghost btn-sm" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.25rem' }}>
            {user?.role === 'class_rep' ? 'Manage Attendance' : 'My Attendance'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.full_name}</p>
        </div>

        {/* Invite Code Panel */}
        {showInviteForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="icon-circle icon-circle-primary" style={{ width: '36px', height: '36px' }}>
                <Key size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem' }}>Class Representative Invite</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                  Redeem an invite code to become a class rep. You'll be logged out on success.
                </p>
              </div>
            </div>

            {inviteCodeError && (
              <div className="alert alert-danger"><span>{inviteCodeError}</span></div>
            )}
            {inviteCodeSuccess && (
              <div className="alert alert-success"><span>{inviteCodeSuccess}</span></div>
            )}

            <form onSubmit={handleRedeemInvite} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                style={{ flexGrow: 1, maxWidth: '280px' }}
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Redeem
              </button>
            </form>
          </div>
        )}

        {/* Global Messages */}
        {actionError && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="alert alert-success">
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════
                         STUDENT VIEW
            ═══════════════════════════════════════════ */}
        {user?.role === 'student' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Enrollment */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="icon-circle icon-circle-primary" style={{ width: '36px', height: '36px' }}>
                  <BookOpen size={18} />
                </div>
                <h2 style={{ fontSize: '1.25rem' }}>Enroll in a Course</h2>
              </div>
              {allCourses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>No courses available on the system.</p>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flexGrow: 1, maxWidth: '350px' }}>
                    <label className="form-label" htmlFor="enroll-select">Select Course</label>
                    <select
                      id="enroll-select"
                      className="form-select"
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      value={selectedCourse}
                    >
                      <option value="">Choose course</option>
                      {allCourses.map((c) => (
                        <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    disabled={!selectedCourse}
                    onClick={() => handleEnroll(selectedCourse)}
                    className="btn btn-primary"
                  >
                    Enroll
                  </button>
                </div>
              )}
            </div>

            {/* Active Attendance Sessions */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="icon-circle icon-circle-primary" style={{ width: '36px', height: '36px' }}>
                  <Radio size={18} />
                </div>
                <h2 style={{ fontSize: '1.25rem' }}>Active Attendance Sessions</h2>
              </div>
              {myActiveSessions.length === 0 ? (
                <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
                    No active attendance sessions currently running for your enrolled courses.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myActiveSessions.map((sess) => (
                    <div key={sess.id} className="attendance-row" style={{ borderLeft: '4px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.0625rem', marginBottom: '0.125rem' }}>{sess.course_code} — {sess.course_title}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                          Geofence radius: {sess.geofence_radius_m} meters
                        </p>
                      </div>
                      <div>
                        {sess.already_marked ? (
                          <span className="badge badge-success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}>
                            ✓ Attendance Marked
                          </span>
                        ) : (
                          <button
                            onClick={() => navigate(`/attend/${sess.id}`)}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                          >
                            <MapPin size={16} /> Mark Attendance
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Summary */}

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="icon-circle" style={{ width: '36px', height: '36px', background: '#F0FDF4', color: 'var(--success)' }}>
                  <BarChart3 size={18} />
                </div>
                <h2 style={{ fontSize: '1.25rem' }}>Attendance Summary</h2>
              </div>

              {summaryData.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <div className="empty-state-icon">
                    <Inbox size={28} />
                  </div>
                  <h3 style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1rem' }}>No records yet</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Enroll in courses and mark attendance to see your stats.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {summaryData.map((data, index) => {
                    const isBelowTarget = data.attendance_percentage < 75;
                    return (
                      <div key={index} className={`attendance-row ${isBelowTarget ? 'attendance-row-warn' : 'attendance-row-ok'}`}>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ fontSize: '1rem' }}>{data.course_code}</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>{data.course_title}</p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div className="stat-label">Attended</div>
                            <div className="stat-value" style={{ fontSize: '1.125rem' }}>{data.attended} / {data.total_classes}</div>
                          </div>
                          
                          <div style={{ textAlign: 'center' }}>
                            <div className="stat-label">Absences</div>
                            <div className="stat-value" style={{ fontSize: '1.125rem', color: data.absences > 0 ? 'var(--warning)' : 'var(--text)' }}>
                              {data.absences}
                            </div>
                          </div>

                          <div style={{ textAlign: 'center' }}>
                            <div className="stat-label">Overrides</div>
                            <div className="stat-value" style={{ fontSize: '1.125rem' }}>{data.manual_overrides}</div>
                          </div>

                          <div style={{ textAlign: 'center' }}>
                            <div className="stat-label">Rate</div>
                            <div className="stat-value" style={{
                              fontSize: '1.125rem',
                              color: isBelowTarget ? 'var(--danger)' : 'var(--success)'
                            }}>{data.attendance_percentage}%</div>
                          </div>
                        </div>

                        {isBelowTarget && (
                          <div className="badge badge-danger">
                            <AlertTriangle size={13} /> Below 75%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
                        CLASS REP VIEW
            ═══════════════════════════════════════════ */}
        {user?.role === 'class_rep' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Course & Session Management */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Manage Course & Sessions</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setShowCourseForm(!showCourseForm)} className="btn btn-secondary btn-sm">
                    <Plus size={16} /> New Course
                  </button>
                  <button
                    disabled={courses.length === 0}
                    onClick={() => setShowSessionForm(!showSessionForm)}
                    className="btn btn-primary btn-sm"
                  >
                    <Radio size={16} /> Start Session
                  </button>
                </div>
              </div>

              {/* Course Selector */}
              <div className="form-group" style={{ maxWidth: '320px', marginBottom: showCourseForm || showSessionForm ? '1.5rem' : 0 }}>
                <label className="form-label" htmlFor="course-select">Active Course</label>
                <select
                  id="course-select"
                  className="form-select"
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>
                  ))}
                </select>
              </div>

              {/* Add Course Form */}
              {showCourseForm && (
                <form onSubmit={handleCreateCourse} style={{
                  padding: '1.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', marginBottom: showSessionForm ? '1rem' : 0
                }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Create Course
                  </h3>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 180px' }}>
                      <label className="form-label" htmlFor="new-code">Course Code</label>
                      <input
                        id="new-code"
                        type="text"
                        className="form-input"
                        value={newCourseCode}
                        onChange={(e) => setNewCourseCode(e.target.value)}
                        placeholder="e.g. CSC301"
                        required
                      />
                    </div>
                    <div style={{ flex: '2 1 260px' }}>
                      <label className="form-label" htmlFor="new-title">Course Title</label>
                      <input
                        id="new-title"
                        type="text"
                        className="form-input"
                        value={newCourseTitle}
                        onChange={(e) => setNewCourseTitle(e.target.value)}
                        placeholder="e.g. Database Design"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    Save Course
                  </button>
                </form>
              )}

              {/* Start Session Form */}
              {showSessionForm && (
                <form onSubmit={handleCreateSession} style={{
                  padding: '1.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Radio size={16} /> Start Attendance Session
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                    The geofence center will be set to your current GPS location.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 180px' }}>
                      <label className="form-label" htmlFor="sess-radius">Geofence Radius (m)</label>
                      <input
                        id="sess-radius"
                        type="number"
                        className="form-input"
                        value={sessionRadius}
                        onChange={(e) => setSessionRadius(parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                      <label className="form-label" htmlFor="sess-duration">Duration (minutes)</label>
                      <input
                        id="sess-duration"
                        type="number"
                        className="form-input"
                        value={sessionDuration}
                        onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    Launch Session
                  </button>
                </form>
              )}
            </div>

            {/* Active Session Display */}
            {activeSession ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* QR Code */}
                <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="badge badge-success" style={{ marginBottom: '1rem' }}>
                    <Radio size={13} /> Session Active
                  </div>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>QR Code</h3>
                  {sessionQr ? (
                    <div style={{
                      background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', display: 'inline-block', marginBottom: '1.5rem'
                    }}>
                      <img src={sessionQr} alt="Session QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
                    </div>
                  ) : (
                    <div className="spinner spinner-lg" style={{ margin: '2rem auto' }} />
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
                    <button onClick={handleEndSession} className="btn btn-danger btn-sm">
                      End Session
                    </button>
                    <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
                      <Download size={16} /> Export CSV
                    </button>
                  </div>
                </div>

                {/* Manual Override */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                    <div className="icon-circle icon-circle-warning" style={{ width: '36px', height: '36px' }}>
                      <Shield size={18} />
                    </div>
                    <h3 style={{ fontSize: '1.125rem' }}>Manual Overrides</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
                    Session gets flagged for review after 10 overrides.
                  </p>

                  {/* Override Slots */}
                  <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div key={idx} className={`slot ${idx < overrideCount ? 'slot-filled' : 'slot-empty'}`}>
                        {idx + 1}
                      </div>
                    ))}
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Remaining: <strong style={{ color: overrideRemaining <= 3 ? 'var(--warning)' : 'var(--text)' }}>{overrideRemaining}</strong>
                  </div>

                  {overrideRemaining > 0 ? (
                    <form onSubmit={handleCreateOverride} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <label className="form-label" htmlFor="override-student">Student</label>
                        <select
                          id="override-student"
                          className="form-select"
                          value={overrideStudentId}
                          onChange={(e) => setOverrideStudentId(e.target.value)}
                          required
                        >
                          <option value="">Select student</option>
                          {courseStudents.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name} ({s.matric_number})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label" htmlFor="override-reason">Reason</label>
                        <input
                          id="override-reason"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Device GPS calibration fault"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          required
                          minLength={10}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary btn-full">
                        Add Override
                      </button>
                    </form>
                  ) : (
                    <div className="alert alert-danger" style={{ justifyContent: 'center', fontWeight: 600 }}>
                      <AlertTriangle size={16} /> Override cap reached — session flagged
                    </div>
                  )}
                </div>

                {/* Audit Log */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="icon-circle" style={{ width: '36px', height: '36px', background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                        <Clock size={18} />
                      </div>
                      <h3 style={{ fontSize: '1.125rem' }}>Override Audit Log</h3>
                    </div>
                    {activeSession.is_flagged && (
                      <span className="badge badge-danger">
                        <AlertTriangle size={13} /> Flagged for Review
                      </span>
                    )}
                  </div>

                  {sessionOverrides.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>No overrides recorded yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sessionOverrides.map((ov, index) => (
                        <div key={index} className="audit-row">
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: '0.9375rem' }}>{ov.student_name}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}> ({ov.student_matric})</span>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.125rem 0 0' }}>
                              {ov.reason}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            <div>By: {ov.class_rep_name}</div>
                            <div>{new Date(ov.created_at).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No Active Session */
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Inbox size={28} />
                  </div>
                  <h3 style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>No active session</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                    Select a course above and start a session to begin tracking attendance.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
