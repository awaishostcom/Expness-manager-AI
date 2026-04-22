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
  runTransaction,
  where
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
import { Plus, ArrowUpRight, Search, Filter, MoreVertical, Pencil, Trash2, Calendar as CalendarIcon, ArrowRight, TrendingUp, Briefcase, Zap, CreditCard, Shapes } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../lib/currency';
import { motion, AnimatePresence } from 'motion/react';

export const Income: React.FC = () => {
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
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    'Salary', 'Business', 'Investment', 'Freelance', 'Gift', 'Other'
  ];

  useEffect(() => {
    if (!user) return;
    const tQ = query(
      collection(db, 'users', user.uid, 'transactions'), 
      where('type', '==', 'income'),
      orderBy('date', 'desc')
    );
    const aQ = query(collection(db, 'users', user.uid, 'accounts'));

    const unsubT = onSnapshot(tQ, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/transactions`));

    const unsubA = onSnapshot(aQ, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/accounts`));

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
    setNotes('');
    setAttachmentUrl('');
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
      type: 'income',
      notes,
      attachmentUrl,
      userId: user.uid
    };

    try {
      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);
        const accountDoc = await transaction.get(accountRef);
        
        if (!accountDoc.exists()) throw new Error("Financial node does not exist!");

        const currentBalance = accountDoc.data().balance;
        let newBalance = currentBalance;

        if (editingTransaction) {
          newBalance -= editingTransaction.amount;
          newBalance += amountNum;
          transaction.update(doc(db, 'users', user.uid, 'transactions', editingTransaction.id), transactionData);
        } else {
          newBalance += amountNum;
          transaction.set(doc(collection(db, 'users', user.uid, 'transactions')), transactionData);
        }

        transaction.update(accountRef, { balance: newBalance });
      });

      toast.success(editingTransaction ? 'Resource capture adjusted' : 'Capital inflow recorded');
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save Income Error:', error);
      handleFirestoreError(error, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/transactions`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (t: Transaction) => {
    if (!user || !confirm('Permanently nullify this capital inflow record?')) return;
    try {
      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, 'users', user.uid, 'accounts', t.accountId);
        const accountDoc = await transaction.get(accountRef);
        
        if (accountDoc.exists()) {
          const currentBalance = accountDoc.data().balance;
          const newBalance = currentBalance - t.amount;
          transaction.update(accountRef, { balance: newBalance });
        }
        transaction.delete(doc(db, 'users', user.uid, 'transactions', t.id));
      });
      toast.success('Record nullified');
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
    setNotes(t.notes || '');
    setIsDialogOpen(true);
  };

  const filteredTransactions = transactions.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayCurrency = (val: number) => {
    return formatCurrency(val, profile?.currency || 'USD');
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Capital Inflow</h2>
          <p className="text-sm text-slate-500 font-medium">Capture and monitor your revenue streams</p>
        </motion.div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="h-12 rounded-2xl font-black px-8 shadow-lg shadow-emerald-500/20 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white uppercase tracking-tight italic">
              <Plus className="h-5 w-5" /> Record Inflow
            </Button>
          } />
          <DialogContent className="sm:max-w-xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
            <div className="bg-emerald-500 p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                 <ArrowUpRight className="h-24 w-24" />
               </div>
               <DialogTitle className="text-3xl font-black uppercase italic tracking-tight">Inflow Protocol</DialogTitle>
               <p className="text-emerald-100/70 text-sm font-bold italic">Register a new capital acquisition event</p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Absorption Magnitude</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-500">{profile?.currency === 'PKR' ? 'Rs' : '$'}</span>
                    <Input className="pl-12 h-14 rounded-2xl font-black text-lg bg-slate-50 dark:bg-slate-900 border-none" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                  </div>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Channel Classification</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold">
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl">
                      {categories.map(c => <SelectItem key={c} value={c} className="rounded-xl">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Source Alias (Title)</Label>
                <Input className="h-14 rounded-2xl font-black bg-slate-50 dark:bg-slate-900 border-none px-6" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Project Settlement" required />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Destination Node</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold">
                      <SelectValue placeholder="Select node..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl">
                      {accounts.map(a => <SelectItem key={a.id} value={a.id} className="rounded-xl">{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Temporal Marker</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant="ghost"
                        className="w-full h-14 justify-start text-left font-bold rounded-2xl bg-slate-50 dark:bg-slate-900 border-none"
                      >
                        <CalendarIcon className="mr-3 h-5 w-5 text-slate-400" />
                        {date ? format(date, "PPP") : <span className="text-slate-400 italic">Select temporal point</span>}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl overflow-hidden" align="start">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Supplemental Data (Notes)</Label>
                <Input className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-900 border-none px-6" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional context..." />
              </div>

              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black bg-emerald-500 hover:bg-emerald-600 text-white group" disabled={loading || !accountId}>
                  {loading ? 'Validating...' : editingTransaction ? 'Calibrate record' : 'Initialize Inflow'}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none dark:border dark:border-slate-800 rounded-[40px] overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="p-8 pb-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Filter capital inflow logs..." 
              className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold placeholder:italic"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Financial Acquisition</TableHead>
                  <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Classification</TableHead>
                  <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Temporal Stamp</TableHead>
                  <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right text-slate-400 italic">Valuation</TableHead>
                  <TableHead className="px-8 py-6 w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-24 text-center">
                        <Shapes className="mx-auto h-16 w-16 text-slate-100 dark:text-slate-800 mb-6" />
                        <p className="text-slate-400 font-black uppercase italic tracking-widest px-8">No matching capital inflow records found within the current scan range.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t, index) => (
                      <motion.tr 
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800 transition-colors last:border-none"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-100 dark:border-emerald-500/20 group-hover:rotate-6 transition-transform">
                               <ArrowUpRight className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{t.title}</span>
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-3 w-3 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{accounts.find(a => a.id === t.accountId)?.name || 'Unknown Node'}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <span className="text-[10px] px-3 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black font-black uppercase tracking-widest italic translate-y-1 inline-block">
                            {t.category}
                          </span>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest">
                          {format(t.date.toDate(), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="px-8 py-6 text-2xl font-black text-right text-emerald-500 tabular-nums tracking-tighter italic">
                          +{displayCurrency(t.amount)}
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white dark:hover:bg-slate-900 shadow-sm border border-transparent hover:border-slate-100 transition-all">
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="rounded-2xl shadow-xl w-44 p-2 border-none">
                              <DropdownMenuItem className="rounded-xl px-4 py-2 font-bold text-xs gap-3" onClick={() => handleEdit(t)}>
                                <Pencil className="h-4 w-4" /> Recalibrate
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-xl px-4 py-2 font-bold text-xs gap-3 text-rose-500 focus:text-rose-500 focus:bg-rose-50"
                                onClick={() => handleDelete(t)}
                              >
                                <Trash2 className="h-4 w-4" /> Nullify
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
