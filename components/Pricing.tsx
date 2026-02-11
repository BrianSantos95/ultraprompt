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
        buttonText: 'Começar Agora',
        checkoutUrl: '#' // Placeholder
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
        highlight: true, // Anchor Plan
        buttonText: 'Assinar Ultra Pro',
        checkoutUrl: '#' // Placeholder
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
        buttonText: 'Virar Ultra Max',
        checkoutUrl: '#' // Placeholder
    }
];

export const Pricing: React.FC = () => {
    const { user } = useAuth();

    const handleSubscribe = (url: string) => {
        if (!user) {
            // Redirect to login if not logged in
            window.location.hash = '#login';
            return;
        }
        window.open(url, '_blank');
    };

    return (
        <div className="w-full max-w-7xl mx-auto py-16 px-4 animate-in fade-in duration-700">
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-bold text-white">Escolha seu Plano</h1>
                <p className="text-zinc-400 max-w-xl mx-auto">
                    Invista na sua criatividade com pacotes de créditos flexíveis.
                    Cancele a qualquer momento.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {PLANS.map((plan) => (
                    <div
                        key={plan.name}
                        className={`relative rounded-2xl p-8 border flex flex-col ${plan.highlight
                            ? 'bg-zinc-900/80 border-orange-500/50 shadow-2xl shadow-orange-900/20 scale-105 z-10'
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
        </div>
    );
};
