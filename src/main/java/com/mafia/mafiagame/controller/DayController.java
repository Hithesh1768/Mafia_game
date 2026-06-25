package com.mafia.mafiagame.controller;

import com.mafia.mafiagame.game.DayManager;
import com.mafia.mafiagame.game.GameSession;
import com.mafia.mafiagame.game.GameState;
import com.mafia.mafiagame.game.Vote;
import com.mafia.mafiagame.service.PlayerService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/day")
public class DayController {

    private final DayManager dayManager;
    private final PlayerService playerService;

    public DayController(DayManager dayManager,
                         PlayerService playerService) {
        this.dayManager = dayManager;
        this.playerService = playerService;
    }

    @GetMapping("/start")
    public String startDay() {
        GameSession session = playerService.getCurrentSession();
        if (session.getState() != GameState.DAY) {
            return "It is not daytime.";
        }
        return session.getLastNightMessage();
    }

    @PostMapping("/vote")
    public String vote(@RequestBody Vote vote) {
        return dayManager.submitVote(vote);
    }

    @PostMapping("/resolve")
    public String resolveDay() {
        // 🔒 Host only
        playerService.requireHost();

        GameSession session = playerService.getCurrentSession();
        if (session.getState() != GameState.DAY) {
            return "It is not daytime.";
        }

        return dayManager.resolveDay(session);
    }
}
