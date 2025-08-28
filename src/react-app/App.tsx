import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@/react-app/hooks/useSupabaseAuth";
import HomePage from "@/react-app/pages/Home";
import Login from "@/react-app/pages/Login";
import AuthCallback from "@/react-app/pages/AuthCallback";
import Admin from "@/react-app/pages/Admin";
import Checkout from "@/react-app/pages/Checkout";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";
import { CartProvider } from "@/react-app/hooks/useCart";

export default function App() {
  console.log('App component rendering');
  
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
