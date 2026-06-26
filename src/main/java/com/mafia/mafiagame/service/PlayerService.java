package com.mafia.mafiagame.service;

import com.mafia.mafiagame.game.GameSession;
import com.mafia.mafiagame.game.LobbyManager;
import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.repository.PlayerRepository;
import com.mafia.mafiagame.user.User;
import com.mafia.mafiagame.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PlayerService {

    private final PlayerRepository playerRepo;
    private final UserRepository userRepo;
    private final LobbyManager lobbyManager;

    public PlayerService(PlayerRepository playerRepo,
                         UserRepository userRepo,
                         LobbyManager lobbyManager) {
        this.playerRepo = playerRepo;
        this.userRepo = userRepo;
        this.lobbyManager = lobbyManager;
    }

    public GameSession getCurrentSession() {
        Player player = getCurrentPlayer();
        if (player.getLobbyId() == null) {
            throw new RuntimeException("Player is not in a lobby");
        }
        GameSession session = lobbyManager.getSession(player.getLobbyId());
        if (session == null) {
            throw new RuntimeException("Lobby session not found");
        }
        return session;
    }

    public Player joinGame(String lobbyId, String joinPassword) {
        String username = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Fetch session
        GameSession session = lobbyManager.getSession(lobbyId);
        if (session == null) {
            throw new RuntimeException("Lobby not found");
        }

        // Check password
        if (session.getPassword() != null && !session.getPassword().isEmpty()) {
            if (joinPassword == null || !session.getPassword().equals(joinPassword)) {
                throw new RuntimeException("Incorrect password");
            }
        }

        Optional<Player> existingPlayer = playerRepo.findByUserId(user.getId());
        Player player;
        if (existingPlayer.isPresent()) {
            player = existingPlayer.get();
            // If they are in another lobby, leave it first (remove from memory session only)
            if (player.getLobbyId() != null && !player.getLobbyId().equals(lobbyId)) {
                GameSession oldSession = lobbyManager.getSession(player.getLobbyId());
                if (oldSession != null) {
                    boolean wasHost = player.isHost();
                    oldSession.removeByUserId(player.getUserId());
                    if (wasHost && !oldSession.getPlayers().isEmpty()) {
                        Player newHost = oldSession.getPlayers().get(0);
                        newHost.setHost(true);
                        playerRepo.save(newHost);
                    }
                    if (oldSession.getPlayers().isEmpty()) {
                        lobbyManager.removeLobby(player.getLobbyId());
                    }
                }
            }
            player.setLobbyId(lobbyId);
        } else {
            player = new Player(user.getId(), username);
            player.setLobbyId(lobbyId);
        }

        // 🔥 CRITICAL FIX: host is SESSION-based, reset DB leak
        player.setHost(false);
        playerRepo.save(player);

        // Join session
        session.join(player);

        // 🔑 Assign host ONLY based on session order
        if (session.getPlayers().size() == 1) {
            player.setHost(true);
            playerRepo.save(player);
        }

        return player;
    }

    public void leaveGame() {
        Player leaving = getCurrentPlayer();
        String lobbyId = leaving.getLobbyId();
        if (lobbyId == null) {
            throw new RuntimeException("You are not in a lobby");
        }

        GameSession session = lobbyManager.getSession(lobbyId);
        if (session == null) {
            playerRepo.delete(leaving);
            return;
        }

        boolean wasInSession = session.getPlayers().stream()
                .anyMatch(p -> p.getUserId().equals(leaving.getUserId()));

        if (!wasInSession) {
            throw new RuntimeException("You are not in the game");
        }

        boolean wasHost = leaving.isHost();

        // ✅ Let GameSession handle removal
        session.removeByUserId(leaving.getUserId());

        // Delete the player record from database
        playerRepo.delete(leaving);

        // Reassign host if needed
        if (wasHost && !session.getPlayers().isEmpty()) {
            Player newHost = session.getPlayers().get(0);
            newHost.setHost(true);
            playerRepo.save(newHost);
        }

        // Clean up empty lobby
        if (session.getPlayers().isEmpty()) {
            lobbyManager.removeLobby(lobbyId);
        }
    }

    public Player getCurrentPlayer() {
        String username = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return playerRepo.findByUserId(user.getId())
                .orElseGet(() -> new Player(user.getId(), username));
    }

    /**
     * Enforce HOST-only actions
     */
    public Player requireHost() {
        Player player = getCurrentPlayer();

        if (!player.isHost()) {
            throw new RuntimeException("Only host can perform this action");
        }

        return player;
    }

    public void dismissLobby() {
        Player host = requireHost();
        String lobbyId = host.getLobbyId();
        if (lobbyId == null) {
            throw new RuntimeException("You are not in a lobby");
        }

        GameSession session = lobbyManager.getSession(lobbyId);
        if (session != null) {
            List<Player> players = session.getPlayers();
            playerRepo.deleteAll(players);
            lobbyManager.removeLobby(lobbyId);
        }
    }
}
