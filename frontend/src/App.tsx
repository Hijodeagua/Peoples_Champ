import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import LandingPage from "./pages/LandingPage";
import DailyGamePage from "./pages/DailyGamePage";
import PeoplesRankingsPage from "./pages/PeoplesRankingsPage";
import MethodologyPage from "./pages/MethodologyPage";
import ArchivePage from "./pages/ArchivePage";
import UnlimitedRankPage from "./pages/UnlimitedRankPage";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-white">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/daily" element={<DailyGamePage />} />
            <Route path="/rankings" element={<PeoplesRankingsPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/unlimited" element={<UnlimitedRankPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
