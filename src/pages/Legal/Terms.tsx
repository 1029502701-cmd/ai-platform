import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <section><h2 className="text-lg font-semibold mb-2">1. Acceptance</h2><p>By using this platform, you agree to these terms and our Privacy Policy.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">2. Service</h2><p>We provide AI generation services powered by third-party providers. We do not guarantee uninterrupted service.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">3. Prohibited Use</h2><p>You may not use the service for illegal content, hate speech, spam, or malware generation.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">4. Payments</h2><p>Purchases are final unless otherwise specified. Refunds are processed at our discretion.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">5. Termination</h2><p>We reserve the right to suspend accounts that violate these terms.</p></section>
      </div>
    </div>
  );
}
