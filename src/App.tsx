import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import WriteMessage from "./components/WriteMessage.tsx";
import Login from "./components/Login.tsx"

function App() {
  const isLoggedIn = false; // Replace with your auth logic
  
  return (
    <Router>
      <Routes>
        {/* Login route */}
        <Route path="/login" element={<Login />} />

        {/* Chat route */}
        <Route
          path="/chat"
          element={
            isLoggedIn ? <WriteMessage /> : <Navigate to="/login" replace />
          }
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
