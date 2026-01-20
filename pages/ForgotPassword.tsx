
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../lib/supabase';

interface ForgotPasswordProps {
  lang: Language;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ lang }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const t = TRANSLATIONS[lang].auth;
  const tc = TRANSLATIONS[lang].common;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/redefinir-senha`,
      });
      if (resetError) throw resetError;
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
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
          {t.forgotPasswordTitle}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t.forgotPasswordSubtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl sm:rounded-[40px] border border-gray-100 sm:px-12">
          
          {isSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                <i className="fas fa-paper-plane"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t.checkEmail}</h3>
              <p className="text-gray-500 mb-8">{email}</p>
              <Link to="/login" className="text-blue-600 font-bold hover:underline">
                {tc.back} ao Login
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.email}</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  placeholder="exemplo@email.com"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-5 px-4 rounded-2xl shadow-xl font-black text-lg text-white transition-all ${
                    isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                  }`}
                >
                  {isSubmitting ? <i className="fas fa-circle-notch animate-spin"></i> : t.sendResetLink}
                </button>
              </div>

              <div className="text-center">
                <Link to="/login" className="text-sm font-bold text-blue-600 hover:text-blue-500">
                  {tc.back} ao Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
