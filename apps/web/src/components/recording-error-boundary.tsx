"use client";

import { Component, type ReactNode } from "react";
import { Button } from "./ui/button";

interface RecordingErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface RecordingErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RecordingErrorBoundary extends Component<
  RecordingErrorBoundaryProps,
  RecordingErrorBoundaryState
> {
  constructor(props: RecordingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RecordingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error("RecordingErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-bold text-destructive">
              Recording Error
            </h2>
            <p className="text-muted-foreground">
              The recording interface encountered an error. Please check your
              microphone permissions and try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
              >
                Try Again
              </Button>
              <Button
                onClick={() => {
                  window.location.reload();
                }}
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

