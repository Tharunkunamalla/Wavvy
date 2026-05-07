import React from "react";
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RoomPage from "./pages/RoomPage";
import LoginPage from "./pages/LoginPage";
import About from "./pages/AboutUs";
import Contact from "./pages/ContactUs";
import { Toaster } from "react-hot-toast";

const ProtectedRoute = ({children}) => {
  try {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) {
      return <LoginPage />;
    }
    return children;
  } catch (error) {
    console.error("Auth error:", error);
    localStorage.removeItem("user"); // Clear corrupted data
    return <LoginPage />;
  }
};

function App() {
  return (
    <>
    <Toaster
  position="top-right"
  toastOptions={{
    style: {
      background: "#18181b",
      color: "#fff",
      border: "1px solid #27272a"
    },
    success: {
      style: {
        border: "1px solid #f97316",
        color: "#f97316"
      }
    },
    error: {
      style: {
        border: "1px solid #ef4444",
        color: "#ef4444"
      }
    }
  }}
/>
    <Router>
      <div className="min-h-screen bg-black overflow-x-hidden">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about?" element={<About />} />
          <Route path="/contact" element={<Contact/>}/>
          <Route path="/login?" element={<LoginPage />} />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <RoomPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
    </>
  );
}

export default App;
