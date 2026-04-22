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
import { Plus, ArrowDownLeft, Search, Filter, MoreVertical, Pencil, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { cn } from '../../lib/utils';

import { formatCurrency } from '../lib/currency';

export const Expenses: React.FC = () => {
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
    'Food', 'Bills', 'Travel', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'
  ];

  useEffect(() => {
    if (!user) return;
    const tQ = query(
      collection(db, 'users', user.uid, 'transactions'), 
      where('type', '==', 'expense'),
      orderBy('date', 'desc')
    );
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
      type: 'expense',
      notes,
      attachmentUrl,
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
          newBalance += editingTransaction.amount;
          newBalance -= amountNum;
          transaction.update(doc(db, 'users', user.uid, 'transactions', editingTransaction.id), transactionData);
        } else {
          newBalance -= amountNum;
          transaction.set(doc(collection(db, 'users', user.uid, 'transactions')), transactionData);
        }

        transaction.update(accountRef, { balance: newBalance });
      });

      toast.success(editingTransaction ? 'Expense updated' : 'Expense added');
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save Expense Error:', error);
      try {
        handleFirestoreError(error, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/transactions`);
      } catch (e: any) {
        toast.error('Failed to save expense: ' + e.message);
      }
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
          const newBalance = currentBalance + t.amount;
          transaction.update(accountRef, { balance: newBalance });
        }
        transaction.delete(doc(db, 'users', user.uid, 'transactions', t.id));
      });
      toast.success('Expense deleted');
    } catch (error) {
      toast.error('Failed to delete expense');
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
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Expenses</h2>
          <p className="text-sm text-muted-foreground">Manage and track your spending</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium h-auto gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Expense' : 'New Expense'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                </div>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grocery Shopping" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal rounded-lg border-border",
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment">Attachment URL (Receipt/Screenshot)</Label>
                <Input id="attachment" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://..." />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading || !accountId}>
                  {loading ? 'Processing...' : editingTransaction ? 'Update Expense' : 'Save Expense'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              className="pl-9 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/50 border-border group">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{t.title}</span>
                        <span className="text-[11px] text-muted-foreground">{accounts.find(a => a.id === t.accountId)?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase tracking-tight">
                        {t.category}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {format(t.date.toDate(), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-bold text-right text-foreground">
                      -{displayCurrency(t.amount)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="rounded-lg border-border">
                          <DropdownMenuItem className="text-xs font-medium" onClick={() => handleEdit(t)}>
                            <Pencil className="mr-2 h-3 w-3" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-xs font-medium text-destructive focus:text-destructive"
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
