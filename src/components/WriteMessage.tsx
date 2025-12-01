import { useEffect, useState } from "react";
import { socket } from "../socket";

function WriteMessage() {
    const [messages, setMessages] = useState<{ to: string; from: string; message: string }[]>([]);
    const [message, setMessage] = useState("");
    const [targetUser, setTargetUser] = useState("");
    const [chatMembers, setChatMembers] = useState<string[]>([]);
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const userName = prompt("Enter your username") || "anonymous";

    useEffect(() => {
        socket.connect();

        socket.on("connect", () => {
            socket.emit("register", userName);
        });

        socket.on("private_message", (data) => {
            setMessages((prev) => [...prev, data]);
            // Add new member if not already present and not self
            const otherUser = data.to !== userName ? data.to : data.from;
            setChatMembers((prev) => {
                if (!prev.includes(otherUser)) return [...prev, otherUser];
                return prev;
            });
        });

        return () => {
            socket.off("private_message");
            socket.disconnect();
        };
    }, []);

    const sendMessage = () => {
        if (!targetUser || !message) return;

        socket.emit("private_message", {
            to: targetUser,
            from: userName,
            message,
        });

        setMessages((prev) => [...prev, { to: targetUser, from: userName, message }]);
        setMessage("");
        setShowDropdown(false);
    };

    const messagesForSelected = selectedMember
        ? messages.filter((msg) => msg.to === selectedMember || msg.from === selectedMember)
        : [];

    return (
        <div className="p-6">
            <h2 className="text-4xl font-bold mb-4">Username: {userName}</h2>

            <div className="flex border rounded-lg overflow-hidden h-[500px] shadow-md w-full max-w-4xl">
                {/* LEFT PANEL — Chat Members */}
                <div className="w-64 bg-gray-100 border-r p-4 overflow-y-auto flex-shrink-0">
                    <h3 className="font-semibold text-lg mb-3">Chats</h3>
                    <ul className="space-y-2">
                        {chatMembers.map((member) => (
                            <li
                                key={member}
                                onClick={() => setSelectedMember(member)}
                                className={`p-3 rounded-lg cursor-pointer transition ${
                                    selectedMember === member
                                        ? "bg-blue-500 text-white"
                                        : "bg-white hover:bg-gray-200"
                                }`}
                            >
                                {member}
                            </li>
                        ))}
                        {chatMembers.length === 0 && (
                            <li className="text-gray-500 text-sm">No previous chats</li>
                        )}
                    </ul>
                </div>

                {/* RIGHT PANEL — Chat Window */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Chat Header */}
                    <div className="p-4 border-b bg-gray-50 font-semibold text-lg text-black">
                        {selectedMember ? `Chat with ${selectedMember}` : "Select a chat or enter a recipient"}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {selectedMember ? (
                            messagesForSelected.length > 0 ? (
                                messagesForSelected.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 rounded-lg max-w-xs ${
                                            msg.from === userName
                                                ? "bg-blue-100 self-end ml-auto"
                                                : "bg-gray-200"
                                        }`}
                                    >
                                        <p className="text-sm text-gray-700">{msg.message}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400">No messages yet.</p>
                            )
                        ) : messages.length > 0 ? (
                            messages.map((msg, i) => (
                                <div key={i} className="text-sm text-gray-600 mb-2">
                                    <strong>{msg.from}</strong> → {msg.to}: {msg.message}
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400">No messages yet. Start by typing above.</p>
                        )}
                    </div>

                    {/* Input Fields — always visible */}
                    <div className="p-4 border-t flex gap-2 items-center">
                        {/* Recipient dropdown */}
                        <div className="relative">
                            <input
                                value={targetUser}
                                onChange={(e) => {
                                    setTargetUser(e.target.value);
                                    setShowDropdown(true);
                                }}
                                placeholder="Select recipient"
                                className="p-2 border rounded-lg border-black text-black w-52"
                                onFocus={() => setShowDropdown(true)}
                            />
                            {showDropdown && targetUser && (
                                <ul className="absolute z-10 top-full left-0 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-md">
                                    {chatMembers
                                        .filter((member) =>
                                            member.toLowerCase().includes(targetUser.toLowerCase())
                                        )
                                        .map((member) => (
                                            <li
                                                key={member}
                                                onClick={() => {
                                                    setTargetUser(member);
                                                    setSelectedMember(member);
                                                    setShowDropdown(false);
                                                }}
                                                className="p-2 cursor-pointer hover:bg-gray-200"
                                            >
                                                {member}
                                            </li>
                                        ))}
                                    {chatMembers.filter((member) =>
                                        member.toLowerCase().includes(targetUser.toLowerCase())
                                    ).length === 0 && (
                                        <li className="p-2 text-gray-400">No user found</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        {/* Message input */}
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 p-2 border rounded-lg border-black text-black"
                        />
                        <button
                            onClick={sendMessage}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WriteMessage;
