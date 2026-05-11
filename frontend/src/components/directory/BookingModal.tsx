import { useState } from 'react';
import { X, Calendar, Clock, Users, FileText } from 'lucide-react';
import { bookingsApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import type { Listing } from '../../types';

const SERVICES: Record<string, string[]> = {
  transport: ['Airport Transfer', 'City Tour', 'Wedding Transport', 'Corporate Transfer'],
  chauffeur: ['Airport Transfer', 'City Tour', 'Day Hire', 'Event Transport'],
  catering: ['Corporate Event', 'Wedding Catering', 'Birthday Party', 'Home Delivery'],
  beauty: ['Haircut & Style', 'Braiding', 'Makeup', 'Manicure & Pedicure', 'Facial'],
  salon: ['Haircut & Style', 'Braiding', 'Makeup', 'Manicure & Pedicure'],
  garage: ['Oil Change', 'General Service', 'Tire Change', 'Diagnostics', 'Body Work'],
  auto: ['Oil Change', 'General Service', 'Tire Change', 'Diagnostics'],
  hotel: ['Room Reservation', 'Conference Room', 'Event Space'],
  spa: ['Full Body Massage', 'Facial Treatment', 'Aromatherapy', 'Couples Spa'],
  photography: ['Wedding Photography', 'Portrait Session', 'Event Coverage', 'Corporate Headshots'],
};

function getServices(category?: string): string[] {
  const cat = (category || '').toLowerCase();
  return SERVICES[cat] || ['Appointment', 'Consultation', 'Service'];
}

interface Props {
  listing: Listing;
  onClose: () => void;
}

export default function BookingModal({ listing, onClose }: Props) {
  const { user } = useAuthStore();
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState(user?.name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const services = getServices(listing.category);

  const submit = async () => {
    if (!service || !date || !time) {
      setError('Please select a service, date and time.');
      return;
    }
    if (!user) {
      setError('Please log in to make a booking.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const dateTime = new Date(`${date}T${time}`).toISOString();
      await bookingsApi.create({
        listingId: listing.id,
        service,
        date: dateTime,
        notes,
        guestCount,
        contactName,
        contactPhone,
      });
      setSuccess(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="fixed left-0 right-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ top: 'var(--nav-h, 56px)', bottom: 'var(--tab-h, 0px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Book Now</h2>
            <p className="text-sm text-gray-500">{listing.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">Booking Request Sent!</h3>
            <p className="text-sm text-gray-500 mb-4">
              {listing.name} will confirm your booking. You'll receive a notification shortly.
            </p>
            <button
              className="w-full py-2.5 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'var(--cp)' }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Service */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Service</label>
              <div className="grid grid-cols-2 gap-2">
                {services.map(s => (
                  <button
                    key={s}
                    className={`text-sm py-2 px-3 rounded-lg border text-left transition-colors ${
                      service === s ? 'border-[var(--cp)] bg-[var(--cp-light)] text-[var(--cp)] font-medium' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setService(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Calendar size={11} /> Date
                </label>
                <input type="date" min={minDateStr} value={date} onChange={e => setDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Clock size={11} /> Time
                </label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)]" />
              </div>
            </div>

            {/* Guest count */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Users size={11} /> Number of guests
              </label>
              <div className="flex items-center gap-3">
                <button className="w-9 h-9 rounded-full border text-xl font-bold hover:bg-gray-50"
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}>−</button>
                <span className="text-lg font-semibold w-8 text-center">{guestCount}</span>
                <button className="w-9 h-9 rounded-full border text-xl font-bold hover:bg-gray-50"
                  onClick={() => setGuestCount(guestCount + 1)}>+</button>
              </div>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Your Name</label>
                <input value={contactName} onChange={e => setContactName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)]" placeholder="Your name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Phone</label>
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} type="tel"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)]" placeholder="+234..." />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <FileText size={11} /> Notes (optional)
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)] resize-none"
                placeholder="Any special requests or details..." />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--cp)' }}
              onClick={submit}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Request Booking'}
            </button>
            <p className="text-xs text-center text-gray-400">Free to request · Business confirms within 24h</p>
          </div>
        )}
      </div>
    </div>
  );
}
