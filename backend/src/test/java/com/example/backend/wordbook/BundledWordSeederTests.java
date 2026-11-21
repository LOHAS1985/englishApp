package com.example.backend.wordbook;

import com.example.backend.common.AppState;
import com.example.backend.common.AppStateRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.wordbook.BundledWordBank.BundledWord;
import com.example.backend.wordbook.BundledWordBank.Example;
import com.example.backend.wordbook.WordbookWord.Source;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** 同梱語の投入と更新(JSON を直したら、利用者の出題状況や色を残したまま本番の単語帳に反映する) */
class BundledWordSeederTests {

  private static final Long USER = 1L;
  private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 22, 9, 0);

  private final List<WordbookWord> stored = new ArrayList<>();
  private final List<DeletedBundledWord> tombstones = new ArrayList<>();
  private AppState state;
  private final WordbookWordRepository words = mock(WordbookWordRepository.class);
  private final DeletedBundledWordRepository deleted = mock(DeletedBundledWordRepository.class);
  private final AppStateRepository states = mock(AppStateRepository.class);
  private final CurrentUserProvider user = mock(CurrentUserProvider.class);

  @BeforeEach
  void wire() {
    when(user.getCurrentUserId()).thenReturn(USER);
    when(words.findByUserIdOrderByIdAsc(USER)).thenAnswer(i -> List.copyOf(stored));
    when(words.save(any(WordbookWord.class))).thenAnswer(i -> {
      WordbookWord w = i.getArgument(0);
      if (!stored.contains(w)) {
        stored.add(w);
      }
      return w;
    });
    when(deleted.findByUserId(USER)).thenAnswer(i -> List.copyOf(tombstones));
    when(deleted.save(any(DeletedBundledWord.class))).thenAnswer(i -> {
      tombstones.add(i.getArgument(0));
      return i.getArgument(0);
    });
    when(states.findById(anyString())).thenAnswer(i -> Optional.ofNullable(state));
    when(states.save(any(AppState.class))).thenAnswer(i -> {
      state = i.getArgument(0);
      return state;
    });
  }

  private static BundledWord item(String id, String word, String meaning) {
    return new BundledWord(id, word, meaning,
        new Example("We must " + word + " it today.", word, "今日それを" + meaning + "。"));
  }

  private BundledWordSeeder seeder(BundledWord... items) {
    return new BundledWordSeeder(new BundledWordBank(List.of(items)), words, deleted, states, user);
  }

  private WordbookWord stored(String word) {
    return stored.stream().filter(w -> w.getWord().equals(word)).findFirst().orElseThrow();
  }

  /** 旧版が入れた語(同梱の ID を持たない) */
  private WordbookWord legacy(BundledWord item) {
    WordbookWord w = new WordbookWord(USER, item.word(), Source.BUNDLED, NOW);
    w.setExample(item.example().en(), item.example().answer());
    w.applyTranslation(item.meaningJa(), item.example().ja(), NOW);
    stored.add(w);
    return w;
  }

  @Test
  void freshInstallAddsEveryWordLinkedToItsBundledId() {
    seeder(item("w0001", "abandon", "捨てる"), item("w0002", "abolish", "廃止する")).seedIfNeeded();

    assertThat(stored).hasSize(2);
    assertThat(stored("abandon").getBundledId()).isEqualTo("w0001");
    assertThat(stored("abandon").getMeaningJa()).isEqualTo("捨てる");
    assertThat(stored("abandon").getTranslationStatus()).isEqualTo(WordbookWord.TranslationStatus.DONE);
    assertThat(stored("abandon").isUserEdited()).isFalse();
  }

  @Test
  void unchangedContentIsNotAppliedAgain() {
    BundledWordSeeder seeder = seeder(item("w0001", "abandon", "捨てる"));
    seeder.seedIfNeeded();
    // 利用者が削除した語は、同じ内容のままなら戻らない
    stored.clear();

    seeder.seedIfNeeded();

    assertThat(stored).isEmpty();
  }

  @Test
  void changedContentUpdatesTheMeaningAndKeepsTheLearningState() {
    seeder(item("w0001", "abandon", "捨てる")).seedIfNeeded();
    WordbookWord w = stored("abandon");
    w.setColor(WordbookColor.YELLOW, NOW);
    w.recordAnswer(true, NOW);

    seeder(item("w0001", "abandon", "を断念する")).seedIfNeeded();

    assertThat(w.getMeaningJa()).isEqualTo("を断念する");
    assertThat(w.getExampleJa()).isEqualTo("今日それをを断念する。");
    // 色・出題回数・復習日は残す
    assertThat(w.getColor()).isEqualTo(WordbookColor.YELLOW);
    assertThat(w.getTimesAsked()).isEqualTo(1);
    assertThat(w.getNextDueDate()).isNotNull();
    assertThat(stored).hasSize(1);
  }

  @Test
  void wordsEditedByTheUserAreNotOverwritten() {
    seeder(item("w0001", "abandon", "捨てる")).seedIfNeeded();
    WordbookWord w = stored("abandon");
    w.editMeaning("自分で直した訳", NOW);

    seeder(item("w0001", "abandon", "を断念する")).seedIfNeeded();

    assertThat(w.getMeaningJa()).isEqualTo("自分で直した訳");
  }

  @Test
  void newWordsInTheBundleAreAddedLaterButDeletedOnesAreNotRestored() {
    seeder(item("w0001", "abandon", "捨てる"), item("w0002", "abolish", "廃止する")).seedIfNeeded();
    // 利用者が abolish を削除した(WordbookService.delete と同じ記録を残す)
    stored.remove(stored("abolish"));
    tombstones.add(new DeletedBundledWord(USER, "w0002"));

    seeder(item("w0001", "abandon", "捨てる"), item("w0002", "abolish", "廃止する"), item("w0003", "abstain", "控える"))
        .seedIfNeeded();

    assertThat(stored).extracting(WordbookWord::getWord).containsExactlyInAnyOrder("abandon", "abstain");
  }

  @Test
  void upgradingFromTheOldVersionLinksExistingWordsAndTreatsMissingOnesAsDeleted() {
    BundledWord abandon = item("w0001", "abandon", "捨てる");
    BundledWord abolish = item("w0002", "abolish", "廃止する");
    BundledWord abstain = item("w0003", "abstain", "控える");
    legacy(abandon);
    WordbookWord edited = legacy(abolish);
    edited.editMeaning("利用者が直した訳", NOW); // 旧版には「直した」記録が無いので、内容が同梱と違うことで見分ける
    // w0003 は旧版の投入後に利用者が削除した語(単語帳に無い)
    state = new AppState(BundledWordSeeder.STATE_KEY, BundledWordSeeder.LEGACY_VERSION);

    seeder(abandon, abolish, abstain).seedIfNeeded();

    assertThat(stored).extracting(WordbookWord::getWord).containsExactlyInAnyOrder("abandon", "abolish");
    assertThat(stored("abandon").getBundledId()).isEqualTo("w0001");
    assertThat(stored("abandon").isUserEdited()).isFalse();
    assertThat(stored("abolish").getBundledId()).isEqualTo("w0002");
    assertThat(stored("abolish").isUserEdited()).isTrue();
    assertThat(stored("abolish").getMeaningJa()).isEqualTo("利用者が直した訳");
    assertThat(tombstones).extracting(DeletedBundledWord::getBundledId).containsExactly("w0003");
  }

  @Test
  void upgradedWordsAreUpdatedByLaterBundleChanges() {
    BundledWord abandon = item("w0001", "abandon", "捨てる");
    legacy(abandon);
    state = new AppState(BundledWordSeeder.STATE_KEY, BundledWordSeeder.LEGACY_VERSION);
    seeder(abandon).seedIfNeeded();

    seeder(item("w0001", "abandon", "を断念する")).seedIfNeeded();

    assertThat(stored("abandon").getMeaningJa()).isEqualTo("を断念する");
  }

  @Test
  void wordsTheUserRegisteredHimselfAreLeftAlone() {
    WordbookWord mine = new WordbookWord(USER, "abandon", Source.MANUAL, NOW);
    mine.editMeaning("自分の訳", NOW);
    stored.add(mine);

    seeder(item("w0001", "abandon", "捨てる")).seedIfNeeded();

    assertThat(stored).hasSize(1);
    assertThat(mine.getBundledId()).isNull();
    assertThat(mine.getMeaningJa()).isEqualTo("自分の訳");
  }

  @Test
  void contentHashChangesWhenTheBundleIsEdited() {
    String before = new BundledWordBank(List.of(item("w0001", "abandon", "捨てる"))).contentHash();
    String same = new BundledWordBank(List.of(item("w0001", "abandon", "捨てる"))).contentHash();
    String edited = new BundledWordBank(List.of(item("w0001", "abandon", "断念する"))).contentHash();

    assertThat(same).isEqualTo(before);
    assertThat(edited).isNotEqualTo(before).hasSize(16);
  }
}
