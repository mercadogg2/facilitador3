
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../lib/supabase';

interface AuthProps {
  lang: Language;
  mode: 'login' | 'register';
  onLogin: (role: UserRole) => void;
}

const Auth: React.FC<AuthProps> = ({ lang, mode: initialMode, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [userType, setUserType] = useState<UserRole>(UserRole.VISITOR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const t = TRANSLATIONS[lang].auth;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '', standName: '', email: '', password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Bypass para Admin fixo
      if (mode === 'login' && formData.email === 'admin@facilitadorcar.pt' && formData.password === 'admin123') {
        localStorage.setItem('fc_session', JSON.stringify({
          email: formData.email, role: UserRole.ADMIN, timestamp: new Date().getTime()
        }));
        onLogin(UserRole.ADMIN);
        setIsSuccess(true);
        setTimeout(() => navigate('/admin'), 1500);
        return;
      }

      if (mode === 'register') {
        if (formData.email.toLowerCase() === 'admin@facilitadorcar.pt') {
          throw new Error(lang === 'pt' ? 'Não é permitido criar contas com este e-mail.' : 'Cannot create accounts with this email.');
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              stand_name: userType === UserRole.STAND ? formData.standName : null,
              role: userType
            }
          }
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Criar perfil na tabela pública
          const { error: profileError } = await supabase.from('profiles').insert([{
            id: signUpData.user.id,
            full_name: formData.name,
            email: formData.email,
            role: userType,
            stand_name: userType === UserRole.STAND ? formData.standName : null,
            created_at: new Date().toISOString()
          }]);
          
          if (profileError) {
            console.warn("Profile table insert failed, metadata is used as fallback.", profileError.message);
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email, password: formData.password,
        });
        if (signInError) throw signInError;
      }

      setIsSuccess(true);
      const { data: { user } } = await supabase.auth.getUser();
      let roleToSet: UserRole = userType;
      
      if (user?.email === 'admin@facilitadorcar.pt') {
        roleToSet = UserRole.ADMIN;
      } else if (user?.user_metadata?.role) {
        roleToSet = user.user_metadata.role;
      }

      onLogin(roleToSet);
      setTimeout(() => {
        if (roleToSet === UserRole.ADMIN) navigate('/admin');
        else if (roleToSet === UserRole.STAND) navigate('/dashboard');
        else navigate('/cliente');
      }, 1500);

    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' 
        ? (lang === 'pt' ? 'Dados inválidos. Verifique o e-mail e a palavra-passe.' : 'Invalid data. Check email and password.') 
        : err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center mb-10">
          <img 
            src="https://facilitadorcar.com/wp-content/uploads/2026/01/logo-facilitador.png" 
            alt="Facilitador Car" 
            className="h-32 w-auto"
          />
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          {mode === 'login' ? t.loginTitle : t.registerTitle}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          {mode === 'login' ? t.loginSubtitle : t.registerSubtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl sm:rounded-[40px] border border-gray-100 sm:px-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center animate-in fade-in slide-in-from-top-2">
              <i className="fas fa-exclamation-circle mr-2"></i> {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="space-y-6">
                {/* Account Type Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">{t.userType}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUserType(UserRole.VISITOR)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                        userType === UserRole.VISITOR 
                          ? 'border-blue-600 bg-blue-50 text-blue-700' 
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <i className="fas fa-user mb-2 text-xl"></i>
                      <span className="text-xs font-bold">{t.typeBuyer}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType(UserRole.STAND)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                        userType === UserRole.STAND 
                          ? 'border-blue-600 bg-blue-50 text-blue-700' 
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <i className="fas fa-store mb-2 text-xl"></i>
                      <span className="text-xs font-bold">{t.typeStand}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.name}</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" placeholder="Ex: João Silva" />
                </div>

                {userType === UserRole.STAND && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t.standName}</label>
                    <input required type="text" value={formData.standName} onChange={(e) => setFormData({...formData, standName: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" placeholder="Ex: Porto Motors" />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t.email}</label>
              <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" placeholder="exemplo@email.com" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t.password}</label>
              <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-5 px-4 rounded-2xl shadow-xl font-black text-lg text-white transition-all bg-blue-600 hover:bg-blue-700 shadow-blue-100 disabled:opacity-50">
              {isSubmitting ? <i className="fas fa-circle-notch animate-spin"></i> : (mode === 'login' ? t.submitLogin : t.submitRegister)}
            </button>
          </form>

          <div className="mt-8 text-center flex flex-col space-y-4">
            <button 
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }} 
              className="text-sm font-bold text-blue-600 hover:text-blue-500"
            >
              {mode === 'login' ? t.noAccount : t.hasAccount}
            </button>
            {mode === 'login' && (
              <Link to="/esqueci-senha" className="text-xs text-gray-400 hover:text-gray-600">
                {t.forgotPassword}
              </Link>
            )}
            <Link to="/admin/login" className="text-[10px] font-black uppercase tracking-widest text-gray-200 hover:text-indigo-500 transition-colors">Acesso Staff / Administrador</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
