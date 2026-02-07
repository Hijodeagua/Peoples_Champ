import { NavLink, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

const navItems = [
  { to: "/daily", label: "Daily Game" },
  { to: "/rankings", label: "Rankings" },
  { to: "/alltime", label: "All-Time GOAT" },
  { to: "/archive", label: "Archive" },
  { to: "/methodology", label: "How It Works" },
];

function NavLinkItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav
      ref={menuRef}
      className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80"
      style={{ paddingTop: "var(--safe-area-top)" }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight hover:opacity-80 transition"
          >
            <span className="text-emerald-400">PEOPLES</span>
            <span className="text-slate-100">CHAMP</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLinkItem key={item.to} {...item} />
            ))}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition active:scale-95"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            <div className="relative w-5 h-5">
              <span
                className={`absolute left-0 block w-5 h-0.5 bg-current transition-all duration-300 ${
                  mobileOpen ? "top-2.5 rotate-45" : "top-1"
                }`}
              />
              <span
                className={`absolute left-0 top-2.5 block w-5 h-0.5 bg-current transition-all duration-300 ${
                  mobileOpen ? "opacity-0 scale-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 block w-5 h-0.5 bg-current transition-all duration-300 ${
                  mobileOpen ? "top-2.5 -rotate-45" : "top-4"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Nav Menu - slide down animation */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1 safe-bottom">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3.5 rounded-lg text-base font-medium transition active:scale-[0.98] ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50 active:bg-slate-700/50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* Backdrop overlay when menu is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-[calc(3.5rem+var(--safe-area-top))] bg-black/40 md:hidden z-[-1]"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </nav>
  );
}
