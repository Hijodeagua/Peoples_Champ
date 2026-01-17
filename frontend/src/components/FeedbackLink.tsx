const FEEDBACK_URL = "https://forms.gle/xFGFXCDMsxuNAmK57";

interface FeedbackLinkProps {
  variant?: "button" | "text" | "compact";
  className?: string;
}

export default function FeedbackLink({ variant = "text", className = "" }: FeedbackLinkProps) {
  if (variant === "button") {
    return (
      <a
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition ${className}`}
      >
        Report Issue 📝
      </a>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-amber-400 hover:text-amber-300 underline text-sm ${className}`}
      >
        Report this issue
      </a>
    );
  }

  return (
    <p className={`text-sm text-slate-400 ${className}`}>
      Having trouble?{" "}
      <a
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-400 hover:text-amber-300 underline"
      >
        Let us know
      </a>
    </p>
  );
}

export { FEEDBACK_URL };
