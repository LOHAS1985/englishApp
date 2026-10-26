package com.example.backend.config;

import com.example.backend.user.User;
import com.example.backend.user.UserRepository;
import org.springframework.stereotype.Component;

/**
 * 記録を紐づける利用者。利用者は1人だけなのでログインは設けず、常に owner ユーザーを使う
 * (初回アクセス時に作成する)。
 */
@Component
public class CurrentUserProvider {

  static final String OWNER_USERNAME = "owner";

  private final UserRepository userRepository;
  private volatile Long ownerId;

  public CurrentUserProvider(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public synchronized User getCurrentUser() {
    User owner = userRepository.findByUsername(OWNER_USERNAME).orElseGet(() -> {
      User u = new User();
      u.setUsername(OWNER_USERNAME);
      // ログインしないためパスワードは使わない(列が NOT NULL なので照合できない値を入れておく)
      u.setPasswordHash("-");
      return userRepository.save(u);
    });
    ownerId = owner.getId();
    return owner;
  }

  public Long getCurrentUserId() {
    Long id = ownerId;
    return id != null ? id : getCurrentUser().getId();
  }
}
