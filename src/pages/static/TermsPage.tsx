import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By creating an account, accessing, or using the FundCircle platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use the platform.

These Terms apply to all users of the platform including organization owners, pigmy collectors, and customers.`,
  },
  {
    title: "2. Description of Service",
    content: `FundCircle provides a cloud-based, multi-tenant SaaS platform for managing daily pigmy (recurring daily savings) collection operations. Core features include:

• Organization creation and management
• Agent (Pigmy Collector) invitation and management
• Customer onboarding and savings tracking
• Daily collection recording and reporting
• Loan and EMI management
• Realtime analytics and export capabilities
• Internal subscription and billing management`,
  },
  {
    title: "3. Account Registration",
    content: `To use FundCircle, you must:

• Be at least 18 years of age
• Provide accurate and complete registration information
• Maintain the security of your account credentials
• Promptly notify us of any unauthorized access to your account

Organization owners are responsible for all activities that occur under their organization workspace, including actions taken by invited agents and customers.`,
  },
  {
    title: "4. Subscription Plans and Payment",
    content: `FundCircle offers Starter, Professional, and Enterprise subscription plans with monthly and yearly billing options.

• Subscriptions are billed in advance on a monthly or yearly cycle.
• All prices are displayed in Indian Rupees (₹) unless otherwise indicated.
• Subscriptions automatically renew unless cancelled before the renewal date.
• You may upgrade or downgrade your plan at any time; changes take effect immediately.
• Refunds are provided on a pro-rata basis for unused days when downgrading.
• We reserve the right to modify pricing with 30 days' written notice.`,
  },
  {
    title: "5. Acceptable Use",
    content: `You agree not to use FundCircle to:

• Engage in any illegal financial activity or money laundering
• Record false, fabricated, or fraudulent collection transactions
• Access another organization's data without authorization
• Reverse engineer, decompile, or attempt to extract the platform's source code
• Use automated scripts or bots to scrape or abuse the API
• Upload malicious code, viruses, or destructive programs
• Harass, abuse, or harm other users of the platform

Violation of these terms may result in immediate account suspension or termination.`,
  },
  {
    title: "6. Data Ownership",
    content: `You retain ownership of all data you input into FundCircle, including collection records, customer information, and organizational data.

By using the platform, you grant FundCircle a limited, non-exclusive license to store, process, and display your data solely for the purpose of providing the service.

FundCircle does not claim ownership of your data and will not use it for purposes other than operating and improving the platform.`,
  },
  {
    title: "7. Service Availability",
    content: `We strive to maintain 99.9% platform uptime. However, we do not guarantee uninterrupted service. Planned maintenance will be announced with at least 24 hours' notice.

FundCircle is not liable for losses resulting from:
• Internet connectivity issues outside our control
• Force majeure events (natural disasters, government actions, etc.)
• Third-party service outages (Clerk, Firebase, etc.)`,
  },
  {
    title: "8. Limitation of Liability",
    content: `To the maximum extent permitted by applicable law, FundCircle's liability for any claims arising from these Terms or the use of the platform shall not exceed the amount you paid for the service in the 12 months prior to the claim.

FundCircle is not liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities.`,
  },
  {
    title: "9. Termination",
    content: `Either party may terminate these Terms at any time:

• You may cancel your subscription from your dashboard at any time.
• We may suspend or terminate accounts that violate these Terms, with or without notice.
• Upon termination, your right to access the platform ceases immediately.
• You have 30 days post-termination to export your data.`,
  },
  {
    title: "10. Governing Law",
    content: `These Terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka, India.

For enterprise customers, disputes may be resolved through binding arbitration as specified in your enterprise agreement.`,
  },
  {
    title: "11. Changes to Terms",
    content: `We reserve the right to update these Terms at any time. We will provide 14 days' notice of material changes via email or platform notification. Continued use after the effective date constitutes acceptance of the updated Terms.`,
  },
  {
    title: "12. Contact",
    content: `For questions about these Terms, contact us at:

Email: legal@fundcircle.in
Address: FundCircle Technologies Pvt. Ltd., Bengaluru, Karnataka, India 560001`,
  },
];

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-10 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">Legal</p>
              <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service</h1>
            </div>
          </div>
          <div className="mb-8 rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4">
            <p className="text-sm text-violet-800">
              <strong>Last updated:</strong> May 27, 2026 &nbsp;·&nbsp; Effective date: May 27, 2026
            </p>
            <p className="mt-1 text-sm text-violet-700">
              Please read these Terms of Service carefully before using FundCircle. These terms constitute a legally binding agreement between you and FundCircle Technologies Pvt. Ltd.
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
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-slate-900 mb-3">{section.title}</h2>
              <div className="text-sm text-slate-600 leading-7">
                {section.content.split("\n").map((line, j) => {
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
