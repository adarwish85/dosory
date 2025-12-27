import * as React from 'react';
import {
    Body,
    Container,
    Head,
    Html,
    Img,
    Preview,
    Section,
    Text,
} from '@react-email/components';

interface BaseLayoutProps {
    previewText: string;
    children: React.ReactNode;
}

export function BaseLayout({ previewText, children }: BaseLayoutProps) {
    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header with Logo */}
                    <Section style={header}>
                        <Img
                            src="https://dosory.com/logo.png"
                            width="120"
                            height="40"
                            alt="Dosory"
                            style={logo}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={content}>
                        {children}
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} Dosory. All rights reserved.
                        </Text>
                        <Text style={footerText}>
                            This email was sent by Dosory. If you have questions,
                            contact us at support@dosory.com
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    maxWidth: '600px',
    borderRadius: '8px',
    overflow: 'hidden' as const,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
};

const header = {
    backgroundColor: '#1e3a5f',
    padding: '24px',
    textAlign: 'center' as const,
};

const logo = {
    margin: '0 auto',
};

const content = {
    padding: '32px 24px',
};

const footer = {
    backgroundColor: '#f6f9fc',
    padding: '24px',
    textAlign: 'center' as const,
};

const footerText = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '0 0 8px',
};
