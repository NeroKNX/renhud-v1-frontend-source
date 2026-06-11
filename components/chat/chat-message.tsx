'use client';

import { motion } from 'motion/react';
import { User, Copy, Check, Pencil, Brain, FileText, ChevronDown, ChevronUp, Bookmark } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import { copyToClipboard, type ModelType } from '@/lib/model-config';
import type { TrickInfo } from '@/lib/session-manager';

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
  activeTrick?: TrickInfo;
  files?: AttachedFile[];
  onEdit?: (newMessage: string) => void;
  isStreaming?: boolean;
}

marked.setOptions({
  breaks: true,
  gfm: true,
});

import { CrowIcon } from '@/components/ui/crow-icon';

export function ChatMessage({ message, isUser, timestamp, isDeep, activeTrick, files, onEdit, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [copyBlockCopied, setCopyBlockCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [guardarOpen, setGuardarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // ── Parsear bloque SALIDA COPIABLE ──
  let mainMessage = message;
  let copyBlockContent: string | null = null;
  let guardarContent: string | null = null;
  if (message) {
    const delimiters = ['\n--- SALIDA COPIABLE ---\n', '\n-- SALIDA COPIABLE --\n'];
    let bestIdx = -1;
    let bestDelim = '';
    for (const delim of delimiters) {
      const idx = message.lastIndexOf(delim);
      if (idx > bestIdx) {
        bestIdx = idx;
        bestDelim = delim;
      }
    }
    if (bestIdx !== -1) {
      const after = message.slice(bestIdx + bestDelim.length);
      const finIdx = after.lastIndexOf('\n---');
      copyBlockContent = finIdx !== -1 ? after.slice(0, finIdx).trim() : after.trim();
      mainMessage = message.slice(0, bestIdx).trim();
    }

    // ── Parsear línea GUARDAR (opción B — render colapsable) ──
    const guardarLines = mainMessage.split('\n').filter(line => /^(?:\s*)?(?:📝\s*)?GUARDAR:\s*(.+)$/i.test(line.trim()));
    if (guardarLines.length > 0) {
      const lastLine = guardarLines[guardarLines.length - 1];
      const match = lastLine.match(/GUARDAR:\s*(.+)$/i);
      if (match) {
        guardarContent = match[1].trim();
        mainMessage = mainMessage.split('\n').filter(line => !/^(?:\s*)?(?:📝\s*)?GUARDAR:/i.test(line.trim())).join('\n').trim();
      }
    }
  }

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
    const success = await copyToClipboard(mainMessage);
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

  const htmlContent = renderMarkdown(mainMessage);
  const finalHtml = isStreaming
    ? htmlContent + '<span class="ren-streaming-cursor">▊</span>'
    : htmlContent;

  // ── Bloque pensando (streaming, texto vacío) ──
  if (!message && !isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex gap-1.5 sm:gap-2 justify-start mb-3 sm:mb-4 group"
      >
        <CrowIcon size="md" animate />
        <div className="relative flex flex-col max-w-[88%] sm:max-w-[82%] min-w-0 items-start">
          <div className="ren-block-ai ren-block-thinking px-4 sm:px-5 py-3 sm:py-3.5">
            <div className="flex items-center gap-1.5 h-4">
              <span className="ren-thinking-dot w-1.5 h-1.5 rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '0ms' }} />
              <span className="ren-thinking-dot w-1.5 h-1.5 rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '200ms' }} />
              <span className="ren-thinking-dot w-1.5 h-1.5 rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex gap-1.5 sm:gap-2 ${isUser ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4 group`}
    >
      {!isUser && (
        <CrowIcon size="md" animate />
      )}

      <div className={`relative flex flex-col min-w-0 ${isUser ? 'items-end max-w-[78%] sm:max-w-[65%]' : 'items-start max-w-[90%] sm:max-w-[82%]'}`}>
        <div 
          ref={bubbleRef} 
          onClick={handleBubbleTap}
          className={`relative px-3.5 sm:px-5 py-2.5 sm:py-3 transition-all min-w-0 ${
            isUser
              ? 'ren-block-user text-[var(--ren-text-primary)]'
              : 'ren-block-ai text-[var(--ren-text-primary)]'
          }`}
          style={activeTrick ? (isUser
            ? { borderRightColor: activeTrick.color }
            : { borderLeftColor: activeTrick.color }) : undefined}
        >
          {/* Trick badge */}
          {activeTrick && (
            <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono"
                style={{ 
                  backgroundColor: activeTrick.color + '18',
                  border: `1px solid ${activeTrick.color}40`,
                  color: activeTrick.color
                }}
              >
                {activeTrick.emoji} {activeTrick.name}
              </span>
            </div>
          )}
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
            className={`ren-markdown tracking-[0.005em] text-sm md:text-[15px] text-[var(--ren-text-primary)] select-text ${isUser ? 'leading-[1.6]' : 'leading-[1.7]'}`}
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            dangerouslySetInnerHTML={{ __html: finalHtml }}
          />

          {/* ── Guardar colapsable (opción B) ── */}
          {guardarContent && !isUser && (
            <div className="mt-2.5">
              <button
                onClick={() => setGuardarOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono transition-all w-full border border-dashed"
                style={{
                  backgroundColor: guardarOpen ? 'var(--accent-color)' + '0c' : 'transparent',
                  borderColor: guardarOpen ? 'var(--accent-color)' + '30' : 'var(--ren-border)' + '30',
                  color: 'var(--ren-text-tertiary)',
                }}
              >
                <Bookmark size={10} className="text-[var(--accent-color)]/70 flex-shrink-0" />
                <span className="truncate flex-1 text-left">
                  {guardarOpen ? 'Guardado en memoria' : '📌 Guardado'}
                </span>
                {guardarOpen ? <ChevronUp size={10} className="flex-shrink-0" /> : <ChevronDown size={10} className="flex-shrink-0" />}
              </button>
              {guardarOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="mt-1 px-2.5 py-2 rounded-lg text-[11px] sm:text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--accent-color)' + '06',
                    border: '1px solid var(--accent-color)' + '15',
                    color: 'var(--ren-text-secondary)',
                  }}
                >
                  <span className="font-mono whitespace-pre-wrap break-words select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                    {guardarContent}
                  </span>
                </motion.div>
              )}
            </div>
          )}

          {/* ── Bloque Salida Copiable (estilo Claude Código) ── */}
          {copyBlockContent && !isUser && (
            <div className="mt-3 pt-3 border-t border-[var(--ren-border)]/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--ren-text-tertiary)]">
                  📋 Salida Copiable
                </span>
                <button
                  onClick={() => {
                    copyToClipboard(copyBlockContent!);
                    setCopyBlockCopied(true);
                    setTimeout(() => setCopyBlockCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-[var(--ren-border)] bg-[var(--ren-bg-tertiary)] hover:bg-[var(--ren-bg-secondary)] text-[var(--ren-text-secondary)] hover:text-[var(--ren-text-primary)] transition-all active:scale-95"
                >
                  {copyBlockCopied ? (
                    <><Check size={10} className="text-emerald-400" /> Copiado</>
                  ) : (
                    <><Copy size={10} /> Copiar</>
                  )}
                </button>
              </div>
              <pre
                className="whitespace-pre-wrap font-mono text-[11px] sm:text-xs leading-relaxed text-[var(--ren-text-secondary)] bg-[var(--ren-bg-tertiary)]/50 border border-[var(--ren-border)]/30 rounded-lg px-3 py-2.5 select-text overflow-x-auto"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              >
                {copyBlockContent}
                </pre>
            </div>
          )}

          <div className="flex items-end justify-between mt-2 sm:mt-2.5">
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
        <div className="flex-shrink-0 self-end w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-[var(--ren-bg-tertiary)] to-[var(--ren-bg-secondary)] border border-[var(--ren-border)]/50 flex items-center justify-center shadow-sm">
          <User size={11} className="sm:w-[13px] sm:h-[13px] md:w-[15px] md:h-[15px] text-[var(--ren-text-tertiary)]" />
        </div>
      )}
    </motion.div>

    {isStreaming && (
      <style>{`
        @keyframes renCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .ren-streaming-cursor {
          display: inline-block;
          animation: renCursorBlink 1s step-end infinite;
          color: var(--accent-color);
          font-size: 0.9em;
          margin-left: 1px;
        }
      `}</style>
    )}
    </>
  );
}
