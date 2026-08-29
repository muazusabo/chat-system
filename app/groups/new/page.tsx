// app/groups/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useContacts } from '@/lib/hooks/useContacts';
import { useCreateConversation } from '@/lib/hooks/useConversations';
import { resolveAvatarUrl } from '@/lib/avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function NewGroupPage() {
  const router = useRouter();
  const { data: contacts, isLoading } = useContacts();
  const createConversation = useCreateConversation();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [step, setStep] = useState<'select' | 'name'>('select');
  const [error, setError] = useState<string | null>(null);

  const filtered = (contacts ?? []).filter((c) =>
    c.user.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleCreate() {
    setError(null);
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    try {
      const conversation = await createConversation.mutateAsync({
        type: 'GROUP',
        memberIds: Array.from(selected),
        name: groupName.trim(),
      });
      router.push(`/chat/${conversation.id}`);
    } catch {
      setError('Could not create group');
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-lg flex-col bg-neutral-950">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-6 py-4">
        <button
          onClick={() => (step === 'name' ? setStep('select') : router.back())}
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-white">
          {step === 'select' ? 'Add members' : 'Name your group'}
        </h1>
      </div>

      {step === 'select' ? (
        <>
          <div className="px-6 py-4">
            <Input
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {selected.size > 0 && (
            <div className="flex gap-2 overflow-x-auto px-6 pb-3">
              {Array.from(selected).map((id) => {
                const c = contacts?.find((x) => x.user.id === id);
                if (!c) return null;
                return (
                  <div key={id} className="flex shrink-0 flex-col items-center gap-1">
                    <div className="relative">
                      <Avatar name={c.user.name} image={c.user.profileImage} size={44} />
                      <button
                        onClick={() => toggle(id)}
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 text-[10px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="w-11 truncate text-center text-[10px] text-neutral-400">
                      {c.user.name.split(' ')[0]}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner size={22} /></div>
            ) : filtered.length > 0 ? (
              filtered.map((c) => (
                <button
                  key={c.contactId}
                  onClick={() => toggle(c.user.id)}
                  className="flex w-full items-center gap-3 px-6 py-3 text-left hover:bg-neutral-900"
                >
                  <Avatar name={c.user.name} image={c.user.profileImage} size={40} />
                  <p className="flex-1 truncate text-sm font-medium text-neutral-100">{c.user.name}</p>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selected.has(c.user.id)
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-neutral-600'
                    }`}
                  >
                    {selected.has(c.user.id) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <p className="text-sm text-neutral-500">
                  {contacts?.length === 0 ? 'Add contacts first to create a group' : 'No matches'}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-800 px-6 py-4">
            <Button
              onClick={() => setStep('name')}
              disabled={selected.size === 0}
              className="w-auto px-6"
            >
              Next ({selected.size})
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-6 py-6">
          <Input
            label="Group name"
            placeholder="e.g. Weekend Plans"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            error={error ?? undefined}
            autoFocus
          />
          <p className="text-xs text-neutral-500">
            {selected.size} member{selected.size !== 1 ? 's' : ''} selected
          </p>
          <Button onClick={handleCreate} loading={createConversation.isPending} className="mt-2 w-auto px-6">
            Create group
          </Button>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, image, size }: { name: string; image: string | null; size: number }) {
  const resolved = resolveAvatarUrl(image);
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-700 text-sm font-semibold text-neutral-200"
    >
      {resolved ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolved} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}