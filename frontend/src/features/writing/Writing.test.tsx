// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWritingQuestion, type WritingQuestion } from "../../api/client";
import { loadDraft, saveDraft } from "../../shared/draft";
import Writing from "./Writing";

vi.mock("../../shared/components/Header", () => ({ default: () => null }));
vi.mock("../../api/client", () => ({ fetchWritingQuestion: vi.fn(), scoreWritingAnswer: vi.fn() }));

const QUESTION: WritingQuestion = {
  id: "w0001",
  type: "opinion",
  prompt: "Write an essay on the given TOPIC.",
  topic: "Should cities ban cars?",
  points: ["Cost", "Health"],
  passage: null,
  minWords: 120,
  maxWords: 150,
  theme: null,
};

const renderWriting = () =>
  render(
    <MemoryRouter initialEntries={["/writing?type=opinion"]}>
      <Writing />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchWritingQuestion).mockReset();
});
afterEach(cleanup);

describe("ライティング: 下書きの復元", () => {
  it("下書きのお題を取得できなくても、下書きを消さず、もう一度試せる", async () => {
    saveDraft("writing-opinion", "w0001", "My opinion is that");
    vi.mocked(fetchWritingQuestion).mockRejectedValueOnce(new Error("通信できませんでした")).mockResolvedValue(QUESTION);

    renderWriting();

    expect(await screen.findByText(/前回の下書きのお題を取得できませんでした/)).toBeTruthy();
    expect(loadDraft("writing-opinion")?.value).toBe("My opinion is that");

    await userEvent.click(screen.getByRole("button", { name: "もう一度試す" }));

    // 同じお題と下書きが戻る
    expect(await screen.findByText("Should cities ban cars?")).toBeTruthy();
    expect((screen.getByLabelText(/回答/) as HTMLTextAreaElement).value).toBe("My opinion is that");
  });

  it("取得できていないまま新しいお題を出すときは、下書きを破棄してよいか確かめる", async () => {
    saveDraft("writing-opinion", "w0001", "My opinion is that");
    vi.mocked(fetchWritingQuestion).mockRejectedValueOnce(new Error("通信できませんでした"));
    renderWriting();
    await screen.findByText(/前回の下書きのお題を取得できませんでした/);

    // 取り消すと、下書きも画面もそのまま
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await userEvent.click(screen.getByRole("button", { name: "問題を出題する" }));
    expect(confirm).toHaveBeenCalled();
    expect(loadDraft("writing-opinion")).not.toBeNull();
    expect(fetchWritingQuestion).toHaveBeenCalledTimes(1);

    // 破棄に同意すると、新しいお題を出す
    confirm.mockReturnValue(true);
    vi.mocked(fetchWritingQuestion).mockResolvedValueOnce({ ...QUESTION, id: "w0002", topic: "Another topic" });
    await userEvent.click(screen.getByRole("button", { name: "問題を出題する" }));
    await waitFor(() => expect(screen.getByText("Another topic")).toBeTruthy());
    confirm.mockRestore();
  });
});
