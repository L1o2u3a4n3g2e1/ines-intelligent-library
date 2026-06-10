import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import AIAssistant from '../components/ai/AIAssistant';
import { useApp } from '../context/AppContext';

export default function MainLayout({ children, hideSidebar = false }) {
  const { user } = useApp();
  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {user && !hideSidebar && <Sidebar />}
        <motion.main
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="flex-1 overflow-y-auto min-h-0">
          {children}
        </motion.main>
      </div>
      {user && <AIAssistant floating />}
    </div>
  );
}
