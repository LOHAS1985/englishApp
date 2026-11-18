package com.example.backend.common;

import java.util.function.Supplier;

/**
 * 元データの「印」(TableSignature など)が前回と同じなら、計算済みの結果を返す1件だけのキャッシュ。
 * レベルや弱点分析は全記録の集計で、記録が増えるまで結果は変わらないので、毎回全件を読んで計算し直さない。
 *
 * <p>
 * 呼び出し側は、印を先に読んでからデータを読むこと。読む間に記録が増えても、新しいデータが古い印で
 * 保存されるだけで、次の呼び出しで印が変わって計算し直される(古いデータが新しい印で残ることはない)。
 * 保存する値は変更されない(不変の)ものにする。
 */
public final class SignatureCache<V> {

  private record Entry<V>(Object signature, V value) {
  }

  private volatile Entry<V> entry;

  public V get(Object signature, Supplier<V> compute) {
    Entry<V> current = entry;
    if (current != null && current.signature().equals(signature)) {
      return current.value();
    }
    // 同時に何度も計算しない(起動直後のウォームアップと画面の呼び出しが重なる)
    synchronized (this) {
      current = entry;
      if (current != null && current.signature().equals(signature)) {
        return current.value();
      }
      V value = compute.get();
      entry = new Entry<>(signature, value);
      return value;
    }
  }
}
