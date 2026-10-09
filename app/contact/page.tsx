"use client"

import React, { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);

  // Primary contacts
  const mainPhone = "0769760460";
  const secondPhone = "0705415948";
  const whatsappNumber = "254705415948"; // E.164 recommended for whatsapp links
  const supportEmail = "Wildwash.jungletechnologies@gmail.com";
  const officeAddress = "Wild Wash HQ — Westlands, Nairobi";

  function submitForm(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!name.trim() || !message.trim()) return setError("Please enter your name and message.");

    setSubmitting(true);
    // simulate network call
    setTimeout(() => {
      setSubmitting(false);
      setSuccess("Thanks — your message has been sent. We’ll reply within 24 hours.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    }, 800);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold">Contact us</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Need help? Find every way to reach us below — phone, WhatsApp, email, or raise a request using the form.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow">
            <div className="font-semibold">Customer support</div>
            <div className="mt-3 text-sm text-slate-700">
              <div className="mb-2">Phone: <a href={`tel:${mainPhone}`} className="underline">{mainPhone}</a></div>
              <div className="mb-2">Phone: <a href={`tel:${secondPhone}`} className="underline">{secondPhone}</a></div>
              <div className="mb-2">WhatsApp: <a href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(whatsappNumber)}&text=Hi%20Wild%20Wash`} target="_blank" rel="noreferrer" className="underline">Message us on WhatsApp</a></div>
              <div className="mb-2">Email: <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a></div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 text-xs text-slate-500">Support hours: Mon–Sat 07:00–19:00, Sun 08:00–14:00</div>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow">
            <div className="font-semibold">Business & partnerships</div>
            <div className="mt-3 text-sm text-slate-700">
              <div className="mb-2">For corporate accounts, wholesale or hotel partnerships:</div>
              <div className="mb-2"><a href={`mailto:partnerships@wildwash.co`} className="underline">partnerships@wildwash.co</a></div>
              <div className="text-xs text-slate-500 mt-3">Response time: usually within 48 hours.</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow">
            <div className="font-semibold">Press & careers</div>
            <div className="mt-3 text-sm text-slate-700">
              <div className="mb-2">Press enquiries: <a href={`mailto:press@wildwash.co`} className="underline">press@wildwash.co</a></div>
              <div className="mb-2">Careers: <a href={`/careers`} className="underline">View open roles</a></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
            <h2 className="font-semibold">Send us a message</h2>
            <p className="text-sm text-slate-600 mt-1">Fill this form and our support team will get back to you.</p>

            <form onSubmit={submitForm} className="mt-4 space-y-3">
              <div>
                <label className="text-xs">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm mt-1" placeholder="Your name" />
              </div>

              <div>
                <label className="text-xs">Email (optional)</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm mt-1" placeholder="you@example.com" />
              </div>

              <div>
                <label className="text-xs">Phone (optional)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm mt-1" placeholder="+2547XXXXXXXX" />
              </div>

              <div>
                <label className="text-xs">Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm mt-1 h-28 resize-none" placeholder="How can we help?" />
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}
              {success && <div className="text-sm text-red-600">{success}</div>}

              <div className="flex items-center gap-3">
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-red-600 text-white text-sm">{submitting ? 'Sending…' : 'Send message'}</button>
                <a href={`mailto:${supportEmail}`} className="text-sm underline">Or email us directly</a>
              </div>
            </form>
          </div>

          <aside className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow space-y-4">
            <div>
              <div className="font-semibold">Visit us</div>
              <div className="text-sm text-slate-700 mt-1">{officeAddress}</div>
              <div className="text-xs text-slate-500 mt-2">(By appointment only — call or WhatsApp to arrange)</div>
            </div>

            <div>
              <div className="font-semibold">Operating hours</div>
              <div className="text-sm text-slate-700 mt-1">Mon – Sat: 07:00 – 19:00<br/>Sun: 08:00 – 14:00</div>
            </div>

            <div>
              <div className="font-semibold">Quick actions</div>
              <div className="mt-2 flex flex-col gap-2">
                <a href={`tel:${mainPhone}`} className="text-sm px-3 py-2 rounded bg-slate-100 dark:bg-white/5">Call 0769760460</a>
                <a href={`tel:${secondPhone}`} className="text-sm px-3 py-2 rounded bg-slate-100 dark:bg-white/5">Call 0705415948</a>
                <a href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(whatsappNumber)}&text=Hi%20Wild%20Wash`} target="_blank" rel="noreferrer" className="text-sm px-3 py-2 rounded bg-slate-100 dark:bg-white/5">Message on WhatsApp</a>
                <Link href="/faq" className="text-sm px-3 py-2 rounded bg-slate-100 dark:bg-white/5">Visit FAQ</Link>
              </div>
            </div>

            <div>
              <div className="font-semibold">Social</div>
              <div className="mt-2 flex items-center gap-3">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-sm underline">Facebook</a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-sm underline">Instagram</a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-sm underline">X</a>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow">
          <h3 className="font-semibold">Emergency / Lost items</h3>
          <p className="text-sm text-slate-600 mt-1">If you believe an item is lost or damaged, contact support immediately by phone or WhatsApp so we can prioritise your case. For urgent cases use the WhatsApp link above and include your tracking code.</p>
        </div>

        <div className="mt-6 text-xs text-slate-500">By contacting us you agree to our <Link href="/terms-of-service" className="underline">terms of service</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.</div>
      </div>
    </div>
  );
}
