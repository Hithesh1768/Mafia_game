package com.mafia.mafiagame.service;

import com.mafia.mafiagame.game.GameSession;
import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.repository.PlayerRepository;
import com.mafia.mafiagame.user.User;
import com.mafia.mafiagame.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class PlayerService {

    private final PlayerRepository playerRepo;
    private final UserRepository userRepo;
    private final GameSession session;

    public PlayerService(PlayerRepository playerRepo,
                         UserRepository userRepo,
                         GameSession session) {
        this.playerRepo = playerRepo;
        this.userRepo = userRepo;
        this.session = session;
    }


    public Player joinGame() {

        String username = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Player player = playerRepo.findByUserId(user.getId())
                .orElseGet(() -> {
                    Player p = new Player(user.getId(), username);
                    return playerRepo.save(p);
                });

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

        boolean wasInSession = session.getPlayers().stream()
                .anyMatch(p -> p.getUserId().equals(leaving.getUserId()));

        if (!wasInSession) {
            throw new RuntimeException("You are not in the game");
        }

        boolean wasHost = leaving.isHost();

        // ✅ Let GameSession handle removal
        session.removeByUserId(leaving.getUserId());

        // Clear host flag on leaving player
        leaving.setHost(false);
        playerRepo.save(leaving);

        // Reassign host if needed
        if (wasHost && !session.getPlayers().isEmpty()) {
            Player newHost = session.getPlayers().get(0);
            newHost.setHost(true);
            playerRepo.save(newHost);
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
                .orElseThrow(() -> new RuntimeException("Player not found"));
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
}
