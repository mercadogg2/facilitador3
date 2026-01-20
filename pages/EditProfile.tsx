
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface EditProfileProps {
  lang: Language;
}

const EditProfile: React.FC<EditProfileProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang].editProfile;
  const tc = TRANSLATIONS[lang].common;
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: 'Utilizador Demo',
    email: 'utilizador@facilitadorcar.pt',
    phone: '+351 912 345 678',
    location: 'Lisboa',
    currentPassword: '',
    newPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulação de atualização de dados
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => navigate('/cliente'), 2000);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl text-center max-w-md w-full animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.success}</h2>
          <p className="text-gray-500">Redirecionando para a sua área de cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate('/cliente')}
          className="mb-8 flex items-center text-gray-500 hover:text-blue-600 font-bold transition-all group"
        >
          <i className="fas fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i>
          {tc.back}
        </button>

        <header className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-gray-500 text-lg">{t.subtitle}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Section */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex items-center gap-8">
            <div className="relative group">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-inner">
                U
              </div>
              <button 
                type="button"
                className="absolute inset-0 bg-black/40 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
              >
                <i className="fas fa-camera mr-1"></i>
              </button>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Foto de Perfil</h3>
              <p className="text-gray-400 text-sm mb-4">Escolha uma imagem de até 2MB.</p>
              <button type="button" className="text-blue-600 font-bold text-sm hover:underline">{t.changePhoto}</button>
            </div>
          </div>

          {/* Personal Info */}
          <section className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <i className="fas fa-user-circle mr-3 text-blue-600"></i>
              {t.personalInfo}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.name}</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.email}</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.phone}</label>
                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.location}</label>
                <input name="location" value={formData.location} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <i className="fas fa-lock mr-3 text-blue-600"></i>
              {t.security}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.currentPassword}</label>
                <input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.newPassword}</label>
                <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Deixe em branco para manter" />
              </div>
            </div>
          </section>

          <div className="flex flex-col md:flex-row gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`flex-grow py-6 rounded-[30px] font-black text-xl transition-all shadow-xl flex items-center justify-center space-x-4 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
            >
              {isSubmitting ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-save"></i>}
              <span>{t.saveChanges}</span>
            </button>
            <button 
              type="button"
              onClick={() => navigate('/cliente')}
              className="px-10 py-6 rounded-[30px] font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
            >
              {lang === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
