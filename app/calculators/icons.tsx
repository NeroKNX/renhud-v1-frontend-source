'use client';

export function ApacheIVIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* pantalla */}
      <rect x="2" y="3" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      {/* pie */}
      <line x1="12" y1="17" x2="12" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="20" x2="15" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* onda ECG */}
      <polyline
        points="3.5,12 5.5,12 6.5,8 7.5,14 8.5,10 9.5,13 10.5,6 11.5,15 12.5,12 14.5,12"
        stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* valor numérico sugerido — derecha */}
      <line x1="16" y1="7"   x2="21" y2="7"  stroke={color} strokeWidth="1"   strokeLinecap="round" opacity="0.5" />
      <line x1="16" y1="9.5" x2="21" y2="9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <line x1="16" y1="12"  x2="19" y2="12" stroke={color} strokeWidth="1"   strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function SofaIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* patas */}
      <line x1="6" y1="19" x2="5.5" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="19" x2="18.5" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      {/* asiento */}
      <rect x="4" y="14" width="16" height="5" rx="1.5" stroke={color} strokeWidth="1.5"/>
      {/* respaldo */}
      <path d="M6 14 L6 9 Q6 8 7 8 L17 8 Q18 8 18 9 L18 14" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      {/* apoyabrazo izquierdo */}
      <path d="M4 19 L2.5 19 Q2 19 2 18.5 L2 11 Q2 10 3 10 L6 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* apoyabrazo derecho */}
      <path d="M20 19 L21.5 19 Q22 19 22 18.5 L22 11 Q22 10 21 10 L18 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* divisor de cojines */}
      <line x1="12" y1="14" x2="12" y2="19" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.35"/>
    </svg>
  );
}
