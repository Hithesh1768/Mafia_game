package com.mafia.mafiagame.controller;

import com.mafia.mafiagame.game.DayManager;
import com.mafia.mafiagame.game.GameSession;
import com.mafia.mafiagame.game.GameState;
import com.mafia.mafiagame.game.Vote;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/day")
public class DayController {

    private final DayManager dayManager;
    private final GameSession session;

    public DayController(DayManager dayManager, GameSession session) {
        this.dayManager = dayManager;
        this.session = session;
    }

    @GetMapping("/start")
    public String startDay() {
        if (session.getState() != GameState.DAY) {
            return "It is not daytime.";
        }
        return session.getLastNightMessage();
    }

    @PostMapping("/vote")
    public String vote(@RequestBody Vote vote) {
        return dayManager.submitVote(vote);
    }
}
