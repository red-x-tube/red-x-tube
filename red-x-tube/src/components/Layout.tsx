import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, PlaySquare, MonitorPlay, Link as LinkIcon, Video } from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        enableClosingConfirmation: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
      };
    };
  }
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    const twa = window.Telegram?.WebApp;
    if (twa) {
      twa.ready();
      twa.expand();
      try {
        twa.setHeaderColor("#0d0d14");
        twa.setBackgroundColor("#0d0d14");
      } catch {
        /* older clients may not support color overrides */
      }
    }
  }, []);

  const navItems = [
    { href: "/", label: "হোম", icon: Home },
    { href: "/free", label: "ফ্রি", icon: PlaySquare },
    { href: "/paid", label: "পেইড", icon: MonitorPlay },
    { href: "/link", label: "লিঙ্ক", icon: LinkIcon },
    { href: "/video-call", label: "কল", icon: Video },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col relative min-h-[100dvh] shadow-2xl bg-[#0d0d14]">

        {/* Header */}
        <header className="px-4 pt-5 pb-4 text-center border-b border-white/5 bg-[#14141f] shadow-lg sticky top-0 z-50">
          <h1 className="rxt-title text-3xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-500">
            Red-X Tube
          </h1>
          <p className="rxt-subtitle text-[10px] font-semibold text-white/50 mt-1.5 uppercase tracking-[0.15em]">
            বাংলাদেশ সবচেয়ে বড় Expose Community
          </p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-24">
          {children}
        </main>

        {/* Bottom Nav — safe area aware */}
        <nav
          className="fixed bottom-0 w-full max-w-[430px] bg-[#14141f]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around pt-2 z-50"
          style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
        >
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1.5 px-4 py-1 group select-none"
              >
                <div
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-br from-purple-500/25 to-pink-500/25 text-purple-400"
                      : "text-white/40 group-hover:text-white/70 active:scale-90"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
                  className={`text-[10px] font-bold transition-colors ${
                    isActive ? "text-purple-400" : "text-white/40"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
