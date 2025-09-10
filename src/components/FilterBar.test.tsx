import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FilterBar from "./FilterBar";

describe("FilterBar", () => {
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all filter buttons", () => {
    render(<FilterBar filter="all" onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText("All Expenses")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Reimbursed")).toBeInTheDocument();
  });

  it("should highlight the active filter", () => {
    render(<FilterBar filter="pending" onFilterChange={mockOnFilterChange} />);

    const pendingButton = screen.getByText("Pending");
    expect(pendingButton).toHaveClass("bg-blue-100", "text-blue-700");

    const allButton = screen.getByText("All Expenses");
    expect(allButton).toHaveClass("text-gray-600");
    expect(allButton).not.toHaveClass("bg-blue-100", "text-blue-700");
  });

  it("should call onFilterChange when a filter button is clicked", () => {
    render(<FilterBar filter="all" onFilterChange={mockOnFilterChange} />);

    const pendingButton = screen.getByText("Pending");
    fireEvent.click(pendingButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith("pending");
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  it("should call onFilterChange with correct filter value for each button", () => {
    render(<FilterBar filter="all" onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByText("All Expenses"));
    expect(mockOnFilterChange).toHaveBeenCalledWith("all");

    fireEvent.click(screen.getByText("Pending"));
    expect(mockOnFilterChange).toHaveBeenCalledWith("pending");

    fireEvent.click(screen.getByText("Reimbursed"));
    expect(mockOnFilterChange).toHaveBeenCalledWith("reimbursed");
  });

  it("should display filter icon", () => {
    const { container } = render(
      <FilterBar filter="all" onFilterChange={mockOnFilterChange} />
    );

    const filterIcon = container.querySelector("svg");
    expect(filterIcon).toBeInTheDocument();
    expect(filterIcon).toHaveClass("text-gray-400");
  });

  it('should highlight "all" filter when active', () => {
    render(<FilterBar filter="all" onFilterChange={mockOnFilterChange} />);

    const allButton = screen.getByText("All Expenses");
    expect(allButton).toHaveClass("bg-blue-100", "text-blue-700");
  });

  it('should highlight "reimbursed" filter when active', () => {
    render(
      <FilterBar filter="reimbursed" onFilterChange={mockOnFilterChange} />
    );

    const reimbursedButton = screen.getByText("Reimbursed");
    expect(reimbursedButton).toHaveClass("bg-blue-100", "text-blue-700");

    const allButton = screen.getByText("All Expenses");
    expect(allButton).not.toHaveClass("bg-blue-100", "text-blue-700");
  });

  it("should have proper styling for inactive buttons", () => {
    render(<FilterBar filter="pending" onFilterChange={mockOnFilterChange} />);

    const allButton = screen.getByText("All Expenses");
    const reimbursedButton = screen.getByText("Reimbursed");

    expect(allButton).toHaveClass("text-gray-600", "hover:bg-gray-100");
    expect(reimbursedButton).toHaveClass("text-gray-600", "hover:bg-gray-100");
  });

  it("should render buttons in correct order", () => {
    render(<FilterBar filter="all" onFilterChange={mockOnFilterChange} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("All Expenses");
    expect(buttons[1]).toHaveTextContent("Pending");
    expect(buttons[2]).toHaveTextContent("Reimbursed");
  });
});
