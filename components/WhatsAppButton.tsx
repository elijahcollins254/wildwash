"use client";
import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton() {
  const whatsappNumber = "+254705415948";
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

  if (hidden) return null;

  return (
    <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with Wild Wash on WhatsApp"
    className="fixed z-[9999] flex items-center gap-3 rounded-full bg-emerald-500 hover:brightness-95 shadow-lg px-3 py-2 transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    // use the safe-area CSS so the button doesn't sit under home indicators / notches
    style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${isDesktop ? 16 : 88}px)`,
        right: "calc(env(safe-area-inset-right, 0px) + 16px)",
    }}
    >
    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 shrink-0">
        <FaWhatsapp size={20} className="text-white" aria-hidden />
    </span>

    <span className="hidden sm:inline-block text-sm font-semibold text-white select-none">
        Chat on WhatsApp
    </span>
    </a>
  );
}
