package com.example.backend.auth;

import com.example.backend.auth.dto.RegisterRequest;
import com.example.backend.user.User;
import com.example.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AdminRegisterController {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  @Value("${admin.registration.secret:}")
  private String adminSecret;

  public AdminRegisterController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @PostMapping("/register-admin")
  public ResponseEntity<?> registerAdmin(@RequestBody RegisterRequest req,
      @RequestHeader(name = "X-Admin-Secret", required = false) String secret) {
    if (adminSecret == null || adminSecret.isBlank()) {
      return ResponseEntity.status(403).body(java.util.Map.of("error", "admin registration disabled"));
    }
    if (secret == null || !secret.equals(adminSecret)) {
      return ResponseEntity.status(403).body(java.util.Map.of("error", "invalid admin secret"));
    }
    if (userRepository.existsByUsername(req.getUsername())) {
      return ResponseEntity.status(409).body(java.util.Map.of("error", "already exists"));
    }
    User u = new User();
    u.setUsername(req.getUsername());
    u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
    u.setRoles("ADMIN,USER");
    userRepository.save(u);
    return ResponseEntity.ok(java.util.Map.of("username", u.getUsername(), "roles", u.getRoles()));
  }
}
