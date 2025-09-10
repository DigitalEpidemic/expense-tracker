import { act, renderHook, waitFor } from "@testing-library/react";
import * as firebaseAuth from "firebase/auth";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

// Mock Firebase auth
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../config/firebase", () => ({
  auth: {},
  googleProvider: {},
}));

vi.mock("react-hot-toast");

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state and no user", () => {
    // Mock onAuthStateChanged to return unsubscribe function
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() =>
      vi.fn()
    );

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(typeof result.current.signInWithGoogle).toBe("function");
    expect(typeof result.current.logout).toBe("function");
  });

  it("should set user when auth state changes", async () => {
    const mockUser = { email: "test@example.com", uid: "123" };

    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(
      (
        _auth: firebaseAuth.Auth,
        nextOrObserver: firebaseAuth.NextOrObserver<firebaseAuth.User>
      ) => {
        // Simulate auth state change
        if (typeof nextOrObserver === "function") {
          setTimeout(() => nextOrObserver(mockUser as firebaseAuth.User), 0);
        }
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(mockUser);
    });
  });

  it("should set loading to false when no user", async () => {
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(
      (
        _auth: firebaseAuth.Auth,
        nextOrObserver: firebaseAuth.NextOrObserver<firebaseAuth.User>
      ) => {
        // Simulate auth state change with no user
        if (typeof nextOrObserver === "function") {
          setTimeout(() => nextOrObserver(null), 0);
        }
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  it("should handle sign in with Google successfully", async () => {
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() =>
      vi.fn()
    );
    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValue(
      {} as firebaseAuth.UserCredential
    );

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Successfully signed in!");
  });

  it("should handle sign in popup blocked error", async () => {
    const error = { code: "auth/popup-blocked" };
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() =>
      vi.fn()
    );
    vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Pop-up blocked! Please allow pop-ups for this site and try again."
    );
  });

  it("should handle general sign in error", async () => {
    const error = { code: "auth/network-error" };
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() =>
      vi.fn()
    );
    vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to sign in");
  });

  it("should handle logout successfully", async () => {
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() =>
      vi.fn()
    );
    vi.mocked(firebaseAuth.signOut).mockResolvedValue();

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(firebaseAuth.signOut).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Successfully signed out!");
  });

  it("should handle logout error", async () => {
    const error = new Error("Logout failed");
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() =>
      vi.fn()
    );
    vi.mocked(firebaseAuth.signOut).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to sign out");
  });

  it("should clean up auth listener on unmount", () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(firebaseAuth.onAuthStateChanged).mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
