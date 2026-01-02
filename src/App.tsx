import { Routes, Route } from "react-router-dom";
import WriteMessage from "./components/WriteMessage.tsx";
import { PaymentComponent } from "./components/Payment.tsx";
import { RedirectComponent } from "./components/Redirect.tsx";

function App() {
  return (
    <Routes>
      <Route path="/write-message" element={<WriteMessage />} />
      <Route path="/payment" element={<PaymentComponent />} />
      <Route path="/redirect" element={<RedirectComponent />} />

    </Routes>
  );
}

export default App;
