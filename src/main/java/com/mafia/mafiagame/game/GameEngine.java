package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.model.Role;
import com.mafia.mafiagame.repository.PlayerRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Random;

@Component
public class GameEngine {

    private final PlayerRepository repo;
    private final GameSession session;

    public GameEngine(PlayerRepository repo, GameSession session) {
        this.repo = repo;
        this.session = session;
    }

    public String startGame() {

        session.startGame();   // All validation & locking happens here

        List<Player> players = session.getPlayers();
        assignRoles(players);

        return "Game started with " + players.size() + " players";
    }

    private void assignRoles(List<Player> players) {

        Random rand = new Random();

        int mafiaCount = Math.max(1, players.size() / 4);
        int doctorCount = 1;

        for (Player p : players) p.setRole(null);

        // Assign Mafia
        int assigned = 0;
        while (assigned < mafiaCount) {
            Player p = players.get(rand.nextInt(players.size()));
            if (p.getRole() == null) {
                p.setRole(Role.MAFIA);
                repo.save(p);
                assigned++;
            }
        }

        // Assign Doctor
        assigned = 0;
        while (assigned < doctorCount) {
            Player p = players.get(rand.nextInt(players.size()));
            if (p.getRole() == null) {
                p.setRole(Role.DOCTOR);
                repo.save(p);
                assigned++;
            }
        }

        // Rest are citizens
        for (Player p : players) {
            if (p.getRole() == null) {
                p.setRole(Role.CITIZEN);
                repo.save(p);
            }
        }
    }


    public synchronized String resetGame() {
        repo.deleteAll();
        session.reset();
        return "Game reset.";
    }
}
