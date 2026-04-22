import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, runTransaction, Timestamp, getDocs, or } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { WalletTransfer, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { 
  Send, 
  Download, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet as WalletIcon, 
  Info, 
  Search,
  Zap,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  MoreHorizontal,
  ChevronRight,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/currency';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Wallet: React.FC = () => {
  const { user, profile } = useAuth();
  const [transfers, setTransfers] = useState<WalletTransfer[]>([]);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Send Money Form
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'walletTransfers'),
      or(
        where('fromUid', '==', user.uid),
        where('toUid', '==', user.uid)
      ),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTransfer)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'walletTransfers'));
    return () => unsub();
  }, [user]);

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const sendAmount = parseFloat(amount);
    const fee = sendAmount * 0.02; // 2% fee
    const totalDeduction = sendAmount + fee;

    if (profile.walletBalance < totalDeduction) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const qUsers = query(usersRef, where('email', '==', recipientEmail));
      const recipientSnapshot = await getDocs(qUsers);
      
      if (recipientSnapshot.empty) {
        toast.error('Recipient not found');
        setLoading(false);
        return;
      }

      const recipientDoc = recipientSnapshot.docs[0];
      const recipientData = recipientDoc.data() as UserProfile;

      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, 'users', user.uid);
        const recipientRef = doc(db, 'users', recipientDoc.id);

        const senderDoc = await transaction.get(senderRef);
        if (!senderDoc.exists()) throw new Error("Sender profile not found");
        const currentBalance = senderDoc.data().walletBalance || 0;

        if (currentBalance < totalDeduction) {
          throw new Error('Insufficient wallet balance');
        }

        transaction.update(senderRef, {
          walletBalance: currentBalance - totalDeduction
        });

        transaction.update(recipientRef, {
          walletBalance: (recipientData.walletBalance || 0) + sendAmount
        });

        const transferRef = doc(collection(db, 'walletTransfers'));
        transaction.set(transferRef, {
          fromUid: user.uid,
          toUid: recipientDoc.id,
          amount: sendAmount,
          fee: fee,
          date: Timestamp.now()
        });
      });

      toast.success('Money sent successfully');
      setIsSendDialogOpen(false);
      setAmount('');
      setRecipientEmail('');
    } catch (error: any) {
      console.error('Transfer Error:', error);
      toast.error('Transfer failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Financial Wallet</h2>
          <p className="text-sm text-slate-500 font-medium">Quick transfers and history</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-12 rounded-2xl font-bold border-slate-200 dark:border-slate-800 gap-2 px-6" onClick={() => toast.info('Deposit feature is coming soon!')}>
            <Download className="h-5 w-5" /> Deposit
          </Button>
          <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
            <DialogTrigger render={
              <Button className="h-12 rounded-2xl font-black px-8 shadow-lg shadow-primary/20 gap-2">
                <Send className="h-5 w-5" /> Send Assets
              </Button>
            } />
            <DialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
              <div className="bg-primary p-6 text-primary-foreground">
                <DialogTitle className="text-2xl font-bold">Transfer Assets</DialogTitle>
                <p className="text-primary-foreground/70 text-sm font-medium italic">Instant peer-to-peer wallet transfer</p>
              </div>
              <form onSubmit={handleSendMoney} className="p-8 space-y-6">
                <div className="bg-primary/5 dark:bg-primary/10 p-5 rounded-2xl flex items-start gap-3 border border-primary/10">
                  <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-wider">
                    Notice: a 2% regional transaction tax will be applied.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Recipient Account Email</Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                      placeholder="user@example.com" 
                      className="pl-12 h-14 rounded-2xl font-semibold bg-slate-50 dark:bg-slate-900 border-none"
                      value={recipientEmail} 
                      onChange={e => setRecipientEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount to Send</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="pl-12 h-14 rounded-2xl font-black text-xl bg-slate-50 dark:bg-slate-900 border-none"
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <AnimatePresence>
                  {amount && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 space-y-3 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-widest">Base Amount</span>
                        <span className="font-black text-slate-900 dark:text-white tabular-nums">{formatCurrency(parseFloat(amount), profile?.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-widest">Transaction Tax (2%)</span>
                        <span className="font-black text-rose-500 tabular-nums">{formatCurrency(parseFloat(amount) * 0.02, profile?.currency)}</span>
                      </div>
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Total Settlement</span>
                        <span className="text-xl font-black text-primary tabular-nums tracking-tighter">{formatCurrency(parseFloat(amount) * 1.02, profile?.currency)}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black group shadow-xl shadow-primary/20" disabled={loading}>
                  {loading ? 'Processing Transaction...' : 'Confirm & Send Money'}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="bg-primary text-white border-none shadow-2xl shadow-primary/30 rounded-[40px] overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 transition-transform group-hover:scale-125 duration-700">
            <Zap className="h-64 w-64" />
          </div>
          <div className="absolute top-10 right-10 p-2 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <CardContent className="p-12 relative z-10">
            <p className="text-primary-foreground/70 font-black uppercase tracking-[0.2em] text-[10px] mb-4">Total Liquid Assets</p>
            <h3 className="text-7xl font-black tracking-tight tabular-nums break-words">
              {formatCurrency(profile?.walletBalance || 0, profile?.currency)}
            </h3>
            <div className="mt-12 flex flex-wrap items-center gap-10">
              <div>
                <p className="text-[10px] text-primary-foreground/50 uppercase font-black tracking-widest mb-1">Account UUID</p>
                <p className="text-sm font-black tabular-nums tracking-widest">{user?.uid.slice(0, 16).toUpperCase()}</p>
              </div>
              <div className="h-10 w-px bg-white/20 hidden sm:block" />
              <div>
                <p className="text-[10px] text-primary-foreground/50 uppercase font-black tracking-widest mb-1">Protection Level</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-sm font-black italic uppercase tracking-tighter">Encrypted Vault</p>
                </div>
              </div>
              <div className="flex-1 min-w-0" />
              <div className="hidden lg:flex items-center gap-1 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-md">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-6 w-6 rounded-full border-2 border-primary bg-slate-200" />
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest ml-2">Trusted Network</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2 uppercase italic">
            <History className="h-6 w-6 text-primary" /> Recent Ledger
          </h3>
          <Button variant="ghost" size="sm" className="text-[10px] font-black tracking-widest uppercase text-slate-400 hover:text-primary">
            Export History <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {transfers.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800"
              >
                <History className="mx-auto h-16 w-16 text-slate-100 dark:text-slate-800 mb-6" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No wallet operations found</p>
              </motion.div>
            ) : (
              transfers.map((transfer, index) => (
                <motion.div 
                  key={transfer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-xl group transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6",
                      transfer.fromUid === user?.uid ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
                    )}>
                      {transfer.fromUid === user?.uid ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownLeft className="h-6 w-6" />}
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight italic">
                        {transfer.fromUid === user?.uid ? 'ASSET OUTFLOW' : 'ASSET INFLOW'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span className={cn(
                          transfer.fromUid === user?.uid ? "text-rose-500" : "text-emerald-500"
                        )}>
                          {transfer.fromUid === user?.uid ? 'SENT' : 'RECEIVED'}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{format(transfer.date.toDate(), 'PPP p')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-2xl font-black tabular-nums tracking-tighter",
                      transfer.fromUid === user?.uid ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {transfer.fromUid === user?.uid ? '-' : '+'}{displayCurrency(transfer.amount)}
                    </p>
                    {transfer.fromUid === user?.uid && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Tax: {displayCurrency(transfer.fee)}</p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const displayCurrency = (val: number) => {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};
