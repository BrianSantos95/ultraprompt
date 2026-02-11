import React from 'react';
import { Check, Star, Zap } from 'lucide-react';
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
    },
    {
        name: 'UltraPrompt Vitalício',
        price: 'R$ 147',
        credits: 0,
        features: [
            'Acesso Vitalício ao UltraPrompt',
            'Agente Anatômico Ilimitado',
            'Preservação de Identidade',
            'Sem Mensalidade',
            'Atualizações Inclusas'
        ],
        highlight: false,
        buttonText: 'Comprar Vitalício',
        checkoutUrl: 'https://pay.kiwify.com.br/3IrPND2',
        isLifetime: true
    }
];

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
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-bold text-white tracking-tight">Escolha seu Plano</h1>
                <p className="text-zinc-400 max-w-xl mx-auto text-sm lg:text-base">
                    Invista na sua criatividade com pacotes de créditos flexíveis e acesso vitalício à nossa inteligência.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {PLANS.map((plan) => (
                    <div
                        key={plan.name}
                        className={`relative rounded-2xl p-6 border flex flex-col ${plan.highlight
                            ? 'bg-zinc-900/80 border-orange-500 shadow-2xl shadow-orange-900/20 scale-105 z-10'
                            : plan.isLifetime
                                ? 'bg-gradient-to-b from-zinc-900 to-zinc-950 border-orange-500/30'
                                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                            } transition-all duration-300`}
                    >
                        {plan.highlight && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg">
                                <Star size={10} fill="currentColor" /> Recomendado
                            </div>
                        )}

                        <div className="space-y-3 mb-6">
                            <h3 className={`text-lg font-bold ${plan.highlight ? 'text-white' : 'text-zinc-300'}`}>
                                {plan.name}
                            </h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-white">{plan.price}</span>
                                {!plan.isLifetime && <span className="text-zinc-500 text-xs">/mês</span>}
                                {plan.isLifetime && <span className="text-zinc-500 text-xs">Único</span>}
                            </div>

                            {plan.credits > 0 ? (
                                <div className="flex items-center gap-2 text-orange-400 text-xs font-bold bg-orange-500/10 px-2 py-1.5 rounded-lg w-fit">
                                    <Zap size={14} fill="currentColor" />
                                    {plan.credits} Créditos
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold bg-white/5 px-2 py-1.5 rounded-lg w-fit uppercase tracking-wider">
                                    Acesso Vitalício
                                </div>
                            )}
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
        </div>
    );
};
