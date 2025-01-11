export function AuthLoading({ page }: { page?: "login" | "signup" }) {
  return (
    <div className="w-full max-w-md">
      <div className="w-full rounded-lg border bg-card p-6 shadow-sm">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-2 h-12 w-32 animate-pulse rounded-md bg-zinc-800" />
          <div className="mx-auto h-4 w-64 animate-pulse rounded-md bg-zinc-800" />
        </div>

        {/* Content */}
        <div className="mt-6 space-y-4">
          {/* OAuth Button */}
          <div className="h-10 w-full animate-pulse rounded-md bg-zinc-800" />

          {/* Divider */}
          <div className="my-2 flex items-center">
            <div className="flex-grow border-t border-muted" />
            <div className="mx-2 h-4 w-8 animate-pulse rounded bg-zinc-800" />
            <div className="flex-grow border-t border-muted" />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-12 animate-pulse rounded bg-zinc-800" />
              <div className="h-10 w-full animate-pulse rounded-md bg-zinc-800" />
            </div>

            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
              <div className="h-10 w-full animate-pulse rounded-md bg-zinc-800" />
            </div>

            {page === "signup" && (
              <div className="space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
                <div className="h-10 w-full animate-pulse rounded-md bg-zinc-800" />
              </div>
            )}

            {/* Action Links */}
            <div className="flex justify-between">
              <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
            </div>

            {/* Buttons */}
            <div className="h-10 w-full animate-pulse rounded-md bg-zinc-800" />
            <div className="h-10 w-full animate-pulse rounded-md bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
