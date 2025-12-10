import {
  getLiveTranscriptionPreferenceClient,
  setLiveTranscriptionPreferenceClient,
} from "@/features/recordings/lib/live-transcription-preferences";
import { getAutoProcessPreferenceClient } from "@/features/recordings/lib/recording-preferences";
import { setAutoProcessPreference } from "@/features/recordings/lib/recording-preferences-server";
import { useState } from "react";
import { toast } from "sonner";

interface UseRecordingPreferencesReturn {
  autoProcessEnabled: boolean;
  liveTranscriptionEnabled: boolean;
  isSavingPreference: boolean;
  handleToggleAutoProcess: () => Promise<void>;
  handleToggleTranscription: (enabled: boolean) => void;
}

export function useRecordingPreferences(): UseRecordingPreferencesReturn {
  // Initialize preferences from localStorage (synchronous)
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(() => {
    try {
      return getAutoProcessPreferenceClient();
    } catch {
      return false;
    }
  });

  const [liveTranscriptionEnabled, setLiveTranscriptionEnabled] = useState(
    () => {
      try {
        return getLiveTranscriptionPreferenceClient();
      } catch {
        return true;
      }
    }
  );

  const [isSavingPreference, setIsSavingPreference] = useState(false);

  const handleToggleAutoProcess = async () => {
    const newValue = !autoProcessEnabled;
    setIsSavingPreference(true);

    try {
      await setAutoProcessPreference(newValue);
      setAutoProcessEnabled(newValue);
      toast.success(
        newValue
          ? "Auto-verwerking ingeschakeld"
          : "Auto-verwerking uitgeschakeld",
        {
          description: newValue
            ? "Live opnames worden automatisch verwerkt na opslaan"
            : "Je kunt verwerking handmatig starten per opname",
        }
      );
    } catch (error) {
      console.error("Failed to update auto-process preference:", error);
      toast.error("Fout bij opslaan van voorkeuren", {
        description: "Probeer het opnieuw",
      });
    } finally {
      setIsSavingPreference(false);
    }
  };

  const handleToggleTranscription = (enabled: boolean) => {
    try {
      setLiveTranscriptionPreferenceClient(enabled);
      setLiveTranscriptionEnabled(enabled);
      toast.success(
        enabled
          ? "Real-time transcription enabled"
          : "Real-time transcription disabled",
        {
          description: enabled
            ? "Speech will be transcribed during recording"
            : "Only audio will be recorded",
        }
      );
    } catch (error) {
      console.error("Failed to update transcription preference:", error);
      toast.error("Failed to save preference", {
        description: "Please try again",
      });
    }
  };

  return {
    autoProcessEnabled,
    liveTranscriptionEnabled,
    isSavingPreference,
    handleToggleAutoProcess,
    handleToggleTranscription,
  };
}

