import { useEffect, useState } from "react";
import { socket } from "../socket";

function WriteMessage() {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [targetUser, setTargetUser] = useState("");

    const userName = prompt("Enter your username") || "anonymous";

    useEffect(() => {
        console.log('messages:', messages)
    }, [messages]);

    useEffect(() => {
        // connect socket once
        socket.connect();

        socket.on("connect", () => {
            console.log(`${userName} connected with socket id: socket.id`);
            socket.emit("register", userName);
        });

        socket.on("private_message", (data) => {
            console.log("Received message:", data);
            setMessages((prev) => [...prev, data]);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket error:", err.message);
        });

        // cleanup on unmount
        return () => {
            socket.off("private_message");
            socket.off("connect_error");
            socket.disconnect();
        };
    }, []);

    const sendMessage = () => {
        socket.emit("private_message", {
            to: targetUser,
            message,
        });
        setMessage("");
    };

    return (
        <div style={{ padding: 20 }}>
            <h2 className='text-4xl font-bold'>Username: {userName}</h2>

            <div style={{ marginBottom: 10 }}>
                <input
                    value={targetUser}
                    onChange={(e) => setTargetUser(e.target.value)}
                    placeholder="Recipient username"
                    style={{ marginRight: 10, padding: 5 }}
                />
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    style={{ marginRight: 10, padding: 5 }}
                />
                <button
                    className="bg-blue-400 px-4 py-2 text-white rounded"
                    onClick={sendMessage}
                >
                    Send
                </button>
            </div>

            <h3>Messages:</h3>
            {messages.map((msg, i) => (
                <p key={i}>
                    <strong>{msg.from}:</strong> {msg.message}
                </p>
            ))}
        </div>
    );
}

export default WriteMessage;
