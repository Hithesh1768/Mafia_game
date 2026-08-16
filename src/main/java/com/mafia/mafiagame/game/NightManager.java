package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.model.Role;
import com.mafia.mafiagame.service.PlayerService;
import com.mafia.mafiagame.repository.PlayerRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class NightManager {

    private final PlayerService playerService;
    private final WinConditionService winService;
    private final PlayerRepository playerRepo;

    public NightManager(PlayerService playerService, WinConditionService winService, PlayerRepository playerRepo) {
        this.playerService = playerService;
        this.winService = winService;
        this.playerRepo = playerRepo;
    }

    public synchronized String submitAction(NightAction action) {
        GameSession session = playerService.getCurrentSession();

        if (session.getState() != GameState.NIGHT)
            return "Not night time.";

        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        Player actor = session.getPlayers().stream()
                .filter(p -> p.getName().equals(username))
                .findFirst()
                .orElseThrow();

        if (!actor.isAlive())
            return "Dead players cannot act.";

        if (actor.getRole() == Role.CITIZEN)
            return "Citizens cannot act at night.";

        if (session.getNightActors().contains(actor.getId()))
            return "You have already acted.";

        session.getNightActions().put(actor.getId(), action.getTargetId());
        session.recordNightAction(actor.getId());

        if (allNightActorsSubmitted(session))
            return resolveNight(session);

        return "Action recorded.";
    }

    /**
     * Safe resolve:
     * phase is locked BEFORE resolution
     */
    public synchronized String resolveNight(GameSession session) {

        if (session.getState() != GameState.NIGHT)
            return "Not night time.";

        // 🔒 LOCK PHASE FIRST
        session.lockNight();

        // 1. Get Doctor's Target
        Long save = null;
        Player doctor = session.getPlayers().stream()
                .filter(p -> p.isAlive() && p.getRole() == Role.DOCTOR)
                .findFirst()
                .orElse(null);
        if (doctor != null) {
            save = session.getNightActions().get(doctor.getId());
        }

        // 2. Tally Mafia Votes
        List<Player> aliveMafia = session.getPlayers().stream()
                .filter(p -> p.isAlive() && p.getRole() == Role.MAFIA)
                .collect(Collectors.toList());

        Map<Long, Integer> mafiaTally = new HashMap<>();
        for (Player m : aliveMafia) {
            Long target = session.getNightActions().get(m.getId());
            if (target != null) {
                mafiaTally.put(target, mafiaTally.getOrDefault(target, 0) + 1);
            }
        }

        Long kill = null;
        boolean failedToDecide = false;
        if (!mafiaTally.isEmpty()) {
            int maxVotes = mafiaTally.values().stream()
                    .max(Integer::compareTo)
                    .orElse(0);

            long maxCount = mafiaTally.values().stream()
                    .filter(v -> v == maxVotes)
                    .count();

            if (maxCount > 1) {
                failedToDecide = true;
            } else {
                kill = mafiaTally.entrySet().stream()
                        .filter(e -> e.getValue() == maxVotes)
                        .map(Map.Entry::getKey)
                        .findFirst()
                        .orElse(null);
            }
        } else {
            failedToDecide = true;
        }

        final Long finalKill = kill;
        String result;

        if (failedToDecide) {
            result = "Mafia failed to decide on who to kill.";
        } else if (finalKill != null) {
            if (finalKill.equals(save)) {
                result = "Doctor saved the victim.";
            } else {
                Player victim = session.getPlayers().stream()
                        .filter(p -> p.getId().equals(finalKill))
                        .findFirst()
                        .orElse(null);

                if (victim != null) {
                    victim.setAlive(false);
                    playerRepo.save(victim);
                }
                result = (victim != null ? victim.getName() : "Someone") + " was killed.";
            }
        } else {
            result = "No action taken.";
        }

        String winner = winService.checkWinner(session);
        if (winner != null)
            return "Game Over: " + winner;

        session.resetNightActions();
        session.setLastNightMessage(result);

        // advance phase AFTER resolution
        session.startDay();

        return result + " Day begins.";
    }

    private boolean allNightActorsSubmitted(GameSession session) {
        long required = session.getPlayers().stream()
                .filter(Player::isAlive)
                .filter(p -> p.getRole() == Role.MAFIA || p.getRole() == Role.DOCTOR)
                .count();

        return session.getNightActors().size() == required;
    }
}
