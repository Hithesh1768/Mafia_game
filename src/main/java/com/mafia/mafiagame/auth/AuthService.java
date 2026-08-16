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

    public String loginAsGuest(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            throw new IllegalArgumentException("Nickname is required");
        }
        String guestUsername = nickname.trim() + "_Guest_" + java.util.UUID.randomUUID().toString().substring(0, 4);
        User u = new User();
        u.setUsername(guestUsername);
        u.setPassword("");
        u.setRole(RoleType.GUEST);
        repo.save(u);
        return jwt.generateToken(u);
    }

    public String loginWithGoogle(String credential) {
        if (credential == null || credential.trim().isEmpty()) {
            throw new IllegalArgumentException("Google credential is required");
        }
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + credential))
                    .GET()
                    .build();
            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("Google token validation failed");
            }
            
            String body = response.body();
            String email = extractJsonField(body, "email");
            if (email == null || email.isEmpty()) {
                throw new RuntimeException("Email claim not found in Google token");
            }
            
            User u = repo.findByGoogleEmail(email).orElse(null);
            if (u == null) {
                u = repo.findByUsername(email).orElse(null);
                if (u == null) {
                    throw new RuntimeException("Google account not registered. Please sign up first.");
                }
            }
            return jwt.generateToken(u);
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    public String registerWithGoogle(GoogleRegisterRequest req) {
        if (req.getCredential() == null || req.getCredential().trim().isEmpty()) {
            throw new IllegalArgumentException("Google credential is required");
        }
        if (req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (req.getPassword() == null || req.getPassword().trim().isEmpty()) {
            throw new IllegalArgumentException("Password is required");
        }

        String password = req.getPassword();
        if (password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters.");
        }
        if (!password.matches(".*\\d.*")) {
            throw new IllegalArgumentException("Password must contain at least one digit.");
        }
        if (!password.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            throw new IllegalArgumentException("Password must contain at least one special character.");
        }

        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + req.getCredential()))
                    .GET()
                    .build();
            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("Google token validation failed");
            }
            
            String body = response.body();
            String email = extractJsonField(body, "email");
            if (email == null || email.isEmpty()) {
                throw new RuntimeException("Email claim not found in Google token");
            }

            if (repo.findByUsername(req.getUsername().trim()).isPresent()) {
                throw new RuntimeException("Username already taken.");
            }

            if (repo.findByGoogleEmail(email).isPresent()) {
                throw new RuntimeException("Google account already registered. Please log in.");
            }

            User u = new User();
            u.setUsername(req.getUsername().trim());
            u.setPassword(encoder.encode(password));
            u.setGoogleEmail(email);
            u.setRole(RoleType.PLAYER);
            repo.save(u);

            return jwt.generateToken(u);
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private String extractJsonField(String json, String field) {
        String pattern = "\"" + field + "\":\"";
        int start = json.indexOf(pattern);
        if (start == -1) return null;
        start += pattern.length();
        int end = json.indexOf("\"", start);
        if (end == -1) return null;
        return json.substring(start, end);
    }
}
