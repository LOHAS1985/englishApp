package com.example.backend.writing;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Component
public class GeminiApiClient {

    private final ChatClient chatClient;

    public GeminiApiClient(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    /** プロンプトを送り、指定した型に直接マッピングされた結果を受け取る */
    public <T> T generate(String prompt, Class<T> responseType) {
        return chatClient.prompt()
            .user(prompt)
            .call()
            .entity(responseType);
    }
}