"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export function ProjectSearch() {
  const [search, setSearch] = useQueryState("search", {
    defaultValue: "",
    shallow: false,
  });
  const [localSearch, setLocalSearch] = useState(search);

  // Sync local state with URL param
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(localSearch || null);
  };

  const handleClear = () => {
    setLocalSearch("");
    setSearch(null);
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center gap-2">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 w-64"
        />
        {localSearch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-0 top-0 h-full px-2"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Button type="submit" size="sm">
        Search
      </Button>
    </form>
  );
}

