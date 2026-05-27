import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly to us when you create an account, set up an organization, or use our services:

• **Account Information:** Name, email address, phone number, and password when you register.
• **Organization Information:** Organization name, address, phone number, and currency preference provided during onboarding.
• **Transaction Data:** Collection records, payment amounts, timestamps, and agent assignments created during normal use of the platform.
• **Device & Usage Data:** IP address, browser type, device identifiers, pages visited, and actions taken within the platform.
• **Billing Information:** Subscription plan selections and internal payment records (no real card data is stored on our servers).`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use the information we collect to:

• Provide, operate, and maintain the FundCircle platform and services.
• Process transactions and send related receipts and invoices.
• Send administrative emails, security alerts, and support messages.
• Monitor and analyze usage patterns to improve platform performance and features.
• Comply with legal obligations and enforce our Terms of Service.
• Protect the security and integrity of our platform and your data.`,
  },
  {
    title: "3. Multi-Tenant Data Isolation",
    content: `FundCircle operates as a multi-tenant SaaS platform. Each organization's data is completely isolated from other organizations:

• Organization data is stored in separate Firestore collections partitioned by organization ID.
• Firestore Security Rules enforce that users can only access data belonging to their own organization.
• No organization can view, access, or modify data belonging to another organization.
• Our staff access to organization data is strictly limited to essential support and security operations.`,
  },
  {
    title: "4. Authentication & Security",
    content: `Authentication is powered by Clerk, an enterprise-grade authentication provider:

• All passwords are hashed and stored securely by Clerk — we never store plaintext passwords.
• Email OTP verification is required for all new registrations.
• Sessions are managed with secure, short-lived tokens.
• All data in transit is encrypted using TLS 1.3 or higher.
• Firebase Firestore enforces row-level security through declarative security rules.`,
  },
  {
    title: "5. Data Sharing",
    content: `We do not sell, rent, or share your personal information with third parties for their marketing purposes. We may share data with:

• **Service Providers:** Clerk (authentication), Google Firebase (database and hosting), who process data on our behalf under strict data processing agreements.
• **Legal Requirements:** When required by law, court order, or government authority.
• **Business Transfers:** In connection with a merger, acquisition, or sale of assets, with appropriate confidentiality protections.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your data for as long as your account is active or as needed to provide services. After account cancellation:

• You have 30 days to export your data in CSV or Excel format.
• After 30 days, organization data is permanently deleted from our systems.
• Certain records may be retained for up to 7 years to comply with applicable financial regulations.`,
  },
  {
    title: "7. Your Rights",
    content: `Depending on your location, you may have the following rights regarding your personal information:

• **Access:** Request a copy of the personal information we hold about you.
• **Correction:** Request correction of inaccurate or incomplete information.
• **Deletion:** Request deletion of your personal information, subject to legal requirements.
• **Export:** Download your organization data in a standard format at any time from your dashboard.
• **Objection:** Object to certain processing of your personal information.

To exercise any of these rights, contact us at privacy@fundcircle.in.`,
  },
  {
    title: "8. Cookies",
    content: `We use essential cookies to operate the platform (session management, authentication state). We do not use advertising cookies or third-party tracking cookies.

You may disable cookies in your browser settings, but this will prevent you from using most features of the FundCircle platform.`,
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or by a prominent notice in the platform at least 14 days before the changes take effect. Continued use of the platform after the effective date constitutes acceptance of the updated policy.`,
  },
  {
    title: "10. Contact Us",
    content: `If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:

Email: privacy@fundcircle.in
Address: FundCircle Technologies Pvt. Ltd., Bengaluru, Karnataka, India 560001`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-10 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">Legal</p>
              <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
            </div>
          </div>
          <div className="mb-8 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
            <p className="text-sm text-sky-800">
              <strong>Last updated:</strong> May 27, 2026 &nbsp;·&nbsp; Effective date: May 27, 2026
            </p>
            <p className="mt-1 text-sm text-sky-700">
              This Privacy Policy describes how FundCircle Technologies Pvt. Ltd. ("FundCircle", "we", "our", or "us") collects, uses, and protects your personal information when you use our platform.
            </p>
          </div>
        </motion.div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <motion.section
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-slate-900 mb-3">{section.title}</h2>
              <div className="text-sm text-slate-600 leading-7 whitespace-pre-line">
                {section.content.split("\n").map((line, j) => {
                  const boldMatch = line.match(/^• \*\*(.*?)\*\*: (.*)/);
                  if (boldMatch) {
                    return (
                      <p key={j} className="mb-1 pl-3">
                        • <strong className="font-semibold text-slate-800">{boldMatch[1]}:</strong> {boldMatch[2]}
                      </p>
                    );
                  }
                  if (line.startsWith("• ")) {
                    return <p key={j} className="mb-1 pl-3">{line}</p>;
                  }
                  return line ? <p key={j} className="mb-2">{line}</p> : <br key={j} />;
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
