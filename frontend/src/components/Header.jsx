import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#lg)" />
      <path
        d="M7 14l2.5-6h1.6L13.6 14h-1.5l-.5-1.3H9.2L8.7 14H7zm2.6-2.6h1.4l-.7-1.9-.7 1.9zM14.5 14V8h1.4l.05.95c.31-.7.86-1.05 1.65-1.05.6 0 1.07.2 1.4.6.34.4.5.94.5 1.6V14h-1.4v-3.6c0-.42-.07-.73-.22-.93-.15-.2-.4-.3-.74-.3-.36 0-.65.12-.86.36-.21.24-.31.58-.31 1.02V14h-1.47z"
        fill="white"
      />
    </svg>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  const userLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/catalog", label: "Catalog" },
    { to: "/logs", label: "Call Logs" },
    { to: "/api-key", label: "API Key" },
  ];
  const adminLinks = [
    { to: "/admin", label: "Overview" },
    { to: "/admin/apis", label: "Manage APIs" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/logs", label: "All Logs" },
  ];

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = (user?.email || "?").slice(0, 2).toUpperCase();
  const homePath = isAdmin ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <NavLink to={homePath} className="flex items-center gap-2.5">
              <LogoMark />
              <div className="hidden sm:block">
                <div className="text-base font-bold text-slate-900 leading-tight">API Marketplace</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 -mt-0.5">
                  Usage Metering
                </div>
              </div>
            </NavLink>
            <nav className="hidden md:flex items-center gap-1">
              {userLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) => (isActive ? "nav-link-active" : "nav-link-inactive")}
                >
                  {l.label}
                </NavLink>
              ))}
              {isAdmin && (
                <div className="relative ml-1" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="nav-link-inactive flex items-center gap-1"
                  >
                    Admin
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-slate-200 py-1.5 z-50">
                      {adminLinks.map((l) => (
                        <NavLink
                          key={l.to}
                          to={l.to}
                          end={l.to === "/admin"}
                          onClick={() => setMenuOpen(false)}
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm ${
                              isActive ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                            }`
                          }
                        >
                          {l.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="hidden sm:inline-flex badge bg-amber-50 text-amber-700 border border-amber-200">
                ADMIN
              </span>
            )}
            <div className="hidden sm:flex items-center gap-2.5 pr-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center">
                {initials}
              </div>
              <span className="text-sm text-slate-700 max-w-[180px] truncate">{user?.email}</span>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-xs">
              Sign out
            </button>
            <button
              className="md:hidden btn-ghost px-2"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle nav"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z" />
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden pb-3 space-y-1">
            {[...userLinks, ...(isAdmin ? adminLinks : [])].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/admin"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block ${isActive ? "nav-link-active" : "nav-link-inactive"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
