
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../lib/supabase';

interface CreateAdProps {
  lang: Language;
}

const CreateAd: React.FC<CreateAdProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang].createAd;
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    category: 'Sedan' as any,
    mileage: 0,
    fuel: 'Gasolina' as any,
    transmission: 'Automático' as any,
    price: '',
    location: '',
    description: '',
    image: '',
    subdomain: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'subdomain') {
      const slugified = value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      setFormData(prev => ({ ...prev, [name]: slugified }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError(lang === 'pt' ? 'A imagem deve ter menos de 2MB.' : 'Image must be smaller than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      setError(lang === 'pt' ? 'Por favor, carregue uma imagem do veículo.' : 'Please upload a vehicle image.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { error: insertError } = await supabase
        .from('cars')
        .insert([{
          brand: formData.brand,
          model: formData.model,
          year: parseInt(formData.year.toString()),
          category: formData.category,
          mileage: parseInt(formData.mileage.toString()),
          fuel: formData.fuel,
          transmission: formData.transmission,
          price: parseFloat(formData.price),
          location: formData.location,
          description: formData.description,
          image: formData.image,
          subdomain: formData.subdomain || null,
          stand_name: user?.user_metadata?.stand_name || 'Stand Particular',
          user_id: user.id,
          verified: false 
        }]);

      if (insertError) throw insertError;

      setIsSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || JSON.stringify(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl text-center max-w-md w-full animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.success}</h2>
          <p className="text-gray-500">Redirecionando para o seu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12 md:py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{t.title}</h1>
          <p className="text-xl text-gray-500">{t.subtitle}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 sticky top-28 z-20 shadow-lg animate-bounce">
              <i className="fas fa-exclamation-triangle mr-2"></i> {error}
            </div>
          )}

          <section className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <i className="fas fa-camera mr-3 text-blue-600"></i>
              {t.commercial}
            </h3>
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center border-4 border-dashed border-gray-100 rounded-[40px] p-12 hover:border-blue-200 transition-all group bg-gray-50/50">
                {formData.image ? (
                  <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, image: ''})}
                      className="absolute top-4 right-4 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <div className="text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <i className="fas fa-cloud-upload-alt text-3xl"></i>
                    </div>
                    <p className="text-gray-900 font-black text-xl mb-2">{lang === 'pt' ? 'Clique para carregar foto' : 'Click to upload photo'}</p>
                    <p className="text-gray-400 text-sm">{lang === 'pt' ? 'PNG, JPG ou WEBP (Máx 2MB)' : 'PNG, JPG or WEBP (Max 2MB)'}</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.price} (€)</label>
                  <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-blue-600" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.location}</label>
                  <input required name="location" value={formData.location} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ex: Lisboa" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <i className="fas fa-info-circle mr-3 text-blue-600"></i>
              {t.basicInfo}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.brand}</label>
                <input required name="brand" value={formData.brand} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ex: BMW" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.model}</label>
                <input required name="model" value={formData.model} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ex: 320i" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.year}</label>
                <input required type="number" name="year" value={formData.year} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.category}</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="SUV">SUV</option>
                  <option value="Sedan">Sedan</option>
                  <option value="Coupe">Coupe</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="Utilitário">Utilitário</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <i className="fas fa-cogs mr-3 text-blue-600"></i>
              {t.technicalSpecs}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.mileage} (km)</label>
                <input required type="number" name="mileage" value={formData.mileage} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.fuel}</label>
                <select name="fuel" value={formData.fuel} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Elétrico">Elétrico</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.transmission}</label>
                <select name="transmission" value={formData.transmission} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="Automático">Automático</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <i className="fas fa-align-left mr-3 text-blue-600"></i>
              {t.fields.description}
            </h3>
            <textarea required name="description" value={formData.description} onChange={handleChange} rows={5} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" placeholder="Detalhes sobre o estado do veículo, extras, etc."></textarea>
          </section>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full py-6 rounded-[30px] font-black text-2xl transition-all shadow-xl flex items-center justify-center space-x-4 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
          >
            {isSubmitting ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-rocket"></i>}
            <span>{t.publish}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateAd;
