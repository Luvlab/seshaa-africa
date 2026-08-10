export default function PrivacyPage() {
  const updated = 'August 2025';
  const section = (title: string, body: React.ReactNode) => (
    <section className="mb-6">
      <h2 className="font-bold text-gray-900 text-base mb-2">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{body}</div>
    </section>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg, #f8f7f4)' }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: {updated}</p>

        <div className="bg-white rounded-2xl border p-6 sm:p-8 space-y-2" style={{ borderColor: 'var(--border, #e5e7eb)' }}>

          {section('1. Who we are', <p>Seshaa Africa ("Seshaa", "we", "us") operates the website and mobile application at seshaa.africa. We are headquartered in Kampala, Uganda.</p>)}

          {section('2. Information we collect', <>
            <p><strong>Information you provide:</strong> when you create an account, list a business, submit a form, or contact us, we collect your name, email address, phone number, and any content you submit.</p>
            <p><strong>Usage data:</strong> we automatically collect information about how you use the platform, including pages visited, search queries, and device type, to improve our services.</p>
            <p><strong>Location:</strong> we may infer your approximate country from your IP address to show relevant local content. We do not track precise GPS location without your consent.</p>
          </>)}

          {section('3. How we use your information', <>
            <p>We use the information we collect to provide and improve our services, send you important notices about your account, personalise your experience and show relevant local content, process payments and manage subscriptions, and respond to your enquiries.</p>
            <p>We do not sell your personal data to third parties.</p>
          </>)}

          {section('4. Data sharing', <>
            <p>We may share your information with trusted service providers who help us operate the platform (e.g., cloud hosting, payment processors) under strict confidentiality agreements. We may disclose information when required by law or to protect the rights and safety of our users.</p>
          </>)}

          {section('5. Cookies', <p>We use cookies and similar technologies to keep you logged in and to understand how the platform is used. You can disable cookies in your browser settings, though some features may not function correctly.</p>)}

          {section('6. Data retention', <p>We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us.</p>)}

          {section('7. Your rights', <p>Depending on your location, you may have the right to access, correct, or delete your personal data, and to object to or restrict certain processing. To exercise these rights, contact us at <a href="mailto:privacy@seshaa.africa" className="underline">privacy@seshaa.africa</a>.</p>)}

          {section('8. Security', <p>We implement industry-standard security measures to protect your data. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>)}

          {section('9. Children', <p>Seshaa is not directed at children under 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us.</p>)}

          {section('10. Changes to this policy', <p>We may update this policy from time to time. We will notify users of significant changes via email or a notice on the platform. Your continued use of Seshaa after changes constitutes acceptance of the updated policy.</p>)}

          {section('11. Contact', <p>For privacy-related questions or requests, contact us at <a href="mailto:privacy@seshaa.africa" className="underline">privacy@seshaa.africa</a> or use our <a href="/contact" className="underline">contact form</a>.</p>)}
        </div>
      </div>
    </div>
  );
}
