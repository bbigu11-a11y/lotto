import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, History, Trash2, Trophy, Sparkles, User, LogIn, ArrowLeft, Mail, Lock, UserPlus, ShieldCheck, Phone, MapPin, CheckCircle2, Scissors, HeartHandshake, Fingerprint } from 'lucide-react';
import { supabase, isPlaceholder } from './lib/supabase';

type LottoHistory = {
  id: number;
  numbers: number[];
  date: string;
};

export default function App() {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [history, setHistory] = useState<LottoHistory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Sign Up states
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpRegion, setSignUpRegion] = useState('');
  const [signUpUserType, setSignUpUserType] = useState<'beauty' | 'social' | null>('beauty');
  const [signUpNickname, setSignUpNickname] = useState('');
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);

  // Load history and auth state on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('lotto_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        setUserEmail(session.user.email || '');
      }
    });

    // Test DB Connection
    const testConnection = async () => {
      if (isPlaceholder) {
        setDbStatus('error');
        return;
      }
      try {
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        setDbStatus('connected');
      } catch (err) {
        console.error('DB Connection Error:', err);
        setDbStatus('error');
      }
    };
    testConnection();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        setUserEmail(session.user.email || '');
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('lotto_history', JSON.stringify(history));
  }, [history]);

  const generateNumbers = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setNumbers([]);

    setTimeout(() => {
      const newNumbers: number[] = [];
      while (newNumbers.length < 6) {
        const randomNum = Math.floor(Math.random() * 45) + 1;
        if (!newNumbers.includes(randomNum)) {
          newNumbers.push(randomNum);
        }
      }
      newNumbers.sort((a, b) => a - b);
      setNumbers(newNumbers);
      
      const newEntry: LottoHistory = {
        id: Date.now(),
        numbers: newNumbers,
        date: new Date().toLocaleString('ko-KR', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      
      setHistory(prev => [newEntry, ...prev].slice(0, 10)); // Keep last 10
      setIsGenerating(false);
    }, 800);
  };

  const clearHistory = () => {
    if (window.confirm('기록을 모두 삭제하시겠습니까?')) {
      setHistory([]);
      localStorage.removeItem('lotto_history');
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: loginPassword,
    });

    if (error) {
      alert(`로그인 실패: ${error.message}`);
    } else {
      setShowLogin(false);
      setLoginPassword('');
    }
    setIsLoading(false);
  };

  const checkNicknameDuplicate = async () => {
    if (!signUpNickname) {
      alert('별명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', signUpNickname);

      if (error) {
        if (error.code === '42P01') {
          alert('데이터베이스 설정이 완료되지 않았습니다. SQL 스키마를 먼저 실행해주세요.');
        } else {
          console.error('Error checking nickname:', error);
          alert(`중복 확인 중 오류가 발생했습니다: ${error.message}`);
        }
        setIsNicknameChecked(false);
      } else if (data && data.length > 0) {
        alert('이미 사용 중인 별명입니다.');
        setIsNicknameChecked(false);
      } else {
        setIsNicknameChecked(true);
        alert('사용 가능한 별명입니다.');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('예기치 못한 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!signUpUserType) {
      alert('회원 유형을 선택해주세요.');
      return;
    }
    if (!isNicknameChecked) {
      alert('별명 중복 확인을 해주세요.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        data: {
          full_name: signUpName,
          phone: signUpPhone,
          region: signUpRegion,
          user_type: signUpUserType,
          nickname: signUpNickname,
        }
      }
    });

    if (error) {
      alert(`회원가입 실패: ${error.message}`);
    } else {
      alert('회원가입이 완료되었습니다! 이메일 인증을 확인하거나 로그인해주세요.');
      setShowSignUp(false);
      setShowLogin(true);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(`로그아웃 실패: ${error.message}`);
    }
  };

  const getBallColor = (num: number) => {
    if (num <= 10) return 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-yellow-200';
    if (num <= 20) return 'bg-blue-500 text-white border-blue-600 shadow-blue-200';
    if (num <= 30) return 'bg-red-500 text-white border-red-600 shadow-red-200';
    if (num <= 40) return 'bg-gray-500 text-white border-gray-600 shadow-gray-200';
    return 'bg-green-500 text-white border-green-600 shadow-green-200';
  };

  if (showSignUp) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 p-8"
        >
          <button 
            onClick={() => setShowSignUp(false)}
            className="mb-8 flex items-center text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            돌아가기
          </button>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl mb-4">
              <UserPlus className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">회원가입</h2>
            <p className="text-slate-500 text-sm mt-2">새로운 행운의 여정을 시작하세요</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSignUpUserType('beauty')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                  signUpUserType === 'beauty'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                }`}
              >
                <Scissors className={`w-6 h-6 mb-2 ${signUpUserType === 'beauty' ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span className="text-xs font-bold">미용봉사자</span>
              </button>
              <button
                type="button"
                onClick={() => setSignUpUserType('social')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                  signUpUserType === 'social'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                }`}
              >
                <HeartHandshake className={`w-6 h-6 mb-2 ${signUpUserType === 'social' ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span className="text-xs font-bold">사회복지사</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">이름</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="text" 
                  required
                  placeholder="홍길동"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">별명</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type="text" 
                    required
                    placeholder="행운의주인공"
                    value={signUpNickname}
                    onChange={(e) => {
                      setSignUpNickname(e.target.value);
                      setIsNicknameChecked(false);
                    }}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={checkNicknameDuplicate}
                  disabled={isNicknameChecked && signUpNickname !== ''}
                  className={`px-4 py-3.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                    isNicknameChecked 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isNicknameChecked ? '확인됨' : '중복확인'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="email" 
                  required
                  placeholder="example@mail.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">전화번호</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="tel" 
                  required
                  placeholder="010-1234-5678"
                  value={signUpPhone}
                  onChange={(e) => setSignUpPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">지역</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <select 
                  required
                  value={signUpRegion}
                  onChange={(e) => setSignUpRegion(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                >
                  <option value="" disabled>지역을 선택해주세요</option>
                  <option value="서울">서울</option>
                  <option value="부산">부산</option>
                  <option value="대구">대구</option>
                  <option value="인천">인천</option>
                  <option value="광주">광주</option>
                  <option value="대전">대전</option>
                  <option value="울산">울산</option>
                  <option value="세종">세종</option>
                  <option value="경기">경기</option>
                  <option value="강원">강원</option>
                  <option value="충북">충북</option>
                  <option value="충남">충남</option>
                  <option value="전북">전북</option>
                  <option value="전남">전남</option>
                  <option value="경북">경북</option>
                  <option value="경남">경남</option>
                  <option value="제주">제주</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">비밀번호 확인</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all mt-2 disabled:opacity-50"
            >
              {isLoading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              이미 계정이 있으신가요? <button onClick={() => { setShowSignUp(false); setShowLogin(true); }} className="text-emerald-600 font-bold hover:underline">로그인</button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 p-8"
        >
          <button 
            onClick={() => setShowLogin(false)}
            className="mb-8 flex items-center text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            돌아가기
          </button>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl mb-4">
              <LogIn className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">로그인</h2>
            <p className="text-slate-500 text-sm mt-2">행운의 번호를 관리해보세요</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="email" 
                  required
                  placeholder="example@mail.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? '로그인 중...' : '로그인하기'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              계정이 없으신가요? <button onClick={() => { setShowLogin(false); setShowSignUp(true); }} className="text-indigo-600 font-bold hover:underline">회원가입</button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Navigation */}
      <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-end">
        {isLoggedIn ? (
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{userEmail.split('@')[0]}</span>
            <button 
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors ml-2"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowLogin(true)}
            className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-sm font-bold text-slate-600"
          >
            <User className="w-4 h-4" />
            로그인
          </button>
        )}
      </nav>

      {/* DB Status Indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md border ${
          dbStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
          dbStatus === 'error' ? 'bg-rose-500/10 text-rose-600 border-rose-200' :
          'bg-slate-500/10 text-slate-600 border-slate-200'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            dbStatus === 'connected' ? 'bg-emerald-500' :
            dbStatus === 'error' ? 'bg-rose-500' :
            'bg-slate-400'
          }`} />
          {dbStatus === 'connected' ? 'DB 연결됨' :
           dbStatus === 'error' ? (isPlaceholder ? '설정 필요' : 'DB 연결 오류') :
           'DB 확인 중...'}
        </div>
      </div>

      {isPlaceholder && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xl flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">수파베이스 설정이 필요합니다</h3>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                우측 상단 <b>Settings &gt; Secrets</b>에서 <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code>과 
                <code className="bg-amber-100 px-1 rounded ml-1">VITE_SUPABASE_ANON_KEY</code>를 설정해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="max-w-2xl mx-auto pt-6 pb-8 px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-6"
        >
          <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">로또 번호 추첨기</h1>
        </motion.div>
        <p className="text-slate-500 text-sm">당신의 행운을 시험해보세요!</p>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-20">
        {/* Main Generator Card */}
        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mb-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles className="w-32 h-32" />
          </div>

          <div className="flex flex-wrap justify-center gap-3 min-h-[80px] mb-10">
            <AnimatePresence mode="popLayout">
              {numbers.length > 0 ? (
                numbers.map((num, idx) => (
                  <motion.div
                    key={`${num}-${idx}`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 260, 
                      damping: 20,
                      delay: idx * 0.1 
                    }}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold border-2 shadow-lg ${getBallColor(num)}`}
                  >
                    {num}
                  </motion.div>
                ))
              ) : (
                <div className="flex items-center justify-center h-16 text-slate-300 italic">
                  {isGenerating ? '추첨 중...' : '번호를 생성해주세요'}
                </div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateNumbers}
            disabled={isGenerating}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center transition-all shadow-lg ${
              isGenerating 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            <RefreshCw className={`mr-2 w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            번호 추첨하기
          </motion.button>
        </section>

        {/* History Section */}
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center text-slate-700 font-semibold">
              <History className="w-5 h-5 mr-2" />
              최근 추첨 기록
            </div>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-xs text-slate-400 hover:text-red-500 flex items-center transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                기록 삭제
              </button>
            )}
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {history.length > 0 ? (
                history.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-wrap gap-2">
                      {item.numbers.map((num, i) => (
                        <div 
                          key={i} 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${getBallColor(num).split(' ').slice(0, 2).join(' ')}`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg self-end sm:self-auto">
                      {item.date}
                    </span>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 text-sm"
                >
                  아직 기록이 없습니다.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <footer className="max-w-2xl mx-auto px-6 py-12 text-center text-slate-400 text-xs border-top border-slate-100">
        <p>© 2026 로또 번호 추첨기. 행운을 빕니다!</p>
      </footer>
    </div>
  );
}
