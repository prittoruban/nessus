"use client";


import Sidebar from "@/components/Sidebar";
import BackToTop from "@/components/BackToTop";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-0 ml-0 overflow-y-auto">
        {/* Mobile menu button spacer */}
        <div className="lg:hidden h-16 bg-transparent"></div>

        {/* Main content with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="min-h-full"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
              {children}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Back to Top Button */}
        <BackToTop />
      </main>
    </div>
  );
}
