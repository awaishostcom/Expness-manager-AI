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
import { Plus, ArrowUpRight, ArrowDownLeft, Search, Filter, MoreVertical, Pencil, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { cn } from '../../lib/utils';

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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const unsubA = onSnapshot(aQ, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'accounts'));

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

      toast.success(editingTransaction ? 'Transaction updated' : 'Transaction added');
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error('Failed to save transaction: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (t: Transaction) => {
    if (!user || !confirm('Are you sure?')) return;
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
      toast.success('Transaction deleted');
    } catch (error) {
      toast.error('Failed to delete transaction');
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">Transactions</h2>
          <p className="text-sm text-slate-500">Track your income and expenses</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium h-auto gap-2">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                        type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"
                      )}
                      onClick={() => setType('expense')}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                        type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                      )}
                      onClick={() => setType('income')}
                    >
                      Income
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grocery Shopping" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal rounded-lg border-slate-200",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  } />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details..." />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading || !accountId}>
                  {loading ? 'Processing...' : editingTransaction ? 'Update Transaction' : 'Save Transaction'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search transactions..." 
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="w-[130px] bg-white">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400 italic">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 border-slate-50 group">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-slate-900">{t.title}</span>
                        <span className="text-[11px] text-slate-400">{accounts.find(a => a.id === t.accountId)?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-tight",
                        t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {t.category}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-[13px] text-slate-500">
                      {format(t.date.toDate(), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className={cn(
                      "px-6 py-4 text-[13px] font-bold text-right",
                      t.type === 'income' ? "text-emerald-500" : "text-slate-900"
                    )}>
                      {t.type === 'income' ? '+' : '-'}{displayCurrency(t.amount)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="rounded-lg border-slate-200">
                          <DropdownMenuItem className="text-xs font-medium" onClick={() => handleEdit(t)}>
                            <Pencil className="mr-2 h-3 w-3" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-xs font-medium text-red-600 focus:text-red-600"
                            onClick={() => handleDelete(t)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
