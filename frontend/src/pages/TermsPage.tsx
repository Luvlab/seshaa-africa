export default function TermsPage() {
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
        <h1 className="text-3xl font-black text-gray-900 mb-1">Terms of Service</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: {updated}</p>

        <div className="bg-white rounded-2xl border p-6 sm:p-8 space-y-2" style={{ borderColor: 'var(--border, #e5e7eb)' }}>

          {section('1. Acceptance', <p>By accessing or using Seshaa Africa ("Seshaa", "the platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>)}

          {section('2. Eligibility', <p>You must be at least 13 years of age to use Seshaa. By using the platform you confirm that you meet this requirement. Users under 18 must have parental or guardian consent.</p>)}

          {section('3. Your account', <>
            <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately of any unauthorised use.</p>
            <p>You may not use another person's account or create multiple accounts to circumvent restrictions.</p>
          </>)}

          {section('4. User content', <>
            <p>You retain ownership of content you submit to Seshaa (listings, reviews, photos, etc.). By submitting content, you grant Seshaa a non-exclusive, royalty-free licence to display, distribute, and promote that content on the platform.</p>
            <p>You are solely responsible for the accuracy and legality of content you submit. You agree not to post content that is false, defamatory, infringing, hateful, or illegal.</p>
          </>)}

          {section('5. Prohibited conduct', <>
            <p>You agree not to: scrape or harvest data from the platform without permission; attempt to circumvent security measures; use the platform for spam or unsolicited commercial messages; impersonate any person or entity; or use the platform for any unlawful purpose.</p>
          </>)}

          {section('6. Listings and businesses', <>
            <p>Business owners are responsible for ensuring their listings are accurate and up to date. Seshaa reserves the right to remove listings that are inaccurate, misleading, or violate these terms.</p>
            <p>Seshaa does not endorse or guarantee the quality of any business, product, or service listed on the platform.</p>
          </>)}

          {section('7. Payments and subscriptions', <p>Paid features are billed as described at the time of purchase. Prices are in USD unless stated otherwise. Seshaa reserves the right to change pricing with notice. Refunds are handled on a case-by-case basis — contact us within 7 days of a charge if you have concerns.</p>)}

          {section('8. Intellectual property', <p>The Seshaa name, logo, design, and platform code are the intellectual property of Seshaa Africa. You may not reproduce, distribute, or create derivative works without our express written consent.</p>)}

          {section('9. Third-party content', <p>Seshaa aggregates news and other content from third-party sources. We are not responsible for the accuracy or availability of third-party content. Links to external sites are provided for convenience and do not constitute endorsement.</p>)}

          {section('10. Disclaimers', <p>The platform is provided "as is" without warranties of any kind. Seshaa makes no guarantees about uptime, accuracy, or fitness for a particular purpose. To the maximum extent permitted by law, Seshaa is not liable for indirect, incidental, or consequential damages.</p>)}

          {section('11. Governing law', <p>These terms are governed by the laws of Uganda. Any disputes shall be resolved in the courts of Uganda, without prejudice to any mandatory consumer protection rights you may have in your country of residence.</p>)}

          {section('12. Changes', <p>We may update these terms from time to time. Significant changes will be communicated via the platform or by email. Continued use after changes constitutes acceptance of the updated terms.</p>)}

          {section('13. Contact', <p>For questions about these terms, contact us at <a href="mailto:legal@seshaa.africa" className="underline">legal@seshaa.africa</a> or via our <a href="/contact" className="underline">contact page</a>.</p>)}
        </div>
      </div>
    </div>
  );
}
