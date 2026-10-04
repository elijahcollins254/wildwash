import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Wild Wash",
  description: "Learn how the Wild Wash app and services collect, use, and share personal information.",
  robots: { index: true, follow: true },
};

const sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }> = [
  {
    title: "Information we collect",
    paragraphs: ["The information we collect depends on how you use the Wild Wash app and services. It may include information you provide, information created when you use our services, and limited technical information sent when your device connects to our systems."],
    bullets: [
      "Account and contact details, such as your username, name, phone number, email address, password credentials, and service location.",
      "Pickup and service details, such as an address, coordinates you choose to provide, order history, selected services, item descriptions, quantities, weights, notes, and delivery preferences.",
      "Payment and transaction details, such as the amount, payment status, phone number used to start a payment, and transaction references. Payment credentials such as your M-Pesa PIN are entered with the payment provider and are not requested by Wild Wash in the app.",
      "If you apply for a loan, application and financial details such as the requested amount, purpose, duration, selected order or collateral description and estimated value, and guarantor name, phone number, email address, and relationship to you.",
      "Trade-in details, including item descriptions, estimated values, and contact phone number, and preferences for optional subscriptions or offer messages.",
      "If you choose Google sign-in, Google profile details returned for authentication, such as your name, email address, and Google account identifier.",
      "Technical request information that may be available to our service providers, such as IP address, request time, and device, operating system, or app information used for security and troubleshooting.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: ["We use information to create and secure accounts; provide pickups, cleaning, delivery, order tracking, and customer support; process payments; administer trade-ins, loans, and guarantor checks; send service, payment, and account messages; and manage subscriptions and optional offer messages. We also use it to prevent misuse, resolve disputes, meet legal obligations, and maintain and improve our services."],
  },
  {
    title: "How information is shared",
    paragraphs: ["We do not sell personal information. We share information only as needed for the purposes described in this policy, including with:"],
    bullets: [
      "Wild Wash personnel, service providers, and assigned pickup or delivery personnel, to manage an order and provide the requested service. They receive only information relevant to their work.",
      "Payment providers, including M-Pesa/Safaricom where applicable, to initiate and confirm payments. Their own privacy terms also apply to information they collect directly.",
      "Google when you choose Google sign-in, so your identity can be authenticated.",
      "Hosting, infrastructure, communications, and support providers that help operate our app, website, API, or SMS and email communications. They process information on our behalf for those services.",
      "A guarantor you identify may be contacted and given relevant application information to assess or administer your loan request.",
      "Authorities or other parties when required by law, to protect people and property, or to establish, exercise, or defend legal claims. Information may also be involved in a business transfer, subject to applicable law.",
    ],
  },
  {
    title: "Storage, security, and retention",
    paragraphs: ["Account and service information is processed by Wild Wash and its service providers. We use reasonable administrative and technical safeguards appropriate to the information we handle, but no internet transmission or storage system can be guaranteed to be completely secure." , "We keep information for as long as needed to provide the services, maintain your account and transaction history, resolve issues, and meet legal, accounting, and safety obligations. Retention periods depend on the type of information and the reason it was collected. You can request account or data deletion on our deletion request page. Some payment, transaction, order, application, security, or dispute records may be retained for applicable legal, tax, accounting, security, or dispute-resolution purposes; periods vary by record and applicable requirement."],
  },
  {
    title: "Your choices and rights",
    paragraphs: ["You can update many profile details in the app, opt out of optional offer messages through your profile, and contact us to request access to, correction of, or deletion of your information, or to raise an objection or other privacy concern. Rights and exceptions depend on applicable law. You may also complain to the Office of the Data Protection Commissioner in Kenya. Turning off optional messages does not stop necessary service, security, or transaction communications."],
  },
  {
    title: "Children",
    paragraphs: ["The app is not designed for children under 13, and we do not knowingly collect their personal information. Loan application features are for adults aged 18 or older. Contact us if you believe a child has provided information to Wild Wash."],
  },
  {
    title: "Third-party services and changes",
    paragraphs: ["Google sign-in, payment services, and links opened outside the app are operated by their respective providers and are subject to their own privacy policies. We may update this policy when our practices or legal requirements change. The latest version will be posted on this page with its updated date."],
  },
  {
    title: "Contact us",
    paragraphs: ["For privacy questions or requests, email hello@wildwash.co. Please do not include passwords, M-Pesa PINs, or other payment credentials in your message."],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Wild Wash</p>
          <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Last updated: October 4, 2026</p>
          <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">This policy explains how Wild Wash handles personal information when you use the Wild Wash mobile app, website, and related services.</p>
          <p className="mt-4 rounded-md border border-red-200 bg-white p-4 leading-7 text-slate-700 dark:border-red-900 dark:bg-slate-900 dark:text-slate-300">
            To request deletion of your Wild Wash account or personal data, visit <Link href="/delete-account" className="font-semibold text-red-700 underline dark:text-red-400">Request account or data deletion</Link>.
          </p>
        </header>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {sections.map((section) => (
            <section key={section.title} className="py-6">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 leading-7 text-slate-700 dark:text-slate-300">{paragraph}</p>)}
              {section.bullets ? <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-700 dark:text-slate-300">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}