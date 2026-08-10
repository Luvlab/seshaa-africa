import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg, #f8f7f4)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-3">About Seshaa Africa</h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            The all-in-one platform built for Africa — connecting people, businesses, and communities across the continent.
          </p>
        </div>

        <div className="space-y-8">

          <section className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
            <h2 className="font-bold text-gray-900 text-lg mb-3">Our mission</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Seshaa Africa is building the digital infrastructure that African communities deserve — a local, trusted, and
              multilingual platform where businesses get found, services are accessible, and voices are heard.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We launched in Uganda and are rolling out across East Africa and the continent, country by country,
              community by community. Everything we build is designed for Africa first — not adapted from elsewhere.
            </p>
          </section>

          <section className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
            <h2 className="font-bold text-gray-900 text-lg mb-4">What we offer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: '📍', title: 'Business directory', desc: 'Find any business, service, or place in Uganda and across Africa.' },
                { icon: '📰', title: 'Africa news', desc: 'Real-time news from across the continent, Uganda-first.' },
                { icon: '📻', title: 'Live radio', desc: 'Stream Uganda and African radio stations live.' },
                { icon: '📅', title: 'Events', desc: 'Discover and list local events, concerts, and gatherings.' },
                { icon: '🕊️', title: 'Obituaries', desc: 'A respectful space for death notices and tributes.' },
                { icon: '🌍', title: 'Translate', desc: 'Content in Luganda, Swahili, and other African languages.' },
              ].map(f => (
                <div key={f.title} className="flex gap-3 p-3 rounded-xl" style={{ background: 'var(--bg, #f8f7f4)' }}>
                  <span className="text-2xl shrink-0">{f.icon}</span>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{f.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
            <h2 className="font-bold text-gray-900 text-lg mb-3">Built in Africa</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Seshaa is headquartered in Kampala, Uganda. Our team is spread across Uganda and the diaspora.
              We are proud to be an African product, built for African people, solving African challenges.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We believe technology should empower local economies — not extract from them.
              Every listing, every business found, every connection made on Seshaa strengthens the communities we serve.
            </p>
          </section>

          <div className="flex gap-3 flex-wrap">
            <Link to="/contact"
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: 'var(--cp, #008751)' }}>
              Contact us
            </Link>
            <Link to="/advertise"
              className="px-5 py-2.5 rounded-xl text-sm font-bold border text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--border, #e5e7eb)' }}>
              Advertise with us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
