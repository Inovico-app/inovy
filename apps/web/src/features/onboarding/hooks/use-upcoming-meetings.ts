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

function createMeetingTime(
  baseDate: Date,
  hours: number,
  minutes: number,
): string {
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
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
    // Replace with a server action call to fetch real Google Calendar events.
    const timer = setTimeout(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const simulatedMeetings: UpcomingMeeting[] = [
        {
          id: "onboarding-demo-1",
          title: "Team Standup",
          startTime: createMeetingTime(today, 9, 0),
          endTime: createMeetingTime(today, 9, 15),
          isToday: true,
          isTomorrow: false,
          recordingEnabled: true,
        },
        {
          id: "onboarding-demo-2",
          title: "Product Review",
          startTime: createMeetingTime(today, 14, 0),
          endTime: createMeetingTime(today, 15, 0),
          isToday: true,
          isTomorrow: false,
          recordingEnabled: true,
        },
        {
          id: "onboarding-demo-3",
          title: "Client Check-in",
          startTime: createMeetingTime(tomorrow, 10, 30),
          endTime: createMeetingTime(tomorrow, 11, 0),
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
