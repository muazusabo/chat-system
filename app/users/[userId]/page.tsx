// app/users/[userId]/page.tsx
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useCreateConversation } from '@/lib/hooks/useConversations';
import { resolveAvatarUrl } from '@/lib/avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const { data: user, isLoading } = useUserProfile(userId);
  const createConversation = useCreateConversation();

  async function handleMessage() {
    if (!user) return;
    const conversation = await createConversation.mutateAsync({
      type: 'PRIVATE',
      memberIds: [user.id],
    });
    router.push(`/chat/${conversation.id}`);
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <Spinner size={24} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-neutral-950">
        <p className="text-sm text-neutral-500">User not found</p>
        <button onClick={() => router.back()} className="text-sm text-white hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const image = resolveAvatarUrl(user.profileImage);

  return (
    <div className="mx-auto flex h-screen max-w-lg flex-col bg-neutral-950">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-6 py-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-white">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-3xl font-semibold text-neutral-300 ring-4 ring-neutral-900">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{user.name}</p>
            <p className="mt-0.5 text-sm text-neutral-500">
              {user.status === 'ONLINE' ? 'Online' : 'Offline'}
            </p>
          </div>

          <Button
            onClick={handleMessage}
            loading={createConversation.isPending}
            className="mt-2 w-auto px-6"
          >
            Message
          </Button>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-neutral-800 pt-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Email</p>
            <p className="mt-1 text-sm text-neutral-300">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Member since</p>
            <p className="mt-1 text-sm text-neutral-300">
              {new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}