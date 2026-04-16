import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Staff as StaffType } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Plus, UserCircle, Phone, Mail, CreditCard, MoreVertical, Pencil, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/currency';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

export const Staff: React.FC = () => {
  const { user, profile } = useAuth();
  const [staff, setStaff] = useState<StaffType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffType | null>(null);
  const [loading, setLoading] = useState(false);

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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'staff'));
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
        toast.success('Staff updated');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'staff'), staffData);
        toast.success('Staff added');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save staff');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'staff', id));
      toast.success('Staff deleted');
    } catch (error) {
      toast.error('Failed to delete staff');
    }
  };

  const handleEdit = (s: StaffType) => {
    setEditingStaff(s);
    setName(s.name);
    setEmail(s.email);
    setPhone(s.phone);
    setCnic(s.cnic);
    setSalary(s.salary.toString());
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Staff
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStaff ? 'Edit Staff' : 'Add Staff Member'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNIC / ID Number</Label>
                  <Input value={cnic} onChange={e => setCnic(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Salary</Label>
                  <Input type="number" value={salary} onChange={e => setSalary(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : editingStaff ? 'Update Staff' : 'Add Staff'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(s => (
          <Card key={s.id} className="overflow-hidden border-border shadow-sm">
            <CardHeader className="pb-4 bg-muted/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UserCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{s.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Staff Member</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(s)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {s.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {s.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" /> {s.cnic}
                </div>
              </div>
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monthly Salary</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(s.salary, profile?.currency)}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-3.5 w-3.5" /> Slip
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
