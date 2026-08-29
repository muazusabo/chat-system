// app/groups/[conversationId]/page.tsx
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConversation, useRenameConversation, useAddMembers, useRemoveMember, useLeaveConversation, useTransferOwnership } from '@/lib/hooks/useConversations';
import { useContacts } from '@/lib/hooks/useContacts';
import { useAuthStore } from '@/lib/auth-store';
import { resolveAvatarUrl } from '@/lib/avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function GroupInfoPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const { data: conversation, isLoading } = useConversation(conversationId);
  const { data: contacts } = useContacts();
  const renameConversation = useRenameConversation(conversationId);
  const addMembers = useAddMembers(conversationId);
  const removeMember = useRemoveMember(conversationId);
  const leaveConversation = useLeaveConversation(conversationId);
  const transferOwnership = useTransferOwnership(conversationId);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (isLoading || !conversation) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <Spinner size={24} />
      </div>
    );
  }

  const myMembership = conversation.members.find((m) => m.userId === currentUser?.id);
  const isOwner = myMembership?.role === 'OWNER';
  const isAdminOrOwner = myMembership?.role === 'OWNER' || myMembership?.role === 'ADMIN';

  const existingMemberIds = new Set(conversation.members.map((m) => m.userId));
  const addableContacts = (contacts ?? []).filter(
    (c) =>
      !existingMemberIds.has(c.user.id) &&
      c.user.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function startRename() {
    setNameDraft(conversation!.name ?? '');
    setEditingName(true);
  }

  function submitRename() {
    if (nameDraft.trim() && nameDraft.trim() !== conversation!.name) {
      renameConversation.mutate(nameDraft.trim());
    }
    setEditingName(false);
  }

  function toggleSelect(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleAddSelected() {
    if (selected.size === 0) return;
    await addMembers.mutateAsync(Array.from(selected));
    setSelected(new Set());
    setSearch('');
    setShowAddPicker(false);
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this member from the group?')) return;
    await removeMember.mutateAsync(memberId);
  }

  async function handleLeave() {
    if (isOwner) {
      alert('Transfer ownership to another member before leaving.');
      return;
    }
    if (!confirm('Leave this group?')) return;
    await leaveConversation.mutateAsync();
    router.push('/chat');
  }

  async function handleTransfer(newOwnerId: string) {
    if (!confirm('Transfer group ownership to this member?')) return;
    await transferOwnership.mutateAsync(newOwnerId);
  }

  return (
    <div className="mx-auto flex h-screen max-w-lg flex-col bg-neutral-950">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-6 py-4">
        <button
          onClick={() => (showAddPicker ? setShowAddPicker(false) : router.back())}
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-white">
          {showAddPicker ? 'Add members' : 'Group info'}
        </h1>
      </div>

      {showAddPicker ? (
        <>
          <div className="px-6 py-4">
            <Input
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {addableContacts.length > 0 ? (
              addableContacts.map((c) => (
                <button
                  key={c.contactId}
                  onClick={() => toggleSelect(c.user.id)}
                  className="flex w-full items-center gap-3 px-6 py-3 text-left hover:bg-neutral-900"
                >
                  <Avatar name={c.user.name} image={c.user.profileImage} size={40} />
                  <p className="flex-1 truncate text-sm font-medium text-neutral-100">{c.user.name}</p>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selected.has(c.user.id) ? 'border-emerald-500 bg-emerald-500' : 'border-neutral-600'
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
              <div className="px-6 py-10 text-center text-sm text-neutral-500">
                No contacts to add
              </div>
            )}
          </div>
          <div className="border-t border-neutral-800 px-6 py-4">
            <Button
              onClick={handleAddSelected}
              disabled={selected.size === 0}
              loading={addMembers.isPending}
              className="w-auto px-6"
            >
              Add ({selected.size})
            </Button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Group identity */}
          <div className="flex flex-col items-center gap-3 px-6 py-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-800 text-2xl font-semibold text-neutral-300">
              {conversation.name?.charAt(0).toUpperCase()}
            </div>
            {editingName ? (
              <div className="flex w-full max-w-xs items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                  autoFocus
                />
                <button
                  onClick={submitRename}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => isAdminOrOwner && startRename()}
                className="flex items-center gap-2 text-lg font-semibold text-white"
                disabled={!isAdminOrOwner}
              >
                {conversation.name}
                {isAdminOrOwner && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-neutral-500">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
            <p className="text-sm text-neutral-500">{conversation.members.length} members</p>
          </div>

          {/* Members */}
          <div className="border-t border-neutral-800">
            <div className="flex items-center justify-between px-6 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Members</p>
              {isAdminOrOwner && (
                <button
                  onClick={() => setShowAddPicker(true)}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  + Add
                </button>
              )}
            </div>
            {conversation.members
              .filter((m) => !m.leftAt)
              .map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-6 py-3 hover:bg-neutral-900">
                  <Avatar name={m.user.name} image={m.user.profileImage} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {m.user.name} {m.userId === currentUser?.id && <span className="text-neutral-500">(You)</span>}
                    </p>
                    {m.role !== 'MEMBER' && (
                      <p className="text-xs text-neutral-500">{m.role === 'OWNER' ? 'Owner' : 'Admin'}</p>
                    )}
                  </div>
                  {isOwner && m.userId !== currentUser?.id && (
                    <button
                      onClick={() => handleTransfer(m.userId)}
                      className="text-xs text-neutral-500 hover:text-neutral-300"
                      title="Make owner"
                    >
                      Make owner
                    </button>
                  )}
                  {isAdminOrOwner && m.userId !== currentUser?.id && m.role !== 'OWNER' && (
                    <button
                      onClick={() => handleRemove(m.userId)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
          </div>

          {/* Leave */}
          <div className="border-t border-neutral-800 px-6 py-4">
            <button
              onClick={handleLeave}
              className="text-sm font-medium text-red-400 hover:text-red-300"
            >
              Leave group
            </button>
          </div>
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