// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useResponsive } from '@hooks/useResponsive';
import { useAuthStore } from '@stores/authStore';
import {
  Menu, X, Check, Wrench, BarChart3,
  FileText, Layers, MapPin,
  Phone, Mail, ArrowRight, FlaskConical, Loader2,
  BookOpen, GraduationCap, Package, Camera, Smartphone, Bell,
  DollarSign, CheckCircle, AlertTriangle, Clock,
  TrendingUp, Users, ShieldCheck, Zap, Star,
  ChevronRight, PlayCircle, Palette, Droplets,
  ClipboardList, Receipt, UserCog, MailCheck,
  CalendarCheck, BarChart2, Eye,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   Animation variants
   ═══════════════════════════════════════════════════════════════════════════ */
const fadeInUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const fadeInLeft = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const fadeInRight = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const staggerContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const scaleIn = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Shared "Try Live Demo" button
   ═══════════════════════════════════════════════════════════════════════════ */
function TryDemoButton({ size = 'md', fullWidthMobile = false, variant = 'dark' }) {
  const navigate       = useNavigate();
  const loginAsSandbox = useAuthStore((s) => s.loginAsSandbox);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      await loginAsSandbox();
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message || 'Could not start demo. Please try again.');
      setLoading(false);
    }
  };

  const padClass = size === 'lg' ? 'px-7 py-3.5 text-base' : size === 'sm' ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm';

  const btnClass = variant === 'outline-dark'
    ? 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
    : variant === 'light'
    ? 'border border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 bg-white'
    : 'border border-gray-600 text-white hover:border-white hover:bg-white/5';

  return (
    <div className={`flex flex-col items-center gap-1.5 ${fullWidthMobile ? 'w-full' : ''}`}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`
          inline-flex items-center justify-center gap-2 font-bold rounded-full
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all duration-200
          ${btnClass} ${padClass}
          ${fullWidthMobile ? 'w-full' : ''}
        `}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : <FlaskConical size={14} />
        }
        {loading ? 'Setting up demo…' : 'Try Live Demo'}
      </button>

      {error
        ? <p className="text-red-500 text-xs text-center max-w-xs">{error}</p>
        : <p className={`text-xs ${variant === 'light' || variant === 'outline-dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No signup · Pre-filled data · Expires in 24h
          </p>
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Animated counter hook
   ═══════════════════════════════════════════════════════════════════════════ */
function useCountUp(end, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration]);

  return { count, ref };
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════════════════════ */
const Header = () => {
  const [isOpen,    setIsOpen]    = useState(false);
  const [scrolled,  setScrolled]  = useState(false);
  const [activeId,  setActiveId]  = useState('hero');
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home',     href: '#hero',     id: 'hero'     },
    { name: 'Features', href: '#features', id: 'features' },
    { name: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
    { name: 'Pricing',  href: '#pricing',  id: 'pricing'  },
    { name: 'Support',  href: '#support',  id: 'support'  },
    { name: 'Contact',  href: '#contact',  id: 'contact'  },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sectionIds = navLinks.map((l) => l.id);
    const observers = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id); },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-gray-100'
        : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2.5 group">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            scrolled ? 'bg-gray-900' : 'bg-white'
          }`}>
            <span className={`font-extrabold text-sm ${scrolled ? 'text-white' : 'text-gray-900'}`}>G</span>
          </div>
          <span className={`font-bold text-lg tracking-tight hidden sm:inline transition-colors ${
            scrolled ? 'text-gray-900' : 'text-white'
          }`}>
            Graymanager
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = activeId === link.id;
            return (
              <a key={link.name} href={link.href}
                 className={`relative px-3 py-2 rounded-full text-[13px] font-medium transition-all ${
                   scrolled
                     ? isActive ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                     : isActive ? 'text-white bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'
                 }`}>
                {link.name}
              </a>
            );
          })}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <button onClick={() => navigate('/login')}
                  className={`text-sm font-medium transition-colors ${
                    scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'
                  }`}>
            Log in
          </button>
          <button onClick={() => navigate('/signup')}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    scrolled
                      ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                      : 'bg-white text-gray-900 hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                  }`}>
            Start Free
          </button>
        </div>

        {/* Mobile hamburger */}
        <button className="lg:hidden p-2 rounded-lg" onClick={() => setIsOpen(!isOpen)}>
          {isOpen
            ? <X size={22} className={scrolled ? 'text-gray-900' : 'text-white'} />
            : <Menu size={22} className={scrolled ? 'text-gray-900' : 'text-white'} />
          }
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-b border-gray-100 shadow-lg overflow-hidden"
          >
            <div className="flex flex-col px-4 py-5 space-y-1">
              {navLinks.map((link) => {
                const isActive = activeId === link.id;
                return (
                  <a key={link.name} href={link.href} onClick={() => setIsOpen(false)}
                     className={`px-4 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                       isActive ? 'text-gray-900 bg-gray-50' : 'text-gray-500'
                     }`}>
                    {link.name}
                  </a>
                );
              })}
              <div className="flex flex-col gap-2.5 pt-4 border-t border-gray-100 mt-2">
                <button onClick={() => navigate('/login')}
                        className="bg-gray-50 text-gray-900 py-3 rounded-xl font-semibold w-full text-sm">
                  Log in
                </button>
                <button onClick={() => navigate('/signup')}
                        className="bg-gray-900 text-white py-3 rounded-xl font-bold w-full text-sm">
                  Start Free
                </button>
                <div className="pt-1">
                  <TryDemoButton size="md" fullWidthMobile variant="outline-dark" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   HERO  — Inspired by Autoflow's benefit checklist + product screenshot
   ═══════════════════════════════════════════════════════════════════════════ */
const Hero = () => {
  const navigate = useNavigate();

  const benefits = [
    { icon: <Package size={16} />,    text: 'Track every tin, thinner & primer in real time' },
    { icon: <ClipboardList size={16} />, text: 'Digital job cards from panel prep to final delivery' },
    { icon: <Camera size={16} />,     text: 'Sprayer portfolios that build credibility over time' },
    { icon: <MailCheck size={16} />,  text: 'Auto-notify customers at every job stage' },
  ];

  return (
    <section id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-gray-950">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-emerald-600/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-gray-700/20 via-transparent to-transparent rounded-full blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-16 sm:pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            {/* <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide">
                Built for Africa's Auto Paint Industry
              </span>
            </motion.div> */}

            <motion.h1 variants={fadeInUp}
              className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Run Your Paint Shop.<br />
              <span className="text-gray-400">Track Stock. Showcase&nbsp;Every&nbsp;Job.</span>
            </motion.h1>

            <motion.p variants={fadeInUp}
              className="text-gray-400 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
              The complete management platform for auto paint professionals, sprayers, paint material suppliers,
              and mechanic shops. Works on any device.
            </motion.p>

            {/* Benefit checklist — Autoflow style */}
            <motion.div variants={fadeInUp} className="space-y-3 mb-10">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    {b.icon}
                  </span>
                  <span className="text-gray-300 text-sm">{b.text}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA row */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 items-start">
              <button
                onClick={() => navigate('/signup')}
                className="bg-white text-gray-900 px-7 py-3.5 rounded-full font-bold text-sm hover:bg-gray-100 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-2"
              >
                Start for free <ArrowRight size={16} />
              </button>
              <TryDemoButton size="lg" />
            </motion.div>
          </motion.div>

          {/* Right — Product screenshot */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            {/* Browser frame */}
            <div className="rounded-2xl bg-gray-900/80 border border-gray-700/50 shadow-2xl shadow-black/40 overflow-hidden backdrop-blur-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/60">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-gray-800 rounded-md px-4 py-1 text-gray-500 text-[11px] font-mono">
                    app.graymanager.com
                  </div>
                </div>
              </div>
              <div className="p-1 sm:p-2">
                <img
                  src="/images/hero-banner.png"
                  alt="Graymanager Dashboard Preview"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
            {/* Glow */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none z-20" />
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   STATS BAR — Inspired by AutoLeap's metrics section
   ═══════════════════════════════════════════════════════════════════════════ */
const StatsBar = () => {
  const stats = [
    { end: 500,  suffix: '+',  label: 'Jobs Tracked',       icon: <ClipboardList size={20} /> },
    { end: 98,   suffix: '%',  label: 'Uptime Reliability',  icon: <ShieldCheck size={20} /> },
    { end: 30,   suffix: 'sec', label: 'Avg Receipt Time',   icon: <Zap size={20} /> },
    { end: 4,    suffix: '.8★', label: 'User Satisfaction',  icon: <Star size={20} /> },
  ];

  return (
    <section className="relative z-30 -mt-12 sm:-mt-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 p-6 sm:p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((s, i) => {
              const { count, ref } = useCountUp(s.end);
              return (
                <div key={i} ref={ref} className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-600">
                    {s.icon}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {count}{s.suffix}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">{s.label}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURES  — Tabbed showcase inspired by AutoLeap
   ═══════════════════════════════════════════════════════════════════════════ */
const Features = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      label: 'Stock & Sales',
      icon: <Package size={18} />,
      title: 'Paint Stock Control & Sales',
      desc: 'Track every tin, thinner, primer, hardener, and accessory down to the last unit. Record sales instantly and get low-stock alerts before you run out.',
      points: [
        'Real-time inventory with automatic deduction on sale',
        'Low-stock alerts and reorder suggestions',
        'Sales history with daily, weekly, and monthly breakdowns',
      ],
    },
    {
      label: 'Job Cards',
      icon: <ClipboardList size={18} />,
      title: 'Digital Job Cards & Tracking',
      desc: 'Create professional digital job cards for every spray and refinishing job. Track progress from panel prep to final delivery.',
      points: [
        'Full job lifecycle from intake to completion',
        'Attach photos, notes, and material lists to every job',
        'Automatic customer notifications at each stage',
      ],
    },
    {
      label: 'Portfolios',
      icon: <Camera size={18} />,
      title: 'Sprayer Portfolio & Booth Booking',
      desc: 'Every sprayer logs and showcases their completed jobs, building credibility and tracking performance. Schedule spray booth slots to eliminate downtime.',
      points: [
        'Photo gallery of completed jobs per sprayer',
        'Performance tracking and job history',
        'Spray booth calendar to prevent clashes',
      ],
    },
    {
      label: 'Finance',
      icon: <Receipt size={18} />,
      title: 'Receipts, Invoices & Expenses',
      desc: 'Generate branded receipts and professional invoices in seconds. Track every expense and get clear financial reports.',
      points: [
        'Custom-branded receipts sent via WhatsApp or email',
        'Professional invoices with payment tracking',
        'Expense tracking with detailed categorization',
      ],
    },
    {
      label: 'Team',
      icon: <UserCog size={18} />,
      title: 'Team & Role Access Control',
      desc: 'Set custom permissions for sprayers, managers, cashiers, and sales staff. Everyone sees exactly what they need.',
      points: [
        'Role-based access for every team member',
        'Activity logs and accountability tracking',
        'Multi-branch support for growing businesses',
      ],
    },
  ];

  const active = tabs[activeTab];

  return (
    <section id="features" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                    className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="inline-block text-xs font-bold text-emerald-600 tracking-widest uppercase mb-3">
            Powerful Features
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[2.5rem] font-extrabold text-gray-900 leading-tight tracking-tight mb-4">
            Everything You Need to Run<br className="hidden sm:block" /> a Professional Auto Paint Business
          </h2>
          <p className="text-gray-500 text-base sm:text-lg">
            From stock tracking to sprayer portfolios to team management — all in one platform.
          </p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex justify-start sm:justify-center mb-10 sm:mb-14 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 min-w-max">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === i
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 gap-10 md:gap-16 items-center"
          >
            {/* Text side */}
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4 leading-tight">
                {active.title}
              </h3>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                {active.desc}
              </p>
              <ul className="space-y-4">
                {active.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={13} className="text-emerald-600" />
                    </span>
                    <span className="text-gray-700 text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <button
                  onClick={() => window.location.href = '#pricing'}
                  className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-emerald-600 transition-colors group"
                >
                  Get started with this feature
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Visual side — Feature card mockup */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 sm:p-8 min-h-[320px] flex flex-col justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center mb-6 text-white shadow-lg">
                {active.icon && React.cloneElement(tabs[activeTab].icon, { size: 24 })}
              </div>
              <div className="space-y-3">
                {active.points.map((point, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Check size={14} className="text-emerald-600" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{point}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS  — Customer updates section (kept and improved)
   ═══════════════════════════════════════════════════════════════════════════ */
const Notifications = () => {
  const alerts = [
    { Icon: CheckCircle, label: 'Job Started',  sub: 'Toyota Camry — work has begun',      time: 'Just now',   accent: 'bg-emerald-500' },
    { Icon: Wrench,      label: 'In Progress',  sub: 'Honda Accord — bodywork underway',   time: '10 min ago', accent: 'bg-blue-500'    },
    { Icon: CheckCircle, label: 'Job Ready',    sub: 'Kia Picanto — ready for collection', time: '1 hr ago',   accent: 'bg-emerald-500' },
    { Icon: DollarSign,  label: 'Invoice Sent', sub: 'Client: Kwame Asante — GH₵1,200',   time: '2 hrs ago',  accent: 'bg-amber-500'   },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Text side */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInLeft}>
            <span className="inline-block text-xs font-bold text-emerald-600 tracking-widest uppercase mb-3">
              Customer Notifications
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              Keep Your Customers<br />
              <span className="text-gray-400">In the Loop. Automatically.</span>
            </h2>
            <p className="text-gray-500 text-base sm:text-lg mb-8 leading-relaxed">
              Automatically email your customers at every stage of their job, from when work starts
              to when their vehicle is ready for collection. No manual follow-up needed.
            </p>
            <ul className="space-y-3">
              {[
                'Email sent when a job is created',
                'Notification when work begins',
                'Alert when the job is ready for pickup',
                'Invoice emailed on job completion',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-white" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Notification feed mockup */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInRight}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-5 sm:p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-white text-sm font-bold">Customer Updates</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="space-y-2.5">
              {alerts.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 bg-white/5 border border-white/[0.06] rounded-xl px-4 py-3 hover:bg-white/[0.08] transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${a.accent}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold">{a.label}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5 truncate">{a.sub}</p>
                  </div>
                  <span className="text-gray-600 text-[10px] whitespace-nowrap mt-0.5">{a.time}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-gray-600 text-[10px] text-center pt-3 mt-2 border-t border-gray-800">
              Delivered automatically via email
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS  — 3 steps, inspired by both Autoflow & AutoLeap
   ═══════════════════════════════════════════════════════════════════════════ */
const HowItWorks = () => {
  const steps = [
    {
      num: '01',
      title: 'Sign Up & Set Up',
      desc: 'Create your account in under 2 minutes. Add your business details, team members, and paint inventory.',
      icon: <Zap size={24} />,
    },
    {
      num: '02',
      title: 'Your Team Gets Trained',
      desc: 'We walk your team through every feature — stock tracking, job cards, invoicing — so everyone is confident from day one.',
      icon: <GraduationCap size={24} />,
    },
    {
      num: '03',
      title: 'Go Live & Grow',
      desc: 'Start managing your shop like a pro. Track jobs, generate receipts, and grow your business with real data.',
      icon: <TrendingUp size={24} />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                    className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <span className="inline-block text-xs font-bold text-emerald-400 tracking-widest uppercase mb-3">
            Get Started in 3 Steps
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[2.5rem] font-extrabold text-white leading-tight tracking-tight mb-4">
            Go Live in Less Than 24 Hours
          </h2>
          <p className="text-gray-400 text-base sm:text-lg">
            Whether you're switching from pen and paper or upgrading from spreadsheets, getting started is quick and seamless.
          </p>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    className="grid sm:grid-cols-3 gap-6 sm:gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden sm:block absolute top-16 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />

          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeInUp} className="relative text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 text-emerald-400 relative z-10">
                {step.icon}
              </div>
              <span className="text-[11px] font-bold text-emerald-400 tracking-widest uppercase mb-2 block">
                Step {step.num}
              </span>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PRICING
   ═══════════════════════════════════════════════════════════════════════════ */
const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Starter',
      price: 'GH₵35',
      desc: 'Perfect for solo sprayers or small paint shops just getting started.',
      features: ['Single branch access', 'Basic paint stock tracking', 'Up to 3 users', 'Job cards & receipts'],
      style: 'light',
    },
    {
      name: 'Manager',
      price: 'GH₵90',
      desc: 'For growing paint businesses that need more control and visibility.',
      features: ['Multi-branch access', 'Full inventory & materials', 'Up to 10 users', 'Sprayer portfolio', 'Analytics & reports'],
      badge: 'Most Popular',
      style: 'dark',
    },
    {
      name: 'Pro Manager',
      price: 'GH₵150',
      desc: 'Full power for large operations, teams, and serious business growth.',
      features: ['Unlimited branch access', 'Advanced analytics', 'Custom branding', 'Unlimited users', 'Priority support & training'],
      style: 'premium',
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                    className="text-center mb-14 sm:mb-16">
          <span className="inline-block text-xs font-bold text-emerald-600 tracking-widest uppercase mb-3">
            Simple Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[2.5rem] font-extrabold text-gray-900 tracking-tight mb-4">
            Simple, Honest Pricing
          </h2>
          <p className="text-gray-500 text-base sm:text-lg">No contracts, no hidden fees. Cancel anytime.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const isDark    = plan.style === 'dark';
            const isPremium = plan.style === 'premium';
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className={`relative p-7 sm:p-8 rounded-2xl flex flex-col transition-shadow ${
                  isDark    ? 'bg-gray-900 text-white shadow-2xl shadow-gray-900/30 ring-1 ring-gray-800' :
                  isPremium ? 'bg-white border-2 border-gray-900 text-gray-900 shadow-lg' :
                              'bg-white border border-gray-200 text-gray-900 shadow-sm hover:shadow-lg'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <h3 className="text-xl sm:text-2xl font-bold mb-2">{plan.name}</h3>
                <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className={`text-sm ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/ month</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Check size={15} className={`flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} /> {f}
                    </li>
                  ))}
                </ul>

                <button onClick={() => navigate('/signup')}
                  className={`px-6 py-3 rounded-xl font-bold text-sm w-full transition-all ${
                    isDark
                      ? 'bg-white text-gray-900 hover:bg-gray-100'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Demo CTA under pricing */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm mb-4">Not sure which plan? Explore the full product first — no signup needed.</p>
          <TryDemoButton size="md" variant="outline-dark" />
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SUPPORT
   ═══════════════════════════════════════════════════════════════════════════ */
const Support = () => {
  const items = [
    {
      icon: <Phone size={24} />,
      title: 'Direct Contact',
      desc: 'Reach our team via phone, WhatsApp, or email whenever you need help with your account or daily operations.',
    },
    {
      icon: <BookOpen size={24} />,
      title: 'Guides & Docs',
      desc: 'Clear, step-by-step documentation for every feature — stock setup, job cards, invoicing, portfolios, and more.',
    },
    {
      icon: <GraduationCap size={24} />,
      title: 'Product Training',
      desc: 'Hands-on onboarding and training sessions for you and your team at no extra cost.',
    },
  ];

  return (
    <section id="support" className="py-20 sm:py-28 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                    className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-bold text-emerald-600 tracking-widest uppercase mb-3">
            Always Here to Help
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            We're With You Every Step
          </h2>
          <p className="text-gray-500 text-base sm:text-lg">
            From setup to daily operations, our support team has you covered.
          </p>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {items.map((item, i) => (
            <motion.div key={i} variants={fadeInUp}
                        className="bg-white p-7 sm:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow group">
              <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-6 text-white group-hover:bg-emerald-600 transition-colors">
                {item.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE APP  — Coming soon section
   ═══════════════════════════════════════════════════════════════════════════ */
const MobileApp = () => (
  <section className="py-20 sm:py-28 bg-gray-950 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative max-w-5xl mx-auto">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text side */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInLeft}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[11px] font-bold tracking-widest uppercase mb-6">
              Coming Soon
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight tracking-tight">
              Graymanager<br />
              <span className="text-gray-500">in Your Pocket</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg mb-10 leading-relaxed max-w-md">
              The full power of Graymanager — stock tracking, job cards, invoicing, and team management — coming natively to iOS and Android.
            </p>

            {/* Store badges */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* App Store */}
              <div className="relative cursor-not-allowed select-none">
                <div className="flex items-center gap-3 px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl opacity-50">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-white flex-shrink-0" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div>
                    <div className="text-gray-400 text-[10px] leading-tight">Download on the</div>
                    <div className="text-white font-semibold text-sm leading-tight">App Store</div>
                  </div>
                </div>
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[9px] font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap tracking-wide uppercase">
                  Coming Soon
                </span>
              </div>

              {/* Google Play */}
              <div className="relative cursor-not-allowed select-none">
                <div className="flex items-center gap-3 px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl opacity-50">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 flex-shrink-0" fill="none">
                    <path d="M3.18 23.99c.35.19.74.24 1.12.13l12.4-12.39L13.11 8.2 3.18 23.99z" fill="#EA4335"/>
                    <path d="M20.47 10.57l-3.07-1.74-3.74 3.74 3.74 3.74 3.1-1.76c.88-.5.88-1.98-.03-1.98z" fill="#FBBC04"/>
                    <path d="M3.18.01C2.83.19 2.6.56 2.6 1.06v21.86c0 .5.23.87.58 1.05l12.4-12.4L3.18.01z" fill="#4285F4"/>
                    <path d="M3.3.13l13.5 7.64-3.7 3.7L3.3.13z" fill="#34A853"/>
                  </svg>
                  <div>
                    <div className="text-gray-400 text-[10px] leading-tight">Get it on</div>
                    <div className="text-white font-semibold text-sm leading-tight">Google Play</div>
                  </div>
                </div>
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[9px] font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap tracking-wide uppercase">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="text-gray-600 text-xs">We'll notify you the moment it launches.</p>
          </motion.div>

          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="flex justify-center md:justify-end"
          >
            <div className="relative w-52 sm:w-60">
              <div className="relative w-full aspect-[9/19.5] bg-gray-950 rounded-[2.8rem] border-2 border-gray-800 shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-800" />
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-900 border border-gray-700" />
                </div>
                <div className="absolute inset-0 bg-[#0d0d0d] flex flex-col pt-14 px-4 pb-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-black font-extrabold text-sm">G</span>
                    </div>
                    <div>
                      <div className="text-white text-xs font-bold leading-none">Graymanager</div>
                      <div className="text-gray-600 text-[9px] mt-0.5">Good morning, Isaac</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Sales Today', value: 'GH₵480' },
                      { label: 'Jobs Active', value: '3' },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-900 rounded-xl p-2.5 border border-gray-800">
                        <div className="text-gray-500 text-[8px] mb-1">{s.label}</div>
                        <div className="text-white text-sm font-bold">{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 mb-3">
                    <div className="text-gray-500 text-[8px] mb-2.5">Weekly Sales</div>
                    <div className="flex items-end gap-1.5 h-10">
                      {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-emerald-600/60" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[{ label: 'Low Stock Alert', sub: '2 items' }, { label: 'Invoice #1042', sub: 'Unpaid' }].map((item) => (
                      <div key={item.label} className="flex items-center justify-between bg-gray-900 rounded-lg px-2.5 py-2 border border-gray-800">
                        <div className="text-white text-[9px] font-medium">{item.label}</div>
                        <div className="text-amber-400 text-[8px] font-bold">{item.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent flex items-end justify-center pb-4">
                    <span className="text-amber-400 text-[9px] font-extrabold tracking-widest uppercase">Coming Soon</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-36 h-10 bg-emerald-500/10 blur-3xl rounded-full" />
              <div className="absolute top-20 -right-1 w-1 h-8 bg-gray-700 rounded-r-sm" />
              <div className="absolute top-16 -left-1 w-1 h-6 bg-gray-700 rounded-l-sm" />
              <div className="absolute top-24 -left-1 w-1 h-6 bg-gray-700 rounded-l-sm" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════════════
   CONTACT
   ═══════════════════════════════════════════════════════════════════════════ */
const Contact = () => {
  const { isMobile } = useResponsive();
  const [form, setForm]       = useState({ fullName: '', email: '', message: '' });
  const [status, setStatus]   = useState('idle');
  const [errMsg, setErrMsg]   = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send.');
      setStatus('success');
      setForm({ fullName: '', email: '', message: '' });
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="py-20 sm:py-28 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInLeft}>
            <span className="inline-block text-xs font-bold text-emerald-600 tracking-widest uppercase mb-3">
              Get in Touch
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Let's Talk About<br />Your Business
            </h2>
            <p className="text-gray-500 mb-8 text-base leading-relaxed">
              Whether you run a small spraying booth or a massive collision repair center, we're here to help you set up and scale.
            </p>
            <div className="space-y-5">
              {[
                { Icon: Phone,  label: 'Call Us',  value: '+233 (0) 24 123 4567' },
                { Icon: Mail,   label: 'Email Us', value: 'info@graymanager.com'  },
                { Icon: MapPin, label: 'Visit HQ', value: 'Coming soon'            },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-600 flex-shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{label}</div>
                    <div className="text-gray-500 text-sm">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.form onSubmit={handleSubmit} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInRight}
                       className="bg-gray-50 p-6 sm:p-8 rounded-2xl border border-gray-100">
            <div className="mb-5">
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Full Name</label>
              <input name="fullName" type="text" value={form.fullName} onChange={handleChange} required
                     className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-white transition-shadow"
                     placeholder="John Smith" />
            </div>
            <div className="mb-5">
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                     className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-white transition-shadow"
                     placeholder="john@example.com" />
            </div>
            <div className="mb-5">
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Message</label>
              <textarea name="message" rows={4} value={form.message} onChange={handleChange} required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-white transition-shadow"
                        placeholder="I'm interested in the Pro plan..." />
            </div>

            {status === 'success' && (
              <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm mb-4">
                Message sent! We'll get back to you soon.
              </p>
            )}
            {status === 'error' && (
              <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm mb-4">
                {errMsg}
              </p>
            )}

            <button type="submit" disabled={status === 'sending'}
                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed">
              {status === 'sending' ? 'Sending…' : 'Send Message'}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   CTA BANNER — Before footer, inspired by Autoflow's "Book a Demo" banner
   ═══════════════════════════════════════════════════════════════════════════ */
const CtaBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-20 bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Ready to Transform Your Auto Paint Business?
          </h2>
          <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
            Join paint shops and sprayers across Ghana who are already managing smarter with Graymanager.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button onClick={() => navigate('/signup')}
              className="bg-white text-gray-900 px-8 py-3.5 rounded-full font-bold text-sm hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg"
            >
              Start for free <ArrowRight size={16} />
            </button>
            <TryDemoButton size="lg" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */
const Footer = () => (
  <footer className="bg-gray-950 text-gray-400 py-10 sm:py-14 border-t border-gray-900">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-extrabold text-xs">G</span>
          </div>
          <span className="text-white font-bold tracking-tight">Graymanager</span>
        </div>

        <p className="text-xs sm:text-sm text-center text-gray-500">
          &copy; {new Date().getFullYear()} Graymanager. All rights reserved.
        </p>

        <div className="flex gap-6 text-xs sm:text-sm">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  </footer>
);

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE ASSEMBLY
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="text-gray-900 bg-white antialiased">
      <Header />
      <Hero />
      <StatsBar />
      <Features />
      <Notifications />
      <HowItWorks />
      <Pricing />
      <Support />
      <MobileApp />
      <Contact />
      <CtaBanner />
      <Footer />
    </div>
  );
}