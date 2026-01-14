package com.mafia.mafiagame.auth;

import com.mafia.mafiagame.user.*;
import com.mafia.mafiagame.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository repo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UserRepository repo, PasswordEncoder encoder, JwtService jwt) {
        this.repo = repo;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public String register(AuthRequest req) {
        User u = new User();
        u.setUsername(req.username);
        u.setPassword(encoder.encode(req.password));
        u.setRole(RoleType.PLAYER);
        repo.save(u);
        return "OK";
    }

    public String login(AuthRequest req) {
        User u = repo.findByUsername(req.username).orElseThrow();
        if (!encoder.matches(req.password, u.getPassword()))
            throw new RuntimeException("Bad credentials");
        return jwt.generateToken(u);
    }
}
