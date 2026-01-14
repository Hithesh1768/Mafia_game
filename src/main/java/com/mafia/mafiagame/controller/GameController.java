package com.mafia.mafiagame.controller;

import com.mafia.mafiagame.game.GameEngine;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/game")
public class GameController {

    private final GameEngine engine;

    public GameController(GameEngine engine) {
        this.engine = engine;
    }

    @PostMapping("/start")
    public String startGame() {
        engine.startGame();
        return "Game Started. Roles assigned.";
    }
    @PostMapping("/reset")
    public String resetGame() {
        engine.resetGame();
        return "Game reset. Lobby cleared.";
    }

}
