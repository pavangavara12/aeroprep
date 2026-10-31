import React, { useState, useRef, useEffect } from 'react';
import type { UserProgress } from '../types';
import {
  SparklesIcon,
  SendIcon,
  CopyIcon,
  CheckIcon,
} from './Icons';
import { SectionHero } from './Shared';
import { postJson } from '../services/apiClient';

interface AICareerAssistantProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
}

interface Message {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

const PROMPT_SUGGESTIONS = [
  'Generate a 30-day DSA roadmap for top product companies',
  'Explain the difference between Process and Thread for tech round',
  'How do I answer "What is your greatest weakness" with STAR?',
  'What are top 5 SQL window functions asked in interviews?',
  'How should I structure my resume projects for ATS passing?',
];

export const AICareerAssistant: React.FC<AICareerAssistantProps> = ({ progress: _progress, onAddScore }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      sender: 'assistant',
      text: `Hello! I am your **AeroPrep Career & Placement AI Mentor**. I can help you with DSA problem breakdowns, core CS concepts (OS, DBMS, Networks), behavioral interview strategies using STAR, and placement roadmaps.\n\nHow can I help you accelerate your interview readiness today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!userText) setInput('');
    setLoading(true);

    try {
      // First attempt dedicated career chat backend
      const res = await postJson<{ reply: string }>('/api/career/chat', {
        message: textToSend,
        topic: 'placement',
      });

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: res.reply || 'Here is guidance tailored for your placement preparation.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
      onAddScore(10);
    } catch {
      // Graceful local advice fallback
      const fallbackMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: `Here is advice on "${textToSend}": Focus on solid problem decomposition, time/space complexity analysis, and communicating your thought process out loud before writing code. Be sure to explore our **Technical Prep** and **Coding Practice** tabs for comprehensive drills!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionHero
        icon={<SparklesIcon size={26} />}
        title="AI Career Assistant & Placement Mentor"
        subtitle="Get instant engineering career advice, algorithmic explanations, resume critiques, and placement interview strategies."
      />

      {/* Suggested Prompts Carousel */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Prompts:</span>
        {PROMPT_SUGGESTIONS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="panel" style={{ height: '560px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Messages Scroll Area */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m) => {
            const isBot = m.sender === 'assistant';

            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isBot ? 'flex-start' : 'flex-end',
                  maxWidth: '82%',
                }}
              >
                {isBot && (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--accent-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      flexShrink: 0,
                    }}
                  >
                    <SparklesIcon size={18} />
                  </div>
                )}

                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                    background: isBot ? 'var(--bg-primary)' : 'var(--accent)',
                    color: isBot ? 'var(--text-primary)' : '#ffffff',
                    border: isBot ? '1px solid var(--card-border)' : 'none',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    position: 'relative',
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      fontSize: '0.72rem',
                      color: isBot ? 'var(--text-muted)' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <span>{m.timestamp}</span>
                    {isBot && (
                      <button
                        onClick={() => handleCopy(m.id, m.text)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                        title="Copy message"
                      >
                        {copiedId === m.id ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start', maxWidth: '80%' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--accent-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <SparklesIcon size={18} />
              </div>
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: '4px 16px 16px 16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--card-border)',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}
              >
                Thinking and preparing placement guidance...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            padding: '14px 20px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Ask about DSA algorithms, system design, HR questions, or resume optimization..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <SendIcon size={16} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
