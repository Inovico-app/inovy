"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DriveWatchList } from "./drive-watch-list";
import { DriveWatchForm } from "./drive-watch-form";
import type { DriveWatchListItemDto } from "@/server/dto/drive-watch.dto";

interface Project {
  id: string;
  name: string;
}

interface DriveWatchSettingsClientProps {
  watches: DriveWatchListItemDto[];
  projects: Project[];
}

/**
 * Drive Watch Settings Client Component
 * Handles client-side interactions and state
 */
export function DriveWatchSettingsClient({
  watches: initialWatches,
  projects,
}: DriveWatchSettingsClientProps) {
  const [watches, setWatches] = useState(initialWatches);
  const [showForm, setShowForm] = useState(false);
  const [editingWatch, setEditingWatch] = useState<DriveWatchListItemDto | null>(null);

  const handleWatchAdded = (newWatch: DriveWatchListItemDto) => {
    setWatches((prev) => [...prev, newWatch]);
    setShowForm(false);
  };

  const handleWatchUpdated = (updatedWatch: DriveWatchListItemDto) => {
    setWatches((prev) =>
      prev.map((w) => (w.id === updatedWatch.id ? updatedWatch : w))
    );
    setEditingWatch(null);
  };

  const handleWatchDeleted = (watchId: string) => {
    setWatches((prev) => prev.filter((w) => w.id !== watchId));
  };

  const handleEdit = (watch: DriveWatchListItemDto) => {
    setEditingWatch(watch);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingWatch(null);
  };

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      {showForm ? (
        <DriveWatchForm
          projects={projects}
          editingWatch={editingWatch}
          onSuccess={(watch) => {
            if (editingWatch) {
              handleWatchUpdated(watch);
            } else {
              handleWatchAdded(watch);
            }
          }}
          onCancel={handleCancel}
        />
      ) : (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Folder to Watch
        </Button>
      )}

      {/* Watch List */}
      <DriveWatchList
        watches={watches}
        onEdit={handleEdit}
        onDelete={handleWatchDeleted}
      />
    </div>
  );
}

