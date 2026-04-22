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
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Budget, Transaction } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Plus, PieChart, Target, AlertTriangle, MoreVertical, Pencil, Trash2, ArrowRight, Zap, Target as TargetIcon, BarChart3, Shapes } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../lib/currency';
import { motion, AnimatePresence } from 'motion/react';

export const Budgets: React.FC = () => {
  const { user, profile } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');

  const categories = [
    'Food', 'Bills', 'Travel', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'
  ];

  useEffect(() => {
    if (!user) return;
    
    const bQ = query(collection(db, 'users', user.uid, 'budgets'));
    const now = new Date();
    const tQ = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('type', '==', 'expense'),
      where('date', '>=', startOfMonth(now)),
      where('date', '<=', endOfMonth(now))
    );

    const unsubB = onSnapshot(bQ, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/budgets`));

    const unsubT = onSnapshot(tQ, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/transactions`));

    return () => {
      unsubB();
      unsubT();
    };
  }, [user]);

  const resetForm = () => {
    setCategory('');
    setLimit('');
    setEditingBudget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const budgetData = {
      category,
      limit: parseFloat(limit),
      period: 'monthly',
      userId: user.uid
    };

    try {
      if (editingBudget) {
        await updateDoc(doc(db, 'users', user.uid, 'budgets', editingBudget.id), budgetData);
        toast.success('Resource threshold adjusted');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'budgets'), budgetData);
        toast.success('Budget threshold established');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save Budget Error:', error);
      handleFirestoreError(error, editingBudget ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/budgets`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Permanently dissolve this budget threshold?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'budgets', id));
      toast.success('Threshold dissolved');
    } catch (error: any) {
       handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/budgets/${id}`);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setLimit(budget.limit.toString());
    setIsDialogOpen(true);
  };

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
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Budget Thresholds</h2>
          <p className="text-sm text-slate-500 font-medium">Coordinate your monthly resource allocation</p>
        </motion.div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="h-12 rounded-2xl font-black px-8 shadow-lg shadow-primary/20 gap-2 uppercase tracking-tight italic">
              <Plus className="h-5 w-5" /> Establish Budget
            </Button>
          } />
          <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
             <div className="bg-primary p-6 text-primary-foreground relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 transition-transform hover:rotate-0">
                 <TargetIcon className="h-20 w-20" />
               </div>
               <DialogTitle className="text-2xl font-black uppercase italic">Protocol Optimization</DialogTitle>
               <p className="text-primary-foreground/70 text-sm font-bold italic">Define your environmental resource constraints</p>
             </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Classification Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-900 border-none">
                    <SelectValue placeholder="Target node..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    {categories.map(c => <SelectItem key={c} value={c} className="rounded-xl">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Monthly Threshold Limit</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{profile?.currency === 'PKR' ? 'Rs' : '$'}</span>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={limit} 
                    onChange={(e) => setLimit(e.target.value)} 
                    className="pl-12 h-14 rounded-2xl font-black text-lg bg-slate-50 dark:bg-slate-900 border-none"
                    placeholder="0.00" 
                    required 
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black group" disabled={loading}>
                  {loading ? 'Analyzing...' : editingBudget ? 'Update constraint' : 'Establish limit'}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {budgets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-24 text-center bg-white/50 backdrop-blur-sm rounded-[40px] border border-dashed border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
            >
              <Shapes className="mx-auto h-20 w-20 text-slate-100 dark:text-slate-800 mb-6" />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Zero Constraints Found</h3>
              <p className="text-slate-500 font-medium mt-2">Establish your first budget threshold to begin monitoring.</p>
            </motion.div>
          ) : (
            budgets.map((budget, index) => {
              const spent = transactions
                .filter(t => t.category === budget.category)
                .reduce((acc, curr) => acc + curr.amount, 0);
              const percentage = Math.min((spent / budget.limit) * 100, 100);
              const isOver = spent > budget.limit;
              const isWarning = percentage > 80 && !isOver;

              return (
                <motion.div 
                  key={budget.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  layout
                >
                  <Card className="border-none shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-[32px] overflow-hidden group hover:scale-[1.01] transition-all bg-white dark:bg-slate-900">
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between mb-8">
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-inner group-hover:rotate-12 transition-transform",
                          isOver ? "bg-rose-50 border-rose-100 text-rose-500" : isWarning ? "bg-amber-50 border-amber-100 text-amber-500" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                        )}>
                          <TargetIcon className="h-7 w-7" />
                        </div>
                        <div className="flex items-center gap-3">
                          {isOver && (
                             <motion.div 
                               initial={{ scale: 0.8, opacity: 0 }}
                               animate={{ scale: 1, opacity: 1 }}
                               className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest italic"
                             >
                                <Zap className="h-3 w-3 fill-current" /> Critical Alert
                             </motion.div>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="rounded-2xl shadow-xl w-44 p-2 border-none">
                              <DropdownMenuItem className="rounded-xl px-4 py-2 font-bold text-xs gap-3" onClick={() => handleEdit(budget)}>
                                <Pencil className="h-4 w-4" /> Recalibrate
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-xl px-4 py-2 font-bold text-xs gap-3 text-rose-500 focus:text-rose-500 focus:bg-rose-50"
                                onClick={() => handleDelete(budget.id)}
                              >
                                <Trash2 className="h-4 w-4" /> Dissolve
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase">{budget.category}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Environmental Resource Limit</p>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "text-2xl font-black italic tracking-tighter tabular-nums",
                              isOver ? "text-rose-500" : "text-slate-900 dark:text-white"
                            )}>
                              {displayCurrency(spent)}
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              of {displayCurrency(budget.limit)} limit
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={cn(
                                "h-full rounded-full relative",
                                isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                              )}
                            >
                               <div className="absolute top-0 right-0 h-full w-4 bg-white/20 skew-x-12 translate-x-2" />
                            </motion.div>
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Consumption Rate: {Math.round(percentage)}%</span>
                            {isOver && (
                              <span className="text-[10px] text-rose-600 font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="h-3 w-3" /> Integrity Compromised
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <div className="mt-12 p-8 bg-slate-900 rounded-[40px] text-white flex flex-col md:flex-row items-center gap-8 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
         <div className="h-20 w-20 rounded-[28px] bg-white/10 flex items-center justify-center backdrop-blur-md">
            <BarChart3 className="h-10 w-10 text-primary" />
         </div>
         <div className="flex-1 space-y-2 text-center md:text-left">
            <h4 className="text-xl font-black uppercase italic tracking-tight">System Resource Optimization</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed italic">By establishing categorical thresholds, you modulate the financial flow, ensuring system stability and resource preservation across all operational nodes.</p>
         </div>
         <div className="flex flex-col items-center md:items-end gap-1">
           <div className="text-4xl font-black text-primary italic tracking-tighter tabular-nums">
             {budgets.length}
           </div>
           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Constraints</div>
         </div>
      </div>
    </div>
  );
};
