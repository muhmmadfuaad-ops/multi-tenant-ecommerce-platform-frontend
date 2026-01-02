import { Routes, Route } from "react-router-dom";
import WriteMessage from "./components/WriteMessage.tsx";

function App() {
  return (
    <Routes>
      <Route path="/write-message" element={<WriteMessage />} />
    </Routes>
  );
}

export default App;
