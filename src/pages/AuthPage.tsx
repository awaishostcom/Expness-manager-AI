import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { TrendingUp, Loader2, Zap, ArrowRight, ShieldCheck, Globe, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('System Access Granted');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        toast.success('Entity Registered Successfully');
      }
    } catch (error: any) {
      console.error('Auth Error:', {
        code: error.code,
        message: error.message
      });
      
      let userMessage = 'Authentication Protocol Failure.';
      if (error.code === 'auth/operation-not-allowed') {
        userMessage = 'Method unauthorized. Check security settings.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        userMessage = 'Invalid credentials detected.';
      } else if (error.code === 'auth/email-already-in-use') {
        userMessage = 'Identity already registered in nexus.';
      }
      
      toast.error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Omni-Channel Auth Successful');
    } catch (error: any) {
      toast.error('Identity Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-lg relative">
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex flex-col items-center gap-6 mb-12"
        >
          <div className="h-20 w-20 bg-slate-900 dark:bg-white rounded-[32px] flex items-center justify-center text-white dark:text-black shadow-2xl rotate-3">
            <TrendingUp className="h-10 w-10" />
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">XPENSE</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-slate-400 dark:text-slate-500 mt-2 italic">Precision Capital Control</p>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-none dark:border dark:border-slate-800 rounded-[48px] overflow-hidden bg-white/80 dark:bg-slate-900/50 backdrop-blur-3xl">
            <CardHeader className="p-10 pb-2">
              <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-3xl font-black uppercase italic tracking-tight">{isLogin ? 'Initialize' : 'Register'}</CardTitle>
                   <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">
                    {isLogin ? 'Access secure dashboard' : 'Create new identity marker'}
                  </CardDescription>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                   {isLogin ? <ShieldCheck className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="p-10 space-y-6">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Name</Label>
                      <Input 
                        className="h-14 rounded-2xl font-black bg-slate-50 dark:bg-slate-950 border-none px-6" 
                        placeholder="ALEX MERCER" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">System Identifier (Email)</Label>
                  <Input 
                    className="h-14 rounded-2xl font-black bg-slate-50 dark:bg-slate-950 border-none px-6" 
                    type="email" 
                    placeholder="ALPHA@XPENSE.COM" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Cipher (Password)</Label>
                  <Input 
                    className="h-14 rounded-2xl font-black bg-slate-50 dark:bg-slate-950 border-none px-6" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
              </CardContent>
              <CardFooter className="p-10 pt-0 flex flex-col gap-6">
                <Button className="w-full h-16 rounded-[24px] text-lg font-black uppercase italic tracking-widest bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-black group shadow-2xl transition-all" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <>
                      {isLogin ? 'Authorize System' : 'Create Identity'}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
                
                <div className="flex items-center gap-4 w-full px-4">
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Omni-Channel</span>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                </div>

                <Button 
                  variant="outline" 
                   className="w-full h-14 rounded-[20px] font-black uppercase tracking-widest border-2 dark:border-slate-800"
                  type="button" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sync Google
                </Button>

                <div className="text-center mt-2">
                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors italic"
                  >
                    {isLogin ? "Terminate Cycle? Request New Identity" : "Identity Verified? Restore Access"}
                  </button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
