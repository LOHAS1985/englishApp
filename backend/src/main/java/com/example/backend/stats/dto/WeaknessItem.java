package com.example.backend.stats.dto;

/**
 * 分野・設問タイプ別の成績(弱点分析)。
 *
 * @param feature  grammar / vocab / reading / listening
 * @param type     試験の形式(toeic-part5, toeic-part7 など)
 * @param category 文法の分野(時制・関係詞など)、語彙の品詞、読解・リスニングの設問タイプ(推測・NOT問題など)
 */
public record WeaknessItem(String feature, String type, String category, int correct, int total) {
}
