package com.example.backend.mcp;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class McpClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${mcp.base-url:http://localhost:3333/}")
    private String baseUrl;

    @Value("${mcp.api-key:}")
    private String apiKey;

    public List<Map<String, Object>> listTools() {
        Map<String, Object> req = new HashMap<>();
        req.put("jsonrpc", "2.0");
        req.put("id", 1);
        req.put("method", "tools/list");
        req.put("params", null);

        Map<String, Object> resp = postJsonRpc(req);
        Object result = resp.get("result");
        if (result instanceof List) {
            //noinspection unchecked
            return (List<Map<String, Object>>) result;
        }
        return Collections.emptyList();
    }

    public Map<String, Object> callTool(String name, Map<String, Object> arguments) {
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("arguments", arguments != null ? arguments : Collections.emptyMap());

        Map<String, Object> req = new HashMap<>();
        req.put("jsonrpc", "2.0");
        req.put("id", new Random().nextInt(Integer.MAX_VALUE));
        req.put("method", "tools/call");
        req.put("params", params);

        return postJsonRpc(req);
    }

    private Map<String, Object> postJsonRpc(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (apiKey != null && !apiKey.isEmpty()) {
            headers.setBearerAuth(apiKey);
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(baseUrl, entity, Map.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            //noinspection unchecked
            return (Map<String, Object>) response.getBody();
        }
        Map<String, Object> err = new HashMap<>();
        err.put("jsonrpc", "2.0");
        err.put("id", body.get("id"));
        err.put("error", Map.of("code", -32000, "message", "RPC request failed"));
        return err;
    }
}
