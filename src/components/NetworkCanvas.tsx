"use client";

import { useEffect, useRef } from "react";

interface Node3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  label?: string;
  category: "core" | "brand" | "tool" | "creator" | "format";
  color: string;
  baseX: number;
  baseY: number;
  baseZ: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitElevation: number;
}

const LABELED_NODES: Array<{ label: string; category: Node3D["category"]; color: string; radius: number }> = [
  { label: "Creative Brief", category: "brand", color: "#f59e0b", radius: 5 },
  { label: "Runway Gen-3", category: "tool", color: "#0ea5e9", radius: 4 },
  { label: "Midjourney v6.1", category: "tool", color: "#38bdf8", radius: 4 },
  { label: "Flux.1 Dev", category: "tool", color: "#818cf8", radius: 3.5 },
  { label: "Paul Trillo 98%", category: "creator", color: "#10b981", radius: 5.5 },
  { label: "Julie Wieland 96%", category: "creator", color: "#34d399", radius: 4.5 },
  { label: "Nicolas Neubert 97%", category: "creator", color: "#6ee7b7", radius: 4.5 },
  { label: "9:16 Vertical", category: "format", color: "#cbd5e1", radius: 3.5 },
  { label: "4K Cinema", category: "format", color: "#94a3b8", radius: 3 },
  { label: "Commercial Clearance", category: "brand", color: "#34d399", radius: 4 },
];

export function NetworkCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse coordinates for 3D tilt
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      mouseX = x / (rect.width / 2);
      mouseY = y / (rect.height / 2);
      targetRotY = mouseX * 0.45;
      targetRotX = -mouseY * 0.35;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Initialize 3D nodes in a balanced spherical cluster
    const nodes: Node3D[] = [];
    const totalNodes = 36;

    for (let i = 0; i < totalNodes; i++) {
      const labeled = LABELED_NODES[i] || null;
      const orbitRadius = 140 + Math.random() * 260;
      const orbitSpeed = (0.002 + Math.random() * 0.004) * (Math.random() > 0.5 ? 1 : -1);
      const orbitAngle = (i / totalNodes) * Math.PI * 2 + Math.random() * 0.5;
      const orbitElevation = (Math.random() - 0.5) * Math.PI * 0.8;

      const x = orbitRadius * Math.cos(orbitElevation) * Math.cos(orbitAngle);
      const y = orbitRadius * Math.sin(orbitElevation);
      const z = orbitRadius * Math.cos(orbitElevation) * Math.sin(orbitAngle);

      nodes.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
        orbitRadius,
        orbitSpeed,
        orbitAngle,
        orbitElevation,
        radius: labeled ? labeled.radius : 2 + Math.random() * 2,
        label: labeled?.label,
        category: labeled?.category || "tool",
        color: labeled?.color || (Math.random() > 0.5 ? "rgba(255,255,255,0.4)" : "rgba(245,158,11,0.5)"),
      });
    }

    // Core central node
    nodes.push({
      x: 0,
      y: 0,
      z: 0,
      baseX: 0,
      baseY: 0,
      baseZ: 0,
      orbitRadius: 0,
      orbitSpeed: 0,
      orbitAngle: 0,
      orbitElevation: 0,
      radius: 8,
      label: "KreaLink Core",
      category: "core",
      color: "#f59e0b",
    });

    const fov = 400; // 3D Camera distance

    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    let tick = 0;

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      tick += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Smooth camera rotation inertia
      currentRotX += (targetRotX - currentRotX) * 0.05;
      currentRotY += (targetRotY - currentRotY) * 0.05;

      const cosY = Math.cos(currentRotY + tick * 0.15);
      const sinY = Math.sin(currentRotY + tick * 0.15);
      const cosX = Math.cos(currentRotX);
      const sinX = Math.sin(currentRotX);

      const centerX = width / 2;
      const centerY = height / 2;

      // Project nodes to 2D
      const projected = nodes.map((n) => {
        // Orbit animation
        n.orbitAngle += n.orbitSpeed;
        const ox = n.orbitRadius * Math.cos(n.orbitElevation) * Math.cos(n.orbitAngle);
        const oy = n.orbitRadius * Math.sin(n.orbitElevation);
        const oz = n.orbitRadius * Math.cos(n.orbitElevation) * Math.sin(n.orbitAngle);

        // 3D Matrix Rotation (Y axis then X axis)
        const rotY_x = ox * cosY - oz * sinY;
        const rotY_z = ox * sinY + oz * cosY;

        const rotX_y = oy * cosX - rotY_z * sinX;
        const rotX_z = oy * sinX + rotY_z * cosX;

        // Perspective projection
        const scale = fov / (fov + rotX_z + 300);
        const projX = centerX + rotY_x * scale;
        const projY = centerY + rotX_y * scale;

        return {
          node: n,
          px: projX,
          py: projY,
          scale,
          z: rotX_z,
        };
      });

      // Sort by depth (painters algorithm)
      projected.sort((a, b) => b.z - a.z);

      // Draw connecting lines between nearby nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i];
          const b = projected[j];

          const dx = a.px - b.px;
          const dy = a.py - b.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.22 * Math.min(a.scale, b.scale);
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.px, a.py);
            ctx.lineTo(b.px, b.py);
            ctx.stroke();
          }
        }
      }

      // Draw nodes and label cards
      for (const p of projected) {
        const { node, px, py, scale } = p;
        const drawRadius = Math.max(1.5, node.radius * scale);

        // Ambient glow
        if (node.category === "core" || node.label) {
          ctx.beginPath();
          ctx.arc(px, py, drawRadius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = node.color === "#f59e0b" ? "rgba(245, 158, 11, 0.12)" : "rgba(14, 165, 233, 0.12)";
          ctx.fill();
        }

        // Inner solid dot
        ctx.beginPath();
        ctx.arc(px, py, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // High-end pill badge for labeled nodes
        if (node.label && scale > 0.65) {
          ctx.font = `600 ${Math.round(10 * scale)}px ui-sans-serif, system-ui, sans-serif`;
          const textWidth = ctx.measureText(node.label).width;
          const padX = 6 * scale;
          const padY = 3 * scale;
          const badgeX = px + drawRadius + 4;
          const badgeY = py - (8 * scale);

          // Card pill background
          ctx.fillStyle = "rgba(15, 18, 25, 0.85)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY - 10 * scale, textWidth + padX * 2, 14 * scale + padY, 4 * scale);
          ctx.fill();
          ctx.stroke();

          // Pill text
          ctx.fillStyle = node.color;
          ctx.fillText(node.label, badgeX + padX, badgeY);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full opacity-70" />
    </div>
  );
}
