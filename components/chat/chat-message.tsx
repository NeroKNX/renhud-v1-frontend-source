'use client';

import { motion } from 'motion/react';
import { User, Copy, Check, Pencil, Brain, FileText } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { copyToClipboard, type ModelType } from '@/lib/model-config';

interface AttachedFile {
  name: string;
  type: string;
  data: string;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  model?: ModelType;
  isDeep?: boolean;
  files?: AttachedFile[];
  onEdit?: (newMessage: string) => void;
}

marked.setOptions({
  breaks: true,
  gfm: true,
});

import { CrowIcon } from '@/components/ui/crow-icon';

export function ChatMessage({ message, isUser, timestamp, isDeep, files, onEdit }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleBubbleTap = () => {
    setShowActions(prev => !prev);
  };

  useEffect(() => {
    if (!showActions) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showActions]);

  const handleCopy = async () => {
    const success = await copyToClipboard(message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyBlock = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderMarkdown = (text: string): string => {
    if (!text) return '';
    try {
      return marked.parse(text) as string;
    } catch {
      return text;
    }
  };

  useEffect(() => {
    if (!contentRef.current || isUser) return;
    const preElements = contentRef.current.querySelectorAll('pre');
    preElements.forEach((pre) => {
      if (pre.querySelector('.code-copy-btn')) return;

      const code = pre.querySelector('code');
      if (!code) return;

      const btn = document.createElement('button');
      btn.className = 'code-copy-btn absolute top-2 right-2 p-1.5 bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] rounded text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)] opacity-0 transition-opacity';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      btn.title = 'Copiar código';
      btn.onclick = () => handleCopyBlock(code.textContent || '');

      pre.style.position = 'relative';
      pre.appendChild(btn);
      pre.addEventListener('mouseenter', () => btn.style.opacity = '1');
      pre.addEventListener('mouseleave', () => btn.style.opacity = '0');
    });
  }, [message, isUser]);

  const handleEdit = () => {
    if (onEdit) {
      const newMessage = prompt('Editar mensaje:', message);
      if (newMessage && newMessage !== message) {
        onEdit(newMessage);
      }
    }
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - date.getTime()) / 60000);
    const diffHr = Math.floor(diffMin / 60);
    if (diffMin < 2) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr} horas`;
    const d = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const t = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${d} ${t}`;
  };

  const htmlContent = renderMarkdown(message);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex gap-1.5 sm:gap-2 ${isUser ? 'justify-end' : 'justify-start'} mb-2 sm:mb-2.5 group`}
    >
      {!isUser && (
        <CrowIcon size="md" animate />
      )}

      <div className={`relative flex flex-col max-w-[88%] sm:max-w-[82%] md:max-w-[68%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
          ref={bubbleRef} 
          onClick={handleBubbleTap}
          className={`relative px-3 sm:px-3.5 py-1.5 sm:py-2 transition-all min-w-0 cursor-pointer active:scale-[0.98] hover:brightness-110 ${
            isUser
              ? 'bg-[var(--ren-bg-message-user)] text-[var(--ren-text-primary)] rounded-2xl rounded-br-sm ring-1 ring-[var(--accent-color)]/20'
              : isDeep
                ? 'bg-[var(--ren-bg-message-ai)] text-[var(--ren-text-primary)] rounded-2xl rounded-bl-sm border-2 border-[var(--accent-color)]/40'
                : 'bg-[var(--ren-bg-secondary)] text-[var(--ren-text-primary)] rounded-2xl rounded-bl-sm border border-[var(--ren-border)]'
          }`}
        >
          {files && files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {files.map((file, i) => (
                file.type.startsWith('image/') ? (
                  <img key={i} src={file.data} alt={file.name} className="max-w-full rounded-xl border border-[var(--ren-border)] max-h-72 object-contain" />
                ) : file.type.startsWith('audio/') ? (
                  <audio key={i} controls className="w-full max-w-xs" src={file.data}><track kind="captions" /></audio>
                ) : file.type.startsWith('video/') ? (
                  <video key={i} controls className="max-w-full rounded-xl border border-[var(--ren-border)] max-h-72" src={file.data}><track kind="captions" /></video>
                ) : (
                  <a key={i} href={file.data} download={file.name} className="text-xs text-[var(--accent-color)] hover:underline truncate max-w-[200px] border border-[var(--ren-border)] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-[var(--ren-bg-tertiary)] transition-colors">
                    <FileText size={12} /> {file.name}
                  </a>
                )
              ))}
            </div>
          )}

          <div
            ref={contentRef}
            className="ren-markdown leading-[1.5] tracking-[0.01em] text-sm md:text-base text-[var(--ren-text-primary)]"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          <div className="flex items-end justify-between mt-1 sm:mt-1.5">
            <div className="leading-none">
              {timestamp && (
                <span className="text-[9px] sm:text-[10px] text-[var(--ren-text-tertiary)]/40">{formatTime(timestamp)}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 leading-none">
              {!isUser && isDeep && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-[var(--accent-color)]/12 border border-[var(--accent-color)]/20 rounded-full">
                  <Brain size={7} className="text-[var(--accent-color)]" />
                  <span className="text-[7px] sm:text-[8px] font-mono text-[var(--accent-color)] tracking-wider uppercase">Pro</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={`flex gap-1 mt-0.5 transition-all duration-200 ${showActions ? 'opacity-100' : 'opacity-0 sm:opacity-0 sm:group-hover:opacity-100'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-0.5 rounded text-[var(--ren-text-tertiary)]/60 hover:text-[var(--accent-hover)] transition-colors active:scale-90"
            title="Copiar mensaje"
          >
            {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
          </button>
          {isUser && onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(); }}
              className="p-0.5 rounded text-[var(--ren-text-tertiary)]/60 hover:text-[var(--accent-hover)] transition-colors active:scale-90"
              title="Editar mensaje"
            >
              <Pencil size={10} />
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 self-end w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-[#1e1e24] to-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]/50 flex items-center justify-center shadow-sm">
          <User size={11} className="sm:w-[13px] sm:h-[13px] md:w-[15px] md:h-[15px] text-[var(--ren-text-tertiary)]" />
        </div>
      )}
    </motion.div>
  );
}
