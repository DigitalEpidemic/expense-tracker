import { LogOut, Receipt, User } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [cachedImageUrl, setCachedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.photoURL && !cachedImageUrl) {
      setCachedImageUrl(user.photoURL);
    }
  }, [user?.photoURL, cachedImageUrl]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {cachedImageUrl && !imageError ? (
                <img
                  src={cachedImageUrl}
                  alt={user?.displayName || "User"}
                  className="w-8 h-8 rounded-full"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center" data-testid="user-fallback-icon">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user?.displayName}
              </span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
