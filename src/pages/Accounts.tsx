import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { BankAccount } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Plus, Wallet, Building2, MoreVertical, Pencil, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

import { Share2, Users } from 'lucide-react';
import { formatCurrency } from '../lib/currency';

export const Accounts: React.FC = () => {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [sharingAccount, setSharingAccount] = useState<BankAccount | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');
  const [number, setNumber] = useState('');
  const [type, setType] = useState<'checking' | 'savings' | 'credit' | 'other'>('checking');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'accounts'));
    return () => unsub();
  }, [user]);

  const resetForm = () => {
    setName('');
    setBankName('');
    setBalance('');
    setNumber('');
    setType('checking');
    setEditingAccount(null);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !sharingAccount) return;
    setLoading(true);
    try {
      const sharedWith = sharingAccount.sharedWith || [];
      if (!sharedWith.includes(shareEmail)) {
        await updateDoc(doc(db, 'users', user.uid, 'accounts', sharingAccount.id), {
          sharedWith: [...sharedWith, shareEmail]
        });
        toast.success(`Account shared with ${shareEmail}`);
      } else {
        toast.info('Already shared with this user');
      }
      setIsShareDialogOpen(false);
      setShareEmail('');
    } catch (error) {
      toast.error('Failed to share account');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const accountData = {
      name,
      bankName,
      balance: parseFloat(balance),
      number,
      type,
      userId: user.uid,
      sharedWith: editingAccount?.sharedWith || []
    };

    try {
      if (editingAccount) {
        await updateDoc(doc(db, 'users', user.uid, 'accounts', editingAccount.id), accountData);
        toast.success('Account updated successfully');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'accounts'), accountData);
        toast.success('Account added successfully');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error('Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setName(account.name);
    setBankName(account.bankName);
    setBalance(account.balance.toString());
    setNumber(account.number || '');
    setType(account.type);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this account?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', id));
      toast.success('Account deleted');
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const displayCurrency = (val: number) => {
    return formatCurrency(val, profile?.currency || 'USD');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">Bank Accounts</h2>
          <p className="text-sm text-slate-500">Manage your connected financial accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium h-auto gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Checking" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank">Bank Name</Label>
                <Input id="bank" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Chase Bank" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="balance">Initial Balance</Label>
                  <Input id="balance" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Account Type</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="credit">Credit Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Account Number (Optional)</Label>
                <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="XXXX-XXXX-XXXX" />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 border-slate-200 bg-transparent py-12">
            <CardContent className="flex flex-col items-center justify-center text-slate-400">
              <Wallet className="h-12 w-12 mb-4 opacity-20" />
              <p>No accounts added yet. Click "Add Account" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className="bg-white border-slate-200 shadow-none rounded-xl overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    {account.type === 'credit' ? <CreditCard className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="rounded-lg border-slate-200">
                      <DropdownMenuItem className="text-xs font-medium" onClick={() => handleEdit(account)}>
                        <Pencil className="mr-2 h-3 w-3" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-medium" onClick={() => {
                        setSharingAccount(account);
                        setIsShareDialogOpen(true);
                      }}>
                        <Share2 className="mr-2 h-3 w-3" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-xs font-medium text-red-600 focus:text-red-600"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="mr-2 h-3 w-3" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{account.name}</h3>
                    {account.sharedWith && account.sharedWith.length > 0 && (
                      <Users className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-tight">
                    {account.bankName} {account.number && `• ${account.number.slice(-4)}`} • {account.type}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Balance</p>
                  <div className="text-2xl font-bold text-slate-900">
                    {displayCurrency(account.balance)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShare} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this account with another user by their email address. They will be able to view entries.
            </p>
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input 
                type="email" 
                placeholder="user@example.com" 
                value={shareEmail} 
                onChange={e => setShareEmail(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>Share Account</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
