"use client";

import Sidebar from "@/components/Sidebar";
import BackToTop from "@/components/BackToTop";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-0 ml-0 overflow-y-auto">
        {/* Mobile menu button spacer */}
        <div className="lg:hidden h-16 bg-transparent"></div>

        {/* Main content */}
        <div className="min-h-full">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
            {children}
          </div>
        </div>

        {/* Back to Top Button */}
        <BackToTop />
      </main>
    </div>
  );
}
