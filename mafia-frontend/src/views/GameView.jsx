import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { lobbyService, gameService, chatService, dayService, nightService } from '../services/api';
import './GameView.css';

const getErrorMessage = (err, fallback) => {
  if (!err?.response?.data) return fallback;
  const data = err.response.data;
  if (typeof data === 'string') return data;
  if (data.message && typeof data.message === 'string') return data.message;
  if (data.error && typeof data.error === 'string') return data.error;
  return fallback;
};

const formatTime = (seconds) => {
  if (seconds === undefined || seconds === null) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const GameView = ({ lobbyId, onGameReset }) => {
  const { user, setUser } = useAuth();

  const [lobby, setLobby] = useState(null);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const [error, setError] = useState('');
  const [localTimeLeft, setLocalTimeLeft] = useState(0);

  // Synchronize localTimeLeft with lobby.timeLeft when it changes
  useEffect(() => {
    if (lobby && lobby.timeLeft !== undefined) {
      setLocalTimeLeft(lobby.timeLeft);
    }
  }, [lobby?.timeLeft, lobby?.gameState]);

  // Tick down localTimeLeft every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const [actionMessage, setActionMessage] = useState('');
  const [dayResult, setDayResult] = useState('');

  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Find current player in players list to get fresh role and status
  const self = players.find(p => p.name === user?.name) || { role: null, alive: true, host: false };

  // Fetch all game data
  const syncGameState = async () => {
    try {
      // 1. Fetch Lobby Details
      const lobbyRes = await lobbyService.getLobbyDetails(lobbyId);
      const lobbyData = lobbyRes.data;
      setLobby(lobbyData);

      // If game resets back to LOBBY, trigger return to lobby view in parent
      if (lobbyData.gameState === 'LOBBY') {
        onGameReset();
        return;
      }

      // 2. Fetch Players List
      const playersRes = await gameService.getPlayers();
      setPlayers(playersRes.data || []);

      // 3. Fetch Chat Messages
      const chatRes = await chatService.getChat();
      setMessages(chatRes.data || []);
    } catch (err) {
      console.error("Error synchronizing game state", err);
      if (err.response?.status === 404 || err.response?.status === 500) {
        setUser(prev => ({ ...prev, lobbyId: null, host: false }));
        onGameReset();
      }
    }
  };

  // Poll state
  useEffect(() => {
    syncGameState();
    const interval = setInterval(syncGameState, 2000);
    return () => clearInterval(interval);
  }, [lobbyId]);

  // Handle phase-based text updates
  useEffect(() => {
    if (!lobby) return;

    const fetchPhaseInfo = async () => {
      if (lobby.gameState === 'DAY') {
        try {
          const res = await dayService.getDayStatus();
          setDayResult(res.data);
        } catch (err) {
          console.error("Failed to load day results", err);
        }
      } else {
        setDayResult('');
      }
      // Reset action input when phase changes
      setActionSubmitted(false);
      setSelectedTargetId(null);
      setActionMessage('');
      setError('');
    };

    fetchPhaseInfo();
  }, [lobby?.gameState]);

  // Scroll chat on updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError('');
    try {
      await chatService.sendMessage(newMessage.trim());
      setNewMessage('');
      // Quick fetch chat
      const chatRes = await chatService.getChat();
      setMessages(chatRes.data || []);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Message blocked by game rules.'));
    } finally {
      setSending(false);
    }
  };

  const handleSubmitNightAction = async (targetId, targetName) => {
    setError('');
    setActionMessage('');
    try {
      const res = await nightService.submitNightAction(targetId);
      setActionSubmitted(true);
      setSelectedTargetId(targetId);
      setActionMessage(`Night action submitted on: ${targetName}`);
      syncGameState();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to submit night action.'));
    }
  };

  const handleSubmitVote = async (targetId, targetName) => {
    setError('');
    setActionMessage('');
    try {
      const res = await dayService.submitVote(targetId);
      setActionSubmitted(true);
      setSelectedTargetId(targetId);
      setActionMessage(`Vote cast for: ${targetName}`);
      syncGameState();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to record vote.'));
    }
  };

  const handleResolveDay = async () => {
    setResolving(true);
    setError('');
    try {
      const res = await dayService.resolveDay();
      setDayResult(res.data);
      syncGameState();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to resolve day phase.'));
    } finally {
      setResolving(false);
    }
  };

  const handleReturnToLobby = async () => {
    setError('');
    try {
      await gameService.returnToLobby();
      onGameReset();
    } catch (err) {
      console.error(err);
      setError('Only host can return players to lobby.');
    }
  };

  const handleDismissLobby = async () => {
    setError('');
    try {
      await lobbyService.dismissLobby();
      setUser({ ...user, lobbyId: null, host: false });
      onGameReset();
    } catch (err) {
      console.error(err);
      setError('Failed to dismiss lobby.');
    }
  };

  if (!lobby) {
    return (
      <div className="game-loading-container">
        <div className="spinner-syndicate"></div>
        <span>Syncing game room console...</span>
      </div>
    );
  }

  const phase = lobby.gameState; // NIGHT, DAY, FINISHED
  const isMeAlive = self.alive;
  const isMeHost = self.host || lobby.hostName === user?.name;

  // Filter list of players for action selections
  const otherAlivePlayers = players.filter(p => p.alive && p.name !== user?.name);
  const allAlivePlayers = players.filter(p => p.alive);

  // Layout generators based on Role & Phase
  const renderLeftPanelContent = () => {
    if (phase === 'FINISHED') {
      return (
        <div className="game-over-block">
          <div className="winner-trophy">🏆</div>
          <h2 className="game-over-title">Operation Concluded</h2>
          <div className="game-over-banner glass-card">
            <p className="winner-text">{lobby.gameResult || dayResult || 'The game is over!'}</p>
          </div>

          {isMeHost ? (
            <div className="host-finished-actions">
              <button className="lobby-start-btn return-lobby-btn-syndicate" onClick={handleReturnToLobby}>
                Return All Players to Lobby
              </button>
              <button className="lobby-dismiss-btn dismiss-lobby-btn-syndicate" onClick={handleDismissLobby}>
                Dismiss Lobby
              </button>
            </div>
          ) : (
            <p className="waiting-host-lobby">Waiting for the host to return everyone to the lobby...</p>
          )}
        </div>
      );
    }

    if (!isMeAlive) {
      // Doctor spectates their own console (it handles dead state internally with flatline + dimmed cards)
      if (phase === 'NIGHT' && self.role === 'DOCTOR') {
        // fall through to the NIGHT / DOCTOR console below
      } else {
        return (
          <div className="ghost-spectator-block">
            <div className="ghost-icon-large">👻</div>
            <h3 className="ghost-spectator-title">SPECTATOR MODE</h3>
            <p className="ghost-spectator-desc">
              You have been eliminated, but your ghost remains. You can spectate all actions and chat privately with other ghosts.
            </p>
          </div>
        );
      }
    }


    // DAY PHASE (VOTING CONSOLE)
    if (phase === 'DAY') {
      return (
        <div className="day-voting-console">
          {/* Status Bar */}
          <div className="day-voting-status-bar">
            <div className="day-status-indicator">
              <span className="day-pulsing-dot animate-pulse"></span>
              <h2 className="phase-title-text">PHASE: DAY</h2>
            </div>
            <div className="day-timer-block">
              <div className="timer-info-col">
                <span className="timer-label">TIME REMAINING</span>
                <span className="timer-digits">04:32</span>
              </div>
              <span className="material-symbols-outlined timer-icon">schedule</span>
            </div>
          </div>

          <div className="voting-progress-desc">
            <span className="material-symbols-outlined icon-spacing">how_to_vote</span>
            VOTING IN PROGRESS
          </div>

          {/* Day Report Announcement */}
          {dayResult && (
            <div className="phase-announcement-card glass-card">
              <h4 className="announcement-title">📢 Night Report</h4>
              <p className="announcement-text">{dayResult}</p>
            </div>
          )}

          {/* Player list cards */}
          <div className="voting-players-grid">
            {players.map((p, index) => {
              const isSelfPlayer = p.name === user?.name;
              const hasVotedForThis = actionSubmitted && selectedTargetId === p.id;

              return (
                <div key={p.id} className={`player-voting-card glass-panel ${!p.alive ? 'player-card-dead' : ''}`}>
                  <div className="card-ref-badge">REF: #72{index}-X</div>
                  <div className="player-card-body">
                    <div className="player-card-avatar-box">
                      <img
                        src={index % 2 === 0 ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBm_-qxbW48ag2QKHcfNwQH1_ImZEr0K_89XayRfsB52OL-ySBJObQodRS5BkTgpiGKsHzY96qomyqlA3iqNdCBqH72QySGEGHwnqDaZBfeYNWMjapgqkHARhu0EeNEGpQNcjX7v0M1Xgm2Cy2F6U4HX7UhWTJ1f9misEUC0pINXnjMw3RHDHI4nSlFNu-m-dwkoR64x745HpoAXHZYuk0TCqtVwEhV4QIMkkQpz4GVQdUCUZk9e6MfY1Z1XCj7IsQcKyPkKCl0sp05" : "https://lh3.googleusercontent.com/aida-public/AB6AXuA-hgJEZ8j8K2CoTkBuTgAsJ3Vs2glhBRF_4K41JWy51j7qAZXZk2KIREXMnbCYUx_D8GM6fhJwRbu_UcaVNiBC_7eoqSAtbqZL8k8Zcaej68f_3I0OR48_u5FvMUIa4pi9H9XRDb6tLgGHoohoROjTU2piA0HSmD63q0S6O1lPpBetY_3J6Fv7cX84Wt_tASw364RaCMkhgDmO-zFQlKhpKMBjP9gyZtvfqX3HwA9hevSvfEeeHouZ1X_BAiGbVQ-_s3DkIiftDzOf"}
                        className="player-avatar-image"
                        alt="Agent portrait"
                      />
                      <div className="player-avatar-badge">{p.alive ? 'SURVIVOR' : 'ELIMINATED'}</div>
                    </div>

                    <div className="player-card-info-col">
                      <h3 className="player-card-name">{p.name}</h3>
                      <div className="player-card-stats-row">
                        <span className="player-card-stat border-stat">VOTES: {lobby.voteTally?.[p.id] || 0}</span>
                      </div>

                      {p.alive && !isSelfPlayer && (
                        <button
                          className={`player-vote-action-btn ${hasVotedForThis ? 'voted-active' : ''}`}
                          disabled={actionSubmitted}
                          onClick={() => handleSubmitVote(p.id, p.name)}
                        >
                          {hasVotedForThis ? 'VOTED' : 'CAST VOTE'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Vote Tally */}
          {lobby.voteTally && Object.keys(lobby.voteTally).length > 0 && (
            <div className="live-vote-tally-block">
              <h4 className="tally-title-label">
                <span className="material-symbols-outlined icon-spacing">analytics</span>
                LIVE VOTE TALLY
              </h4>
              <div className="tally-progress-bars-grid">
                {Object.entries(lobby.voteTally).map(([targetId, votes]) => {
                  const targetPlayer = players.find(p => p.id.toString() === targetId);
                  const playerName = targetPlayer ? targetPlayer.name : `Agent #${targetId}`;
                  const percentage = Math.min(100, (votes / players.length) * 100);
                  return (
                    <div key={targetId} className="tally-progress-row">
                      <div className="tally-progress-labels">
                        <span className="tally-target-name">{playerName}</span>
                        <span className="tally-votes-value">{votes} {votes === 1 ? 'VOTE' : 'VOTES'}</span>
                      </div>
                      <div className="tally-progress-track">
                        <div className="tally-progress-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Host Force Actions */}
          {isMeHost && (
            <div className="host-force-block glass-panel">
              <p className="host-force-desc">AFK players? Force day resolution manually:</p>
              <button className="host-force-btn" onClick={handleResolveDay} disabled={resolving}>
                {resolving ? <div className="spinner-syndicate"></div> : 'FORCE PHASE RESOLUTION'}
              </button>
            </div>
          )}
        </div>
      );
    }

    // NIGHT PHASE
    if (phase === 'NIGHT') {
      // MAFIA CONSOLE
      if (self.role === 'MAFIA') {
        return (
          <div className="mafia-night-console">
            {/* Header Block */}
            <header className="mafia-header-block">
              <div className="mafia-specialization-badge">
                <span className="material-symbols-outlined mafia-cross-icon">skull</span>
                <span className="mafia-spec-text">CRIMSON COMMAND: MAFIA</span>
              </div>
              <div className="mafia-header-flex">
                <h2 className="mafia-title-main">SHADOW ACQUISITION</h2>
                <div className="mafia-targets-count-badge">
                  {otherAlivePlayers.length} ACTIVE TARGETS
                </div>
              </div>
              <p className="mafia-subtitle-desc">
                The Syndicate's orders are absolute. Select a target for termination. Eliminate threats to secure command of the city.
              </p>
            </header>

            {/* Target Acquisition Pulse Bar */}
            <div className="mafia-acquisition-pulse-bar">
              <span className="material-symbols-outlined target-reticle-icon">target</span>
              <span>TARGET ACQUISITION CONSOLE</span>
            </div>

            {/* Target grid list */}
            <div className="mafia-targets-grid">
              {otherAlivePlayers.map((p, index) => {
                const isMarked = selectedTargetId === p.id;
                const isDulled = actionSubmitted && !isMarked;
                return (
                  <div key={p.id} className={`mafia-target-card glass-panel ${isMarked ? 'target-marked-active' : ''} ${isDulled ? 'card-dulled' : ''}`}>
                    {isMarked && (
                      <div className="marked-corner-icon">
                        <span className="material-symbols-outlined">target</span>
                      </div>
                    )}
                    <div className="mafia-card-layout">
                      <div className="mafia-card-left">
                        <div className="mafia-avatar-frame">
                          <span className="material-symbols-outlined mafia-avatar-icon">person</span>
                        </div>
                        <div className="mafia-target-info-col">
                          <h3 className="mafia-target-name">{p.name}</h3>
                          <span className="mafia-target-desc">SUSPECTED: CIVILIAN</span>
                          {lobby.voteTally?.[p.id] > 0 && (
                            <span className="mafia-target-votes-badge">
                              {lobby.voteTally[p.id]} {lobby.voteTally[p.id] === 1 ? 'VOTE' : 'VOTES'}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="mafia-target-index-id">#00{index + 1}</span>
                    </div>

                    <div className="mafia-action-container">
                      {isMarked ? (
                        <div className="mafia-marked-block">MARKED</div>
                      ) : (
                        <button
                          className="mafia-eliminate-btn"
                          disabled={actionSubmitted}
                          onClick={() => handleSubmitNightAction(p.id, p.name)}
                        >
                          ELIMINATE
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Syndicate Target Tally */}
            {lobby.voteTally && Object.keys(lobby.voteTally).length > 0 && (
              <div className="mafia-tally-block live-vote-tally-block">
                <h4 className="tally-title-label">
                  <span className="material-symbols-outlined icon-spacing">analytics</span>
                  LIVE SYNDICATE TARGET TALLY
                </h4>
                <div className="tally-progress-bars-grid">
                  {Object.entries(lobby.voteTally).map(([targetId, votes]) => {
                    const targetPlayer = players.find(pl => pl.id.toString() === targetId);
                    const playerName = targetPlayer ? targetPlayer.name : `Target #${targetId}`;
                    const mafiaPlayers = players.filter(pl => pl.alive && pl.role === 'MAFIA');
                    const percentage = Math.min(100, (votes / Math.max(1, mafiaPlayers.length)) * 100);
                    return (
                      <div key={targetId} className="tally-progress-row">
                        <div className="tally-progress-labels">
                          <span className="tally-target-name">{playerName}</span>
                          <span className="tally-votes-value">{votes} {votes === 1 ? 'VOTE' : 'VOTES'}</span>
                        </div>
                        <div className="tally-progress-track">
                          <div
                            className="tally-progress-fill mafia-bar-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Logistics weaponry status */}
            <div className="mafia-logistics-full-wrapper">
              <div className="mafia-logistics-card glass-panel">
                <h4 className="mafia-card-title-sm text-mafia-red">LOGISTICS: WEAPONRY & INTEL</h4>
                <div className="stash-logistics-list">
                  <div className="stash-row">
                    <div className="stash-labels-row">
                      <span className="stash-item-name">SILENT SNIPER ROUNDS</span>
                      <span className="stash-item-val">03/05</span>
                    </div>
                    <div className="stash-progress-track">
                      <div className="stash-progress-fill mafia-fill" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <div className="stash-row">
                    <div className="stash-labels-row">
                      <span className="stash-item-name">C4 CHARGES</span>
                      <span className="stash-item-val">01/02</span>
                    </div>
                    <div className="stash-progress-track">
                      <div className="stash-progress-fill mafia-fill" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                  <div className="stash-row">
                    <div className="stash-labels-row">
                      <span className="stash-item-name">ENCRYPTED COMS CHANNELS</span>
                      <span className="stash-item-val">08/10</span>
                    </div>
                    <div className="stash-progress-track">
                      <div className="stash-progress-fill mafia-fill" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // DOCTOR CONSOLE
      if (self.role === 'DOCTOR') {
        const isDocDead = !isMeAlive;
        return (
          <div className={`doctor-night-console ${isDocDead ? 'doctor-console-dead' : ''}`}>
            {/* Dead spectator banner */}
            {isDocDead && (
              <div className="doctor-dead-banner">
                <span className="material-symbols-outlined">monitor_heart</span>
                FLATLINE — You have been eliminated. Spectating only.
              </div>
            )}

            {/* Header Block */}
            <header className="doctor-header-block">
              <div className="doctor-specialization-badge">
                <span className="material-symbols-outlined doctor-cross-icon">emergency</span>
                <span className="doctor-spec-text">Active Specialization: Doctor</span>
              </div>
              <h2 className="doctor-title-main">STERILE SANCTUARY</h2>
              <p className="doctor-subtitle-desc">
                {isDocDead
                  ? 'Your vitals have ceased. The oath dies with the physician. All protect protocols are now offline.'
                  : 'The city sleeps under a heavy fog. Your oath remains: identify the vulnerable, protect the asset, and ensure the Family survives the night.'}
              </p>
            </header>

            <div className="doctor-full-width-container">
              <h3 className="doctor-right-column-title">VULNERABLE ASSETS</h3>
              <div className={`doctor-assets-grid ${isDocDead ? 'assets-grid-dead' : ''}`}>
                {allAlivePlayers.map((p, index) => {
                  const isProtected = selectedTargetId === p.id;
                  const isDulled = isDocDead || (actionSubmitted && !isProtected);
                  return (
                    <div key={p.id} className={`doctor-asset-card glass-panel ${isDulled ? 'card-dulled' : ''}`}>
                      <div className="asset-profile-row">
                        <div className="asset-avatar-box">
                          <span className="material-symbols-outlined asset-avatar-icon">person</span>
                        </div>
                        <div className="asset-profile-details">
                          <p className="asset-profile-name">{p.name}</p>
                          <p className="asset-profile-threat">THREAT LEVEL: {index % 2 === 0 ? 'CRITICAL' : 'MODERATE'}</p>
                        </div>
                      </div>

                      {isDocDead ? (
                        <div className="doctor-offline-state-block">OFFLINE</div>
                      ) : isProtected ? (
                        <div className="doctor-protected-state-block">SECURED</div>
                      ) : (
                        <button
                          className="doctor-protect-btn"
                          disabled={actionSubmitted || isDocDead}
                          onClick={() => handleSubmitNightAction(p.id, p.name)}
                        >
                          PROTECT
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Logistics stash status */}
            <div className="doctor-logistics-full-wrapper">
              <div className="doctor-logistics-card glass-panel">
                <h4 className="doctor-card-title-sm text-clinical">LOGISTICS: MEDICAL STASH</h4>
                <div className="stash-logistics-list">
                  <div className="stash-row">
                    <div className="stash-labels-row">
                      <span className="stash-item-name">MORPHINE UNITS</span>
                      <span className="stash-item-val">04/10</span>
                    </div>
                    <div className="stash-progress-track">
                      <div className="stash-progress-fill" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  <div className="stash-row">
                    <div className="stash-labels-row">
                      <span className="stash-item-name">SURGICAL KITS</span>
                      <span className="stash-item-val">02/05</span>
                    </div>
                    <div className="stash-progress-track">
                      <div className="stash-progress-fill" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  <div className="stash-row">
                    <div className="stash-labels-row">
                      <span className="stash-item-name">ADRENALINE</span>
                      <span className="stash-item-val">08/10</span>
                    </div>
                    <div className="stash-progress-track">
                      <div className="stash-progress-fill" style={{ width: '80%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

      // CITIZEN CONSOLE
      if (self.role === 'CITIZEN') {
        return (
          <div className="citizen-night-console">
            {/* Header Block */}
            <header className="citizen-header-block">
              <div className="citizen-specialization-badge">
                <span className="material-symbols-outlined citizen-sleep-icon">bedtime</span>
                <span className="citizen-spec-text">REST PROTOCOL: CITIZEN</span>
              </div>
              <h2 className="citizen-title-main">THE SILENT NIGHT</h2>
              <p className="citizen-subtitle-desc">
                The streets are under lockdown. Lock your doors, pull the curtains, and lay low. Do not draw attention to yourself until dawn.
              </p>
            </header>

            {/* Sleeping Status Center Box */}
            <div className="citizen-status-sleeping-card glass-panel">
              <span className="sleeping-card-feed-label">M.O.R.P.H.E.U.S. SLEEP PROTOCOL</span>
              <div className="sleeping-card-center-col">
                <div className="sleeping-clock-container">
                  <span className="material-symbols-outlined sleeping-clock-icon">alarm</span>
                  <div className="sleeping-countdown-timer">
                    <span className="countdown-label">TIME UNTIL DAWN</span>
                    <span className="countdown-digits">{formatTime(localTimeLeft)}</span>
                  </div>
                </div>
                <div className="sleeping-label-block">
                  <h1 className="sleeping-main-title">REST PROTOCOL ACTIVE</h1>
                  <p className="sleeping-subtitle-status">OPERATIVE STATUS: UNCONSCIOUS</p>
                </div>
                <div className="sleeping-progress-bar-stepper">
                  <div className="stepper-fill-indicator"></div>
                </div>
              </div>

              {/* sleeping metrics */}
              <div className="sleeping-stats-grid">
                <div className="sleeping-stat-box">
                  <span className="stat-label-title">HEART RATE</span>
                  <span className="stat-metric-val">48 BPM</span>
                </div>
                <div className="sleeping-stat-box">
                  <span className="stat-label-title">BRAIN WAVES</span>
                  <span className="stat-metric-val">DELTA (2.4 Hz)</span>
                </div>
                <div className="sleeping-stat-box">
                  <span className="stat-label-title">SLEEP PHASE</span>
                  <span className="stat-metric-val">DEEP REM</span>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
    return (
      <div className="game-loading-container">
        <div className="spinner-syndicate"></div>
        <span>Syncing role console...</span>
      </div>
    );
  };

  const isMafiaNight = phase === 'NIGHT' && self.role === 'MAFIA';

  return (
    <div className={`game-room-wrapper phase-${phase.toLowerCase()} role-${(self.role || 'pending').toLowerCase()} ${!isMeAlive ? 'ghost-mode' : ''} animate-fade-in`}>

      {/* Dynamic Background decor for Doctor night — show even when dead (flatline) */}
      {phase === 'NIGHT' && self.role === 'DOCTOR' && (
        <div className="doctor-dynamic-ekg-bg">
          <svg className="doctor-ekg-svg" viewBox="0 0 1000 100">
            {isMeAlive ? (
              <path className="doctor-ekg-path" d="M0,50 L100,50 L110,40 L120,60 L130,10 L140,90 L150,50 L250,50 L260,50 L270,40 L280,60 L290,10 L300,90 L310,50 L410,50 L510,50 L520,40 L530,60 L540,10 L550,90 L560,50 L660,50 L760,50 L770,40 L780,60 L790,10 L800,90 L810,50 L910,50 L1000,50" fill="none" strokeWidth="2"></path>
            ) : (
              <path className="doctor-ekg-path-flatline" d="M0,50 L1000,50" fill="none" strokeWidth="2"></path>
            )}
          </svg>
        </div>
      )}

      {/* Mafia Night: CSS rain + single cinematic bullet */}
      {phase === 'NIGHT' && self.role === 'MAFIA' && isMeAlive && (() => {
        // pre-computed rain drop data: [leftPct, heightPx, durationS, delayS, opacity]
        const drops = [
          [1,  90, 1.65, 0.00, 0.20], [4,  75, 1.44, 0.36, 0.15], [7, 110, 1.86, 0.90, 0.22],
          [10, 80, 1.50, 0.15, 0.18], [13, 95, 1.74, 1.32, 0.14], [16, 70, 1.35, 0.60, 0.20],
          [19,105, 1.92, 0.24, 0.17], [22, 85, 1.56, 1.08, 0.22], [25, 90, 1.68, 0.54, 0.13],
          [28, 75, 1.41, 1.56, 0.19], [31,100, 1.80, 0.06, 0.21], [34, 80, 1.53, 0.84, 0.16],
          [37, 95, 1.77, 1.20, 0.20], [40, 70, 1.32, 0.42, 0.14], [43,110, 1.95, 0.18, 0.23],
          [46, 85, 1.59, 1.44, 0.17], [49, 90, 1.71, 0.66, 0.19], [52, 75, 1.38, 1.02, 0.15],
          [55,100, 1.83, 0.30, 0.22], [58, 80, 1.50, 1.68, 0.18], [61, 95, 1.74, 0.72, 0.13],
          [64, 70, 1.32, 1.26, 0.21], [67,105, 1.89, 0.48, 0.20], [70, 85, 1.56, 0.12, 0.16],
          [73, 90, 1.68, 1.14, 0.22], [76, 75, 1.41, 0.78, 0.14], [79,100, 1.80, 1.50, 0.19],
          [82, 80, 1.53, 0.24, 0.20], [85, 95, 1.77, 0.96, 0.17], [88, 70, 1.35, 1.38, 0.15],
          [91,110, 1.98, 0.54, 0.23], [94, 85, 1.59, 0.06, 0.18], [97, 90, 1.71, 1.20, 0.21],
        ];
        return (
          <div className="mafia-rain-scene">
            {drops.map(([left, h, dur, delay, op], i) => (
              <div
                key={i}
                className="rain-drop"
                style={{
                  left: `${left}%`,
                  height: `${h}px`,
                  animationDuration: `${dur}s`,
                  animationDelay: `${delay}s`,
                  opacity: op,
                }}
              />
            ))}
            {/* 4 bullet lanes — fire one at a time, each at a different height */}
            <div className="cinematic-bullet bullet-lane-1" />
            <div className="cinematic-bullet bullet-lane-2" />
            <div className="cinematic-bullet bullet-lane-3" />
            <div className="cinematic-bullet bullet-lane-4" />
          </div>
        );
      })()}




      {/* Sleeping breathing vignette for Citizen night */}
      {phase === 'NIGHT' && self.role === 'CITIZEN' && isMeAlive && (
        <div className="sleeping-breathing-vignette"></div>
      )}

      {/* Dynamic Background decor for Citizen night (Sleep waves) */}
      {phase === 'NIGHT' && self.role === 'CITIZEN' && isMeAlive && (
        <div className="citizen-dynamic-sleep-bg">
          <svg className="citizen-sleep-svg" viewBox="0 0 1000 100">
            <path className="citizen-sleep-path" d="M0,50 Q62.5,25 125,50 T250,50 T375,50 T500,50 T625,50 T750,50 T875,50 T1000,50" fill="none" strokeWidth="2"></path>
          </svg>
        </div>
      )}

      {/* Top Navbar */}
      <header className="game-navbar">
        <div className="navbar-left-group">
          <span className="navbar-brand-title">THE SYNDICATE</span>
          {phase !== 'FINISHED' && (
            <div className="navbar-phase-badges">
              <span className={`navbar-phase-value-badge ${isMafiaNight ? 'mafia-blood-pulse' : ''}`}>
                PHASE: {phase}
              </span>
              <span className="navbar-phase-time-badge">
                <span className="material-symbols-outlined timer-icon-navbar">schedule</span>
                {formatTime(localTimeLeft)}
              </span>
            </div>
          )}
        </div>
        <div className="navbar-right-group">
          {!isMeAlive && <span className="navbar-spectator-tag">DEAD (GHOST SPECTATOR) 👻</span>}
          <button className="game-leave-btn" onClick={handleDismissLobby}>LEAVE</button>
        </div>
      </header>

      {/* Main Grid: Left console, Right chat */}
      <main className="game-room-grid-layout">
        {/* Left Side: Specialized Gameplay Consoles */}
        <section className="gameplay-interactive-area">
          {error && (
            <div className="floating-bubble-error animate-slide-in">
              <span className="material-symbols-outlined bubble-error-icon">warning</span>
              <span className="bubble-error-text">{error}</span>
              <button className="bubble-error-close-btn" onClick={() => setError('')}>&times;</button>
            </div>
          )}
          {actionMessage && <div className="gameplay-alert-success">{actionMessage}</div>}

          {renderLeftPanelContent()}
        </section>

        {/* Right Side: Chat Panel */}
        <section className="gameplay-chat-sidebar glass-panel">
          <div className="chat-panel-header-row">
            <h3 className="chat-panel-title-text">
              <span className="material-symbols-outlined icon-spacing">
                {isMafiaNight ? 'encrypted' : 'forum'}
              </span>
              {isMafiaNight ? 'CRIMSON SHADOW CHANNEL' : (!isMeAlive ? 'GHOST BRIEFING CHANNEL' : 'COMMS FEED')}
            </h3>
            {isMafiaNight && <span className="chat-encrypted-online-badge animate-pulse">ACTIVE</span>}
          </div>

          <div className="chat-messages-scroll-area">
            {messages.length === 0 ? (
              <div className="chat-feed-empty-state">
                <span>No transmissions received on this frequency.</span>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.senderName === user?.name;
                const isMsgGhost = msg.ghostMessage;
                const isMsgMafia = msg.mafiaMessage;

                return (
                  <div key={index} className={`chat-bubble-row ${isMe ? 'msg-align-me' : 'msg-align-other'}`}>
                    <div className={`chat-bubble-body ${isMsgGhost ? 'bubble-style-ghost' : ''} ${isMsgMafia ? 'bubble-style-mafia' : ''}`}>
                      <span className="chat-bubble-sender-name">
                        {msg.senderName}
                        {isMsgGhost && ' [GHOST]'}
                        {isMsgMafia && ' [MAFIA]'}
                      </span>
                      <p className="chat-bubble-content-text">{msg.content}</p>
                      <span className="chat-bubble-timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input form (blocked for non-mafia at night) */}
          {phase === 'NIGHT' && isMeAlive && !isMafiaNight ? (
            <div className="chat-input-blocked-placeholder">
              <span>💤 Systems in passive mode. Communications offline until morning.</span>
            </div>
          ) : (
            <form className="chat-input-form-syndicate" onSubmit={handleSendMessage}>
              <div className="chat-input-relative-container">
                <span className="chat-input-placeholder-label">INPUT COMMAND</span>
                <input
                  type="text"
                  className="chat-console-input-field"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={!isMeAlive ? "TRANSMIT GHOST COORDINATES..." : "TRANSMIT COORDINATES..."}
                  disabled={sending}
                  maxLength={200}
                />
                <button type="submit" className="chat-console-send-btn" disabled={sending || !newMessage.trim()}>
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

export default GameView;
