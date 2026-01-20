
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Language, Car } from '../types';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../lib/supabase';

interface EditAdProps {
  lang: Language;
}

const EditAd: React.FC<EditAdProps> = ({ lang }) => {
  const { id } = useParams<{ id: string }>();
  const t = TRANSLATIONS[lang].createAd;
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchCar = async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        setError(lang === 'pt' ? 'Erro ao carregar dados do veículo.' : 'Error loading vehicle data.');
      } else if (data) {
        setFormData({
          brand: data.brand,
          model: data.model,
          year: data.year,
          category: data.category,
          mileage: data.mileage,
          fuel: data.fuel,
          transmission: data.transmission,
          price: data.price.toString(),
          location: data.location,
          description: data.description,
          image: data.image,
          subdomain: data.subdomain || ''
        });
      }
      setLoading(false);
    };

    fetchCar();
  }, [id, lang]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error: updateError } = await supabase
        .from('cars')
        .update({
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
          subdomain: formData.subdomain || null
        })
        .eq('id', id);

      if (updateError) throw updateError;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900">{lang === 'pt' ? 'Editar Anúncio' : 'Edit Ad'}</h1>
          <p className="text-gray-500 mt-2">{formData.brand} {formData.model}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">{error}</div>}

          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.brand}</label>
                <input required name="brand" value={formData.brand} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.model}</label>
                <input required name="model" value={formData.model} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.price} (€)</label>
              <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t.fields.description}</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} rows={6} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-grow py-6 bg-blue-600 text-white rounded-[30px] font-black text-xl shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? <i className="fas fa-circle-notch animate-spin"></i> : (lang === 'pt' ? 'Guardar Alterações' : 'Save Changes')}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="px-10 py-6 bg-white border border-gray-200 text-gray-500 rounded-[30px] font-bold hover:bg-gray-50 transition-all"
            >
              {lang === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAd;
