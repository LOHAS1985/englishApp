package com.example.backend.stats.dto;

/**
 * 技能ごとの難易度4(難関)の成績。available は問題集にある難易度4の問題数、answered と correct は
 * 解いた設問数と正解数(設問ごと。セット問題は設問単位で数える)。
 */
public record DifficultyItem(String feature, int available, int answered, int correct) {
}
