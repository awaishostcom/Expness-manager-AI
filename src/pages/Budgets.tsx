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
import { Plus, PieChart, Target, AlertTriangle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { cn } from '../../lib/utils';

import { formatCurrency } from '../lib/currency';

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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'budgets'));

    const unsubT = onSnapshot(tQ, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

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
        toast.success('Budget updated');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'budgets'), budgetData);
        toast.success('Budget added');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'budgets', id));
      toast.success('Budget deleted');
    } catch (error) {
      toast.error('Failed to delete budget');
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">Monthly Budgets</h2>
          <p className="text-sm text-slate-500">Set spending limits for categories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium h-auto gap-2">
              <Plus className="h-4 w-4" />
              Add Budget
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'New Budget'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
                <Label htmlFor="limit">Monthly Limit</Label>
                <Input id="limit" type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" required />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Saving...' : editingBudget ? 'Update Budget' : 'Set Budget'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 border-slate-200 bg-transparent py-12">
            <CardContent className="flex flex-col items-center justify-center text-slate-400">
              <PieChart className="h-12 w-12 mb-4 opacity-20" />
              <p>No budgets set yet. Start by setting a limit for a category.</p>
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget) => {
            const spent = transactions
              .filter(t => t.category === budget.category)
              .reduce((acc, curr) => acc + curr.amount, 0);
            const percentage = Math.min((spent / budget.limit) * 100, 100);
            const isOver = spent > budget.limit;

            return (
              <Card key={budget.id} className="bg-white border-slate-200 shadow-none rounded-xl overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Target className="h-5 w-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="rounded-lg border-slate-200">
                        <DropdownMenuItem className="text-xs font-medium" onClick={() => handleEdit(budget)}>
                          <Pencil className="mr-2 h-3 w-3" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-xs font-medium text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(budget.id)}
                        >
                          <Trash2 className="mr-2 h-3 w-3" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-slate-900">{budget.category}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Budget</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900">{displayCurrency(spent)}</span>
                        <span className="text-xs text-slate-400"> / {displayCurrency(budget.limit)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            isOver ? "bg-red-500" : percentage > 80 ? "bg-amber-500" : "bg-blue-600"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-medium">{Math.round(percentage)}% used</span>
                        {isOver && (
                          <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Over budget
                          </span>
                        )}
                      </div>
                    </div>
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
