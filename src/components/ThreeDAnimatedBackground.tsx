import React, { useEffect, useRef } from 'react';

interface ThreeDAnimatedBackgroundProps {
  darkMode: boolean;
}

export default function ThreeDAnimatedBackground({ darkMode }: ThreeDAnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 3D particle settings
    const particleCount = 70;
    const focalLength = 380; // Focal length for projection
    
    interface Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      radius: number;
    }

    const particles: Particle[] = [];

    // Initialize particles in 3D box
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 900,
        y: (Math.random() - 0.5) * 900,
        z: Math.random() * 800 - 400,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        vz: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 1.5 + 1.2,
      });
    }

    // Handle resizing
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse movement interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.04;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.04;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Camera rotations from mouse
      const angleY = mouseX * 0.003;
      const angleX = mouseY * 0.003;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Map and rotate particles
      const projected: { sx: number; sy: number; sz: number; p: Particle }[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move particles inside space bounds
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Bounce/Wrap boundaries
        if (p.x < -450 || p.x > 450) p.vx = -p.vx;
        if (p.y < -450 || p.y > 450) p.vy = -p.vy;
        if (p.z < -400 || p.z > 400) p.vz = -p.vz;

        // Rotate Y Axis (yaw)
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;

        // Rotate X Axis (pitch)
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        // Projection
        const distance = z2 + focalLength;

        // Don't render particles behind camera
        if (distance > 20) {
          const perspective = focalLength / distance;
          const sx = width / 2 + x1 * perspective;
          const sy = height / 2 + y2 * perspective;

          projected.push({ sx, sy, sz: z2, p });
        }
      }

      // Draw lines between close 3D coordinates
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];

          // Distance in 3D coordinates
          const dx = p1.p.x - p2.p.x;
          const dy = p1.p.y - p2.p.y;
          const dz = p1.p.z - p2.p.z;
          const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist3d < 160) {
            // Fade lines as distance gets larger
            const alpha = (1 - dist3d / 160) * (darkMode ? 0.22 : 0.08);
            ctx.strokeStyle = darkMode 
              ? `rgba(99, 102, 241, ${alpha})` 
              : `rgba(99, 102, 241, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
            ctx.stroke();
          }
        }
      }

      // Draw projected particle dots
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const perspective = focalLength / (p.p.z + focalLength);
        const radius = p.p.radius * perspective;

        // Calculate visual node alpha based on depth
        const depthAlpha = (p.p.z + 400) / 800; // 0 to 1
        const alpha = (0.2 + depthAlpha * 0.8) * (darkMode ? 0.65 : 0.25);

        ctx.fillStyle = darkMode 
          ? `rgba(59, 130, 246, ${alpha})` 
          : `rgba(59, 130, 246, ${alpha})`;

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.5, radius), 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        if (darkMode && p.p.z > 200) {
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha * 0.2})`;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, radius * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none select-none transition-opacity duration-500 ease-in-out"
      style={{ zIndex: -5, opacity: 1 }}
    />
  );
}
