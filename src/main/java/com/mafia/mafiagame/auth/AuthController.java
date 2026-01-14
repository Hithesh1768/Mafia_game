package com.mafia.mafiagame.auth;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/register")
    public String register(@RequestBody AuthRequest r) {
        return service.register(r);
    }

    @PostMapping("/login")
    public String login(@RequestBody AuthRequest r) {
        return service.login(r);
    }
}
