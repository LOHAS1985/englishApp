package com.example.backend.mcp;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/mcp")
public class McpController {

    private final McpClient mcPClient;

    public McpController(McpClient mcPClient) {
        this.mcPClient = mcPClient;
    }

    @GetMapping("/list")
    public ResponseEntity<?> listTools() {
        return ResponseEntity.ok(mcPClient.listTools());
    }

    @PostMapping("/call")
    public ResponseEntity<?> callTool(@RequestBody Map<String, Object> body) {
        // Expect body to contain { "name": "toolName", "arguments": { ... } }
        Object nameObj = body.get("name");
        if (!(nameObj instanceof String)) {
            return ResponseEntity.badRequest().body(Map.of("error", "'name' is required"));
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> args = (Map<String, Object>) body.getOrDefault("arguments", Map.of());
        Map<String, Object> resp = mcPClient.callTool((String) nameObj, args);
        return ResponseEntity.ok(resp);
    }
}
