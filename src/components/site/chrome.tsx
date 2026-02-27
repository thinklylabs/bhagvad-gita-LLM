"use client";

import Link from "next/link";

export function SiteNavbar() {
  return (
    <header className="border-b border-stone-900/80">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-amber-600 to-amber-800 text-xs">
            🕉
          </span>
          <span className="text-sm font-medium text-stone-200">Gita AI</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/pricing" className="text-stone-400 transition-colors hover:text-stone-200">
            Pricing
          </Link>
          <Link
            href="/auth"
            className="rounded-md border border-amber-600/70 bg-amber-600/20 px-3 py-1.5 text-stone-100 transition-colors hover:bg-amber-600/30"
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-900/80">
      <div className="mx-auto grid h-12 w-full max-w-5xl grid-cols-3 items-center px-4 text-xs text-stone-500">
        <div className="flex items-center gap-3 justify-self-start">
          <a
            href="https://x.com/hishibui"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-stone-300"
          >
            X
          </a>
          <a
            href="https://www.linkedin.com/in/sachigupta12/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-stone-300"
          >
            LinkedIn
          </a>
        </div>
        <span className="justify-self-center text-stone-400">made with &#10084;</span>
        <span className="justify-self-end text-right">© {new Date().getFullYear()} Thinkly Labs LLP. All rights reserved.</span>
      </div>
    </footer>
  );
}
