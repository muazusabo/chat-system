export type ConversationType = 'PRIVATE' | 'GROUP';
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type MessageType = 'TEXT' | 'IMAGE';

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  leftAt: string | null;
  user: SafeUser;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  createdAt: string;
  updatedAt: string;
  sender?: SafeUser;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participantKey: string | null;
  name: string | null;
  image: string | null;
  ownerId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  lastMessage?: Message | null;
  unreadCount: number;

}

export interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
}
export type ContactRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface ContactRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: ContactRequestStatus;
  createdAt: string;
  updatedAt: string;
  sender?: SafeUser;
  receiver?: SafeUser;
}

export interface Contact {
  contactId: string;
  user: Pick<SafeUser, 'id' | 'name' | 'profileImage' | 'status'>;
  createdAt: string;
}

export type NotificationType =
  | 'NEW_MESSAGE'
  | 'CONTACT_REQUEST'
  | 'CONTACT_ACCEPTED'
  | 'GROUP_INVITATION'
  | 'GROUP_MEMBER_ADDED'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: AppNotification[];
  nextCursor: string | null;
}
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVerified: boolean;
  isBlocked: boolean;
  isDeleted: boolean;
  status: UserStatus;
  lastSeen: string | null;
  createdAt: string;
}

export interface AdminUsersPage {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  blockedUsers: number;
  deletedUsers: number;
  totalConversations: number;
  totalMessages: number;
}
export interface AdminTrendPoint {
  date: string;
  newUsers: number;
  newConversations: number;
  newMessages: number;
}