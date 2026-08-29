// components/chat/TypingIndicator.tsx
'use client';

export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-neutral-800 px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
      </div>
      {name && <span className="text-xs text-neutral-500">{name} is typing</span>}
    </div>
  );
}