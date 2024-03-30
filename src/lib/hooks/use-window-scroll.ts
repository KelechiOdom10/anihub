import * as React from "react";

export function useWindowScroll() {
  const [state, setState] = React.useState({
    x: 0,
    y: 0,
  });

  const scrollTo = React.useCallback(
    (...args: [number, number] | [ScrollToOptions]) => {
      if (typeof args[0] === "object") {
        const options = args[0];
        window.scrollTo(options);
      } else if (typeof args[0] === "number" && typeof args[1] === "number") {
        const x = args[0];
        const y = args[1];
        window.scrollTo(x, y);
      } else {
        throw new Error(
          `Invalid arguments passed to scrollTo. See here for more info. https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo`
        );
      }
    },
    []
  );

  React.useLayoutEffect(() => {
    const handleScroll = () => {
      setState({ x: window.scrollX, y: window.scrollY });
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return [state, scrollTo] as const;
}
