import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../socket";

type ChatMsg = { to: string; from: string; message: string; ts?: number };
type TypingEvent = { to: string; from: string; isTyping: boolean; ts?: number };

function safeParseChats(key = "chats"): ChatMsg[] {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch {
        return [];
    }
}

function persistChats(messages: ChatMsg[], key = "chats") {
    try {
        localStorage.setItem(key, JSON.stringify(messages));
    } catch (e) {
        console.warn("Could not persist chats:", e);
    }
}

function WriteMessage() {
    // main top-level inputs (left as requested)
    const [mainRecipient, setMainRecipient] = useState("");
    const [mainMessage, setMainMessage] = useState("");

    // all messages store
    const [messages, setMessages] = useState<ChatMsg[]>(() => safeParseChats());
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    // current logged-in user
    const rawUser = localStorage.getItem("userName");
    const userName = rawUser && rawUser.trim().length ? rawUser : "anonymous";

    // UI: selected chat partner shown on right
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState(""); // per-chat input

    // Ensure socket connect once and handle incoming messages
    useEffect(() => {
        if (!socket.connected) socket.connect();

        const onConnect = () => {
            console.log(`${userName} connected with socket id: ${socket.id}`);
            socket.emit("register", userName);
        };

        const onPrivateMessage = (data: ChatMsg) => {
            // ensure ts for sorting; keep immutability
            const msgWithTs = { ...data, ts: data.ts ?? Date.now() };
            setMessages((prev) => {
                const next = [...prev, msgWithTs];
                persistChats(next);
                return next;
            });
        };

        const onTyping = (data: TypingEvent) => {
            console.log(`a typing event received from ${data.from} to ${data.to}`);
        };

        const onConnectError = (err: any) => {
            console.error("Socket error:", err?.message ?? err);
        };

        socket.on("connect", onConnect);
        socket.on("private_message", onPrivateMessage);
        socket.on("connect_error", onConnectError);
        socket.on("typing_event", onTyping)

        return () => {
            socket.off("connect", onConnect);
            socket.off("private_message", onPrivateMessage);
            socket.off("connect_error", onConnectError);
            // do not disconnect if you rely on socket elsewhere in app,
            // but original code disconnected — keep behavior but safe:
            if (socket.connected) socket.disconnect();
        };
        // intentionally run only once on mount/unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist whenever messages changes (safety in addition to immediate persist on receive)
    useEffect(() => {
        persistChats(messages);
    }, [messages]);

    // derive chat members (unique users excluding yourself)
    const chatMembers = useMemo(() => {
        const set = new Set<string>();
        messages.forEach((m) => {
            if (m.from && m.from !== userName) set.add(m.from);
            if (m.to && m.to !== userName) set.add(m.to);
        });
        // Sort alphabetically for predictability
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [messages, userName]);

    // conversation with selected user (sorted by ts ascending)
    const conversation = useMemo(() => {
        if (!selectedUser) return [];
        console.log('messages:', messages)
        return messages
            .filter((m) => (m.from === selectedUser && m.to === userName) || (m.from === userName && m.to === selectedUser))
            .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    }, [messages, selectedUser, userName]);
    console.log('conversation:', conversation);

    // send from top-level inputs (keeps backward compatibility)
    const sendMainMessage = () => {
        if (!mainRecipient || !mainMessage) return;
        const msg: ChatMsg = { to: mainRecipient, from: userName, message: mainMessage, ts: Date.now() };
        socket.emit("private_message", msg);
        // setMessages((prev) => {
        //     const next = [...prev, msg];
        //     persistChats(next);
        //     return next;
        // });
        setMainMessage("");
    };

    // send message inside a selected chat panel
    const sendChatMessage = () => {
        if (!selectedUser || !chatInput) return;
        const msg: ChatMsg = { to: selectedUser, from: userName, message: chatInput, ts: Date.now() };
        socket.emit("private_message", msg);

        // setMessages((prev) => {
        //     const next = [...prev, msg];
        //     persistChats(next);
        //     return next;
        // });
        setChatInput("");
    };

    // quick helper: open chat with user (also focus input in UI if you implement refs)
    const openChat = (name: string) => {
        setSelectedUser(name);
    };

    return (
        <div className="p-4" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            {/* Top-level inputs remain (user asked to keep them) */}
            <div className="mb-4">
                <h2 className="text-2xl font-semibold">Username: {userName}</h2>
                <div className="flex gap-2 mt-2">
                    <input
                        value={mainRecipient}
                        onChange={(e) => setMainRecipient(e.target.value)}
                        placeholder="Recipient username (top-level)"
                        className="px-3 py-2 border rounded flex-1"
                    />
                    <input
                        value={mainMessage}
                        onChange={(e) => setMainMessage(e.target.value)}
                        placeholder="Type message (top-level)"
                        className="px-3 py-2 border rounded flex-2"
                    />
                    <button onClick={sendMainMessage} className="px-4 py-2 bg-blue-500 text-white rounded">
                        Send
                    </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">You can also use the chat panel on the right to message someone directly.</p>
            </div>

            {/* Main chat layout: left members, right conversation */}
            <div className="flex h-[60vh] border rounded overflow-hidden">
                {/* Left: chat members */}
                <aside className="w-64 border-r p-2 bg-gray-50 overflow-auto">
                    <h3 className="font-medium mb-2">Chats</h3>
                    {chatMembers.length === 0 ? (
                        <p className="text-sm text-gray-500">No chats yet. Send a message to start.</p>
                    ) : (
                        <ul>
                            {chatMembers.map((member) => {
                                // show unread count or last message preview if wanted; minimal here
                                console.log('messages:', messages)
                                const lastMsg = [...messages].reverse()[0];
                                return (
                                    <li
                                        key={member}
                                        onClick={() => openChat(member)}
                                        className={`p-2 rounded cursor-pointer mb-1 ${selectedUser === member ? "bg-blue-100" : "hover:bg-gray-100"}`}
                                    >
                                        <div className="flex justify-between">
                                            <strong>{member}</strong>
                                            <span className="text-xs text-gray-500">{lastMsg ? new Date(lastMsg.ts ?? 0).toLocaleTimeString() : ""}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 truncate">
                                            {lastMsg ? `${lastMsg.from === userName ? "You: " : ""}${lastMsg.message}` : ""}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {/*<div className="mt-4">*/}
                    {/*    <h4 className="text-sm font-medium">Start chat</h4>*/}
                    {/*    <div className="flex gap-1 mt-2">*/}
                    {/*        <input*/}
                    {/*            placeholder="username"*/}
                    {/*            value={mainRecipient}*/}
                    {/*            onChange={(e) => setMainRecipient(e.target.value)}*/}
                    {/*            className="px-2 py-1 border rounded flex-1 text-sm"*/}
                    {/*        />*/}
                    {/*        <button*/}
                    {/*            onClick={() => {*/}
                    {/*                if (mainRecipient) setSelectedUser(mainRecipient);*/}
                    {/*            }}*/}
                    {/*            className="px-2 py-1 bg-green-500 text-white rounded text-sm"*/}
                    {/*        >*/}
                    {/*            Open*/}
                    {/*        </button>*/}
                    {/*    </div>*/}
                    {/*</div>*/}
                </aside>

                {/* Right: conversation panel */}
                <main className="flex-1 p-4 flex flex-col">
                    {!selectedUser ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500">Select a chat on the left to view conversation</div>
                    ) : (
                        <>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Chat with {selectedUser}</h3>
                                <div className="text-sm text-gray-500">{conversation.length} messages</div>
                            </div>

                            <div className="flex-1 overflow-auto p-2 border rounded bg-white" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {conversation.length === 0 ? (
                                    <div className="text-sm text-gray-500">No messages in this chat yet.</div>
                                ) : (
                                    conversation.map((m, i) => {
                                        const isMine = m.from === userName;
                                        return (
                                            <div key={m.ts ?? i} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                                                <div
                                                    className={`p-2 rounded-lg max-w-[70%] ${isMine ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"}`}
                                                >
                                                    {/*<div style={{ fontSize: 13, opacity: 0.9 }}>*/}
                                                    {/*    {!isMine ? <strong>{m.from}</strong> : <strong>You</strong>}*/}
                                                    {/*</div>*/}
                                                    <div style={{ marginTop: 4 }}>{!isMine ? <strong>{m.from}</strong> : <strong>You</strong>}: {m.message}</div>
                                                    <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7, textAlign: "right" }}>
                                                        {new Date(m.ts ?? 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* per-chat input */}
                            <div className="mt-3 flex gap-2 items-center">
                                <input
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={`Message ${selectedUser}`}
                                    className="flex-1 px-3 py-2 border rounded"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") sendChatMessage();
                                    }}
                                    onFocus={()=> socket.emit("typing_event", { to: selectedUser, from: userName, isTyping: true, ts: Date.now() })}
                                />
                                <button onClick={sendChatMessage} className="px-4 py-2 bg-blue-500 text-white rounded">
                                    Send
                                </button>
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Optional debug: show raw messages */}
            {/* <pre style={{ marginTop: 8 }}>{JSON.stringify(messages, null, 2)}</pre> */}
        </div>
    );
}

export default WriteMessage;
