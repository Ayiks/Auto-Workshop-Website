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
function TryDemoButton({ size = 'md', fullWidthMobile = false }) {
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

  return (
    <div className={`flex flex-col items-center gap-1.5 ${fullWidthMobile ? 'w-full' : ''}`}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`
          inline-flex items-center justify-center gap-2 font-bold rounded-full
          border border-gray-600 text-white
          hover:border-white hover:bg-white/5
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all duration-200
          ${padClass}
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
        ? <p className="text-red-400 text-xs text-center max-w-xs">{error}</p>
        : <p className="text-gray-500 text-xs">No signup · Pre-filled data · Expires in 24h</p>
      }
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = () => {
  const [isOpen,   setIsOpen]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { name: 'Home',     href: '#hero'     },
    { name: 'About',    href: '#about'    },
    { name: 'Services', href: '#services' },
    { name: 'Pricing',  href: '#pricing'  },
    { name: 'Contact',  href: '#contact'  },
  ];

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
          <span className="hidden xs:inline">Graymanager</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href}
               className="text-gray-400 hover:text-white font-medium transition-colors text-xs sm:text-sm tracking-wide">
              {link.name}
            </a>
          ))}
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
              {navLinks.map((link) => (
                <a key={link.name} href={link.href} onClick={() => setIsOpen(false)}
                   className="text-gray-300 hover:text-white font-medium text-base sm:text-lg border-b border-gray-800 pb-2 sm:pb-3">
                  {link.name}
                </a>
              ))}
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
      className="relative pt-20 pb-12 sm:pt-32 sm:pb-16 md:pt-40 md:pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-black flex flex-col items-center">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px]
                      bg-gray-600/20 blur-[140px] rounded-full z-0 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight tracking-tight">
            The Smarter Way <br className="hidden sm:block" />
            to Grow Your <span className="text-gray-400">Workshop</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
            Take control of jobs, inventory, and finances. Built specifically for auto mechanics,
            sprayers, and collision repairers in Africa and beyond.
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
    { icon: <Layers   className="text-black" size={32} />, title: 'Effortless Management', desc: 'Manage sales, active jobs, and inventory flow from a single dashboard.' },
    { icon: <FileText className="text-black" size={32} />, title: 'Automated Invoicing',   desc: 'Generate professional receipts and invoices instantly. No more paperwork.' },
    { icon: <BarChart3 className="text-black" size={32} />, title: 'Real-time Finance',    desc: 'Track revenue, expenses, and profit margins automatically as you work.' },
  ];
  return (
    <section id="about" className="py-16 sm:py-20 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                    className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">Why Choose Graymanager?</h2>
          <p className="text-slate-600 text-base sm:text-lg px-2">Running a workshop is hard work. Managing it shouldn't be.</p>
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
    { title: 'Inventory Control', desc: 'Track parts, paints, and materials down to the last unit.' },
    { title: 'Job Cards',         desc: 'Digital job cards to track progress from entry to delivery.' },
    { title: 'Booth Services',    desc: 'Schedule and manage spray booth times effortlessly.' },
    { title: 'Analytics',         desc: "Visual graphs showing your workshop's growth and health." },
    { title: 'Custom Receipts',   desc: 'Branded receipts with your logo sent via email or WhatsApp.' },
    { title: 'Team Access',       desc: 'Granular permissions for mechanics, managers, and cashiers.' },
  ];
  return (
    <section id="services" className="py-16 sm:py-20 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">Powerful Features</h2>
          <p className="text-slate-600 text-base sm:text-lg">Everything you need to run a modern automotive business.</p>
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

  return (
    <section id="pricing" className="py-16 sm:py-20 md:py-24 bg-[#f8f9fa]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">No Contract, No Surprises</h2>
          <p className="text-gray-500 text-base sm:text-lg">Consistent Pricing and Value Each Month, with the Flexibility to Cancel Anytime.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
          {/* Starter */}
          <motion.div whileHover={{ y: -5 }}
                      className="bg-white border border-gray-200 p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-[2.5rem] flex flex-col shadow-sm">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-gray-200 flex items-center justify-center">
                <Wrench size={isMobile ? 18 : 20} className="text-gray-800" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Starter</h3>
            <div className="bg-gray-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-6 sm:mb-8">
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">Ideal for solo mechanics or small neighborhood shops who need basic tools.</p>
            </div>
            <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-12 flex-1">
              {['Single branch access', 'Basic Inventory', 'Up to 5 users'].map((f) => (
                <li key={f} className="flex items-center gap-3 text-gray-700 text-sm sm:text-base">
                  <Check size={16} className="text-gray-400 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <div className="text-3xl sm:text-4xl font-bold">GH₵50</div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1 font-medium mb-4">/ per month</div>
              <button onClick={() => navigate('/signup')}
                      className="bg-black text-white px-6 py-2.5 sm:py-3.5 rounded-full font-bold text-sm sm:text-base hover:bg-gray-800 transition-colors w-full">
                Get Started Today
              </button>
              <a href="#contact" className="block text-center text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2">or Book a Call</a>
            </div>
          </motion.div>

          {/* Pro */}
          <motion.div whileHover={{ y: -5 }}
                      className="bg-[#111111] p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-[2.5rem] flex flex-col text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-800 flex items-center justify-center">
                <Layers size={isMobile ? 18 : 20} className="text-white" />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs font-semibold text-gray-400">Annual Billing</span>
                <div className="w-9 h-5 sm:w-10 sm:h-6 bg-white rounded-full flex items-center px-1">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black rounded-full transform translate-x-3 sm:translate-x-4" />
                </div>
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Pro Manager</h3>
            <div className="bg-gray-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-6 sm:mb-8 border border-gray-700/50">
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">Ideal for growing teams needing full control and ongoing management support.</p>
            </div>
            <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-12 flex-1">
              {['Unlimited Branch Access', 'Advanced Analytics', 'Custom Branding (No Watermark)', 'Multi-user Access'].map((f) => (
                <li key={f} className="flex items-center gap-3 text-gray-200 text-sm sm:text-base">
                  <Check size={16} className="text-gray-500 flex-shrink-0" /> {f}
                </li>
              ))}
              <li className="flex items-center gap-3 text-green-400 font-medium text-sm sm:text-base">
                <span className="text-lg leading-none">✧</span> Priority Support Included
              </li>
            </ul>
            <div className="mt-auto">
              <div className="text-3xl sm:text-4xl font-bold">GH₵100</div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1 font-medium mb-4">/ per month</div>
              <button onClick={() => navigate('/signup')}
                      className="bg-white text-black px-6 py-2.5 sm:py-3.5 rounded-full font-bold text-sm sm:text-base hover:bg-gray-200 transition-colors w-full">
                Get Started Today
              </button>
              <a href="#contact" className="block text-center text-xs text-gray-400 hover:text-white transition-colors mt-2">or Book a Call</a>
            </div>
          </motion.div>
        </div>

        {/* Demo CTA under pricing cards */}
        <div className="text-center mt-10 sm:mt-12">
          <p className="text-gray-500 text-sm mb-4">Not sure which plan? Explore the full product first — no signup needed.</p>
          <TryDemoButton size="md" />
        </div>
      </div>
    </section>
  );
};

// ─── Contact ──────────────────────────────────────────────────────────────────
const Contact = () => {
  const { isMobile } = useResponsive();
  return (
    <section id="contact" className="py-16 sm:py-20 md:py-24 bg-white border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-start sm:items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 sm:mb-6">Get in Touch</h2>
            <p className="text-slate-600 mb-6 sm:mb-8 text-base md:text-lg leading-relaxed">Whether you run a small spraying booth or a massive collision repair center, we're here to help you set up and scale.</p>
            <div className="space-y-4 sm:space-y-6">
              {[
                { Icon: Phone, label: 'Call Us',     value: '+233 (0) 24 123 4567' },
                { Icon: Mail,  label: 'Email Us',    value: 'info@graymanager.com' },
                { Icon: MapPin, label: 'Visit HQ',   value: 'coming soon' },
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

          <motion.form initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                       className="bg-gray-50 p-6 sm:p-8 rounded-lg sm:rounded-2xl border border-gray-200 w-full">
            {[
              { label: 'Full Name',      type: 'text',  ph: 'John Smith' },
              { label: 'Email Address',  type: 'email', ph: 'john@example.com' },
            ].map(({ label, type, ph }) => (
              <div key={label} className="mb-5 sm:mb-6">
                <label className="block text-slate-700 font-semibold mb-2 text-sm sm:text-base">{label}</label>
                <input type={type} className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base" placeholder={ph} />
              </div>
            ))}
            <div className="mb-5 sm:mb-6">
              <label className="block text-slate-700 font-semibold mb-2 text-sm sm:text-base">Message</label>
              <textarea rows={isMobile ? 3 : 4} className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base" placeholder="I'm interested in the Pro plan..." />
            </div>
            <button className="w-full bg-black text-white py-2.5 sm:py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors text-sm sm:text-base">
              Send Message
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
    <div className="font-sans text-slate-900 bg-white">
      <Header />
      <Hero />
      <About />
      <Services />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
}