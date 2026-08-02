package com.example.backend.grammar;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Component
public class GrammarApiClient {

    private final ChatClient chatClient;

    public GrammarApiClient(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public <T> T generate(String prompt, Class<T> responseType) {
        return chatClient.prompt()
            .user(prompt)
            .call()
            .entity(responseType);
    }
}