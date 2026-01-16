import { NavLink, Link } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="text-xl font-bold text-emerald-400 hover:text-emerald-300 transition">
            WHO'S YUR GOAT
          </Link>
          
          <div className="flex items-center space-x-1">
            <NavLink
              to="/daily"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-500 text-black"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`
              }
            >
              Daily Game
            </NavLink>
          <NavLink
            to="/rankings"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-500 text-black"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            Peoples Rankings
          </NavLink>
          <NavLink
            to="/methodology"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-500 text-black"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            Methodology
          </NavLink>
          <NavLink
            to="/archive"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-500 text-black"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            Archive
          </NavLink>
          <NavLink
            to="/unlimited"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-500 text-black"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            Unlimited Rank
          </NavLink>
          <NavLink
            to="/alltime"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-500 text-black"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            Whos yur 🐐?
          </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
