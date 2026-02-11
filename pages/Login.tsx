import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Factory, Mail, Lock, Eye, EyeOff, AlertCircle, UserPlus, X, User, Phone, Shield, AlertTriangle } from 'lucide-react';
import { WhatsappIcon } from '../components/WhatsappIcon';
import { IMAGES } from '../constants';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';



const Login = () => {
  const navigate = useNavigate();
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      setError('Erro inesperado ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    try {
      const result = await register(registerName, registerUsername, registerEmail, registerPassword, registerRole, registerPhone);

      if (result.success) {
        setRegisterSuccess(true);
        // Limpar formulário
        setRegisterName('');
        setRegisterUsername('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterPhone('');
        setRegisterRole('user');
        // Fechar modal após 4 segundos
        setTimeout(() => {
          setShowRegisterModal(false);
          setRegisterSuccess(false);
        }, 4000);
      } else {
        setRegisterError(result.error || 'Erro ao criar conta');
      }
    } catch (err) {
      setRegisterError('Erro inesperado ao criar conta');
    } finally {
      setRegisterLoading(false);
    }
  };

  const getApprovalMessage = () => {
    if (registerRole === 'user') {
      return '👥 Qualquer Admin Industrial pode aprovar usuários comuns e técnicos';
    } else {
      return '⚡ Apenas o Admin Root (Super Administrador) pode aprovar novos Admins Industriais';
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden font-sans">
      {/* Left Side: Visual */}
      <div className="hidden lg:flex w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-blue-600/80 mix-blend-multiply z-10"></div>
          <img
            src={IMAGES.loginBackground}
            alt="Fábrica"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-20 max-w-lg px-8 text-white">
          <div className="mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-accent text-white mb-6">
              <Factory size={32} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">Eficiência em cada manutenção.</h1>
            <p className="text-lg text-blue-100 leading-relaxed">
              Gerencie ordens de serviço, ativos e equipes com a precisão que a sua indústria exige. Bem-vindo ao futuro da manutenção industrial.
            </p>
          </div>
          <div className="border-l-4 border-brand-accent pl-6 py-2 bg-white/5 backdrop-blur-sm rounded-r-lg">
            <p className="italic text-blue-50">"Sistema CMMS padrão ouro para a indústria brasileira."</p>
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

            {/* Hint para admin root */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-slate-600">
              <p><strong>Admin Root:</strong> usuário: <code className="bg-blue-100 px-1 py-0.5 rounded">admin</code> | senha: <code className="bg-blue-100 px-1 py-0.5 rounded">admin</code></p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Error Message */}
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
                  placeholder="admin ou nome@empresa.com.br"
                  className="block w-full rounded-lg border-0 py-3 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900">
                  Senha
                </label>
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
                className="flex w-full justify-center rounded-lg bg-primary px-3 py-3.5 text-sm font-bold leading-6 text-white shadow-sm hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn size={20} className="group-hover:translate-x-0.5 transition-transform" />
                    Entrar no Sistema
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
              <span className="bg-white px-6 text-slate-500">Novo acesso</span>
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-100 hover:ring-brand-accent/50 transition-all group border-l-4 border-l-transparent hover:border-l-brand-accent"
            >
              <UserPlus size={20} className="text-brand-accent" />
              Criar conta de Solicitante
            </button>
          </div>

          <div className="flex flex-col gap-4 text-center mt-8">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Novo Horizonte Indústria. Todos os direitos reservados.
              <br />Versão do Sistema: v1.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Registro */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Criar Conta</h3>
                  <p className="text-xs text-slate-500">Preencha seus dados para solicitar acesso</p>
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
                <X size={20} />
              </button>
            </div>

            {/* Body do Modal */}
            <div className="p-6">
              {registerSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center space-y-2">
                  <div className="text-4xl text-green-600">✓</div>
                  <h4 className="text-sm font-bold text-green-900">Conta criada com sucesso!</h4>
                  <p className="text-xs text-green-700">
                    Sua conta foi criada e está aguardando aprovação.
                  </p>
                  <div className="bg-green-100 rounded p-2 text-xs text-green-800">
                    {registerRole === 'admin'
                      ? '⚡ Aguardando aprovação do Administrador Root'
                      : '👥 Aguardando aprovação de um Administrador'
                    }
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  {registerError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                      <AlertCircle size={16} />
                      <span className="text-sm">{registerError}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="registerName" className="block text-sm font-medium text-slate-900 mb-2">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User size={18} />
                      </div>
                      <input
                        id="registerName"
                        type="text"
                        required
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="João da Silva"
                        className="block w-full rounded-lg border-0 py-2.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerUsername" className="block text-sm font-medium text-slate-900 mb-2">
                      Nome de Usuário *
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User size={18} />
                      </div>
                      <input
                        id="registerUsername"
                        type="text"
                        required
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        placeholder="joaosilva"
                        className="block w-full rounded-lg border-0 py-2.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm outline-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Usado para fazer login (sem espaços ou caracteres especiais)</p>
                  </div>

                  <div>
                    <label htmlFor="registerEmail" className="block text-sm font-medium text-slate-900 mb-2">
                      E-mail *
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail size={18} />
                      </div>
                      <input
                        id="registerEmail"
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="joao@empresa.com.br"
                        className="block w-full rounded-lg border-0 py-2.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerPhone" className="block text-sm font-medium text-slate-900 mb-2">
                      Número WhatsApp
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <WhatsappIcon size={18} />
                      </div>
                      <input
                        id="registerPhone"
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="block w-full rounded-lg border-0 py-2.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerPassword" className="block text-sm font-medium text-slate-900 mb-2">
                      Senha *
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                        className="block w-full rounded-lg border-0 py-2.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm outline-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Mínimo de 6 caracteres</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-3">
                      <Shield className="inline w-4 h-4 mr-1" />
                      Tipo de Conta *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegisterRole('user')}
                        className={`p-4 border-2 rounded-lg transition-all ${registerRole === 'user'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <User size={24} className={`mx-auto mb-2 ${registerRole === 'user' ? 'text-primary' : 'text-slate-400'}`} />
                        <div className="text-sm font-semibold">Usuário</div>
                        <div className="text-xs text-slate-500 mt-1">Solicitar manutenções</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterRole('admin')}
                        className={`p-4 border-2 rounded-lg transition-all ${registerRole === 'admin'
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <Shield size={24} className={`mx-auto mb-2 ${registerRole === 'admin' ? 'text-amber-600' : 'text-slate-400'}`} />
                        <div className="text-sm font-semibold">Admin</div>
                        <div className="text-xs text-slate-500 mt-1">Gerenciar sistema</div>
                      </button>
                    </div>
                  </div>

                  <div className={`border-l-4 rounded-lg p-3 text-xs ${registerRole === 'admin'
                    ? 'bg-amber-50 border-amber-500 text-amber-900'
                    : 'bg-blue-50 border-blue-500 text-blue-900'
                    }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Sistema de Aprovação</p>
                        <p>{getApprovalMessage()}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full flex justify-center items-center gap-2 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registerLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Criando conta...
                      </>
                    ) : (
                      <>
                        <UserPlus size={20} />
                        Criar Conta
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;