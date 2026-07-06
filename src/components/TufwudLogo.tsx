import React from 'react';

interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export const TufwudLogo: React.FC<LogoProps> = ({ className, style }) => {
  return (
    <svg 
      viewBox="0 0 200 200" 
      className={className} 
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gold Metallic Gradient */}
        <linearGradient id="goldGradientReact" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ab8236" />
          <stop offset="30%" stopColor="#fdf2a9" />
          <stop offset="50%" stopColor="#c5a059" />
          <stop offset="70%" stopColor="#fef8cc" />
          <stop offset="100%" stopColor="#8a5c1e" />
        </linearGradient>

        {/* Wood Texture / Brown Gradient for main text */}
        <linearGradient id="woodGradientReact" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a8432a" />
          <stop offset="50%" stopColor="#802e1a" />
          <stop offset="100%" stopColor="#551a0d" />
        </linearGradient>

        {/* Drop shadow filter for professional 3D layering */}
        <filter id="shadowReact" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx={1} dy={2} stdDeviation={1.5} floodColor="#000000" floodOpacity={0.35}/>
        </filter>

        {/* Top Text Path (clockwise along upper arc) */}
        <path id="textArcTopReact" d="M 23,100 A 77,77 0 1,1 177,100" fill="none" />
        {/* Bottom Text Path (counter-clockwise along lower arc to keep text upright) */}
        <path id="textArcBottomReact" d="M 23,100 A 77,77 0 0,0 177,100" fill="none" />
      </defs>

      {/* Base Terracotta Outer Background */}
      <rect width="200" height="200" rx={44} fill="#a14730" />

      {/* Outer Circle */}
      <circle cx={100} cy={100} r={94} fill="#a14730" />

      {/* Gold Ring */}
      <circle cx={100} cy={100} r={76} fill="#ffffff" stroke="url(#goldGradientReact)" strokeWidth={17} filter="url(#shadowReact)" />

      {/* Top Curved Text: CHOOSE INSULATED */}
      <text fontFamily="'Georgia', 'Times New Roman', serif" fontWeight={900} fontSize="9.8" fill="#1b2530" letterSpacing="2.2">
        <textPath href="#textArcTopReact" startOffset="50%" textAnchor="middle">CHOOSE INSULATED</textPath>
      </text>

      {/* Bottom Curved Text: CHOOSE TUFWUD */}
      <text fontFamily="'Georgia', 'Times New Roman', serif" fontWeight={900} fontSize="9.8" fill="#1b2530" letterSpacing="2.2">
        <textPath href="#textArcBottomReact" startOffset="50%" textAnchor="middle">CHOOSE TUFWUD</textPath>
      </text>

      {/* Stylized central 'tufwud' text drawing */}
      <g filter="url(#shadowReact)">
        <text x={100} y={113} fontFamily="'Impact', 'Arial Black', sans-serif" fontSize="37" fontWeight={900} fill="url(#woodGradientReact)" stroke="#3e1007" strokeWidth="0.8" textAnchor="middle" letterSpacing="-0.5">tufwud</text>
        
        {/* Wooden grain horizontal accent lines on text */}
        <line x1={52} y1={102} x2={148} y2={102} stroke="#ffffff" strokeWidth="0.5" strokeOpacity={0.25} strokeDasharray="10 6 3 6" />
        <line x1={55} y1={110} x2={145} y2={110} stroke="#3e1007" strokeWidth="0.4" strokeOpacity={0.3} strokeDasharray="2 4 8 2" />

        {/* Registered TM Symbol ® */}
        <text x={156} y={90} fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="bold" fontSize="10" fill="url(#woodGradientReact)">®</text>
      </g>
    </svg>
  );
};

export const TufwudLogoTransparent: React.FC<LogoProps> = ({ className, style }) => {
  return (
    <svg 
      viewBox="0 0 200 200" 
      className={className} 
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gold Metallic Gradient */}
        <linearGradient id="goldGradientTransReact" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ab8236" />
          <stop offset="30%" stopColor="#fdf2a9" />
          <stop offset="50%" stopColor="#c5a059" />
          <stop offset="70%" stopColor="#fef8cc" />
          <stop offset="100%" stopColor="#8a5c1e" />
        </linearGradient>

        {/* Wood Texture / Brown Gradient for main text */}
        <linearGradient id="woodGradientTransReact" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a8432a" />
          <stop offset="50%" stopColor="#802e1a" />
          <stop offset="100%" stopColor="#551a0d" />
        </linearGradient>

        {/* Drop shadow filter for professional 3D layering */}
        <filter id="shadowTransReact" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx={1} dy={2} stdDeviation="1.5" floodColor="#000000" floodOpacity={0.3}/>
        </filter>

        {/* Top Text Path (clockwise along upper arc) */}
        <path id="textArcTopTransReact" d="M 23,100 A 77,77 0 1,1 177,100" fill="none" />
        {/* Bottom Text Path (counter-clockwise along lower arc to keep text upright) */}
        <path id="textArcBottomTransReact" d="M 23,100 A 77,77 0 0,0 177,100" fill="none" />
      </defs>

      {/* Gold Ring with White Center */}
      <circle cx={100} cy={100} r={76} fill="#ffffff" stroke="url(#goldGradientTransReact)" strokeWidth={17} filter="url(#shadowTransReact)" />

      {/* Top Curved Text: CHOOSE INSULATED */}
      <text fontFamily="'Georgia', 'Times New Roman', serif" fontWeight={900} fontSize="9.8" fill="#1b2530" letterSpacing="2.2">
        <textPath href="#textArcTopTransReact" startOffset="50%" textAnchor="middle">CHOOSE INSULATED</textPath>
      </text>

      {/* Bottom Curved Text: CHOOSE TUFWUD */}
      <text fontFamily="'Georgia', 'Times New Roman', serif" fontWeight={900} fontSize="9.8" fill="#1b2530" letterSpacing="2.2">
        <textPath href="#textArcBottomTransReact" startOffset="50%" textAnchor="middle">CHOOSE TUFWUD</textPath>
      </text>

      {/* Stylized central 'tufwud' text drawing */}
      <g filter="url(#shadowTransReact)">
        <text x={100} y={113} fontFamily="'Impact', 'Arial Black', sans-serif" fontSize="37" fontWeight={900} fill="url(#woodGradientTransReact)" stroke="#3e1007" strokeWidth="0.8" textAnchor="middle" letterSpacing="-0.5">tufwud</text>
        
        {/* Wooden grain horizontal accent lines on text */}
        <line x1={52} y1={102} x2={148} y2={102} stroke="#ffffff" strokeWidth="0.5" strokeOpacity={0.25} strokeDasharray="10 6 3 6" />
        <line x1={55} y1={110} x2={145} y2={110} stroke="#3e1007" strokeWidth="0.4" strokeOpacity={0.3} strokeDasharray="2 4 8 2" />

        {/* Registered TM Symbol ® */}
        <text x={156} y={90} fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="bold" fontSize="10" fill="url(#woodGradientTransReact)">®</text>
      </g>
    </svg>
  );
};
