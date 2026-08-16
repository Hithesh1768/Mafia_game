import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthView.css';

const getErrorMessage = (err, fallback) => {
  if (!err?.response?.data) return fallback;
  const data = err.response.data;
  if (typeof data === 'string') return data;
  if (data.message && typeof data.message === 'string') return data.message;
  if (data.error && typeof data.error === 'string') return data.error;
  return fallback;
};

const AuthView = () => {
  const { login, loginAsGuest, loginWithGoogle, registerWithGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'guest'
  const [signupStep, setSignupStep] = useState(1); // 1 = Google Signin, 2 = Set Username/Password
  const [googleCredential, setGoogleCredential] = useState(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleGoogleLoginSuccess = async (response) => {
    setError('');
    if (authMode === 'register') {
      // Step 1 of registration: verify Google account, then show credentials form
      setGoogleCredential(response.credential);
      setSignupStep(2);
    } else {
      // Login mode: direct authorization
      setActionLoading(true);
      try {
        await loginWithGoogle(response.credential);
      } catch (err) {
        console.error(err);
        setError(getErrorMessage(err, 'Google Authentication failed. Please sign up first.'));
      } finally {
        setActionLoading(false);
      }
    }
  };

  useEffect(() => {
    const checkAndInitGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "904993181827-2mknpeq76aiforve3mbe0r85i8c187m9.apps.googleusercontent.com",
          callback: handleGoogleLoginSuccess
        });
        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: "dark", size: "large", width: 380 }
          );
        }
      }
    };

    checkAndInitGoogle();
    const interval = setInterval(() => {
      if (window.google) {
        checkAndInitGoogle();
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [authMode, signupStep]);

  const validatePassword = (pw) => {
    if (pw.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (!/\d/.test(pw)) {
      return 'Password must contain at least one number.';
    }
    if (!/[!@#$%^&*(),.?":{}|<>_]/.test(pw)) {
      return 'Password must contain at least one special character.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (authMode === 'guest') {
      if (!username.trim()) {
        setError('Please enter a display name.');
        return;
      }
      setActionLoading(true);
      try {
        await loginAsGuest(username.trim());
      } catch (err) {
        console.error(err);
        setError(getErrorMessage(err, 'Guest login failed.'));
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (authMode === 'register') {
      if (signupStep === 1) {
        setError('Please verify your identity with Google first.');
        return;
      }
      if (!username.trim() || !password.trim()) {
        setError('Please fill in all fields.');
        return;
      }

      // Front-end password validation
      const pwValidationError = validatePassword(password);
      if (pwValidationError) {
        setError(pwValidationError);
        return;
      }

      setActionLoading(true);
      try {
        await registerWithGoogle(googleCredential, username.trim(), password);
      } catch (err) {
        console.error(err);
        setError(getErrorMessage(err, 'Registration failed.'));
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // Login mode
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setActionLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Authentication failed. Please check credentials.'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="auth-view-container animate-fade-in">
      {/* Background Ambience */}
      <div className="auth-bg-ambience">
        <div className="auth-bg-image"></div>
        <div className="auth-bg-gradient"></div>
      </div>

      {/* Floating Error Bubble */}
      {error && (
        <div className="floating-bubble-error animate-slide-in">
          <span className="material-symbols-outlined bubble-error-icon">warning</span>
          <span className="bubble-error-text">{error}</span>
          <button className="bubble-error-close-btn" onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {/* Authentication Shell */}
      <main className="auth-shell">
        {/* Brand Identity */}
        <div className="brand-identity">
          <h1 className="brand-title">THE SYNDICATE</h1>
          <div className="brand-sub-divider">
            <span className="divider-line"></span>
            <span className="divider-text">Established 1924</span>
            <span className="divider-line"></span>
          </div>
        </div>

        {/* Login/Register Card */}
        <div className="auth-card glass-panel">
          {/* Decorative Accent */}
          <div className="card-fingerprint-accent">
            <span className="material-symbols-outlined">fingerprint</span>
          </div>

          <div className="auth-card-content">
            <header className="auth-card-header">
              <h2 className="auth-card-title">
                <span className="material-symbols-outlined header-icon">
                  {authMode === 'guest' 
                    ? 'person_pin' 
                    : (authMode === 'login' ? 'encrypted' : (signupStep === 1 ? 'add_moderator' : 'person_add'))}
                </span>
                {authMode === 'guest' 
                  ? 'Guest Pass' 
                  : (authMode === 'login' 
                      ? 'Agent Entry' 
                      : (signupStep === 1 ? 'Syndicate Enlist' : 'Establish Credentials'))}
              </h2>
              <p className="auth-card-subtitle">
                {authMode === 'guest' 
                  ? 'GUEST ENTRY. TEMPORARY PASSPORT REQUIRED.' 
                  : (authMode === 'login' 
                      ? 'IDENTIFICATION REQUIRED FOR ACCESS.' 
                      : (signupStep === 1 ? 'VERIFY IDENTITY VIA GOOGLE SIGN-IN.' : 'DEFINE YOUR SIGNATURE CODE NAME & SECURITY KEY.'))}
              </p>
            </header>

            {/* Guest Session Warning Banner */}
            {authMode === 'guest' && (
              <div className="alert-error-syndicate guest-warning-banner" style={{ border: '1px dashed #d32f2f', color: '#ffb3ac', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#d32f2f' }}>warning</span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  Guest sessions expire in 4 hours. No credentials will be stored. You cannot recover this session.
                </span>
              </div>
            )}

            {/* Input Group / Forms */}
            <form className="auth-form-syndicate" onSubmit={handleSubmit}>
              
              {/* Registration Step 1: Sign in with Google first */}
              {authMode === 'register' && signupStep === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', margin: '20px 0 10px' }}>
                  <p className="auth-card-subtitle" style={{ textAlign: 'center', color: 'var(--color-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                    Rigid clearance active. To enlist in the Syndicate, you must first verify your email address using Google Sign-In below.
                  </p>
                  <div id="google-signin-btn" className="google-btn-wrapper" style={{ minHeight: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                </div>
              ) : (
                /* Standard username & password inputs for Login, Guest, or Register Step 2 */
                <>
                  <div className="auth-input-group">
                    <input
                      id="username"
                      type="text"
                      className="auth-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder=" "
                      required
                      autoComplete="username"
                      disabled={actionLoading}
                    />
                    <label className="auth-label" htmlFor="username">
                      {authMode === 'guest' ? 'Display Name / Nickname' : 'Username'}
                    </label>
                    <div className="auth-input-badge">
                      <span className="auth-badge-text">INPUT</span>
                    </div>
                  </div>

                  {authMode !== 'guest' && (
                    <div className="auth-input-group">
                      <input
                        id="password"
                        type="password"
                        className="auth-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder=" "
                        required
                        autoComplete={authMode === 'login' ? "current-password" : "new-password"}
                        disabled={actionLoading}
                      />
                      <label className="auth-label" htmlFor="password">Security Key</label>
                      <div className="auth-input-badge">
                        <span className="auth-badge-text">REC</span>
                      </div>
                    </div>
                  )}

                  {authMode === 'register' && signupStep === 2 && (
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px', fontFamily: 'var(--font-mono)', lineHeight: '1.3' }}>
                      🔑 *Strength Required:* Min 6 characters, at least 1 number and 1 special character.
                    </p>
                  )}

                  {/* Action Button */}
                  <div className="auth-action-btn-container">
                    <button
                      type="submit"
                      className="auth-submit-btn-syndicate"
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <div className="spinner-syndicate"></div>
                      ) : (
                        <>
                          <span>
                            {authMode === 'guest' 
                              ? 'ENTER AS GUEST' 
                              : (authMode === 'login' ? 'AUTHORIZE ACCESS' : 'COMPLETE REGISTER')}
                          </span>
                          <span className="material-symbols-outlined arrow-icon">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>

            {/* Toggle Navigation */}
            <div className="auth-toggle-container">
              <button
                type="button"
                className="auth-toggle-btn-syndicate"
                onClick={() => {
                  if (authMode === 'login') {
                    setAuthMode('register');
                    setSignupStep(1);
                    setGoogleCredential(null);
                  } else {
                    setAuthMode('login');
                    setSignupStep(1);
                    setGoogleCredential(null);
                  }
                  setError('');
                }}
                disabled={actionLoading}
              >
                <span>
                  {authMode === 'login' 
                    ? 'NO CLEARANCE? APPLY FOR MEMBERSHIP' 
                    : 'ALREADY VETTED? RETURN TO ENTRY'}
                </span>
                <span className="material-symbols-outlined toggle-icon">add_moderator</span>
              </button>
            </div>

            {/* Social Divider (Only shown for Login / Guest, since Register has Google embedded inside Step 1) */}
            {authMode !== 'register' && (
              <>
                <div className="brand-sub-divider" style={{ margin: '20px 0 16px' }}>
                  <span className="divider-line"></span>
                  <span className="divider-text" style={{ fontSize: '10px' }}>SECURE ACCESS PROTOCOLS</span>
                  <span className="divider-line"></span>
                </div>

                {/* Alternate Login Channels */}
                <div className="auth-alternative-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  <div id="google-signin-btn" className="google-btn-wrapper" style={{ minHeight: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                  
                  <button
                    type="button"
                    className="auth-toggle-btn-syndicate"
                    style={{ border: '1px solid var(--border-outline-variant)', width: '100%', padding: '10px 14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    onClick={() => {
                      if (authMode !== 'guest') {
                        // Alert warning on initial guest click
                        const proceed = window.confirm("Guest Warning: Guest sessions expire in 4 hours and no credentials will be stored. Proceed?");
                        if (proceed) {
                          setAuthMode('guest');
                          setError('');
                        }
                      } else {
                        setAuthMode('login');
                        setError('');
                      }
                    }}
                    disabled={actionLoading}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      {authMode === 'guest' ? 'vpn_key' : 'person_pin'}
                    </span>
                    <span>{authMode === 'guest' ? 'RETURN TO LOGIN' : 'CONTINUE AS GUEST'}</span>
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        {/* System Footer */}
        <footer className="auth-system-footer">
          <div className="footer-node">
            <span className="material-symbols-outlined node-icon">public</span>
            <span className="node-text">NODE: LCN_NYC_04</span>
          </div>
          <div className="footer-encryption">
            ENCRYPTION: 256-BIT
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AuthView;
