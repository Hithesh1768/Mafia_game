package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Lobby;
import com.mafia.mafiagame.model.Player;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class LobbyManager {

    private final Map<String, GameSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, String> lobbyNames = new ConcurrentHashMap<>();
    private final Map<String, Integer> lobbyMaxPlayers = new ConcurrentHashMap<>();

    private final Random random = new Random();

    public synchronized Lobby createLobby(String name, String hostName) {
        String lobbyId = generateLobbyId();
        
        GameSession session = new GameSession(lobbyId);
        sessions.put(lobbyId, session);
        lobbyNames.put(lobbyId, (name == null || name.trim().isEmpty()) ? "Lobby " + lobbyId : name);
        lobbyMaxPlayers.put(lobbyId, 10); // default maximum players

        return getLobby(lobbyId);
    }

    public GameSession getSession(String lobbyId) {
        return sessions.get(lobbyId);
    }

    public Lobby getLobby(String lobbyId) {
        GameSession session = sessions.get(lobbyId);
        if (session == null) {
            return null;
        }
        String name = lobbyNames.getOrDefault(lobbyId, "Lobby " + lobbyId);
        int max = lobbyMaxPlayers.getOrDefault(lobbyId, 10);
        String hostName = session.getPlayers().stream()
                .filter(Player::isHost)
                .map(Player::getName)
                .findFirst()
                .orElse("None");

        return new Lobby(
                lobbyId, 
                name, 
                hostName, 
                session.getPlayers().size(), 
                max, 
                session.getState()
        );
    }

    public List<Lobby> listActiveLobbies() {
        return sessions.keySet().stream()
                .map(this::getLobby)
                .filter(l -> l != null && l.getGameState() == GameState.LOBBY)
                .collect(Collectors.toList());
    }

    public synchronized void removeLobby(String lobbyId) {
        sessions.remove(lobbyId);
        lobbyNames.remove(lobbyId);
        lobbyMaxPlayers.remove(lobbyId);
    }

    private String generateLobbyId() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb;
        do {
            sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
        } while (sessions.containsKey(sb.toString()));
        return sb.toString();
    }
}
