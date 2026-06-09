import React from 'react';
import { useApp } from '../context/AppContext';
import '../styles/services.css';

const Services = () => {
  const { language } = useApp();
  const translations = {
    en: {
      title: 'Our Services',
      subtitle: 'Comprehensive Solutions for Modern Learning',
      description: 'Discover a complete ecosystem of educational tools and resources designed to enhance your learning experience.',
      services: [
        {
          id: 1,
          icon: '📖',
          title: 'Digital Resources Library',
          desc: 'Access thousands of books, articles, research papers, and educational materials across multiple disciplines.',
          features: ['10,000+ Resources', 'Multiple Languages', 'Regularly Updated', 'Free Access']
        },
        {
          id: 2,
          icon: '🎓',
          title: 'Online Courses',
          desc: 'Structured learning paths created by educational experts to help you master new skills and knowledge.',
          features: ['Self-Paced Learning', 'Certificates', 'Expert Instructors', 'Progress Tracking']
        },
        {
          id: 3,
          icon: '🔍',
          title: 'Advanced Search',
          desc: 'Powerful search tools with filters to find exactly what you\'re looking for quickly and efficiently.',
          features: ['Smart Filters', 'Keyword Search', 'Category Browse', 'Recommendations']
        },
        {
          id: 4,
          icon: '📱',
          title: 'Mobile Learning',
          desc: 'Learn on the go with our fully responsive platform available on all devices.',
          features: ['Offline Access', 'Responsive Design', 'Cross-Device Sync', 'App Available']
        },
        {
          id: 5,
          icon: '🌐',
          title: 'Multilingual Support',
          desc: 'Access content and resources in 15+ languages with full translation support.',
          features: ['15+ Languages', 'Auto-Translation', 'Cultural Relevance', 'Local Content']
        },
        {
          id: 6,
          icon: '🤝',
          title: 'Community Features',
          desc: 'Connect with learners worldwide, share ideas, and collaborate on educational projects.',
          features: ['Discussion Forums', 'Study Groups', 'Peer Learning', 'Networking']
        },
        {
          id: 7,
          icon: '🏆',
          title: 'Achievements & Badges',
          desc: 'Earn certificates and badges as you complete courses and reach learning milestones.',
          features: ['Progress Badges', 'Certificates', 'Leaderboards', 'Achievements']
        },
        {
          id: 8,
          icon: '🎙️',
          title: 'Audio Content',
          desc: 'Listen to educational podcasts, audiobooks, and narrated lessons for immersive learning.',
          features: ['Audiobooks', 'Podcasts', 'Narrated Lessons', 'Transcripts']
        }
      ],
      pricingTitle: 'Pricing Plans',
      pricingSubtitle: 'All our services are free for basic access. Premium features available for enhanced learning.',
      plans: [
        {
          name: 'Basic',
          price: 'Free',
          features: ['Unlimited Library Access', 'Basic Courses', 'Standard Support', 'Community Forums']
        },
        {
          name: 'Premium',
          price: '$9.99/mo',
          features: ['All Basic Features', 'Advanced Courses', 'Priority Support', 'Certificate Courses', 'Offline Downloads']
        },
        {
          name: 'Scholar',
          price: '$19.99/mo',
          features: ['All Premium Features', 'Expert Mentoring', 'Personalized Learning Paths', 'Advanced Analytics', 'Research Tools']
        }
      ],
      faqTitle: 'Frequently Asked Questions',
      faqs: [
        { q: 'Is Digital Library really free?', a: 'Yes! Basic access to all resources is completely free. Premium features are optional.' },
        { q: 'Can I download resources?', a: 'Premium members can download resources for offline access.' },
        { q: 'Do you offer certificates?', a: 'Yes, upon completing courses you can earn certificates.' },
        { q: 'Is my data secure?', a: 'We use enterprise-grade security to protect all user data.' }
      ],
      getStarted: 'Get Started Free'
    },
    rw: {
      title: 'Iby\'Ubwenge Bwacu',
      subtitle: 'Iby\'Ubwenge Bwacu Byose',
      description: 'Kubonana ibigoresho byose n\'iby\'ubwenge bwacu bikoreshwa gukomeza ubwenge bwacu.',
      services: [
        {
          id: 1,
          icon: '📖',
          title: 'Ibigoresho Bya Digital',
          desc: 'Kugeza ku bifu, inyandiko, ubwenge, n\'ibigoresho bya mashuri mu ururimi benshi.',
          features: ['10,000+ Ibigoresho', 'Ururimi Benshi', 'Byarakwigunzuguza', 'Isoboka']
        },
        {
          id: 2,
          icon: '🎓',
          title: 'Amasomo Online',
          desc: 'Amasomo ajejwe mu nzira yo kwiga, kagenzi ku mashuri akomeye.',
          features: ['Kwiga Umuntu', 'Inyandiko', 'Abashakashatsi', 'Kumenyekanisha']
        },
        {
          id: 3,
          icon: '🔍',
          title: 'Gushakisha Risa',
          desc: 'Ibigoresho bya gushakisha bikunzuguza gushakisha ibyo ushaka.',
          features: ['Ibigoresho', 'Ijambo Rirashaka', 'UbwCategory', 'Isesiya']
        },
        {
          id: 4,
          icon: '📱',
          title: 'Kwiga Kwa Simu',
          desc: 'Kwiga mu simu yawe mu nzira yose.',
          features: ['Ubwiyunge', 'Isomo Ryose', 'Gusimbagira', 'Porogaramu']
        },
        {
          id: 5,
          icon: '🌐',
          title: 'Ururimi Benshi',
          desc: 'Ubwige mu ururimi 15+ mu nzira yose.',
          features: ['Ururimi 15+', 'Gusambanya', 'Ubwenge Bwacu', 'Ubwige Bwacu']
        },
        {
          id: 6,
          icon: '🤝',
          title: 'Ubwige Bwacu',
          desc: 'Kuganira n\'abantu benshi ubwige bacu.',
          features: ['Ikirango Cy\'Igihe', 'Isomo Ry\'Itsinda', 'Ubwige', 'Gusangira']
        },
        {
          id: 7,
          icon: '🏆',
          title: 'Intsinzi & Ibipande',
          desc: 'Kugira intsinzi mu nzira y\'ubwige bacu.',
          features: ['Ibipande', 'Inyandiko', 'Ikinini', 'Intsinzi']
        },
        {
          id: 8,
          icon: '🎙️',
          title: 'Izina Ry\'Ubwige',
          desc: 'Kwiga mu mirongo n\'ibigoresho bya radio.',
          features: ['Bifu', 'Podikasi', 'Amasomo', 'Inyandiko']
        }
      ],
      pricingTitle: 'Igiciro',
      pricingSubtitle: 'Ubwige bwacu byose nibyariwo ku mahoro. Ibigoresho byingirakanya nibyatangira.',
      plans: [
        {
          name: 'Ibangikazi',
          price: 'Ibyariwo',
          features: ['Isoboka Byose', 'Amasomo Yibangikazi', 'Ubwigire Bwacu', 'Ikirango Cy\'Igihe']
        },
        {
          name: 'Ikigize',
          price: '$9.99/ikihe',
          features: ['Ubwire Byose', 'Amasomo Aremotse', 'Ubwigire Bwacu Ikigize', 'Inyandiko Zo Kuryamuriza', 'Ibigoresho Byo Guha']
        },
        {
          name: 'Umwigire',
          price: '$19.99/ikihe',
          features: ['Ubwire Byose Byikigize', 'Ubwigire Bwa Banyamakomoke', 'Inyandiko Yo Kwiga', 'Ubwige Bwacu', 'Ibigoresho Bya Ubwige']
        }
      ],
      faqTitle: 'Ibibazo Bikunzuguza',
      faqs: [
        { q: 'Hari ibyariwo?', a: 'Yego! Ubwige bwacu byose nibyariwo cyane.' },
        { q: 'Ninjira Ibigoresho?', a: 'Abaigize bakoresha ibigoresho byo guha ubwige bwacu.' },
        { q: 'Mujyana Inyandiko?', a: 'Yego, mu nzira y\'amasomo makiciye inyandiko.' },
        { q: 'Hari umutekano?', a: 'Tubungabunga ubwige bwacu mu nzira nzira.' }
      ],
      getStarted: 'Tangira Ibyariwo'
    }
  };

  const t = translations[language] || translations['en'];

  return (
    <div className="services-container">
      {/* Hero Section */}
      <section className="services-hero">
        <div className="container">
          <div className="services-hero-content animate-fadeIn">
            <h1>{t.title}</h1>
            <p className="services-subtitle">{t.subtitle}</p>
            <p className="services-description">{t.description}</p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="services-section">
        <div className="container">
          <div className="services-grid">
            {t.services.map((service) => (
              <div key={service.id} className="service-card card animate-slideInUp">
                <div className="service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.desc}</p>
                <ul className="service-features">
                  {service.features.map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="services-pricing">
        <div className="container">
          <h2 className="section-title">{t.pricingTitle}</h2>
          <p className="section-subtitle">{t.pricingSubtitle}</p>
          <div className="pricing-grid">
            {t.plans.map((plan, index) => (
              <div key={index} className={`pricing-card card ${index === 1 ? 'featured' : ''}`}>
                <h3>{plan.name}</h3>
                <div className="pricing-price">{plan.price}</div>
                <ul className="pricing-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
                <button className="btn btn-primary btn-full">{t.getStarted}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="services-faq">
        <div className="container">
          <h2 className="section-title">{t.faqTitle}</h2>
          <div className="faq-grid">
            {t.faqs.map((faq, index) => (
              <div key={index} className="faq-card card">
                <h4>{faq.q}</h4>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
