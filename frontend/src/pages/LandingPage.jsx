// src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Check, Wrench, BarChart3, 
  FileText, Layers, MapPin, 
  Phone, Mail, ArrowRight 
} from 'lucide-react';

// --- Animation Variants ---
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#hero' },
    { name: 'About', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-md shadow-lg py-4 border-b border-gray-800' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <a href="#hero" className="text-2xl font-bold tracking-tighter flex items-center gap-2 text-white">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-bold">G</span>
          </div>
          Graymanager
        </a>

        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className="text-gray-400 hover:text-white font-medium transition-colors text-sm tracking-wide">
              {link.name}
            </a>
          ))}
          <div className="flex items-center gap-4 ml-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-gray-300 hover:text-white font-medium transition-colors text-sm"
            >
              Login
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
              Start for free
            </button>
          </div>
        </div>

        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0a0a0a] border-b border-gray-800 overflow-hidden"
          >
            <div className="flex flex-col px-6 py-6 space-y-4">
              {navLinks.map((link) => (
                <a key={link.name} href={link.href} className="text-gray-300 hover:text-white font-medium text-lg border-b border-gray-800 pb-3" onClick={() => setIsOpen(false)}>
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-transparent border border-gray-700 text-white py-3 rounded-xl font-semibold w-full"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/signup')}
                  className="bg-white text-black py-3 rounded-xl font-bold w-full"
                >
                  Start for free
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section id="hero" className="relative pt-32 pb-16 md:pt-48 md:pb-32 overflow-hidden bg-black flex flex-col items-center">
      {/* Background Subtle Glow Effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gray-600/20 blur-[150px] rounded-full z-0 pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          {/* <span className="inline-block py-1.5 px-4 rounded-full bg-gray-900 border border-gray-800 text-gray-300 text-sm font-semibold mb-6 shadow-sm">
            The #1 Workshop Management SaaS
          </span> */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            The Smarter Way <br/> to Grow Your <span className="text-gray-400">Workshop</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Take control of jobs, inventory, and finances. Built specifically for auto mechanics, sprayers, and collision repairers in Africa and beyond.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 md:mb-24">
            <motion.button 
              onClick={() => navigate('/signup')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-black px-8 py-3.5 rounded-full font-bold text-base hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              Start for free
            </motion.button>
            <motion.button 
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-transparent border border-gray-700 text-white px-8 py-3.5 rounded-full font-bold text-base hover:bg-gray-800 transition-colors"
            >
              Get Demo
            </motion.button>
          </div>
        </motion.div>

        {/* Dashboard Preview Image Container */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="relative max-w-5xl mx-auto z-20"
        >
          {/* Decorative Top Bar to mimic a browser/app window */}
          <div className="rounded-t-2xl md:rounded-t-3xl bg-gray-900 border border-gray-800 border-b-0 p-3 md:p-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-700"></div>
            <div className="w-3 h-3 rounded-full bg-gray-700"></div>
            <div className="w-3 h-3 rounded-full bg-gray-700"></div>
          </div>
          
          {/* Dashboard Image */}
          <div className="border border-gray-800 rounded-b-2xl md:rounded-b-3xl bg-[#0a0a0a] shadow-2xl overflow-hidden p-2 md:p-4">
            <img 
              src="/images/hero-banner.png" 
              alt="Graymanager Dashboard Preview" 
              className="w-full h-auto rounded-xl border border-gray-800/50 shadow-inner"
            />
          </div>
          
          {/* Bottom Fade Gradient (blends the dashboard into the next section if needed) */}
          <div className="absolute -bottom-1 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent pointer-events-none z-30"></div>
        </motion.div>
      </div>
    </section>
  );
};

const About = () => {
  const highlights = [
    { icon: <Layers className="text-black" size={32} />, title: "Effortless Management", desc: "Manage sales, active jobs, and inventory flow from a single dashboard." },
    { icon: <FileText className="text-black" size={32} />, title: "Automated Invoicing", desc: "Generate professional receipts and invoices instantly. No more paperwork." },
    { icon: <BarChart3 className="text-black" size={32} />, title: "Real-time Finance", desc: "Track revenue, expenses, and profit margins automatically as you work." },
  ];

  return (
    <section id="about" className="py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Choose Graymanager?</h2>
          <p className="text-slate-600 text-lg">
            Running a workshop is hard work. Managing it shouldn't be. We provide the digital tools to help you focus on the craft, not the calculator.
          </p>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-10"
        >
          {highlights.map((item, index) => (
            <motion.div 
              key={index} 
              variants={fadeInUp} 
              className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-slate-100"
            >
              <div className="bg-gray-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const Services = () => {
  const features = [
    { title: "Inventory Control", desc: "Track parts, paints, and materials down to the last unit." },
    { title: "Job Cards", desc: "Digital job cards to track progress from entry to delivery." },
    { title: "Booth Services", desc: "Schedule and manage spray booth times effortlessly." },
    { title: "Analytics", desc: "Visual graphs showing your workshop's growth and health." },
    { title: "Custom Receipts", desc: "Branded receipts with your logo sent via email or WhatsApp." },
    { title: "Team Access", desc: "Granular permissions for mechanics, managers, and cashiers." },
  ];

  return (
    <section id="services" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
          <p className="text-slate-600 text-lg">Everything you need to run a modern automotive business.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="p-6 border border-slate-200 rounded-xl hover:border-black hover:bg-slate-50 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                  <Check className="text-slate-600 group-hover:text-white" size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
              </div>
              <p className="text-slate-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-[#f8f9fa]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">No Contract, No Surprises</h2>
          <p className="text-gray-500 text-lg">
            Consistent Pricing and Value Each Month,<br className="hidden md:block"/> with the Flexibility to Cancel Anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Starter Plan - Light Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white border border-gray-200 p-8 md:p-10 rounded-[2.5rem] flex flex-col shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center">
                <Wrench size={20} className="text-gray-800" />
              </div>
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Starter</h3>
            
            {/* Subtext Pill */}
            <div className="bg-gray-100 p-4 rounded-2xl mb-8">
              <p className="text-gray-600 text-sm leading-relaxed">
                Ideal for solo mechanics or small neighborhood shops who need basic tools.
              </p>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1">
              <li className="flex items-center gap-3 text-gray-700">
                <Check size={18} className="text-gray-400" /> up to 5 Active Jobs
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <Check size={18} className="text-gray-400" /> Basic Inventory
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <Check size={18} className="text-gray-400" /> Watermarked Invoices
              </li>
            </ul>
            
            {/* Card Footer */}
            <div className="flex items-end justify-between mt-auto">
              <div>
                <div className="text-4xl font-bold text-gray-900">Free</div>
                <div className="text-sm text-gray-500 mt-1 font-medium">forever</div>
              </div>
              <button className="bg-gray-900 text-white px-6 py-3.5 rounded-full font-semibold hover:bg-gray-800 transition-colors">
                Start for Free
              </button>
            </div>
          </motion.div>

          {/* Pro Plan - Dark Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#111111] p-8 md:p-10 rounded-[2.5rem] flex flex-col text-white shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                <Layers size={20} className="text-white" />
              </div>
              {/* Decorative Mock Toggle from reference image */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-400">Annual Billing</span>
                <div className="w-10 h-6 bg-white rounded-full flex items-center px-1 cursor-pointer">
                  <div className="w-4 h-4 bg-black rounded-full transform translate-x-4"></div>
                </div>
              </div>
            </div>

            <h3 className="text-3xl font-bold mb-3">Pro Manager</h3>
            
            {/* Subtext Pill */}
            <div className="bg-gray-800/60 p-4 rounded-2xl mb-8 border border-gray-700/50">
              <p className="text-gray-300 text-sm leading-relaxed">
                Ideal for growing teams needing full control and ongoing management support.
              </p>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1">
              <li className="flex items-center gap-3 text-gray-200">
                <Check size={18} className="text-gray-500" /> Unlimited Jobs
              </li>
              <li className="flex items-center gap-3 text-gray-200">
                <Check size={18} className="text-gray-500" /> Advanced Analytics
              </li>
              <li className="flex items-center gap-3 text-gray-200">
                <Check size={18} className="text-gray-500" /> Custom Branding (No Watermark)
              </li>
              <li className="flex items-center gap-3 text-gray-200">
                <Check size={18} className="text-gray-500" /> Multi-user Access
              </li>
              {/* Highlighted feature item from reference image */}
              <li className="flex items-center gap-3 text-green-400 font-medium">
                <span className="text-lg leading-none">✧</span> Priority Support Included
              </li>
            </ul>
            
            {/* Card Footer */}
            <div className="flex items-end justify-between mt-auto">
              <div>
                <div className="text-4xl font-bold">$29</div>
                <div className="text-sm text-gray-400 mt-1 font-medium">/ per month</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button className="bg-white text-black px-6 py-3.5 rounded-full font-bold hover:bg-gray-200 transition-colors">
                  Get Started Today
                </button>
                <a href="#contact" className="text-xs text-gray-400 hover:text-white transition-colors">
                  or Book a Call
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Trusted by Workshops</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex text-yellow-400 mb-4">
                {'★★★★★'}
              </div>
              <p className="text-slate-600 mb-6 italic">"Since using Gray Manager, we've cut our admin time in half. The inventory tracking alone is worth the subscription."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-300 rounded-full"></div>
                <div>
                  <div className="font-bold text-slate-900">John Doe</div>
                  <div className="text-sm text-slate-500">AutoFix Garage</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  return (
    <section id="contact" className="py-24 bg-white border-t border-gray-200">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Get in Touch</h2>
            <p className="text-slate-600 mb-8 text-lg">
              Whether you run a small spraying booth or a massive collision repair center, we're here to help you set up and scale. Let's talk.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-black">
                  <Phone size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Call Us</div>
                  <div className="text-slate-600">+233 (0) 24 123 4567</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-black">
                  <Mail size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Email Us</div>
                  <div className="text-slate-600">hello@graymanager.com</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-black">
                  <MapPin size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Visit HQ</div>
                  <div className="text-slate-600">coming soon</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.form 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gray-50 p-8 rounded-2xl border border-gray-200"
          >
            <div className="mb-6">
              <label className="block text-slate-700 font-semibold mb-2">Full Name</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black" placeholder="John Smith" />
            </div>
            <div className="mb-6">
              <label className="block text-slate-700 font-semibold mb-2">Email Address</label>
              <input type="email" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black" placeholder="john@example.com" />
            </div>
            <div className="mb-6">
              <label className="block text-slate-700 font-semibold mb-2">Message</label>
              <textarea rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black" placeholder="I'm interested in the Pro plan..."></textarea>
            </div>
            <button className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors">
              Send Message
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
    <footer className="bg-black text-gray-400 py-12 border-t border-gray-900">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <span className="text-black font-bold text-xs">G</span>
          </div>
          <span className="text-white font-bold tracking-tight">Graymanager</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Graymanager. All rights reserved.</p>
        <div className="flex gap-6 text-sm">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
);

export default function LandingPage() {
  return (
    <div className="font-sans text-slate-900 bg-white">
      <Header />
      <Hero />
      <About />
      <Services />
      <Pricing />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
}