import React, { useState } from "react";
import usersData from "../../db.json"; // Adjust path if needed

interface User {
    id: number;
    fullName: string;
    userName: string;
    email: string;
    password: string;
}

const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        const user: User | undefined = usersData.users.find(
            (u) => u.email === email && u.password === password
        );

        if (user) {
            setSuccess(`Welcome, ${user.fullName}!`);
            setError("");
            // You can also save login state to localStorage/sessionStorage here
        } else {
            setError("Invalid email or password");
            setSuccess("");
        }
    };

    return (
        <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <div style={{ marginBottom: "10px" }}>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                    />
                </div>

                <div style={{ marginBottom: "10px" }}>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                    />
                </div>

                <button type="submit" style={{ padding: "10px 20px" }}>Login</button>
            </form>

            {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
            {success && <p style={{ color: "green", marginTop: "10px" }}>{success}</p>}
        </div>
    );
};

export default Login;
