
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageSquare } from 'lucide-react';
import { ChatMessage, sendChatPrompt } from '../geminiService';
import { Language } from '../types';

interface Props {
  context: {
    type: 'single_file' | 'consistency';
    summaryOrAnalysis: string;
    imageData?: string;
    mimeType?: string;
  };
  language: Language;
}

export const ChatInterface: React.FC<Props> = ({ context, language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = {
    placeholder: language === 'zh' ? '针对结果提问 (例如: "第3点是什么意思?", "这个数值在范围内吗?")' : 'Ask about findings (e.g., "Explain point 3", "Is this value ok?")',
    send: language === 'zh' ? '发送' : 'Send',
    thinking: language === 'zh' ? '思考中...' : 'Thinking...',
    title: language === 'zh' ? 'AI 智能问答 (补充分析)' : 'AI Q&A (Supplementary Analysis)',
    intro: language === 'zh' ? '您可以针对当前的审核结果进行追问。AI 将结合上下文和文件内容为您解答。' : 'You can ask follow-up questions about the audit results. The AI will answer based on context and file content.'
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendChatPrompt([...messages, userMsg], context, language);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: language === 'zh' ? "发送失败，请重试。" : "Failed to send message." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-xl bg-white overflow-hidden shadow-sm mt-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-50 p-3 border-b flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-gray-700 text-sm">{t.title}</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8 px-4">
             <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
             <p>{t.intro}</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <Bot className="w-5 h-5" />
             </div>
             <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-tl-none text-xs text-gray-500 animate-pulse">
                {t.thinking}
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t.placeholder}
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
