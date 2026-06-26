package com.mafia.mafiagame.model;

import com.mafia.mafiagame.game.GameState;
import java.util.Map;
import java.util.HashMap;

public class Lobby {
    private String lobbyId;
    private String name;
    private String hostName;
    private int activePlayers;
    private int maxPlayers;
    private GameState gameState;
    private String gameResult;
    private boolean isPrivate;
    private boolean isPasswordProtected;
    private Map<Long, Integer> voteTally = new HashMap<>();
    private int timeLeft;

    public Lobby() {
    }

    public Lobby(String lobbyId, String name, String hostName, int activePlayers, int maxPlayers, GameState gameState) {
        this.lobbyId = lobbyId;
        this.name = name;
        this.hostName = hostName;
        this.activePlayers = activePlayers;
        this.maxPlayers = maxPlayers;
        this.gameState = gameState;
    }

    public String getLobbyId() {
        return lobbyId;
    }

    public void setLobbyId(String lobbyId) {
        this.lobbyId = lobbyId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public int getActivePlayers() {
        return activePlayers;
    }

    public void setActivePlayers(int activePlayers) {
        this.activePlayers = activePlayers;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public void setMaxPlayers(int maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public GameState getGameState() {
        return gameState;
    }

    public void setGameState(GameState gameState) {
        this.gameState = gameState;
    }

    public String getGameResult() {
        return gameResult;
    }

    public void setGameResult(String gameResult) {
        this.gameResult = gameResult;
    }

    public boolean isPrivate() {
        return isPrivate;
    }

    public void setPrivate(boolean aPrivate) {
        isPrivate = aPrivate;
    }

    public boolean isPasswordProtected() {
        return isPasswordProtected;
    }

    public void setPasswordProtected(boolean passwordProtected) {
        isPasswordProtected = passwordProtected;
    }

    public Map<Long, Integer> getVoteTally() {
        return voteTally;
    }

    public void setVoteTally(Map<Long, Integer> voteTally) {
        this.voteTally = voteTally;
    }

    public int getTimeLeft() {
        return timeLeft;
    }

    public void setTimeLeft(int timeLeft) {
        this.timeLeft = timeLeft;
    }
}
