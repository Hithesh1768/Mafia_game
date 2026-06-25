package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.ChatMessage;
import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.model.Role;

import java.util.*;

public class GameSession {

    private final String lobbyId;
    private final List<Player> players = new ArrayList<>();
    private GameState state = GameState.LOBBY;

    private final Set<Long> nightActors = new HashSet<>();
    private final Set<Long> dayVoters = new HashSet<>();

    private final Map<Role, Long> nightActions = new HashMap<>();
    private final Map<Long, Long> dayVotes = new HashMap<>();

    private String lastNightMessage = "";
    private final List<ChatMessage> chatHistory = new ArrayList<>();

    public GameSession(String lobbyId) {
        this.lobbyId = lobbyId;
    }

    public String getLobbyId() {
        return lobbyId;
    }

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

    public synchronized void returnToLobby() {
        state = GameState.LOBBY;
        nightActors.clear();
        dayVoters.clear();
        nightActions.clear();
        dayVotes.clear();
        chatHistory.clear();
        lastNightMessage = "";
    }

    public synchronized void reset() {
        players.clear();
        state = GameState.LOBBY;
        nightActors.clear();
        dayVoters.clear();
        nightActions.clear();
        dayVotes.clear();
        chatHistory.clear();
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

    public Map<Role, Long> getNightActions() { return nightActions; }
    public Map<Long, Long> getDayVotes() { return dayVotes; }

    public void resetNightActions() { 
        nightActors.clear(); 
        nightActions.clear();
    }
    public void resetDayVotes() { 
        dayVoters.clear(); 
        dayVotes.clear();
    }

    public String getLastNightMessage() { return lastNightMessage; }
    public void setLastNightMessage(String msg) { lastNightMessage = msg; }

    public synchronized void addMessage(ChatMessage message) {
        chatHistory.add(message);
    }

    public List<ChatMessage> getChatHistory() {
        return Collections.unmodifiableList(chatHistory);
    }
}
