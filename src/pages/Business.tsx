import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Task, Meeting, Client } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, CheckCircle2, Circle, Calendar, MapPin, User, Clock, MoreVertical, Trash2, Briefcase, Zap, Target, Activity, ArrowRight, Shapes } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Business: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDate, setTaskDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [taskClient, setTaskClient] = useState('');

  // Meeting Form
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingClient, setMeetingClient] = useState('');

  useEffect(() => {
    if (!user) return;
    const tasksQ = query(collection(db, 'users', user.uid, 'tasks'), orderBy('dueDate'));
    const meetingsQ = query(collection(db, 'users', user.uid, 'meetings'), orderBy('date'));
    const clientsQ = query(collection(db, 'users', user.uid, 'clients'), orderBy('name'));

    const unsubTasks = onSnapshot(tasksQ, (s) => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as Task))));
    const unsubMeetings = onSnapshot(meetingsQ, (s) => setMeetings(s.docs.map(d => ({ id: d.id, ...d.data() } as Meeting))));
    const unsubClients = onSnapshot(clientsQ, (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() } as Client))));

    return () => { unsubTasks(); unsubMeetings(); unsubClients(); };
  }, [user]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'tasks'), {
        title: taskTitle,
        description: taskDesc,
        dueDate: Timestamp.fromDate(new Date(taskDate)),
        status: 'pending',
        clientId: taskClient || null,
        userId: user.uid
      });
      toast.success('Strategy task initialized');
      setTaskTitle('');
      setTaskDesc('');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/tasks`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'meetings'), {
        title: meetingTitle,
        date: Timestamp.fromDate(new Date(meetingDate)),
        location: meetingLocation,
        clientId: meetingClient || null,
        userId: user.uid
      });
      toast.success('Briefing scheduled');
      setMeetingTitle('');
      setMeetingLocation('');
    } catch (error: any) {
       handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/meetings`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!user) return;
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      await updateDoc(doc(db, 'users', user.uid, 'tasks', task.id), { status: newStatus });
    } catch (error: any) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user || !confirm('Permanently nullify this strategy task?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
      toast.success('Task nullified');
    } catch (error: any) {
       handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/tasks/${id}`);
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!user || !confirm('Permanently cancel this briefing session?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'meetings', id));
      toast.success('Meeting canceled');
    } catch (error: any) {
       handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/meetings/${id}`);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Operations Control</h2>
          <p className="text-sm text-slate-500 font-medium">Strategic coordination and stakeholder synchronization</p>
        </motion.div>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-[20px] h-14 w-full max-w-[440px] mb-10 overflow-hidden">
          <TabsTrigger value="tasks" className="rounded-2xl h-full font-black uppercase italic tracking-widest text-[11px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg transition-all">Strategy Tasks</TabsTrigger>
          <TabsTrigger value="meetings" className="rounded-2xl h-full font-black uppercase italic tracking-widest text-[11px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg transition-all">Briefing sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-8 outline-none">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Active Objectives</h3>
            <Dialog>
              <DialogTrigger render={
                <Button className="h-10 rounded-xl font-black px-6 gap-2 bg-slate-900 text-white dark:bg-white dark:text-black uppercase tracking-tight italic shadow-xl">
                  <Plus className="h-4 w-4" /> Initialize Objective
                </Button>
              } />
              <DialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden sm:max-w-xl">
                <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                     <Target className="h-24 w-24" />
                   </div>
                   <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Objective Protocol</DialogTitle>
                   <p className="text-slate-400 text-sm font-bold italic uppercase tracking-widest">Deploy a new operational target</p>
                </div>
                <form onSubmit={handleAddTask} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Objective Lead (Title)</Label>
                    <Input className="h-14 rounded-2xl font-black bg-slate-50 dark:bg-slate-950 border-none px-6" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Project Alpha Execution" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operational Depth (Description)</Label>
                    <Input className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-950 border-none px-6" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="High-level mission scope..." required />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deadline Marker</Label>
                      <Input className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-950 border-none px-6" type="datetime-local" value={taskDate} onChange={e => setTaskDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Allied Entity (Client)</Label>
                      <select 
                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold outline-none"
                        value={taskClient}
                        onChange={e => setTaskClient(e.target.value)}
                      >
                        <option value="">Detached</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                   <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 text-white group" disabled={loading}>
                      Save Objective
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border dark:border-slate-800 border-dashed">
                   <p className="text-slate-400 font-black uppercase italic tracking-widest">No active objectives in current cycle.</p>
                </div>
              ) : tasks.map((task, index) => (
                <motion.div 
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "border-none shadow-xl shadow-slate-100/50 dark:shadow-none dark:border dark:border-slate-800 rounded-3xl overflow-hidden group transition-all",
                    task.status === 'completed' ? "opacity-60 bg-slate-50 dark:bg-slate-950" : "bg-white dark:bg-slate-900 hover:shadow-2xl hover:shadow-primary/5"
                  )}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleTask(task)} 
                          className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                            task.status === 'completed' ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary"
                          )}
                        >
                          {task.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                        </motion.button>
                        <div>
                          <p className={cn("text-xl font-black uppercase tracking-tight italic", task.status === 'completed' ? "text-slate-400 line-through" : "text-slate-900 dark:text-white")}>{task.title}</p>
                          <p className="text-xs font-bold text-slate-500 line-clamp-1">{task.description}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                               <Clock className="h-3 w-3" />
                               {format(task.dueDate.toDate(), 'PPP p')}
                            </div>
                            {task.clientId && (
                               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                 <User className="h-3 w-3" />
                                 {clients.find(c => c.id === task.clientId)?.name}
                               </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-300 hover:text-rose-500 transition-colors" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-8 outline-none">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Upcoming Briefings</h3>
            <Dialog>
              <DialogTrigger render={
              <Button className="h-10 rounded-xl font-black px-6 gap-2 bg-emerald-600 text-white uppercase tracking-tight italic shadow-xl shadow-emerald-500/20">
                <Plus className="h-4 w-4" /> Schedule Briefing
              </Button>
            } />
              <DialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden sm:max-w-xl">
                 <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                     <Activity className="h-24 w-24" />
                   </div>
                   <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Briefing Protocol</DialogTitle>
                   <p className="text-emerald-100/70 text-sm font-bold italic uppercase tracking-widest">Coordinate a new stakeholder synchronization</p>
                </div>
                <form onSubmit={handleAddMeeting} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Session Alias (Title)</Label>
                    <Input className="h-14 rounded-2xl font-black bg-slate-50 dark:bg-slate-950 border-none px-6" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="Quarterly Audit Sync" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deployment Zone (Location/Link)</Label>
                    <Input className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-950 border-none px-6" value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="Nexus Meeting Room or Zoom URL" required />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Temporal Zero</Label>
                      <Input className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-950 border-none px-6" type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary Liaison (Client)</Label>
                      <select 
                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold outline-none"
                        value={meetingClient}
                        onChange={e => setMeetingClient(e.target.value)}
                      >
                        <option value="">Detached</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                   <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black bg-emerald-600 hover:bg-emerald-700 text-white group" disabled={loading}>
                      Deploy Session
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {meetings.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border dark:border-slate-800 border-dashed">
                   <p className="text-slate-400 font-black uppercase italic tracking-widest">No briefs scheduled for current window.</p>
                </div>
              ) : meetings.map((meeting, index) => (
                <motion.div 
                   key={meeting.id}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-none shadow-xl shadow-slate-100/50 dark:shadow-none dark:border dark:border-slate-800 rounded-[32px] bg-white dark:bg-slate-900 group hover:shadow-2xl hover:shadow-emerald-500/5 transition-all overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full -translate-y-16 translate-x-16" />
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between">
                        <div className="h-16 w-16 rounded-[24px] bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 group-hover:rotate-6 transition-transform">
                          <Calendar className="h-8 w-8" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-300 hover:text-rose-500" onClick={() => deleteMeeting(meeting.id)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="mt-8">
                        <h4 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight group-hover:text-emerald-600 transition-colors">{meeting.title}</h4>
                        <div className="space-y-2 mt-4">
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 italic">
                            <Clock className="h-4 w-4 text-emerald-500" /> {format(meeting.date.toDate(), 'PPP p')}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 italic">
                            <MapPin className="h-4 w-4 text-rose-500" /> {meeting.location}
                          </p>
                        </div>
                        
                        {meeting.clientId && (
                          <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-black italic">
                              {clients.find(c => c.id === meeting.clientId)?.name.charAt(0)}
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Allied Entity</p>
                               <span className="text-xs font-black text-slate-900 dark:text-white uppercase italic">{clients.find(c => c.id === meeting.clientId)?.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
