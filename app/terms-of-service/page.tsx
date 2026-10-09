import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Wild Wash",
  description: "Read the terms that apply when you use Wild Wash services, website, and app.",
};

const sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }> = [
  {
    title: "Using Wild Wash",
    paragraphs: [
      "These Terms of Service apply to your use of the Wild Wash website, mobile app, and services. By creating an account, placing an order, or using our services, you agree to these terms. If you do not agree, do not use the services.",
      "You must be legally able to enter into an agreement to place an order. If you use an account on behalf of another person or an organization, you confirm that you are authorized to do so.",
    ],
  },
  {
    title: "Accounts and accurate information",
    paragraphs: [
      "Keep your sign-in details secure and tell us promptly if you believe someone else has accessed your account. You are responsible for activity carried out through your account, except where applicable law says otherwise.",
      "Provide current and accurate contact, pickup, delivery, and order information. We may contact you using the details on your account to confirm an order or resolve a service issue.",
    ],
  },
  {
    title: "Orders, pricing, and payment",
    paragraphs: [
      "Service descriptions, availability, and prices are shown in the app or website and may vary by service, item, location, or order details. Any quote that depends on inspection or final weight is an estimate until confirmed. We will notify you of material price changes for your approval before proceeding where practicable.",
      "An order is subject to availability and confirmation by Wild Wash. Payment is due using the payment method and timing shown for that order. Payment providers may apply their own terms and processes.",
    ],
  },
  {
    title: "Pickup, delivery, and items",
    paragraphs: [
      "You are responsible for providing safe, accurate pickup and delivery instructions and making items available at the agreed place and time. Pickup and delivery times are estimates and may be affected by traffic, weather, operational conditions, or other events outside our reasonable control.",
      "Please identify delicate, stained, damaged, or otherwise special-care items and follow any preparation instructions. Remove valuables and check pockets before handing items over. We may decline items that are unsafe, unsuitable for the requested service, or outside our capabilities.",
    ],
  },
  {
    title: "Cancellations, concerns, and claims",
    paragraphs: [
      "Cancellation options and any applicable charges depend on the order's status and will be shown in the app or communicated by our support team. Contact us as soon as possible if you need to change or cancel a booking.",
      "If you have a concern about a service, report it promptly with your order details so we can investigate. Any remedy will be assessed based on the circumstances and applicable law. Nothing in these terms limits rights that cannot legally be limited.",
    ],
  },
  {
    title: "Acceptable use",
    paragraphs: ["Do not misuse the services or interfere with their secure operation. In particular, you must not:"],
    bullets: [
      "Use the services for unlawful, fraudulent, or harmful activity.",
      "Submit false information, impersonate another person, or access another user's account without permission.",
      "Attempt to disrupt, probe, reverse engineer, or gain unauthorized access to our systems, except where applicable law permits it.",
    ],
  },
  {
    title: "Privacy and communications",
    paragraphs: [
      "Our handling of personal information is described in the Wild Wash Privacy Policy. We may send service-related messages about your account, orders, payments, and support requests. Optional marketing messages can be managed through the available preferences or by contacting us.",
    ],
  },
  {
    title: "Availability and changes",
    paragraphs: [
      "We may update, suspend, or discontinue features or services as needed. We will take reasonable steps to communicate material changes that affect an active order. We may suspend access where reasonably necessary to protect users, our services, or comply with law.",
    ],
  },
  {
    title: "Liability and applicable law",
    paragraphs: [
      "To the extent permitted by applicable law, Wild Wash is not responsible for indirect or consequential losses arising from use of the services. We remain responsible for obligations that cannot be excluded or limited by law, and these terms do not remove any consumer rights that apply to you.",
      "These terms are governed by the laws of Kenya, subject to any mandatory consumer protections that apply. Financial products, including loans, may have separate terms presented in the relevant application or offer.",
    ],
  },
  {
    title: "Changes and contact",
    paragraphs: [
      "We may revise these terms from time to time. The latest version will be posted on this page with its updated date. Changes apply from publication unless a later effective date is stated; continued use after that date means you accept the updated terms.",
      "For questions about these terms or a service order, contact Wild Wash at 0769760460 or 0705415948, or email Wildwash.jungletechnologies@gmail.com.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Wild Wash</p>
          <h1 className="mt-2 text-3xl font-bold">Terms of Service</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Last updated: October 9, 2026</p>
          <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">
            These terms explain the basic rules for using Wild Wash and placing service orders. Please read them together with our <Link href="/privacy" className="font-medium text-red-700 underline dark:text-red-400">Privacy Policy</Link>.
          </p>
        </header>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {sections.map((section) => (
            <section key={section.title} className="py-6">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-7 text-slate-700 dark:text-slate-300">{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-700 dark:text-slate-300">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          Need help? Visit our <Link href="/contact" className="font-medium text-red-700 underline dark:text-red-400">Contact us</Link> page.
        </p>
      </article>
    </main>
  );
}