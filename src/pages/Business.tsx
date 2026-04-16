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
import { Plus, CheckCircle2, Circle, Calendar, MapPin, User, Clock, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

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
      toast.success('Task added');
      setTaskTitle('');
      setTaskDesc('');
    } catch (error) {
      toast.error('Failed to add task');
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
      toast.success('Meeting scheduled');
      setMeetingTitle('');
      setMeetingLocation('');
    } catch (error) {
      toast.error('Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!user) return;
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    await updateDoc(doc(db, 'users', user.uid, 'tasks', task.id), { status: newStatus });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Business Manager</h2>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pending Tasks</h3>
            <Dialog>
              <DialogTrigger render={
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Task</Button>
              } />
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader>
                <form onSubmit={handleAddTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="datetime-local" value={taskDate} onChange={e => setTaskDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Client (Optional)</Label>
                      <select 
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={taskClient}
                        onChange={e => setTaskClient(e.target.value)}
                      >
                        <option value="">None</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>Save Task</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {tasks.map(task => (
              <Card key={task.id} className={cn("transition-opacity", task.status === 'completed' && "opacity-50")}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleTask(task)} className="text-primary">
                      {task.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                    </button>
                    <div>
                      <p className={cn("font-bold", task.status === 'completed' && "line-through")}>{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(task.dueDate.toDate(), 'PPP p')}</span>
                        {task.clientId && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {clients.find(c => c.id === task.clientId)?.name}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Meetings</h3>
            <Dialog>
              <DialogTrigger render={
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Schedule</Button>
            } />
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
                <form onSubmit={handleAddMeeting} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Meeting Title</Label>
                    <Input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Location / Link</Label>
                    <Input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date & Time</Label>
                      <Input type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <select 
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={meetingClient}
                        onChange={e => setMeetingClient(e.target.value)}
                      >
                        <option value="">None</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>Schedule Meeting</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map(meeting => (
              <Card key={meeting.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-bold text-lg">{meeting.title}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="h-3.5 w-3.5" /> {format(meeting.date.toDate(), 'PPP p')}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <MapPin className="h-3.5 w-3.5" /> {meeting.location}
                    </p>
                    {meeting.clientId && (
                      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                          {clients.find(c => c.id === meeting.clientId)?.name.charAt(0)}
                        </div>
                        <span className="text-xs font-medium">{clients.find(c => c.id === meeting.clientId)?.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
