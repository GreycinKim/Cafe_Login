import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", roles: ["admin", "worker"] },
  { to: "/expenses", label: "Expenses", roles: ["admin", "worker"] },
  { to: "/reimbursements", label: "Reimbursements", roles: ["admin", "worker"] },
  { to: "/recipes", label: "Drinks", roles: ["admin", "worker"] },
  { to: "/analytics", label: "Analytics", roles: ["admin", "worker"] },
  { to: "/activity", label: "Activity", roles: ["admin", "worker"] },
  { to: "/inventory", label: "Inventory", roles: ["admin", "worker"] },
  { to: "/admin/users", label: "Users", roles: ["admin"] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filtered = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full" />
              <span className="text-lg font-semibold text-gray-900">
                Life Word Mission Cafe
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {filtered.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{user?.name}</span>
                <span className="ml-1 text-xs uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-gray-100 px-4 py-2 flex gap-1 overflow-x-auto">
          {filtered.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:text-gray-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
