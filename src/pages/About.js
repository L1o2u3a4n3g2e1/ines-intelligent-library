import React from 'react';
import { useApp } from '../context/AppContext';
import '../styles/about.css';

const About = () => {
  const { language } = useApp();
  const translations = {
    en: {
      title: 'About Digital Library',
      subtitle: 'Empowering Knowledge, Building Communities',
      description: 'Digital Library is a revolutionary platform dedicated to making quality educational resources accessible to everyone, everywhere. We believe that knowledge should never be limited by geography, economy, or circumstance.',
      missionTitle: 'Our Mission',
      missionText: 'To provide free, accessible, and high-quality digital educational resources that inspire learning and foster intellectual growth across all communities.',
      visionTitle: 'Our Vision',
      visionText: 'A world where every individual has the opportunity to learn, grow, and achieve their full potential through access to comprehensive digital resources.',
      valuesTitle: 'Our Core Values',
      values: [
        { icon: '📚', name: 'Accessibility', desc: 'Making knowledge available to everyone, regardless of background or circumstance' },
        { icon: '🌍', name: 'Inclusivity', desc: 'Serving diverse communities with culturally relevant and multilingual content' },
        { icon: '🔒', name: 'Security', desc: 'Protecting user data and ensuring safe, reliable access to resources' },
        { icon: '💡', name: 'Innovation', desc: 'Continuously improving our platform with cutting-edge technology' },
        { icon: '🤝', name: 'Community', desc: 'Building partnerships and fostering collaboration among learners' },
        { icon: '⭐', name: 'Quality', desc: 'Maintaining high standards in all our educational resources and services' }
      ],
      statsTitle: 'Our Impact',
      stats: [
        { number: '50K+', label: 'Active Users' },
        { number: '10K+', label: 'Resources' },
        { number: '15', label: 'Languages' },
        { number: '24/7', label: 'Access' }
      ],
      journeyTitle: 'Our Journey',
      journeyText: 'Founded in 2024, Digital Library has grown from a small initiative to serve a global community of learners. Our commitment to free, accessible education has helped thousands of students achieve their educational goals.',
      ctaButton: 'Start Learning Today'
    },
    rw: {
      title: 'Ku Banyamakomoke Ya Digital Library',
      subtitle: 'Gukomeza Ubwenge, Kubaka Inzira z\'Abantu',
      description: 'Digital Library ni inzira nshya iteguraga abigize umwaka munzira igikoresho cy\'amashuri akira cyane bakwa. Twibuka ko ubwenge burashobora kubonana abakuba kwa buri muntu bakwa.',
      missionTitle: 'Inzira Yacu',
      missionText: 'Gutanga imibare y\'amashuri akira cyane, isoboka, n\'ikozwe neza gufata abakwa bose, kandi gutanga nzira mpotano y\'ubwenge.',
      visionTitle: 'Icyerekezo Cyacu',
      visionText: 'Isi aho umuntu wese akaba na nzira yo kwiga, gukura, n\'kubyara ibyo akumva mu nzira y\'igikoresho cy\'amashuri akira cyane.',
      valuesTitle: 'Inzira Za Gakondo Zacu',
      values: [
        { icon: '📚', name: 'Isoboka', desc: 'Gutanga ubwenge ku buri muntu, nta mahoro yidini cyangwa inzira' },
        { icon: '🌍', name: 'Ubwenge Bwacu', desc: 'Gukoresha inzira z\'abantu n\'ururimi rwacu' },
        { icon: '🔒', name: 'Umutekano', desc: 'Kubungabunga inyuma z\'umuntu n\'kugoza ko ibigoresho nibyiza' },
        { icon: '💡', name: 'Ibisanzwe', desc: 'Kuboresha inzira yacu ku buri gihe mu ntambwe nshya' },
        { icon: '🤝', name: 'Ubwenge Bwacu', desc: 'Kubaka inzira z\'abantu n\'gukoreshanya abantu' },
        { icon: '⭐', name: 'Ubwundi Bwacu', desc: 'Kubungabunga ubwundi mu bigoresho byacu byose' }
      ],
      statsTitle: 'Iby\'Ubwenge Bwacu',
      stats: [
        { number: '50K+', label: 'Abantu Bakora' },
        { number: '10K+', label: 'Ibigoresho' },
        { number: '15', label: 'Ururimi' },
        { number: '24/7', label: 'Isoboka Rimwe' }
      ],
      journeyTitle: 'Inzira Zacu',
      journeyText: 'Kuva 2024, Digital Library yatandukira inzira nto yapisi no kurira ku bantu benshi binyuranye. Ubwenge bwacu bwo gusoboka amashuri akira cyane warakoze mu bantu benshi bakwigira.',
      ctaButton: 'Tangira Kwiga Ubu'
    }
  };

  const t = translations[language] || translations['en'];

  return (
    <div className="about-container">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <div className="about-hero-content animate-fadeIn">
            <h1>{t.title}</h1>
            <p className="about-subtitle">{t.subtitle}</p>
            <p className="about-description">{t.description}</p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="about-section">
        <div className="container">
          <div className="mission-vision-grid">
            <div className="mission-card card">
              <h2>{t.missionTitle}</h2>
              <p>{t.missionText}</p>
            </div>
            <div className="vision-card card">
              <h2>{t.visionTitle}</h2>
              <p>{t.visionText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="about-section">
        <div className="container">
          <h2 className="section-title">{t.valuesTitle}</h2>
          <div className="values-grid">
            {t.values.map((value, index) => (
              <div key={index} className="value-card card">
                <div className="value-icon">{value.icon}</div>
                <h3>{value.name}</h3>
                <p>{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="about-stats">
        <div className="container">
          <h2 className="section-title">{t.statsTitle}</h2>
          <div className="stats-grid">
            {t.stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="about-section">
        <div className="container">
          <div className="journey-content card">
            <h2>{t.journeyTitle}</h2>
            <p>{t.journeyText}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <div className="container">
          <button className="btn btn-primary btn-lg">{t.ctaButton}</button>
        </div>
      </section>
    </div>
  );
};

export default About;
