import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { debounce } from "../../src/lib/debounce";

describe("debounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("executes only the last call after delay", () => {
    const handler = jest.fn<(value: string) => void>();
    const debounced = debounce(handler, 100);

    debounced("a");
    debounced("b");
    debounced("c");

    expect(handler).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(100);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("c");
  });

  it("does not execute when cancelled", () => {
    const handler = jest.fn<() => void>();
    const debounced = debounce(handler, 100);

    debounced();
    debounced.cancel();
    jest.advanceTimersByTime(100);

    expect(handler).not.toHaveBeenCalled();
  });
});
