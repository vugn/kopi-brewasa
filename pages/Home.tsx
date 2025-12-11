import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Philosophy from '../components/Philosophy';
import Menu from '../components/Menu';
import Vibe from '../components/Vibe';
import Footer from '../components/Footer';
import AiBarista from '../components/AiBarista';
import Location from '../components/Location';
import Contact from '../components/Contact';
import PojokCerita from '../components/PojokCerita';
import CartFloatingButton from '../components/CartFloatingButton';
import CartDrawer from '../components/CartDrawer';

import AnnouncementBar from '../components/AnnouncementBar';

const Home: React.FC = () => {
    return (
        <div className="font-sans antialiased text-gray-900 bg-[#F7E9D3] min-h-screen selection:bg-brewasa-copper selection:text-white">
            <AnnouncementBar />
            <Navbar />
            <main>
                <Hero />
                <Philosophy />
                <Menu />
                <PojokCerita />
                <Vibe />
                <Location />
                <Contact />
            </main>
            <Footer />
            <CartFloatingButton />
            <CartDrawer />
            <AiBarista />
        </div>
    );
};

export default Home;
