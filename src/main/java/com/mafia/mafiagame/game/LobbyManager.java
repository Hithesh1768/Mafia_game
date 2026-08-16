package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Lobby;
import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.model.Role;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.context.annotation.Lazy;

@Component
public class LobbyManager {

    private final Map<String, GameSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, String> lobbyNames = new ConcurrentHashMap<>();
    private final Map<String, Integer> lobbyMaxPlayers = new ConcurrentHashMap<>();

    private final Random random = new Random();

    private final DayManager dayManager;
    private final NightManager nightManager;

    public LobbyManager(@Lazy DayManager dayManager, @Lazy NightManager nightManager) {
        this.dayManager = dayManager;
        this.nightManager = nightManager;
    }

    public synchronized Lobby createLobby(String name, String hostName, boolean isPrivate, String password) {
        String lobbyId = generateLobbyId();

        GameSession session = new GameSession(lobbyId);
        session.setPrivate(isPrivate);
        session.setPassword(password);
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

        // Check phase timeouts
        if (session.getState() == GameState.NIGHT) {
            long elapsed = System.currentTimeMillis() - session.getPhaseStartTime();
            if (session.getPhaseStartTime() > 0 && elapsed > 300_000) { // 5 minutes
                nightManager.resolveNight(session);
            }
        } else if (session.getState() == GameState.DAY) {
            long elapsed = System.currentTimeMillis() - session.getPhaseStartTime();
            if (session.getPhaseStartTime() > 0 && elapsed > 900_000) { // 15 minutes
                dayManager.resolveDay(session);
            }
        }

        String name = lobbyNames.getOrDefault(lobbyId, "Lobby " + lobbyId);
        int max = lobbyMaxPlayers.getOrDefault(lobbyId, 10);
        String hostName = session.getPlayers().stream()
                .filter(Player::isHost)
                .map(Player::getName)
                .findFirst()
                .orElse("None");

        Lobby lobby = new Lobby(
                lobbyId,
                name,
                hostName,
                session.getPlayers().size(),
                max,
                session.getState());
        lobby.setGameResult(session.getGameResult());
        lobby.setPrivate(session.isPrivate());
        lobby.setPasswordProtected(session.getPassword() != null && !session.getPassword().isEmpty());

        int timeLeft = 0;
        if (session.getState() == GameState.NIGHT) {
            long elapsed = (System.currentTimeMillis() - session.getPhaseStartTime()) / 1000;
            timeLeft = (int) Math.max(0, 300 - elapsed);
        } else if (session.getState() == GameState.DAY) {
            long elapsed = (System.currentTimeMillis() - session.getPhaseStartTime()) / 1000;
            timeLeft = (int) Math.max(0, 900 - elapsed);
        }
        lobby.setTimeLeft(timeLeft);

        if (session.getState() == GameState.DAY) {
            Map<Long, Integer> tally = new HashMap<>();
            for (Long targetId : session.getDayVotes().values()) {
                tally.put(targetId, tally.getOrDefault(targetId, 0) + 1);
            }
            lobby.setVoteTally(tally);
        } else if (session.getState() == GameState.NIGHT) {
            try {
                String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                        .getAuthentication().getName();
                Player currentPlayer = session.getPlayers().stream()
                        .filter(p -> p.getName().equals(username))
                        .findFirst()
                        .orElse(null);
                if (currentPlayer != null && currentPlayer.getRole() == Role.MAFIA) {
                    Map<Long, Integer> tally = new HashMap<>();
                    List<Player> aliveMafia = session.getPlayers().stream()
                            .filter(p -> p.isAlive() && p.getRole() == Role.MAFIA)
                            .collect(Collectors.toList());
                    for (Player m : aliveMafia) {
                        Long targetId = session.getNightActions().get(m.getId());
                        if (targetId != null) {
                            tally.put(targetId, tally.getOrDefault(targetId, 0) + 1);
                        }
                    }
                    lobby.setVoteTally(tally);
                }
            } catch (Exception e) {
                // Ignore security context exceptions
            }
        }
        return lobby;
    }

    public List<Lobby> listActiveLobbies() {
        return sessions.keySet().stream()
                .map(this::getLobby)
                .filter(l -> l != null && l.getGameState() == GameState.LOBBY && !l.isPrivate())
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
