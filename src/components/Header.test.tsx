import { fireEvent, render, screen } from "@testing-library/react";
import { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as useAuthModule from "../hooks/useAuth";
import Header from "./Header";

// Mock the useAuth hook
vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the header with title and logo", () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      logout: mockLogout,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("Expense Tracker")).toBeInTheDocument();
    expect(screen.getByTitle("Sign out")).toBeInTheDocument();
  });

  it("should display user information when logged in", () => {
    const mockUser = {
      displayName: "John Doe",
      photoURL: "https://example.com/photo.jpg",
    } as User;
    const mockLogout = vi.fn();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByAltText("John Doe")).toBeInTheDocument();
    expect(screen.getByAltText("John Doe")).toHaveAttribute(
      "src",
      "https://example.com/photo.jpg"
    );
  });

  it("should display fallback alt text when user has no display name", () => {
    const mockUser = {
      displayName: null,
      photoURL: "https://example.com/photo.jpg",
    } as User;
    const mockLogout = vi.fn();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByAltText("User")).toBeInTheDocument();
  });

  it("should not display user photo when user has no photoURL", () => {
    const mockUser = {
      displayName: "John Doe",
      photoURL: null,
    } as User;
    const mockLogout = vi.fn();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByAltText("John Doe")).not.toBeInTheDocument();
  });

  it("should call logout when logout button is clicked", () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { displayName: "John Doe" } as User,
      logout: mockLogout,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(<Header />);

    const logoutButton = screen.getByTitle("Sign out");
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("should handle user with no display name gracefully", () => {
    const mockUser = {
      displayName: null,
      photoURL: null,
    } as User;
    const mockLogout = vi.fn();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("Expense Tracker")).toBeInTheDocument();
    expect(screen.getByTitle("Sign out")).toBeInTheDocument();
    // Should not display any user name
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });
});
