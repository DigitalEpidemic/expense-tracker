import React from "react";

interface LoadingSpinnerProps {
  testId?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  testId = "loading-spinner",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-blue-600`}
      data-testid={testId}
    />
  );
};

export default LoadingSpinner;
