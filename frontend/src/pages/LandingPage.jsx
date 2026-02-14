// src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for navigation
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
  const navigate = useNavigate(); // Hook for navigation

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
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-md py-4' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <a href="#hero" className="text-2xl font-bold tracking-tighter flex items-center gap-2 text-slate-800">
          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">G</span>
          </div>
          Gray Manager
        </a>

        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className="text-slate-600 hover:text-blue-600 font-medium transition-colors">
              {link.name}
            </a>
          ))}
          <button 
            onClick={() => navigate('/login')}
            className="bg-slate-900 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors"
          >
            Login
          </button>
        </div>

        <button className="md:hidden text-slate-800" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="flex flex-col px-6 py-4 space-y-4">
              {navLinks.map((link) => (
                <a key={link.name} href={link.href} className="text-slate-600 font-medium text-lg" onClick={() => setIsOpen(false)}>
                  {link.name}
                </a>
              ))}
              <button 
                onClick={() => navigate('/login')}
                className="bg-blue-600 text-white py-3 rounded-lg font-bold w-full"
              >
                Login Portal
              </button>
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
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-slate-900">
      {/* Fallback bg color in case image doesn't load */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
          alt="Workshop" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 to-slate-900/90"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <span className="inline-block py-1 px-3 rounded-full bg-blue-500/20 border border-blue-400 text-blue-300 text-sm font-semibold mb-6">
            The #1 Workshop Management SaaS
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Streamline Your <br/> <span className="text-blue-400">Workshop Operations</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Take control of jobs, inventory, and finances. Designed specifically for mechanics, sprayers, and bodyworks teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button 
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              Get Started <ArrowRight size={20} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-transparent border border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-slate-900 transition-colors"
            >
              Request a Demo
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const About = () => {
  const highlights = [
    { icon: <Layers className="text-blue-600" size={32} />, title: "Effortless Management", desc: "Manage sales, active jobs, and inventory flow from a single dashboard." },
    { icon: <FileText className="text-blue-600" size={32} />, title: "Automated Invoicing", desc: "Generate professional receipts and invoices instantly. No more paperwork." },
    { icon: <BarChart3 className="text-blue-600" size={32} />, title: "Real-time Finance", desc: "Track revenue, expenses, and profit margins automatically as you work." },
  ];

  return (
    <section id="about" className="py-24 bg-slate-50">
      <div className="container mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Choose Gray Manager?</h2>
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
              <div className="bg-blue-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
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
              className="p-6 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-slate-50 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Check className="text-slate-600 group-hover:text-blue-600" size={20} />
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
    <section id="pricing" className="py-24 bg-slate-900 text-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400">Choose the plan that fits your workshop size.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Starter Plan */}
          <motion.div 
            whileHover={{ y: -10 }}
            className="bg-slate-800 p-8 rounded-2xl border border-slate-700 flex flex-col"
          >
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <p className="text-slate-400 mb-6">For solo mechanics or small neighborhood shops.</p>
            <div className="text-4xl font-bold mb-8">Free<span className="text-lg text-slate-500 font-normal"> / forever</span></div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3"><Check size={18} className="text-blue-400" /> up to 5 Active Jobs</li>
              <li className="flex items-center gap-3"><Check size={18} className="text-blue-400" /> Basic Inventory</li>
              <li className="flex items-center gap-3"><Check size={18} className="text-blue-400" /> Watermarked Invoices</li>
            </ul>
            
            <button className="w-full py-3 rounded-lg border border-slate-600 hover:bg-slate-700 font-semibold transition-colors">
              Start for Free
            </button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div 
            whileHover={{ y: -10 }}
            className="bg-blue-600 p-8 rounded-2xl shadow-2xl shadow-blue-900/50 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
              Best Value
            </div>
            <h3 className="text-2xl font-bold mb-2">Pro Manager</h3>
            <p className="text-blue-100 mb-6">For growing teams needing full control.</p>
            <div className="text-4xl font-bold mb-8">$29<span className="text-lg text-blue-200 font-normal"> / month</span></div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3"><Check size={18} className="text-white" /> Unlimited Jobs</li>
              <li className="flex items-center gap-3"><Check size={18} className="text-white" /> Advanced Analytics</li>
              <li className="flex items-center gap-3"><Check size={18} className="text-white" /> Custom Branding (No Watermark)</li>
              <li className="flex items-center gap-3"><Check size={18} className="text-white" /> Multi-user Access</li>
            </ul>
            
            <button className="w-full py-3 rounded-lg bg-white text-blue-600 font-bold hover:bg-gray-100 transition-colors">
              Subscribe Now
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Trusted by Workshops</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
    <section id="contact" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Get in Touch</h2>
            <p className="text-slate-600 mb-8 text-lg">
Whether you run a small spraying booth or a massive collision repair center, we're here to help you set up and scale. Let's talk.            </p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Phone size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Call Us</div>
                  <div className="text-slate-600">+233 (0) 24 123 4567</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Mail size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Email Us</div>
                  <div className="text-slate-600">hello@graymanager.com</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
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
            className="bg-slate-50 p-8 rounded-2xl border border-slate-200"
          >
            <div className="mb-6">
              <label className="block text-slate-700 font-semibold mb-2">Full Name</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Smith" />
            </div>
            <div className="mb-6">
              <label className="block text-slate-700 font-semibold mb-2">Email Address</label>
              <input type="email" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="john@example.com" />
            </div>
            <div className="mb-6">
              <label className="block text-slate-700 font-semibold mb-2">Message</label>
              <textarea rows={4} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="I'm interested in the Pro plan..."></textarea>
            </div>
            <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors">
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