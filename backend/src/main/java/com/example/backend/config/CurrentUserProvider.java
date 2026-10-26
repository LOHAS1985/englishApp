package com.example.backend.config;

import com.example.backend.user.User;
import com.example.backend.user.UserRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CurrentUserProvider {

  private final UserRepository userRepository;

  public CurrentUserProvider(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  /** ログイン中のユーザー。未ログインなら空(未ログインでも全機能を使えるため、記録の保存だけを省略する) */
  public Optional<User> findCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
      return Optional.empty();
    }
    return userRepository.findByUsername(String.valueOf(auth.getPrincipal()));
  }

  public User getCurrentUser() {
    return findCurrentUser()
        .orElseThrow(() -> new IllegalStateException("認証されたユーザーが見つかりません"));
  }
}
