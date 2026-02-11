import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
    LayoutDashboard,
    Users,
    DollarSign,
    Search,
    Filter,
    Download,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    Activity,
    Zap
} from 'lucide-react';

interface Profile {
    id: string;
    email: string | null;
    subscription_tier: string | null;
    credits: number;
    has_lifetime_prompt: boolean;
    created_at: string;
}

interface DashboardStats {
    totalUsers: number;
    totalMrr: number;
    totalLifetimeRevenue: number;
    activeSubscribers: number;
    planDistribution: {
        start: number;
        pro: number;
        max: number;
        free: number;
    };
}

const StatCard = ({ title, value, icon, subtext }: any) => (
    <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">{title}</span>
            <div className="p-2 bg-zinc-800 rounded-lg">{icon}</div>
        </div>
        <div>
            <div className="text-2xl font-bold text-white">{value}</div>
            {subtext && <div className="text-sm text-zinc-500 mt-1">{subtext}</div>}
        </div>
    </div>
);

const PlanBadge = ({ plan }: { plan: string | null }) => {
    let colorClass = 'bg-zinc-800 text-zinc-400 border-zinc-700'; // Free
    let label = 'Gratuito';

    switch (plan) {
        case 'Ultra Start':
            colorClass = 'bg-blue-900/30 text-blue-400 border-blue-800';
            label = 'Ultra Start';
            break;
        case 'Ultra Pro':
            colorClass = 'bg-purple-900/30 text-purple-400 border-purple-800';
            label = 'Ultra Pro';
            break;
        case 'Ultra Max':
            colorClass = 'bg-orange-900/30 text-orange-400 border-orange-800';
            label = 'Ultra Max';
            break;
    }

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
            {label}
        </span>
    );
};

export const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalMrr: 0,
        totalLifetimeRevenue: 0,
        activeSubscribers: 0,
        planDistribution: { start: 0, pro: 0, max: 0, free: 0 }
    });

    const ADMIN_EMAIL = 'othonbrian@gmail.com';

    useEffect(() => {
        if (user?.email === ADMIN_EMAIL) {
            fetchData();
        } else {
            setLoading(false);
            setError('Acesso negado. Apenas administradores podem ver esta página.');
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch all profiles
            // NOTE: This requires an RLS policy that allows the admin email to SELECT * from profiles
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                setProfiles(data);
                calculateStats(data);
            }
        } catch (err: any) {
            console.error('Error fetching admin data:', err);
            setError(`Erro ao carregar dados: ${err.message || 'Verifique as permissões RLS no Supabase.'}`);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: Profile[]) => {
        let mrr = 0;
        let lifetimeRevenue = 0;
        let subscribers = 0;
        const distribution = { start: 0, pro: 0, max: 0, free: 0 };

        data.forEach(user => {
            // Lifetime Revenue
            if (user.has_lifetime_prompt) {
                lifetimeRevenue += 37.00;
            }

            // MRR & Subscription Counts
            switch (user.subscription_tier) {
                case 'Ultra Start':
                    mrr += 39.90;
                    subscribers++;
                    distribution.start++;
                    break;
                case 'Ultra Pro':
                    mrr += 97.90;
                    subscribers++;
                    distribution.pro++;
                    break;
                case 'Ultra Max':
                    mrr += 197.90;
                    subscribers++;
                    distribution.max++;
                    break;
                default:
                    distribution.free++;
            }
        });

        setStats({
            totalUsers: data.length,
            totalMrr: mrr,
            totalLifetimeRevenue: lifetimeRevenue,
            activeSubscribers: subscribers,
            planDistribution: distribution
        });
    };

    const filteredUsers = profiles.filter(profile => {
        const matchesSearch = (profile.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterPlan === 'all' ||
            (filterPlan === 'lifetime' && profile.has_lifetime_prompt) ||
            (filterPlan === 'Ultra Start' && profile.subscription_tier === 'Ultra Start') ||
            (filterPlan === 'Ultra Pro' && profile.subscription_tier === 'Ultra Pro') ||
            (filterPlan === 'Ultra Max' && profile.subscription_tier === 'Ultra Max') ||
            (filterPlan === 'free' && (!profile.subscription_tier || profile.subscription_tier === 'free'));

        return matchesSearch && matchesFilter;
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (!user || user.email !== ADMIN_EMAIL) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center">
                <div className="max-w-md space-y-4 bg-zinc-900/50 p-8 rounded-2xl border border-red-900/50">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold text-red-400">Acesso Restrito</h2>
                    <p className="text-zinc-400">Este painel é exclusivo para administradores.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <LayoutDashboard className="text-orange-500" />
                        Painel Administrativo
                    </h1>
                    <p className="text-zinc-400 mt-1">Visão geral de usuários, receitas e métricas do sistema.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <Activity size={16} /> Atualizar Dados
                </button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-red-200 flex items-start gap-3">
                    <AlertTriangle className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold">Erro de Acesso aos Dados</p>
                        <p className="text-sm opacity-90">{error}</p>
                        <p className="text-xs mt-2 text-red-300">
                            Dica: Execute o comando SQL para liberar acesso ao seu email no Supabase.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Receita Mensal (MRR)"
                    value={formatCurrency(stats.totalMrr)}
                    icon={<DollarSign className="text-green-500" />}
                    subtext="Baseado em assinaturas ativas"
                />
                <StatCard
                    title="Faturamento Vitalício"
                    value={formatCurrency(stats.totalLifetimeRevenue)}
                    icon={<TrendingUp className="text-blue-500" />}
                    subtext="Vendas únicas"
                />
                <StatCard
                    title="Total de Usuários"
                    value={stats.totalUsers.toString()}
                    icon={<Users className="text-purple-500" />}
                />
                <StatCard
                    title="Assinantes Ativos"
                    value={stats.activeSubscribers.toString()}
                    icon={<Zap className="text-orange-500" />}
                    subtext={`${((stats.activeSubscribers / (stats.totalUsers || 1)) * 100).toFixed(1)}% de conversão`}
                />
            </div>

            {/* Controls & Filters */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <Filter size={18} className="text-zinc-500" />
                    <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="bg-black/50 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    >
                        <option value="all">Todos os Planos</option>
                        <option value="Ultra Start">Ultra Start</option>
                        <option value="Ultra Pro">Ultra Pro</option>
                        <option value="Ultra Max">Ultra Max</option>
                        <option value="lifetime">Vitalício</option>
                        <option value="free">Gratuito</option>
                    </select>

                    <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors ml-auto flex items-center gap-2">
                        <Download size={16} /> <span className="hidden md:inline">Exportar CSV</span>
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-medium">
                            <tr>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Plano Atual</th>
                                <th className="px-6 py-4 text-center">Saldo Cr.</th>
                                <th className="px-6 py-4 text-center">Usados</th>
                                <th className="px-6 py-4 text-center">Vitalício</th>
                                <th className="px-6 py-4 text-right">Data Entrada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                        <div className="flex justify-center mb-2"><Activity className="animate-spin text-orange-500" /></div>
                                        Carregando dados...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                        Nenhum usuário encontrado com os filtros atuais.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{profile.email}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{profile.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <PlanBadge plan={profile.subscription_tier} />
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-zinc-300">
                                            {profile.credits}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-zinc-500">
                                            {(() => {
                                                const limits: Record<string, number> = {
                                                    'Ultra Start': 20, 'Ultra Pro': 70, 'Ultra Max': 180, 'free': 20
                                                };
                                                const limit = limits[profile.subscription_tier || 'free'] || 20;
                                                // If credits > limit (e.g. bonus), show 0 used
                                                return Math.max(0, limit - profile.credits);
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {profile.has_lifetime_prompt ? (
                                                <CheckCircle size={18} className="text-green-500 mx-auto" />
                                            ) : (
                                                <span className="text-zinc-700">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-zinc-500">
                                            {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-zinc-900/80 border-t border-zinc-800 px-6 py-3 text-xs text-zinc-500 flex justify-between">
                    <span>Mostrando {filteredUsers.length} de {profiles.length} usuários</span>
                    <span>Atualizado em: {new Date().toLocaleTimeString()}</span>
                </div>
            </div>

        </div>
    );
};
