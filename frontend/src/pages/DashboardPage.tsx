import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}! 👋</h1>
        <p className="text-gray-400">{user.email}</p>
        <p className="text-gray-500 mt-4 text-sm">Dashboard coming soon...</p>
      </div>
    </div>
  );
}