import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsDesktop, useIsMobile, useMediaQuery } from "./useMediaQuery";

// Mock window.matchMedia
const createMockMatchMedia = (matches: boolean) => {
  const mockMatchMedia = vi.fn().mockImplementation((query) => {
    const listeners: ((event: MediaQueryListEvent) => void)[] = [];

    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(
        (event: string, handler: (event: MediaQueryListEvent) => void) => {
          if (event === "change") {
            listeners.push(handler);
          }
        }
      ),
      removeEventListener: vi.fn(
        (event: string, handler: (event: MediaQueryListEvent) => void) => {
          if (event === "change") {
            const index = listeners.indexOf(handler);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }
      ),
      dispatchEvent: vi.fn(),
      // Helper to trigger change events
      triggerChange: (newMatches: boolean) => {
        listeners.forEach((listener) => {
          listener({ matches: newMatches } as MediaQueryListEvent);
        });
      },
    };
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });

  return mockMatchMedia;
};

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return false initially when media query does not match", () => {
    createMockMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(false);
  });

  it("should return true initially when media query matches", () => {
    createMockMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(true);
  });

  it("should update when media query match changes", () => {
    const mockMatchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(false);

    // Get the mock media query list instance
    const mockMediaQueryList = mockMatchMedia.mock.results[0].value;

    // Trigger a change event
    act(() => {
      mockMediaQueryList.triggerChange(true);
    });

    expect(result.current).toBe(true);
  });

  it("should clean up event listeners on unmount", () => {
    const mockMatchMedia = createMockMatchMedia(false);

    const { unmount } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    const mockMediaQueryList = mockMatchMedia.mock.results[0].value;

    unmount();

    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalled();
  });

  it("should re-register listeners when query changes", () => {
    const mockMatchMedia = createMockMatchMedia(false);

    const { rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: "(max-width: 768px)" },
    });

    // Change the query
    rerender({ query: "(min-width: 769px)" });

    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 768px)");
    expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 769px)");
  });
});

describe("useIsMobile", () => {
  it("should use the correct media query for mobile", () => {
    const mockMatchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 767px)");
    expect(result.current).toBe(true);
  });
});

describe("useIsDesktop", () => {
  it("should use the correct media query for desktop", () => {
    const mockMatchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsDesktop());

    expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 768px)");
    expect(result.current).toBe(false);
  });
});
