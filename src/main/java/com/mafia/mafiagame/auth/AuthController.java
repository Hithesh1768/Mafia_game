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

    @PostMapping("/guest")
    public String loginAsGuest(@RequestParam String nickname) {
        return service.loginAsGuest(nickname);
    }

    @PostMapping("/google")
    public String loginWithGoogle(@RequestBody GoogleAuthRequest r) {
        return service.loginWithGoogle(r.getCredential());
    }

    @PostMapping("/register/google")
    public String registerWithGoogle(@RequestBody GoogleRegisterRequest r) {
        return service.registerWithGoogle(r);
    }
}
