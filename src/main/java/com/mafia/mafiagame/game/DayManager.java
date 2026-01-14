package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Player;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class DayManager {

    private final Map<Long, Long> votes = new HashMap<>();
    private final GameSession session;
    private final WinConditionService winService;

    public DayManager(GameSession session, WinConditionService winService) {
        this.session = session;
        this.winService = winService;
    }

    public synchronized String submitVote(Vote vote) {

        if (session.getState() != GameState.DAY)
            return "Not daytime.";

        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        Player voter = session.getPlayers().stream()
                .filter(p -> p.getName().equals(username))
                .findFirst()
                .orElse(null);

        if (voter == null || !voter.isAlive())
            return "Invalid voter.";

        if (session.getDayVoters().contains(voter.getId()))
            return "You have already voted.";

        Player target = session.getPlayers().stream()
                .filter(p -> p.getId().equals(vote.getTargetId()) && p.isAlive())
                .findFirst()
                .orElse(null);

        if (target == null)
            return "Invalid target.";

        votes.put(voter.getId(), target.getId());
        session.recordDayVote(voter.getId());

        if (allAliveVoted())
            return resolveDay();

        return "Vote recorded.";
    }

    private synchronized String resolveDay() {

        if (votes.isEmpty()) {
            session.resetDayVotes();
            session.startNight();
            return "No votes cast. Night begins.";
        }

        Map<Long, Integer> tally = new HashMap<>();
        for (Long t : votes.values())
            tally.put(t, tally.getOrDefault(t, 0) + 1);

        int maxVotes = tally.values().stream().max(Integer::compareTo).orElse(0);

        long winners = tally.values().stream()
                .filter(v -> v == maxVotes)
                .count();

        if (winners > 1) {
            votes.clear();
            session.resetDayVotes();
            session.startNight();
            return "Vote tied. No one was eliminated. Night begins.";
        }

        Long eliminatedId = tally.entrySet().stream()
                .filter(e -> e.getValue() == maxVotes)
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);

        Player eliminated = session.getPlayers().stream()
                .filter(p -> p.getId().equals(eliminatedId))
                .findFirst()
                .orElse(null);

        if (eliminated != null)
            eliminated.setAlive(false);

        String winner = winService.checkWinner(session);
        if (winner != null)
            return "Game Over: " + winner;

        votes.clear();
        session.resetDayVotes();
        session.startNight();

        return eliminated != null
                ? eliminated.getName() + " was eliminated. Night begins."
                : "No elimination. Night begins.";
    }

    private boolean allAliveVoted() {
        long alive = session.getPlayers().stream()
                .filter(Player::isAlive).count();

        return session.getDayVoters().size() == alive;
    }
}
