package com.mafia.mafiagame.controller;

import com.mafia.mafiagame.model.ChatMessage;
import com.mafia.mafiagame.service.ChatService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public List<ChatMessage> getChat() {
        return chatService.getFilteredMessages();
    }

    @PostMapping
    public String sendMessage(@RequestBody ChatRequest request) {
        if (request.content == null || request.content.trim().isEmpty()) {
            throw new RuntimeException("Message content cannot be empty!");
        }
        chatService.sendMessage(request.content);
        return "Message sent.";
    }

    public static class ChatRequest {
        public String content;
    }
}
