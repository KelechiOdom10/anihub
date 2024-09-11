"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

import { cn } from "~/lib/utils";

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showTooltip?: boolean;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showTooltip = true, ...props }, ref) => {
  const [value, setValue] = React.useState(
    props.defaultValue ?? props.value ?? [props.min ?? 0, props.max ?? 100]
  );
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);
  const [activeThumb, setActiveThumb] = React.useState<number | null>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (trackRef.current) {
      const trackRect = trackRef.current.getBoundingClientRect();
      const percent = (event.clientX - trackRect.left) / trackRect.width;
      const newValue = Math.round(
        percent * ((props.max ?? 100) - (props.min ?? 0)) + (props.min ?? 0)
      );
      setHoveredValue(newValue);
    }
  };

  const handlePointerLeave = () => {
    setHoveredValue(null);
  };

  const handleValueChange = (newValue: number[]) => {
    setValue(newValue);
    props.onValueChange?.(newValue);
  };

  const handleThumbMouseEnter = (index: number) => {
    setActiveThumb(index);
  };

  const handleThumbMouseLeave = () => {
    setActiveThumb(null);
  };

  return (
    <div className="relative w-full">
      <div className="-mb-2 flex justify-between">
        <span className="text-xs text-foreground/75">{props.min}</span>
        <span className="text-xs text-foreground/75">{props.max}</span>
      </div>
      <TooltipProvider>
        <Tooltip
          open={showTooltip && (hoveredValue !== null || activeThumb !== null)}
        >
          <TooltipTrigger asChild>
            <SliderPrimitive.Root
              ref={ref}
              className={cn(
                "relative flex w-full touch-none select-none items-center",
                className
              )}
              onValueChange={handleValueChange}
              {...props}
            >
              <SliderPrimitive.Track
                ref={trackRef}
                className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary"
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
              >
                <SliderPrimitive.Range className="absolute h-full bg-primary" />
              </SliderPrimitive.Track>
              {value.map((v, index) => (
                <SliderPrimitive.Thumb
                  key={index}
                  className="block size-3.5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  onMouseEnter={() => handleThumbMouseEnter(index)}
                  onMouseLeave={handleThumbMouseLeave}
                />
              ))}
            </SliderPrimitive.Root>
          </TooltipTrigger>
          <TooltipContent>
            {hoveredValue !== null ? (
              <span className="text-xs">{hoveredValue}</span>
            ) : (
              <span className="text-xs">{value[activeThumb ?? 0]}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
