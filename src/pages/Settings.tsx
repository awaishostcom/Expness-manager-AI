import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { User, Shield, Moon, Sun, Laptop, Mail, Fingerprint, Bell, Globe, Key, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { cn } from '../../lib/utils';
import { CURRENCIES } from '../lib/currency';
import { CurrencyCode } from '../types';
import { motion } from 'motion/react';

export const Settings: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.name || '');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.currency || 'USD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setCurrency(profile.currency);
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await updateProfile(user, { displayName: name });
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        currency,
      });
      toast.success('Core profile parameters updated');
    } catch (error) {
      toast.error('Failed to sync profile markers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">System Configuration</h2>
        <p className="text-sm text-slate-500 font-medium">Calibrate your administrative environment and identity markers</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none dark:border dark:border-slate-800 rounded-[40px] overflow-hidden bg-white dark:bg-slate-900">
              <div className="h-2 bg-primary w-full" />
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 uppercase" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase italic tracking-tight">Identity Markers</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Personal authentication parameters</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Legal Identity (Name)</Label>
                      <Input className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-950 border-none" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full legal name" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Interface Endpoint (Email)</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input className="pl-12 h-14 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 border-none opacity-60" id="email" value={profile?.email} disabled />
                      </div>
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asset Valuation Standard (Currency)</Label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                        <select 
                          id="currency"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                          className="pl-12 w-full h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-950 border-none text-sm appearance-none focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code} — {c.name} ({c.symbol})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                           <ArrowRight className="h-4 w-4 rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="h-16 rounded-[24px] px-10 font-black text-lg group" disabled={loading}>
                    {loading ? 'Synchronizing...' : 'Save System Markers'}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none dark:border dark:border-slate-800 rounded-[40px] overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3 text-primary mb-2">
                   <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sun className="h-6 w-6 uppercase" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase italic tracking-tight">Interface Skin</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Environmental visual calibration</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { id: 'light', icon: Sun, label: 'Standard', color: 'text-amber-500' },
                    { id: 'dark', icon: Moon, label: 'Reactive', color: 'text-blue-500' },
                    { id: 'system', icon: Laptop, label: 'Adaptive', color: 'text-slate-500' }
                  ].map((mode) => (
                    <button 
                      key={mode.id}
                      onClick={() => setTheme(mode.id)}
                      className={cn(
                        "flex flex-col items-center gap-4 p-8 rounded-[32px] border-4 transition-all group relative overflow-hidden",
                        theme === mode.id 
                          ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10" 
                          : "border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                      )}
                    >
                      <mode.icon className={cn("h-10 w-10 transition-transform group-hover:scale-110", mode.color)} />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em]",
                        theme === mode.id ? "text-primary" : "text-slate-400"
                      )}>{mode.label}</span>
                      {theme === mode.id && (
                        <motion.div layoutId="activeSkin" className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-10">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none dark:border dark:border-slate-800 rounded-[40px] overflow-hidden bg-slate-900 text-white">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase italic tracking-tight">Shield Protocol</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-500">Security & Integrity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Authentication Key</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Stable (90 days)</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all">Re-Calibrate Key</Button>
                </div>

                <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Biometric Sync</p>
                      <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest italic">Disconnected</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all">Establish Link</Button>
                </div>

                 <div className="p-6 rounded-[24px] bg-rose-500/10 border border-rose-500/20 space-y-4 group">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-rose-500 group-hover:rotate-12 transition-transform" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-rose-500">Hazard Zone</p>
                      <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest italic">Nuclear Option</p>
                    </div>
                  </div>
                  <Button className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white transition-all">Decommission System</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-[40px] bg-primary/10 border border-primary/20 dark:bg-slate-800 dark:border-slate-700"
          >
             <div className="flex items-start gap-4">
                <Bell className="h-6 w-6 text-primary mt-1" />
                <div className="space-y-2">
                  <h4 className="text-sm font-black uppercase italic tracking-tight">Notification Matrix</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed italic">System will broadcast critical threshold breaches and node deletions to your primary interface endpoint.</p>
                </div>
             </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
