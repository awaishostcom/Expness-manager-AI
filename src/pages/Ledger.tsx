import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Client, LedgerEntry } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Plus, Users, ArrowUpRight, ArrowDownLeft, Search, Download, Share2, FileText, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/currency';
import { exportToPDF, exportToExcel } from '../lib/export';
import { cn } from '../../lib/utils';

export const Ledger: React.FC = () => {
  const { user, profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Client Form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Entry Form
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'in' | 'out'>('in');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'clients'), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedClient) {
      setEntries([]);
      return;
    }
    const q = query(
      collection(db, 'users', user.uid, 'ledger'),
      where('clientId', '==', selectedClient.id),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerEntry)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'ledger'));
    return () => unsub();
  }, [user, selectedClient]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'clients'), {
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        userId: user.uid
      });
      toast.success('Client added');
      setIsClientDialogOpen(false);
      setClientName('');
      setClientPhone('');
      setClientEmail('');
    } catch (error: any) {
      console.error('Add Client Error:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/clients`);
      } catch (e: any) {
        toast.error('Failed to add client: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'ledger'), {
        clientId: selectedClient.id,
        amount: parseFloat(amount),
        type,
        date: Timestamp.fromDate(new Date(entryDate)),
        description,
        userId: user.uid
      });
      toast.success('Entry added');
      setIsEntryDialogOpen(false);
      setAmount('');
      setDescription('');
    } catch (error: any) {
      console.error('Add Ledger Entry Error:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/ledger`);
      } catch (e: any) {
        toast.error('Failed to add entry: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const totalIn = entries.filter(e => e.type === 'in').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = entries.filter(e => e.type === 'out').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIn - totalOut;

  const handleExportPDF = () => {
    if (!selectedClient) return;
    const headers = [['Date', 'Description', 'Cash In', 'Cash Out']];
    const data = entries.map(e => [
      format(e.date.toDate(), 'dd/MM/yyyy HH:mm'),
      e.description,
      e.type === 'in' ? formatCurrency(e.amount, profile?.currency) : '-',
      e.type === 'out' ? formatCurrency(e.amount, profile?.currency) : '-'
    ]);
    exportToPDF(`Ledger Report - ${selectedClient.name}`, headers, data, `ledger_${selectedClient.name}`);
  };

  const handleExportExcel = () => {
    if (!selectedClient) return;
    const data = entries.map(e => ({
      Date: format(e.date.toDate(), 'dd/MM/yyyy HH:mm'),
      Description: e.description,
      'Cash In': e.type === 'in' ? e.amount : 0,
      'Cash Out': e.type === 'out' ? e.amount : 0,
      Type: e.type.toUpperCase()
    }));
    exportToExcel(data, `ledger_${selectedClient.name}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar: Clients List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Clients</h2>
          <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
            <DialogTrigger render={
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>Save Client</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2 overflow-auto max-h-[calc(100vh-250px)]">
          {clients.map(client => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all hover:bg-muted",
                selectedClient?.id === client.id ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.phone}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main: Ledger Entries */}
      <div className="lg:col-span-8 space-y-6">
        {selectedClient ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedClient.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedClient.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                  <FileText className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                  <Download className="h-4 w-4" /> Excel
                </Button>
                <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
                  <DialogTrigger render={
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> New Entry
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Ledger Entry</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddEntry} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          type="button"
                          variant={type === 'in' ? 'default' : 'outline'}
                          className={cn("w-full", type === 'in' && "bg-emerald-600 hover:bg-emerald-700")}
                          onClick={() => setType('in')}
                        >
                          Cash In
                        </Button>
                        <Button
                          type="button"
                          variant={type === 'out' ? 'default' : 'outline'}
                          className={cn("w-full", type === 'out' && "bg-rose-600 hover:bg-rose-700")}
                          onClick={() => setType('out')}
                        >
                          Cash Out
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Date (Manual)</Label>
                        <Input type="datetime-local" value={entryDate} onChange={e => setEntryDate(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>Save Entry</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Cash In</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalIn, profile?.currency)}</p>
                </CardContent>
              </Card>
              <Card className="bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Cash Out</p>
                  <p className="text-xl font-bold text-rose-700">{formatCurrency(totalOut, profile?.currency)}</p>
                </CardContent>
              </Card>
              <Card className={cn(
                "border-none text-white",
                balance >= 0 ? "bg-emerald-600" : "bg-rose-600"
              )}>
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Net Balance</p>
                  <p className="text-xl font-bold">{formatCurrency(balance, profile?.currency)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      entry.type === 'in' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {entry.type === 'in' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">{format(entry.date.toDate(), 'PPP p')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      entry.type === 'in' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {entry.type === 'in' ? '+' : '-'}{formatCurrency(entry.amount, profile?.currency)}
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
            <Users className="h-16 w-16 mb-4 opacity-20" />
            <p>Select a client to view their ledger</p>
          </div>
        )}
      </div>
    </div>
  );
};
