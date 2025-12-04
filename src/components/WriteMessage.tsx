import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../socket";
import {storage} from "../utils/storage";

const {getUserName, saveUserName, getUserId, saveUserId, getUsers, saveUsers, getChats, saveChats, clearAll} = storage;

type ChatMsg = { to: string; from: string; message: string; ts?: number };
type TypingEvent = { to: string; from: string; isTyping: boolean; ts?: number };

function safeParseChats(key = "chats"): ChatMsg[] {
    try {
        const chats: ChatMsg[] = getChats();
        // console.log('chats:', chats)

        if (!chats) return [];
        if (Array.isArray(chats)) return chats;
        return [];
    } catch {
        return [];
    }
}

function persistChats(messages: ChatMsg[], key = "chats") {
    try {
        saveChats(messages)
    } catch (e) {
        console.warn("Could not persist chats:", e);
    }
}


function WriteMessage() {
    const [isLoggedIn, setIsLoggedIn] = useState(!!getUserName());
    // const [userName, setUserName] = useState(getUserName());
    const [userName, setUserName] = useState<string | null>(() => getUserName());
    const [mainRecipient, setMainRecipient] = useState("");
    const [mainMessage, setMainMessage] = useState("");
    const [typingMembers, setTypingMembers] = useState<Set<string>>(new Set());
    // state for dropdown visibility
    const [showDropdown, setShowDropdown] = useState(false);

    // all messages store
    const [messages, setMessages] = useState<ChatMsg[]>(() => safeParseChats());
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    // UI: selected chat partner shown on right
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState(""); // per-chat input

    const [users, setUsers] = useState<string[]>(getUsers());

    // Ensure socket connect once and handle incoming messages
    useEffect(() => {
        console.log('socket.connected:', socket.connected);
        console.log('userName:', userName);
        if (!socket.connected && userName) {
            console.log('socket.connect() triggered')
            socket.connect();
        }

        const onConnect = () => {
            console.log(`${userName} connected with socket id: ${socket.id}`);
            if (socket.id) {
                saveUserId(socket.id);
            }
            console.log('Emitting registerUser with userName:', userName);
            socket.emit("registerUser", userName);
        };

        const onDisconnect = () => {
            // setIsLoggedIn(false);
            // setUserName(null);
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

        const onTypingEvent = (data: TypingEvent) => {
            if (data.isTyping) console.log(`${data.from} started typing`);
            if (!data.isTyping) console.log(`${data.from} stopped typing`);

            setTypingMembers((prev) => {
                const next = new Set(prev);
                if (data.isTyping) {
                    next.add(data.from);
                } else {
                    next.delete(data.from);
                }
                return next;
            })
        };

        const onConnectError = (err: any) => {
            console.error("Socket error:", err?.message ?? err);
        };

        // when new user connects
        const onUserConnected = (data: {userData: string}) => {
            console.log('data in onUserConnected:', data)
            console.log('users in onUserConnected:', users)
            setUsers(prev => Array.from(new Set([...prev, data.userData])));
        }

        // when new user disconnects
        const onUserDisconnected = (data: {userData: string}) => {
            console.log('data in onUserConnected:', data)
            console.log('users in onUserConnected:', users)
            setUsers(prev => prev.filter(u => u !== data.userData));
        }

        // receive all users upon registration
        const onRegistrationSuccessful = (data: {usersData: [string]}) => {
            console.log('data in onRegistrationSuccessful:', data)
            console.log('users in onRegistrationSuccessful:', users)

            setUsers(prev => Array.from(new Set([...prev, ...data.usersData])));
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect)
        socket.on("private_message", onPrivateMessage);
        socket.on("connect_error", onConnectError);
        socket.on("typingEvent", onTypingEvent)
        socket.on("userConnected", onUserConnected);
        socket.on("userDisconnected", onUserDisconnected);
        socket.on("registrationSuccessful", onRegistrationSuccessful)
        return () => {
            socket.off("connect", onConnect);
            socket.off("private_message", onPrivateMessage);
            socket.off("connect_error", onConnectError);
            // do not disconnect if you rely on socket elsewhere in app,
            // but original code disconnected — keep behavior but safe:
            if (socket.connected) {
                console.log('socket.disconnect() triggered on unmount')
                socket.disconnect();
            }
        };
        // intentionally run only once on mount/unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist whenever messages changes (safety in addition to immediate persist on receive)
    useEffect(() => {
        persistChats(messages);
        console.log('messages:', messages)
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
    // console.log('conversation:', conversation);

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

    const clearLocalData = () => {
        setMessages([]);
        setUserName(null);
    }

    const handleLogOut = () => {
        console.log('socket.disconnect() triggered in handleLogOut')
        socket.disconnect();
        clearAll();
        clearLocalData();
        setIsLoggedIn(false);
    }

    // quick helper: open chat with user (also focus input in UI if you implement refs)
    const openChat = (name: string) => {
        setSelectedUser(name);
    };

    // Filter users based on input
    const filteredUsers = users.filter((u) =>
        u?.toLowerCase().startsWith(mainRecipient.toLowerCase())
    );

    const handleSelect = (user: string) => {
        setMainRecipient(user);
        setShowDropdown(false);
    };

    useEffect(() => {
        console.log('typeof users:', typeof users)
        console.log('users in useEffect:', users)
        if (socket.connected) saveUsers(users);
    }, [users]);

    return (
        <div className="p-4" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            {/* Top-level inputs remain (user asked to keep them) */}
            <div className="mb-4">
                <div>

                    {/*<ul>*/}
                    {/*    {users.map((u) =>*/}
                    {/*        {*/}
                    {/*            return (<li>(u)</li>)*/}
                    {/*        }*/}
                    {/*    }*/}
                    {/*</ul>*/}

                    {isLoggedIn &&
                        <div>
                            <h2 className="text-2xl font-semibold">Username: {userName}</h2>
                            <ul>
                                <h3>All Users</h3>
                                {users.map((u, index) => (
                                    <li key={index}>{u}</li>
                                ))}
                            </ul>
                            <button onClick={handleLogOut} className="px-4 py-2 bg-blue-500 text-white rounded">
                                Log Out
                            </button>
                        </div>
                    }

                </div>
                <div className="flex gap-2 mt-2">
                    <input
                        value={mainRecipient}
                        onChange={(e) => {
                            setMainRecipient(e.target.value);
                            setShowDropdown(true); // open dropdown when typing
                        }}
                        // onFocus={() => setShowDropdown(true)}
                        placeholder="Recipient username (top-level)"
                        className="px-3 py-2 border rounded flex-1"
                    />
                    {showDropdown && mainRecipient && filteredUsers.length > 0 && (
                        <ul className="absolute left-0 right-0 bg-white border rounded mt-1 shadow z-10">
                            {filteredUsers.map((user) => (
                                <li
                                    key={user}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleSelect(user)}
                                >
                                    {user}
                                </li>
                            ))}
                        </ul>
                    )}
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
                    <h3 className="font-medium mb-2 text-black">Chats</h3>
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
                                            <strong>{member}</strong>{typingMembers.has(member) && <span className="text-red-900">typing...</span>}
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
                                                    <div style={{ marginTop: 4 }}>{!isMine ? <strong>{m.from}</strong> : <strong>You</strong>}: {m.message}</div>
                                                    <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7, textAlign: "right" }}>
                                                        {new Date(m.ts ?? 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                {typingMembers.has(selectedUser) && <span className="font-bold text-black">Typing...</span>}

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
                                    onFocus={()=> socket.emit("typingEvent", { to: selectedUser, from: userName, isTyping: true, ts: Date.now() })}
                                    onBlur={()=> socket.emit("typingEvent", { to: selectedUser, from: userName, isTyping: false, ts: Date.now() })}
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
