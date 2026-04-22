import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, BankAccount } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Plus, ArrowUpRight, ArrowDownLeft, Search, Filter, MoreVertical, Pencil, Trash2, Calendar as CalendarIcon, Tag, CreditCard, ChevronRight, Download, ReceiptText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/currency';

export const Transactions: React.FC = () => {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [notes, setNotes] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const categories = [
    'Salary', 'Business', 'Investment', 'Food', 'Bills', 'Travel', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'
  ];

  useEffect(() => {
    if (!user) return;
    const tQ = query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
    const aQ = query(collection(db, 'users', user.uid, 'accounts'));

    const unsubT = onSnapshot(tQ, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/transactions`));

    const unsubA = onSnapshot(aQ, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/accounts`));

    return () => {
      unsubT();
      unsubA();
    };
  }, [user]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory('');
    setDate(new Date());
    setAccountId('');
    setType('expense');
    setNotes('');
    setEditingTransaction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accountId) return;
    setLoading(true);

    const amountNum = parseFloat(amount);
    const transactionData = {
      title,
      amount: amountNum,
      category,
      date: Timestamp.fromDate(date),
      accountId,
      type,
      notes,
      userId: user.uid
    };

    try {
      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);
        const accountDoc = await transaction.get(accountRef);
        
        if (!accountDoc.exists()) throw new Error("Account does not exist!");

        const currentBalance = accountDoc.data().balance;
        let newBalance = currentBalance;

        if (editingTransaction) {
          // Revert old transaction
          if (editingTransaction.type === 'income') newBalance -= editingTransaction.amount;
          else newBalance += editingTransaction.amount;
          
          // Apply new transaction
          if (type === 'income') newBalance += amountNum;
          else newBalance -= amountNum;

          transaction.update(doc(db, 'users', user.uid, 'transactions', editingTransaction.id), transactionData);
        } else {
          // Apply new transaction
          if (type === 'income') newBalance += amountNum;
          else newBalance -= amountNum;

          transaction.set(doc(collection(db, 'users', user.uid, 'transactions')), transactionData);
        }

        transaction.update(accountRef, { balance: newBalance });
      });

      toast.success(editingTransaction ? 'Transaction synchronized' : 'Transaction committed');
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save Transaction Error:', error);
      handleFirestoreError(error, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/transactions`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (t: Transaction) => {
    if (!user || !confirm('Permanently redact this transaction?')) return;
    try {
      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, 'users', user.uid, 'accounts', t.accountId);
        const accountDoc = await transaction.get(accountRef);
        
        if (accountDoc.exists()) {
          const currentBalance = accountDoc.data().balance;
          const newBalance = t.type === 'income' ? currentBalance - t.amount : currentBalance + t.amount;
          transaction.update(accountRef, { balance: newBalance });
        }
        transaction.delete(doc(db, 'users', user.uid, 'transactions', t.id));
      });
      toast.success('Transaction redacted');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/transactions/${t.id}`);
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setTitle(t.title);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setDate(t.date.toDate());
    setAccountId(t.accountId);
    setType(t.type);
    setNotes(t.notes || '');
    setIsDialogOpen(true);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const displayCurrency = (val: number) => {
    return formatCurrency(val, profile?.currency || 'USD');
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Audit Ledger</h2>
          <p className="text-sm text-slate-500 font-medium">Track your global movement of capital</p>
        </motion.div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" className="h-12 rounded-2xl font-bold gap-2 px-6 border-slate-200 dark:border-slate-800">
            <Download className="h-5 w-5" /> Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger render={
              <Button className="h-12 rounded-2xl font-black px-8 shadow-lg shadow-primary/20 gap-2">
                <Plus className="h-5 w-5" /> New Record
              </Button>
            } />
            <DialogContent className="sm:max-w-[550px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
              <div className={cn("p-6 text-white transition-colors duration-500", type === 'income' ? 'bg-emerald-600' : 'bg-slate-900')}>
                <DialogTitle className="text-2xl font-bold">{editingTransaction ? 'Modify Record' : 'Commit New Record'}</DialogTitle>
                <p className="opacity-70 text-sm font-medium italic">Double-entry accounting record</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Flow Direction</Label>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        className={cn(
                          "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                          type === 'expense' ? "bg-white dark:bg-slate-700 text-rose-600 shadow-sm" : "text-slate-500"
                        )}
                        onClick={() => setType('expense')}
                      >
                        Expense
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                          type === 'income' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-slate-500"
                        )}
                        onClick={() => setType('income')}
                      >
                        Income
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asset Value</Label>
                    <Input className="h-12 rounded-xl font-black text-lg" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary Title</Label>
                  <div className="relative">
                    <ReceiptText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10 h-12 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Corporate Dividends" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Allocation Map</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map(c => <SelectItem key={c} value={c} className="rounded-lg">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asset Source</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {accounts.map(a => <SelectItem key={a.id} value={a.id} className="rounded-lg">{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Log Date</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button
                          variant="outline"
                          className="w-full h-12 justify-start text-left font-bold rounded-xl border-slate-200"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      } />
                      <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl" align="start">
                        <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Internal Reference</Label>
                    <Input className="h-12 rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ref #" />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black" disabled={loading || !accountId}>
                    {loading ? 'Committing...' : editingTransaction ? 'Verify & Update' : 'Seal Transaction'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none dark:border dark:border-slate-800 rounded-[40px] overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="Query database records..." 
                className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-inner">
                <Tag className="h-4 w-4 text-primary" />
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="w-[140px] border-none bg-transparent h-8 font-black uppercase text-[10px] tracking-widest">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="rounded-lg">Universal</SelectItem>
                    <SelectItem value="income" className="rounded-lg">Assets In</SelectItem>
                    <SelectItem value="expense" className="rounded-lg">Assets Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/30 dark:bg-slate-800/20">
                <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Movement & Source</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Map ID</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Timestamp</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Value Delta</TableHead>
                  <TableHead className="w-[80px] pr-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center animate-pulse">
                            <Search className="h-6 w-6 text-slate-200 dark:text-slate-700" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No Database Matches found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t, index) => (
                      <motion.tr 
                        key={t.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform",
                              t.type === 'income' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                            )}>
                              {t.type === 'income' ? <ArrowDownLeft className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-line-white tracking-tight italic uppercase">{t.title}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <CreditCard className="h-3 w-3 text-slate-300" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {accounts.find(a => a.id === t.accountId)?.name || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <span className={cn(
                            "text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] shadow-sm whitespace-nowrap",
                            t.type === 'income' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {t.category}
                          </span>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-300 tracking-tight">
                              {format(t.date.toDate(), 'MMM d, yyyy')}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                              {format(t.date.toDate(), 'HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "px-8 py-6 text-right tabular-nums",
                          t.type === 'income' ? "text-emerald-600" : "text-slate-900 dark:text-white"
                        )}>
                          <div className="flex flex-col items-end">
                            <span className="text-xl font-black tracking-tighter leading-none">
                              {t.type === 'income' ? '+' : '-'}{displayCurrency(t.amount)}
                            </span>
                            {t.notes && <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Ref: {t.notes}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 pr-8 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="rounded-2xl shadow-xl w-44 p-2 border-none">
                              <DropdownMenuItem className="rounded-xl px-4 py-2 font-bold text-xs gap-3" onClick={() => handleEdit(t)}>
                                <Pencil className="h-4 w-4" /> Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-xl px-4 py-2 font-bold text-xs gap-3 text-rose-500 focus:text-rose-500 focus:bg-rose-50"
                                onClick={() => handleDelete(t)}
                              >
                                <Trash2 className="h-4 w-4" /> Redact Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
