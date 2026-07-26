import { useState } from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <section><h2 className="text-lg font-semibold mb-2">1. Data Collection</h2><p>We collect only what is necessary to provide AI services: account information, usage logs, and payment records.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">2. Data Usage</h2><p>Your data is used solely to deliver AI generation services, improve model quality, and comply with applicable laws.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">3. Data Sharing</h2><p>We do not sell your personal data. Third-party providers receive only the prompts you submit for generation.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">4. Data Retention</h2><p>Usage logs are retained for 90 days. Account data is retained until you request deletion.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">5. Your Rights</h2><p>You may request data export or account deletion at any time via /account/delete.</p></section>
        <section><h2 className="text-lg font-semibold mb-2">6. Contact</h2><p>For privacy inquiries, contact us through the admin panel.</p></section>
      </div>
    </div>
  );
}
