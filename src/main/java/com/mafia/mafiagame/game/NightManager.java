package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.model.Role;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class NightManager {

    private final Map<Role, Long> actions = new HashMap<>();
    private final GameSession session;
    private final WinConditionService winService;

    public NightManager(GameSession session, WinConditionService winService) {
        this.session = session;
        this.winService = winService;
    }

    public synchronized String submitAction(NightAction action) {

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

        actions.put(actor.getRole(), action.getTargetId());
        session.recordNightAction(actor.getId());

        if (allNightActorsSubmitted())
            return resolveNight();

        return "Action recorded.";
    }

    /**
     * Safe resolve:
     * phase is locked BEFORE resolution
     */
    public synchronized String resolveNight() {

        if (session.getState() != GameState.NIGHT)
            return "Not night time.";

        // 🔒 LOCK PHASE FIRST
        session.lockNight();

        Long kill = actions.get(Role.MAFIA);
        Long save = actions.get(Role.DOCTOR);

        String result;

        if (kill != null && !kill.equals(save)) {
            Player victim = session.getPlayers().stream()
                    .filter(p -> p.getId().equals(kill))
                    .findFirst()
                    .orElse(null);

            if (victim != null) victim.setAlive(false);
            result = victim.getName() + " was killed.";
        } else {
            result = "Doctor saved the victim.";
        }

        String winner = winService.checkWinner(session);
        if (winner != null)
            return "Game Over: " + winner;

        actions.clear();
        session.resetNightActions();
        session.setLastNightMessage(result);

        // advance phase AFTER resolution
        session.startDay();

        return result + " Day begins.";
    }

    private boolean allNightActorsSubmitted() {
        long required = session.getPlayers().stream()
                .filter(Player::isAlive)
                .filter(p -> p.getRole() == Role.MAFIA || p.getRole() == Role.DOCTOR)
                .count();

        return session.getNightActors().size() == required;
    }
}
