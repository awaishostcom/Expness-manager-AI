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
  Settings,
  Sun,
  Moon,
  Users,
  Briefcase,
  BookOpen,
  CreditCard
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from 'next-themes';

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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ledger', label: 'Cashbook Ledger', icon: BookOpen },
    { id: 'wallet', label: 'My Wallet', icon: CreditCard },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: ArrowDownLeft },
    { id: 'income', label: 'Income', icon: ArrowUpRight },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'business', label: 'Business', icon: Briefcase },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => signOut(auth);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background flex transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-[240px] bg-card border-r border-border z-50 transition-all duration-300 lg:translate-x-0 lg:static lg:block",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold tracking-tight text-primary">XPENSE.</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 px-6 space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all",
                  currentPage === item.id 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => {
                  onPageChange(item.id);
                  setIsSidebarOpen(false);
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="p-6 border-t border-border">
            <div 
              className="flex items-center gap-3 px-2 mb-6 cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors"
              onClick={() => onPageChange('settings')}
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{profile?.name}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-background/80 backdrop-blur-md flex items-center justify-between px-8 lg:px-10 sticky top-0 z-30 border-b border-border/50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              {currentPage === 'dashboard' ? `Good morning, ${profile?.name?.split(' ')[0]}` : currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full h-9 w-9"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">{profile?.name}</span>
              <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold">
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 lg:p-10 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
