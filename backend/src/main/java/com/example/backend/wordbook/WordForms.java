package com.example.backend.wordbook;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 英単語の変化形(過去形・3単現・複数形など)を同じ語として扱うための規則。
 * 登録時の重複判定と、穴埋めの答え合わせに使う。辞書は持たず、規則的な変化と不規則変化の表だけで判定する。
 * 句や記号を含む語は変化させず、そのままの綴りだけを正解にする。
 */
final class WordForms {

  /** 1行目が原形、残りが変化形。よく使う不規則変化だけを並べる(表にない語は規則変化として扱う) */
  private static final String IRREGULAR_TABLE = String.join(";",
      "be am is are was were been being",
      "have has had having",
      "do does did done doing",
      "go goes went gone going",
      "get gets got gotten getting",
      "make makes made making",
      "take takes took taken taking",
      "give gives gave given giving",
      "come comes came coming",
      "see sees saw seen seeing",
      "know knows knew known knowing",
      "think thinks thought thinking",
      "find finds found finding",
      "tell tells told telling",
      "become becomes became become becoming",
      "leave leaves left leaving",
      "feel feels felt feeling",
      "bring brings brought bringing",
      "begin begins began begun beginning",
      "keep keeps kept keeping",
      "hold holds held holding",
      "write writes wrote written writing",
      "stand stands stood standing",
      "hear hears heard hearing",
      "mean means meant meaning",
      "meet meets met meeting",
      "run runs ran run running",
      "pay pays paid paying",
      "sit sits sat sitting",
      "speak speaks spoke spoken speaking",
      "lie lies lain lying",
      "lead leads led leading",
      "grow grows grew grown growing",
      "lose loses lost losing",
      "fall falls fell fallen falling",
      "send sends sent sending",
      "build builds built building",
      "understand understands understood understanding",
      "draw draws drew drawn drawing",
      "break breaks broke broken breaking",
      "spend spends spent spending",
      "rise rises rose risen rising",
      "drive drives drove driven driving",
      "buy buys bought buying",
      "wear wears wore worn wearing",
      "choose chooses chose chosen choosing",
      "forget forgets forgot forgotten forgetting",
      "hide hides hid hidden hiding",
      "eat eats ate eaten eating",
      "fly flies flew flown flying",
      "throw throws threw thrown throwing",
      "shake shakes shook shaken shaking",
      "steal steals stole stolen stealing",
      "sell sells sold selling",
      "seek seeks sought seeking",
      "catch catches caught catching",
      "teach teaches taught teaching",
      "fight fights fought fighting",
      "child children",
      "person people",
      "man men",
      "woman women",
      "foot feet",
      "mouse mice",
      "analysis analyses",
      "criterion criteria",
      "phenomenon phenomena");

  /** 変化形 → 原形(不規則変化の逆引き)。原形自身は含めない */
  private static final Map<String, String> LEMMA_OF = new HashMap<>();
  /** 原形 → 不規則変化の形 */
  private static final Map<String, Set<String>> IRREGULAR_FORMS = new HashMap<>();

  static {
    for (String row : IRREGULAR_TABLE.split(";")) {
      String[] parts = row.trim().split("\s+");
      String lemma = parts[0];
      Set<String> forms = IRREGULAR_FORMS.computeIfAbsent(lemma, k -> new LinkedHashSet<>());
      for (int i = 1; i < parts.length; i++) {
        if (!parts[i].equals(lemma)) {
          forms.add(parts[i]);
          LEMMA_OF.putIfAbsent(parts[i], lemma);
        }
      }
    }
  }

  private WordForms() {
  }

  /** 答え合わせ・照合用に綴りを揃える(前後の空白、大文字小文字、末尾の記号を無視する) */
  static String normalize(String text) {
    if (text == null) {
      return "";
    }
    String s = text.trim().toLowerCase(Locale.ROOT).replaceAll("\s+", " ");
    return s.replaceAll("[.,;:!?\"'。、]+$", "");
  }

  /** 同じ語の原形。不規則変化の形なら原形を返し、それ以外はそのまま */
  static String lemmaOf(String word) {
    String w = normalize(word);
    return LEMMA_OF.getOrDefault(w, w);
  }

  /** 原形から作れる変化形すべて(原形を含む)。原形でない語を渡したら、先に原形へ戻してから作る */
  static Set<String> inflectionsOf(String word) {
    String lemma = lemmaOf(word);
    Set<String> forms = new LinkedHashSet<>();
    forms.add(lemma);
    if (!lemma.matches("[a-z]+")) {
      return forms;
    }
    forms.addAll(IRREGULAR_FORMS.getOrDefault(lemma, Set.of()));
    addRegularForms(lemma, forms);
    return forms;
  }

  /** 同じ語かどうか(原形が一致する、または一方がもう一方の変化形)。登録の重複判定に使う */
  static boolean sameWord(String a, String b) {
    String na = normalize(a);
    String nb = normalize(b);
    if (na.equals(nb) || lemmaOf(na).equals(lemmaOf(nb))) {
      return true;
    }
    return inflectionsOf(na).contains(nb) || inflectionsOf(nb).contains(na);
  }

  /**
   * 穴埋めの答え合わせ。入力が、単語または答えの語(例文中の形)と同じ語の変化形なら正解。
   * 例:単語 run、答え ran のとき "run" "runs" "running" "ran" は正解。
   */
  static boolean matchesAnswer(String typed, String word, String answer) {
    String t = normalize(typed);
    if (t.isEmpty()) {
      return false;
    }
    return inflectionsOf(word).contains(t) || inflectionsOf(answer).contains(t) || t.equals(normalize(answer));
  }

  private static void addRegularForms(String w, Set<String> forms) {
    int n = w.length();
    boolean endsSibilant = w.matches(".*(s|x|z|ch|sh|o)");
    boolean endsConsonantY = w.matches(".*[^aeiou]y");
    // 3単現・複数形
    if (endsConsonantY) {
      forms.add(w.substring(0, n - 1) + "ies");
    } else {
      forms.add(w + "s");
      if (endsSibilant) {
        forms.add(w + "es");
      }
    }
    // 過去形・過去分詞
    if (endsConsonantY) {
      forms.add(w.substring(0, n - 1) + "ied");
    } else if (w.endsWith("e")) {
      forms.add(w + "d");
    } else {
      forms.add(w + "ed");
    }
    // 現在分詞。-ie は -ying、語末の e は落とす(ee は残す)
    if (w.endsWith("ie")) {
      forms.add(w.substring(0, n - 2) + "ying");
    } else if (w.endsWith("e") && !w.endsWith("ee")) {
      forms.add(w.substring(0, n - 1) + "ing");
    } else {
      forms.add(w + "ing");
    }
    // 子音字を重ねる綴り(stop → stopped)。1音節に近い語は重ねる形も正解にする
    if (w.matches(".*[^aeiou][aeiou][^aeiouwxy]")) {
      char last = w.charAt(n - 1);
      forms.add(w + last + "ed");
      forms.add(w + last + "ing");
    }
  }
}
