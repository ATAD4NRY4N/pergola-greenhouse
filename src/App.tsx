import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { AuthPage } from "./pages/AuthPage";
import { Designer } from "./components/Designer";
import { RequireAuth } from "./components/RequireAuth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/designer"
          element={
            <RequireAuth>
              <Designer />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}