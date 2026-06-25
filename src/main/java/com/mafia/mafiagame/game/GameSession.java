package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Player;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class GameSession {

    private final List<Player> players = new ArrayList<>();
    private GameState state = GameState.LOBBY;

    private final Set<Long> nightActors = new HashSet<>();
    private final Set<Long> dayVoters = new HashSet<>();

    private String lastNightMessage = "";

    public synchronized void join(Player p) {
        if (state != GameState.LOBBY)
            throw new IllegalStateException("Game already started");

        boolean exists = players.stream()
                .anyMatch(pl -> pl.getUserId().equals(p.getUserId()));

        if (!exists) {
            players.add(p);
        }
    }

    public synchronized void leave(Player p) {
        players.removeIf(pl -> pl.getUserId().equals(p.getUserId()));
    }



    public synchronized void startGame() {
        if (players.size() < 3) throw new IllegalStateException("Need at least 3 players");
        state = GameState.NIGHT;
    }

    public synchronized void startDay() {
        state = GameState.DAY;
    }

    public synchronized void startNight() {
        state = GameState.NIGHT;
    }

    public synchronized void finishGame() {
        state = GameState.FINISHED;
    }

    public synchronized void reset() {
        players.clear();
        state = GameState.LOBBY;
        nightActors.clear();
        dayVoters.clear();
        lastNightMessage = "";
    }
    public void lockNight() {
        if (state == GameState.NIGHT)
            state = GameState.RESOLVING_NIGHT;
    }

    public void lockDay() {
        if (state == GameState.DAY)
            state = GameState.RESOLVING_DAY;
    }

    public List<Player> getPlayers() {
        return Collections.unmodifiableList(players);
    }
    public synchronized boolean removeByUserId(Long userId) {
        return players.removeIf(p -> p.getUserId().equals(userId));
    }

    public GameState getState() { return state; }

    public void recordNightAction(Long id) { nightActors.add(id); }
    public void recordDayVote(Long id) { dayVoters.add(id); }

    public Set<Long> getNightActors() { return nightActors; }
    public Set<Long> getDayVoters() { return dayVoters; }

    public void resetNightActions() { nightActors.clear(); }
    public void resetDayVotes() { dayVoters.clear(); }

    public String getLastNightMessage() { return lastNightMessage; }
    public void setLastNightMessage(String msg) { lastNightMessage = msg; }
}
