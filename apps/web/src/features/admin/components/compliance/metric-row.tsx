import { Badge } from "@/components/ui/badge";

interface MetricRowProps {
  label: string;
  value: string | number;
  variant?: "default" | "secondary" | "destructive" | "outline";
  bold?: boolean;
  separator?: boolean;
}

export function MetricRow({
  label,
  value,
  variant = "outline",
  bold = false,
  separator = false,
}: MetricRowProps) {
  return (
    <div
      className={`flex items-center justify-between ${separator ? "pt-2 border-t" : ""}`}
    >
      <span className={`text-sm ${bold ? "font-medium" : ""}`}>{label}</span>
      <Badge variant={variant}>{value}</Badge>
    </div>
  );
}
