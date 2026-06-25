package com.mafia.mafiagame.controller;

import com.mafia.mafiagame.model.Player;
import com.mafia.mafiagame.service.PlayerService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/player")
public class PlayerController {

    private final PlayerService service;

    public PlayerController(PlayerService service) {
        this.service = service;
    }

    @PostMapping("/join")
    public Player join(@RequestParam String lobbyId) {
        return service.joinGame(lobbyId);
    }

    @PostMapping("/leave")
    public String leave() {
        service.leaveGame();
        return "Player left the game.";
    }

    @GetMapping("/me")
    public Player me() {
        return service.getCurrentPlayer();
    }
}
