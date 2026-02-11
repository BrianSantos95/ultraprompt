import React from 'react';
import { Check, Star, Zap, ScanFace } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PLANS = [
    {
        name: 'Ultra Start',
        price: 'R$ 39,90',
        credits: 20,
        features: [
            '20 Créditos de Geração',
            'Acesso ao UltraPrompt',
            'Geração de Imagens Padrão',
            'Suporte por email'
        ],
        highlight: false,
        buttonText: 'Assinar Start',
        checkoutUrl: 'https://pay.kiwify.com.br/s66xees'
    },
    {
        name: 'Ultra Pro',
        price: 'R$ 97,90',
        credits: 70,
        features: [
            '70 Créditos de Geração',
            'Acesso Prioritário',
            'Geração em Alta Definição',
            'Prompt Helper Avançado',
            'Suporte Prioritário'
        ],
        highlight: true,
        buttonText: 'Assinar Ultra Pro',
        checkoutUrl: 'https://pay.kiwify.com.br/CBJPnPX'
    },
    {
        name: 'Ultra Max',
        price: 'R$ 197,90',
        credits: 180,
        features: [
            '180 Créditos de Geração',
            'Acesso Ilimitado a Ferramentas',
            'Geração 4K Ultra',
            'Licença Comercial',
            'Atendimento VIP'
        ],
        highlight: false,
        buttonText: 'Assinar Ultra Max',
        checkoutUrl: 'https://pay.kiwify.com.br/FV4KsAb'
    }
];

const LIFETIME_PLAN = {
    name: 'UltraPrompt Vitalício',
    price: 'R$ 37',
    features: [
        'Acesso Vitalício ao UltraPrompt',
        'Agente Anatômico Ilimitado',
        'Preservação de Identidade',
        'Sem Mensalidade',
        'Atualizações Inclusas'
    ],
    checkoutUrl: 'https://pay.kiwify.com.br/3IrPND2'
};

export const Pricing: React.FC = () => {
    const { user } = useAuth();

    const handleSubscribe = (url: string) => {
        if (!user) {
            window.location.hash = '#login';
            return;
        }

        // Append email to Kiwify checkout to pre-fill and track
        const checkoutUrl = `${url}?email=${encodeURIComponent(user.email || '')}`;
        window.open(checkoutUrl, '_blank');
    };

    return (
        <div className="w-full max-w-7xl mx-auto py-16 px-4 animate-in fade-in duration-700">
            <div className="text-center space-y-4 mb-16">
                <h1 className="text-4xl font-bold text-white tracking-tight">Planos de Assinatura</h1>
                <p className="text-zinc-400 max-w-xl mx-auto text-sm lg:text-base">
                    Escolha o plano ideal para suas gerações e tenha acesso completo à nossa inteligência.
                </p>
            </div>

            {/* Grid de Assinaturas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {PLANS.map((plan) => (
                    <div
                        key={plan.name}
                        className={`relative rounded-2xl p-8 border flex flex-col ${plan.highlight
                            ? 'bg-zinc-900/80 border-orange-500 shadow-2xl shadow-orange-900/20 scale-105 z-10'
                            : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                            } transition-all duration-300`}
                    >
                        {plan.highlight && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg">
                                <Star size={12} fill="currentColor" /> Recomendado
                            </div>
                        )}

                        <div className="space-y-4 mb-8">
                            <h3 className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-zinc-300'}`}>
                                {plan.name}
                            </h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                <span className="text-zinc-500 text-sm">/mês</span>
                            </div>

                            <div className="flex items-center gap-2 text-orange-400 font-medium bg-orange-500/10 px-3 py-1.5 rounded-lg w-fit">
                                <Zap size={16} fill="currentColor" />
                                {plan.credits} Créditos
                            </div>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm text-zinc-400">
                                    <Check size={16} className={`mt-0.5 ${plan.highlight ? 'text-orange-500' : 'text-zinc-600'}`} />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe(plan.checkoutUrl)}
                            className={`w-full py-4 rounded-xl font-bold transition-all ${plan.highlight
                                ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                                }`}
                        >
                            {plan.buttonText}
                        </button>
                    </div>
                ))}
            </div>

            {/* Seção Separada: Vitalício (Horizontal) */}
            <div className="max-w-4xl mx-auto">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-zinc-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <ScanFace className="text-orange-500" size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-white">{LIFETIME_PLAN.name}</h3>
                            </div>
                            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                                Quer apenas o Agente Anatômico? Garanta o acesso vitalício ao UltraPrompt e eleve o nível das suas criações para sempre.
                            </p>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                {LIFETIME_PLAN.features.slice(0, 3).map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                                        <Check size={14} className="text-orange-500" /> {f}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end gap-4 min-w-[200px]">
                            <div className="text-center md:text-right">
                                <span className="text-zinc-500 text-xs line-through block leading-none mb-1">De R$ 147</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-white">{LIFETIME_PLAN.price}</span>
                                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Único</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleSubscribe(LIFETIME_PLAN.checkoutUrl)}
                                className="w-full md:w-auto px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-xl"
                            >
                                Comprar Agora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
