import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, BankAccount, Bill } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  ArrowLeftRight,
  CreditCard,
  Zap,
  Activity,
  DollarSign,
  Clock,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, startOfDay } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { formatCurrency } from '../lib/currency';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const transactionsQuery = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );

    const accountsQuery = query(collection(db, 'users', user.uid, 'accounts'));
    
    const billsQuery = query(collection(db, 'users', user.uid, 'bills'), where('status', '==', 'unpaid'));

    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/transactions`));

    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/accounts`));

    const unsubBills = onSnapshot(billsQuery, (snapshot) => {
      setBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/bills`));

    return () => {
      unsubTransactions();
      unsubAccounts();
      unsubBills();
    };
  }, [user]);

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && t.date.toDate() >= monthStart && t.date.toDate() <= monthEnd)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthlyExpense = transactions
    .filter(t => t.type === 'expense' && t.date.toDate() >= monthStart && t.date.toDate() <= monthEnd)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Area chart data for last 7 days
  const last7Days = eachDayOfInterval({
    start: subMonths(now, 1),
    end: now
  }).slice(-7);

  const areaData = last7Days.map(date => {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const dayExpense = transactions
      .filter(t => t.type === 'expense' && t.date.toDate() >= dayStart && t.date.toDate() <= dayEnd)
      .reduce((acc, curr) => acc + curr.amount, 0);
    return {
      name: format(date, 'MMM d'),
      value: dayExpense
    };
  });

  const categoryDataMap = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieChartData = Object.entries(categoryDataMap).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const displayCurrency = (val: number) => {
    return formatCurrency(val, profile?.currency || 'USD');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-12"
    >
      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Hello, {profile?.name?.split(' ')[0]} <span className="inline-block animate-bounce ml-1">👋</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1">Here's what's happening with your cash flow today.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Assets</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{displayCurrency(totalBalance + (profile?.walletBalance || 0))}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Balance', value: totalBalance, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+2.4%', trendUp: true },
          { label: 'Wallet Credit', value: profile?.walletBalance || 0, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Monthly Income', value: monthlyIncome, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Monthly Spent', value: monthlyExpense, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', trend: '+8%' }
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="border-none shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-3xl group transition-all hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-3 rounded-2xl", stat.bg)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                  {stat.trend && (
                    <Badge variant={stat.trendUp ? "outline" : "outline"} className={cn(
                      "rounded-lg border-none font-bold text-xs",
                      stat.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {stat.trend}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{displayCurrency(stat.value)}</h3>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-none shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-3xl h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Spending Flow</CardTitle>
                <p className="text-sm text-slate-500 font-medium mt-1">Daily expense tracking for the last 7 days</p>
              </div>
              <Activity className="h-5 w-5 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }} 
                      tickFormatter={(val) => `$${val}`} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="var(--primary)" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Categories */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-3xl h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black tracking-tight tracking-tight">Category Mix</CardTitle>
              <p className="text-sm text-slate-500 font-medium">Where your money goes</p>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: 'var(--shadow-xl)',
                        fontSize: '12px'
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {pieChartData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{displayCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Recent Activity</CardTitle>
                <p className="text-sm text-slate-500 font-medium">Last 5 operations</p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary font-black uppercase tracking-widest text-[10px] h-8 px-3">
                View All <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-2">
              <div className="space-y-1">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic font-medium">No transactions yet</div>
                ) : (
                  transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                          t.type === 'income' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownLeft className="h-6 w-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.category}</span>
                            <span className="h-1 w-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(t.date.toDate(), 'MMM d')}</span>
                          </div>
                        </div>
                      </div>
                      <p className={cn(
                        "text-lg font-black tabular-nums tracking-tighter",
                        t.type === 'income' ? "text-emerald-600" : "text-slate-900 dark:text-white"
                      )}>
                        {t.type === 'income' ? '+' : '-'}{displayCurrency(t.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Bills */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-3xl h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Upcoming Payments</CardTitle>
                <p className="text-sm text-slate-500 font-medium">Bills due soon</p>
              </div>
              <Clock className="h-5 w-5 text-slate-300" />
            </CardHeader>
            <CardContent className="px-2">
              <div className="space-y-1">
                {bills.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic font-medium">No upcoming bills</div>
                ) : (
                  bills.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-4 text-left">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{b.title}</p>
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> Due {format(b.dueDate.toDate(), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{displayCurrency(b.amount)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{b.frequency}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {bills.length > 5 && (
                <div className="p-4 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">+{bills.length - 5} more pending bills</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
