package com.mafia.mafiagame.auth;

public class GoogleRegisterRequest {
    private String credential;
    private String username;
    private String password;

    public GoogleRegisterRequest() {}

    public String getCredential() {
        return credential;
    }

    public void setCredential(String credential) {
        this.credential = credential;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
