import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  PieChart, 
  LogOut,
  Menu,
  X,
  TrendingUp,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Users,
  Briefcase,
  BookOpen,
  CreditCard,
  ArrowLeftRight,
  Shield,
  Zap,
  Activity,
  Bell,
  Search
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'transactions', label: 'Audit Ledger', icon: ArrowLeftRight },
    { id: 'ledger', label: 'Cashbook', icon: BookOpen },
    { id: 'wallet', label: 'Financial Wallet', icon: CreditCard },
    { id: 'accounts', label: 'Capital Nodes', icon: Wallet },
    { id: 'budgets', label: 'Thresholds', icon: PieChart },
    { id: 'bills', label: 'Liabilities', icon: Receipt },
    { id: 'staff', label: 'Personnel', icon: Users },
    { id: 'settings', label: 'Configuration', icon: SettingsIcon },
  ];

  const handleLogout = () => signOut(auth);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex transition-colors duration-500 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-md"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -280 : 0)
        }}
        className={cn(
          "fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-[70] transition-all duration-300 lg:static lg:block shadow-2xl lg:shadow-none"
        )}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                <Zap className="h-5 w-5 text-white fill-current" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">XPENSE.</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden rounded-xl h-10 w-10" 
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-3 italic">Main Operations</p>
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-4 h-12 px-4 rounded-2xl text-[13px] font-black uppercase tracking-tight transition-all relative group",
                  currentPage === item.id 
                    ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xl" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                )}
                onClick={() => {
                  onPageChange(item.id);
                  setIsSidebarOpen(false);
                }}
              >
                <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", currentPage === item.id ? "text-primary" : "")} />
                {item.label}
                {currentPage === item.id && (
                  <motion.div layoutId="navActive" className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                )}
              </Button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div 
              className="flex items-center gap-4 px-4 py-4 rounded-[28px] bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
              onClick={() => onPageChange('settings')}
            >
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-900 dark:text-white font-black text-sm italic group-hover:rotate-6 transition-transform">
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{profile?.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate italic">Active Node</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-4 h-12 px-4 mt-4 rounded-2xl text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all italic"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Disconnect
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen relative bg-slate-50 dark:bg-black">
        <header className="h-24 bg-slate-50/80 dark:bg-black/80 backdrop-blur-2xl flex items-center justify-between px-8 lg:px-12 sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="hidden md:block">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                {currentPage === 'dashboard' 
                  ? `System Ready, ${profile?.name?.split(' ')[0]}` 
                  : navItems.find(i => i.id === currentPage)?.label || currentPage}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Operational</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 h-12 px-4 gap-3 w-64 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
               <Search className="h-4 w-4 text-slate-400" />
               <input className="bg-transparent border-none outline-none text-xs font-bold w-full uppercase tracking-tight placeholder:italic" placeholder="System Search..." />
             </div>
             
             <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm relative">
                <Bell className="h-5 w-5" />
                <div className="absolute top-3 right-3 h-2 w-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
              </Button>
              
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="rounded-2xl h-12 w-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:rotate-12"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 lg:p-12 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <motion.div 
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>

        {/* Global Activity Background Accents */}
        <div className="absolute bottom-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none">
           <Activity className="h-96 w-96 rotate-12" />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
      ` }} />
    </div>
  );
};
