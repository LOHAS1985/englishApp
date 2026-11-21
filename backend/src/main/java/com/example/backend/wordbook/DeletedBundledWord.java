package com.example.backend.wordbook;

import jakarta.persistence.*;

/** 利用者が削除した同梱語。同梱の内容を更新しても、この語は単語帳へ戻さない */
@Entity
@Table(name = "wordbook_bundled_deleted", uniqueConstraints = @UniqueConstraint(name = "uq_wordbook_bundled_deleted",
    columnNames = { "user_id", "bundled_id" }))
public class DeletedBundledWord {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "bundled_id", nullable = false, length = 20)
  private String bundledId;

  protected DeletedBundledWord() {
  }

  public DeletedBundledWord(Long userId, String bundledId) {
    this.userId = userId;
    this.bundledId = bundledId;
  }

  public Long getUserId() { return userId; }
  public String getBundledId() { return bundledId; }
}
