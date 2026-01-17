import { useRef, useEffect, useState } from "react";

type Player = {
  name: string;
  team?: string | null;
  position?: string | null;
  jerseyNumber?: number | string | null;
  [key: string]: any;
};

type ImageFormat = "twitter" | "instagram" | "square";
type GraphicStyle = "podium" | "rushmore";

interface SocialGraphicGeneratorProps {
  players: Player[];
  title: string;
  subtitle: string;
  onClose: () => void;
  shareUrl?: string;
  style?: GraphicStyle; // "podium" for daily, "rushmore" for all-time
}

const FORMATS: Record<ImageFormat, { width: number; height: number; label: string }> = {
  twitter: { width: 1200, height: 630, label: "Twitter/Facebook" },
  instagram: { width: 1080, height: 1920, label: "Instagram Story" },
  square: { width: 1080, height: 1080, label: "Square" },
};

// Team colors for jersey display (primary, secondary)
const TEAM_COLORS: Record<string, [string, string]> = {
  // Current teams
  ATL: ["#E03A3E", "#C1D32F"],
  BOS: ["#007A33", "#BA9653"],
  BRK: ["#000000", "#FFFFFF"],
  CHA: ["#1D1160", "#00788C"],
  CHI: ["#CE1141", "#000000"],
  CLE: ["#860038", "#FDBB30"],
  DAL: ["#00538C", "#002B5E"],
  DEN: ["#0E2240", "#FEC524"],
  DET: ["#C8102E", "#1D42BA"],
  GSW: ["#1D428A", "#FFC72C"],
  HOU: ["#CE1141", "#000000"],
  IND: ["#002D62", "#FDBB30"],
  LAC: ["#C8102E", "#1D428A"],
  LAL: ["#552583", "#FDB927"],
  MEM: ["#5D76A9", "#12173F"],
  MIA: ["#98002E", "#F9A01B"],
  MIL: ["#00471B", "#EEE1C6"],
  MIN: ["#0C2340", "#236192"],
  NOP: ["#0C2340", "#C8102E"],
  NYK: ["#006BB6", "#F58426"],
  OKC: ["#007AC1", "#EF3B24"],
  ORL: ["#0077C0", "#C4CED4"],
  PHI: ["#006BB6", "#ED174C"],
  PHO: ["#1D1160", "#E56020"],
  POR: ["#E03A3E", "#000000"],
  SAC: ["#5A2D81", "#63727A"],
  SAS: ["#C4CED4", "#000000"],
  TOR: ["#CE1141", "#000000"],
  UTA: ["#002B5C", "#00471B"],
  WAS: ["#002B5C", "#E31837"],
  // Historical abbreviations
  SEA: ["#00653A", "#FFC200"],
  NJN: ["#002A60", "#CD1041"],
  VAN: ["#00B2A9", "#E43C40"],
  WSB: ["#002B5C", "#E31837"],
  NOH: ["#0C2340", "#C8102E"],
  NOK: ["#0C2340", "#C8102E"],
  KCK: ["#C8102E", "#1D428A"],
  SDC: ["#C8102E", "#1D428A"],
  CHH: ["#1D1160", "#00788C"],
};

// Get primary team from team string (first 3-letter code)
function getPrimaryTeam(teamStr: string | null | undefined): string {
  if (!teamStr) return "UNK";
  // Team string might be like "CLELALMIA" - take first 3 chars
  return teamStr.substring(0, 3).toUpperCase();
}

function getTeamColors(teamStr: string | null | undefined): [string, string] {
  const team = getPrimaryTeam(teamStr);
  return TEAM_COLORS[team] || ["#374151", "#6B7280"]; // Default gray
}

export default function SocialGraphicGenerator({
  players,
  title,
  subtitle,
  onClose,
  shareUrl,
  style = "podium",
}: SocialGraphicGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<ImageFormat>("twitter");
  const [copied, setCopied] = useState(false);

  // Draw a basketball jersey shape (tank top style)
  const drawBasketballJersey = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    primaryColor: string,
    secondaryColor: string,
    jerseyNumber: string | number
  ) => {
    const w = width;
    const h = height;
    
    // Basketball tank top jersey shape
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    
    // Start at left shoulder strap
    ctx.moveTo(x + w * 0.25, y);
    
    // Neck curve (scoop neck)
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.08, x + w * 0.75, y);
    
    // Right shoulder strap
    ctx.lineTo(x + w * 0.85, y + h * 0.05);
    
    // Right armhole (curved)
    ctx.quadraticCurveTo(x + w * 0.95, y + h * 0.15, x + w * 0.88, y + h * 0.32);
    
    // Right side of jersey
    ctx.lineTo(x + w * 0.85, y + h * 0.95);
    
    // Bottom curve
    ctx.quadraticCurveTo(x + w * 0.5, y + h, x + w * 0.15, y + h * 0.95);
    
    // Left side of jersey
    ctx.lineTo(x + w * 0.12, y + h * 0.32);
    
    // Left armhole (curved)
    ctx.quadraticCurveTo(x + w * 0.05, y + h * 0.15, x + w * 0.15, y + h * 0.05);
    
    ctx.closePath();
    ctx.fill();
    
    // Jersey trim/outline
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Collar trim
    ctx.beginPath();
    ctx.moveTo(x + w * 0.28, y + h * 0.02);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.1, x + w * 0.72, y + h * 0.02);
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Jersey number
    ctx.fillStyle = secondaryColor;
    ctx.font = `bold ${h * 0.45}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${jerseyNumber}`, x + w / 2, y + h * 0.55);
  };

  // Draw trophy case frame
  const drawTrophyCase = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    // Wood frame
    const frameWidth = 8;
    ctx.fillStyle = "#8B4513"; // saddle brown
    ctx.fillRect(x - frameWidth, y - frameWidth, width + frameWidth * 2, height + frameWidth * 2);
    
    // Inner shadow
    ctx.fillStyle = "#5D3A1A";
    ctx.fillRect(x - frameWidth / 2, y - frameWidth / 2, width + frameWidth, height + frameWidth);
    
    // Glass/background
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "#1e293b");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  };

  // Generate PODIUM style graphic (for daily rankings)
  const generatePodiumGraphic = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const scale = format === "instagram" ? 1.5 : format === "square" ? 1.2 : 1;
    const isVertical = format === "instagram";

    // Background gradient (dark theme)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0f172a"); // slate-900
    gradient.addColorStop(0.5, "#1e293b"); // slate-800
    gradient.addColorStop(1, "#0f172a"); // slate-900
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative circles
    ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
    ctx.beginPath();
    ctx.arc(width * 0.9, height * 0.1, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.1, height * 0.9, 150, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = "#10b981";
    ctx.font = `bold ${48 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    const titleY = isVertical ? 120 * scale : 80;
    ctx.fillText(title, width / 2, titleY);

    // Subtitle
    ctx.fillStyle = "#94a3b8";
    ctx.font = `${24 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    const subtitleY = isVertical ? 180 * scale : 130;
    ctx.fillText(subtitle, width / 2, subtitleY);

    // Decorative line
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.3, subtitleY + 30);
    ctx.lineTo(width * 0.7, subtitleY + 30);
    ctx.stroke();

    // Player list
    const startY = subtitleY + 60 * scale;
    const itemHeight = isVertical ? 80 : format === "square" ? 65 : 50;
    const maxPlayers = Math.min(players.length, isVertical ? 15 : format === "square" ? 10 : 8);

    for (let i = 0; i < maxPlayers; i++) {
      const player = players[i];
      const y = startY + i * itemHeight;
      const rowCenterX = width / 2;

      // Medal/rank decoration for top 3
      if (i < 3) {
        const medals = ["#fbbf24", "#9ca3af", "#d97706"]; // gold, silver, bronze
        ctx.fillStyle = medals[i];
        ctx.beginPath();
        ctx.arc(rowCenterX - 280 * (format === "twitter" ? 1 : scale), y - 5, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.font = `bold ${16 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1}`, rowCenterX - 280 * (format === "twitter" ? 1 : scale), y + 2);
      } else {
        ctx.fillStyle = "#64748b";
        ctx.font = `bold ${20 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1}`, rowCenterX - 280 * (format === "twitter" ? 1 : scale), y);
      }

      // Player name (no team)
      ctx.fillStyle = "#ffffff";
      ctx.font = `${i < 3 ? "bold " : ""}${22 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(player.name, rowCenterX - 240 * (format === "twitter" ? 1 : scale), y);
    }

    // Footer
    const footerY = height - (isVertical ? 150 : 60);
    ctx.fillStyle = "#10b981";
    ctx.font = `bold ${20 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("WhosYurGoat.app", width / 2, footerY);

    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    ctx.fillStyle = "#64748b";
    ctx.font = `${14 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(dateStr, width / 2, footerY + 25 * scale);
  };

  // Generate RUSHMORE style graphic (for all-time rankings)
  const generateRushmoreGraphic = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const scale = format === "instagram" ? 1.5 : format === "square" ? 1.2 : 1;
    const isVertical = format === "instagram";

    // Background - light court color
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#e2e8f0");
    bgGradient.addColorStop(0.5, "#f1f5f9");
    bgGradient.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Court lines decoration
    ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.45, Math.min(width, height) * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height * 0.45);
    ctx.lineTo(width, height * 0.45);
    ctx.stroke();

    // Title banner
    const bannerHeight = 50 * scale;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, width, bannerHeight + 10);
    ctx.beginPath();
    ctx.moveTo(0, bannerHeight + 10);
    ctx.lineTo(width * 0.05, bannerHeight + 25);
    ctx.lineTo(width * 0.95, bannerHeight + 25);
    ctx.lineTo(width, bannerHeight + 10);
    ctx.fillStyle = "#334155";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${32 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐐 GOAT MT RUSHMORE 🐐", width / 2, bannerHeight / 2 + 5);

    // Top 4 players with jerseys
    const top4 = players.slice(0, 4);
    const jerseyAreaY = bannerHeight + 40 * scale;
    const jerseyWidth = format === "twitter" ? 140 : 120 * scale;
    const jerseyHeight = jerseyWidth * 1.1;
    const caseWidth = jerseyWidth + 30;
    const caseHeight = jerseyHeight + 40;
    const spacing = (width - caseWidth * 4) / 5;

    const rankColors = ["#3B82F6", "#8B5CF6", "#10B981", "#EF4444"];

    for (let i = 0; i < Math.min(4, top4.length); i++) {
      const player = top4[i];
      const caseX = spacing + i * (caseWidth + spacing);
      const caseY = jerseyAreaY;

      drawTrophyCase(ctx, caseX, caseY, caseWidth, caseHeight);

      ctx.fillStyle = rankColors[i];
      ctx.font = `bold ${36 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, caseX + caseWidth / 2, caseY - 15);

      const [primary, secondary] = getTeamColors(player.team);
      const jerseyNum = player.jerseyNumber ?? (i + 1);
      drawBasketballJersey(ctx, caseX + 15, caseY + 15, jerseyWidth, jerseyHeight, primary, secondary, jerseyNum);

      ctx.fillStyle = "#1e293b";
      ctx.font = `bold ${18 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "center";
      const nameParts = player.name.split(" ");
      const displayName = nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : player.name.toUpperCase();
      ctx.fillText(displayName, caseX + caseWidth / 2, caseY + caseHeight + 25);
    }

    // Remaining players (5-10)
    const listStartY = jerseyAreaY + caseHeight + 55 * scale;
    const remainingPlayers = players.slice(4, 10);

    if (remainingPlayers.length > 0 && !isVertical) {
      const col1X = width * 0.2;
      const col2X = width * 0.6;
      const itemHeight = 28 * scale;

      for (let i = 0; i < remainingPlayers.length; i++) {
        const player = remainingPlayers[i];
        const rank = i + 5;
        const col = i < 3 ? 0 : 1;
        const row = i < 3 ? i : i - 3;
        const x = col === 0 ? col1X : col2X;
        const y = listStartY + row * itemHeight;

        ctx.fillStyle = "#64748b";
        ctx.font = `${16 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText(`${rank}.`, x - 10, y);

        ctx.fillStyle = "#334155";
        ctx.textAlign = "left";
        ctx.fillText(player.name, x, y);
      }
    } else if (isVertical) {
      const itemHeight = 45 * scale;
      for (let i = 0; i < Math.min(remainingPlayers.length, 6); i++) {
        const player = remainingPlayers[i];
        const rank = i + 5;
        const y = listStartY + i * itemHeight;

        ctx.fillStyle = "#64748b";
        ctx.font = `${20 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`${rank}. ${player.name}`, width / 2, y);
      }
    }

    // Footer
    const footerY = height - 40 * scale;
    ctx.fillStyle = "#10b981";
    ctx.font = `bold ${18 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("WHOSYURGOAT.APP", width / 2, footerY);

    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    ctx.fillStyle = "#64748b";
    ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(dateStr, width / 2, footerY + 18 * scale);
  };

  const generateGraphic = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = FORMATS[format];
    canvas.width = width;
    canvas.height = height;

    if (style === "rushmore") {
      generateRushmoreGraphic(ctx, width, height);
    } else {
      generatePodiumGraphic(ctx, width, height);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    const safeName = title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    link.download = `${safeName}_${format}_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  };

  const copyToClipboard = async () => {
    // Copy text version of rankings (no team names)
    const playerCount = Math.min(players.length, 10);
    const text = players
      .slice(0, playerCount)
      .map((p, i) => `${i + 1}. ${p.name}`)
      .join("\n");

    // For current players (Peoples Champ), use "My Top 5 Today:" format
    const isCurrentPlayers = title.toLowerCase().includes("peoples") || subtitle.toLowerCase().includes("today");
    const header = isCurrentPlayers && playerCount <= 5 
      ? `My Top ${playerCount} Today:`
      : `${title}\n${subtitle}`;
    
    const fullText = `${header}\n${text}\n\nCreate yours at WhosYurGoat.app`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareToTwitter = () => {
    const playerCount = Math.min(players.length, 5);
    const isCurrentPlayers = title.toLowerCase().includes("peoples") || subtitle.toLowerCase().includes("today");
    const header = isCurrentPlayers 
      ? `My Top ${playerCount} Today:`
      : `My ${title}:`;
    const text = `${header}\n${players.slice(0, playerCount).map((p, i) => `${i + 1}. ${p.name}`).join("\n")}\n\nCreate yours at`;
    const url = shareUrl || "https://whosyurgoat.app";
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, "_blank");
  };

  const shareToFacebook = () => {
    const url = shareUrl || "https://whosyurgoat.app";
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, "_blank");
  };

  const shareToReddit = () => {
    const playerCount = Math.min(players.length, 10);
    const isCurrentPlayers = title.toLowerCase().includes("peoples") || subtitle.toLowerCase().includes("today");
    const header = isCurrentPlayers && playerCount <= 5
      ? `My Top ${playerCount} Today:`
      : title;
    const playerList = players.slice(0, playerCount).map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    const text = `${header}\n\n${playerList}\n\nCreated at WhosYurGoat.app`;
    const url = `https://www.reddit.com/submit?title=${encodeURIComponent(header)}&selftext=true&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Generate graphic when component mounts or format changes
  useEffect(() => {
    generateGraphic();
  }, [players, title, subtitle, format]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Share Your Rankings</h2>
            <p className="text-slate-400 text-sm mt-1">Download or share to social media</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700 transition"
          >
            ×
          </button>
        </div>

        {/* Format Selector */}
        <div className="flex gap-2 mb-4">
          {(Object.keys(FORMATS) as ImageFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                format === f
                  ? "bg-emerald-500 text-black"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {FORMATS[f].label}
            </button>
          ))}
        </div>

        {/* Canvas Preview */}
        <div className="relative mb-6">
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg border border-slate-600"
            style={{
              maxHeight: format === "instagram" ? "400px" : "auto",
              objectFit: "contain",
            }}
          />
          <div className="absolute bottom-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-xs text-slate-400">
            {FORMATS[format].width} × {FORMATS[format].height}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Primary Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={downloadImage}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Image
            </button>

            <button
              onClick={copyToClipboard}
              className={`px-6 py-3 font-bold rounded-lg transition flex items-center gap-2 ${
                copied
                  ? "bg-green-500 text-black"
                  : "bg-slate-700 hover:bg-slate-600 text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copied ? "Copied!" : "Copy Text"}
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="border-t border-slate-700 pt-4">
            <p className="text-sm text-slate-400 text-center mb-3">Share directly to:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={shareToTwitter}
                className="px-5 py-2.5 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X / Twitter
              </button>

              <button
                onClick={shareToFacebook}
                className="px-5 py-2.5 bg-[#4267B2] hover:bg-[#365899] text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>

              <button
                onClick={shareToReddit}
                className="px-5 py-2.5 bg-[#FF4500] hover:bg-[#e63e00] text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
                Reddit
              </button>
            </div>
          </div>

          {/* Text Rankings Preview */}
          <div className="border-t border-slate-700 pt-4">
            <details className="text-sm">
              <summary className="text-slate-400 cursor-pointer hover:text-slate-300">
                View text version
              </summary>
              <div className="mt-3 p-4 bg-slate-900 rounded-lg font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {(title.toLowerCase().includes("peoples") || subtitle.toLowerCase().includes("today")) && players.length <= 5
                  ? `My Top ${players.length} Today:`
                  : `${title}\n${subtitle}`}
                {"\n"}
                {players.slice(0, 10).map((p, i) => `${i + 1}. ${p.name}`).join("\n")}
                {"\n\n"}Create yours at WhosYurGoat.app
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
