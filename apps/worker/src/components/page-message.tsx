import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";

type PageMessageProps = {
  heading: string;
  body: string;
  onRetry?: () => void;
};

export function PageMessage({ heading, body, onRetry }: PageMessageProps) {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 pt-24 text-center">
      <h1 className="text-2xl font-bold">{heading}</h1>
      <p className="max-w-md text-muted-foreground">{body}</p>
      <div className="flex gap-4">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        <Button asChild variant="secondary">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
