import * as React from "react";

export function useWindowScroll() {
  const [state, setState] = React.useState({ x: 0, y: 0 });

  React.useLayoutEffect(() => {
    const handleScroll = () => {
      setState({ x: window.scrollX, y: window.scrollY });
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return [state] as const;
}
