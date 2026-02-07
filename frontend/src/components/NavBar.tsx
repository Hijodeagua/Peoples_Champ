import { NavLink, Link } from "react-router-dom";
import { useState } from "react";

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

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
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
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
