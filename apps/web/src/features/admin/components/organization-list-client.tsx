"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrganizationListDto } from "@/server/cache/organization.cache";
import { format } from "date-fns";
import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

interface OrganizationListClientProps {
  organizations: OrganizationListDto[];
}

const ITEMS_PER_PAGE = 10;

export function OrganizationListClient({
  organizations,
}: OrganizationListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter organizations by search query
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;

    const query = searchQuery.toLowerCase();
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(query) ||
        org.slug.toLowerCase().includes(query)
    );
  }, [organizations, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrganizations = filteredOrganizations.slice(
    startIndex,
    endIndex
  );

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  if (organizations.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2Icon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No organizations yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first organization to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or slug..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Found {filteredOrganizations.length} organization
          {filteredOrganizations.length === 1 ? "" : "s"}
        </p>
      )}

      {/* Table */}
      {paginatedOrganizations.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrganizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {org.logo ? (
                          <img
                            src={org.logo}
                            alt={org.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                            <Building2Icon className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {org.slug}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{org.memberCount}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(org.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Link href={`/admin/organizations/${org.id}` as any}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredOrganizations.length)} of{" "}
                {filteredOrganizations.length} organizations
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No organizations found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search
          </p>
        </div>
      )}
    </div>
  );
}

