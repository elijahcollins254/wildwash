"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import { Phone } from "lucide-react";

export default function WhatsAppButton() {
  const pathname = usePathname();
  const whatsappNumber = "+254140120108";
  const whatsappText = "Hi%20Wild%20Wash!%20I%20need%20help%20with%20my%20order.";
  const href = `https://api.whatsapp.com/send?phone=${encodeURIComponent(whatsappNumber)}&text=${whatsappText}`;

  const [hidden, setHidden] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // hide button when footer is visible in viewport
          setHidden(entry.isIntersecting);
        });
      },
      { threshold: 0.01 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint is 768px
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (hidden || pathname === "/chat") return null;

  return (
    <div
      className="fixed z-[9999] flex flex-col items-end gap-2"
    style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${isDesktop ? 84 : 156}px)`,
        right: "calc(env(safe-area-inset-right, 0px) + 16px)",
    }}
    >
      <a
        href="tel:+254769760460"
        aria-label="Call Wild Wash at +254 769 760460"
        className="flex items-center gap-3 rounded-full bg-blue-600 px-3 py-2 shadow-lg transition-transform hover:brightness-95 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Phone size={20} className="text-white" aria-hidden="true" />
        </span>
        <span className="hidden select-none text-sm font-semibold text-white sm:inline-block">
          Call +254 769 760460
        </span>
      </a>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Wild Wash on WhatsApp"
        className="flex items-center gap-3 rounded-full bg-emerald-500 px-3 py-2 shadow-lg transition-transform hover:brightness-95 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
          <FaWhatsapp size={20} className="text-white" aria-hidden />
        </span>
        <span className="hidden select-none text-sm font-semibold text-white sm:inline-block">
          Chat on WhatsApp
        </span>
      </a>
    </div>
  );
}
