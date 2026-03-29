import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChatRoom, ChatMessage } from '../types';

// Helper per convertire Firestore Timestamp a Date
const toDate = (val: any): Date => {
  if (!val) return new Date();
  if (val.toDate) return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
};

const ROOMS_COLLECTION = 'chatRooms';
const MESSAGES_COLLECTION = 'chatMessages';

// --- Chat Rooms ---

export const createChatRoom = async (
  studentId: string,
  collaboratorId: string
): Promise<string> => {
  // Controlla se esiste già
  const existing = await findChatRoom(studentId, collaboratorId);
  if (existing) return existing.id;

  const docRef = await addDoc(collection(db, ROOMS_COLLECTION), {
    participants: [studentId, collaboratorId],
    type: 'direct',
    studentId,
    collaboratorId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const findChatRoom = async (
  studentId: string,
  collaboratorId: string
): Promise<ChatRoom | null> => {
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('studentId', '==', studentId),
    where('collaboratorId', '==', collaboratorId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { ...d.data(), id: d.id } as ChatRoom;
};

export const getUserChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('participants', 'array-contains', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ChatRoom));
};

// Il titolare può vedere TUTTE le chat
export const getAllChatRooms = async (): Promise<ChatRoom[]> => {
  const snapshot = await getDocs(collection(db, ROOMS_COLLECTION));
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ChatRoom));
};

// --- Listener real-time per le chat rooms ---

export const subscribeToUserChatRooms = (
  userId: string,
  callback: (rooms: ChatRoom[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('participants', 'array-contains', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ChatRoom));
    callback(rooms);
  }, (error) => {
    console.error('Errore listener chat rooms:', error);
  });
};

export const subscribeToAllChatRooms = (
  callback: (rooms: ChatRoom[]) => void
): Unsubscribe => {
  return onSnapshot(collection(db, ROOMS_COLLECTION), (snapshot) => {
    const rooms = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ChatRoom));
    callback(rooms);
  }, (error) => {
    console.error('Errore listener tutte le chat rooms:', error);
  });
};

// --- Messaggi ---

export const sendMessage = async (
  chatRoomId: string,
  senderId: string,
  senderName: string,
  text: string,
  isAnonymousOwner: boolean = false
): Promise<string> => {
  const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
    chatRoomId,
    senderId,
    senderName: isAnonymousOwner ? senderName : senderName,
    text,
    timestamp: Timestamp.now(),
    isAnonymousOwner,
    readBy: [senderId],
  });

  // Aggiorna lastMessage nella room
  const roomRef = doc(db, ROOMS_COLLECTION, chatRoomId);
  await updateDoc(roomRef, {
    lastMessage: {
      text,
      timestamp: Timestamp.now(),
      senderId,
    },
  });

  return docRef.id;
};

export const subscribeToMessages = (
  chatRoomId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('chatRoomId', '==', chatRoomId),
    orderBy('timestamp', 'asc')
  );

  let fallbackUnsub: Unsubscribe | null = null;

  const unsub = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(
      (d) => ({ ...d.data(), id: d.id } as ChatMessage)
    );
    callback(messages);
  }, (error) => {
    console.warn('Indice composito mancante, uso fallback real-time:', error.message);
    // Fallback real-time: listener senza orderBy, ordinamento client-side
    const fallbackQuery = query(
      collection(db, MESSAGES_COLLECTION),
      where('chatRoomId', '==', chatRoomId)
    );
    fallbackUnsub = onSnapshot(fallbackQuery, (snap) => {
      const messages = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as ChatMessage))
        .sort((a, b) => {
          const ta = toDate(a.timestamp).getTime();
          const tb = toDate(b.timestamp).getTime();
          return ta - tb;
        });
      callback(messages);
    }, (e) => console.error('Errore fallback real-time messaggi:', e));
  });

  return () => {
    unsub();
    if (fallbackUnsub) fallbackUnsub();
  };
};

// --- Typing Indicators ---

const TYPING_COLLECTION = 'chatTyping';

export const setTypingStatus = async (
  chatRoomId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> => {
  const typingRef = doc(db, TYPING_COLLECTION, `${chatRoomId}_${userId}`);
  if (isTyping) {
    await setDoc(typingRef, {
      chatRoomId,
      userId,
      userName,
      isTyping: true,
      timestamp: serverTimestamp(),
    });
  } else {
    await deleteDoc(typingRef).catch(() => {});
  }
};

export const subscribeToTypingStatus = (
  chatRoomId: string,
  currentUserId: string,
  callback: (typingUsers: { userId: string; userName: string }[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, TYPING_COLLECTION),
    where('chatRoomId', '==', chatRoomId),
    where('isTyping', '==', true)
  );

  return onSnapshot(q, (snapshot) => {
    const typingUsers = snapshot.docs
      .map((d) => d.data())
      .filter((d) => d.userId !== currentUserId)
      .filter((d) => {
        // Ignora indicatori stale (> 10 secondi)
        const ts = d.timestamp;
        if (!ts) return false;
        const time = ts.toDate ? ts.toDate().getTime() : Date.now();
        return Date.now() - time < 10000;
      })
      .map((d) => ({ userId: d.userId, userName: d.userName }));
    callback(typingUsers);
  }, () => {
    callback([]);
  });
};

// --- Online Presence ---

const PRESENCE_COLLECTION = 'userPresence';

export const updatePresence = async (
  userId: string,
  isOnline: boolean
): Promise<void> => {
  const presenceRef = doc(db, PRESENCE_COLLECTION, userId);
  await setDoc(presenceRef, {
    userId,
    isOnline,
    lastSeen: serverTimestamp(),
  }, { merge: true });
};

export const subscribeToPresence = (
  userIds: string[],
  callback: (presence: Record<string, { isOnline: boolean; lastSeen: Date | null }>) => void
): Unsubscribe => {
  if (userIds.length === 0) {
    callback({});
    return () => {};
  }

  // Firestore 'in' queries support max 30 elements
  const ids = userIds.slice(0, 30);
  const q = query(
    collection(db, PRESENCE_COLLECTION),
    where('userId', 'in', ids)
  );

  return onSnapshot(q, (snapshot) => {
    const presence: Record<string, { isOnline: boolean; lastSeen: Date | null }> = {};
    snapshot.docs.forEach((d) => {
      const data = d.data();
      const lastSeen = data.lastSeen?.toDate ? data.lastSeen.toDate() : null;
      // Considera offline se lastSeen > 2 minuti fa
      const isOnline = data.isOnline && lastSeen
        ? Date.now() - lastSeen.getTime() < 120000
        : false;
      presence[data.userId] = { isOnline, lastSeen };
    });
    callback(presence);
  }, () => {
    callback({});
  });
};

// --- Read receipts ---

export const markMessagesAsRead = async (
  chatRoomId: string,
  userId: string
): Promise<void> => {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('chatRoomId', '==', chatRoomId)
  );
  const snapshot = await getDocs(q);
  const batch: Promise<void>[] = [];
  snapshot.docs.forEach((d) => {
    const data = d.data();
    if (!data.readBy?.includes(userId)) {
      batch.push(
        updateDoc(doc(db, MESSAGES_COLLECTION, d.id), {
          readBy: arrayUnion(userId),
        })
      );
    }
  });
  await Promise.all(batch);
};
