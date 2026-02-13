import React, { useEffect, useState, useMemo } from 'react';
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
    Zap,
    Edit2,
    Ban,
    X,
    Save,
    BarChart3
} from 'lucide-react';

interface Profile {
    id: string;
    email: string | null;
    subscription_tier: string | null;
    credits: number;
    has_lifetime_prompt: boolean;
    created_at: string;
    is_banned?: boolean;
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

const GrowthChart = ({ data }: { data: Profile[] }) => {
    const chartData = useMemo(() => {
        const grouped = data.reduce((acc, user) => {
            const date = new Date(user.created_at);
            const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }); // e.g., 'fev/25'
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[sortKey]) {
                acc[sortKey] = { label: key, count: 0 };
            }
            acc[sortKey].count++;
            return acc;
        }, {} as Record<string, { label: string; count: number }>);

        // Sort by date (keys are YYYY-MM)
        return Object.keys(grouped).sort().map(key => grouped[key]);
    }, [data]);

    if (chartData.length === 0) return null;

    const maxCount = Math.max(...chartData.map(d => d.count));

    return (
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl mt-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="text-zinc-400" size={20} />
                Crescimento de Usuários por Mês
            </h3>
            <div className="flex items-end gap-2 h-40 w-full overflow-x-auto pb-2 custom-scrollbar">
                {chartData.map((item, index) => (
                    <div key={index} className="flex-1 min-w-[60px] flex flex-col items-center gap-2 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 bg-zinc-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.count} usuários
                        </div>
                        {/* Bar */}
                        <div
                            className="w-full bg-zinc-800 hover:bg-orange-500/50 rounded-t transition-colors relative group-hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                            style={{ height: `${(item.count / maxCount) * 100}%` }}
                        ></div>
                        {/* Label */}
                        <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap uppercase">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AdminDashboard: React.FC = () => {
    const { user, refreshCredits } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');

    // Action States
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [banningUser, setBanningUser] = useState<Profile | null>(null);
    const [banConfirmation, setBanConfirmation] = useState('');
    const [editForm, setEditForm] = useState({ plan: 'free', credits: 0 });

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
        } else if (user) {
            // Only set error if user exists but is not admin. 
            // If user is null (loading), do nothing yet.
            setLoading(false);
            setError('Acesso negado. Apenas administradores podem ver esta página.');
        }
    }, [user?.email]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        console.log("AdminDashboard: Iniciando busca de dados...");

        // DEBUG: Verificar se as variáveis de ambiente estão carregadas
        try {
            const client = supabase as any;
            console.log("DEBUG CONFIG URL:", client.supabaseUrl);
            console.log("DEBUG CONFIG KEY LEN:", client.supabaseKey?.length);
        } catch (e) {
            console.error("Erro ao ler config supabase", e);
        }

        try {
            // Check session explicitly
            const { data: { session } } = await supabase.auth.getSession();
            console.log("DEBUG SESSION:", session ? "Active" : "None", session?.user?.email);

            if (!session) {
                setError("Sessão inválida ou expirada. Tente recarregar a página.");
                setLoading(false);
                return;
            }

            // Timeout de 30 segundos
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite excedido (30s). O banco de dados não respondeu.')), 30000)
            );

            const dataPromise = supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            const { data, error } = await Promise.race([dataPromise, timeoutPromise]) as any;

            if (error) throw error;

            console.log("AdminDashboard: Dados recebidos", data?.length);

            if (data) {
                setProfiles(data);
                calculateStats(data);
            }
        } catch (err: any) {
            console.error('Error fetching admin data:', err);
            setError(`Erro: ${err.message || 'Falha na comunicação com Supabase.'}`);
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
            if (user.has_lifetime_prompt) lifetimeRevenue += 37.00;

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

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    subscription_tier: editForm.plan,
                    credits: editForm.credits
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            // Update local state
            const updatedProfiles = profiles.map(p =>
                p.id === editingUser.id
                    ? { ...p, subscription_tier: editForm.plan, credits: editForm.credits }
                    : p
            );
            setProfiles(updatedProfiles);
            calculateStats(updatedProfiles);
            setEditingUser(null);

            // If admin edited themselves, refresh local auth state immediately
            if (user && editingUser.id === user.id) {
                await refreshCredits();
            }
        } catch (err: any) {
            alert('Erro ao atualizar usuário: ' + err.message);
        }
    };

    const handleBanUser = async () => {
        if (!banningUser || banConfirmation.toLowerCase() !== 'banir') return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: true })
                .eq('id', banningUser.id);

            if (error) throw error;

            const updatedProfiles = profiles.map(p =>
                p.id === banningUser.id ? { ...p, is_banned: true } : p
            );
            setProfiles(updatedProfiles);
            setBanningUser(null);
            setBanConfirmation('');
        } catch (err: any) {
            alert('Erro ao banir usuário. Verifique se a coluna "is_banned" existe no banco (SQL). ' + err.message);
        }
    };

    const openEditModal = (profile: Profile) => {
        setEditingUser(profile);
        setEditForm({
            plan: profile.subscription_tier || 'free',
            credits: profile.credits
        });
    };

    const filteredUsers = profiles.filter(profile => {
        const matchesSearch = (profile.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterPlan === 'all' ||
            (filterPlan === 'lifetime' && profile.has_lifetime_prompt) ||
            (filterPlan === 'Ultra Start' && profile.subscription_tier === 'Ultra Start') ||
            (filterPlan === 'Ultra Pro' && profile.subscription_tier === 'Ultra Pro') ||
            (filterPlan === 'Ultra Max' && profile.subscription_tier === 'Ultra Max') ||
            (filterPlan === 'free' && (!profile.subscription_tier || profile.subscription_tier === 'free')) ||
            (filterPlan === 'banned' && profile.is_banned);

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
        <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <LayoutDashboard className="text-orange-500" />
                        Painel Administrativo
                    </h1>
                    <p className="text-zinc-400 mt-1">Gerenciamento completo de usuários e assinaturas.</p>
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

            {/* Chart */}
            <GrowthChart data={profiles} />

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
                        <option value="banned">Banidos</option>
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
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                                        <div className="flex justify-center mb-2"><Activity className="animate-spin text-orange-500" /></div>
                                        Carregando dados...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((profile) => (
                                    <tr key={profile.id} className={`hover:bg-zinc-800/30 transition-colors ${profile.is_banned ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white flex items-center gap-2">
                                                {profile.email}
                                                {profile.is_banned && <span className="px-1.5 py-0.5 bg-red-900/50 text-red-400 text-[10px] rounded uppercase font-bold">Banido</span>}
                                            </div>
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
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(profile)}
                                                    className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {!profile.is_banned && (
                                                    <button
                                                        onClick={() => setBanningUser(profile)}
                                                        className="p-1.5 hover:bg-red-900/30 rounded-lg text-zinc-400 hover:text-red-500 transition-colors" title="Banir"
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                )}
                                            </div>
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

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Editar Usuário</h3>
                            <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 text-sm text-zinc-300">
                            {editingUser.email}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Plano de Assinatura</label>
                                <select
                                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-white focus:border-orange-500 outline-none"
                                    value={editForm.plan}
                                    onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                                >
                                    <option value="free">Gratuito</option>
                                    <option value="Ultra Start">Ultra Start</option>
                                    <option value="Ultra Pro">Ultra Pro</option>
                                    <option value="Ultra Max">Ultra Max</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Definir Créditos</label>
                                <input
                                    type="number"
                                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-white focus:border-orange-500 outline-none"
                                    value={editForm.credits}
                                    onChange={e => setEditForm({ ...editForm, credits: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors">Cancelar</button>
                            <button onClick={handleUpdateUser} className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-500 transition-colors flex items-center justify-center gap-2">
                                <Save size={18} /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban User Modal */}
            {banningUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-red-900/30 rounded-2xl p-6 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-200 shadow-2xl shadow-red-900/20">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-red-500 flex items-center gap-2">
                                <Ban size={20} /> Banir Usuário
                            </h3>
                            <button onClick={() => setBanningUser(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <p className="text-zinc-300 text-sm">
                            Você está prestes a banir <span className="font-bold text-white">{banningUser.email}</span>.
                            Isso impedirá o acesso à conta.
                        </p>

                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-zinc-500">Para confirmar, digite <strong className="text-white">banir</strong> abaixo:</label>
                            <input
                                type="text"
                                className="w-full bg-black border border-red-900/50 rounded-xl px-3 py-2 text-white focus:border-red-500 outline-none placeholder-zinc-700"
                                placeholder="banir"
                                value={banConfirmation}
                                onChange={e => setBanConfirmation(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setBanningUser(null)} className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors">Cancelar</button>
                            <button
                                onClick={handleBanUser}
                                disabled={banConfirmation.toLowerCase() !== 'banir'}
                                className="flex-1 px-4 py-2 rounded-xl bg-red-600 disabled:bg-red-900/50 disabled:text-red-400 text-white font-medium hover:bg-red-500 transition-colors disabled:cursor-not-allowed"
                            >
                                Confirmar Banimento
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
