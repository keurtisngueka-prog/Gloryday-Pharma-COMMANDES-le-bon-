import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Calendar, ShoppingBag, ArrowUpRight, DollarSign } from 'lucide-react';
import { Order, AdminStats } from '../types';

interface SalesMonthlyChartProps {
  orders: Order[];
  stats: AdminStats | null;
}

interface MonthlyDataPoint {
  month: string;
  monthKey: string;
  revenue: number;
  ordersCount: number;
  averageBasket: number;
}

export const SalesMonthlyChart: React.FC<SalesMonthlyChartProps> = ({ orders, stats }) => {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  // Compute 6-month retrospective data based on real orders
  const chartData = useMemo<MonthlyDataPoint[]>(() => {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    
    // Generate the last 6 calendar months
    const months: { label: string; key: string; year: number; monthIdx: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        year: d.getFullYear(),
        monthIdx: d.getMonth()
      });
    }

    const validOrders = orders.filter(o => o.status !== 'Annulée');

    return months.map((m) => {
      // Find orders matching this month
      const matchingOrders = validOrders.filter(o => {
        try {
          const ordDate = new Date(o.createdAt);
          return ordDate.getFullYear() === m.year && ordDate.getMonth() === m.monthIdx;
        } catch {
          return false;
        }
      });

      const actualRevenue = matchingOrders.reduce((sum, o) => sum + (o.estimatedTotal || 0), 0);
      const actualCount = matchingOrders.length;

      const finalRevenue = actualRevenue;
      const finalCount = actualCount;
      const finalBasket = finalCount > 0 ? Math.round(finalRevenue / finalCount) : 0;

      return {
        month: m.label,
        monthKey: m.key,
        revenue: finalRevenue,
        ordersCount: finalCount,
        averageBasket: finalBasket
      };
    });
  }, [orders, stats]);

  // Key performance summaries
  const totalPeriodRevenue = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.revenue, 0);
  }, [chartData]);

  const totalPeriodOrders = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.ordersCount, 0);
  }, [chartData]);

  const bestMonth = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.revenue - a.revenue)[0];
  }, [chartData]);

  const growthPercentage = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].revenue;
    const last = chartData[chartData.length - 1].revenue;
    if (first === 0) return 0;
    return Math.round(((last - first) / first) * 100);
  }, [chartData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px]">
          <span className="font-extrabold text-slate-200 block border-b border-slate-700/60 pb-1 text-[11px] uppercase tracking-wide">
            {label}
          </span>
          <div className="flex justify-between items-center text-slate-300">
            <span>Montant des commandes :</span>
            <strong className="text-white font-mono text-xs">
              {data.revenue.toLocaleString('fr-FR')} FCFA
            </strong>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Commandes traitées :</span>
            <strong className="text-[#42aef7] font-mono">
              {data.ordersCount} bons
            </strong>
          </div>
          <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
            <span>Panier moyen :</span>
            <strong className="text-emerald-400 font-mono text-[11px]">
              {data.averageBasket.toLocaleString('fr-FR')} F
            </strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0d44e8] flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Évolution des Ventes Mensuelles (6 derniers mois)
            </h3>
          </div>
          <p className="text-xs text-[#6a6a6b] mt-0.5">
            Suivi consolidé de la valeur des commandes et de la cadence d'approvisionnement
          </p>
        </div>

        {/* Metric Selector Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              metric === 'revenue'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-[#0d44e8]" />
            <span>Montant des commandes</span>
          </button>
          <button
            type="button"
            onClick={() => setMetric('orders')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              metric === 'orders'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#0d44e8]" />
            <span>Commandes</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Micro-Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total 6 mois</span>
          <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums mt-0.5 block">
            {totalPeriodRevenue.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-500 font-bold">F</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Volume commandes</span>
          <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums mt-0.5 block">
            {totalPeriodOrders} <span className="text-[10px] text-slate-500 font-normal">bons</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70">
          <span className="text-[10px] font-bold uppercase text-blue-800 block">Meilleur mois</span>
          <span className="text-xs sm:text-sm font-black text-blue-950 mt-0.5 block truncate">
            {bestMonth ? `${bestMonth.month} (${bestMonth.revenue.toLocaleString('fr-FR')} F)` : 'N/A'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            Croissance période
          </span>
          <span className="text-sm sm:text-base font-black text-emerald-950 tabular-nums mt-0.5 block">
            +{growthPercentage}%
          </span>
        </div>
      </div>

      {/* Interactive Recharts Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d44e8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0d44e8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis 
              dataKey="month" 
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />

            <YAxis 
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (metric === 'revenue') {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${Math.round(value / 1000)}k`;
                  return `${value}`;
                }
                return `${value}`;
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey={metric === 'revenue' ? 'revenue' : 'ordersCount'}
              stroke={metric === 'revenue' ? '#0d44e8' : '#10b981'}
              strokeWidth={3}
              fillOpacity={1}
              fill={metric === 'revenue' ? 'url(#colorRevenue)' : 'url(#colorOrders)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
