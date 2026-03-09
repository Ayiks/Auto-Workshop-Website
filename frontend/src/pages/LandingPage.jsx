// src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@hooks/useResponsive';
import { useAuthStore } from '@stores/authStore';
import {
  Menu, X, Check, Wrench, BarChart3,
  FileText, Layers, MapPin,
  Phone, Mail, ArrowRight, FlaskConical, Loader2,
  BookOpen, GraduationCap, Package, Camera, Smartphone, Bell,
  DollarSign, CheckCircle, AlertTriangle, Clock,
} from 'lucide-react';

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeInUp = {
  hidden:  { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};
const staggerContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

// ─── Shared "Try Live Demo" button ───────────────────────────────────────────
// Reused in Header (mobile menu), Hero, and below Pricing.
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

  const btnClass = variant === 'light'
    ? 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
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
        : <p className={`text-xs ${variant === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>No signup · Pre-filled data · Expires in 24h</p>
      }
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = () => {
  const [isOpen,    setIsOpen]    = useState(false);
  const [scrolled,  setScrolled]  = useState(false);
  const [activeId,  setActiveId]  = useState('hero');
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const navLinks = [
    { name: 'Home',     href: '#hero',     id: 'hero'     },
    { name: 'About',    href: '#about',    id: 'about'    },
    { name: 'Features', href: '#services', id: 'services' },
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
        ? 'bg-black/90 backdrop-blur-md shadow-lg py-3 sm:py-4 border-b border-gray-800'
        : 'bg-transparent py-4 sm:py-6'
    }`}>
      <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
        {/* Logo */}
        <a href="#hero" className="text-xl sm:text-2xl font-bold tracking-tighter flex items-center gap-2 text-white">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-xs sm:text-sm">G</span>
          </div>
          <span className="hidden sm:inline">Graymanager</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
          {navLinks.map((link) => {
            const isActive = activeId === link.id;
            return (
              <a key={link.name} href={link.href}
                 className={`relative font-medium transition-colors text-xs sm:text-sm tracking-wide pb-0.5 ${
                   isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                 }`}>
                {link.name}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 w-full h-px bg-white rounded-full" />
                )}
              </a>
            );
          })}
          <div className="flex items-center gap-3 ml-4">
            <button onClick={() => navigate('/login')}
                    className="text-gray-300 hover:text-white font-medium transition-colors text-xs sm:text-sm">
              Login
            </button>
            <button onClick={() => navigate('/signup')}
                    className="bg-white text-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              Start for free
            </button>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-white p-1" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{   opacity: 0, height: 0 }}
            className="md:hidden bg-[#0a0a0a] border-b border-gray-800 overflow-hidden"
          >
            <div className="flex flex-col px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
              {navLinks.map((link) => {
                const isActive = activeId === link.id;
                return (
                  <a key={link.name} href={link.href} onClick={() => setIsOpen(false)}
                     className={`flex items-center justify-between font-medium text-base sm:text-lg border-b border-gray-800 pb-2 sm:pb-3 transition-colors ${
                       isActive ? 'text-white' : 'text-gray-400'
                     }`}>
                    {link.name}
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </a>
                );
              })}
              <div className="flex flex-col gap-2 pt-3">
                <button onClick={() => navigate('/login')}
                        className="bg-transparent border border-gray-700 text-white py-2.5 rounded-xl font-semibold w-full text-sm">
                  Login
                </button>
                <button onClick={() => navigate('/signup')}
                        className="bg-white text-black py-2.5 rounded-xl font-bold w-full text-sm">
                  Start for free
                </button>
                {/* Demo button in mobile menu */}
                <div className="pt-1">
                  <TryDemoButton size="md" fullWidthMobile />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
const Hero = () => {
  const navigate = useNavigate();

  return (
    <section id="hero"
      className="relative pt-10 pb-12 sm:pt-32 sm:pb-16 md:pt-40 md:pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-black flex flex-col items-center">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px]
                      bg-gray-600/20 blur-[140px] rounded-full z-0 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="max-w-4xl mx-auto">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight tracking-tight">
            Run Your Paint Shop. <br className="hidden sm:block" />
            Track Stock. <span className="text-gray-400">Showcase Every Job.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 sm:mb-10 max-w-4xl mx-auto leading-relaxed px-2">
            The complete management platform for auto paint professionals, sprayers, paint
            material suppliers, and mechanic shops, from stock tracking to sprayer portfolios to job cards. Works on any device,
            built for Africa's auto paint industry.
          </p>

          {/* ── CTA row ── */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 md:mb-20 lg:mb-24 px-2">
            <motion.button
              onClick={() => navigate('/signup')}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-bold text-sm sm:text-base hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              Start for free
            </motion.button>

            {/* ── Try Demo ── */}
            <TryDemoButton size="lg" />
          </div>
        </motion.div>

        {/* Dashboard preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="relative max-w-5xl mx-auto z-20 px-2 sm:px-4"
        >
          <div className="rounded-t-xl sm:rounded-t-3xl bg-gray-900 border border-gray-800 border-b-0 p-2 sm:p-4 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          </div>
          <div className="border border-gray-800 rounded-b-xl sm:rounded-b-3xl bg-[#0a0a0a] shadow-2xl overflow-hidden p-1 sm:p-4">
            <img
              src="/images/hero-banner.png"
              alt="Graymanager Dashboard Preview"
              className="w-full h-auto rounded-lg sm:rounded-xl border border-gray-800/50 shadow-inner"
            />
          </div>
          <div className="absolute -bottom-1 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent pointer-events-none z-30" />
        </motion.div>
      </div>
    </section>
  );
};

// ─── About ────────────────────────────────────────────────────────────────────
const About = () => {
  const highlights = [
    { icon: <Package    className="text-black" size={32} />, title: 'Paint & Materials Stock',  desc: 'Track every tin, thinner, primer, and hardener in real time. Get low-stock alerts before you run out.' },
    { icon: <Camera     className="text-black" size={32} />, title: 'Sprayer Portfolio & Jobs', desc: 'Every sprayer logs and showcases their completed jobs, builds credibility and tracks performance over time.' },
    { icon: <Smartphone className="text-black" size={32} />, title: 'Works on Any Device',      desc: 'Use your own phone, tablet, or laptop. No special hardware required, access your business from anywhere.' },
  ];
  return (
    <section id="about" className="py-16 sm:py-20 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                    className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">Built for the Auto Paint & Mechanic Industry</h2>
          <p className="text-slate-600 text-base sm:text-lg px-2">For professional sprayers, paint material suppliers, and collision repair shops. Graymanager keeps everything organized.</p>
        </motion.div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
          {highlights.map((item, i) => (
            <motion.div key={i} variants={fadeInUp}
                        className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-slate-100">
              <div className="bg-gray-100 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6">{item.icon}</div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── Services ─────────────────────────────────────────────────────────────────
const Services = () => {
  const features = [
    { title: 'Paint Stock Control',      desc: 'Track tins, thinners, primers, hardeners, and accessories down to the last unit.' },
    { title: 'Job Cards',                desc: 'Digital job cards for every spray and refinishing job. From panel prep to final delivery.' },
    { title: 'Spray Booth Booking',      desc: 'Schedule and manage spray booth slots to eliminate downtime and clashes.' },
    { title: 'Sprayer Portfolio',        desc: 'Each sprayer builds a portfolio of completed jobs with photos and full client history.' },
    { title: 'Custom Receipts',          desc: 'Branded receipts and professional invoices delivered via WhatsApp or email in seconds.' },
    { title: 'Team & Role Access',       desc: 'Set custom permissions for sprayers, managers, cashiers, and sales staff.' },
    { title: 'Customer Job Notifications', desc: 'Automatically email your customers when their job status changes right from intake to completion.' },
  ];
  return (
    <section id="services" className="py-16 sm:py-20 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">Powerful Features</h2>
          <p className="text-slate-600 text-base sm:text-lg">Everything you need to run a professional auto paint business.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                        className="p-5 sm:p-6 border border-slate-200 rounded-lg sm:rounded-xl hover:border-black hover:bg-slate-50 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-black transition-colors">
                  <Check className="text-slate-600 group-hover:text-white" size={20} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{f.title}</h3>
              </div>
              <p className="text-slate-600 text-sm sm:text-base">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Pricing ──────────────────────────────────────────────────────────────────
const Pricing = () => {
  const { isMobile } = useResponsive();
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
    <section id="pricing" className="py-16 sm:py-20 md:py-24 bg-[#f8f9fa]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">Simple, Honest Pricing</h2>
          <p className="text-gray-500 text-base sm:text-lg">No contracts, no hidden fees. Cancel anytime.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 sm:gap-6 max-w-6xl mx-auto">
          {plans.map((plan, i) => {
            const isDark    = plan.style === 'dark';
            const isPremium = plan.style === 'premium';
            return (
              <motion.div key={i} whileHover={{ y: -5 }}
                className={`relative p-6 sm:p-8 rounded-2xl md:rounded-[2rem] flex flex-col ${
                  isDark    ? 'bg-[#111111] text-white shadow-2xl' :
                  isPremium ? 'bg-white border-2 border-gray-900 text-gray-900 shadow-sm' :
                              'bg-white border border-gray-200 text-gray-900 shadow-sm'
                }`}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full border border-gray-200 shadow-sm whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-4 sm:mb-5 ${
                  isDark ? 'bg-gray-800' : 'border border-gray-200'
                }`}>
                  <Wrench size={isMobile ? 16 : 18} className={isDark ? 'text-white' : 'text-gray-800'} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">{plan.name}</h3>
                <div className={`p-3 sm:p-4 rounded-xl mb-5 sm:mb-6 ${
                  isDark ? 'bg-gray-800/60 border border-gray-700/50' : 'bg-gray-50'
                }`}>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 sm:space-y-3 mb-8 sm:mb-10 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      <Check size={15} className={`flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <div className="text-3xl sm:text-4xl font-bold">{plan.price}</div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1 font-medium mb-4">/ per month</div>
                  <button onClick={() => navigate('/signup')}
                    className={`px-6 py-2.5 sm:py-3 rounded-full font-bold text-sm sm:text-base w-full transition-colors ${
                      isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
                    }`}>
                    Get Started Today
                  </button>
                  <a href="#contact" className={`block text-center text-xs mt-2 transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                  }`}>or Book a Call</a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Demo CTA under pricing cards */}
        <div className="text-center mt-10 sm:mt-12">
          <p className="text-gray-500 text-sm mb-4">Not sure which plan? Explore the full product first no signup needed.</p>
          <TryDemoButton size="md" variant="light" />
        </div>
      </div>
    </section>
  );
};

// ─── Support ──────────────────────────────────────────────────────────────────
const Support = () => {
  const items = [
    {
      icon: <Phone size={28} className="text-white" />,
      title: 'Direct Contact',
      desc: 'Reach our team via phone, WhatsApp, or email whenever you need help with your account or daily operations.',
    },
    {
      icon: <BookOpen size={28} className="text-white" />,
      title: 'Guides & Docs',
      desc: 'Clear, step-by-step documentation for every feature from stock setup, job cards, invoicing, portfolios, and more.',
    },
    {
      icon: <GraduationCap size={28} className="text-white" />,
      title: 'Product Training',
      desc: 'Hands-on onboarding and training sessions to get you and your team up and running fast, at no extra cost.',
    },
  ];

  return (
    <section id="support" className="py-16 sm:py-20 md:py-24 bg-black">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                    className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">We're With You Every Step</h2>
          <p className="text-gray-400 text-base sm:text-lg">From setup to daily operations, our support team has you covered.</p>
        </motion.div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {items.map((item, i) => (
            <motion.div key={i} variants={fadeInUp}
                        className="border border-gray-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 hover:border-gray-600 transition-colors">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-900 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                {item.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── Notifications ────────────────────────────────────────────────────────────
const Notifications = () => {
  const alerts = [
    { Icon: CheckCircle, label: 'Job Started',  sub: 'Toyota Camry — work has begun',      time: 'Just now',   color: 'text-white',    bg: 'bg-white/10' },
    { Icon: Wrench,      label: 'In Progress',  sub: 'Honda Accord — bodywork underway',   time: '10 min ago', color: 'text-gray-300', bg: 'bg-white/5'  },
    { Icon: CheckCircle, label: 'Job Ready',    sub: 'Kia Picanto — ready for collection', time: '1 hr ago',   color: 'text-gray-300', bg: 'bg-white/5'  },
    { Icon: DollarSign,  label: 'Invoice Sent', sub: 'Client: Kwame Asante — GH₵1,200',   time: '2 hrs ago',  color: 'text-gray-400', bg: 'bg-white/5'  },
  ];

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-[#f8f9fa] border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-5xl mx-auto">

          {/* Text side */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 text-xs font-bold tracking-widest uppercase mb-6">
              <Bell size={12} />
              Customer Notifications
            </div> */}
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
              Keep Your Customers<br />
              <span className="text-slate-400">In the Loop.</span>
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mb-8 leading-relaxed">
              Automatically email your customers at every stage of their job, from when work starts to when their vehicle is ready for collection. No manual follow-up needed.
            </p>
            <ul className="space-y-3">
              {[
                'Email sent when a job is created',
                'Notification when work begins',
                'Alert when the job is ready for pickup',
                'Invoice emailed on job completion',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-white" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Notification feed mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, ease: 'easeOut' }}
            className="bg-[#111] rounded-2xl border border-gray-800 p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-semibold">Customer Updates</span>
              {/* <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> */}
            </div>
            {alerts.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3"
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${a.bg}`}>
                  <a.Icon size={14} className={a.color} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${a.color}`}>{a.label}</p>
                  <p className="text-gray-400 text-[11px] mt-0.5 truncate">{a.sub}</p>
                </div>
                <span className="text-gray-600 text-[10px] whitespace-nowrap mt-0.5">{a.time}</span>
              </motion.div>
            ))}
            <p className="text-gray-600 text-[10px] text-center pt-1">Delivered via email</p>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

// ─── MobileApp ────────────────────────────────────────────────────────────────
const MobileApp = () => (
  <section className="py-16 sm:py-20 md:py-24 bg-[#060606] overflow-hidden border-t border-gray-900">
    <div className="container mx-auto px-4 sm:px-6">
      <div className="relative max-w-5xl mx-auto">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/[0.04] blur-[120px] rounded-full pointer-events-none" />

        <div className="relative grid md:grid-cols-2 gap-12 md:gap-16 items-center">

          {/* ── Text side ── */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[11px] font-bold tracking-widest uppercase mb-6">
              {/* <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> */}
              Coming Soon
            </span>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
              Graymanager<br />
              <span className="text-gray-500">in Your Pocket</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg mb-10 leading-relaxed max-w-md">
              The full power of Graymanager, stock tracking, job cards, invoicing, and team management coming natively to iOS and Android.
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

          {/* ── Phone mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="flex justify-center md:justify-end"
          >
            <div className="relative w-52 sm:w-60">
              {/* Phone shell */}
              <div className="relative w-full aspect-[9/19.5] bg-gray-950 rounded-[2.8rem] border-2 border-gray-800 shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden">
                {/* Dynamic island */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-800" />
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-900 border border-gray-700" />
                </div>

                {/* Screen */}
                <div className="absolute inset-0 bg-[#0d0d0d] flex flex-col pt-14 px-4 pb-6">
                  {/* App header */}
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-black font-extrabold text-sm">G</span>
                    </div>
                    <div>
                      <div className="text-white text-xs font-bold leading-none">Graymanager</div>
                      <div className="text-gray-600 text-[9px] mt-0.5">Good morning, Isaac</div>
                    </div>
                  </div>

                  {/* Stats cards */}
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

                  {/* Activity bars */}
                  <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 mb-3">
                    <div className="text-gray-500 text-[8px] mb-2.5">Weekly Sales</div>
                    <div className="flex items-end gap-1.5 h-10">
                      {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-gray-700" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>

                  {/* Bottom items */}
                  <div className="space-y-1.5">
                    {[{ label: 'Low Stock Alert', sub: '2 items' }, { label: 'Invoice #1042', sub: 'Unpaid' }].map((item) => (
                      <div key={item.label} className="flex items-center justify-between bg-gray-900 rounded-lg px-2.5 py-2 border border-gray-800">
                        <div className="text-white text-[9px] font-medium">{item.label}</div>
                        <div className="text-amber-400 text-[8px] font-bold">{item.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Coming soon overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent flex items-end justify-center pb-4">
                    <span className="text-amber-400 text-[9px] font-extrabold tracking-widest uppercase">Coming Soon</span>
                  </div>
                </div>
              </div>

              {/* Glow under phone */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-36 h-10 bg-white/10 blur-3xl rounded-full" />

              {/* Side buttons */}
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

// ─── Contact ──────────────────────────────────────────────────────────────────
const Contact = () => {
  const { isMobile } = useResponsive();
  const [form, setForm]       = useState({ fullName: '', email: '', message: '' });
  const [status, setStatus]   = useState('idle'); // idle | sending | success | error
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
    <section id="contact" className="py-16 sm:py-20 md:py-24 bg-white border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-start sm:items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 sm:mb-6">Get in Touch</h2>
            <p className="text-slate-600 mb-6 sm:mb-8 text-base md:text-lg leading-relaxed">Whether you run a small spraying booth or a massive collision repair center, we're here to help you set up and scale.</p>
            <div className="space-y-4 sm:space-y-6">
              {[
                { Icon: Phone,  label: 'Call Us',  value: '+233 (0) 24 123 4567' },
                { Icon: Mail,   label: 'Email Us', value: 'info@graymanager.com'  },
                { Icon: MapPin, label: 'Visit HQ', value: 'coming soon'            },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center text-black flex-shrink-0">
                    <Icon size={isMobile ? 20 : 24} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm sm:text-base">{label}</div>
                    <div className="text-slate-600 text-xs sm:text-base">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                       className="bg-gray-50 p-6 sm:p-8 rounded-lg sm:rounded-2xl border border-gray-200 w-full">
            <div className="mb-5 sm:mb-6">
              <label className="block text-slate-700 font-semibold mb-2 text-sm sm:text-base">Full Name</label>
              <input name="fullName" type="text" value={form.fullName} onChange={handleChange} required
                     className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base bg-white"
                     placeholder="John Smith" />
            </div>
            <div className="mb-5 sm:mb-6">
              <label className="block text-slate-700 font-semibold mb-2 text-sm sm:text-base">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                     className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base bg-white"
                     placeholder="john@example.com" />
            </div>
            <div className="mb-5 sm:mb-6">
              <label className="block text-slate-700 font-semibold mb-2 text-sm sm:text-base">Message</label>
              <textarea name="message" rows={isMobile ? 3 : 4} value={form.message} onChange={handleChange} required
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base bg-white"
                        placeholder="I'm interested in the Pro plan..." />
            </div>

            {status === 'success' && (
              <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm mb-4">
                Message sent! We'll get back to you soon.
              </p>
            )}
            {status === 'error' && (
              <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm mb-4">
                {errMsg}
              </p>
            )}

            <button type="submit" disabled={status === 'sending'}
                    className="w-full bg-black text-white py-2.5 sm:py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed">
              {status === 'sending' ? 'Sending…' : 'Send Message'}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="bg-black text-gray-400 py-8 sm:py-10 md:py-12 border-t border-gray-900">
    <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 md:gap-0">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded flex items-center justify-center">
          <span className="text-black font-bold text-xs">G</span>
        </div>
        <span className="text-white font-bold tracking-tight text-sm sm:text-base">Graymanager</span>
      </div>
      <p className="text-xs sm:text-sm text-center">&copy; {new Date().getFullYear()} Graymanager. All rights reserved.</p>
      <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
      </div>
    </div>
  </footer>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="font-geist text-slate-900 bg-white">
      <Header />
      <Hero />
      <About />
      <Services />
      <Pricing />
      <Support />
      <Notifications />
      <MobileApp />
      <Contact />
      <Footer />
    </div>
  );
}