'use client';

export function ApacheIVIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* arco base */}
      <path d="M4.5 17.5 A8.5 8.5 0 0 1 19.5 17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* zona baja — opacidad baja */}
      <path d="M4.5 17.5 A8.5 8.5 0 0 1 7.8 10.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      {/* zona media */}
      <path d="M7.8 10.2 A8.5 8.5 0 0 1 12 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* zona crítica — opacidad baja derecha */}
      <path d="M12 9 A8.5 8.5 0 0 1 19.5 17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      {/* aguja apuntando a zona de riesgo */}
      <line x1="12" y1="17.5" x2="16.2" y2="12.1" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* pivote */}
      <circle cx="12" cy="17.5" r="1.2" fill={color} />
      {/* ticks de escala */}
      <line x1="5.5" y1="17.5" x2="4" y2="17.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="18.5" y1="17.5" x2="20" y2="17.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="12" y1="10" x2="12" y2="8.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function SofaIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* hexágono exterior */}
      <polygon points="12,3 19.8,7.5 19.8,16.5 12,21 4.2,16.5 4.2,7.5" stroke={color} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* radios centro → vértices */}
      <line x1="12" y1="3" x2="12" y2="12" stroke={color} strokeWidth="1" opacity="0.25" />
      <line x1="19.8" y1="7.5" x2="12" y2="12" stroke={color} strokeWidth="1" opacity="0.25" />
      <line x1="19.8" y1="16.5" x2="12" y2="12" stroke={color} strokeWidth="1" opacity="0.25" />
      <line x1="12" y1="21" x2="12" y2="12" stroke={color} strokeWidth="1" opacity="0.25" />
      <line x1="4.2" y1="16.5" x2="12" y2="12" stroke={color} strokeWidth="1" opacity="0.25" />
      <line x1="4.2" y1="7.5" x2="12" y2="12" stroke={color} strokeWidth="1" opacity="0.25" />
      {/* 6 segmentos rellenos — opacidad = "score" de cada órgano */}
      {/* resp */}
      <path d="M12,12 L12,3 A9,9 0 0,1 19.8,7.5 Z" fill={color} opacity="0.55" />
      {/* coag */}
      <path d="M12,12 L19.8,7.5 A9,9 0 0,1 19.8,16.5 Z" fill={color} opacity="0.35" />
      {/* hepático */}
      <path d="M12,12 L19.8,16.5 A9,9 0 0,1 12,21 Z" fill={color} opacity="0.2" />
      {/* cv */}
      <path d="M12,12 L12,21 A9,9 0 0,1 4.2,16.5 Z" fill={color} opacity="0.45" />
      {/* snc */}
      <path d="M12,12 L4.2,16.5 A9,9 0 0,1 4.2,7.5 Z" fill={color} opacity="0.15" />
      {/* renal */}
      <path d="M12,12 L4.2,7.5 A9,9 0 0,1 12,3 Z" fill={color} opacity="0.3" />
      {/* centro */}
      <circle cx="12" cy="12" r="2" fill="#0e0f11" stroke={color} strokeWidth="1" />
    </svg>
  );
}
