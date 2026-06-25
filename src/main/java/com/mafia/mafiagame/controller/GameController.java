package com.mafia.mafiagame.controller;

import com.mafia.mafiagame.game.GameEngine;
import com.mafia.mafiagame.game.GameSession;
import com.mafia.mafiagame.service.PlayerService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/game")
public class GameController {

    private final GameEngine engine;
    private final PlayerService playerService;

    public GameController(GameEngine engine, PlayerService playerService) {
        this.engine = engine;
        this.playerService = playerService;
    }

    @PostMapping("/start")
    public String startGame() {
        playerService.requireHost();
        engine.startGame();
        return "Game Started. Roles assigned.";
    }

    @PostMapping("/reset")
    public String resetGame() {
        playerService.requireHost();
        engine.resetGame();
        return "Game reset. Lobby cleared.";
    }

    @PostMapping("/return-to-lobby")
    public String returnToLobby() {
        playerService.requireHost();
        GameSession session = playerService.getCurrentSession();
        engine.returnToLobby(session);
        return "Returned to lobby. Ready for next round.";
    }
}
