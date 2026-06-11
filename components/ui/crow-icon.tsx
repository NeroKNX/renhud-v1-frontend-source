'use client';

interface CrowIconProps {
  className?: string;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
  '2xl': 'w-16 h-16',
};

export function CrowIcon({ className = '', animate = false, size = 'md' }: CrowIconProps) {
  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center flex-shrink-0 ${className}`}
      style={animate ? { animation: 'renBreathe 4s ease-in-out infinite' } : undefined}
    >
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[var(--accent-color)]">
        <path d="M12 36L8 42H18L14 36" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 34C14 34 16 28 20 26C24 24 28 20 30 16C32 12 36 10 38 10C38 10 36 14 34 18C32 22 30 28 28 30C26 32 22 34 20 34H14Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        <path d="M30 16C30 16 32 12 36 10C38 10 40 10 40 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M34 20L28 24" stroke="var(--accent-secondary)" strokeWidth="1" strokeLinecap="round"/>
        <circle cx="21" cy="18" r="1.5" fill="currentColor" opacity="0.7"/>
      </svg>
    </div>
  );
}
