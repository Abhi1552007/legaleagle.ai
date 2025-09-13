// pages/chat.js or app/chat/page.js
import { useState } from 'react';
import Link from 'next/link';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: 'user' }]);
      // Add Saul's response logic here
      setMessages(prev => [...prev, { text: "I'm Saul, your legal expert. How can I help?", sender: 'saul' }]);
      setInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Chat with Saul</h1>
            <Link href="/" className="text-blue-500 hover:text-blue-700">
              ← Back to Home
            </Link>
          </div>
          
          <div className="border rounded-lg p-4 h-96 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <p className="text-gray-500">Start a conversation with Saul...</p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-2 rounded ${
                    msg.sender === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-black'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Saul about your legal document..."
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={handleSend}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
