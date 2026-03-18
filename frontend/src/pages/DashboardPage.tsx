import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import FileExplorer from "../components/FileExplorer";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" />;

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      <FileExplorer />
    </div>
  );
}