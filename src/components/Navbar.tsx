import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-stone-800/60 bg-stone-950/80 px-6 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-sm shadow-sm">
          🕉
        </div>
        <span className="text-base font-semibold tracking-tight text-stone-200 group-hover:text-white transition-colors">
          Gita AI
        </span>
      </Link>

      {/* <Link
        href="/upload"
        className="flex items-center gap-1.5 rounded-lg border border-stone-700/60 bg-stone-900 px-3 py-1.5 text-[13px] font-medium text-stone-300 transition-all hover:border-amber-700/50 hover:bg-stone-800 hover:text-stone-100"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Context
      </Link> */}
    </header>
  );
}
