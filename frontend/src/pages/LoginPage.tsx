import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            D
          </div>
          <h1 className="text-white text-2xl font-bold">DriveStack</h1>
        </div>
        <p className="text-gray-400 text-center text-sm">
          Connect multiple Google accounts and use their combined storage as one unified drive.
        </p>
        <div className="w-full border-t border-gray-800" />
          <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/auth/google`} className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors">
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </a>
        <p className="text-gray-600 text-xs text-center">
          By signing in, you agree to allow DriveStack access to your Google Drive storage.
        </p>
      </div>
    </div>
  );
}