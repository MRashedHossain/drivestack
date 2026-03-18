import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StorageBar from "./StorageBar";

interface AccountStorage {
  id: string;
  googleEmail: string;
  total: number;
  used: number;
  free: number;
}

interface StorageOverview {
  totalStorage: number;
  usedStorage: number;
  freeStorage: number;
  accounts: AccountStorage[];
}

export default function Sidebar() {
  const { user } = useAuth();
  const [storage, setStorage] = useState<StorageOverview | null>(null);

  useEffect(() => {
    api.get("/storage/overview").then((res) => setStorage(res.data));
  }, []);

  const handleLogout = async () => {
    await api.get("/auth/logout");
    window.location.href = "/";
  };

  const handleLinkAccount = () => {
    window.location.href = "http://localhost:5000/auth/google/link";
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen p-4 gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
          D
        </div>
        <span className="text-white font-bold text-lg">DriveStack</span>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {storage && (
          <div className="flex flex-col gap-3">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Total Storage</p>
            <StorageBar
              label="All Accounts"
              used={storage.usedStorage}
              total={storage.totalStorage}
            />
            <p className="text-gray-500 text-xs uppercase tracking-wider mt-2">Accounts</p>
            {storage.accounts.map((account) => (
              <StorageBar
                key={account.id}
                label={account.googleEmail}
                used={account.used}
                total={account.total}
              />
            ))}
          </div>
        )}

        <button
          onClick={handleLinkAccount}
          className="w-full text-left text-blue-400 text-sm hover:text-blue-300 transition-colors py-1"
        >
          + Link another Google account
        </button>
      </div>

      <div className="border-t border-gray-800 pt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {user?.avatar && (
            <img src={user.avatar} alt="avatar" className="w-7 h-7 rounded-full" />
          )}
          <div className="flex flex-col">
            <span className="text-white text-xs font-medium truncate">{user?.name}</span>
            <span className="text-gray-500 text-xs truncate">{user?.email}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-500 text-xs hover:text-red-400 transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}