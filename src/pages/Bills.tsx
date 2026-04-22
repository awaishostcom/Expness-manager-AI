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
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Bill } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Plus, Receipt, Calendar as CalendarIcon, CheckCircle2, Circle, MoreVertical, Pencil, Trash2, Bell } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { formatCurrency } from '../lib/currency';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { cn } from '../../lib/utils';

export const Bills: React.FC = () => {
  const { user, profile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [recurring, setRecurring] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'bills'), orderBy('dueDate'));
    const unsub = onSnapshot(q, (snapshot) => {
      setBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bills'));
    return () => unsub();
  }, [user]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDueDate(new Date());
    setRecurring(false);
    setCompanyName('');
    setCategory('');
    setReferenceId('');
    setFrequency('monthly');
    setEditingBill(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const billData = {
      title,
      amount: parseFloat(amount),
      dueDate: Timestamp.fromDate(dueDate),
      status: editingBill ? editingBill.status : 'unpaid',
      recurring,
      companyName,
      category,
      referenceId,
      frequency,
      userId: user.uid
    };

    try {
      if (editingBill) {
        await updateDoc(doc(db, 'users', user.uid, 'bills', editingBill.id), billData);
        toast.success('Bill updated');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'bills'), billData);
        toast.success('Bill added');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save Bill Error:', error);
      try {
        handleFirestoreError(error, editingBill ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/bills`);
      } catch (e: any) {
        toast.error('Failed to save bill: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (bill: Bill) => {
    if (!user) return;
    const newStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
    try {
      await updateDoc(doc(db, 'users', user.uid, 'bills', bill.id), { status: newStatus });
      toast.success(`Bill marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bills', id));
      toast.success('Bill deleted');
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setTitle(bill.title);
    setAmount(bill.amount.toString());
    setDueDate(bill.dueDate.toDate());
    setRecurring(bill.recurring);
    setIsDialogOpen(true);
  };

  const displayCurrency = (val: number) => {
    return formatCurrency(val, profile?.currency || 'USD');
  };

  const upcomingBills = bills.filter(b => b.status === 'unpaid');
  const totalUpcoming = upcomingBills.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">Bills & Recurring</h2>
          <p className="text-sm text-slate-500">Manage your upcoming payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium h-auto gap-2">
              <Plus className="h-4 w-4" />
              Add Bill
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{editingBill ? 'Edit Bill' : 'New Bill'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Bill Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Internet Bill" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. AT&T" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Utilities" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ref">Reference ID</Label>
                  <Input id="ref" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="e.g. #12345" />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal rounded-lg border-slate-200",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  } />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={(d) => d && setDueDate(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center space-x-2 py-2">
                <input 
                  type="checkbox" 
                  id="recurring" 
                  checked={recurring} 
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="recurring" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Recurring monthly bill
                </Label>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Saving...' : editingBill ? 'Update Bill' : 'Add Bill'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <Card className="bg-primary text-white border-none shadow-lg shadow-primary/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">Upcoming Total</p>
              <p className="text-3xl font-bold">{displayCurrency(totalUpcoming)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{upcomingBills.length} unpaid bills</p>
            <p className="text-xs text-primary-foreground/60">Keep track of your due dates</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {bills.length === 0 ? (
          <div className="text-center py-12 text-slate-400 italic bg-white rounded-xl border border-slate-200">
            No bills added yet
          </div>
        ) : (
          bills.map((bill) => {
            const isOverdue = bill.status === 'unpaid' && isAfter(new Date(), bill.dueDate.toDate());
            return (
              <Card key={bill.id} className={cn(
                "border-slate-200 shadow-sm transition-all hover:shadow-md",
                bill.status === 'paid' ? "opacity-60" : ""
              )}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleStatus(bill)}
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                        bill.status === 'paid' ? "bg-emerald-500 text-white" : "border-2 border-slate-200 text-transparent hover:border-primary"
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-bold text-slate-900",
                          bill.status === 'paid' ? "line-through text-slate-400" : ""
                        )}>{bill.title}</p>
                        {bill.recurring && <Badge variant="secondary" className="text-[10px] h-4">Recurring</Badge>}
                        {isOverdue && <Badge variant="destructive" className="text-[10px] h-4 animate-pulse">Overdue</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        Due {format(bill.dueDate.toDate(), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={cn(
                        "font-bold",
                        bill.status === 'paid' ? "text-slate-400" : "text-slate-900"
                      )}>{displayCurrency(bill.amount)}</p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        bill.status === 'paid' ? "text-emerald-500" : "text-rose-500"
                      )}>{bill.status}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(bill)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(bill.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
