import { useState } from 'react';
import { CheckCircle2, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import api from '../services/api';

const emptyForm = { name: '', email: '', phone: '', subject: '', message: '' };

export default function ContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErr('Name, email and message are required.'); return;
    }
    setErr(''); setSubmitting(true);
    try {
      await api.post('/contact', form);
      setDone(true);
    } catch { setErr('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const fieldCls = 'w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors bg-white';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg, #f8f7f4)' }}>
      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Get in touch</h1>
          <p className="text-gray-500 text-base max-w-xl">
            Have a question, partnership idea, or feedback? We'd love to hear from you.
            Our team typically responds within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Contact info */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
              <h2 className="font-bold text-gray-800 mb-4">Contact details</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--cp, #008751)', opacity: 0.12 }}>
                    <Mail size={15} style={{ color: 'var(--cp, #008751)' }} className="absolute" />
                  </div>
                  <div className="relative -mt-0.5">
                    <Mail size={15} style={{ color: 'var(--cp, #008751)' }} className="absolute left-[-28px] top-0.5" />
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Email</p>
                    <a href="mailto:hello@seshaa.africa" className="text-sm font-semibold text-gray-800 hover:underline">
                      hello@seshaa.africa
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={15} style={{ color: 'var(--cp, #008751)' }} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">WhatsApp</p>
                    <a href="https://wa.me/256700000000" className="text-sm font-semibold text-gray-800 hover:underline">
                      +256 700 000 000
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={15} style={{ color: 'var(--cp, #008751)' }} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Headquarters</p>
                    <p className="text-sm text-gray-700">Kampala, Uganda</p>
                    <p className="text-xs text-gray-400">East Africa</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
              <h3 className="font-bold text-gray-800 mb-3 text-sm">Quick links</h3>
              <div className="space-y-2">
                {[
                  { label: 'Advertise with us', href: '/advertise' },
                  { label: 'Partner / API access', href: '/contact' },
                  { label: 'Report an issue', href: '/contact' },
                  { label: 'Press enquiries', href: '/contact' },
                ].map(l => (
                  <a key={l.label} href={l.href}
                    className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 py-1 border-b last:border-0"
                    style={{ borderColor: 'var(--border, #e5e7eb)' }}>
                    {l.label}
                    <span className="text-gray-300">→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
              {done ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                  <h2 className="text-xl font-bold text-gray-800">Message received!</h2>
                  <p className="text-gray-500 max-w-sm">
                    Thank you for reaching out. We'll get back to you at <strong>{form.email}</strong> within 24 hours.
                  </p>
                  <button onClick={() => { setDone(false); setForm(emptyForm); }}
                    className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: 'var(--cp, #008751)' }}>
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h2 className="font-bold text-gray-800 mb-1">Send us a message</h2>
                  <p className="text-sm text-gray-400 mb-4">Fields marked * are required.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Full name *</label>
                      <input className={fieldCls} style={{ borderColor: 'var(--border, #e5e7eb)' }}
                        placeholder="Your name" value={form.name} onChange={set('name')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email address *</label>
                      <input type="email" className={fieldCls} style={{ borderColor: 'var(--border, #e5e7eb)' }}
                        placeholder="you@example.com" value={form.email} onChange={set('email')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Phone (optional)</label>
                      <input className={fieldCls} style={{ borderColor: 'var(--border, #e5e7eb)' }}
                        placeholder="+256 700 000 000" value={form.phone} onChange={set('phone')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                      <input className={fieldCls} style={{ borderColor: 'var(--border, #e5e7eb)' }}
                        placeholder="e.g. Partnership, Advertising" value={form.subject} onChange={set('subject')} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Message *</label>
                    <textarea className={`${fieldCls} resize-none`} style={{ borderColor: 'var(--border, #e5e7eb)' }}
                      rows={5} placeholder="Tell us how we can help…"
                      value={form.message} onChange={set('message')} />
                  </div>

                  {err && <p className="text-xs text-red-500">{err}</p>}

                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: 'var(--cp, #008751)' }}>
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                    {submitting ? 'Sending…' : 'Send message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
