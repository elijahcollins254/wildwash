"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [offersExpiringSoon, setOffersExpiringSoon] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkOffers() {
      try {
        // try real endpoint first (if you have it)
        const res = await fetch('/offers');
        let data;
        if (res.ok) {
          data = await res.json();
        } else {
          // fallback sample offers if API not available
          data = [
            { id: 'o1', title: '25% off Standard Wash', expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'o2', title: 'Free Pickup for New Customers', expires: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString() }
          ];
        }

        const now = Date.now();
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        const soon = data.some((o: any) => {
          if (!o.expires) return false;
          const exp = new Date(o.expires).getTime();
          return exp > now && exp - now <= threeDays;
        });

        if (mounted) setOffersExpiringSoon(Boolean(soon));
      } catch (err) {
        // if fetch fails, keep default false
        if (mounted) setOffersExpiringSoon(false);
      }
    }

    checkOffers();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100">
      {/* main content */}
      <main className="max-w-6xl mx-auto px-6 pb-20 pt-8">
        {/* HERO */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-8">
          <div className="md:col-span-7">
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight">Laundry without the worry. Track every item from pickup to delivery.</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">Wild Wash combines secure item tagging, real-time status updates, pickup on demand, and professional fumigation & cleaning — so nothing gets lost and you always know when your things are ready.</p>

            <div className="mt-6 flex flex-wrap gap-3 items-center">
              <Link href="/book" className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-full font-semibold shadow hover:scale-[1.01] transition-transform">Book a pickup</Link>

              <Link href="/offers" className={`inline-flex items-center gap-2 border ${offersExpiringSoon ? 'border-amber-400 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-700'} px-4 py-3 rounded-full text-sm font-semibold hover:shadow-sm transition` } aria-label="This week's offers">
                This week's offers
                {offersExpiringSoon && (
                  <span className="ml-2 inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">Ends soon</span>
                  </span>
                )}
              </Link>

              <Link href="/orders" className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-full text-sm">View your orders</Link>
              <Link href="/orders" className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-full text-sm">View orders</Link>
              <a href="#how" className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-full text-sm">How it works</a>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Badge label="Contactless pickup" />
              <Badge label="QR & RFID tracking" />
              <Badge label="Real-time alerts" />
              <Badge label="Fumigation & deep-clean" />
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="relative w-full max-w-md mx-auto bg-white/60 dark:bg-white/5 backdrop-blur rounded-2xl p-6 shadow-2xl">
              <div className="text-sm font-medium mb-4">Live sample — your order</div>

              <div className="flex flex-col gap-3">
                <StatusRow label="Received" subtitle="We picked up your bundle — 12 items" time="10:12 AM" />
                <StatusRow label="Washing" subtitle="Cycle in progress — 40%" time="10:25 AM" />
                <StatusRow label="Ready" subtitle="Drying & folding complete — ready for delivery" time="14:10 PM" ready />
              </div>

              <div className="mt-5 text-xs text-slate-500">Notifications via push, SMS & email — automatic pickup options available.</div>
            </div>

            <div className="mt-4 text-xs text-slate-500">Tip: leave your clothes outside and we’ll pick them up — no bags needed.</div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="mt-10">
          <Link
            href="/services"
            aria-label="Go to Wild Wash home"
            title="Wild Wash — Home"
            className="w-48 h-12 rounded-2xl bg-red-500/95 flex items-center justify-center shadow-md shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <h3 className="text-2xl font-bold">Services</h3>
          </Link>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-3xl">From everyday laundry to specialized fumigation and deep-clean for mattresses, we offer transparent pricing and item-level tracking so you always know where your belongings are.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <ServiceCard title="Wash & Fold" price="From KSh 50/kg" desc="Quick turnaround, gentle detergents, and item-by-item tracking." />
            <ServiceCard title="Fumigation & Sanitization" price="From KSh 1,500 per room" desc="Professional treatments for pests and allergens with certification." />
            <ServiceCard title="Pickup & Delivery" price="KSh 150 (zones)" desc="Contactless pickup — leave items outside and we’ll collect them." />
          </div>

          {/* See more packages button - placed just before How it works */}
          <div className="mt-8 flex justify-center">
            <Link href="/services" className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-full text-sm font-semibold hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label="See more packages">
              See more packages
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-12">
          <h3 className="text-2xl font-bold">How it works</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
            <Step number={1} title="Book pickup" desc="Schedule via app or website — or request on-demand pickup." />
            <Step number={2} title="Items tagged" desc="We tag each bundle with a QR/RFID identifier — photos added for extra safety." />
            <Step number={3} title="Track progress" desc="Real-time status updates and ETA — receive a notification when ready." />
            <Step number={4} title="Delivery or collect" desc="Choose delivery or collect from store — we also accept leaving items outside for pickup." />
          </div>
        </section>

        {/* Tracking / Tech */}
        <section id="track" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <h3 className="text-2xl font-bold">Smart tracking & safety</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">Each order is assigned a unique QR (or RFID) tag and logged in our system with photographs and timestamps. If an item is misplaced, our audit logs and proof-of-handling make recovery fast and transparent.</p>

            <ul className="mt-4 space-y-2 list-disc list-inside text-slate-700 dark:text-slate-300">
              <li>Item-level photos & receipts</li>
              <li>Chain-of-custody logs with timestamps</li>
              <li>Push, SMS & email notifications</li>
            </ul>

            <div className="mt-6 flex gap-3">
              <Link href="/book" className="rounded-full bg-red-600 text-white px-4 py-2 font-semibold">Book now</Link>
              <Link href="/contact" className="rounded-full border border-slate-200 px-4 py-2 font-medium">Get a quote</Link>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-2xl p-6 shadow">
            <h4 className="font-semibold">Track by code</h4>
            <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">Enter your pickup code to see the live status of your bundle.</p>
            <div className="mt-4 flex gap-2">
              <input aria-label="tracking code" placeholder="e.g. WW-12345" className="flex-1 rounded-md border px-3 py-2" />
              <button className="rounded-md bg-red-600 text-white px-4 py-2">Track</button>
            </div>
          </div>
        </section>

        {/* Testimonials & Trust */}
        <section className="mt-12">
          <h3 className="text-2xl font-bold">Trusted by 597903+ users</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Testimonial name="Aisha" role="Nairobi" quote="Wild Wash picked up my clothes late at night — they were back the same day, neatly folded and tracked. No missing items!" />
            <Testimonial name="James" role="Enterprise - Hotel" quote="Our linens are cleaned and fumigated with reports — the tracking saved us time resolving a misplaced batch." />
            <Testimonial name="Mercy" role="Mombasa" quote="I just leave my basket outside and they collect it. Super convenient." />
          </div>
        </section>

        {/* CTA & Contact */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 shadow">
            <h4 className="font-semibold">Ready to simplify laundry day?</h4>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Schedule a pickup, get real-time tracking, and experience secure handling for every item.</p>
            <div className="mt-4 flex gap-3">
              <Link id="book" href="/book" className="rounded-full bg-red-600 text-white px-4 py-3 font-semibold">Book pickup</Link>
              <a href="mailto:hello@wildwash.co" className="rounded-full border border-red-200 px-4 py-3">Contact sales</a>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-2xl p-6 shadow">
            <h4 className="font-semibold">Service hours</h4>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              Mon - Sat: 7:00 - 19:00<br/>Sun: 8:00 - 14:00
            </div>
            <div className="mt-4">
              <div className="text-xs text-slate-500">Phone</div>
              <div className="font-medium">+254 705 415948</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* --- Small presentational components --- */
function Badge({ label }: { label: string }){
  return (
    <div className="rounded-full bg-white/70 dark:bg-white/5 px-3 py-2 text-sm font-medium shadow select-none">{label}</div>
  )
}

function StatusRow({ label, subtitle, time, ready }: { label: string; subtitle: string; time?: string; ready?: boolean }){
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${ready ? 'bg-red-50 dark:bg-red-900/30' : 'bg-white/5'}`}>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
      <div className="text-xs text-slate-400">{time}</div>
    </div>
  )
}

function ServiceCard({ title, price, desc }: { title: string; price: string; desc: string }){
  return (
    <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-2xl p-6 shadow">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{desc}</div>
      <div className="mt-4 font-medium">{price}</div>
    </div>
  )
}

function Step({ number, title, desc }: { number: number; title: string; desc: string }){
  return (
    <div className="p-4 bg-white/60 dark:bg-white/5 rounded-2xl shadow">
      <div className="text-red-600 font-bold text-lg">{number}</div>
      <div className="font-semibold mt-2">{title}</div>
      <div className="text-sm mt-1 text-slate-600 dark:text-slate-300">{desc}</div>
    </div>
  )
}

function Testimonial({ name, role, quote }: { name: string; role: string; quote: string }){
  return (
    <div className="bg-white/60 dark:bg-white/5 rounded-2xl p-4 shadow">
      <div className="text-sm">“{quote}”</div>
      <div className="mt-3 font-semibold">{name}</div>
      <div className="text-xs text-slate-500">{role}</div>
    </div>
  )
}