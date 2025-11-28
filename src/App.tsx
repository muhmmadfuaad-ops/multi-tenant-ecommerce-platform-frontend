import { useEffect, useState } from "react";
import { socket } from "./socket";

function App() {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        // connect socket once
        socket.connect();

        socket.on("connect", () => {
            console.log("Connected as React User1:", socket.id);
            socket.emit("register", "user1");
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
            to: "user2",
            message,
        });
        setMessage("");
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Socket.IO Chat (User1)</h2>

            <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
            />

            <button onClick={sendMessage}>Send to User2</button>

            <h3>Messages:</h3>
            {messages.map((msg, i) => (
                <p key={i}>
                    <strong>{msg.from}:</strong> {msg.message}
                </p>
            ))}
        </div>
    );
}

export default App;
