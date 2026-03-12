import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Factory, Mail, Lock, Eye, EyeOff, AlertCircle, UserPlus, X, User, Phone, Shield, AlertTriangle, Wrench, Component, Construction, Loader2, Zap, CheckCircle2, RotateCcw } from 'lucide-react';
import { WhatsappIcon } from '../components/WhatsappIcon';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import FeedbackModal from '../components/FeedbackModal';
import { IMAGES } from '../constants';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const { settings } = useSettings();

  // Estados para login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para registro
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('user');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Estados para recuperação de senha
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Estado para feedback modal
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info' | 'confirm';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const { requestPasswordReset } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        const state = (location as any).state;
        const from = state?.from?.pathname || '/dashboard';
        const search = state?.from?.search || '';
        navigate(`${from}${search}`, { replace: true });
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      setError('Erro inesperado ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const applyPhoneMask = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');

    // Força o prefixo 55 se o usuário começar a apagar tudo ou digitar errado
    let formatted = digits;
    if (digits.length > 0 && !digits.startsWith('55')) {
      formatted = '55' + digits;
    } else if (digits.length === 0) {
      // Opcional: deixar vazio ou forçar o 55 ao focar
    }

    // Limita a 13 dígitos (55 + 2 DDD + 9 Número)
    return formatted.slice(0, 13);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    try {
      const result = await register(registerName, registerUsername, registerEmail, registerPassword, registerRole, registerPhone);

      if (result.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Conta Criada!',
          message: 'Sua solicitação de acesso foi enviada com sucesso e está aguardando aprovação.'
        });

        // Limpar formulário
        setRegisterName('');
        setRegisterUsername('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterPhone('');
        setRegisterRole('user');

        // Fechar modal
        setShowRegisterModal(false);
      } else {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Erro ao Criar Conta',
          message: result.error || 'Não foi possível enviar a solicitação. Tente novamente.'
        });
        setRegisterError(result.error || 'Erro ao criar conta');
      }
    } catch (err) {
      setRegisterError('Erro inesperado ao criar conta');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      const result = await requestPasswordReset(resetEmail);
      if (result.success) {
        setResetSuccess(true);
        setTimeout(() => {
          setShowResetModal(false);
          setResetSuccess(false);
          setResetEmail('');
        }, 5000);
      } else {
        setResetError(result.error || 'Erro ao solicitar recuperação');
      }
    } catch (err) {
      setResetError('Erro inesperado');
    } finally {
      setResetLoading(false);
    }
  };

  const getApprovalMessage = () => {
    if (registerRole === 'user') {
      return '👥 Qualquer Administrador de OS pode aprovar usuários comuns e técnicos';
    } else {
      return '⚡ Apenas o Administrador Root pode aprovar novos Administradores de OS';
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden font-sans">
      {/* Left Side: Visual (Restaurado o Layout Bonito) */}
      <div className="hidden lg:flex w-1/2 relative bg-[#020617] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/75 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f172a]/40 to-black/80 z-15"></div>
          <img
            src={IMAGES.loginBackground}
            alt="Fábrica"
            className="w-full h-full object-cover scale-110 opacity-60"
          />
        </div>
        <div className="relative z-20 max-w-lg px-8 text-white">
          <div className="mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f59e0b] text-[#1e293b] mb-10 shadow-[0_10px_40px_-10px_rgba(245,158,11,0.5)] ring-1 ring-white/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-10 h-10"
              >
                <path d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z" />
                <path d="M5 19v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1" />
                <path d="M9 7c0-1.657 1.343-3 3-3s3 1.343 3 3" />
                <line x1="12" y1="4" x2="12" y2="2" />
                <circle cx="18" cy="8" r="2" />
                <path d="M18 6l0-1" /><path d="M18 11l0-1" />
                <path d="M20 8l1 0" /><path d="M16 8l-1 0" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </div>
            <h1 className="text-6xl font-black tracking-tight mb-8 leading-[1.05] drop-shadow-2xl">
              Eficiência em cada <br />
              <span className="text-[#f59e0b]">manutenção.</span>
            </h1>
            <p className="text-xl text-blue-100/70 leading-relaxed mb-12 font-medium">
              Gerencie ordens de serviço, ativos e equipes com a precisão que a sua indústria exige. Bem-vindo ao futuro da manutenção industrial.
            </p>
          </div>

          <div className="border-l-[6px] border-[#f59e0b] pl-10 py-8 bg-white/5 backdrop-blur-xl rounded-r-3xl border border-white/10 shadow-3xl">
            <p className="italic text-xl text-blue-50 font-semibold leading-relaxed">
              "Sistema CMMS padrão ouro para a <br />indústria brasileira."
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative bg-white">
        <div className="w-full max-w-[440px] space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex justify-center mb-6">
              <img
                src="/logo.png"
                alt="Novo Horizonte"
                className="h-20 w-auto object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold leading-9 tracking-tight text-slate-900">Acesse sua conta</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use seu usuário ou email para entrar no CMMS.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900">
                Usuário ou E-mail
              </label>
              <div className="mt-2 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail size={20} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: joaosilva ou nome@empresa.com.br"
                  className="block w-full rounded-lg border-0 py-3 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-xs font-bold text-primary hover:text-primary-dark transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="mt-2 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={20} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border-0 py-3 pl-10 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-primary px-3 py-4 text-base font-extrabold leading-6 text-white shadow-xl shadow-primary/20 hover:bg-primary-dark hover:shadow-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300 items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={22} className="group-hover:translate-x-1 transition-transform" />
                    <span className="tracking-wide">Entrar</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm font-medium leading-6">
              <span className="bg-white px-6 text-slate-500">Solicitar Registro</span>
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-50 px-3 py-4 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-100 hover:ring-brand-accent/50 transition-all group border-l-4 border-l-transparent hover:border-l-brand-accent active:scale-95"
            >
              <UserPlus size={20} className="text-brand-accent" />
              Criar conta no sistema
            </button>
          </div>

          <div className="flex flex-col gap-4 text-center mt-8">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
              © {new Date().getFullYear()} Novo Horizonte Alumínios • Versão 2.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Registro */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950 tracking-tight">Criar Conta</h3>
                  <p className="text-xs font-medium text-slate-500">Solicite acesso ao sistema industrial</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  setRegisterError('');
                  setRegisterSuccess(false);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleRegister} className="space-y-5">
                {registerError && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-sm font-bold">{registerError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="registerName" className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                      Nome Completo
                    </label>
                    <div className="relative group">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-primary transition-colors">
                        <User size={18} />
                      </div>
                      <input
                        id="registerName"
                        type="text"
                        required
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="block w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-11 text-slate-900 font-bold placeholder:text-slate-400 focus:border-primary focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerUsername" className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                      Usuário
                    </label>
                    <div className="relative group">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-primary transition-colors">
                        <User size={18} />
                      </div>
                      <input
                        id="registerUsername"
                        type="text"
                        required
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        placeholder="joaosilva"
                        className="block w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-11 text-slate-900 font-bold placeholder:text-slate-400 focus:border-primary focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerEmail" className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                      E-mail Corporativo
                    </label>
                    <div className="relative group">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-primary transition-colors">
                        <Mail size={18} />
                      </div>
                      <input
                        id="registerEmail"
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="nome@novohorizonte.com.br"
                        className="block w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-11 text-slate-900 font-bold placeholder:text-slate-400 focus:border-primary focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerPhone" className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                      WhatsApp
                    </label>
                    <div className="relative group">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-primary transition-colors">
                        <WhatsappIcon size={18} />
                      </div>
                      <input
                        id="registerPhone"
                        type="tel"
                        required
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(applyPhoneMask(e.target.value))}
                        onFocus={(e) => {
                          if (!e.target.value) setRegisterPhone('55');
                        }}
                        placeholder="5543999999999"
                        className="block w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-11 text-slate-900 font-bold placeholder:text-slate-400 focus:border-primary focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerRole" className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                      Tipo de Acesso Desejado
                    </label>
                    <div className="relative group">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-primary transition-colors">
                        <Shield size={18} />
                      </div>
                      <select
                        id="registerRole"
                        required
                        value={registerRole}
                        onChange={(e) => setRegisterRole(e.target.value as any)}
                        className="block w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-11 text-slate-900 font-bold focus:border-primary focus:bg-white transition-all outline-none appearance-none"
                      >
                        <option value="user">USUÁRIO</option>
                        <option value="admin">ADMINISTRADOR DE OS</option>
                      </select>
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-500 font-medium px-1">
                      {registerRole === 'admin'
                        ? '⚡ Requer aprovação do Gerente de Manutenção'
                        : '👥 Requer aprovação de qualquer administrador'}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="registerPassword" className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                      Senha
                    </label>
                    <div className="relative group">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-primary transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        id="registerPassword"
                        type="password"
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        className="block w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-11 text-slate-900 font-bold placeholder:text-slate-400 focus:border-primary focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full flex justify-center items-center gap-3 bg-primary text-white py-4 rounded-xl font-black uppercase tracking-wide shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registerLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Solicitando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={20} />
                        <span>Criar Conta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recuperação de Senha */}
      {
        showResetModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                    <RotateCcw size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950 tracking-tight">Recuperar Senha</h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError('');
                    setResetSuccess(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {resetSuccess ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={28} />
                    </div>
                    <h4 className="text-base font-bold text-emerald-950">Solicitação Enviada!</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Se o email estiver cadastrado, você receberá um link em instantes para criar sua nova senha. Verifique também sua caixa de spam.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Informe seu e-mail cadastrado no sistema. Se o e-mail existir, enviaremos um link de recuperação para você criar uma nova senha.
                    </p>

                    {resetError && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 text-red-700">
                        <AlertCircle size={16} />
                        <span className="text-xs font-bold">{resetError}</span>
                      </div>
                    )}

                    <div>
                      <label htmlFor="resetEmail" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        E-mail Corporativo
                      </label>
                      <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-primary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          id="resetEmail"
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="Ex: joao@novohorizonte.com.br"
                          className="block w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-11 text-slate-900 font-bold placeholder:text-slate-400 focus:border-primary focus:bg-white transition-all outline-none text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full flex justify-center items-center gap-2 bg-primary text-white py-4 rounded-xl font-black uppercase tracking-wide shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 text-sm"
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Recuperando...</span>
                        </>
                      ) : (
                        <span>Recuperar Senha</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )
      }
      {/* Modal de Feedback Global para Login */}
      <FeedbackModal
        isOpen={feedback.isOpen}
        onClose={() => setFeedback({ ...feedback, isOpen: false })}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
      />
    </div >
  );
};

export default Login;