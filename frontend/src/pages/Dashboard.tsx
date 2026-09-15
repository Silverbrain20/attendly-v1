import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, downloadFile } from '../utils/api';
import {
  MapPin, AlertTriangle, Plus, Download, BookOpen, BarChart3,
  Radio, Shield, LogOut, Clock, Inbox, UserCog, X, Check, Copy, Key,
  FileSpreadsheet, Eye, RotateCw, Trash2
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

  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [historyFilterCourse, setHistoryFilterCourse] = useState<string>('all');
  const [viewSessionDetail, setViewSessionDetail] = useState<any>(null);
  const [sessionAttendees, setSessionAttendees] = useState<any[]>([]);
  const [loadingModalLogs, setLoadingModalLogs] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const [isRepMarked, setIsRepMarked] = useState(false);
  const [repCheckInLoading, setRepCheckInLoading] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setActionError('');
    try {
      await apiRequest('DELETE', '/api/auth/account');
      setShowDeleteModal(false);
      logout();
      navigate('/login?deleted=true');
    } catch (e: any) {
      setActionError(e.message || 'Failed to delete account');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRefreshHistory = async () => {
    setRefreshingHistory(true);
    try {
      const historyRes = await apiRequest('GET', '/api/sessions/history/all');
      setSessionHistory(historyRes.data || []);
      if (selectedCourse) {
        await loadSessionAndOverrides(selectedCourse);
      }
    } catch (e: any) {
      console.error('Failed to refresh history:', e.message);
    } finally {
      setRefreshingHistory(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    fetchData();

    // Check if coming from a successful attendance check-in redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('marked') === 'true') {
      const course = params.get('course') || '';
      setActionSuccess(`🎉 Attendance successfully marked${course ? ` for ${decodeURIComponent(course)}` : ''}!`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
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
        const historyRes = await apiRequest('GET', '/api/sessions/history/all').catch(() => ({ data: [] }));
        setSessionHistory(historyRes.data || []);

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

  const handleExportSessionCsv = async (sessionId: string, courseCode: string, dateStr: string) => {
    setDownloadingId(sessionId);
    setActionError('');
    try {
      await downloadFile(`/api/export/session/${sessionId}`, `${courseCode}_attendance_${dateStr}.csv`);
      setActionSuccess(`Downloaded CSV spreadsheet for ${courseCode}!`);
    } catch (e: any) {
      setActionError(e.message || 'Failed to download session CSV');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportCourseCsv = async (courseId: string, courseCode: string) => {
    setDownloadingId(courseId);
    setActionError('');
    try {
      await downloadFile(`/api/export/course/${courseId}`, `${courseCode}_full_report.csv`);
      setActionSuccess(`Downloaded full course attendance report for ${courseCode}!`);
    } catch (e: any) {
      setActionError(e.message || 'Failed to download course report');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenSessionLogs = async (sess: any) => {
    setViewSessionDetail(sess);
    setLoadingModalLogs(true);
    try {
      const res = await apiRequest('GET', `/api/attendance/session/${sess.id}`);
      setSessionAttendees(res.data || []);
    } catch (e: any) {
      setActionError(e.message || 'Failed to load session attendees');
    } finally {
      setLoadingModalLogs(false);
    }
  };

  const handleRepCheckIn = async () => {
    if (!activeSession) return;
    setRepCheckInLoading(true);
    setActionError('');
    setActionSuccess('');

    const markSelf = async (lat: number, lng: number) => {
      try {
        await apiRequest('POST', '/api/attendance/mark', {
          session_id: activeSession.id,
          latitude: lat,
          longitude: lng,
        });
        setIsRepMarked(true);
        setActionSuccess('✓ You have successfully marked yourself present for this session!');
        await loadSessionAndOverrides(selectedCourse);
      } catch (err: any) {
        setActionError(err.message || 'Failed to mark self attendance');
      } finally {
        setRepCheckInLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => markSelf(position.coords.latitude, position.coords.longitude),
        () => markSelf(0.0, 0.0),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      await markSelf(0.0, 0.0);
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

        const [countRes, studentsRes, overridesRes, attendeesRes] = await Promise.all([
          apiRequest('GET', `/api/overrides/session/${session.id}/count`),
          apiRequest('GET', `/api/courses/${courseId}/students`),
          apiRequest('GET', `/api/overrides/session/${session.id}`),
          apiRequest('GET', `/api/attendance/session/${session.id}`).catch(() => ({ data: [] })),
        ]);

        setOverrideCount(countRes.count);
        setOverrideRemaining(countRes.remaining);
        setCourseStudents(studentsRes.data || []);
        setSessionOverrides(overridesRes.data || []);

        const selfRecord = (attendeesRes.data || []).find((att: any) => att.matric_number === user?.matric_number);
        setIsRepMarked(!!selfRecord);
      } else {
        setSessionQr(null);
        setSessionOverrides([]);
        setCourseStudents([]);
        setIsRepMarked(false);
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
            <button onClick={() => setShowLogoutModal(true)} className="btn btn-ghost btn-sm" title="Sign Out">
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
                    <h3 style={{ fontSize: '1.0625rem', margin: 0 }}>Account Settings</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>Update profile or manage account</p>
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

              {/* Danger Zone */}
              <div style={{
                borderTop: '1px solid rgba(225, 29, 72, 0.25)',
                paddingTop: '1.25rem',
                marginTop: '0.5rem',
                background: 'rgba(225, 29, 72, 0.03)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(225, 29, 72, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', color: '#E11D48' }}>
                  <AlertTriangle size={16} />
                  <strong style={{ fontSize: '0.875rem' }}>Danger Zone</strong>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.875rem', lineHeight: 1.4 }}>
                  Permanently delete your user account, course enrollments, and all attendance records.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfile(false);
                    setDeleteConfirmText('');
                    setShowDeleteModal(true);
                  }}
                  className="btn btn-danger btn-sm"
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Trash2 size={15} /> Delete User Account
                </button>
              </div>
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
                  {isRepMarked ? (
                    <div className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', marginBottom: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Check size={16} /> You are marked Present (Geo-Verified)
                    </div>
                  ) : (
                    <button
                      onClick={handleRepCheckIn}
                      className="btn btn-primary btn-sm"
                      disabled={repCheckInLoading}
                      style={{ marginBottom: '1.25rem', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#166534', color: '#fff' }}
                    >
                      {repCheckInLoading ? (
                        <div className="spinner spinner-sm spinner-white" />
                      ) : (
                        <><MapPin size={16} /> Mark Myself Present</>
                      )}
                    </button>
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

            {/* Session History & Spreadsheet Export Center */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="icon-circle icon-circle-primary" style={{ width: '36px', height: '36px' }}>
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Attendance Logs & Spreadsheet Export</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                      View historical attendance records and download formatted CSV reports
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRefreshHistory}
                    className="btn btn-secondary btn-sm"
                    disabled={refreshingHistory}
                    title="Refresh logs & history"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                  >
                    <RotateCw size={15} className={refreshingHistory ? 'animate-spin' : ''} />
                    {refreshingHistory ? 'Refreshing...' : 'Refresh'}
                  </button>

                  {selectedCourse && (
                    <button
                      onClick={() => {
                        const c = courses.find((crs) => crs.id === selectedCourse);
                        if (c) handleExportCourseCsv(c.id, c.course_code);
                      }}
                      className="btn btn-secondary btn-sm"
                      disabled={downloadingId === selectedCourse}
                    >
                      <FileSpreadsheet size={15} /> Export Full Course Sheet
                    </button>
                  )}
                </div>
              </div>

              {/* Filter */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filter by course:</span>
                <select
                  className="form-select"
                  style={{ maxWidth: '240px' }}
                  value={historyFilterCourse}
                  onChange={(e) => setHistoryFilterCourse(e.target.value)}
                >
                  <option value="all">All Courses ({sessionHistory.length} sessions)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.course_code}</option>
                  ))}
                </select>
              </div>

              {/* History Table / Rows */}
              {sessionHistory.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <div className="empty-state-icon"><Clock size={28} /></div>
                  <h3 style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1rem' }}>No session logs recorded</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Launch your first attendance session to generate history logs.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sessionHistory
                    .filter((sess) => historyFilterCourse === 'all' || sess.course_id === historyFilterCourse)
                    .map((sess) => {
                      const isActive = !sess.ended_at && new Date(sess.end_time) > new Date();
                      const dateStr = new Date(sess.start_time).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      });
                      const timeStr = new Date(sess.start_time).toLocaleTimeString(undefined, {
                        hour: '2-digit', minute: '2-digit'
                      });

                      const percent = sess.total_enrolled > 0
                        ? Math.round((sess.present_count / sess.total_enrolled) * 100)
                        : 0;

                      return (
                        <div key={sess.id} className="attendance-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <strong style={{ fontSize: '1rem' }}>{sess.course_code}</strong>
                              {isActive ? (
                                <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>🟢 Active</span>
                              ) : (
                                <span className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>Completed</span>
                              )}
                              {sess.is_flagged && (
                                <span className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>Flagged</span>
                              )}
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                              {dateStr} at {timeStr} • Geofence: {sess.geofence_radius_m}m
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div className="stat-label">Attendance</div>
                              <div className="stat-value" style={{ fontSize: '1rem' }}>
                                <strong>{sess.present_count}</strong> / {sess.total_enrolled} ({percent}%)
                              </div>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                              <div className="stat-label">Overrides</div>
                              <div className="stat-value" style={{ fontSize: '1rem' }}>{sess.override_count}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenSessionLogs(sess)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                            >
                              <Eye size={15} /> View Logs
                            </button>
                            <button
                              onClick={() => handleExportSessionCsv(sess.id, sess.course_code, dateStr.replace(/, /g, '_'))}
                              className="btn btn-primary btn-sm"
                              disabled={downloadingId === sess.id}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                            >
                              {downloadingId === sess.id ? (
                                <div className="spinner spinner-sm spinner-white" />
                              ) : (
                                <><Download size={15} /> Export CSV</>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Session Log Modal */}
        {viewSessionDetail && (
          <div className="modal-backdrop" onClick={() => setViewSessionDetail(null)}>
            <div className="modal-content animate-slideUp" onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="icon-circle icon-circle-primary" style={{ width: '40px', height: '40px' }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                      Session Log — {viewSessionDetail.course_code}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.2rem 0 0' }}>
                      {new Date(viewSessionDetail.start_time).toLocaleDateString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })} at {new Date(viewSessionDetail.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <button onClick={() => setViewSessionDetail(null)} className="btn btn-ghost btn-sm" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Summary Stats Row */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem', padding: '1rem 1.5rem', background: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ background: 'var(--bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div className="stat-label">Total Verified</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {sessionAttendees.length} <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 400 }}>Students</span>
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div className="stat-label">Geo-Verified</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                    {sessionAttendees.filter(a => !a.is_manual_override).length}
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div className="stat-label">Manual Overrides</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }}>
                    {sessionAttendees.filter(a => a.is_manual_override).length}
                  </div>
                </div>
              </div>

              {/* Modal Body / Table */}
              <div className="modal-body" style={{ padding: 0 }}>
                {loadingModalLogs ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 0' }}>
                    <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Fetching session attendance logs...</p>
                  </div>
                ) : sessionAttendees.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem 2rem' }}>
                    <div className="empty-state-icon"><Inbox size={28} /></div>
                    <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>No check-ins recorded</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>No students have checked into this session yet.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Details</th>
                        <th>Matric Number</th>
                        <th>Verification Method</th>
                        <th style={{ textAlign: 'right' }}>Distance</th>
                        <th style={{ textAlign: 'right' }}>Check-in Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionAttendees.map((att: any, i: number) => {
                        const initials = att.full_name
                          ? att.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                          : 'ST';

                        return (
                          <tr key={i}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="avatar-circle">{initials}</div>
                                <div>
                                  <strong style={{ display: 'block', color: 'var(--text)' }}>{att.full_name}</strong>
                                </div>
                              </div>
                            </td>
                            <td>
                              <code style={{ background: 'var(--bg-subtle)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                {att.matric_number}
                              </code>
                            </td>
                            <td>
                              {att.is_manual_override ? (
                                <span className="badge badge-warning" style={{ gap: '0.375rem', fontSize: '0.75rem' }}>
                                  <Shield size={12} /> Manual Override
                                </span>
                              ) : (
                                <span className="badge badge-success" style={{ gap: '0.375rem', fontSize: '0.75rem' }}>
                                  <MapPin size={12} /> Geo-Verified
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {att.distance_meters !== null ? `${Number(att.distance_meters).toFixed(1)}m` : '0.0m'}
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                              {new Date(att.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button onClick={() => setViewSessionDetail(null)} className="btn btn-secondary btn-sm">
                  Close
                </button>
                <button
                  onClick={() => handleExportSessionCsv(
                    viewSessionDetail.id,
                    viewSessionDetail.course_code,
                    new Date(viewSessionDetail.start_time).toISOString().slice(0, 10)
                  )}
                  className="btn btn-primary btn-sm"
                  disabled={downloadingId === viewSessionDetail.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {downloadingId === viewSessionDetail.id ? (
                    <div className="spinner spinner-sm spinner-white" />
                  ) : (
                    <><Download size={15} /> Export Spreadsheet (CSV)</>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
            <div className="modal-content animate-slideUp" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="icon-circle icon-circle-primary" style={{ width: '40px', height: '40px', background: '#fff1f2', color: '#6C0022' }}>
                    <LogOut size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Confirm Log Out</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.15rem 0 0' }}>Sign out of your Attendly account</p>
                  </div>
                </div>
                <button onClick={() => setShowLogoutModal(false)} className="btn btn-ghost btn-sm" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: 0, lineHeight: 1.5 }}>
                  Are you sure you want to log out? You will need to sign in again to mark attendance or manage course sessions.
                </p>
              </div>

              <div className="modal-footer">
                <button onClick={() => setShowLogoutModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button onClick={handleConfirmLogout} className="btn btn-primary btn-sm" style={{ background: '#6C0022', color: '#fff' }}>
                  <LogOut size={15} style={{ marginRight: '0.375rem' }} /> Log Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
            <div className="modal-content animate-slideUp" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ borderBottom: '1px solid rgba(225, 29, 72, 0.25)', background: '#FFF1F2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="icon-circle icon-circle-danger" style={{ width: '40px', height: '40px', background: '#FFE4E6', color: '#E11D48' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#9F1239' }}>
                      Delete Account Permanently?
                    </h3>
                    <p style={{ color: '#BE123C', fontSize: '0.8125rem', margin: '0.15rem 0 0' }}>This action is permanent and cannot be undone.</p>
                  </div>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost btn-sm" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                    Deleting your account will erase your profile, course enrollments, attendance records, and all historical data permanently.
                  </p>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    Type <strong style={{ color: '#E11D48' }}>DELETE</strong> below to confirm:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to enable button"
                    style={{ letterSpacing: '0.05em' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="btn btn-danger btn-sm"
                  disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                  style={{ opacity: deleteConfirmText !== 'DELETE' ? 0.5 : 1, cursor: deleteConfirmText !== 'DELETE' ? 'not-allowed' : 'pointer' }}
                >
                  {deleteLoading ? (
                    <div className="spinner spinner-sm spinner-white" />
                  ) : (
                    <><Trash2 size={15} style={{ marginRight: '0.375rem' }} /> Permanently Delete Account</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
