import { useRef, useEffect } from "react";

type Player = {
  name: string;
  [key: string]: any;
};

interface SocialGraphicGeneratorProps {
  players: Player[];
  title: string;
  subtitle: string;
  onClose: () => void;
}

export default function SocialGraphicGenerator({
  players,
  title,
  subtitle,
  onClose,
}: SocialGraphicGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateGraphic = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for social media (1200x630 for Twitter/Facebook)
    canvas.width = 1200;
    canvas.height = 630;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0f172a"); // slate-900
    gradient.addColorStop(1, "#1e293b"); // slate-800
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title styling
    ctx.fillStyle = "#10b981"; // emerald-500
    ctx.font = "bold 48px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, 80);

    // Subtitle
    ctx.fillStyle = "#94a3b8"; // slate-400
    ctx.font = "24px Arial, sans-serif";
    ctx.fillText(subtitle, canvas.width / 2, 120);

    // Player list
    const startY = 180;
    const itemHeight = 35;
    const maxPlayers = Math.min(players.length, 15);

    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial, sans-serif";
    ctx.textAlign = "left";

    for (let i = 0; i < maxPlayers; i++) {
      const player = players[i];
      const y = startY + i * itemHeight;
      
      // Rank number
      ctx.fillStyle = "#10b981"; // emerald-500
      ctx.font = "bold 20px Arial, sans-serif";
      ctx.fillText(`${i + 1}.`, 100, y);
      
      // Player name
      ctx.fillStyle = "#ffffff";
      ctx.font = "20px Arial, sans-serif";
      ctx.fillText(player.name, 140, y);
    }

    // Footer
    ctx.fillStyle = "#64748b"; // slate-500
    ctx.font = "16px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Created at WhosYurGoat.com", canvas.width / 2, canvas.height - 30);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_top_${players.length}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const shareToTwitter = () => {
    const text = `Check out my ${title} ranking! Created at WhosYurGoat.com`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Generate graphic when component mounts
  useEffect(() => {
    generateGraphic();
  }, [players, title, subtitle]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Social Graphic</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <canvas
            ref={canvasRef}
            className="w-full border border-slate-600 rounded-lg bg-white"
            style={{ maxWidth: "100%" }}
          />

          <div className="flex gap-4 justify-center">
            <button
              onClick={downloadImage}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
            >
              Download Image
            </button>
            <button
              onClick={shareToTwitter}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Share on Twitter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
