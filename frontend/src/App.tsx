import { NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/Home";
import PlayPage from "./pages/Play";
import Top100Page from "./pages/Top100";
import MethodologyPage from "./pages/Methodology";
import BuckWildPage from "./pages/BuckWild";

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top nav */}
      <header className="w-full border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <NavLink to="/" className="font-bold text-lg">
          Peoples Champ
        </NavLink>

        <nav className="flex gap-4 text-sm">
          <NavLink
            to="/play"
            className={({ isActive }) =>
              isActive ? "text-emerald-400 font-semibold" : "text-slate-300"
            }
          >
            Daily Rank
          </NavLink>
          <NavLink
            to="/top-100"
            className={({ isActive }) =>
              isActive ? "text-emerald-400 font-semibold" : "text-slate-300"
            }
          >
            Top 100 Rankings
          </NavLink>
          <NavLink
            to="/methodology"
            className={({ isActive }) =>
              isActive ? "text-emerald-400 font-semibold" : "text-slate-300"
            }
          >
            Methodology
          </NavLink>
          <NavLink
            to="/buck-wild"
            className={({ isActive }) =>
              isActive ? "text-emerald-400 font-semibold" : "text-slate-300"
            }
          >
            Buck Wild
          </NavLink>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/top-100" element={<Top100Page />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/buck-wild" element={<BuckWildPage />} />
        </Routes>
      </main>

      <footer className="w-full border-t border-slate-800 px-4 py-3 text-xs text-slate-500 text-center">
        © {new Date().getFullYear()} Peoples Champ
      </footer>
    </div>
  );
}

export default App;
