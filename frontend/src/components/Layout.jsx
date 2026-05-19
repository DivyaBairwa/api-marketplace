import { Header } from "./Header";

export function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex justify-between">
          <span>© {new Date().getFullYear()} API Marketplace</span>
          <span className="hidden sm:inline">Built with React, Tailwind, Prisma & Express</span>
        </div>
      </footer>
    </div>
  );
}
