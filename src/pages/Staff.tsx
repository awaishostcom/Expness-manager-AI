import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Staff as StaffType } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Plus, Users, User, IdCard, Phone, Mail, DollarSign, Search, MoreVertical, Pencil, Trash2, ArrowRight, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/currency';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Staff: React.FC = () => {
  const { user, profile } = useAuth();
  const [staff, setStaff] = useState<StaffType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffType | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [salary, setSalary] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'staff'), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffType)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/staff`));
    return () => unsub();
  }, [user]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCnic('');
    setSalary('');
    setEditingStaff(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const staffData = {
      name,
      email,
      phone,
      cnic,
      salary: parseFloat(salary),
      userId: user.uid
    };

    try {
      if (editingStaff) {
        await updateDoc(doc(db, 'users', user.uid, 'staff', editingStaff.id), staffData);
        toast.success('Staff records updated');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'staff'), staffData);
        toast.success('Staff member registered');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save Staff Error:', error);
      handleFirestoreError(error, editingStaff ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/staff`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Permanently delete this staff member record?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'staff', id));
      toast.success('Record removed');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/staff/${id}`);
    }
  };

  const handleEdit = (member: StaffType) => {
    setEditingStaff(member);
    setName(member.name);
    setEmail(member.email);
    setPhone(member.phone);
    setCnic(member.cnic);
    setSalary(member.salary.toString());
    setIsDialogOpen(true);
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cnic.includes(searchQuery)
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Staff Directory</h2>
          <p className="text-sm text-slate-500 font-medium">Manage employee records and payroll information</p>
        </motion.div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search staff..." 
              className="pl-10 h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger render={
              <Button className="h-12 rounded-xl font-black px-6 shadow-lg shadow-primary/20 gap-2">
                <UserPlus className="h-5 w-5" /> Hire New Staff
              </Button>
            } />
            <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
              <div className="bg-primary p-6 text-primary-foreground">
                <DialogTitle className="text-2xl font-bold">{editingStaff ? 'Edit Staff Member' : 'Register New Staff'}</DialogTitle>
                <p className="text-primary-foreground/70 text-sm font-medium">Fill in the professional details below</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10 h-12 rounded-xl" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input className="pl-10 h-12 rounded-xl" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input className="pl-10 h-12 rounded-xl" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone #" required />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">CNIC / ID Number</Label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input className="pl-10 h-12 rounded-xl" value={cnic} onChange={e => setCnic(e.target.value)} placeholder="ID Number" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Monthly Salary</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input className="pl-10 h-12 rounded-xl font-bold" type="number" step="0.01" value={salary} onChange={e => setSalary(e.target.value)} placeholder="0.00" required />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold" disabled={loading}>
                    {loading ? 'Processing...' : editingStaff ? 'Update Record' : 'Assign Record'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredStaff.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-24 text-center bg-white/50 backdrop-blur-sm rounded-[40px] border border-dashed border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
            >
              <Users className="mx-auto h-20 w-20 text-slate-100 dark:text-slate-800 mb-6" />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Empty Department</h3>
              <p className="text-slate-500 font-medium mt-2">Registers will appear once staff members are hired.</p>
            </motion.div>
          ) : (
            filteredStaff.map((member, index) => (
              <motion.div 
                key={member.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className="border-none shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all">
                  <div className="bg-primary h-2 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-black text-primary border border-white dark:border-slate-700 shadow-inner group-hover:rotate-6 transition-transform">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px]">{member.name}</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block mt-1">
                            ID: {member.cnic}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <MoreVertical className="h-5 w-5 text-slate-400" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="rounded-2xl shadow-xl w-40 p-1">
                          <DropdownMenuItem onClick={() => handleEdit(member)} className="rounded-xl px-4 py-2 text-xs font-bold gap-3">
                            <Pencil className="h-4 w-4" /> Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(member.id)} className="rounded-xl px-4 py-2 text-xs font-bold gap-3 text-rose-50 text-rose-500 focus:text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-500/10">
                            <Trash2 className="h-4 w-4" /> Terminate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <Phone className="h-4 w-4 text-primary" />
                        <span>{member.phone}</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Compensation</p>
                      <p className="text-2xl font-black text-emerald-600 tracking-tighter tabular-nums">
                        {formatCurrency(member.salary, profile?.currency)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
