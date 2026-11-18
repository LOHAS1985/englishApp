package com.example.backend.common;

/**
 * 利用者の記録が増えたかどうかを、全件を読まずに判定するための印(件数と最大 ID)。
 * 記録は追記だけなので、件数か最大 ID が変わらなければ内容も変わっていない。
 */
public interface TableSignature {
  long getCount();

  long getMaxId();
}
