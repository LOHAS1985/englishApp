package com.example.backend.grammar;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.stereotype.Component;

@Component
public class GrammarApiClient {

    private final ChatClient chatClient;

    public GrammarApiClient(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public <T> T generate(String prompt, Class<T> responseType) {
        return chatClient.prompt()
            // 4択問題の生成に思考(thinking)は不要で、応答が数秒〜十数秒遅くなるだけなので無効にする
            .options(GoogleGenAiChatOptions.builder().thinkingBudget(0))
            .user(prompt)
            .call()
            .entity(responseType);
    }
}
