import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SummaryCards from "./SummaryCards";

describe("SummaryCards", () => {
  const defaultProps = {
    total: 1000.5,
    reimbursed: 400.25,
    pending: 600.25,
  };

  it("should render all three cards with correct titles", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText("Total Spent")).toBeInTheDocument();
    expect(screen.getByText("Reimbursed")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("should display formatted currency amounts", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText("$1,000.50")).toBeInTheDocument();
    expect(screen.getByText("$400.25")).toBeInTheDocument();
    expect(screen.getByText("$600.25")).toBeInTheDocument();
  });

  it("should handle zero values", () => {
    const zeroProps = {
      total: 0,
      reimbursed: 0,
      pending: 0,
    };

    render(<SummaryCards {...zeroProps} />);

    const zeroAmounts = screen.getAllByText("$0.00");
    expect(zeroAmounts).toHaveLength(3);
  });

  it("should handle large amounts", () => {
    const largeProps = {
      total: 1234567.89,
      reimbursed: 567890.12,
      pending: 666677.77,
    };

    render(<SummaryCards {...largeProps} />);

    expect(screen.getByText("$1,234,567.89")).toBeInTheDocument();
    expect(screen.getByText("$567,890.12")).toBeInTheDocument();
    expect(screen.getByText("$666,677.77")).toBeInTheDocument();
  });

  it("should handle negative amounts", () => {
    const negativeProps = {
      total: -100.5,
      reimbursed: -50.25,
      pending: -50.25,
    };

    render(<SummaryCards {...negativeProps} />);

    expect(screen.getByText("-$100.50")).toBeInTheDocument();
    const negativeAmounts = screen.getAllByText("-$50.25");
    expect(negativeAmounts).toHaveLength(2); // Reimbursed and Pending both show -$50.25
  });

  it("should apply correct CSS classes for different card colors", () => {
    const { container } = render(<SummaryCards {...defaultProps} />);

    // Check that cards have different background colors
    const cards = container.querySelectorAll('[class*="bg-"]');
    expect(cards).toHaveLength(3);

    // Total card should have blue background
    expect(container.querySelector(".bg-blue-50")).toBeInTheDocument();
    // Reimbursed card should have green background
    expect(container.querySelector(".bg-green-50")).toBeInTheDocument();
    // Pending card should have amber background
    expect(container.querySelector(".bg-amber-50")).toBeInTheDocument();
  });

  it("should display icons for each card", () => {
    const { container } = render(<SummaryCards {...defaultProps} />);

    // Check that there are 3 icons (one for each card)
    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(3);
  });

  it("should use responsive grid layout", () => {
    const { container } = render(<SummaryCards {...defaultProps} />);

    const gridContainer = container.querySelector(".grid");
    expect(gridContainer).toHaveClass("grid-cols-1", "md:grid-cols-3", "gap-4");
  });

  it("should render cards in correct order", () => {
    render(<SummaryCards {...defaultProps} />);

    const titles = screen.getAllByText(/Total Spent|Reimbursed|Pending/);
    expect(titles[0]).toHaveTextContent("Total Spent");
    expect(titles[1]).toHaveTextContent("Reimbursed");
    expect(titles[2]).toHaveTextContent("Pending");
  });
});
