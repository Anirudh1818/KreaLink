"use client";

import React from "react";

interface KreaLinkLogoProps {
  size?: number; // width/height in px
  className?: string;
  glow?: boolean;
  animated?: boolean;
}

export function KreaLinkLogo({
  size = 40,
  className = "",
  glow = true,
  animated = false,
}: KreaLinkLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Ambient Pulsing Glow Halo */}
      {glow && (
        <div
          className={`pointer-events-none absolute inset-[-20%] rounded-full bg-gradient-to-tr from-indigo-500/30 via-cyan-400/25 to-emerald-400/20 blur-xl ${
            animated ? "animate-pulse" : "opacity-80"
          }`}
        />
      )}

      {/* Orbiting Tech Filament Ring (for animated hero core) */}
      {animated && (
        <svg
          className="pointer-events-none absolute inset-[-30%] h-[160%] w-[160%] animate-[spin_12s_linear_infinite]"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#orbitGrad)"
            strokeWidth="1"
            strokeDasharray="4 8 16 6"
            strokeOpacity="0.4"
          />
          <defs>
            <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Iconic Geometric K SVG Glyph */}
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Vertical Stem Linear Gradient */}
          <linearGradient id="stemGrad" x1="10" y1="6" x2="18" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Upper Diagonal Arm Gradient (Cobalt / Cyan Laser) */}
          <linearGradient id="upperArmGrad" x1="20" y1="24" x2="38" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="60%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>

          {/* Lower Diagonal Arm Gradient (Quantum Emerald / Cyan) */}
          <linearGradient id="lowerArmGrad" x1="22" y1="22" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Inner Prismatic Facet Gradient */}
          <linearGradient id="facetGrad" x1="16" y1="18" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
          </linearGradient>

          {/* High-Specular Node Flare */}
          <radialGradient id="nodeFlare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Outer Hex-Facet Frame Backdrop */}
        <path
          d="M24 3L41 12.8V35.2L24 45L7 35.2V12.8L24 3Z"
          fill="#080a11"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.2"
        />

        {/* Subtle Hexagon Glass Shading */}
        <path
          d="M24 3.5L40.5 13V35L24 44.5L7.5 35V13L24 3.5Z"
          fill="url(#facetGrad)"
        />

        {/* 1. Left Vertical Pillar of the 'K' (Beveled Monolith) */}
        <path
          d="M13 11C13 9.89543 13.8954 9 15 9H17.5C18.6046 9 19.5 9.89543 19.5 11V37C19.5 38.1046 18.6046 39 17.5 39H15C13.8954 39 13 38.1046 13 37V11Z"
          fill="url(#stemGrad)"
        />

        {/* Specular Edge on Stem */}
        <path
          d="M14 11V37"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* 2. Upper Dynamic Diagonal Arm (High-Velocity Angle) */}
        <path
          d="M20 25.5L31.8 11.2C32.4 10.4 33.5 10 34.5 10H36.2C37.5 10 38.2 11.5 37.3 12.5L25.8 26.2L20 25.5Z"
          fill="url(#upperArmGrad)"
        />

        {/* Upper Arm Specular Light Rib */}
        <path
          d="M36 11.5L25 25"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* 3. Lower Dynamic Diagonal Arm (Power Wedge with Apex) */}
        <path
          d="M22.5 23.5L34.2 36.8C35.1 37.8 34.4 39 33 39H30.5C29.6 39 28.7 38.5 28.1 37.8L18.8 27.2L22.5 23.5Z"
          fill="url(#lowerArmGrad)"
        />

        {/* 4. Prismatic Nexus Core Diamond (Intersection Point) */}
        <polygon
          points="20.5,21.5 26,24.5 20.5,27.5 17.5,24.5"
          fill="#ffffff"
          opacity="0.9"
        />

        {/* 5. Quantum Flare Sparkle at Nexus Center */}
        <circle cx="21" cy="24.5" r="3" fill="url(#nodeFlare)" />
        <circle cx="21" cy="24.5" r="1.2" fill="#ffffff" />
      </svg>
    </div>
  );
}
