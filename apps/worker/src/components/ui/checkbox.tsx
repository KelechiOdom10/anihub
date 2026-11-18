import { CheckIcon } from "@radix-ui/react-icons";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

interface CheckboxProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary/50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className
      )}
      {...props}
    >
      {checked && (
        <span className="flex items-center justify-center text-current">
          <CheckIcon className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
