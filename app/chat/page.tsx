// app/chat/page.tsx

export default function ChatEmptyPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-neutral-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.15-1.02L3 21l1.02-3.85A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-600"
          />
        </svg>
      </div>
      <p className="text-sm text-neutral-500">Select a conversation to start chatting</p>
    </div>
  );
}