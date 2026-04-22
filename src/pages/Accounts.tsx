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
import { Plus, Wallet, Building2, MoreVertical, Pencil, Trash2, CreditCard, Share2, Users, ArrowRight, ShieldCheck, Zap, Landmark, Shapes } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { formatCurrency } from '../lib/currency';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/accounts`));
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
        toast.info('Access already granted to this entity');
      }
      setIsShareDialogOpen(false);
      setShareEmail('');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/accounts/${sharingAccount.id}`);
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
        toast.success('Financial node synchronized');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'accounts'), accountData);
        toast.success('Account matrix established');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save Account Error:', error);
      handleFirestoreError(error, editingAccount ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/accounts`);
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
    if (!user || !confirm('Permanently decommission this financial node?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', id));
      toast.success('Node decommissioned');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/accounts/${id}`);
    }
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
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Capital Accounts</h2>
          <p className="text-sm text-slate-500 font-medium">Coordinate your institutional financial endpoints</p>
        </motion.div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={
            <Button className="h-12 rounded-2xl font-black px-8 shadow-lg shadow-primary/20 gap-2">
              <Plus className="h-5 w-5" /> Integrate Account
            </Button>
          } />
          <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
            <div className="bg-primary p-6 text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Landmark className="h-20 w-20" />
              </div>
              <DialogTitle className="text-2xl font-bold">{editingAccount ? 'Sync Configuration' : 'Integrate New Node'}</DialogTitle>
              <p className="text-primary-foreground/70 text-sm font-medium italic">Define the parameters for this financial endpoint</p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Alias Name</Label>
                  <Input className="h-12 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Master Vault" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Account Type</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Protocol" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="checking" className="rounded-lg">Checking</SelectItem>
                      <SelectItem value="savings" className="rounded-lg">Savings</SelectItem>
                      <SelectItem value="credit" className="rounded-lg">Credit Line</SelectItem>
                      <SelectItem value="other" className="rounded-lg">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Institution Identity</Label>
                <Input className="h-12 rounded-xl" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Federal Reserve Bank" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Liquid Value</Label>
                  <Input className="h-12 rounded-xl font-black text-lg" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Serial Number</Label>
                  <Input className="h-12 rounded-xl" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="XXXX-XXXX" />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black group" disabled={loading}>
                  {loading ? 'Processing...' : editingAccount ? 'Confirm Calibration' : 'Initialize Connection'}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {accounts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-24 text-center bg-white/50 backdrop-blur-sm rounded-[40px] border border-dashed border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
            >
              <Shapes className="mx-auto h-20 w-20 text-slate-100 dark:text-slate-800 mb-6" />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">No Financial Nodes</h3>
              <p className="text-slate-500 font-medium mt-2">Integrate your first account to begin the sync.</p>
            </motion.div>
          ) : (
            accounts.map((account, index) => (
              <motion.div 
                key={account.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className="border-none shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all bg-white dark:bg-slate-900">
                  <div className="bg-primary h-2 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-inner group-hover:rotate-6 transition-transform",
                        account.type === 'credit' ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                      )}>
                        {account.type === 'credit' ? <CreditCard className="h-7 w-7" /> : <Landmark className="h-7 w-7" />}
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="flex -space-x-2">
                           {account.sharedWith?.slice(0, 3).map((_, i) => (
                             <div key={i} className="h-6 w-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 flex items-center justify-center overflow-hidden">
                               <Users className="h-3 w-3 text-slate-500" />
                             </div>
                           ))}
                           {(account.sharedWith?.length || 0) > 3 && (
                             <div className="h-6 w-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                               +{(account.sharedWith?.length || 0) - 3}
                             </div>
                           )}
                         </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                              <MoreVertical className="h-5 w-5 text-slate-400" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="rounded-2xl shadow-xl w-44 p-2 border-none">
                            <DropdownMenuItem className="rounded-xl px-4 py-2 font-bold text-xs gap-3" onClick={() => handleEdit(account)}>
                              <Pencil className="h-4 w-4" /> Calibration
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl px-4 py-2 font-bold text-xs gap-3" onClick={() => {
                              setSharingAccount(account);
                              setIsShareDialogOpen(true);
                            }}>
                              <Share2 className="h-4 w-4" /> Grant Access
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="rounded-xl px-4 py-2 font-bold text-xs gap-3 text-rose-500 focus:text-rose-500 focus:bg-rose-50"
                              onClick={() => handleDelete(account.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Decommission
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase">{account.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {account.bankName}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                          {account.type}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Valuation</p>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                          {displayCurrency(account.balance)}
                        </div>
                      </div>
                      <div className="h-12 w-12 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-6 text-white text-center">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <DialogTitle className="text-2xl font-bold uppercase italic tracking-tight">Grant Access Protocol</DialogTitle>
          </div>
          <form onSubmit={handleShare} className="p-8 space-y-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center leading-relaxed italic">
              Share this financial node with another entity via secured email communication.
            </p>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Entity Identifier (Email)</Label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  type="email" 
                  placeholder="entity@secure-net.com" 
                  className="pl-12 h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-900 border-none"
                  value={shareEmail} 
                  onChange={e => setShareEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black" disabled={loading}>
              {loading ? 'Transmitting...' : 'Authorize Access'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
