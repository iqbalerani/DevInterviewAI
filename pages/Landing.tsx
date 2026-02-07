import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic2, Brain, Shield, Award, ArrowRight } from 'lucide-react';
import * as THREE from 'three';
import { useAuthStore } from '../store/authStore';

const Landing: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Three.js particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particles
    const PARTICLE_COUNT = 150;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: { x: number; y: number; z: number; phase: number }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: 0.02 + Math.random() * 0.03,
        z: (Math.random() - 0.5) * 0.01,
        phase: Math.random() * Math.PI * 2
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 1.5,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Line connections
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6); // max possible
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Mouse tracking
    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation
    let animationId: number;
    const CONNECTION_DISTANCE = 15;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // Update particles
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const v = velocities[i];
        posAttr.array[i * 3] += v.x + Math.sin(time + v.phase) * 0.01;
        posAttr.array[i * 3 + 1] += v.y;
        posAttr.array[i * 3 + 2] += v.z;

        // Wrap
        if (posAttr.array[i * 3 + 1] > 50) posAttr.array[i * 3 + 1] = -50;
        if (posAttr.array[i * 3] > 50) posAttr.array[i * 3] = -50;
        if (posAttr.array[i * 3] < -50) posAttr.array[i * 3] = 50;
      }
      posAttr.needsUpdate = true;

      // Update line connections
      let lineIdx = 0;
      const lp = lineGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = posAttr.array[i * 3] - posAttr.array[j * 3];
          const dy = posAttr.array[i * 3 + 1] - posAttr.array[j * 3 + 1];
          const dz = posAttr.array[i * 3 + 2] - posAttr.array[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < CONNECTION_DISTANCE && lineIdx < PARTICLE_COUNT * 50) {
            lp.array[lineIdx * 6] = posAttr.array[i * 3];
            lp.array[lineIdx * 6 + 1] = posAttr.array[i * 3 + 1];
            lp.array[lineIdx * 6 + 2] = posAttr.array[i * 3 + 2];
            lp.array[lineIdx * 6 + 3] = posAttr.array[j * 3];
            lp.array[lineIdx * 6 + 4] = posAttr.array[j * 3 + 1];
            lp.array[lineIdx * 6 + 5] = posAttr.array[j * 3 + 2];
            lineIdx++;
          }
        }
      }
      lineGeometry.setDrawRange(0, lineIdx * 2);
      lp.needsUpdate = true;

      // Mouse parallax
      camera.position.x += (mouse.x * 3 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 3 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">DevProof</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-5 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-4xl mx-auto text-center px-8 pt-24 pb-20">
          <div className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
            AI-Powered Interview Preparation
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
            Prove Your Skills{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              with AI Interviews
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Practice with a realistic AI interviewer that adapts to your experience.
            Get instant evaluation, track your progress, and earn verifiable credentials.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3"
            >
              Start Practicing Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-2xl font-bold text-lg transition-all text-slate-300 hover:text-white"
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-8 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Mic2,
                title: 'Live AI Interviews',
                description: 'Real-time voice conversations with an adaptive AI interviewer that matches real interview dynamics.',
                color: 'blue'
              },
              {
                icon: Brain,
                title: 'Smart Evaluation',
                description: 'Get instant, detailed feedback on technical knowledge, coding skills, communication, and problem-solving.',
                color: 'purple'
              },
              {
                icon: Shield,
                title: 'Verifiable Credentials',
                description: 'Earn certificates that prove your skills with tamper-proof verification for employers.',
                color: 'emerald'
              }
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 hover:border-slate-700 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-slate-800/50">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} DevProof. Built with AI.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
