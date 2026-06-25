package com.mafia.mafiagame.service;

import com.mafia.mafiagame.game.GameSession;
import com.mafia.mafiagame.game.GameState;
import com.mafia.mafiagame.model.ChatMessage;
import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.model.Role;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final PlayerService playerService;

    public ChatService(PlayerService playerService) {
        this.playerService = playerService;
    }

    public synchronized void sendMessage(String content) {
        Player player = playerService.getCurrentPlayer();
        GameSession session = playerService.getCurrentSession();
        GameState state = session.getState();

        boolean isDead = !player.isAlive();
        boolean isMafia = player.getRole() == Role.MAFIA;

        boolean ghostMessage = false;
        boolean mafiaMessage = false;

        if (isDead) {
            // Dead players can only chat in the Ghost Chat
            ghostMessage = true;
        } else {
            // Alive players
            if (state == GameState.NIGHT) {
                if (isMafia) {
                    mafiaMessage = true; // Mafia private night chat
                } else {
                    throw new RuntimeException("Citizens and Doctors cannot chat during the night!");
                }
            } else if (state == GameState.RESOLVING_NIGHT || state == GameState.RESOLVING_DAY) {
                throw new RuntimeException("Cannot chat during phase resolution!");
            }
        }

        ChatMessage message = new ChatMessage(
                player.getName(),
                content,
                System.currentTimeMillis(),
                ghostMessage,
                mafiaMessage
        );

        session.addMessage(message);
    }

    public List<ChatMessage> getFilteredMessages() {
        Player player = playerService.getCurrentPlayer();
        GameSession session = playerService.getCurrentSession();
        GameState state = session.getState();

        boolean isCallerAlive = player.isAlive();
        boolean isCallerMafia = player.getRole() == Role.MAFIA;

        List<ChatMessage> fullHistory = session.getChatHistory();

        if (!isCallerAlive) {
            // Dead players (ghosts) can see absolutely everything, just like in Among Us
            return fullHistory;
        }

        // Alive players get filtered messages
        return fullHistory.stream()
                .filter(msg -> {
                    // 1. Alive players can NEVER see ghost chat messages
                    if (msg.isGhostMessage()) {
                        return false;
                    }

                    // 2. Mafia night messages are only visible to other Mafia members
                    if (msg.isMafiaMessage()) {
                        return isCallerMafia;
                    }

                    // 3. Regular public messages are visible to all alive players
                    return true;
                })
                .collect(Collectors.toList());
    }
}
