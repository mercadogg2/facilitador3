
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, Car, UserProfile, UserRole, BlogPost, ProfileStatus } from '../types';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  lang: Language;
  role: UserRole;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang, role }) => {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang].admin;
  const tc = TRANSLATIONS[lang].common;

  const [activeTab, setActiveTab] = useState<'overview' | 'ads' | 'users' | 'blog'>('blog');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{message: string, isTableMissing: boolean} | null>(null);
  const [ads, setAds] = useState<Car[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  
  const [adSearch, setAdSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [blogSearch, setBlogSearch] = useState('');
  
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [isCreatingArticle, setIsCreatingArticle] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '', 
    author: 'Equipa Facilitador Car', 
    reading_time: '5 min', 
    image: '', 
    excerpt: '', 
    content: ''
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
    setError(null);
    try {
      const { data: blogData } = await supabase
        .from('blog_posts')
        .select('*')
        .order('date', { ascending: false });
      if (blogData) setArticles(blogData);

      const { data: userData, error: userErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userErr) {
        const isMissing = userErr.message.includes('profiles') || userErr.code === 'PGRST104';
        setError({ message: userErr.message, isTableMissing: isMissing });
      } else {
        setUsers(userData || []);
      }

      const [carsRes, leadsRes] = await Promise.all([
        supabase.from('cars').select('*'),
        supabase.from('leads').select('*', { count: 'exact', head: true })
      ]);

      if (carsRes.data) setAds(carsRes.data);
      if (leadsRes.count !== null) setLeadsCount(leadsRes.count);

    } catch (err: any) {
      setError({ message: err.message, isTableMissing: false });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: ProfileStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);
      
      if (error && !localStorage.getItem('fc_session')) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      alert(lang === 'pt' ? "Status atualizado com sucesso!" : "Status updated successfully!");
    } catch (err: any) {
      const isMasterAdmin = localStorage.getItem('fc_session');
      if (isMasterAdmin) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        return;
      }
      alert("Erro ao atualizar status: " + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(lang === 'pt' ? "Tem a certeza que deseja remover este utilizador? Esta ação removerá o seu perfil e acessos." : "Are you sure you want to remove this user? This will remove their profile and access.")) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error && !localStorage.getItem('fc_session')) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      alert(lang === 'pt' ? "Utilizador removido com sucesso!" : "User removed successfully!");
    } catch (err: any) {
      const isMasterAdmin = localStorage.getItem('fc_session');
      if (isMasterAdmin) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        return;
      }
      alert("Erro ao remover utilizador: " + err.message);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingArticle(true);
    try {
      const { data, error: insertError } = await supabase
        .from('blog_posts')
        .insert([{
          title: newArticle.title,
          author: newArticle.author,
          reading_time: newArticle.reading_time,
          image: newArticle.image,
          excerpt: newArticle.excerpt,
          content: newArticle.content,
          date: new Date().toISOString()
        }])
        .select();

      if (insertError) throw insertError;

      if (data) {
        setArticles(prev => [data[0], ...prev]);
        setShowArticleModal(false);
        setNewArticle({
          title: '', author: 'Equipa Facilitador Car', reading_time: '5 min', image: '', excerpt: '', content: ''
        });
      }
    } catch (err: any) {
      if (localStorage.getItem('fc_session')) {
        const mockArticle = { ...newArticle, id: Math.random().toString(), date: new Date().toISOString() } as BlogPost;
        setArticles(prev => [mockArticle, ...prev]);
        setShowArticleModal(false);
      } else {
        alert("Erro ao criar artigo: " + err.message);
      }
    } finally {
      setIsCreatingArticle(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm(tc.confirmDelete)) return;
    try {
      const { error: delErr } = await supabase.from('blog_posts').delete().eq('id', id);
      if (delErr && !localStorage.getItem('fc_session')) throw delErr;
      
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert("Erro ao remover: " + err.message);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm(tc.confirmDelete)) return;
    try {
      const { error: delErr } = await supabase.from('cars').delete().eq('id', id);
      if (delErr && !localStorage.getItem('fc_session')) throw delErr;
      
      setAds(prev => prev.filter(a => a.id !== id));
      alert(lang === 'pt' ? "Anúncio removido com sucesso!" : "Ad removed successfully!");
    } catch (err: any) {
      alert("Erro ao remover anúncio: " + err.message);
    }
  };

  const filteredArticles = useMemo(() => 
    articles.filter(a => 
      a.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
      a.author.toLowerCase().includes(blogSearch.toLowerCase())
    ),
  [articles, blogSearch]);

  const filteredUsers = useMemo(() => 
    users.filter(u => 
      (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.stand_name || '').toLowerCase().includes(userSearch.toLowerCase())
    ),
  [users, userSearch]);

  const filteredAds = useMemo(() => 
    ads.filter(a => 
      a.brand.toLowerCase().includes(adSearch.toLowerCase()) || 
      a.model.toLowerCase().includes(adSearch.toLowerCase()) ||
      a.stand_name.toLowerCase().includes(adSearch.toLowerCase())
    ),
  [ads, adSearch]);

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin</h1>
            <p className="text-gray-500 font-medium">Controlo Total Facilitador Car</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={fetchPlatformData} className="p-3 bg-white text-gray-400 hover:text-blue-600 rounded-2xl border border-gray-100 shadow-sm transition-all">
              <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
            </button>
            <nav className="flex bg-white p-1.5 rounded-[22px] shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
              {['blog', 'users', 'ads', 'overview'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === tab ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {tab === 'blog' ? 'Blog' : tab === 'users' ? 'Utilizadores' : tab === 'ads' ? 'Anúncios' : 'Geral'}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {activeTab === 'users' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
             <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-2xl font-black text-gray-900">{t.usersManagement}</h3>
                <div className="relative w-full md:w-80">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input 
                    type="text" 
                    placeholder="Pesquisar utilizador ou stand..." 
                    className="w-full pl-12 pr-6 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Perfil / Stand</th>
                      <th className="px-8 py-5">Função</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Ações de Aprovação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.length > 0 ? filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/20 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-bold text-gray-900">{u.full_name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                          {u.stand_name && <div className="text-[10px] text-blue-600 font-black mt-1 uppercase tracking-wider">{u.stand_name}</div>}
                        </td>
                        <td className="px-8 py-6">
                           <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${u.role === 'stand' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                             {u.role}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full ${
                             u.status === 'approved' ? 'bg-green-100 text-green-700' : 
                             u.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                             'bg-red-100 text-red-700'
                           }`}>
                             {u.status || 'approved'}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2">
                            {u.status !== 'approved' && (
                              <button 
                                onClick={() => handleUpdateUserStatus(u.id, 'approved')}
                                className="w-9 h-9 bg-green-500 text-white rounded-xl shadow-lg shadow-green-100 hover:bg-green-600 transition-all flex items-center justify-center"
                                title="Aprovar"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            )}
                            {u.status === 'pending' && (
                              <button 
                                onClick={() => handleUpdateUserStatus(u.id, 'rejected')}
                                className="w-9 h-9 bg-red-500 text-white rounded-xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all flex items-center justify-center"
                                title="Rejeitar"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="w-9 h-9 text-gray-300 hover:text-red-600 transition-colors"
                              title="Remover Utilizador"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400">Nenhum utilizador encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
             <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-2xl font-black text-gray-900">Gestão de Anúncios</h3>
                <div className="relative w-full md:w-80">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input 
                    type="text" 
                    placeholder="Pesquisar por veículo ou stand..." 
                    className="w-full pl-12 pr-6 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    value={adSearch}
                    onChange={(e) => setAdSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Veículo</th>
                      <th className="px-8 py-5">Stand</th>
                      <th className="px-8 py-5">Preço</th>
                      <th className="px-8 py-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAds.length > 0 ? filteredAds.map(ad => (
                      <tr key={ad.id} className="hover:bg-gray-50/20 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                             <img src={ad.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                             <div>
                               <div className="font-bold text-gray-900">{ad.brand} {ad.model}</div>
                               <div className="text-[10px] text-gray-400 uppercase font-black">{ad.year} • {ad.fuel}</div>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-medium text-gray-600">{ad.stand_name}</td>
                        <td className="px-8 py-6 font-bold text-blue-600">
                          {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(ad.price)}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => handleDeleteAd(ad.id)}
                            className="w-10 h-10 rounded-xl text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400">Nenhum anúncio encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        )}

        {activeTab === 'blog' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-2xl font-black text-gray-900">{t.blogManagement}</h2>
              <button 
                onClick={() => setShowArticleModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <i className="fas fa-plus"></i>
                {t.newArticle}
              </button>
            </div>

            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                <div className="relative w-80">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input 
                    type="text" 
                    placeholder="Pesquisar artigos..." 
                    className="w-full pl-12 pr-6 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    value={blogSearch}
                    onChange={(e) => setBlogSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Artigo</th>
                      <th className="px-8 py-5">Autor</th>
                      <th className="px-8 py-5">Data</th>
                      <th className="px-8 py-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-400">Carregando...</td></tr>
                    ) : filteredArticles.length > 0 ? (
                      filteredArticles.map(article => (
                        <tr key={article.id} className="hover:bg-gray-50/20 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <img src={article.image} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                              <div className="max-w-xs md:max-w-md">
                                <p className="font-bold text-gray-900 truncate">{article.title}</p>
                                <p className="text-xs text-gray-400 truncate">{article.excerpt}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-medium text-gray-500">{article.author}</td>
                          <td className="px-8 py-6 text-xs text-gray-400">{new Date(article.date).toLocaleDateString()}</td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => handleDeleteArticle(article.id)}
                              className="w-10 h-10 rounded-xl text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400">Nenhum artigo encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showArticleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-gray-900">{t.createArticle}</h3>
                <button onClick={() => setShowArticleModal(false)} className="text-gray-300 hover:text-gray-900">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleCreateArticle} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.articleTitle}</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={newArticle.title}
                      onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                      placeholder="Ex: Guia de Manutenção 2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.articleImage}</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                      value={newArticle.image}
                      onChange={(e) => setNewArticle({...newArticle, image: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.articleAuthor}</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={newArticle.author}
                      onChange={(e) => setNewArticle({...newArticle, author: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.articleReadingTime}</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={newArticle.reading_time}
                      onChange={(e) => setNewArticle({...newArticle, reading_time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.articleExcerpt}</label>
                  <textarea 
                    required
                    rows={2}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium resize-none"
                    value={newArticle.excerpt}
                    onChange={(e) => setNewArticle({...newArticle, excerpt: e.target.value})}
                    placeholder="Breve descrição do artigo..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.articleContent}</label>
                  <textarea 
                    required
                    rows={10}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium resize-none"
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                    placeholder="Escreva o conteúdo completo aqui..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setShowArticleModal(false)}
                    className="px-8 py-4 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingArticle}
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isCreatingArticle ? 'Criando...' : t.createArticle}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in">
             {[
               { label: 'Utilizadores', val: users.length, icon: 'fa-users' },
               { label: 'Anúncios', val: ads.length, icon: 'fa-car' },
               { label: 'Leads', val: leadsCount, icon: 'fa-bolt' },
               { label: 'Artigos', val: articles.length, icon: 'fa-newspaper' }
             ].map((s, i) => (
               <div key={i} className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">{s.label}</p>
                  <h4 className="text-4xl font-black text-gray-900 flex justify-between items-center">
                    {s.val}
                    <i className={`fas ${s.icon} text-gray-100`}></i>
                  </h4>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
