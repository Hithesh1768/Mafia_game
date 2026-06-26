package com.mafia.mafiagame.game;

import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.model.Role;
import org.springframework.stereotype.Component;

@Component
public class WinConditionService {

    public String checkWinner(GameSession session) {

        long mafia = session.getPlayers().stream()
                .filter(Player::isAlive)
                .filter(p -> p.getRole() == Role.MAFIA)
                .count();

        long citizens = session.getPlayers().stream()
                .filter(Player::isAlive)
                .filter(p -> p.getRole() != Role.MAFIA)
                .count();

        if (mafia == 0) {
            session.finishGame("CITIZENS WIN");
            return "CITIZENS WIN";
        }

        if (mafia >= citizens) {
            session.finishGame("MAFIA WIN");
            return "MAFIA WIN";
        }

        return null;
    }
}
