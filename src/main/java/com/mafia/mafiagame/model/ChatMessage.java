package com.mafia.mafiagame.model;

public class ChatMessage {
    private String senderName;
    private String content;
    private long timestamp;
    private boolean ghostMessage; // true if sent by a dead player (ghost chat)
    private boolean mafiaMessage; // true if sent by mafia during night chat

    public ChatMessage() {}

    public ChatMessage(String senderName, String content, long timestamp, boolean ghostMessage, boolean mafiaMessage) {
        this.senderName = senderName;
        this.content = content;
        this.timestamp = timestamp;
        this.ghostMessage = ghostMessage;
        this.mafiaMessage = mafiaMessage;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public boolean isGhostMessage() {
        return ghostMessage;
    }

    public void setGhostMessage(boolean ghostMessage) {
        this.ghostMessage = ghostMessage;
    }

    public boolean isMafiaMessage() {
        return mafiaMessage;
    }

    public void setMafiaMessage(boolean mafiaMessage) {
        this.mafiaMessage = mafiaMessage;
    }
}
