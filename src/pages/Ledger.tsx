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
import { 
  Plus, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Download, 
  Share2, 
  FileText, 
  Phone, 
  Mail,
  MoreVertical,
  Trash2,
  UserPlus,
  ArrowRight,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/currency';
import { exportToPDF, exportToExcel } from '../lib/export';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Ledger: React.FC = () => {
  const { user, profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      const fetchedClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(fetchedClients);
      // Auto-select first client if none selected
      if (fetchedClients.length > 0 && !selectedClient) {
        // setSelectedClient(fetchedClients[0]);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/clients`));
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
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/ledger`));
    return () => unsub();
  }, [user, selectedClient]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const clientData = {
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        userId: user.uid
      };
      await addDoc(collection(db, 'users', user.uid, 'clients'), clientData);
      toast.success('Client added successfully');
      setIsClientDialogOpen(false);
      setClientName('');
      setClientPhone('');
      setClientEmail('');
    } catch (error: any) {
      console.error('Add Client Error:', error);
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/clients`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient) return;
    setLoading(true);
    try {
      const entryData = {
        clientId: selectedClient.id,
        amount: parseFloat(amount),
        type,
        date: Timestamp.fromDate(new Date(entryDate)),
        description,
        userId: user.uid
      };
      await addDoc(collection(db, 'users', user.uid, 'ledger'), entryData);
      toast.success('Ledger entry added');
      setIsEntryDialogOpen(false);
      setAmount('');
      setDescription('');
    } catch (error: any) {
      console.error('Add Ledger Entry Error:', error);
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/ledger`);
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

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
      {/* Sidebar: Clients List */}
      <div className="lg:col-span-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight uppercase italic text-primary">Clients</h2>
          <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
            <DialogTrigger render={
              <Button size="sm" className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" /> New Client
              </Button>
            } />
            <DialogContent className="rounded-3xl border-none shadow-2xl">
              <DialogHeader className="bg-primary -mx-6 -mt-6 p-6 text-primary-foreground mb-6">
                <DialogTitle className="text-2xl font-bold">Add New Client</DialogTitle>
                <p className="text-primary-foreground/70 text-sm font-medium">Create a new ledger for your business client</p>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Client Name</Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full Name" required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Phone Number</Label>
                  <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+1 234 567 890" required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                  <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com" required className="h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold mt-4" disabled={loading}>Save Client Details</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search clients..." 
            className="pl-10 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-3 overflow-auto max-h-[calc(100vh-320px)] pr-2 scrollbar-hide">
          {filteredClients.map(client => (
            <motion.button
              key={client.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedClient(client)}
              className={cn(
                "w-full p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                selectedClient?.id === client.id 
                  ? "border-primary bg-primary shadow-xl shadow-primary/20 text-primary-foreground" 
                  : "border-slate-100 bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-700 hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center font-black text-lg",
                  selectedClient?.id === client.id ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-primary"
                )}>
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{client.name}</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    selectedClient?.id === client.id ? "text-primary-foreground/70" : "text-slate-400"
                  )}>{client.phone}</p>
                </div>
              </div>
              <ArrowRight className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-transform",
                selectedClient?.id === client.id ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
              )} />
            </motion.button>
          ))}
          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              No clients found.
            </div>
          )}
        </div>
      </div>

      {/* Main: Ledger Entries */}
      <div className="lg:col-span-8">
        {selectedClient ? (
          <div className="space-y-8 h-full flex flex-col">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-black">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{selectedClient.name}</h2>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                      <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"><Phone className="h-3 w-3" /> {selectedClient.phone}</span>
                      <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"><Mail className="h-3 w-3" /> {selectedClient.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleExportPDF} className="rounded-xl font-bold h-10 border-slate-200 dark:border-slate-800">
                  <FileText className="h-4 w-4 mr-2" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="rounded-xl font-bold h-10 border-slate-200 dark:border-slate-800">
                  <Download className="h-4 w-4 mr-2" /> EXCEL
                </Button>
                <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
                  <DialogTrigger render={
                    <Button className="rounded-xl font-black h-10 shadow-lg shadow-primary/20 px-6">
                      <Plus className="h-4 w-4 mr-2" /> NEW ENTRY
                    </Button>
                  } />
                  <DialogContent className="rounded-3xl border-none shadow-2xl">
                    <DialogHeader className="bg-primary -mx-6 -mt-6 p-6 text-primary-foreground mb-6">
                      <DialogTitle className="text-2xl font-bold">New Ledger Entry</DialogTitle>
                      <p className="text-primary-foreground/70 text-sm font-medium">Record a cash movement for this client</p>
                    </DialogHeader>
                    <form onSubmit={handleAddEntry} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setType('in')}
                          className={cn(
                            "h-14 rounded-2xl flex items-center justify-center gap-2 font-black transition-all",
                            type === 'in' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          <ArrowUpRight className="h-5 w-5" /> CASH IN
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setType('out')}
                          className={cn(
                            "h-14 rounded-2xl flex items-center justify-center gap-2 font-black transition-all",
                            type === 'out' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          <ArrowDownLeft className="h-5 w-5" /> CASH OUT
                        </motion.button>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Total Amount</Label>
                        <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="h-12 rounded-xl text-lg font-bold" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Transaction Date</Label>
                        <Input type="datetime-local" value={entryDate} onChange={e => setEntryDate(e.target.value)} required className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Reference / Description</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Payment for Order #123" required className="h-12 rounded-xl" />
                      </div>
                      <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold mt-4" disabled={loading}>Confirm Movement</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none shadow-xl shadow-emerald-500/10 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-emerald-50 dark:border-emerald-950">
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ArrowUpRight className="h-20 w-20 text-emerald-500" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Incoming Total</p>
                  <p className="text-3xl font-black text-emerald-600 tabular-nums">{formatCurrency(totalIn, profile?.currency)}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-xl shadow-rose-500/10 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-rose-50 dark:border-rose-950">
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ArrowDownLeft className="h-20 w-20 text-rose-500" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Outgoing Total</p>
                  <p className="text-3xl font-black text-rose-600 tabular-nums">{formatCurrency(totalOut, profile?.currency)}</p>
                </CardContent>
              </Card>
              <Card className={cn(
                "border-none shadow-2xl rounded-3xl overflow-hidden text-white",
                balance >= 0 ? "bg-emerald-600 shadow-emerald-500/30" : "bg-rose-600 shadow-rose-500/30"
              )}>
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <FileText className="h-20 w-20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Net Standing</p>
                  <p className="text-3xl font-black tabular-nums">{formatCurrency(balance, profile?.currency)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Transaction Ledger</h3>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-400 hover:text-primary">
                  <Filter className="h-3 w-3 mr-2" /> SORT BY DATE
                </Button>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {entries.length === 0 ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <BookOpen className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                      <p className="text-slate-400 font-medium">No ledger entries for this client yet.</p>
                      <Button variant="link" className="text-primary font-bold" onClick={() => setIsEntryDialogOpen(true)}>Add your first entry</Button>
                    </motion.div>
                  ) : (
                    entries.map((entry, index) => (
                      <motion.div 
                        key={entry.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all"
                      >
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center transition-all group-hover:rotate-12",
                            entry.type === 'in' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                          )}>
                            {entry.type === 'in' ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownLeft className="h-6 w-6" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-lg">{entry.description}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{format(entry.date.toDate(), 'PPP p')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-xl font-black tabular-nums tracking-tighter",
                            entry.type === 'in' ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {entry.type === 'in' ? '+' : '-'}{formatCurrency(entry.amount, profile?.currency)}
                          </p>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Transaction ID: {entry.id.slice(0, 8).toUpperCase()}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-primary rounded-lg transition-colors">
                              <Share2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white/50 backdrop-blur-sm rounded-[40px] border border-dashed border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
            <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800 rounded-[40px] flex items-center justify-center text-slate-200 mb-8 border border-white dark:border-slate-700 shadow-inner">
              <Users className="h-16 w-16" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Active Ledger</h3>
            <p className="text-slate-500 max-w-sm mt-3 font-medium">Select a client from the left pane to view their payment history and current standing.</p>
            <Button 
              variant="outline" 
              className="mt-10 rounded-2xl font-bold h-12 px-8 border-slate-200 dark:border-slate-800"
              onClick={() => setIsClientDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" /> Register New Client
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
