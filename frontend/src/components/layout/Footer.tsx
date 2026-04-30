import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🌍</span>
            <span className="text-white font-bold text-lg">{t('app.name')}</span>
          </div>
          <p className="text-sm text-gray-400">{t('app.tagline')}</p>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            <span className="text-gray-300 font-medium italic">"seshaa"</span> means{' '}
            <span className="text-gray-300 font-medium">"to search"</span> in{' '}
            <span className="text-gray-300 font-medium">Zulu</span> — one of the 11 official languages of South Africa. 🇿🇦
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Directory</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/search?type=BUSINESS" className="hover:text-white">Businesses</Link></li>
            <li><Link to="/search?type=PERSONAL" className="hover:text-white">People</Link></li>
            <li><Link to="/search?type=GOVERNMENT" className="hover:text-white">Government</Link></li>
            <li><Link to="/search?type=NGO" className="hover:text-white">NGOs</Link></li>
            <li><Link to="/add" className="hover:text-white">{t('listing.addNew')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Partners</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/advertise" className="hover:text-white">{t('nav.advertise')}</Link></li>
            <li><Link to="/salesrep" className="hover:text-white">{t('salesrep.title')}</Link></li>
            <li><Link to="/pro" className="hover:text-white">Listings Pro</Link></li>
            <li><Link to="/api" className="hover:text-white">API Access</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white">{t('footer.about')}</Link></li>
            <li><Link to="/privacy" className="hover:text-white">{t('footer.privacy')}</Link></li>
            <li><Link to="/terms" className="hover:text-white">{t('footer.terms')}</Link></li>
            <li><Link to="/contact" className="hover:text-white">{t('footer.contact')}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 px-4 py-4 text-center text-xs text-gray-500">
        {t('footer.copyright', { year: new Date().getFullYear() })}
        <span className="mx-2">·</span>
        <span>🇳🇬 🇰🇪 🇿🇦 🇬🇭 🇪🇹 🇹🇿 🇸🇳 🇨🇮 🇨🇲 🇲🇱 🇬🇳 🇷🇼 🇺🇬 🇩🇿 🇲🇦 🇪🇬</span>
      </div>
    </footer>
  );
}
