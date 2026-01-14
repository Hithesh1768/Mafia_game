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

        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        User user = userRepo.findByUsername(username)
                .orElseThrow();

        Player p = playerRepo.findByUserId(user.getId())
                .orElseGet(() -> playerRepo.save(new Player(user.getId(), username)));

        session.join(p);

        return p;
    }

    public Player getCurrentPlayer() {

        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        User user = userRepo.findByUsername(username)
                .orElseThrow();

        return playerRepo.findByUserId(user.getId())
                .orElseThrow();
    }
}
