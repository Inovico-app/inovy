import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FilterOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

interface FilterCheckboxGroupProps<T extends string> {
  title: string;
  options: FilterOption<T>[];
  selectedValues: T[];
  onToggle: (value: T) => void;
  counts?: Record<T, number>;
}

export function FilterCheckboxGroup<T extends string>({
  title,
  options,
  selectedValues,
  onToggle,
  counts,
}: FilterCheckboxGroupProps<T>) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="space-y-2">
        {options.map((option) => {
          const count = counts?.[option.value] ?? 0;
          const isChecked = selectedValues.includes(option.value);

          return (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${title.toLowerCase()}-${option.value}`}
                checked={isChecked}
                onCheckedChange={() => onToggle(option.value)}
              />
              <Label
                htmlFor={`${title.toLowerCase()}-${option.value}`}
                className="flex items-center gap-2 text-sm font-normal cursor-pointer flex-1"
              >
                <span className={option.color}>{option.label}</span>
                {counts && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {count}
                  </Badge>
                )}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

