import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { lobbyService, playerService } from '../services/api';
import './DashboardView.css';

const getErrorMessage = (err, fallback) => {
  if (!err?.response?.data) return fallback;
  const data = err.response.data;
  if (typeof data === 'string') return data;
  if (data.message && typeof data.message === 'string') return data.message;
  if (data.error && typeof data.error === 'string') return data.error;
  return fallback;
};

const DashboardView = ({ onJoinLobby }) => {
  const { user, logout, setUser } = useAuth();
  const [lobbies, setLobbies] = useState([]);
  
  // Lobby creation states
  const [newLobbyName, setNewLobbyName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [lobbyPassword, setLobbyPassword] = useState('');
  
  // Join by code states
  const [joinCode, setJoinCode] = useState('');
  const [codeJoining, setCodeJoining] = useState(false);

  // Modal states
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedLobbyId, setSelectedLobbyId] = useState(null);
  const [inputPassword, setInputPassword] = useState('');

  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch lobbies helper
  const fetchLobbies = async () => {
    try {
      const res = await lobbyService.listLobbies();
      setLobbies(res.data || []);
    } catch (err) {
      console.error("Failed to load lobbies", err);
    } finally {
      setLoadingLobbies(false);
    }
  };

  // Poll lobbies list
  useEffect(() => {
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    if (!newLobbyName.trim()) {
      setError('Please enter a lobby name.');
      return;
    }
    setError('');
    setCreating(true);
    try {
      // Create endpoint returns lobby DTO, and automatically joins the creator
      const res = await lobbyService.createLobby(
        newLobbyName.trim(), 
        isPrivate, 
        isPrivate && lobbyPassword.trim() ? lobbyPassword.trim() : ''
      );
      const createdLobby = res.data;
      
      // Update local player state
      const updatedUser = { ...user, lobbyId: createdLobby.lobbyId, host: true };
      setUser(updatedUser);
      onJoinLobby(createdLobby.lobbyId);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to create lobby.'));
    } finally {
      setCreating(false);
    }
  };

  const handleJoinLobby = async (lobbyId, password = '') => {
    setError('');
    setJoiningId(lobbyId);
    try {
      const res = await playerService.joinLobby(lobbyId, password);
      const joinedPlayer = res.data;
      
      // Update local player state
      const updatedUser = { ...user, lobbyId: lobbyId, host: joinedPlayer.host };
      setUser(updatedUser);
      onJoinLobby(lobbyId);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to join lobby.'));
    } finally {
      setJoiningId(null);
    }
  };

  const handleLobbyCardClick = (lobby) => {
    if (lobby.passwordProtected || lobby.isPasswordProtected) {
      setSelectedLobbyId(lobby.lobbyId);
      setPasswordModalOpen(true);
    } else {
      handleJoinLobby(lobby.lobbyId);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code.');
      return;
    }
    setError('');
    setCodeJoining(true);
    try {
      // Fetch details first to verify if it requires password
      const res = await lobbyService.getLobbyDetails(code);
      const lobbyData = res.data;

      if (lobbyData.passwordProtected || lobbyData.isPasswordProtected) {
        setSelectedLobbyId(code);
        setPasswordModalOpen(true);
      } else {
        await handleJoinLobby(code);
      }
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Lobby code not found.'));
    } finally {
      setCodeJoining(false);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setPasswordModalOpen(false);
    const targetLobbyId = selectedLobbyId;
    const targetPassword = inputPassword;
    setSelectedLobbyId(null);
    setInputPassword('');
    await handleJoinLobby(targetLobbyId, targetPassword);
  };

  return (
    <div className="dashboard-view-wrapper animate-fade-in">
      {/* TopNavBar */}
      <header className="dashboard-navbar">
        <div className="navbar-left-group">
          <span className="navbar-brand-title">THE SYNDICATE</span>
        </div>

        <div className="navbar-right-group">
          <div className="navbar-user-status">
            <span className="user-prestige-name">{user?.name?.toUpperCase() || 'DON CORLEONE'}</span>
          </div>
          <div className="navbar-avatar-box">
            <span className="material-symbols-outlined">person</span>
          </div>
          <button className="navbar-logout-btn" onClick={logout}>LOGOUT</button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="dashboard-main-grid">
        {error && (
          <div className="floating-bubble-error animate-slide-in">
            <span className="material-symbols-outlined bubble-error-icon">warning</span>
            <span className="bubble-error-text">{error}</span>
            <button className="bubble-error-close-btn" onClick={() => setError('')}>&times;</button>
          </div>
        )}

        <div className="dashboard-layout-cols">
          {/* Left Column: Lobby Management */}
          <div className="dashboard-left-col">
            <div className="dashboard-section-title-block">
              <h1 className="dashboard-main-title">Safehouse Finder</h1>
              <p className="dashboard-main-subtitle">SECURE NEW CHANNEL</p>
            </div>

            {/* Lobby Creation Card */}
            <section className="dashboard-creation-card glass-panel">
              <h2 className="card-section-title">
                <span className="material-symbols-outlined icon-spacing">add_box</span>
                LOBBY CREATION
              </h2>
              <form className="dashboard-create-form" onSubmit={handleCreateLobby}>
                <div className="dashboard-field-group">
                  <label className="field-label-sm">IDENTIFIER</label>
                  <input
                    type="text"
                    className="dashboard-input-field"
                    value={newLobbyName}
                    onChange={(e) => setNewLobbyName(e.target.value)}
                    placeholder="Enter lobby name..."
                    disabled={creating}
                  />
                </div>

                <div className="dashboard-checkbox-row">
                  <input
                    type="checkbox"
                    className="syndicate-checkbox"
                    id="private-check"
                    checked={isPrivate}
                    onChange={(e) => {
                      setIsPrivate(e.target.checked);
                      if (!e.target.checked) setLobbyPassword('');
                    }}
                    disabled={creating}
                  />
                  <label className="checkbox-label-md" htmlFor="private-check">
                    PRIVATE CHANNEL
                  </label>
                </div>

                {isPrivate && (
                  <div className="dashboard-field-group animate-fade-in">
                    <label className="field-label-sm label-error">ENCRYPTION KEY</label>
                    <div className="encryption-input-container">
                      <span className="encryption-input-prefix">KEY:</span>
                      <input
                        type="password"
                        className="encryption-input-field"
                        value={lobbyPassword}
                        onChange={(e) => setLobbyPassword(e.target.value)}
                        placeholder="****"
                        disabled={creating}
                        maxLength={20}
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="dashboard-submit-btn" disabled={creating}>
                  {creating ? <div className="spinner-syndicate"></div> : 'INITIALIZE CONNECTION'}
                </button>
              </form>
            </section>

            {/* Quick Join Card */}
            <section className="dashboard-quickjoin-card glass-panel">
              <h2 className="card-section-title title-tertiary">
                <span className="material-symbols-outlined icon-spacing">bolt</span>
                QUICK JOIN
              </h2>
              <form className="quickjoin-form" onSubmit={handleJoinByCode}>
                <input
                  type="text"
                  className="quickjoin-input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="SEC-CODE"
                  maxLength={6}
                  disabled={codeJoining}
                />
                <button type="submit" className="quickjoin-btn" disabled={codeJoining || !joinCode.trim()}>
                  {codeJoining ? <div className="spinner-syndicate"></div> : 'JOIN'}
                </button>
              </form>
            </section>
          </div>

          {/* Right Column: Active Operations */}
          <div className="dashboard-right-col">
            <div className="dashboard-list-header-row">
              <h2 className="card-section-title">ACTIVE OPERATIONS</h2>
              <span className="list-status-badge animate-pulse">● LIVE FEED</span>
            </div>

            {/* Lobby List */}
            {loadingLobbies ? (
              <div className="lobbies-scanning-state">
                <div className="spinner-syndicate"></div>
                <span>Scanning channels...</span>
              </div>
            ) : lobbies.length === 0 ? (
              <div className="lobbies-empty-state">
                <span className="empty-state-text">Awaiting further transmissions...</span>
              </div>
            ) : (
              <div className="lobbies-grid-list">
                {lobbies.map((lobby) => {
                  const isLocked = lobby.passwordProtected || lobby.isPasswordProtected;
                  return (
                    <div key={lobby.lobbyId} className="lobby-item-card glass-panel">
                      <div className="lobby-item-left">
                        {/* Decorative thumbnail frame */}
                        <div className="lobby-item-thumb">
                          <span className="material-symbols-outlined">public</span>
                        </div>
                        <div className="lobby-item-details">
                          <div className="lobby-item-title-row">
                            <h3 className="lobby-item-name">{lobby.name || 'Unnamed Lobby'}</h3>
                            {isLocked && (
                              <span className="material-symbols-outlined lock-icon-syndicate" title="Encrypted Room">lock</span>
                            )}
                          </div>
                          <div className="lobby-item-metadata-row">
                            <span className="lobby-meta-item">
                              <span className="material-symbols-outlined meta-icon-syndicate">person</span>
                              HOST: {lobby.hostName?.toUpperCase()}
                            </span>
                            <span className="lobby-meta-item">
                              <span className="material-symbols-outlined meta-icon-syndicate">groups</span>
                              {lobby.activePlayers} / {lobby.maxPlayers}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="lobby-item-right">
                        <button 
                          className="lobby-join-button"
                          onClick={() => handleLobbyCardClick(lobby)}
                          disabled={joiningId !== null || lobby.activePlayers >= lobby.maxPlayers || lobby.gameState !== 'LOBBY'}
                        >
                          {joiningId === lobby.lobbyId ? (
                            <div className="spinner-syndicate"></div>
                          ) : lobby.gameState !== 'LOBBY' ? (
                            'IN PROGRESS'
                          ) : lobby.activePlayers >= lobby.maxPlayers ? (
                            'FULL'
                          ) : (
                            'JOIN LOBBY'
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
      </main>

      {/* Password Prompt Modal */}
      {passwordModalOpen && (
        <div className="modal-overlay-syndicate">
          <div className="modal-content-syndicate glass-panel animate-fade-in">
            <h3 className="modal-title-syndicate">ENCRYPTION REQUIRED</h3>
            <p className="modal-desc-syndicate">Provide the security bypass code to enter this safehouse.</p>
            <form onSubmit={handleModalSubmit} className="modal-form-syndicate">
              <input
                type="password"
                className="modal-passcode-input"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="PASSCODE"
                autoFocus
                required
              />
              <div className="modal-buttons-syndicate">
                <button 
                  type="button" 
                  className="modal-cancel-btn" 
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setSelectedLobbyId(null);
                    setInputPassword('');
                  }}
                >
                  ABORT
                </button>
                <button type="submit" className="modal-confirm-btn">
                  AUTHORIZE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
