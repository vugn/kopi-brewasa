import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Philosophy from './components/Philosophy';
import Menu from './components/Menu';
import Vibe from './components/Vibe';
import Footer from './components/Footer';
import AiBarista from './components/AiBarista';

function App() {
  return (
    <div className="font-sans antialiased text-gray-900 bg-[#F7E9D3] min-h-screen selection:bg-brewasa-copper selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <Philosophy />
        <Menu />
        <Vibe />
      </main>
      <Footer />
      <AiBarista />
    </div>
  );
}

export default App;