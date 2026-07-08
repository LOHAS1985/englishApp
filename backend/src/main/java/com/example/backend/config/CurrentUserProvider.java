package com.example.backend.config;

import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserProvider {

  private final UserRepository userRepository;

  public CurrentUserProvider(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public User getCurrentUser() {
    String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    return userRepository.findByUsername(username)
        .orElseThrow(() -> new IllegalStateException("認証されたユーザーが見つかりません"));
  }
}