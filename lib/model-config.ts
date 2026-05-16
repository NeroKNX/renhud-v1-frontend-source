export type ModelType = 'flash' | 'deep';

export const modelColors: Record<ModelType, string> = {
  flash: 'text-emerald-400',
  deep: 'text-[#4f46e5]',
};

export const modelLabels: Record<ModelType, string> = {
  flash: 'Flash',
  deep: 'Deep',
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  } catch {
    return false;
  }
};
