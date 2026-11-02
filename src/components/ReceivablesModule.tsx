import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BellRing, CalendarClock, CheckCircle2, ChevronDown, Clock3, Download, FileClock, FileSpreadsheet, HandCoins, Search, Send, X } from 'lucide-react';
import { api } from '../api';
import type { CollectionReminder, CollectionReminderChannel, CollectionReminderOutcome, Order } from '../types';
import { formatCollectionDueDate, getOrderPaidAmount, getOrderRemainingBalance, isCollectionOverdue } from '../utils/orderFinance';

interface ReceivablesModuleProps {
  orders: Order[];
  clients: any[];
  canRecordPayments: boolean;
  canRecordReminders: boolean;
  canViewPaymentHistory: boolean;
  onOpenFinanceModal?: (order: Order) => void;
}

type ReceivableFilter = 'all' | 'follow_up_today' | 'overdue' | 'upcoming' | 'partial';

const channelLabels: Record<CollectionReminderChannel, string> = {
  telephone: 'Téléphone', whatsapp: 'WhatsApp', sms: 'SMS', email: 'E-mail', site: 'Message sur le site', visite: 'Visite', autre: 'Autre',
};
const outcomeLabels: Record<CollectionReminderOutcome, string> = {
  client_joint: 'Client joint', message_envoye: 'Message envoyé', message_prepare: 'Message préparé',
  sans_reponse: 'Sans réponse', promesse_paiement: 'Promesse de paiement', contestation: 'Contestation', autre: 'Autre',
};
const todayLibreville = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const datePlusDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const formatMoney = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
const formatTimestamp = (value: string) => new Date(value).toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' });
const dayDifference = (date: string, today: string) => Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000));
const csvCell = (value: string | number) => {
  const text = String(value);
  const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const ReceivablesModule: React.FC<ReceivablesModuleProps> = ({
  orders,
  clients,
  canRecordPayments,
  canRecordReminders,
  canViewPaymentHistory,
  onOpenFinanceModal,
}) => {
  const [reminders, setReminders] = useState<CollectionReminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [remindersError, setRemindersError] = useState('');
  const [exportError, setExportError] = useState('');
  const [filter, setFilter] = useState<ReceivableFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [channel, setChannel] = useState<CollectionReminderChannel>('whatsapp');
  const [outcome, setOutcome] = useState<CollectionReminderOutcome>('message_prepare');
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(() => datePlusDays(todayLibreville(), 3));
  const [savingReminder, setSavingReminder] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    api.getCollectionReminders()
      .then((result) => { if (active) { setReminders(result); setRemindersError(''); } })
      .catch((error) => { if (active) setRemindersError(error instanceof Error ? error.message : 'L’historique des relances est indisponible.'); })
      .finally(() => { if (active) setRemindersLoading(false); });
    return () => { active = false; };
  }, []);

  const today = todayLibreville();
  const remindersByOrder = useMemo(() => {
    const grouped = new Map<string, CollectionReminder[]>();
    reminders.forEach((reminder) => {
      const list = grouped.get(reminder.orderId) || [];
      list.push(reminder);
      grouped.set(reminder.orderId, list);
    });
    grouped.forEach((list) => list.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
    return grouped;
  }, [reminders]);

  const eligibleOrders = useMemo(() => orders.filter((order) => {
    if (order.status === 'Annulée' || getOrderRemainingBalance(order) <= 0) return false;
    const hasReceivable = order.customer.paymentMethod === 'en_compte' || (order.invoices || []).some((invoice) => invoice.type === 'facture');
    return hasReceivable;
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return eligibleOrders.filter((order) => {
      const orderReminders = remindersByOrder.get(order.id) || [];
      const lastReminder = orderReminders[0];
      const balance = getOrderRemainingBalance(order);
      const dueDate = order.collectionDueDate || '';
      const nextFollowUp = lastReminder?.nextFollowUpDate || '';
      const followUpToday = nextFollowUp ? nextFollowUp <= today : Boolean(dueDate && dueDate <= today);
      if (filter === 'follow_up_today' && !followUpToday) return false;
      if (filter === 'overdue' && !isCollectionOverdue(order)) return false;
      if (filter === 'upcoming' && (!dueDate || dueDate < today || dueDate > datePlusDays(today, 7))) return false;
      if (filter === 'partial' && (getOrderPaidAmount(order) <= 0 || balance <= 0)) return false;
      if (!query) return true;
      const invoiceRefs = (order.invoices || []).map((invoice) => invoice.number).join(' ');
      return [order.reference, order.customer.facilityName, order.customer.contactName, order.customer.phone, invoiceRefs]
        .some((value) => String(value || '').toLocaleLowerCase('fr').includes(query));
    }).sort((a, b) => {
      const overdueDiff = Number(isCollectionOverdue(b)) - Number(isCollectionOverdue(a));
      if (overdueDiff) return overdueDiff;
      const dueA = a.collectionDueDate || '9999-12-31';
      const dueB = b.collectionDueDate || '9999-12-31';
      return dueA.localeCompare(dueB) || b.createdAt.localeCompare(a.createdAt);
    });
  }, [eligibleOrders, filter, remindersByOrder, search, today]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; phone: string; orders: Order[]; balance: number; creditLimit: number }>();
    for (const order of filteredOrders) {
      const client = clients.find((item) => item.id === order.userId || item.user?.id === order.userId || item.phone === order.customer.phone);
      const key = order.userId || order.customer.phone || order.customer.facilityName;
      const group = map.get(key) || {
        key,
        name: order.customer.facilityName,
        phone: order.customer.phone,
        orders: [],
        balance: 0,
        creditLimit: Number(client?.creditLimit ?? client?.user?.creditLimit ?? 0) || 0,
      };
      group.orders.push(order);
      group.balance += getOrderRemainingBalance(order);
      map.set(key, group);
    }
    return [...map.values()].sort((a, b) => b.balance - a.balance);
  }, [clients, filteredOrders]);

  const totalOutstanding = eligibleOrders.reduce((sum, order) => sum + getOrderRemainingBalance(order), 0);
  const overdueOrders = eligibleOrders.filter(isCollectionOverdue);
  const followUpDueTodayCount = eligibleOrders.filter((order) => {
    const latest = remindersByOrder.get(order.id)?.[0];
    return latest?.nextFollowUpDate ? latest.nextFollowUpDate <= today : Boolean(order.collectionDueDate && order.collectionDueDate <= today);
  }).length;
  const upcomingCount = eligibleOrders.filter((order) => order.collectionDueDate && order.collectionDueDate >= today && order.collectionDueDate <= datePlusDays(today, 7)).length;

  const openReminderForm = (order: Order) => {
    setSelectedOrder(order);
    setChannel('whatsapp');
    setOutcome('message_prepare');
    setNotes('');
    setNextFollowUpDate(datePlusDays(todayLibreville(), 3));
    setFormError('');
  };

  const submitReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrder) return;
    if (outcome === 'promesse_paiement' && !nextFollowUpDate) {
      setFormError('Indique la date à laquelle le client promet de payer.');
      return;
    }
    setSavingReminder(true);
    setFormError('');
    try {
      const saved = await api.addCollectionReminder(selectedOrder.id, {
        id: crypto.randomUUID(),
        channel,
        outcome,
        notes: notes.trim() || undefined,
        nextFollowUpDate: nextFollowUpDate || undefined,
      });
      setReminders((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelectedOrder(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'La relance n’a pas pu être enregistrée.');
    } finally {
      setSavingReminder(false);
    }
  };

  const exportCsv = () => {
    const rows = filteredOrders.map((order) => {
      const history = remindersByOrder.get(order.id) || [];
      const paid = getOrderPaidAmount(order);
      const balance = getOrderRemainingBalance(order);
      const age = order.collectionDueDate && isCollectionOverdue(order) ? dayDifference(order.collectionDueDate, today) : 0;
      return [
        order.customer.facilityName, order.customer.contactName || '', order.customer.phone, order.reference,
        order.invoices?.filter((invoice) => invoice.type === 'facture').map((invoice) => invoice.number).join(', ') || '',
        order.createdAt.slice(0, 10), order.estimatedTotal || 0, paid, balance,
        order.collectionDueDate || '', age, history[0] ? formatTimestamp(history[0].occurredAt) : '',
        history[0] ? channelLabels[history[0].channel] : '', history[0]?.recordedByName || '', history[0]?.nextFollowUpDate || '',
      ].map((value) => csvCell(value)).join(';');
    });
    const header = ['Client', 'Contact', 'Téléphone', 'Commande', 'Facture(s)', 'Date commande', 'Montant initial FCFA', 'Paiements validés FCFA', 'Solde FCFA', 'Échéance', 'Jours de retard', 'Dernière relance', 'Canal', 'Opérateur', 'Prochain suivi'].join(';');
    const content = '\uFEFF' + [header, ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `creances_gloryday_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    setExportError('');
    try {
      const XLSX = await import('xlsx');
      const rows = filteredOrders.map((order) => {
        const history = remindersByOrder.get(order.id) || [];
        const latest = history[0];
        const overdue = order.collectionDueDate && isCollectionOverdue(order);
        return {
          Client: order.customer.facilityName,
          Contact: order.customer.contactName || '',
          Téléphone: order.customer.phone,
          Commande: order.reference,
          Factures: (order.invoices || []).filter((invoice) => invoice.type === 'facture').map((invoice) => invoice.number).join(', '),
          'Date commande': order.createdAt.slice(0, 10),
          'Montant initial (FCFA)': order.estimatedTotal || 0,
          'Paiements validés (FCFA)': getOrderPaidAmount(order),
          'Solde (FCFA)': getOrderRemainingBalance(order),
          Échéance: order.collectionDueDate || '',
          'Jours de retard': overdue && order.collectionDueDate ? dayDifference(order.collectionDueDate, today) : 0,
          'Dernière relance': latest ? formatTimestamp(latest.occurredAt) : '',
          Canal: latest ? channelLabels[latest.channel] : '',
          Résultat: latest ? outcomeLabels[latest.outcome] : '',
          Opérateur: latest?.recordedByName || '',
          'Prochain suivi': latest?.nextFollowUpDate || '',
          'Compte rendu': latest?.notes || '',
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 30 }, { wch: 16 },
        { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 24 },
        { wch: 18 }, { wch: 24 }, { wch: 22 }, { wch: 16 }, { wch: 48 },
      ];
      if (worksheet['!ref']) worksheet['!autofilter'] = { ref: worksheet['!ref'] };
      const visibleOrderIds = new Set(filteredOrders.map((order) => order.id));
      const reminderRows = reminders
        .filter((reminder) => visibleOrderIds.has(reminder.orderId))
        .map((reminder) => ({
          Client: reminder.clientName,
          Commande: reminder.orderReference,
          'Date et heure': formatTimestamp(reminder.occurredAt),
          Canal: channelLabels[reminder.channel],
          Résultat: outcomeLabels[reminder.outcome],
          'Prochain suivi': reminder.nextFollowUpDate || '',
          Opérateur: reminder.recordedByName,
          Rôle: reminder.recordedByRole,
          'Compte rendu': reminder.notes || '',
        }));
      const remindersWorksheet = XLSX.utils.json_to_sheet(reminderRows);
      remindersWorksheet['!cols'] = [
        { wch: 28 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 24 },
        { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 60 },
      ];
      if (remindersWorksheet['!ref']) remindersWorksheet['!autofilter'] = { ref: remindersWorksheet['!ref'] };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Créances');
      XLSX.utils.book_append_sheet(workbook, remindersWorksheet, 'Historique relances');
      XLSX.writeFile(workbook, `creances_gloryday_${today}.xlsx`);
    } catch {
      setExportError('Le fichier Excel n’a pas pu être préparé. Réessayez ou utilisez l’export CSV.');
    }
  };

  const toggleGroup = (key: string) => setExpandedClients((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const filterButtons: Array<{ value: ReceivableFilter; label: string; count?: number }> = [
    { value: 'all', label: 'Tous les impayés', count: eligibleOrders.length },
    { value: 'follow_up_today', label: 'À relancer aujourd’hui', count: followUpDueTodayCount },
    { value: 'overdue', label: 'En retard', count: overdueOrders.length },
    { value: 'upcoming', label: 'Échéance sous 7 jours', count: upcomingCount },
    { value: 'partial', label: 'Paiement partiel' },
  ];

  return (
    <div className="dashboard-tab-enter space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><HandCoins className="h-4 w-4 text-blue-700" /> Total restant dû</div>
          <div className="mt-2 text-xl font-black tabular-nums text-slate-900">{formatMoney(totalOutstanding)}</div>
          <p className="mt-1 text-xs text-slate-500">{eligibleOrders.length} commande(s) · {new Set(eligibleOrders.map((order) => order.userId || order.customer.phone)).size} client(s)</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-800"><Clock3 className="h-4 w-4" /> En retard</div>
          <div className="mt-2 text-xl font-black tabular-nums text-rose-900">{formatMoney(overdueOrders.reduce((sum, order) => sum + getOrderRemainingBalance(order), 0))}</div>
          <p className="mt-1 text-xs text-rose-800">{overdueOrders.length} commande(s) échue(s)</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800"><BellRing className="h-4 w-4" /> Suivis à faire aujourd’hui</div>
          <div className="mt-2 text-xl font-black tabular-nums text-amber-950">{followUpDueTodayCount}</div>
          <p className="mt-1 text-xs text-amber-800">Échéance ou prochain rappel atteint</p>
        </article>
        <article className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-800"><CalendarClock className="h-4 w-4" /> À échoir sous 7 jours</div>
          <div className="mt-2 text-xl font-black tabular-nums text-violet-950">{upcomingCount}</div>
          <p className="mt-1 text-xs text-violet-800">Échéances à anticiper</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Suivi des créances clients</h2>
              <p className="mt-1 text-xs text-slate-500">Chaque solde est détaillé par commande. Les paiements affichés sont ceux validés.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void exportExcel()} disabled={!filteredOrders.length} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40"><FileSpreadsheet className="h-4 w-4" /> Exporter Excel</button>
              <button type="button" onClick={exportCsv} disabled={!filteredOrders.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="h-4 w-4" /> CSV</button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {filterButtons.map((button) => (
              <button key={button.value} type="button" onClick={() => setFilter(button.value)} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${filter === button.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                {button.label}{button.count !== undefined && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${filter === button.value ? 'bg-white/15' : 'bg-slate-100'}`}>{button.count}</span>}
              </button>
            ))}
          </div>
          <label className="relative mt-3 block max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un client, un téléphone, une commande ou une facture" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>

        {remindersError && <div role="alert" className="m-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{remindersError}</div>}
        {exportError && <div role="alert" className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{exportError}</div>}
        {remindersLoading && <div role="status" className="m-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-800">Chargement de l’historique des relances…</div>}

        {groups.length === 0 ? (
          <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" /><h3 className="mt-3 font-bold text-slate-900">Aucune créance dans ce filtre</h3><p className="mt-1 text-xs text-slate-500">Les commandes annulées et les soldes nuls sont exclus.</p></div>
        ) : (
          <div className="divide-y divide-slate-200">
            {groups.map((group) => {
              const expanded = expandedClients.has(group.key);
              const limitUsed = group.creditLimit > 0 ? Math.min(100, Math.round(group.balance / group.creditLimit * 100)) : null;
              return (
                <section key={group.key}>
                  <button type="button" onClick={() => toggleGroup(group.key)} aria-expanded={expanded} className="flex w-full flex-wrap items-center justify-between gap-3 bg-white px-4 py-4 text-left hover:bg-slate-50 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3"><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} /><div className="min-w-0"><div className="truncate text-sm font-black text-slate-900">{group.name}</div><div className="mt-0.5 text-xs text-slate-500">{group.phone || 'Téléphone non renseigné'} · {group.orders.length} commande(s) concernée(s)</div></div></div>
                    <div className="flex items-center gap-4"><div className="text-right"><div className="text-[10px] font-bold uppercase text-slate-500">Dette du client</div><div className="font-mono text-sm font-black tabular-nums text-slate-900">{formatMoney(group.balance)}</div></div>{group.creditLimit > 0 && <div className="hidden min-w-28 text-right sm:block"><div className="text-[10px] font-bold uppercase text-slate-500">Plafond utilisé</div><div className="font-mono text-xs font-bold text-slate-700">{formatMoney(group.balance)} / {formatMoney(group.creditLimit)}</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${limitUsed && limitUsed >= 85 ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${limitUsed}%` }} /></div></div>}</div>
                  </button>

                  {expanded && (
                    <div className="overflow-x-auto border-t border-slate-100 bg-slate-50/50">
                      <table className="w-full min-w-[980px] text-left text-xs">
                        <thead className="bg-slate-100/80 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">Commande / Facture</th><th className="px-3 py-2.5 text-right">Montant initial</th><th className="px-3 py-2.5 text-right">Payé</th><th className="px-3 py-2.5 text-right">Solde</th><th className="px-3 py-2.5">Échéance / Retard</th><th className="px-3 py-2.5">Dernier contact</th><th className="px-4 py-2.5 text-right">Actions</th></tr></thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {group.orders.map((order) => {
                            const paid = getOrderPaidAmount(order);
                            const balance = getOrderRemainingBalance(order);
                            const orderReminders = remindersByOrder.get(order.id) || [];
                            const last = orderReminders[0];
                            const overdue = isCollectionOverdue(order);
                            const lateDays = overdue && order.collectionDueDate ? dayDifference(order.collectionDueDate, today) : 0;
                            return (
                              <React.Fragment key={order.id}>
                                <tr className="align-top">
                                  <td className="px-4 py-3"><div className="font-bold text-slate-900">{order.reference}</div><div className="mt-0.5 text-[10px] text-slate-500">{(order.invoices || []).filter((invoice) => invoice.type === 'facture').map((invoice) => invoice.number).join(', ') || (order.customer.paymentMethod === 'en_compte' ? 'Vente en compte' : 'Facture non renseignée')}</div><div className="text-[10px] text-slate-400">Commande du {new Date(order.createdAt).toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' })}</div></td>
                                  <td className="px-3 py-3 text-right font-mono tabular-nums">{formatMoney(order.estimatedTotal || 0)}</td>
                                  <td className="px-3 py-3 text-right font-mono tabular-nums text-emerald-700">{formatMoney(paid)}</td>
                                  <td className="px-3 py-3 text-right font-mono font-black tabular-nums text-slate-900">{formatMoney(balance)}</td>
                                  <td className="px-3 py-3">{order.collectionDueDate ? <><div className={overdue ? 'font-bold text-rose-700' : 'font-semibold text-slate-700'}>{formatCollectionDueDate(order.collectionDueDate)}</div>{overdue && <div className="mt-0.5 text-[10px] font-bold text-rose-700">En retard de {lateDays} jour(s)</div>}</> : <span className="text-amber-700">Échéance à définir</span>}</td>
                                  <td className="px-3 py-3">{last ? <><div className="font-semibold text-slate-700">{channelLabels[last.channel]} · {outcomeLabels[last.outcome]}</div><div className="mt-0.5 text-[10px] text-slate-500">{formatTimestamp(last.occurredAt)} · {last.recordedByName}</div>{last.nextFollowUpDate && <div className="mt-0.5 text-[10px] font-bold text-blue-700">Suivi : {formatCollectionDueDate(last.nextFollowUpDate)}</div>}</> : <span className="text-slate-400">Aucune relance</span>}</td>
                                  <td className="px-4 py-3"><div className="flex justify-end gap-2">{canRecordReminders && <button type="button" onClick={() => openReminderForm(order)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 font-bold text-blue-800 hover:bg-blue-50"><Send className="h-3 w-3" /> Relancer</button>}{canRecordPayments && onOpenFinanceModal && <button type="button" onClick={() => onOpenFinanceModal(order)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 font-bold text-white hover:bg-slate-700"><HandCoins className="h-3 w-3" /> Encaisser</button>}</div></td>
                                </tr>
                                <tr className="bg-white/80"><td colSpan={7} className="px-4 pb-3 pt-0"><details><summary className="cursor-pointer py-1 text-[10px] font-bold text-slate-500">Voir l’historique des {canViewPaymentHistory ? `paiements et relances (${(order.installments || []).filter((item) => item.status === 'valide').length} paiement(s) · ${orderReminders.length} relance(s))` : `relances (${orderReminders.length})`}</summary><div className={`grid gap-3 pt-2 ${canViewPaymentHistory ? 'md:grid-cols-2' : ''}`}>{canViewPaymentHistory && <div><h4 className="mb-1 text-[10px] font-bold uppercase text-slate-500">Paiements validés</h4>{(order.installments || []).filter((item) => item.status === 'valide').length ? <ul className="space-y-1">{(order.installments || []).filter((item) => item.status === 'valide').map((item) => <li key={item.id} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"><span>{formatTimestamp(item.paidAt)} · {item.paymentMethod}{item.transactionReference ? ` · Réf. ${item.transactionReference}` : ''} · {item.validatedBy || 'Opérateur'}</span><strong className="shrink-0 font-mono">{formatMoney(item.amount)}</strong></li>)}</ul> : <p className="text-[11px] text-slate-500">Aucun versement détaillé. Si la commande a été marquée payée manuellement, elle n’a pas de reçu de paiement associé.</p>}</div>}<div><h4 className="mb-1 text-[10px] font-bold uppercase text-slate-500">Relances consignées</h4>{orderReminders.length ? <ul className="space-y-1">{orderReminders.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5"><div className="flex flex-wrap justify-between gap-1"><span className="font-semibold">{formatTimestamp(item.occurredAt)} · {channelLabels[item.channel]} · {outcomeLabels[item.outcome]}</span><span className="text-slate-500">{item.recordedByName}</span></div>{item.notes && <p className="mt-0.5 text-slate-600">{item.notes}</p>}{item.nextFollowUpDate && <p className="mt-0.5 font-semibold text-blue-700">Prochain suivi : {formatCollectionDueDate(item.nextFollowUpDate)}</p>}</li>)}</ul> : <p className="text-[11px] text-slate-500">Aucune relance enregistrée.</p>}</div></div></details></td></tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" role="presentation">
          <form onSubmit={(event) => void submitReminder(event)} role="dialog" aria-modal="true" aria-labelledby="collection-reminder-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-950 p-4 text-white"><div><h2 id="collection-reminder-title" className="font-bold">Consigner une relance</h2><p className="mt-0.5 text-xs text-slate-300">{selectedOrder.customer.facilityName} · {selectedOrder.reference}</p></div><button type="button" onClick={() => setSelectedOrder(null)} aria-label="Fermer" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-4 w-4" /></button></div>
            <div className="space-y-4 p-4 sm:p-5">
              {formError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{formError}</div>}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Solde : {formatMoney(getOrderRemainingBalance(selectedOrder))}.</strong> Enregistrer une relance ne marque pas un paiement comme reçu. Pour un WhatsApp préparé, il faudra encore appuyer sur Envoyer dans WhatsApp.</div>
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-700">Canal<select value={channel} onChange={(event) => setChannel(event.target.value as CollectionReminderChannel)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold text-slate-700">Résultat<select value={outcome} onChange={(event) => setOutcome(event.target.value as CollectionReminderOutcome)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">{Object.entries(outcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
              <label className="block text-xs font-bold text-slate-700">Compte rendu / promesse<input value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} placeholder="Ex. Le client confirme un versement vendredi." className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label>
              <label className="block text-xs font-bold text-slate-700">Prochaine date de suivi{outcome === 'promesse_paiement' && <span className="ml-1 text-rose-700">(obligatoire)</span>}<input type="date" min={todayLibreville()} required={outcome === 'promesse_paiement'} value={nextFollowUpDate} onChange={(event) => setNextFollowUpDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label>
              <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600"><FileClock className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />La relance sera horodatée avec ton nom. Aucun message ne part automatiquement. La date proposée est dans trois jours, tu peux la modifier.</p>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedOrder(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Annuler</button><button type="submit" disabled={savingReminder} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">{savingReminder ? 'Enregistrement…' : 'Enregistrer la relance'}</button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
