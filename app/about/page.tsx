import Link from "next/link";

const profileLinks = [
  {
    label: "Website",
    description: "See all prices",
    href: "https://www.wildwash.co.ke/",
  },
  {
    label: "Instagram",
    description: "See sample works",
    href: "https://www.instagram.com/wild.wash_home_services_io/",
  },
  {
    label: "TikTok",
    description: "Watch our videos",
    href: "https://www.tiktok.com/@wildwashhomeservices?_r=1&_t=ZS-99bBp9VFkNo",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl">
        <section className="flex flex-col gap-5 border-b border-slate-200 pb-8 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Wild Wash</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Laundry made simple.</h1>
            <p className="mt-3 max-w-xl text-slate-600 dark:text-slate-300">
              Convenient laundry, pickup and delivery, and professional cleaning you can count on.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="tel:0769760460"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              Call 0769760460
            </a>
            <a
              href="https://api.whatsapp.com/send?phone=254769760460&text=Hi%20Wild%20Wash"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              WhatsApp us
            </a>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-xl font-semibold">Our services</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Wash and fold, fumigation and sanitization, plus pickup and delivery.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/services"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              See services and prices
            </Link>
            <Link
              href="/book"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              Book a pickup
            </Link>
          </div>
        </section>

        <section className="border-t border-slate-200 py-8 dark:border-slate-800">
          <h2 className="text-xl font-semibold">See our profile</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {profileLinks.map(({ label, description, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 p-4 transition hover:border-red-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <span className="font-medium">{label}</span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">{description}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
