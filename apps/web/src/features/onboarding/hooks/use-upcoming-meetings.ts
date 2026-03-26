"use client";

import { useCallback, useEffect, useState } from "react";

export interface UpcomingMeeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  isToday: boolean;
  isTomorrow: boolean;
  recordingEnabled: boolean;
}

interface UseUpcomingMeetingsResult {
  meetings: UpcomingMeeting[];
  isLoading: boolean;
  toggleMeetingRecording: (meetingId: string) => void;
  toggleAllRecordings: (enabled: boolean) => void;
}

/**
 * Fetches upcoming calendar meetings and manages per-meeting recording toggles.
 * In production this would call a server action; for onboarding we simulate
 * the meeting list from calendar data to avoid coupling to the full meetings
 * feature during the initial setup flow.
 */
export function useUpcomingMeetings(
  isConnected: boolean,
): UseUpcomingMeetingsResult {
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setMeetings([]);
      return;
    }

    setIsLoading(true);

    // Simulate fetching calendar events after OAuth connection.
    // In production this would be replaced with a server action call
    // to fetch real Google Calendar events.
    const timer = setTimeout(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const simulatedMeetings: UpcomingMeeting[] = [
        {
          id: "onboarding-demo-1",
          title: "Team Standup",
          startTime: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            9,
            0,
          ).toISOString(),
          endTime: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            9,
            15,
          ).toISOString(),
          isToday: true,
          isTomorrow: false,
          recordingEnabled: true,
        },
        {
          id: "onboarding-demo-2",
          title: "Product Review",
          startTime: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            14,
            0,
          ).toISOString(),
          endTime: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            15,
            0,
          ).toISOString(),
          isToday: true,
          isTomorrow: false,
          recordingEnabled: true,
        },
        {
          id: "onboarding-demo-3",
          title: "Client Check-in",
          startTime: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
            10,
            30,
          ).toISOString(),
          endTime: new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
            11,
            0,
          ).toISOString(),
          isToday: false,
          isTomorrow: true,
          recordingEnabled: true,
        },
      ];

      setMeetings(simulatedMeetings);
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isConnected]);

  const toggleMeetingRecording = useCallback((meetingId: string) => {
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? { ...m, recordingEnabled: !m.recordingEnabled }
          : m,
      ),
    );
  }, []);

  const toggleAllRecordings = useCallback((enabled: boolean) => {
    setMeetings((prev) =>
      prev.map((m) => ({ ...m, recordingEnabled: enabled })),
    );
  }, []);

  return {
    meetings,
    isLoading,
    toggleMeetingRecording,
    toggleAllRecordings,
  };
}
