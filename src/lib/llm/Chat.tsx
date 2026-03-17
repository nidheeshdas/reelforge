'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LLMChatProps {
  onInsertCode?: (code: string) => void;
  apiKey?: string;
}

export function LLMChat({ onInsertCode, apiKey }: LLMChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your VidScript assistant. Describe what video you want to create, and I\'ll write the code for you. You can also ask me to explain errors or suggest improvements.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !apiKey) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, apiKey }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = (await response.json()) as { response?: string };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response ?? '' }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please check your API key and try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInsertCode = (content: string) => {
    const codeMatch = content.match(/```vidscript\n([\s\S]*?)```/);
    if (codeMatch) {
      onInsertCode?.(codeMatch[1].trim());
    } else {
      onInsertCode?.(content);
    }
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        title="Open AI Assistant"
      >
        🤖
      </button>
    );
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        width: '24rem',
        height: '32rem',
        background: '#1e293b',
        borderRadius: '0.75rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          background: '#3b82f6',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600 }}>AI Assistant</span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '1.25rem',
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                background: msg.role === 'user' ? '#3b82f6' : '#334155',
                color: 'white',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
            {msg.role === 'assistant' && msg.content.includes('```') && (
              <button
                onClick={() => handleInsertCode(msg.content)}
                style={{
                  marginTop: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                }}
              >
                Insert Code
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {!apiKey ? (
        <div style={{ padding: '1rem', borderTop: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>
            Add your OpenAI API key in settings to use the AI assistant.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ padding: '0.75rem', borderTop: '1px solid #334155' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your video..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #475569',
                background: '#0f172a',
                color: 'white',
                fontSize: '0.875rem',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
