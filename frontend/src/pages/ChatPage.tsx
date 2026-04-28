import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Plus, Users, Share2, MapPin, Calendar, X, Search, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import api from '../services/api';
import type { ChatRoom, Message } from '../types';

const SHARE_PLATFORMS = [
  { name: 'WhatsApp', color: 'bg-green-500', url: (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}` },
  { name: 'Telegram', color: 'bg-blue-500', url: (text: string) => `https://t.me/share/url?text=${encodeURIComponent(text)}` },
  { name: 'Facebook', color: 'bg-blue-700', url: (text: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(text)}` },
  { name: 'X / Twitter', color: 'bg-gray-800', url: (text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` },
  { name: 'SMS', color: 'bg-gray-500', url: (text: string) => `sms:?body=${encodeURIComponent(text)}` },
];

export default function ChatPage() {
  useTranslation();
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [shareModal, setShareModal] = useState<{ text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    api.get('/chat/rooms').then(r => setRooms(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!activeRoom) return;
    api.get(`/chat/rooms/${activeRoom}/messages`).then(r => setMessages(r.data)).catch(() => {});
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom) return;
    const msg = input;
    setInput('');
    try {
      const r = await api.post(`/chat/rooms/${activeRoom}/messages`, { content: msg, type: 'text' });
      setMessages(m => [...m, r.data]);
    } catch {}
  };

  const sendAI = async () => {
    if (!aiInput.trim()) return;
    const userMsg = { role: 'user' as const, content: aiInput };
    setAiMessages(m => [...m, userMsg]);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...aiMessages, userMsg] }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;
      let assistantText = '';
      setAiMessages(m => [...m, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const { text } = JSON.parse(data);
            assistantText += text;
            setAiMessages(m => [...m.slice(0, -1), { role: 'assistant', content: assistantText }]);
          } catch {}
        }
      }
    } catch {
      setAiMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const shareToChat = (text: string) => setShareModal({ text });

  const externalShare = (platformUrl: (t: string) => string) => {
    if (shareModal) window.open(platformUrl(shareModal.text), '_blank', 'noopener,noreferrer');
  };

  if (!user) return (
    <div className="flex items-center justify-center h-96 text-gray-500">
      <div className="text-center">
        <p className="text-lg mb-4">Please log in to access messages</p>
        <a href="/auth" className="bg-green-600 text-white px-6 py-2 rounded-full">Login</a>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 h-[calc(100vh-80px)] flex gap-4">
      {/* Rooms sidebar */}
      <div className="w-72 shrink-0 bg-white rounded-xl border flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Messages</h2>
          <div className="flex gap-2">
            <button
              className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
              onClick={() => setShowAI(true)}
              title="AI Assistant"
            >
              <Sparkles size={16} />
            </button>
            <button className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="p-2 border-b">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" placeholder="Search conversations..." />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 && (
            <div className="text-center text-gray-400 p-6 text-sm">
              No conversations yet.<br />Start by searching for a listing!
            </div>
          )}
          {rooms.map(room => (
            <button
              key={room.id}
              className={`w-full text-left p-4 hover:bg-gray-50 border-b transition-colors ${activeRoom === room.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
              onClick={() => setActiveRoom(room.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                  {room.type === 'group' ? <Users size={16} /> : (room.name || 'U').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{room.name || 'Direct Message'}</p>
                  {room.lastMessage && (
                    <p className="text-xs text-gray-400 truncate">{room.lastMessage.content}</p>
                  )}
                </div>
                {room.unreadCount > 0 && (
                  <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {room.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {showAI ? (
        <div className="flex-1 bg-white rounded-xl border flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-purple-500" />
              <h3 className="font-bold text-gray-800">AI Assistant</h3>
            </div>
            <button onClick={() => setShowAI(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiMessages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
                <p>Ask me anything — find businesses, get directions, discover events across Africa!</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {['Find a hospital in Nairobi', 'Restaurants in Dakar', 'Best hotels in Accra', 'Dentist in Lagos'].map(s => (
                    <button key={s} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-200 hover:bg-purple-100"
                      onClick={() => { setAiInput(s); }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {aiMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-500 animate-pulse">...</div>
              </div>
            )}
          </div>
          <div className="p-4 border-t flex gap-2">
            <input
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendAI()}
              placeholder="Ask anything about Africa..."
            />
            <button className="bg-purple-600 text-white px-4 py-2.5 rounded-xl hover:bg-purple-700" onClick={sendAI}>
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : activeRoom ? (
        <div className="flex-1 bg-white rounded-xl border flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                {(rooms.find(r => r.id === activeRoom)?.name || 'U').charAt(0)}
              </div>
              <span className="font-bold text-gray-800">{rooms.find(r => r.id === activeRoom)?.name || 'Direct Message'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" onClick={() => shareToChat('Check out this listing on Seshaa!')} title="Share">
                <Share2 size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(m => {
              const isMe = m.senderId === user.id;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold shrink-0">
                      {m.senderName.charAt(0)}
                    </div>
                  )}
                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMe && <p className="text-xs text-gray-400 mb-1">{m.senderName}</p>}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                      isMe ? 'bg-green-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    } ${m.type !== 'text' ? 'border-l-4 border-blue-400 bg-blue-50 text-blue-800' : ''}`}>
                      {m.type === 'listing' && <MapPin size={12} className="inline mr-1" />}
                      {m.type === 'event' && <Calendar size={12} className="inline mr-1" />}
                      {m.content}
                      {m.type !== 'text' && (
                        <button
                          className="block text-xs mt-1 text-blue-600 hover:underline"
                          onClick={() => setShareModal({ text: m.content })}
                        >
                          Share externally ↗
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t flex gap-2">
            <input
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-400"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
            />
            <button className="bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700" onClick={sendMessage}>
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <p>Select a conversation or start a new one</p>
            <button
              className="mt-4 flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm mx-auto hover:bg-purple-100"
              onClick={() => setShowAI(true)}
            >
              <Sparkles size={16} /> Open AI Assistant
            </button>
          </div>
        </div>
      )}

      {/* External share modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Share to</h3>
              <button onClick={() => setShareModal(null)}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mb-4">{shareModal.text}</p>
            <div className="grid grid-cols-2 gap-2">
              {SHARE_PLATFORMS.map(p => (
                <button
                  key={p.name}
                  className={`${p.color} text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90`}
                  onClick={() => { externalShare(p.url); setShareModal(null); }}
                >
                  {p.name}
                </button>
              ))}
              <button
                className="bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200"
                onClick={() => { navigator.clipboard.writeText(shareModal.text); setShareModal(null); }}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
