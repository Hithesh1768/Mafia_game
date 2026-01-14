package com.mafia.mafiagame.controller;

import com.mafia.mafiagame.game.GameSession;
import com.mafia.mafiagame.game.GameState;
import com.mafia.mafiagame.game.NightAction;
import com.mafia.mafiagame.game.NightManager;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/night")
public class NightController {

    private final NightManager nightManager;
    private final GameSession session;

    public NightController(NightManager nightManager, GameSession session) {
        this.nightManager = nightManager;
        this.session = session;
    }

    @PostMapping("/action")
    public String submitAction(@RequestBody NightAction action) {
        return nightManager.submitAction(action);
    }

    @PostMapping("/resolve")
    public String resolveNight() {
        return "Night auto-resolves when all actions are submitted.";
    }
}
