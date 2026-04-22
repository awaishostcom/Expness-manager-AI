import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, runTransaction, Timestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { WalletTransfer, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Send, Download, History, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Info, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/currency';
import { cn } from '../../lib/utils';

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
      where('fromUid', '==', user.uid),
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
      // Find recipient by email
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Wallet</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => toast.info('Deposit feature coming soon!')}>
            <Download className="h-4 w-4" /> Deposit
          </Button>
          <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
            <DialogTrigger render={
              <Button className="gap-2">
                <Send className="h-4 w-4" /> Send Money
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Money</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSendMoney} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-blue-700 text-sm">
                  <Info className="h-4 w-4 mt-0.5" />
                  <p>A 2% tax fee will be applied to this transaction.</p>
                </div>
                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <Input 
                    type="email" 
                    placeholder="user@example.com" 
                    value={recipientEmail} 
                    onChange={e => setRecipientEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    required 
                  />
                </div>
                {amount && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>{formatCurrency(parseFloat(amount), profile?.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fee (2%):</span>
                      <span>{formatCurrency(parseFloat(amount) * 0.02, profile?.currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground pt-1 border-t">
                      <span>Total Deduction:</span>
                      <span>{formatCurrency(parseFloat(amount) * 1.02, profile?.currency)}</span>
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Processing...' : 'Send Now'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-primary text-white border-none shadow-xl shadow-primary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <WalletIcon className="h-32 w-32" />
        </div>
        <CardContent className="p-8">
          <p className="text-primary-foreground/80 font-medium uppercase tracking-widest text-xs mb-2">Available Balance</p>
          <h3 className="text-5xl font-bold tracking-tight">
            {formatCurrency(profile?.walletBalance || 0, profile?.currency)}
          </h3>
          <div className="mt-8 flex items-center gap-6">
            <div>
              <p className="text-[10px] text-primary-foreground/60 uppercase font-bold tracking-wider">Account ID</p>
              <p className="text-sm font-mono">{user?.uid.slice(0, 12)}...</p>
            </div>
            <div>
              <p className="text-[10px] text-primary-foreground/60 uppercase font-bold tracking-wider">Status</p>
              <p className="text-sm font-medium">Verified Account</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5" /> Transaction History
          </h3>
          <Button variant="ghost" size="sm" className="text-xs">View All</Button>
        </div>

        <div className="space-y-3">
          {transfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
              No wallet transactions yet
            </div>
          ) : (
            transfers.map(transfer => (
              <div key={transfer.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    transfer.fromUid === user?.uid ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {transfer.fromUid === user?.uid ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {transfer.fromUid === user?.uid ? 'Money Sent' : 'Money Received'}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(transfer.date.toDate(), 'PPP p')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-bold",
                    transfer.fromUid === user?.uid ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {transfer.fromUid === user?.uid ? '-' : '+'}{formatCurrency(transfer.amount, profile?.currency)}
                  </p>
                  {transfer.fromUid === user?.uid && (
                    <p className="text-[10px] text-muted-foreground">Fee: {formatCurrency(transfer.fee, profile?.currency)}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
