import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { lobbyService, playerService, gameService, chatService } from '../services/api';
import './LobbyView.css';

const getErrorMessage = (err, fallback) => {
  if (!err?.response?.data) return fallback;
  const data = err.response.data;
  if (typeof data === 'string') return data;
  if (data.message && typeof data.message === 'string') return data.message;
  if (data.error && typeof data.error === 'string') return data.error;
  return fallback;
};

const LobbyView = ({ lobbyId, onLeaveLobby, onGameStarted }) => {
  const { user, setUser } = useAuth();
  const [lobby, setLobby] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch Lobby details & state
  const fetchLobbyDetails = async () => {
    try {
      const res = await lobbyService.getLobbyDetails(lobbyId);
      const lobbyData = res.data;
      setLobby(lobbyData);
      
      // Fetch lobby players
      const playersRes = await gameService.getPlayers();
      setPlayers(playersRes.data || []);
      
      // If the game state changes to NIGHT, transition to the game screen
      if (lobbyData.gameState && lobbyData.gameState !== 'LOBBY') {
        onGameStarted();
      }
    } catch (err) {
      console.error("Error fetching lobby details/players", err);
      if (err.response?.status === 404 || err.response?.status === 500) {
        // Lobby was probably dismissed or player was removed
        setUser(prev => ({ ...prev, lobbyId: null, host: false }));
        onLeaveLobby();
      } else {
        setError("Failed to sync lobby room state.");
      }
    }
  };

  // Fetch Chat History
  const fetchChat = async () => {
    try {
      const res = await chatService.getChat();
      setMessages(res.data || []);
    } catch (err) {
      console.error("Error loading chat", err);
    }
  };

  // Sync polling on mount
  useEffect(() => {
    fetchLobbyDetails();
    fetchChat();

    const lobbyInterval = setInterval(fetchLobbyDetails, 2000);
    const chatInterval = setInterval(fetchChat, 2000);

    return () => {
      clearInterval(lobbyInterval);
      clearInterval(chatInterval);
    };
  }, [lobbyId]);

  // Scroll to bottom when messages list updates
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
      fetchChat();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  };

  const handleLeaveLobby = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await playerService.leaveLobby();
      setUser({ ...user, lobbyId: null, host: false });
      onLeaveLobby();
    } catch (err) {
      console.error(err);
      setError('Failed to leave lobby.');
    } finally {
      setLeaving(false);
    }
  };

  const handleDismissLobby = async () => {
    if (leaving) return;
    setLeaving(true);
    setError('');
    try {
      await lobbyService.dismissLobby();
      setUser({ ...user, lobbyId: null, host: false });
      onLeaveLobby();
    } catch (err) {
      console.error(err);
      setError('Failed to dismiss lobby.');
    } finally {
      setLeaving(false);
    }
  };

  const handleStartGame = async () => {
    if (starting) return;
    setStarting(true);
    setError('');
    try {
      await gameService.startGame();
      onGameStarted();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Cannot start game. Need at least 3 players.'));
    } finally {
      setStarting(false);
    }
  };

  if (!lobby) {
    return (
      <div className="lobby-loading-container">
        <div className="spinner-syndicate"></div>
        <span>Syncing with safehouse...</span>
      </div>
    );
  }

  // Check if current user is host in the current lobby details
  const isHost = lobby.hostName === user?.name;

  return (
    <div className="lobby-view-wrapper animate-fade-in">
      {/* TopNavBar */}
      <header className="lobby-navbar">
        <div className="navbar-left-group">
          <span className="navbar-brand-title">LOBBY: <span className="lobby-title-name">{lobby.name?.toUpperCase()}</span></span>
        </div>
        <div className="navbar-right-group">
          <span className="lobby-code-badge">ROOM CODE: {lobbyId}</span>
          <button className="lobby-leave-btn" onClick={handleLeaveLobby} disabled={leaving}>
            {leaving ? <div className="spinner-syndicate"></div> : 'LEAVE OPERATION'}
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="lobby-main-grid">
        {/* Left Side: Players List */}
        <section className="lobby-panel players-panel glass-panel">
          <div className="lobby-panel-header">
            <h2 className="lobby-panel-title">
              <span className="material-symbols-outlined icon-spacing">groups</span>
              AGENTS PRESENT
            </h2>
            <span className="lobby-player-ratio">{lobby.activePlayers} / {lobby.maxPlayers}</span>
          </div>
          
          <div className="lobby-players-list">
            <div className="players-scroller">
              {players && players.length > 0 ? (
                players.map((p) => (
                  <div key={p.id} className="player-item-row glass-card">
                    <div className="player-row-info">
                      <span className="material-symbols-outlined player-avatar-icon">person</span>
                      <span className="player-name-text">{p.name}</span>
                    </div>
                    {p.host && (
                      <span className="player-host-tag">
                        <span className="material-symbols-outlined host-icon">stars</span>
                        HOST
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="player-item-row glass-card">
                  <div className="player-row-info">
                    <span className="material-symbols-outlined player-avatar-icon">person</span>
                    <span className="player-name-text">{lobby.hostName}</span>
                  </div>
                  <span className="player-host-tag">
                    <span className="material-symbols-outlined host-icon">stars</span>
                    HOST
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="lobby-host-controls">
            {error && (
              <div className="floating-bubble-error animate-slide-in">
                <span className="material-symbols-outlined bubble-error-icon">warning</span>
                <span className="bubble-error-text">{error}</span>
                <button className="bubble-error-close-btn" onClick={() => setError('')}>&times;</button>
              </div>
            )}
            
            {isHost ? (
              <div className="host-actions-group">
                <button 
                  className="lobby-start-btn" 
                  onClick={handleStartGame}
                  disabled={starting || lobby.activePlayers < 3}
                >
                  {starting ? <div className="spinner-syndicate"></div> : 'INITIATE OPERATION (START)'}
                </button>
                <button 
                  className="lobby-dismiss-btn" 
                  onClick={handleDismissLobby}
                  disabled={leaving}
                >
                  {leaving ? <div className="spinner-syndicate"></div> : 'DISMISS LOBBY'}
                </button>
              </div>
            ) : (
              <div className="waiting-host-msg-block">
                <span className="spinner-syndicate"></span>
                <span>Awaiting transmission from Host (<strong>{lobby.hostName}</strong>)...</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Chat Box */}
        <section className="lobby-panel chat-panel glass-panel">
          <div className="lobby-panel-header">
            <h2 className="lobby-panel-title">
              <span className="material-symbols-outlined icon-spacing">forum</span>
              OPERATION BRIEFING FEED
            </h2>
          </div>
          
          <div className="lobby-chat-messages">
            {messages.length === 0 ? (
              <div className="lobby-chat-empty">
                <span>Briefing channel active. Start typing below to discuss.</span>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.senderName === user?.name;
                return (
                  <div key={index} className={`lobby-message-row ${isMe ? 'message-me' : 'message-other'}`}>
                    <div className="lobby-message-bubble">
                      <span className="message-sender">{msg.senderName}</span>
                      <p className="message-content">{msg.content}</p>
                      <span className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="lobby-chat-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="lobby-chat-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message to lobby..."
              disabled={sending}
              maxLength={200}
            />
            <button type="submit" className="lobby-chat-send-btn" disabled={sending || !newMessage.trim()}>
              {sending ? <div className="spinner-syndicate"></div> : 'SEND'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default LobbyView;
