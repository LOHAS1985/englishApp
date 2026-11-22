// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPracticeSet, submitPracticeAnswers, type QuestionSetView } from "../../api/client";
import PracticeSetPage from "./PracticeSetPage";

vi.mock("./Header", () => ({ default: () => null }));
vi.mock("../../api/client", () => ({ fetchPracticeSet: vi.fn(), submitPracticeAnswers: vi.fn() }));

const set = (id: string): QuestionSetView => ({
  id,
  type: "toeic-part3",
  title: id,
  passage: null,
  situation: null,
  graphic: null,
  questions: [{ question: `Question of ${id}`, choices: ["one", "two", "three", "four"] }],
  difficulty: 2,
  theme: null,
});

beforeEach(() => {
  vi.mocked(fetchPracticeSet).mockReset();
  vi.mocked(submitPracticeAnswers).mockReset().mockResolvedValue({
    score: 1,
    total: 1,
    results: [{ correct: true, selected: "A", answer: "A", explanation: "" }],
    script: null,
    translation: null,
  });
});
afterEach(cleanup);

describe("セット問題: 次のセットの先読み", () => {
  it("解答した時点で次のセットを選んで知らせ、「次の問題」では選び直さない", async () => {
    vi.mocked(fetchPracticeSet)
      .mockResolvedValueOnce(set("l0001"))
      .mockResolvedValueOnce(set("l0002"))
      .mockReturnValue(new Promise(() => {}));
    const onNextPicked = vi.fn();

    render(
      <MemoryRouter initialEntries={["/listening?type=toeic-part3"]}>
        <PracticeSetPage
          feature="listening"
          types={["toeic-part3"]}
          showTitle={false}
          renderMaterial={() => null}
          onNextPicked={onNextPicked}
        />
      </MemoryRouter>,
    );

    await screen.findByText("Q1. Question of l0001");
    // 解答する前は、次のセットを選ばない
    expect(fetchPracticeSet).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /one/ }));
    await userEvent.click(screen.getByRole("button", { name: "解答する" }));

    await waitFor(() => expect(onNextPicked).toHaveBeenCalledWith(expect.objectContaining({ id: "l0002" })));
    // 表示中のセットは候補から外している
    expect(vi.mocked(fetchPracticeSet).mock.calls[1]?.[2]).toBe("l0001");

    await userEvent.click(screen.getByRole("button", { name: /次の問題/ }));

    expect(await screen.findByText("Q1. Question of l0002")).toBeTruthy();
    expect(fetchPracticeSet).toHaveBeenCalledTimes(2);
  });
});

describe("セット問題: リスニングの台本", () => {
  it("採点結果は台本を待たずに出し、台本は遅れて届いたら付ける", async () => {
    vi.mocked(fetchPracticeSet).mockResolvedValueOnce(set("l0001")).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/listening?type=toeic-part3"]}>
        <PracticeSetPage
          feature="listening"
          types={["toeic-part3"]}
          showTitle={false}
          renderMaterial={() => null}
          renderAfterAnswer={(_, result) => (result.script ? <p>台本: {result.script}</p> : null)}
        />
      </MemoryRouter>,
    );

    await screen.findByText("Q1. Question of l0001");
    await userEvent.click(screen.getByRole("button", { name: /one/ }));
    await userEvent.click(screen.getByRole("button", { name: "解答する" }));

    // 台本はまだ届いていないが、採点結果は出る
    expect(await screen.findByText("1 / 1")).toBeTruthy();
    expect(screen.queryByText(/台本:/)).toBeNull();

    // 台本が届いたら、結果に付く
    const onReveal = vi.mocked(submitPracticeAnswers).mock.calls[0]?.[5];
    expect(onReveal).toBeTypeOf("function");
    act(() => onReveal?.({ script: "Man: Hello.", translation: "こんにちは" }));
    expect(await screen.findByText("台本: Man: Hello.")).toBeTruthy();
  });
});

describe("セット問題: 解答するまで設問文を隠す形式", () => {
  const eiken = (id: string): QuestionSetView => ({ ...set(id), type: "eiken-part1" });

  it("設問文は解答するまで出さず、解答したあとに出す(選択肢は出したまま)", async () => {
    vi.mocked(fetchPracticeSet).mockResolvedValueOnce(eiken("l0001")).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/listening?type=eiken-part1"]}>
        <PracticeSetPage
          feature="listening"
          types={["eiken-part1"]}
          showTitle={false}
          renderMaterial={() => null}
          hideQuestionTypes={["eiken-part1"]}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No. 1")).toBeTruthy();
    expect(screen.queryByText(/Question of l0001/)).toBeNull();
    expect(screen.getByRole("button", { name: /one/ })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /one/ }));
    await userEvent.click(screen.getByRole("button", { name: "解答する" }));

    expect(await screen.findByText("Q1. Question of l0001")).toBeTruthy();
  });
});

describe("セット問題: 復習モード(?review=1)", () => {
  it("復習のとき、今日復習する設問を含むセットを頼む", async () => {
    vi.mocked(fetchPracticeSet).mockResolvedValueOnce(set("r0001")).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/reading/practice?type=toeic-part7&review=1"]}>
        <PracticeSetPage feature="reading" types={["toeic-part7"]} showTitle={false} renderMaterial={() => null} />
      </MemoryRouter>,
    );

    await screen.findByText("Q1. Question of r0001");
    expect(vi.mocked(fetchPracticeSet).mock.calls[0]?.[4]).toBe(true);
  });
});
