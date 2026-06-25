package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.model.Role;
import com.mafia.mafiagame.service.PlayerService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class NightManager {

    private final PlayerService playerService;
    private final WinConditionService winService;

    public NightManager(PlayerService playerService, WinConditionService winService) {
        this.playerService = playerService;
        this.winService = winService;
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

        session.getNightActions().put(actor.getRole(), action.getTargetId());
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

        Long kill = session.getNightActions().get(Role.MAFIA);
        Long save = session.getNightActions().get(Role.DOCTOR);

        String result;

        if (kill != null && !kill.equals(save)) {
            Player victim = session.getPlayers().stream()
                    .filter(p -> p.getId().equals(kill))
                    .findFirst()
                    .orElse(null);

            if (victim != null) victim.setAlive(false);
            result = (victim != null ? victim.getName() : "Someone") + " was killed.";
        } else {
            result = "Doctor saved the victim.";
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
