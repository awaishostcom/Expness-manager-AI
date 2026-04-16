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
import { Transaction, BankAccount } from '../types';
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
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  ArrowLeftRight,
  CreditCard
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '../../lib/utils';

import { formatCurrency } from '../lib/currency';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const transactionsQuery = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc'),
      limit(20)
    );

    const accountsQuery = query(collection(db, 'users', user.uid, 'accounts'));

    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'accounts'));

    return () => {
      unsubTransactions();
      unsubAccounts();
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

  const barChartData = [
    { name: 'Income', value: monthlyIncome },
    { name: 'Expenses', value: monthlyExpense },
  ];

  // Category breakdown for Pie Chart
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

  return (
    <div className="space-y-8 pb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-card border-border shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Balance</p>
              <Wallet className="h-4 w-4 text-primary opacity-50" />
            </div>
            <div className="text-2xl font-bold text-foreground">{displayCurrency(totalBalance)}</div>
            <p className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +2.4% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Wallet Balance</p>
              <CreditCard className="h-4 w-4 text-primary opacity-50" />
            </div>
            <div className="text-2xl font-bold text-foreground">{displayCurrency(profile?.walletBalance || 0)}</div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">Available for transfers</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Income</p>
              <ArrowUpRight className="h-4 w-4 text-emerald-500 opacity-50" />
            </div>
            <div className="text-2xl font-bold text-foreground">{displayCurrency(monthlyIncome)}</div>
            <p className="text-[11px] text-emerald-500 font-medium mt-1">On track</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Expenses</p>
              <ArrowDownLeft className="h-4 w-4 text-rose-500 opacity-50" />
            </div>
            <div className="text-2xl font-bold text-foreground">{displayCurrency(monthlyExpense)}</div>
            <p className="text-[11px] text-rose-500 font-medium mt-1">8% higher than average</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {/* Bar Chart */}
        <Card className="xl:col-span-2 border-border shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">Spending Overview</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-primary/20" />
                <span className="text-[10px] text-muted-foreground">Income</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-[10px] text-muted-foreground">Expense</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)', 
                      boxShadow: 'none',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? 'var(--primary-foreground)' : 'var(--primary)'} stroke="var(--primary)" strokeWidth={entry.name === 'Income' ? 1 : 0} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border-border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] md:h-[300px] w-full">
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
                      backgroundColor: 'var(--card)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)', 
                      boxShadow: 'none',
                      fontSize: '12px'
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieChartData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="xl:col-span-3 border-border shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">Recent Transactions</CardTitle>
            <button className="text-xs text-primary font-medium hover:underline">View All</button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {transactions.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-muted-foreground italic text-sm">No transactions yet</div>
              ) : (
                transactions.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 md:last:border-b">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        t.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                      )}>
                        {t.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-foreground">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase tracking-tight">
                            {t.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{format(t.date.toDate(), 'MMM d')}</span>
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "text-sm font-bold",
                      t.type === 'income' ? "text-emerald-500" : "text-foreground"
                    )}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
