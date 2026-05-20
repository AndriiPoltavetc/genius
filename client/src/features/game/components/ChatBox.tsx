import { useState, useEffect, useRef } from 'react';

import { getSocket } from '../socket';
import type { ChatBroadcastPayload } from '../../../shared-types';

interface ChatBoxProps {
  gameId: string;
}

export default function ChatBox({ gameId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatBroadcastPayload[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.off('chatMessage');
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const content = input.trim();
    if (!content) return;
    getSocket().emit('chatMessage', { gameId, content });
    setInput('');
  };

  return (
    <div className="flex flex-col bg-gray-900 rounded-lg h-48">
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
        {messages.map((msg, i) => (
          <p key={i} className="text-gray-300">
            <span className="font-semibold text-primary-400">{msg.username}: </span>
            {msg.content}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex border-t border-gray-800 p-2 gap-2">
        <input
          className="input-field flex-1 text-sm py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Написати..."
          maxLength={500}
        />
        <button onClick={handleSend} className="btn-primary px-3 py-1 text-sm">
          →
        </button>
      </div>
    </div>
  );
}
