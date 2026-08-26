import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import {
  MapPin, AlertTriangle, Plus, Download, BookOpen, BarChart3,
  Radio, Shield, LogOut, Clock, Inbox, UserCog, X, Check, Copy, Key
} from 'lucide-react';
import Logo from '../components/Logo';

const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [myActiveSessions, setMyActiveSessions] = useState<any[]>([]);

  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionQr, setSessionQr] = useState<string | null>(null);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionRadius, setSessionRadius] = useState(100);
  const [sessionDuration, setSessionDuration] = useState(120);

  const [overrideStudentId, setOverrideStudentId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideRemaining, setOverrideRemaining] = useState(10);
  const [overrideCount, setOverrideCount] = useState(0);
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [sessionOverrides, setSessionOverrides] = useState<any[]>([]);

  const [generatedCode, setGeneratedCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileFullName, setProfileFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCurrentPwd, setProfileCurrentPwd] = useState('');
  const [profileNewPwd, setProfileNewPwd] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

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
        const [summaryRes, allRes, activeSessRes] = await Promise.all([
          apiRequest('GET', '/api/attendance/my-summary'),
          apiRequest('GET', '/api/courses/all'),
          apiRequest('GET', '/api/sessions/my-active'),
        ]);
        setSummaryData(summaryRes.data || []);
        setAllCourses(allRes.data || []);
        setMyActiveSessions(activeSessRes.data || []);
      } else {
        if (coursesRes.data?.length > 0) {
          const firstCourseId = coursesRes.data[0].id;
          setSelectedCourse(firstCourseId);
          await loadSessionAndOverrides(firstCourseId);
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
        const qr = session.qr_code_image
          ? session.qr_code_image
          : (await apiRequest('GET', `/api/sessions/${session.id}/qr`)).qr_code_image;
        setSessionQr(qr);

        const [countRes, studentsRes, overridesRes] = await Promise.all([
          apiRequest('GET', `/api/overrides/session/${session.id}/count`),
          apiRequest('GET', `/api/courses/${courseId}/students`),
          apiRequest('GET', `/api/overrides/session/${session.id}`),
        ]);

        setOverrideCount(countRes.count);
        setOverrideRemaining(countRes.remaining);
        setCourseStudents(studentsRes.data || []);
        setSessionOverrides(overridesRes.data || []);
      } else {
        setSessionQr(null);
        setSessionOverrides([]);
        setCourseStudents([]);
      }
    } catch (e: any) {
      console.error('Failed to load session data:', e.message);
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
        course_title: newCourseTitle,
      });
      if (res.status === 'success' && res.data) {
        setActionSuccess(`Course ${res.data.course_code} created successfully!`);
        setNewCourseCode('');
        setNewCourseTitle('');
        setShowCourseForm(false);
        const updatedCourses = [...courses, res.data];
        setCourses(updatedCourses);
        setSelectedCourse(res.data.id);
        await loadSessionAndOverrides(res.data.id);
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
      setActionError('Please select or create a course first.');
      return;
    }

    if (!navigator.geolocation) {
      setActionError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await apiRequest('POST', '/api/sessions', {
            course_id: selectedCourse,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            geofence_radius_m: sessionRadius,
            duration_minutes: sessionDuration,
          });
          if (res.status === 'success' && res.data) {
            setActionSuccess('Session started successfully!');
            setShowSessionForm(false);
            setActiveSession(res.data);
            if (res.data.qr_code_image) setSessionQr(res.data.qr_code_image);
            await loadSessionAndOverrides(selectedCourse);
          }
        } catch (err: any) {
          setActionError(err.message || 'Session creation failed');
        }
      },
      (error) => {
        setActionError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Allow GPS access to start a session.'
            : 'Could not acquire GPS position. Ensure location services are enabled.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
        reason: overrideReason,
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
    } catch {
      setActionError('CSV export failed');
    }
  };

  const handleGenerateInvite = async () => {
    setCodeLoading(true);
    setGeneratedCode('');
    setCodeCopied(false);
    try {
      const res = await apiRequest('POST', '/api/courses/generate-invite');
      setGeneratedCode(res.data.code);
    } catch (e: any) {
      setActionError(e.message || 'Failed to generate invite code');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const handleOpenEditProfile = () => {
    setProfileFullName(user?.full_name || '');
    setProfilePhone(user?.phone_number || '');
    setProfileEmail(user?.email || '');
    setProfileCurrentPwd('');
    setProfileNewPwd('');
    setProfileError('');
    setProfileSuccess('');
    setShowEditProfile(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);
    try {
      const payload: any = {};
      if (profileFullName && profileFullName !== user?.full_name) payload.full_name = profileFullName;
      if (profilePhone && profilePhone !== user?.phone_number) payload.phone_number = profilePhone;
      if (profileEmail && profileEmail !== user?.email) payload.email = profileEmail;
      if (profileNewPwd) {
        payload.new_password = profileNewPwd;
        payload.current_password = profileCurrentPwd;
      }
      const res = await apiRequest('PUT', '/api/auth/profile', payload);
      if (res.status === 'success') {
        setProfileSuccess('Profile updated successfully!');
        await refreshUser();
        setProfileCurrentPwd('');
        setProfileNewPwd('');
      }
    } catch (e: any) {
      setProfileError(e.message || 'Profile update failed');
    } finally {
      setProfileLoading(false);
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
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">
            <Logo showText size="sm" />
          </div>
          <div className="nav-actions">
            <span className="badge badge-primary hide-mobile">
              {user?.role === 'class_rep' ? 'Class Rep' : 'Student'}
            </span>
            <button onClick={handleOpenEditProfile} className="btn btn-ghost btn-sm" title="Edit Profile" id="edit-profile-btn">
              <UserCog size={18} />
            </button>
            <button onClick={logout} className="btn btn-ghost btn-sm" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.25rem' }}>
            {user?.role === 'class_rep' ? 'Manage Attendance' : 'My Attendance'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.full_name}</p>
        </div>

        {showEditProfile && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'flex-end'
          }} onClick={(e) => { if (e.target === e.currentTarget) setShowEditProfile(false); }}>
            <div className="card animate-slideUp" style={{
              width: '100%', maxWidth: '420px', height: '100vh', overflowY: 'auto',
              borderRadius: '0', margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="icon-circle icon-circle-primary" style={{ width: '36px', height: '36px' }}>
                    <UserCog size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.0625rem', margin: 0 }}>Edit Profile</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>Update your account details</p>
                  </div>
                </div>
                <button onClick={() => setShowEditProfile(false)} className="btn btn-ghost btn-sm">
                  <X size={18} />
                </button>
              </div>

              {profileError && <div className="alert alert-danger"><AlertTriangle size={16} /><span>{profileError}</span></div>}
              {profileSuccess && <div className="alert alert-success"><Check size={16} /><span>{profileSuccess}</span></div>}

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Matric Number</label>
                  <input type="text" className="form-input" value={user?.matric_number || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="profile-name">Full Name</label>
                  <input id="profile-name" type="text" className="form-input" value={profileFullName}
                    onChange={(e) => setProfileFullName(e.target.value)} placeholder="Your full name" />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="profile-phone">Phone Number</label>
                  <input id="profile-phone" type="tel" className="form-input" value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)} placeholder="e.g. +2348012345678" />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="profile-email">Email Address</label>
                  <input id="profile-email" type="email" className="form-input" value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)} placeholder="you@university.edu" />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>Change Password (optional)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="profile-cur-pwd">Current Password</label>
                      <input id="profile-cur-pwd" type="password" className="form-input" value={profileCurrentPwd}
                        onChange={(e) => setProfileCurrentPwd(e.target.value)} placeholder="Required to change password" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="profile-new-pwd">New Password</label>
                      <input id="profile-new-pwd" type="password" className="form-input" value={profileNewPwd}
                        onChange={(e) => setProfileNewPwd(e.target.value)} placeholder="Min. 8 characters" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full" disabled={profileLoading}>
                  {profileLoading ? <div className="spinner spinner-sm spinner-white" /> : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

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

        {user?.role === 'student' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                    <select id="enroll-select" className="form-select"
                      onChange={(e) => setSelectedCourse(e.target.value)} value={selectedCourse}>
                      <option value="">Choose course</option>
                      {allCourses.map((c) => (
                        <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>
                      ))}
                    </select>
                  </div>
                  <button disabled={!selectedCourse} onClick={() => handleEnroll(selectedCourse)} className="btn btn-primary">
                    Enroll
                  </button>
                </div>
              )}
            </div>

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
                          Geofence radius: {sess.geofence_radius_m}m
                        </p>
                      </div>
                      <div>
                        {sess.already_marked ? (
                          <span className="badge badge-success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}>
                            ✓ Attendance Marked
                          </span>
                        ) : (
                          <button onClick={() => navigate(`/attend/${sess.id}`)} className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            <MapPin size={16} /> Mark Attendance
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="icon-circle" style={{ width: '36px', height: '36px', background: '#F0FDF4', color: 'var(--success)' }}>
                  <BarChart3 size={18} />
                </div>
                <h2 style={{ fontSize: '1.25rem' }}>Attendance Summary</h2>
              </div>

              {summaryData.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <div className="empty-state-icon"><Inbox size={28} /></div>
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
                            <div className="stat-value" style={{ fontSize: '1.125rem', color: isBelowTarget ? 'var(--danger)' : 'var(--success)' }}>
                              {data.attendance_percentage}%
                            </div>
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

        {user?.role === 'class_rep' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

              <div className="form-group" style={{ maxWidth: '320px', marginBottom: showCourseForm || showSessionForm ? '1.5rem' : 0 }}>
                <label className="form-label" htmlFor="course-select">Active Course</label>
                <select id="course-select" className="form-select" value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>
                  ))}
                </select>
              </div>

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
                      <input id="new-code" type="text" className="form-input" value={newCourseCode}
                        onChange={(e) => setNewCourseCode(e.target.value)} placeholder="e.g. CSC301" required />
                    </div>
                    <div style={{ flex: '2 1 260px' }}>
                      <label className="form-label" htmlFor="new-title">Course Title</label>
                      <input id="new-title" type="text" className="form-input" value={newCourseTitle}
                        onChange={(e) => setNewCourseTitle(e.target.value)} placeholder="e.g. Database Design" required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    Save Course
                  </button>
                </form>
              )}

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
                      <input id="sess-radius" type="number" className="form-input" value={sessionRadius}
                        onChange={(e) => setSessionRadius(parseInt(e.target.value))} required />
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                      <label className="form-label" htmlFor="sess-duration">Duration (minutes)</label>
                      <input id="sess-duration" type="number" className="form-input" value={sessionDuration}
                        onChange={(e) => setSessionDuration(parseInt(e.target.value))} required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    Launch Session
                  </button>
                </form>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="icon-circle icon-circle-primary" style={{ width: '36px', height: '36px' }}>
                  <Key size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.0625rem', margin: 0 }}>Generate Invite Code</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                    Share this code with a student to promote them to Class Rep
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={handleGenerateInvite} className="btn btn-secondary btn-sm" disabled={codeLoading}>
                  {codeLoading ? <div className="spinner spinner-sm" /> : <><Plus size={16} /> Generate Code</>}
                </button>

                {generatedCode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <code style={{
                      background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                      padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)',
                      fontFamily: 'monospace', fontSize: '1.0625rem', fontWeight: 700,
                      letterSpacing: '0.1em', color: 'var(--primary)'
                    }}>
                      {generatedCode}
                    </code>
                    <button onClick={handleCopyCode} className="btn btn-ghost btn-sm" title="Copy code">
                      {codeCopied ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {activeSession ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
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
                        <select id="override-student" className="form-select" value={overrideStudentId}
                          onChange={(e) => setOverrideStudentId(e.target.value)} required>
                          <option value="">Select student</option>
                          {courseStudents.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name} ({s.matric_number})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label" htmlFor="override-reason">Reason</label>
                        <input id="override-reason" type="text" className="form-input"
                          placeholder="e.g. Device GPS calibration fault"
                          value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
                          required minLength={10} />
                      </div>
                      <button type="submit" className="btn btn-primary btn-full">Add Override</button>
                    </form>
                  ) : (
                    <div className="alert alert-danger" style={{ justifyContent: 'center', fontWeight: 600 }}>
                      <AlertTriangle size={16} /> Override cap reached — session flagged
                    </div>
                  )}
                </div>

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
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><Inbox size={28} /></div>
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
