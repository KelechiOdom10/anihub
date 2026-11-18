import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster } from "sonner";

export function ToastHost() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = document.createElement("div");

    const move = () => {
      const target =
        document.querySelector<HTMLDialogElement>("dialog[open]") ??
        document.body;

      if (host.parentElement !== target) target.appendChild(host);
    };

    move();
    setContainer(host);

    const observer = new MutationObserver(move);

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
      childList: true,
    });

    return () => {
      observer.disconnect();
      host.remove();
    };
  }, []);

  return (
    container &&
    createPortal(
      <Toaster
        theme="dark"
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton:
              "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton:
              "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
      />,
      container
    )
  );
}
