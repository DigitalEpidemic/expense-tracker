import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthScreen from "./AuthScreen";

// Mock the useAuth hook
const mockSignInWithGoogle = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

describe("AuthScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the welcome screen with title and description", () => {
    render(<AuthScreen />);

    expect(screen.getByText("Welcome to Expense Tracker")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track your expenses, manage reimbursements, and stay on budget."
      )
    ).toBeInTheDocument();
  });

  it("should render the Google sign-in button", () => {
    render(<AuthScreen />);

    const signInButton = screen.getByText("Continue with Google");
    expect(signInButton).toBeInTheDocument();
    expect(signInButton.tagName).toBe("BUTTON");
  });

  it("should call signInWithGoogle when the sign-in button is clicked", () => {
    render(<AuthScreen />);

    const signInButton = screen.getByText("Continue with Google");
    fireEvent.click(signInButton);

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("should display the privacy message", () => {
    render(<AuthScreen />);

    expect(
      screen.getByText(
        "Your data is securely stored and only accessible by you."
      )
    ).toBeInTheDocument();
  });

  it("should render the login icon", () => {
    const { container } = render(<AuthScreen />);

    // The LogIn icon should be present
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should have the correct styling classes", () => {
    const { container } = render(<AuthScreen />);

    // Check for gradient background
    const backgroundDiv = container.querySelector(".bg-gradient-to-br");
    expect(backgroundDiv).toBeInTheDocument();
    expect(backgroundDiv).toHaveClass("from-blue-50", "to-indigo-100");

    // Check for card styling
    const card = container.querySelector(".bg-white.rounded-2xl");
    expect(card).toBeInTheDocument();
  });

  it("should render Google logo in the sign-in button", () => {
    const { container } = render(<AuthScreen />);

    // Google logo SVG should be present in the button
    const button = screen.getByText("Continue with Google").closest("button");
    const googleLogo = button?.querySelector('svg[viewBox="0 0 24 24"]');
    expect(googleLogo).toBeInTheDocument();
  });

  it("should have proper accessibility attributes", () => {
    render(<AuthScreen />);

    const signInButton = screen.getByText("Continue with Google");
    expect(signInButton.tagName).toBe("BUTTON");
    expect(signInButton).toHaveRole("button");
  });

  it("should have responsive layout classes", () => {
    const { container } = render(<AuthScreen />);

    const mainContainer = container.querySelector(".min-h-screen");
    expect(mainContainer).toHaveClass(
      "flex",
      "items-center",
      "justify-center",
      "p-4"
    );

    const card = container.querySelector(".w-full.max-w-md");
    expect(card).toBeInTheDocument();
  });

  it("should center the content properly", () => {
    const { container } = render(<AuthScreen />);

    const textCenter = container.querySelector(".text-center");
    expect(textCenter).toBeInTheDocument();

    const iconContainer = container.querySelector(".mx-auto");
    expect(iconContainer).toBeInTheDocument();
  });
});
