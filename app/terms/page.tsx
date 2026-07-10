import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Section, Placeholder } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
    title: "Terms of Service — Dosory",
    description: "The terms governing your use of the Dosory platform.",
};

export default function TermsPage() {
    return (
        <LegalShell
            title="Terms of Service"
            subtitle="The agreement between you and Dosory governing use of the platform."
            lastUpdated={<Placeholder>WasilaDev to confirm — effective date</Placeholder>}
        >
            <Section n={1} title="Agreement to Terms">
                <p>
                    These Terms of Service (&quot;Terms&quot;) form a binding agreement between you and{" "}
                    <Placeholder>WasilaDev to confirm — registered company legal name and address</Placeholder>{" "}
                    (&quot;Dosory,&quot; &quot;we,&quot; &quot;us&quot;). By creating an account, accessing, or using
                    the Dosory platform (the &quot;Service&quot;), you agree to be bound by these Terms. If you are
                    entering into these Terms on behalf of an organization, you represent that you have authority to
                    bind that organization.
                </p>
            </Section>

            <Section n={2} title="The Service">
                <p>
                    Dosory provides a multi-tenant CRM and ERP software-as-a-service platform, including customer and
                    lead management, invoicing, projects, HR, and related features. We may add, modify, or remove
                    features over time. Availability of specific features may depend on your subscription plan.
                </p>
            </Section>

            <Section n={3} title="Accounts and Organizations">
                <p>
                    You must provide accurate information when registering and keep it current. You are responsible for
                    safeguarding your credentials and for all activity under your account and your organization&apos;s
                    workspace. Notify us promptly of any unauthorized use. Each organization is isolated by tenant; you
                    are responsible for managing the users you invite to your organization.
                </p>
            </Section>

            <Section n={4} title="Acceptable Use">
                <p>You agree not to, and not to permit anyone to:</p>
                <ul className="list-disc space-y-1 pl-6">
                    <li>use the Service to violate any law or the rights of others;</li>
                    <li>upload malware, or attempt to breach, probe, or disrupt the Service or its security;</li>
                    <li>access another tenant&apos;s data, or circumvent tenant-isolation or access controls;</li>
                    <li>resell, sublicense, or provide the Service to third parties except as expressly permitted;</li>
                    <li>send unsolicited communications (spam) through the Service.</li>
                </ul>
            </Section>

            <Section n={5} title="Subscriptions, Fees, and Billing">
                <p>
                    Paid plans are billed in advance on a recurring basis (monthly or annual) at the prices shown at
                    purchase.{" "}
                    <Placeholder>WasilaDev to confirm — trial length, refund policy, and taxes handling</Placeholder>.
                    Fees are non-refundable except as required by law or as expressly stated. We may change prices with
                    prior notice; changes apply to the next billing cycle. Failure to pay may result in suspension or
                    downgrade of your subscription.
                </p>
            </Section>

            <Section n={6} title="Your Data">
                <p>
                    You retain all rights to the data you and your users submit to the Service (&quot;Customer
                    Data&quot;). You grant us a limited license to host, process, and transmit Customer Data solely to
                    provide and support the Service. Our handling of personal data is described in our{" "}
                    <Link href="/privacy" className="text-blue-600 hover:underline">
                        Privacy Policy
                    </Link>
                    . You are responsible for the lawfulness of the Customer Data you submit.
                </p>
            </Section>

            <Section n={7} title="Intellectual Property">
                <p>
                    The Service, including its software, design, and trademarks, is owned by Dosory and its licensors
                    and is protected by intellectual-property laws. These Terms grant you a limited, non-exclusive,
                    non-transferable right to use the Service during your subscription. No rights are granted except as
                    expressly set out here.
                </p>
            </Section>

            <Section n={8} title="Termination">
                <p>
                    You may stop using the Service and cancel your subscription at any time. We may suspend or terminate
                    your access if you materially breach these Terms, fail to pay, or use the Service in a way that
                    risks harm to others or to the platform. Upon termination, your right to use the Service ends; we
                    will make Customer Data available for export for{" "}
                    <Placeholder>WasilaDev to confirm — data-retention / export window after termination</Placeholder>,
                    after which it may be deleted.
                </p>
            </Section>

            <Section n={9} title="Disclaimers">
                <p>
                    The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any
                    kind, whether express or implied, including merchantability, fitness for a particular purpose, and
                    non-infringement, to the maximum extent permitted by law.
                </p>
            </Section>

            <Section n={10} title="Limitation of Liability">
                <p>
                    To the maximum extent permitted by law, Dosory will not be liable for indirect, incidental, special,
                    consequential, or punitive damages, or loss of profits or data. Our aggregate liability arising out
                    of or relating to the Service will not exceed{" "}
                    <Placeholder>
                        WasilaDev to confirm — liability cap, e.g. fees paid in the prior 12 months
                    </Placeholder>
                    .
                </p>
            </Section>

            <Section n={11} title="Governing Law and Disputes">
                <p>
                    These Terms are governed by the laws of{" "}
                    <Placeholder>WasilaDev to confirm — governing jurisdiction</Placeholder>, without regard to conflict
                    of law rules. Any dispute will be resolved in the courts of{" "}
                    <Placeholder>WasilaDev to confirm — venue / arbitration forum</Placeholder>.
                </p>
            </Section>

            <Section n={12} title="Changes to These Terms">
                <p>
                    We may update these Terms from time to time. If we make material changes, we will provide notice
                    (for example, by email or an in-app notice). Continued use of the Service after changes take effect
                    constitutes acceptance of the revised Terms.
                </p>
            </Section>

            <Section n={13} title="Contact">
                <p>
                    Questions about these Terms? Contact us at{" "}
                    <Placeholder>WasilaDev to confirm — legal/support contact email and mailing address</Placeholder>.
                </p>
            </Section>
        </LegalShell>
    );
}
