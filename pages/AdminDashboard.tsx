
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, Car, UserProfile, UserRole, BlogPost } from '../types';
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
      // 1. Artigos do Blog
      const { data: blogData } = await supabase
        .from('blog_posts')
        .select('*')
        .order('date', { ascending: false });
      if (blogData) setArticles(blogData);

      // 2. Perfis
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

      // 3. Outros dados
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
      alert("Erro ao criar artigo: " + err.message);
    } finally {
      setIsCreatingArticle(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm(tc.confirmDelete)) return;
    const { error: delErr } = await supabase.from('blog_posts').delete().eq('id', id);
    if (!delErr) {
      setArticles(prev => prev.filter(a => a.id !== id));
    } else {
      alert("Erro ao remover: " + delErr.message);
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
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
    ),
  [users, userSearch]);

  const sqlFix = `-- SCRIPT PARA REPARAR TABELAS E SEED DATA COMPLETO (7 ARTIGOS)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'visitor',
  stand_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  image TEXT,
  reading_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura Pública Profiles" ON public.profiles;
CREATE POLICY "Leitura Pública Profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura Pública Blog" ON public.blog_posts;
CREATE POLICY "Leitura Pública Blog" ON public.blog_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Blog" ON public.blog_posts;
CREATE POLICY "Admin Full Blog" ON public.blog_posts FOR ALL USING (true);

-- SEED DATA (7 Artigos Estratégicos SEO 2026)
INSERT INTO public.blog_posts (title, excerpt, content, author, image, reading_time)
VALUES 
('Como comprar carro usado com segurança em 2026', 'Dicas essenciais para evitar fraudes.', 'Comprar um carro usado pode ser um desafio...', 'Facilitador Car Team', 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=800', '5 min'),
('Carros Elétricos vs Híbridos: Qual a melhor escolha em Portugal?', 'Análise detalhada sobre custos e benefícios fiscais.', 'A transição energética está a acelerar...', 'Equipa Editorial', 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=800', '7 min'),
('O Mercado Automóvel em 2026: Confiança Digital', 'Como os stands verificados estão a mudar o mercado.', 'A confiança tornou-se a moeda principal...', 'Carlos Mendes, CEO', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800', '4 min'),
('Financiamento Automóvel: Taxas e Melhores Condições para 2026', 'Entenda como funcionam os novos juros e vantagens do leasing.', 'Em 2026, o mercado de crédito está mais competitivo...', 'Ricardo Costa', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800', '6 min'),
('Checklist de Manutenção: Como manter o valor de revenda', 'Pequenos cuidados diários que valem dinheiro.', 'A desvalorização de um veículo pode ser travada...', 'Oficina Facilitador', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800', '5 min'),
('Importar Carros em 2026: Guia Completo de Custos e ISV', 'Vale a pena buscar o seu próximo veículo na Alemanha?', 'A importação continua a ser uma via popular...', 'Marta Rodrigues', 'https://images.unsplash.com/photo-1542362567-b055002b91f4?auto=format&fit=crop&q=80&w=800', '8 min'),
('Marcas que menos desvalorizam em 2026: Onde investir?', 'Descubra quais modelos melhor retêm o valor em Portugal.', 'Comprar um carro é um investimento em mobilidade...', 'Análise de Mercado', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800', '6 min')
ON CONFLICT DO NOTHING;`;

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

        {error?.isTableMissing && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-[40px] p-10 animate-in fade-in slide-in-from-top-4 shadow-xl shadow-amber-100/20">
            <h3 className="text-2xl font-black text-amber-900 mb-3">Tabelas não encontradas</h3>
            <p className="text-amber-800 text-base mb-8">Execute o script abaixo no SQL Editor do Supabase para corrigir e carregar os artigos iniciais.</p>
            <div className="relative group">
              <pre className="bg-gray-950 text-indigo-400 p-8 rounded-[32px] text-sm font-mono overflow-x-auto shadow-2xl leading-relaxed border border-gray-800/50">
                {sqlFix}
              </pre>
              <button 
                onClick={() => { navigator.clipboard.writeText(sqlFix); alert("SQL Copiado!"); }}
                className="absolute top-6 right-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg"
              >
                Copiar Script
              </button>
            </div>
          </div>
        )}

        {activeTab === 'blog' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
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

        {/* Modal de Criação de Artigo */}
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

        {activeTab === 'users' && !error?.isTableMissing && (
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
             <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-900">{t.usersManagement}</h3>
                <input 
                  type="text" 
                  placeholder="Pesquisar utilizador..." 
                  className="pl-6 pr-6 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Perfil</th>
                      <th className="px-8 py-5">Nível</th>
                      <th className="px-8 py-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td className="px-8 py-6 font-bold text-gray-900">{u.full_name} <span className="text-gray-300 font-normal ml-2">{u.email}</span></td>
                        <td className="px-8 py-6 uppercase text-[10px] font-black">{u.role}</td>
                        <td className="px-8 py-6 text-right"><button className="text-gray-300 hover:text-red-600"><i className="fas fa-trash-alt"></i></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
