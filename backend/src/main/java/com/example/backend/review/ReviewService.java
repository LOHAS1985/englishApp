package com.example.backend.review;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 間違えた問題の間隔反復(語彙・文法)。間違えたら翌日に出し直し、復習日以降に正解するたびに
 * 1→3→7→14日と間隔を延ばす。14日後の復習にも正解したら覚えたとみなして外す。
 */
@Service
public class ReviewService {

  /** 復習の対象。読解・リスニングは設問ごとに登録する(item_id は「セットID-設問番号」。例: r0001-3) */
  public static final List<String> FEATURES = List.of("vocab", "grammar", "reading", "listening");

  /** stage ごとの次の復習までの日数 */
  static final int[] INTERVAL_DAYS = { 1, 3, 7, 14 };

  /** 次の復習予定。null は覚えた(復習リストから外す) */
  record Schedule(int stage, LocalDate dueDate) {
  }

  public record ReviewSummary(String feature, long due, long pending) {
  }

  private final ReviewItemRepository repository;
  private final CurrentUserProvider currentUserProvider;

  public ReviewService(ReviewItemRepository repository, CurrentUserProvider currentUserProvider) {
    this.repository = repository;
    this.currentUserProvider = currentUserProvider;
  }

  /** 採点のたびに呼ぶ。復習リストに無い問題は、間違えたときだけ追加する */
  @Transactional
  public void record(String feature, String itemId, boolean correct) {
    record(feature, itemId, correct, LocalDateTime.now(StudyLogService.JST));
  }

  /** @param answeredAt 解いた日本時間の時刻。送信が遅れても、解いた日を基準に復習日を決める */
  @Transactional
  public void record(String feature, String itemId, boolean correct, LocalDateTime answeredAt) {
    Long userId = currentUserProvider.getCurrentUserId();
    LocalDate today = answeredAt.toLocalDate();
    Optional<ReviewItem> existing = repository.findByUserIdAndFeatureAndItemId(userId, feature, itemId);
    if (existing.isEmpty() && correct) {
      return;
    }
    ReviewItem item = existing.orElseGet(() -> new ReviewItem(userId, feature, itemId));
    Schedule next = next(existing.map(ReviewItem::getStage).orElse(null),
        existing.map(ReviewItem::getDueDate).orElse(null), correct, today);
    if (next == null) {
      repository.delete(item);
      return;
    }
    item.schedule(next.stage(), next.dueDate(), answeredAt);
    repository.save(item);
  }

  /**
   * @param stage 現在の段階(未登録なら null)
   * @param due   現在の復習日(未登録なら null)
   */
  static Schedule next(Integer stage, LocalDate due, boolean correct, LocalDate today) {
    if (!correct) {
      return new Schedule(0, today.plusDays(INTERVAL_DAYS[0]));
    }
    if (stage == null) {
      return null;
    }
    // 復習日より前に通常の出題で正解しても、間隔は進めない(すぐ後に解いた正解は定着の証拠にならないため)
    if (due != null && due.isAfter(today)) {
      return new Schedule(stage, due);
    }
    int nextStage = stage + 1;
    if (nextStage >= INTERVAL_DAYS.length) {
      return null;
    }
    return new Schedule(nextStage, today.plusDays(INTERVAL_DAYS[nextStage]));
  }

  /** 今日までに復習日になっている問題の ID(復習日が古い順) */
  public List<String> dueIds(String feature) {
    return repository.findByUserIdAndFeatureAndDueDateLessThanEqualOrderByDueDateAscIdAsc(
        currentUserProvider.getCurrentUserId(), feature, LocalDate.now(StudyLogService.JST)).stream()
        .map(ReviewItem::getItemId)
        .toList();
  }

  /** 機能ごとの「今日復習する数」と「復習リスト全体の数」 */
  public Map<String, ReviewSummary> summary() {
    Map<String, ReviewSummary> result = new LinkedHashMap<>();
    for (String feature : FEATURES) {
      result.put(feature, new ReviewSummary(feature, dueIds(feature).size(),
          repository.countByUserIdAndFeature(currentUserProvider.getCurrentUserId(), feature)));
    }
    return result;
  }

  /**
   * 復習モードの出題。表示中の問題(exclude)以外で、復習日が最も古いものを返す。
   * @throws IllegalArgumentException 今日の復習がもう無いとき(画面にメッセージを出す)
   */
  public String pickDue(String feature, String exclude) {
    return dueIds(feature).stream()
        .filter(id -> !id.equals(exclude))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("今日の復習はすべて終わりました"));
  }
}
