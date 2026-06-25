package com.mafia.mafiagame.model;

import com.mafia.mafiagame.game.GameState;

public class Lobby {
    private String lobbyId;
    private String name;
    private String hostName;
    private int playerCount;
    private int maxPlayers;
    private GameState gameState;

    public Lobby() {}

    public Lobby(String lobbyId, String name, String hostName, int playerCount, int maxPlayers, GameState gameState) {
        this.lobbyId = lobbyId;
        this.name = name;
        this.hostName = hostName;
        this.playerCount = playerCount;
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

    public int getPlayerCount() {
        return playerCount;
    }

    public void setPlayerCount(int playerCount) {
        this.playerCount = playerCount;
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
}
