import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function RouteProgress() {
  const loading = useRouterState({ select: (state) => state.isLoading });
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    if (loading) {
      setWidth(8);

      const trickle = setInterval(
        () => setWidth((value) => (value ?? 8) + (90 - (value ?? 8)) * 0.15),
        200
      );

      return () => clearInterval(trickle);
    }

    setWidth((value) => (value === null ? null : 100));

    const hide = setTimeout(() => setWidth(null), 400);

    return () => clearTimeout(hide);
  }, [loading]);

  if (width === null) return null;

  return (
    <div
      data-testid="route-progress"
      className="pointer-events-none fixed inset-x-0 top-0 z-[1600] h-[3px]"
    >
      <div
        className="h-full bg-white shadow-[0_0_10px_#fff,0_0_5px_#fff] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${width}%`, opacity: width === 100 ? 0 : 1 }}
      />
    </div>
  );
}
