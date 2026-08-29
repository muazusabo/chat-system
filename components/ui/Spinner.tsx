// components/ui/Spinner.tsx

export function Spinner({
  size = 24,
  className = 'text-neutral-500',
}: {
  size?: number;
  /** Controls the spinner's color via `currentColor` — override per context
   *  (e.g. a colored button) instead of hardcoding one color for every use. */
  className?: string;
}) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-[3px] border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

// Full-page loading state (used during session restore, route loads, etc).
// Adapts to either theme: light neumorphic auth pages, or the dark chat app.
export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#e6e6e6] dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={36} className="text-neutral-500 dark:text-neutral-400" />
        <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading...</p>
      </div>
    </div>
  );
}