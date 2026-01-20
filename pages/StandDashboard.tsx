
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, Car, Lead, UserRole, ProfileStatus } from '../types';
import { TRANSLATIONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  lang: Language;
  role: UserRole;
}

const StandDashboard: React.FC<DashboardProps> = ({ lang, role }) => {
  const t = TRANSLATIONS[lang].dashboard;
  const tc = TRANSLATIONS[lang].common;
  const navigate = useNavigate();
  const [standName, setStandName] = useState('');
  const [status, setStatus] = useState<ProfileStatus>('approved');
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStandData = async () => {
    if (role !== UserRole.STAND) {
       navigate('/login');
       return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setStandName(user.user_metadata?.stand_name || 'Stand');
        
        // Verificar status do perfil na tabela pública
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', user.id)
          .single();
        
        const currentStatus = profile?.status || user.user_metadata?.status || 'pending';
        setStatus(currentStatus);

        if (currentStatus === 'approved') {
          // Busca anúncios do usuário logado
          const { data: carsData } = await supabase
            .from('cars')
            .select('*')
            .eq('user_id', user.id);
          
          if (carsData) setMyCars(carsData);

          // Busca leads dos carros do usuário
          const { data: leadsData } = await supabase
            .from('leads')
            .select('*, cars(brand, model)')
            .order('created_at', { ascending: false });

          if (leadsData) setMyLeads(leadsData as any);
        }
      } else {
        const localSession = localStorage.getItem('fc_session');
        if (localSession) {
          const session = JSON.parse(localSession);
          setStandName(session.stand_name || 'Meu Stand');
          setStatus('approved'); // Mocked admins/local are approved
        }
      }
    } catch (e) {
      console.error("Dashboard data fetch error", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStandData();
  }, [role, navigate]);

  const handleDeleteCar = async (id: string) => {
    if (!window.confirm(tc.confirmDelete)) return;
    
    try {
      const { error } = await supabase.from('cars').delete().eq('id', id);
      
      // Se houver erro e não houver sessão local (bypass), alertamos
      if (error && !localStorage.getItem('fc_session')) {
        throw error;
      }
      
      // Remove do estado local
      setMyCars(prev => prev.filter(car => car.id !== id));
      alert(lang === 'pt' ? "Viatura removida com sucesso!" : "Vehicle removed successfully!");
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl p-10 md:p-16 text-center border border-gray-100 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">
            <i className="fas fa-clock"></i>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Conta em Verificação</h2>
          <p className="text-gray-500 leading-relaxed mb-10">
            Olá <span className="font-bold text-gray-900">{standName}</span>! O seu pedido para se juntar à rede Facilitador Car está a ser analisado pela nossa equipa administrativa. 
            <br/><br/>
            Este processo costuma demorar entre 12 a 24 horas úteis para garantir a qualidade e credibilidade da nossa plataforma. Assim que for aprovado, terá acesso total ao seu painel.
          </p>
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4 text-left">
            <i className="fas fa-info-circle text-blue-600 text-xl"></i>
            <p className="text-xs text-blue-800 font-medium">Receberá um e-mail de confirmação assim que o seu stand for ativado. Agradecemos a paciência!</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="mt-10 text-gray-400 font-bold hover:text-gray-600 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl p-10 md:p-16 text-center border border-red-100 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">
            <i className="fas fa-times"></i>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Acesso Negado</h2>
          <p className="text-gray-500 leading-relaxed mb-10">
            Lamentamos informar, mas o seu stand não foi aprovado para integrar a rede Facilitador Car neste momento. 
            <br/><br/>
            Os nossos critérios de verificação são rigorosos para manter a confiança dos compradores. Se acredita tratar-se de um erro, contacte o suporte.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-gray-400 font-bold hover:text-gray-600 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const statsData = [
    { name: lang === 'pt' ? 'Seg' : 'Mon', leads: 4, views: 120 },
    { name: lang === 'pt' ? 'Ter' : 'Tue', leads: 7, views: 250 },
    { name: lang === 'pt' ? 'Qua' : 'Wed', leads: 5, views: 180 },
    { name: lang === 'pt' ? 'Qui' : 'Thu', leads: 12, views: 400 },
    { name: lang === 'pt' ? 'Sex' : 'Fri', leads: 9, views: 320 },
    { name: lang === 'pt' ? 'Sáb' : 'Sat', leads: 15, views: 520 },
    { name: lang === 'pt' ? 'Dom' : 'Sun', leads: 10, views: 450 },
  ];

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-500">{standName} - {t.subtitle}</p>
          </div>
          <button 
            onClick={() => navigate('/anunciar')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <i className="fas fa-plus mr-2"></i>
            {t.newAd}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">{t.stats[2]}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : myCars.length}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">{t.stats[0]}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : myLeads.length}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">{t.stats[1]}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">1.2k</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold mb-8">{t.weeklyPerformance}</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8faff'}} />
                    <Bar dataKey="leads" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold mb-8">{t.myVehicles}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="px-6 py-4">{tc.brand}/{lang === 'pt' ? 'Modelo' : 'Model'}</th>
                      <th className="px-6 py-4">{tc.price}</th>
                      <th className="px-6 py-4 text-right">{tc.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myCars.map(car => (
                      <tr key={car.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold text-sm">{car.brand} {car.model}</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">
                          {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(car.price)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteCar(car.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-8">{t.recentLeads}</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
               {myLeads.length > 0 ? (
                 myLeads.map(lead => (
                   <div key={lead.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                     <div className="flex justify-between items-start mb-2">
                       <p className="font-bold text-gray-900 text-sm">{lead.customer_name}</p>
                       <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                         {lead.status}
                       </span>
                     </div>
                     <p className="text-xs text-blue-600 font-medium mb-2">
                       {lead.car ? `${lead.car.brand} ${lead.car.model}` : 'Veículo Indisponível'}
                     </p>
                     <p className="text-xs text-gray-500 line-clamp-2">{lead.message}</p>
                     <div className="mt-3 flex gap-2">
                       <a href={`tel:${lead.customer_phone}`} className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 transition-colors">
                         <i className="fas fa-phone-alt"></i>
                       </a>
                       <a href={`mailto:${lead.customer_email}`} className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 transition-colors">
                         <i className="fas fa-envelope"></i>
                       </a>
                     </div>
                   </div>
                 ))
               ) : (
                 <p className="text-gray-400 text-sm italic text-center py-10">Nenhum lead recebido ainda.</p>
               )}
            </div>
            <button className="w-full mt-8 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">
              {t.manageLeads}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandDashboard;
