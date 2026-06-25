package com.mafia.mafiagame.model;

import jakarta.persistence.*;

@Entity
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;   // 👈 Link to User

    private String name;

    @Enumerated(EnumType.STRING)
    private Role role;

    private boolean alive = true;

    private boolean host;

    public boolean isHost() {
        return host;
    }

    public void setHost(boolean host) {
        this.host = host;
    }

    public Player() {}

    public Player(Long userId, String name) {
        this.userId = userId;
        this.name = name;
        this.alive = true;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getName() { return name; }
    public Role getRole() { return role; }
    public boolean isAlive() { return alive; }

    public void setId(Long id) { this.id = id; }
    public void setUserId(Long userId) { this.userId = userId; }
    public void setName(String name) { this.name = name; }
    public void setRole(Role role) { this.role = role; }
    public void setAlive(boolean alive) { this.alive = alive; }
}
