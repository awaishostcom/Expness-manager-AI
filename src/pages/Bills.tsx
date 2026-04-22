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
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Bell, 
  Hash,
  Building2,
  Tag,
  Clock,
  ArrowRight
} from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { formatCurrency } from '../lib/currency';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/bills`));
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
        toast.success('Bill updated successfully');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'bills'), billData);
        toast.success('Bill added successfully');
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
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/bills/${bill.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this bill?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bills', id));
      toast.success('Bill deleted');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/bills/${id}`);
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setTitle(bill.title);
    setAmount(bill.amount.toString());
    setDueDate(bill.dueDate.toDate());
    setRecurring(bill.recurring);
    setCompanyName(bill.companyName || '');
    setCategory(bill.category || '');
    setReferenceId(bill.referenceId || '');
    setFrequency(bill.frequency);
    setIsDialogOpen(true);
  };

  const displayCurrency = (val: number) => {
    return formatCurrency(val, profile?.currency || 'USD');
  };

  const upcomingBills = bills.filter(b => b.status === 'unpaid');
  const totalUpcoming = upcomingBills.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Bills & Recurring</h2>
          <p className="text-sm text-slate-500 font-medium">Keep your subscriptions and utilities under control</p>
        </motion.div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 py-6 h-auto shadow-lg shadow-primary/20 gap-2 font-bold transition-all hover:scale-105 active:scale-95">
              <Plus className="h-5 w-5" />
              Add Bill
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-primary p-6 text-primary-foreground">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{editingBill ? 'Edit Bill' : 'New Bill Entry'}</DialogTitle>
                <DialogDescription className="text-primary-foreground/70">
                  {editingBill ? 'Update your recurring payment details' : 'Set up a new recurring or one-time payment'}
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-400">Bill Title</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="title" className="pl-10 h-12 rounded-xl border-slate-200 focus:ring-primary" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. WiFi Bill" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-xs font-bold uppercase tracking-wider text-slate-400">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="company" className="pl-10 h-12 rounded-xl border-slate-200 focus:ring-primary" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Comcast" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-slate-400">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                    <Input id="amount" type="number" step="0.01" className="pl-8 h-12 rounded-xl border-slate-200 focus:ring-primary" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-400">Category</Label>
                  <Input id="category" className="h-12 rounded-xl border-slate-200 focus:ring-primary" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Utilities" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="ref" className="text-xs font-bold uppercase tracking-wider text-slate-400">Reference / Account #</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="ref" className="pl-10 h-12 rounded-xl border-slate-200 focus:ring-primary" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="e.g. #12345" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Frequency</Label>
                  <select 
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 items-end pb-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Due Date</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal rounded-xl border-slate-200",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={(d) => d && setDueDate(d)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex items-center space-x-3 h-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <input 
                    type="checkbox" 
                    id="recurring" 
                    checked={recurring} 
                    onChange={(e) => setRecurring(e.target.checked)}
                    className="h-4 w-4 rounded-full border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <Label htmlFor="recurring" className="text-xs font-bold text-slate-600 cursor-pointer">
                    Recurring Bill
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? 'Saving Entry...' : editingBill ? 'Update Bill Details' : 'Confirm New Bill'}
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-primary text-primary-foreground border-none shadow-2xl shadow-primary/20 overflow-hidden relative rounded-3xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Bell className="h-32 w-32 -rotate-12" />
          </div>
          <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <Clock className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-primary-foreground/70 text-xs font-black uppercase tracking-widest">Upcoming Total Due</p>
                <p className="text-5xl font-black">{displayCurrency(totalUpcoming)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-black/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/10">
              <div className="text-center px-4 border-r border-white/20">
                <p className="text-2xl font-bold">{upcomingBills.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-tighter opacity-70">Unpaid</p>
              </div>
              <div className="text-center px-4">
                <p className="text-2xl font-bold text-emerald-300">{bills.filter(b => b.status === 'paid').length}</p>
                <p className="text-[10px] font-bold uppercase tracking-tighter opacity-70">Settled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-5">
        <AnimatePresence mode="popLayout">
          {bills.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200"
            >
              <div className="mx-auto h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                <Bell className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">No bills found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">Start tracking your recurring payments to avoid late fees and manage your cash flow.</p>
              <Button 
                variant="ghost" 
                className="mt-6 text-primary font-bold hover:bg-primary/5"
                onClick={() => setIsDialogOpen(true)}
              >
                Add your first bill
              </Button>
            </motion.div>
          ) : (
            bills.map((bill, index) => {
              const isOverdue = bill.status === 'unpaid' && isAfter(new Date(), bill.dueDate.toDate());
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card className={cn(
                    "border-slate-200/60 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 rounded-2xl group",
                    bill.status === 'paid' ? "bg-slate-50/50" : "bg-white"
                  )}>
                    <CardContent className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        <button 
                          onClick={() => toggleStatus(bill)}
                          className={cn(
                            "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-90",
                            bill.status === 'paid' 
                              ? "bg-emerald-500 text-white" 
                              : "bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-400"
                          )}
                        >
                          <CheckCircle2 className={cn("h-6 w-6", bill.status === 'paid' ? "scale-100" : "scale-75")} />
                        </button>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn(
                              "font-bold text-slate-900 truncate text-lg",
                              bill.status === 'paid' ? "line-through text-slate-400 font-medium" : ""
                            )}>
                              {bill.title}
                            </h4>
                            {bill.recurring && <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[9px] h-4 font-black uppercase">Recurring</Badge>}
                            {isOverdue && <Badge variant="destructive" className="bg-red-500 text-white text-[9px] h-4 font-black uppercase animate-pulse">Overdue</Badge>}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            {bill.companyName && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                                <Building2 className="h-3 w-3" /> {bill.companyName}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <CalendarIcon className="h-3 w-3" /> {format(bill.dueDate.toDate(), 'MMM d, yyyy')}
                            </span>
                            {bill.referenceId && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                                <Hash className="h-3 w-3" /> {bill.referenceId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={cn(
                            "text-xl font-black tabular-nums tracking-tight",
                            bill.status === 'paid' ? "text-slate-400" : "text-slate-900"
                          )}>
                            {displayCurrency(bill.amount)}
                          </p>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              bill.status === 'paid' ? "bg-emerald-500" : "bg-primary animate-pulse"
                            )} />
                            <p className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              bill.status === 'paid' ? "text-emerald-500" : "text-primary"
                            )}>
                              {bill.status}
                            </p>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 transition-colors">
                              <MoreVertical className="h-5 w-5 text-slate-400" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-1 w-40">
                            <DropdownMenuItem 
                              className="rounded-xl px-3 py-2 text-xs font-bold gap-3"
                              onClick={() => handleEdit(bill)}
                            >
                              <Pencil className="h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="rounded-xl px-3 py-2 text-xs font-bold gap-3 text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => handleDelete(bill.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Remove Bill
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
