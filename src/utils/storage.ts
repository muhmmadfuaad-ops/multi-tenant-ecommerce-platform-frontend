// /utils/storage.ts
type ChatMsg = { to: string; from: string; message: string; ts?: number };

export const storage = {

    getUserName: () => localStorage.getItem("userName"),
    saveUserName: (name: string) => localStorage.setItem("userName", name),

    getUserId: () => localStorage.getItem("userId"),
    saveUserId: (id: string) => localStorage.setItem("userId", id),

    getUsers: (): string[] => JSON.parse(localStorage.getItem("users") || "[]"),
    saveUsers: (users: string[]) => localStorage.setItem("users", JSON.stringify(users)),

    getChats: (): ChatMsg[] => {
        try {
            const raw = localStorage.getItem("chats");
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
            return [];
        } catch {
            return [];
        }
    },
    saveChats: (messages: ChatMsg[]) => localStorage.setItem("chats", JSON.stringify(messages)),

    clearAll: () => localStorage.clear(),
};
