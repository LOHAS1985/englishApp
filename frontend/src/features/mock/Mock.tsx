import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  startMockExam,
  submitMockExam,
  type MockExamView,
  type MockItem,
  type MockResult,
  type MockSection,
  type MockSubmitSection,
} from "../../api/client";
import Header from "../../shared/components/Header";
import { LETTERS } from "../../shared/shuffle";
import ListeningPlayer from "../listening/ListeningPlayer";
import MockResultView from "./MockResultView";
import { formatClock, itemKey, numberOffsets, PART_TITLES } from "./mockFormat";
import { clearMockSession, loadMockSession, saveMockSession, type MockSession } from "./mockSession";

type Phase = "intro" | "loading" | "listening" | "reading" | "submitting" | "failed" | "result";

/** 残り時間が この秒数を切ったら、時計を赤くして知らせる */
const WARN_SECONDS = 5 * 60;

/**
 * TOEIC 模試。本番と同じ区切り・制限時間で通して解き、終わってから採点する。
 * リスニングは1セットずつ・音声は1回だけ・戻れない。リーディングは1画面で、区切りの時間が切れたら自動で提出する。
 * 提出されたときだけ結果を記録する。途中で画面を閉じても、ブラウザに保存した途中経過から再開できる(時間は進み続ける)。
 */
export default function Mock() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [exam, setExam] = useState<MockExamView | null>(null);
  /** 問題(文章・音声)ごとの答え。キーは itemKey、値は設問ごとの記号(未解答は空) */
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [listeningIndex, setListeningIndex] = useState(0);
  const [result, setResult] = useState<MockResult | null>(null);
  const [error, setError] = useState("");
  /** 区切りの開始時刻と、表示の更新用の今の時刻 */
  const [sectionStart, setSectionStart] = useState(0);
  const [now, setNow] = useState(0);
  /** 前回の中断した模試(あれば、開始前の画面から再開できる) */
  const [saved, setSaved] = useState<MockSession | null>(loadMockSession);

  // 時間切れの判定と提出は、画面の再描画を待たずに最新の値を使う必要があるので ref にも持つ
  const examRef = useRef<MockExamView | null>(null);
  const answersRef = useRef<Record<string, string[]>>({});
  const sectionStartRef = useRef(0);
  /** 区切りごとの使った秒数(提出に送る) */
  const seconds = useRef<Record<MockSection["skill"], number>>({ listening: 0, reading: 0 });

  const section = (skill: MockSection["skill"]) => exam?.sections.find((s) => s.skill === skill);

  const startSection = (skill: MockSection["skill"]) => {
    const t = Date.now();
    sectionStartRef.current = t;
    setSectionStart(t);
    setNow(t);
    setPhase(skill);
  };

  /** 区切りの時間を確定して次の区切りへ。reading の後は提出 */
  const endListening = () => {
    seconds.current.listening = Math.round((Date.now() - sectionStartRef.current) / 1000);
    startSection("reading");
  };

  /** @param retry 失敗後の再送なら、リーディングの時間は最初の提出時のまま使う */
  const submit = async (retry = false) => {
    const current = examRef.current;
    if (!current) return;
    // 再開したときに時間が切れていても、リーディングの時間は制限時間を超えて数えない
    const readingLimit = (current.sections.find((s) => s.skill === "reading")?.minutes ?? 0) * 60;
    if (!retry) {
      seconds.current.reading = Math.min(
        Math.round((Date.now() - sectionStartRef.current) / 1000),
        readingLimit || Infinity,
      );
    }
    setPhase("submitting");
    setError("");
    const sections: MockSubmitSection[] = current.sections.map((sec) => ({
      skill: sec.skill,
      durationSeconds: seconds.current[sec.skill],
      items: sec.items.map((item) => ({
        feature: item.feature,
        id: item.id,
        answers: answersRef.current[itemKey(item)] ?? [],
      })),
    }));
    try {
      setResult(await submitMockExam(sections));
      clearMockSession();
      setSaved(null);
      setPhase("result");
    } catch (e) {
      // 採点に失敗しても解答は画面に残しておき、もう一度送れるようにする(自動では再送しない)
      setError(e instanceof Error ? e.message : "模試の採点に失敗しました");
      setPhase("failed");
    }
  };

  // 区切りの時間が切れたら次へ進む(リスニングは次の区切り、リーディングは提出)
  useEffect(() => {
    if (phase !== "listening" && phase !== "reading") return;
    const limitMs = (examRef.current?.sections.find((s) => s.skill === phase)?.minutes ?? 0) * 60 * 1000;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - sectionStartRef.current >= limitMs) {
        window.clearInterval(timer);
        if (phase === "listening") endListening();
        else void submit();
      }
    }, 1000);
    return () => window.clearInterval(timer);
    // 区切りが変わったときだけ作り直す(時間の判定と提出は ref の最新の値を使う)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async () => {
    setPhase("loading");
    setError("");
    clearMockSession();
    setSaved(null);
    try {
      const view = await startMockExam();
      const initial: Record<string, string[]> = {};
      for (const sec of view.sections) {
        for (const item of sec.items) initial[itemKey(item)] = item.questions.map(() => "");
      }
      examRef.current = view;
      answersRef.current = initial;
      setExam(view);
      setAnswers(initial);
      setResult(null);
      setListeningIndex(0);
      seconds.current = { listening: 0, reading: 0 };
      startSection("listening");
    } catch (e) {
      setError(e instanceof Error ? e.message : "模試の問題を用意できませんでした");
      setPhase("intro");
    }
  };

  /** 中断した模試を続きから再開する。区切りの開始時刻はそのままなので、時間は進み続けている */
  const resume = () => {
    if (!saved) return;
    examRef.current = saved.exam;
    answersRef.current = saved.answers;
    seconds.current = { listening: saved.listeningSeconds, reading: 0 };
    sectionStartRef.current = saved.sectionStart;
    setSectionStart(saved.sectionStart);
    setNow(Date.now());
    setExam(saved.exam);
    setAnswers(saved.answers);
    setResult(null);
    setListeningIndex(saved.listeningIndex);
    setSaved(null);
    setPhase(saved.phase);
  };

  const discardSaved = () => {
    clearMockSession();
    setSaved(null);
  };

  // 解いている間は、答えと区切りの経過をブラウザに保存する(誤ってリロードしても続きから再開できる)
  useEffect(() => {
    if ((phase !== "listening" && phase !== "reading") || !exam) return;
    saveMockSession({
      phase,
      exam,
      answers,
      listeningIndex,
      sectionStart,
      listeningSeconds: seconds.current.listening,
    });
  }, [phase, exam, answers, listeningIndex, sectionStart]);

  // 解いている間に画面を閉じようとしたら、ブラウザの確認を出す
  useEffect(() => {
    if (phase !== "listening" && phase !== "reading" && phase !== "submitting" && phase !== "failed") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const choose = (item: MockItem, qi: number, letter: string) => {
    const key = itemKey(item);
    const next = {
      ...answersRef.current,
      [key]: (answersRef.current[key] ?? []).map((a, i) => (i === qi ? letter : a)),
    };
    answersRef.current = next;
    setAnswers(next);
  };

  const unansweredCount = Object.values(answers).reduce((n, list) => n + list.filter((a) => a === "").length, 0);

  if (phase === "intro" || phase === "loading") {
    return (
      <Page>
        <h1 className="font-serif text-2xl text-slate-900 mb-2">TOEIC L&R 模試</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          本番と同じ区切りと制限時間で通して解き、終わったあとに採点します。提出するまで結果は記録されません。
        </p>
        {saved && (
          <div className="mb-6 border border-amber-200 bg-amber-50 rounded p-4">
            <p className="text-sm font-semibold text-slate-900 mb-1">中断した模試があります</p>
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              {saved.phase === "listening" ? "リスニング" : "リーディング"}の途中です(中断した時点の残り時間は約{" "}
              {Math.max(
                0,
                Math.round(
                  ((saved.exam.sections.find((s) => s.skill === saved.phase)?.minutes ?? 0) * 60 -
                    (saved.savedAt - saved.sectionStart) / 1000) /
                    60,
                ),
              )}{" "}
              分)。時間は本番と同じく進み続けるので、時間が切れていれば次の区切りへ進みます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={resume}
                disabled={phase === "loading"}
                className="text-sm font-semibold text-white bg-[#8fae4e] rounded px-4 py-2 hover:bg-[#7a9843] disabled:bg-slate-400 transition-colors"
              >
                続きから再開する
              </button>
              <button
                onClick={discardSaved}
                className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded px-4 py-2 hover:border-slate-400 transition-colors"
              >
                破棄する
              </button>
            </div>
          </div>
        )}
        <ul className="text-sm text-slate-700 space-y-2 mb-6 list-disc pl-5">
          <li>リスニング 45分: Part 2・3・4 の 94 問。音声は1回だけ聞けます。セットは戻れません。</li>
          <li>リーディング 75分: Part 5・6・7 の 100 問。時間が切れると自動で提出されます。</li>
          <li>Part 1(写真描写)は写真を用意していないため含みません。</li>
          <li>結果は推定点(参考値)です。目標は 930 点(L 475 / R 455)です。</li>
        </ul>
        {error && <p className="text-sm text-[#c0392b] mb-4">{error}</p>}
        <button
          onClick={start}
          disabled={phase === "loading"}
          className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] disabled:bg-slate-400 transition-colors"
        >
          {phase === "loading" ? "問題を用意しています…" : "模試を始める"}
        </button>
      </Page>
    );
  }

  if (phase === "submitting") {
    return (
      <Page>
        <p className="text-sm text-slate-500">採点しています…</p>
      </Page>
    );
  }

  if (phase === "failed") {
    return (
      <Page>
        <p className="text-sm text-[#c0392b] mb-4">{error}</p>
        <p className="text-sm text-slate-600 mb-6">解答はこの画面に残っています。もう一度送ってください。</p>
        <button
          onClick={() => void submit(true)}
          className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] transition-colors"
        >
          もう一度送る
        </button>
      </Page>
    );
  }

  if (phase === "result" && result) {
    return (
      <Page>
        <MockResultView result={result} onRetry={() => setPhase("intro")} />
      </Page>
    );
  }

  if (!exam) return null;
  const limit = section(phase === "reading" ? "reading" : "listening")?.minutes ?? 0;
  const remaining = Math.max(0, limit * 60 - Math.floor((now - sectionStart) / 1000));
  const clock = (
    <span
      className={`font-mono text-lg font-semibold ${remaining <= WARN_SECONDS ? "text-[#c0392b]" : "text-slate-900"}`}
    >
      残り {formatClock(remaining)}
    </span>
  );

  if (phase === "listening") {
    const items = section("listening")?.items ?? [];
    const item = items[listeningIndex];
    if (!item) return null;
    const offsets = numberOffsets(items);
    const isLast = listeningIndex === items.length - 1;
    return (
      <Page>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">
            リスニング {listeningIndex + 1} / {items.length} セット
          </p>
          {clock}
        </div>
        {item.situation && (
          <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
            <span className="font-semibold">Situation: </span>
            {item.situation}
          </p>
        )}
        {item.graphic && (
          <pre className="text-xs sm:text-sm font-mono text-slate-800 bg-white border border-slate-300 rounded p-3 mb-4 overflow-x-auto">
            {item.graphic}
          </pre>
        )}
        <ListeningPlayer key={item.id} setId={item.id} allowReplay={false} />
        <div className="space-y-5 mt-6">
          {item.questions.map((q, qi) => (
            <QuestionBlock
              key={qi}
              no={offsets[listeningIndex] + qi + 1}
              question={q.question}
              choices={q.choices}
              value={answers[itemKey(item)]?.[qi] ?? ""}
              onChange={(letter) => choose(item, qi, letter)}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-8">
          <p className="text-xs text-slate-500">未解答 {unansweredCount} 問(全体)</p>
          <button
            onClick={() => (isLast ? endListening() : setListeningIndex((i) => i + 1))}
            className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] transition-colors"
          >
            {isLast ? "リスニングを終える" : "次のセット"}
          </button>
        </div>
      </Page>
    );
  }

  // リーディング(1画面で Part 5 → 6 → 7 の順に解く)
  const items = section("reading")?.items ?? [];
  const offsets = numberOffsets(items);
  const unansweredReading = items.reduce(
    (n, item) => n + (answers[itemKey(item)] ?? []).filter((a) => a === "").length,
    0,
  );
  return (
    <Page>
      <div className="sticky top-0 z-10 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-white/95 border-b border-slate-200 flex items-center justify-between mb-6">
        <p className="text-sm font-semibold text-slate-700">リーディング(未解答 {unansweredReading} 問)</p>
        <div className="flex items-center gap-4">
          {clock}
          <button
            onClick={() => {
              if (unansweredReading > 0 && !window.confirm(`未解答が ${unansweredReading} 問あります。提出しますか?`)) return;
              void submit();
            }}
            className="text-sm font-semibold text-white bg-[#8fae4e] rounded px-4 py-2 hover:bg-[#7a9843] transition-colors"
          >
            提出する
          </button>
        </div>
      </div>
      <div className="space-y-10">
        {items.map((item, idx) => {
          const heading = idx === 0 || items[idx - 1].type !== item.type ? PART_TITLES[item.type] : null;
          return (
            <div key={itemKey(item)}>
              {heading && <h2 className="font-serif text-lg text-slate-900 mb-4 border-b border-slate-200 pb-2">{heading}</h2>}
              {item.passage && (
                <div
                  className={`mb-4 text-slate-800 whitespace-pre-wrap ${
                    item.feature === "grammar"
                      ? "text-base"
                      : "font-serif text-[0.9375rem] leading-7 border border-slate-200 rounded-md p-4 bg-slate-50"
                  }`}
                >
                  {item.passage}
                </div>
              )}
              {item.graphic && (
                <pre className="text-xs sm:text-sm font-mono text-slate-800 bg-white border border-slate-300 rounded p-3 mb-4 overflow-x-auto">
                  {item.graphic}
                </pre>
              )}
              <div className="space-y-4">
                {item.questions.map((q, qi) => (
                  <QuestionBlock
                    key={qi}
                    no={offsets[idx] + qi + 1}
                    question={q.question}
                    choices={q.choices}
                    value={answers[itemKey(item)]?.[qi] ?? ""}
                    onChange={(letter) => choose(item, qi, letter)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-4 py-8 sm:px-5 sm:py-12">
        <div className="w-full max-w-[47.5rem] question-card bg-white border border-slate-200 rounded-md p-5 sm:p-8">
          {children}
          <p className="mt-10 text-xs text-slate-400">
            <Link to="/" className="underline">ホームに戻る</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/** 1問分。音声だけの形式(Part 2)は選択肢の文字が無いので記号だけを出す */
function QuestionBlock({
  no,
  question,
  choices,
  value,
  onChange,
}: {
  no: number;
  question: string;
  choices: string[];
  value: string;
  onChange: (letter: string) => void;
}) {
  return (
    <div className="border border-slate-200 rounded-md p-4">
      <p className="text-sm font-semibold text-slate-900 mb-3">
        {question ? `No. ${no}. ${question}` : `No. ${no}`}
      </p>
      <div className="space-y-2">
        {choices.map((text, ci) => {
          const letter = LETTERS[ci];
          const selected = value === letter;
          return (
            <button
              key={letter}
              onClick={() => onChange(letter)}
              className={`w-full text-left border rounded px-3 py-2.5 text-sm transition-colors ${
                selected ? "border-[#8fae4e] bg-[#f2f7ea]" : "border-slate-200 hover:border-[#8fae4e]"
              }`}
            >
              <span className="font-mono font-semibold mr-2">({letter})</span>
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
