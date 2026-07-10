import type { Metadata } from "next";
import { LegalShell, Section, Placeholder } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
    title: "Privacy Policy — Dosory",
    description: "How Dosory collects, uses, and protects personal data.",
};

export default function PrivacyPage() {
    return (
        <LegalShell
            title="Privacy Policy"
            subtitle="How we collect, use, share, and protect personal data on the Dosory platform."
            lastUpdated={<Placeholder>WasilaDev to confirm — effective date</Placeholder>}
        >
            <Section n={1} title="Introduction">
                <p>
                    This Privacy Policy explains how{" "}
                    <Placeholder>WasilaDev to confirm — registered company legal name</Placeholder> (&quot;Dosory,&quot;
                    &quot;we,&quot; &quot;us&quot;) handles personal data when you use our platform (the
                    &quot;Service&quot;). For data that your organization submits about its own customers and contacts,
                    your organization is the data controller and Dosory acts as a processor on its behalf.
                </p>
            </Section>

            <Section n={2} title="Data We Collect">
                <ul className="list-disc space-y-1 pl-6">
                    <li>
                        <strong>Account data:</strong> name, email, organization name, and credentials you provide at
                        sign-up.
                    </li>
                    <li>
                        <strong>Customer Data:</strong> records you and your users enter into the Service (customers,
                        leads, invoices, projects, HR records, etc.).
                    </li>
                    <li>
                        <strong>Usage and device data:</strong> log data, IP address, browser type, and interactions,
                        collected to operate and secure the Service.
                    </li>
                    <li>
                        <strong>Payment data:</strong> processed by our payment provider(s);{" "}
                        <Placeholder>
                            WasilaDev to confirm — payment processor(s) and what card data, if any, is stored
                        </Placeholder>
                        .
                    </li>
                </ul>
            </Section>

            <Section n={3} title="How We Use Data">
                <p>
                    We use personal data to provide, maintain, secure, and improve the Service; to process payments; to
                    communicate with you about your account and transactional matters; to provide support; and to comply
                    with legal obligations. Our legal bases for processing include contract performance, legitimate
                    interests, consent (where required), and legal compliance.
                </p>
            </Section>

            <Section n={4} title="How We Share Data">
                <p>
                    We share personal data with service providers that help us operate the Service (for example, cloud
                    hosting and email delivery), bound by confidentiality and data-protection obligations. Current
                    sub-processors include{" "}
                    <Placeholder>
                        WasilaDev to confirm — list of sub-processors, e.g. Google Cloud/Firebase, Resend
                    </Placeholder>
                    . We do not sell personal data. We may disclose data if required by law or to protect rights and
                    safety.
                </p>
            </Section>

            <Section n={5} title="International Transfers">
                <p>
                    Your data may be processed in countries other than your own. Where required, we rely on appropriate
                    safeguards for such transfers.{" "}
                    <Placeholder>WasilaDev to confirm — primary data-hosting region and transfer mechanism</Placeholder>
                    .
                </p>
            </Section>

            <Section n={6} title="Data Retention">
                <p>
                    We retain account and Customer Data for as long as your account is active and as needed to provide
                    the Service. After account termination, data is retained for{" "}
                    <Placeholder>WasilaDev to confirm — retention period after termination</Placeholder> and then
                    deleted or anonymized, unless a longer period is required by law.
                </p>
            </Section>

            <Section n={7} title="Security">
                <p>
                    We use technical and organizational measures to protect personal data, including tenant isolation,
                    access controls, encryption in transit, and point-in-time recovery of the database. No method of
                    transmission or storage is completely secure; we cannot guarantee absolute security.
                </p>
            </Section>

            <Section n={8} title="Your Rights">
                <p>
                    Depending on your location, you may have rights to access, correct, delete, or export your personal
                    data, and to object to or restrict certain processing. Account owners can export their
                    organization&apos;s data from within the Service. To exercise other rights, contact us using the
                    details below.{" "}
                    <Placeholder>
                        WasilaDev to confirm — whether GDPR/CCPA-specific rights sections are required for your markets
                    </Placeholder>
                    .
                </p>
            </Section>

            <Section n={9} title="Cookies">
                <p>
                    We use strictly necessary cookies and local storage to keep you signed in and to remember
                    preferences such as language.{" "}
                    <Placeholder>
                        WasilaDev to confirm — any analytics/marketing cookies and consent banner requirements
                    </Placeholder>
                    .
                </p>
            </Section>

            <Section n={10} title="Children's Privacy">
                <p>
                    The Service is not directed to children under{" "}
                    <Placeholder>WasilaDev to confirm — minimum age for your jurisdiction</Placeholder>, and we do not
                    knowingly collect their personal data.
                </p>
            </Section>

            <Section n={11} title="Changes to This Policy">
                <p>
                    We may update this Policy from time to time. Material changes will be notified through the Service
                    or by email. The &quot;last updated&quot; date above reflects the latest revision.
                </p>
            </Section>

            <Section n={12} title="Contact Us">
                <p>
                    For privacy questions or to exercise your rights, contact{" "}
                    <Placeholder>WasilaDev to confirm — privacy/DPO contact email and postal address</Placeholder>.
                </p>
            </Section>
        </LegalShell>
    );
}
