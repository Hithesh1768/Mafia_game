package com.mafia.mafiagame.controller;

import com.mafia.mafiagame.game.LobbyManager;
import com.mafia.mafiagame.model.Lobby;
import com.mafia.mafiagame.service.PlayerService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/lobby")
public class LobbyController {

    private final LobbyManager lobbyManager;
    private final PlayerService playerService;

    public LobbyController(LobbyManager lobbyManager, PlayerService playerService) {
        this.lobbyManager = lobbyManager;
        this.playerService = playerService;
    }

    @PostMapping("/create")
    public Lobby createLobby(
            @RequestParam(required = false) String name,
            @RequestParam(defaultValue = "false") boolean isPrivate,
            @RequestParam(required = false) String password) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Lobby lobby = lobbyManager.createLobby(name, username, isPrivate, password);
        playerService.joinGame(lobby.getLobbyId(), password);
        return lobbyManager.getLobby(lobby.getLobbyId());
    }

    @GetMapping("/list")
    public List<Lobby> listLobbies() {
        return lobbyManager.listActiveLobbies();
    }

    @GetMapping("/{lobbyId}")
    public Lobby getLobby(@PathVariable String lobbyId) {
        Lobby lobby = lobbyManager.getLobby(lobbyId);
        if (lobby == null) {
            throw new RuntimeException("Lobby not found");
        }
        return lobby;
    }

    @PostMapping("/dismiss")
    public String dismissLobby() {
        playerService.dismissLobby();
        return "Lobby dismissed successfully.";
    }
}
