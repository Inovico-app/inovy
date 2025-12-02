"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface TopQuery {
  query: string;
  count: number;
  lastUsed: Date;
}

interface TopQueriesTableProps {
  queries: TopQuery[];
}

export function TopQueriesTable({ queries }: TopQueriesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Queries</CardTitle>
      </CardHeader>
      <CardContent>
        {queries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Query</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.map((query, index) => (
                <TableRow key={index}>
                  <TableCell className="max-w-md truncate">
                    {query.query}
                  </TableCell>
                  <TableCell className="text-right">{query.count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDistanceToNow(new Date(query.lastUsed), {
                      addSuffix: true,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No queries found
          </div>
        )}
      </CardContent>
    </Card>
  );
}

