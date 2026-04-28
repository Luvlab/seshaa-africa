import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Megaphone, Trophy, Plus } from 'lucide-react';
import { salesRepApi } from '../../services/api';

interface DashboardData {
  stats: { totalEarned: number; unpaid: number; paid: number; adCount: number; commissionRate: string };
  recentCommissions: { id: string; amount: number; rate: number; paid: boolean; ad: { title: string; advertiser: string }; createdAt: string }[];
  salesRep: { territory: string; country: string };
}

export default function SalesRepPortal() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ name: string; country?: string; territory: string; totalEarned: number }[]>([]);

  useEffect(() => {
    salesRepApi.dashboard().then(r => setData(r.data)).catch(() => {});
    salesRepApi.leaderboard().then(r => setLeaderboard(r.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
          <TrendingUp className="text-purple-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('salesrep.dashboard')}</h1>
          {data && <p className="text-gray-500">{data.salesRep.territory}, {data.salesRep.country}</p>}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('salesrep.totalEarned'), value: `$${data.stats.totalEarned.toFixed(2)}`, icon: <DollarSign size={20} />, color: 'green' },
            { label: t('salesrep.unpaidBalance'), value: `$${data.stats.unpaid.toFixed(2)}`, icon: <DollarSign size={20} />, color: 'orange' },
            { label: t('salesrep.adsPlaced'), value: data.stats.adCount, icon: <Megaphone size={20} />, color: 'blue' },
            { label: 'Commission Rate', value: data.stats.commissionRate, icon: <TrendingUp size={20} />, color: 'purple' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-5 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full bg-${s.color}-100 text-${s.color}-600 flex items-center justify-center shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent commissions */}
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Recent Commissions</h2>
            <a href="/advertise/new" className="flex items-center gap-1 text-sm text-green-600 font-medium hover:text-green-700">
              <Plus size={14} /> New Ad
            </a>
          </div>
          <div className="divide-y">
            {data?.recentCommissions.length === 0 && (
              <p className="text-sm text-gray-400 p-4">No commissions yet. Start selling ads!</p>
            )}
            {data?.recentCommissions.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.ad.advertiser}</p>
                  <p className="text-xs text-gray-400">{c.ad.title}</p>
                  <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${c.amount.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {c.paid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-800">{t('salesrep.leaderboard')}</h2>
          </div>
          <div className="divide-y">
            {leaderboard.map((rep, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'
                }`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{rep.name}</p>
                  <p className="text-xs text-gray-400">{rep.territory}, {rep.country}</p>
                </div>
                <p className="font-bold text-green-600">${rep.totalEarned.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">How to Earn More</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Find businesses in your area', desc: 'Talk to local shops, clinics, hotels, and services' },
            { step: '2', title: 'Sell them an ad package', desc: 'Banner, Featured, Sponsored, or Premium placements' },
            { step: '3', title: 'Earn your commission', desc: `You keep ${data?.stats.commissionRate || '20%'} of every ad budget` },
          ].map(s => (
            <div key={s.step} className="bg-white/20 rounded-xl p-4">
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center font-bold mb-2">{s.step}</div>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-purple-100">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
