import { useState, useEffect } from 'react';
import { Users, List, Megaphone, TrendingUp, Shield, AlertCircle } from 'lucide-react';
import api from '../../services/api';

interface Stats { listings: number; users: number; ads: number; salesReps: number }

export default function AdminPortal() {
  const [stats, setStats] = useState<Stats>({ listings: 0, users: 0, ads: 0, salesReps: 0 });
  const [activeTab, setActiveTab] = useState<'listings' | 'users' | 'ads' | 'reps'>('listings');

  useEffect(() => {
    // In production, these would be admin-only endpoints
    Promise.all([
      api.get('/admin/stats').catch(() => ({ data: {} })),
    ]).then(([statsRes]) => {
      if (statsRes.data?.stats) setStats(statsRes.data.stats);
    });
  }, []);

  const TABS = [
    { key: 'listings' as const, label: 'Listings', icon: <List size={16} /> },
    { key: 'users' as const, label: 'Users', icon: <Users size={16} /> },
    { key: 'ads' as const, label: 'Ads', icon: <Megaphone size={16} /> },
    { key: 'reps' as const, label: 'Sales Reps', icon: <TrendingUp size={16} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <Shield className="text-red-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-gray-500">Manage the entire platform</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Listings', value: stats.listings, icon: <List />, color: 'green' },
          { label: 'Users', value: stats.users, icon: <Users />, color: 'blue' },
          { label: 'Active Ads', value: stats.ads, icon: <Megaphone />, color: 'orange' },
          { label: 'Sales Reps', value: stats.salesReps, icon: <TrendingUp />, color: 'purple' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-5">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="flex border-b">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <AlertCircle size={16} />
            <span>Connect to the backend to manage {activeTab}. Admin API endpoints include verify/reject listings, ban users, manage ad campaigns, and pay commissions.</span>
          </div>

          {/* Moderation queue placeholder */}
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                  <div>
                    <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">Approve</button>
                  <button className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
