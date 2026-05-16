'use client';

import { Send, Paperclip, Brain, X, FileText, Image as ImageIcon, Music, Video } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { PreferencesManager } from '@/lib/preferences-manager';

export interface QuickSkill {
  id: string;
  name: string;
  enabled: boolean;
  quickAccess?: boolean;
  emoji?: string;
}

interface ChatInputProps {
  onSendMessage: (message: string, isDeep?: boolean, files?: File[]) => void;
  disabled?: boolean;
  sessionId?: string;
  quickSkills?: QuickSkill[];
  onToggleSkill?: (skillId: string) => void;
}

export function ChatInput({ onSendMessage, disabled, sessionId, quickSkills, onToggleSkill }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState(true);

  useEffect(() => {
    const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasKeyboard = !('ontouchstart' in window) || navigator.maxTouchPoints === 0;
    setIsTouchDevice(!(hasHover || hasKeyboard));
  }, []);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionId) {
      const draft = PreferencesManager.getDraft(sessionId);
      if (draft) {
        setMessage(draft);
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && message) {
      PreferencesManager.saveDraft(sessionId, message);
    }
  }, [message, sessionId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      const isUnder50MB = file.size <= 50 * 1024 * 1024;
      return (isImage || isPDF || isAudio || isVideo) && isUnder50MB;
    });
    setAttachedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachedFiles.length > 0) && !disabled) {
      onSendMessage(message, isAdvancedMode, attachedFiles.length > 0 ? attachedFiles : undefined);
      setMessage('');
      setAttachedFiles([]);
      if (sessionId) {
        PreferencesManager.clearDraft(sessionId);
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.blur();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (!isTouchDevice) {
        // Desktop: Enter envía, Shift+Enter nueva línea
        e.preventDefault();
        handleSubmit(e);
      }
      // Mobile: Enter = nueva línea (el botón de enviar es para enviar)
    }
  };

  return (
    <div className="border-t border-[var(--ren-border)] ren-bg-primary px-2 sm:px-4 py-3 sm:py-4">
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachedFiles.map((file, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] rounded-lg text-sm"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon size={14} className="text-[var(--accent-color)] flex-shrink-0" />
              ) : file.type.startsWith('audio/') ? (
                <Music size={14} className="text-green-400 flex-shrink-0" />
              ) : file.type.startsWith('video/') ? (
                <Video size={14} className="text-yellow-400 flex-shrink-0" />
              ) : (
                <FileText size={14} className="text-red-400 flex-shrink-0" />
              )}
              <span className="text-[var(--ren-text-primary)] font-mono text-xs max-w-[100px] sm:max-w-[150px] truncate">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="p-0.5 hover:bg-[var(--ren-bg-tertiary)] rounded transition-colors flex-shrink-0"
              >
                <X size={12} className="text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)]" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2 group relative flex-shrink-0">
            <input
              type="checkbox"
              checked={isAdvancedMode}
              onChange={(e) => setIsAdvancedMode(e.target.checked)}
              disabled={disabled}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] rounded accent-[#6366f1] cursor-pointer hover:border-[var(--accent-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Brain size={12} className={`sm:w-[14px] sm:h-[14px] transition-colors flex-shrink-0 ${isAdvancedMode ? 'text-[var(--accent-color)]' : 'text-[var(--ren-text-tertiary)]'}`} />
            <span className={`text-xs sm:text-sm font-mono transition-colors flex-shrink-0 ${isAdvancedMode ? 'text-[var(--accent-color)]' : 'text-[var(--ren-text-tertiary)]'}`}>
              Deep
            </span>
            <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50">
              <div className="bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--ren-text-primary)] font-mono whitespace-nowrap shadow-lg">
                Usa el modelo avanzado (Pro) para preguntas complejas
              </div>
            </div>
            <motion.div
              className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0 ${isAdvancedMode ? 'bg-[var(--accent-color)]' : 'bg-gray-700'}`}
              animate={{ scale: isAdvancedMode ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {quickSkills?.filter(s => s.quickAccess).length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-[var(--ren-border)]">
              {quickSkills?.filter(s => s.quickAccess).map(skill => (
                <label
                  key={skill.id}
                  className="flex items-center gap-1 sm:gap-1.5 cursor-pointer flex-shrink-0 group/skill"
                >
                  <input
                    type="checkbox"
                    checked={skill.enabled}
                    onChange={() => onToggleSkill?.(skill.id)}
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] rounded accent-[#6366f1] cursor-pointer hover:border-[var(--accent-color)] transition-colors"
                  />
                  <span className={`text-[10px] sm:text-[11px] font-mono transition-colors ${
                    skill.enabled
                      ? 'text-[var(--accent-hover)]'
                      : 'text-[var(--ren-text-tertiary)] group-hover/skill:text-[var(--ren-text-tertiary)]'
                  }`}>
                    {skill.emoji || '⚡'} {skill.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={`flex items-end gap-1.5 sm:gap-2 bg-[var(--ren-bg-tertiary)] border rounded-lg px-2.5 sm:px-4 py-2 sm:py-2.5 transition-all ${
          isAdvancedMode
            ? 'border-[var(--accent-color)] shadow-[0_0_20px_rgba(79,70,229,0.25)] ring-2 ring-[var(--accent-color)]/20'
            : isFocused
              ? 'border-[var(--accent-color)] shadow-[0_0_15px_rgba(79,70,229,0.15)]'
              : 'border-[var(--ren-border)]'
        }`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,audio/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)] hover:scale-110 transition-all pb-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Adjuntar archivo"
            title="Adjuntar imagen, PDF, audio o video (max 50MB)"
          >
            <Paperclip size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 bg-transparent outline-none text-sm sm:text-base text-[var(--ren-text-primary)] placeholder:text-[var(--ren-text-tertiary)] resize-none disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
          />
          <button
            type="submit"
            disabled={(!message.trim() && attachedFiles.length === 0) || disabled}
            className="text-[var(--accent-color)] hover:text-[var(--accent-color)] hover:scale-110 disabled:text-[var(--ren-text-tertiary)] disabled:cursor-not-allowed transition-all pb-0.5 flex-shrink-0"
            aria-label="Enviar mensaje"
          >
            <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </form>
      
      {!isTouchDevice && (
        <p className="text-[10px] sm:text-xs text-[var(--ren-text-tertiary)] mt-2 text-center font-mono px-2">
          <span className="hidden sm:inline">Presiona <kbd className="px-1.5 py-0.5 bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] rounded text-[var(--ren-text-tertiary)]">Enter</kbd> para enviar, <kbd className="px-1.5 py-0.5 bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] rounded text-[var(--ren-text-tertiary)]">Shift + Enter</kbd> para nueva linea</span>
          <span className="sm:hidden">Enter: enviar | Shift+Enter: nueva linea</span>
        </p>
      )}
    </div>
  );
}
