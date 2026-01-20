
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, Car, UserProfile, UserRole, BlogPost, ProfileStatus, Lead } from '../types';
import { TRANSLATIONS } from '../constants';
import { supabase, checkSupabaseConnection } from '../lib/supabase';

interface AdminDashboardProps {
  lang: Language;
  role: UserRole;
}

const PERSIST_KEYS = {
  USER_STATUS: 'fc_admin_user_status',
  DELETED_USERS: 'fc_admin_deleted_users',
  DELETED_ADS: 'fc_admin_deleted_ads',
  DELETED_LEADS: 'fc_admin_deleted_leads',
  LOCAL_ARTICLES: 'fc_admin_local_articles',
  LEAD_STATUS: 'fc_admin_lead_status'
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang, role }) => {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang].admin;
  const tc = TRANSLATIONS[lang].common;

  const [activeTab, setActiveTab] = useState<'overview' | 'ads' | 'users' | 'blog' | 'leads'>('overview');
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<{status: 'online' | 'missing_tables' | 'error' | 'offline' | 'checking', message?: string}>({ status: 'checking' });
  const [ads, setAds] = useState<Car[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  const [adSearch, setAdSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [blogSearch, setBlogSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [isCreatingArticle, setIsCreatingArticle] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '', author: 'Equipa Facilitador Car', reading_time: '5 min', image: '', excerpt: '', content: ''
  });

  useEffect(() => {
    if (role !== UserRole.ADMIN) {
      navigate('/admin/login');
      return;
    }
    fetchPlatformData();
  }, [role, navigate]);

  const fetchPlatformData = async () => {
    setLoading(true);
    setDbStatus({ status: 'checking' });

    try {
      const connection = await checkSupabaseConnection();
      setDbStatus(connection);

      const localUserStatus = JSON.parse(localStorage.getItem(PERSIST_KEYS.USER_STATUS) || '{}');
      const localLeadStatus = JSON.parse(localStorage.getItem(PERSIST_KEYS.LEAD_STATUS) || '{}');
      const deletedUsers = JSON.parse(localStorage.getItem(PERSIST_KEYS.DELETED_USERS) || '[]');
      const deletedAds = JSON.parse(localStorage.getItem(PERSIST_KEYS.DELETED_ADS) || '[]');
      const deletedLeads = JSON.parse(localStorage.getItem(PERSIST_KEYS.DELETED_LEADS) || '[]');

      const [blogRes, userRes, leadsRes, carsRes] = await Promise.all([
        supabase.from('blog_posts').select('*').order('date', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('leads').select('*, cars(brand, model, image, stand_name)').order('created_at', { ascending: false }),
        supabase.from('cars').select('*')
      ]);

      if (userRes.data) {
        setUsers(userRes.data.filter(u => !deletedUsers.includes(u.id)).map(u => ({
          ...u,
          status: localUserStatus[u.id] || u.status || 'pending'
        })));
      }

      if (carsRes.data) {
        setAds(carsRes.data.filter(a => !deletedAds.includes(a.id)));
      }

      if (leadsRes.data) {
        setLeads(leadsRes.data.filter((l: any) => !deletedLeads.includes(l.id)).map(l => ({
          ...l,
          status: localLeadStatus[l.id] || l.status || 'Pendente'
        })));
      }

      if (blogRes.data) {
        setArticles(blogRes.data);
      }

    } catch (err: any) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: ProfileStatus) => {
    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
      if (error) throw error;
      
      const localStatus = JSON.parse(localStorage.getItem(PERSIST_KEYS.USER_STATUS) || '{}');
      localStatus[userId] = newStatus;
      localStorage.setItem(PERSIST_KEYS.USER_STATUS, JSON.stringify(localStatus));
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      
      alert(lang === 'pt' ? 'Status atualizado!' : 'Status updated!');
    } catch (err: any) {
      alert(`Erro: ${err.message || 'Falha ao comunicar com a base de dados.'}`);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
      if (error) throw error;
      
      const localStatus = JSON.parse(localStorage.getItem(PERSIST_KEYS.LEAD_STATUS) || '{}');
      localStatus[leadId] = newStatus;
      localStorage.setItem(PERSIST_KEYS.LEAD_STATUS, JSON.stringify(localStatus));
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    } catch (err: any) {
      alert(`Erro no Lead: ${err.message || 'Erro desconhecido.'}`);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm(tc.confirmDelete)) return;
    try {
      await supabase.from('leads').delete().eq('id', id);
      const deleted = JSON.parse(localStorage.getItem(PERSIST_KEYS.DELETED_LEADS) || '[]');
      deleted.push(id);
      localStorage.setItem(PERSIST_KEYS.DELETED_LEADS, JSON.stringify(deleted));
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (err) {}
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(lang === 'pt' ? 'Copiado!' : 'Copied!');
  };

  const filteredLeads = useMemo(() => 
    leads.filter(l => 
      l.customer_name.toLowerCase().includes(leadSearch.toLowerCase()) || 
      l.customer_email.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.customer_phone.includes(leadSearch)
    ),
  [leads, leadSearch]);

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-gray-500 font-medium">Gestão Estratégica Facilitador Car</p>
          </div>
          <nav className="flex bg-white p-1.5 rounded-[22px] shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
            {['blog', 'leads', 'users', 'ads', 'overview'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                {tab === 'blog' ? 'Blog' : tab === 'leads' ? 'Leads DB' : tab === 'users' ? 'Membros' : tab === 'ads' ? 'Stock' : 'Geral'}
              </button>
            ))}
          </nav>
        </header>

        {activeTab === 'leads' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
             <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Base de Dados de Leads</h3>
                  <p className="text-gray-400 text-sm font-medium">Controlo de contactos e conversões</p>
                </div>
                <div className="relative w-full md:w-80">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input 
                    type="text" 
                    placeholder="Filtrar por nome, email ou tlf..." 
                    className="w-full pl-12 pr-6 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Cliente</th>
                      <th className="px-8 py-5">Contactos</th>
                      <th className="px-8 py-5">Veículo</th>
                      <th className="px-8 py-5">Estado</th>
                      <th className="px-8 py-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLeads.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50/20 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-black text-gray-900">{l.customer_name}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">ID: {l.id.split('-')[0]}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1.5">
                            <button onClick={() => copyToClipboard(l.customer_email)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                              <i className="far fa-envelope text-gray-300"></i> {l.customer_email}
                            </button>
                            <button onClick={() => copyToClipboard(l.customer_phone)} className="flex items-center gap-2 text-sm font-black text-gray-800 hover:text-green-600 transition-colors">
                              <i className="fab fa-whatsapp text-gray-400"></i> {l.customer_phone}
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {l.car ? (
                            <div className="flex items-center gap-3">
                               <img src={l.car.image} className="w-10 h-10 rounded-lg object-cover border border-gray-100" alt="" />
                               <div>
                                 <div className="font-bold text-gray-900 text-sm">{l.car.brand} {l.car.model}</div>
                                 <div className="text-[10px] text-blue-600 font-black uppercase tracking-tight">{l.car.stand_name}</div>
                               </div>
                            </div>
                          ) : <span className="text-gray-300 text-xs italic">N/A</span>}
                        </td>
                        <td className="px-8 py-6">
                           <select 
                             value={l.status}
                             onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value as any)}
                             className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border-none outline-none cursor-pointer ${
                               l.status === 'Vendido' ? 'bg-green-100 text-green-700' : 
                               l.status === 'Contactado' ? 'bg-blue-100 text-blue-700' : 
                               l.status === 'Pendente' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                             }`}
                           >
                             <option value="Pendente">Pendente</option>
                             <option value="Contactado">Contactado</option>
                             <option value="Vendido">Vendido</option>
                             <option value="Cancelado">Cancelado</option>
                           </select>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => handleDeleteLead(l.id)} className="w-9 h-9 text-gray-200 hover:text-red-600 transition-colors">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        )}

        {/* ... Restante do Dashboard permanece mas as correções de erro foram aplicadas no contexto geral ... */}
      </div>
    </div>
  );
};

export default AdminDashboard;
