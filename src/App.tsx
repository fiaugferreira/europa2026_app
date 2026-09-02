import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  Download,
  FilePlus2,
  Files,
  FolderOpen,
  MapPin,
  Navigation,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
  WalletCards,
} from 'lucide-react';

import Dialog from './components/Dialog';
import MapView from './components/MapView';
import {
  days,
  documentSuggestions,
  extrasByDate,
  insurancePhones,
  places,
  seedChecklist,
  seedDocuments,
  wallets,
  type Activity,
  type Currency,
  type Day,
  type DocumentCategory,
  type DocumentSuggestion,
  type ExtraItem,
  type WalletId,
} from './data/trip';
import {
  brFullDate,
  exchangeExplanation,
  fallbackRates,
  googleMapsDirections,
  money,
  walletDebitAmount,
  type ExchangeRates,
} from './lib/format';
import {
  deleteFile,
  getFile,
  load,
  putFile,
  save,
} from './lib/storage';

type Tab = 'today' | 'money' | 'documents' | 'ops';

type Expense = {
  id: string;
  date: string;
  city: string;
  description: string;
  category: string;
  currency: Currency;
  amount: number;
  wallet: WalletId;
  activityId?: string;
  debitCurrency: 'EUR' | 'USD';
  debitAmount: number;
  exchangeRate?: number;
  note?: string;
  createdAt?: string;
};

type Doc = {
  id: string;
  name: string;
  type: string;
  traveler: string;
  original?: string;
  stored?: boolean;
  createdAt?: string;
  suggestionId?: string;
  category?: DocumentCategory | 'Outros';
};

type ScheduledExtra = {
  extraId: string;
  date: string;
  time: string;
};

type CurrencyTotals = Partial<Record<Currency, number>>;

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial));

  useEffect(() => {
    save(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

function getInitialDate() {
  const today = new Date().toISOString().slice(0, 10);

  if (days.some((day) => day.date === today)) return today;
  if (today < days[0].date) return days[0].date;
  return days[days.length - 1].date;
}

function placeFor(activity: Activity) {
  if (!activity.placeId) return undefined;
  return places.find((place) => place.id === activity.placeId);
}

function firstMinutes(time?: string) {
  if (!time) return undefined;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
}

function buildScheduledActivity(extra: ExtraItem, scheduled: ScheduledExtra): Activity {
  return {
    id: `scheduled-${extra.id}`,
    date: scheduled.date,
    time: scheduled.time,
    title: extra.title,
    category: extra.category,
    city: extra.city,
    placeId: extra.placeId,
    status: 'extra',
    note: extra.note,
  };
}

function mergeScheduledExtras(day: Day, scheduledExtras: ScheduledExtra[]) {
  const scheduledForDay = scheduledExtras
    .filter((item) => item.date === day.date)
    .map((item) => {
      const extra = (extrasByDate[item.date] || []).find(
        (candidate) => candidate.id === item.extraId,
      );
      return extra ? buildScheduledActivity(extra, item) : undefined;
    })
    .filter(Boolean) as Activity[];

  const merged = [...day.activities];

  scheduledForDay
    .sort((a, b) => (firstMinutes(a.time) || 9999) - (firstMinutes(b.time) || 9999))
    .forEach((extra) => {
      const extraMinutes = firstMinutes(extra.time);

      if (extraMinutes === undefined) {
        merged.push(extra);
        return;
      }

      const laterTimedIndex = merged.findIndex((activity) => {
        const activityMinutes = firstMinutes(activity.time);
        return activityMinutes !== undefined && activityMinutes > extraMinutes;
      });

      if (laterTimedIndex >= 0) {
        merged.splice(laterTimedIndex, 0, extra);
        return;
      }

      const firstTrailingOpenIndex = merged.findIndex(
        (activity) => !activity.time && activity.status === 'aberto',
      );

      if (firstTrailingOpenIndex >= 0) {
        merged.splice(firstTrailingOpenIndex, 0, extra);
      } else {
        merged.push(extra);
      }
    });

  return merged;
}

function displayDay(
  day: Day,
  completed: Record<string, boolean>,
  scheduledExtras: ScheduledExtra[],
): Day {
  return {
    ...day,
    activities: mergeScheduledExtras(day, scheduledExtras).map((activity) => ({
      ...activity,
      completed: completed[activity.id] === true,
    })),
  };
}

function statusLabel(status: Activity['status']) {
  switch (status) {
    case 'fixo':
    case 'confirmado':
      return 'FIXO';
    case 'definido':
    case 'planejado':
      return 'DEFINIDO';
    case 'aberto':
      return 'ABERTO';
    case 'extra':
      return 'EXTRA';
    case 'lembrete':
      return 'LEMBRETE';
    default:
      return String(status).toUpperCase();
  }
}

function currencyForDate(date: string): Currency {
  if (date <= '2026-09-21') return 'DKK';
  if (date <= '2026-09-29') return 'EUR';
  return 'CHF';
}

function walletForCurrency(currency: Currency): WalletId {
  if (currency === 'EUR') return 'eurcash';
  return 'usdnomad';
}

function addTotal(totals: CurrencyTotals, currency: Currency, amount: number) {
  totals[currency] = (totals[currency] || 0) + amount;
}

function totalsFromActivities(activities: Activity[], completed?: Record<string, boolean>) {
  const totals: CurrencyTotals = {};

  activities.forEach((activity) => {
    if (completed?.[activity.id]) return;
    if (activity.paid === 'sim') return;
    if (!activity.estimatedAmount || !activity.estimatedCurrency) return;
    addTotal(totals, activity.estimatedCurrency, activity.estimatedAmount);
  });

  return totals;
}

function totalsFromExpenses(expenses: Expense[]) {
  const totals: CurrencyTotals = {};
  expenses.forEach((expense) => addTotal(totals, expense.currency, expense.amount));
  return totals;
}

function formatTotals(totals: CurrencyTotals) {
  const order: Currency[] = ['EUR', 'DKK', 'CHF', 'USD', 'BRL'];
  const parts = order
    .filter((currency) => (totals[currency] || 0) > 0)
    .map((currency) => money(totals[currency] || 0, currency));

  return parts.length ? parts.join(' + ') : 'Sem valor previsto';
}

function debitOfExpense(expense: Expense, rates: ExchangeRates) {
  if (Number.isFinite(expense.debitAmount)) return expense.debitAmount;
  return walletDebitAmount(expense.amount, expense.currency, rates);
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [expenses, setExpenses] = usePersisted<Expense[]>('europa-expenses-v2', []);
  const [completed, setCompleted] = usePersisted<Record<string, boolean>>(
    'europa-completed-v2',
    {},
  );
  const [scheduledExtras, setScheduledExtras] = usePersisted<ScheduledExtra[]>(
    'europa-scheduled-extras-v2',
    [],
  );
  const [check, setCheck] = usePersisted<Record<string, boolean>>(
    'europa-checklist-v2',
    {},
  );
  const [docs, setDocs] = usePersisted<Doc[]>('europa-documents-v2', seedDocuments);
  const [rates, setRates] = usePersisted<ExchangeRates>('europa-rates-v2', fallbackRates);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseActivity, setExpenseActivity] = useState<Activity | undefined>();
  const [docOpen, setDocOpen] = useState(false);
  const [docSuggestion, setDocSuggestion] = useState<DocumentSuggestion | undefined>();
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraToSchedule, setExtraToSchedule] = useState<ExtraItem | undefined>();

  const baseSelectedDay = days.find((day) => day.date === selectedDate) || days[0];

  const selectedDay = useMemo(
    () => displayDay(baseSelectedDay, completed, scheduledExtras),
    [baseSelectedDay, completed, scheduledExtras],
  );

  const openExpense = (activity?: Activity) => {
    setExpenseActivity(activity);
    setExpenseOpen(true);
  };

  const toggleCompleted = (activityId: string) => {
    setCompleted({
      ...completed,
      [activityId]: !completed[activityId],
    });
  };

  const scheduleExtra = (extraId: string, time: string) => {
    const withoutDuplicate = scheduledExtras.filter(
      (item) => !(item.date === selectedDate && item.extraId === extraId),
    );

    setScheduledExtras([
      ...withoutDuplicate,
      { extraId, date: selectedDate, time },
    ]);
  };

  const removeScheduledExtra = (activityId: string) => {
    const extraId = activityId.replace(/^scheduled-/, '');
    setScheduledExtras(
      scheduledExtras.filter(
        (item) => !(item.date === selectedDate && item.extraId === extraId),
      ),
    );
  };

  return (
    <div className="app-shell">
      <div className="ambient a1" />
      <div className="ambient a2" />

      <header className="topbar compact-topbar">
        <div>
          <span className="eyebrow">EUROPA 2026</span>
          <h1>Modo <i>viagem</i></h1>
        </div>

        <button className="quick-add" onClick={() => openExpense()}>
          <Plus size={18} />
          <span>Gasto</span>
        </button>
      </header>

      <main>
        {tab === 'today' && (
          <TodayView
            selectedDay={selectedDay}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            expenses={expenses}
            completed={completed}
            scheduledExtras={scheduledExtras}
            onExpense={openExpense}
            onToggleCompleted={toggleCompleted}
            onScheduleExtra={(extra) => {
              setExtraToSchedule(extra);
              setExtraOpen(true);
            }}
            onRemoveExtra={removeScheduledExtra}
          />
        )}

        {tab === 'money' && (
          <MoneyView
            expenses={expenses}
            setExpenses={setExpenses}
            completed={completed}
            rates={rates}
            setRates={setRates}
            openAdd={() => openExpense()}
          />
        )}

        {tab === 'documents' && (
          <DocumentsView
            docs={docs}
            setDocs={setDocs}
            openSuggestion={(suggestion) => {
              setDocSuggestion(suggestion);
              setDocOpen(true);
            }}
            openOther={() => {
              setDocSuggestion(undefined);
              setDocOpen(true);
            }}
          />
        )}

        {tab === 'ops' && <OpsView check={check} setCheck={setCheck} />}
      </main>

      <nav className="bottom-nav four-tabs">
        <Nav
          active={tab === 'today'}
          icon={<Clock3 />}
          label="Hoje"
          onClick={() => setTab('today')}
        />
        <Nav
          active={tab === 'money'}
          icon={<WalletCards />}
          label="Caixa"
          onClick={() => setTab('money')}
        />
        <Nav
          active={tab === 'documents'}
          icon={<Files />}
          label="Documentos"
          onClick={() => setTab('documents')}
        />
        <Nav
          active={tab === 'ops'}
          icon={<CircleCheckBig />}
          label="Ops"
          onClick={() => setTab('ops')}
        />
      </nav>

      <ExpenseDialog
        open={expenseOpen}
        activity={expenseActivity}
        selectedDate={selectedDate}
        rates={rates}
        onClose={() => {
          setExpenseOpen(false);
          setExpenseActivity(undefined);
        }}
        onAdd={(expense) => setExpenses([expense, ...expenses])}
      />

      <DocumentDialog
        open={docOpen}
        suggestion={docSuggestion}
        onClose={() => {
          setDocOpen(false);
          setDocSuggestion(undefined);
        }}
        onAdd={(doc) => setDocs([doc, ...docs])}
      />

      <ScheduleExtraDialog
        open={extraOpen}
        extra={extraToSchedule}
        onClose={() => {
          setExtraOpen(false);
          setExtraToSchedule(undefined);
        }}
        onSchedule={(time) => {
          if (!extraToSchedule) return;
          scheduleExtra(extraToSchedule.id, time);
          setExtraOpen(false);
          setExtraToSchedule(undefined);
        }}
      />
    </div>
  );
}

function TodayView({
  selectedDay,
  selectedDate,
  setSelectedDate,
  expenses,
  completed,
  scheduledExtras,
  onExpense,
  onToggleCompleted,
  onScheduleExtra,
  onRemoveExtra,
}: {
  selectedDay: Day;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  expenses: Expense[];
  completed: Record<string, boolean>;
  scheduledExtras: ScheduledExtra[];
  onExpense: (activity?: Activity) => void;
  onToggleCompleted: (activityId: string) => void;
  onScheduleExtra: (extra: ExtraItem) => void;
  onRemoveExtra: (activityId: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const isActualToday = today === selectedDate;
  const beforeTrip = today < days[0].date;

  const nextActivity = selectedDay.activities.find((activity) => !activity.completed);

  const dayExpenses = expenses.filter((expense) => expense.date === selectedDate);
  const dayEstimate = totalsFromActivities(selectedDay.activities);
  const dayActual = totalsFromExpenses(dayExpenses);

  const allExtras = extrasByDate[selectedDate] || [];
  const scheduledIds = new Set(
    scheduledExtras
      .filter((item) => item.date === selectedDate)
      .map((item) => item.extraId),
  );
  const availableExtras = allExtras.filter((extra) => !scheduledIds.has(extra.id));

  return (
    <section className="page today-page">
      <div className="today-heading">
        <div>
          <span className="eyebrow">
            {isActualToday ? 'HOJE' : beforeTrip ? 'PRÓXIMO DIA' : 'DIA SELECIONADO'}
          </span>
          <h2>{selectedDay.city}</h2>
          <p>{brFullDate(selectedDate)}</p>
        </div>

        {selectedDay.hotel && (
          <div className="today-hotel">
            <span>BASE</span>
            <b>{selectedDay.hotel}</b>
          </div>
        )}
      </div>

      <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

      <div className="today-map-card">
        <div className="section-head compact-section-head">
          <div>
            <span className="eyebrow">MAPA DO DIA</span>
            <h3>Todos os pontos em ordem</h3>
          </div>
        </div>
        <MapView day={selectedDay} compact />
      </div>

      {nextActivity && (
        <div className="next-card">
          <div className="next-icon">
            <Navigation size={20} />
          </div>
          <div className="next-main">
            <span className="eyebrow">PRÓXIMO</span>
            <h3>{nextActivity.title}</h3>
            <p>{nextActivity.time || nextActivity.category}</p>
          </div>
          <ChevronRight size={20} />
        </div>
      )}

      <div className="section-head">
        <div>
          <span className="eyebrow">SEQUÊNCIA</span>
          <h3>{selectedDay.title}</h3>
        </div>
      </div>

      <div className="today-timeline">
        {selectedDay.activities.map((activity) => (
          <TravelActivityCard
            key={activity.id}
            activity={activity}
            expenses={expenses.filter((expense) => expense.activityId === activity.id)}
            onExpense={() => onExpense(activity)}
            onToggleCompleted={() => onToggleCompleted(activity.id)}
            onRemoveExtra={
              activity.status === 'extra' && activity.id.startsWith('scheduled-')
                ? () => onRemoveExtra(activity.id)
                : undefined
            }
          />
        ))}
      </div>

      <div className="daily-money-card">
        <div>
          <span>Previsto do dia</span>
          <b>{formatTotals(dayEstimate)}</b>
        </div>
        <div>
          <span>Gasto lançado</span>
          <b>{formatTotals(dayActual)}</b>
        </div>
      </div>

      {availableExtras.length > 0 && (
        <section className="extras-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">SE AINDA HOUVER TEMPO</span>
              <h3>Extras deste dia</h3>
            </div>
          </div>

          <div className="extras-list">
            {availableExtras.map((extra) => {
              const place = extra.placeId
                ? places.find((candidate) => candidate.id === extra.placeId)
                : undefined;

              return (
                <div className="extra-card" key={extra.id}>
                  <div>
                    <span>{extra.category}</span>
                    <b>{extra.title}</b>
                    {extra.note && <p>{extra.note}</p>}
                  </div>

                  <div className="extra-actions">
                    {place && (
                      <a
                        href={googleMapsDirections(
                          place.name,
                          place.address,
                          place.lat,
                          place.lng,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="ghost-mini"
                      >
                        <MapPin size={15} />
                      </a>
                    )}

                    <button className="primary-mini" onClick={() => onScheduleExtra(extra)}>
                      <Plus size={15} />
                      Adicionar ao dia
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}

function DayStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="day-strip" aria-label="Dias da viagem">
      {days.map((day, index) => {
        const date = new Date(`${day.date}T12:00:00`);
        const dayNumber = String(date.getDate()).padStart(2, '0');
        const month = date
          .toLocaleDateString('pt-BR', { month: 'short' })
          .replace('.', '')
          .toUpperCase();

        return (
          <button
            key={day.date}
            className={selectedDate === day.date ? 'active' : ''}
            onClick={() => onSelect(day.date)}
          >
            <small>D{String(index + 1).padStart(2, '0')}</small>
            <b>{dayNumber}</b>
            <span>{month}</span>
          </button>
        );
      })}
    </div>
  );
}

function TravelActivityCard({
  activity,
  expenses,
  onExpense,
  onToggleCompleted,
  onRemoveExtra,
}: {
  activity: Activity;
  expenses: Expense[];
  onExpense: () => void;
  onToggleCompleted: () => void;
  onRemoveExtra?: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const place = placeFor(activity);
  const realTotals = totalsFromExpenses(expenses);

  const sameCurrencyActual = activity.estimatedCurrency
    ? realTotals[activity.estimatedCurrency] || 0
    : 0;

  const variance =
    activity.estimatedAmount && activity.estimatedCurrency && sameCurrencyActual > 0
      ? activity.estimatedAmount - sameCurrencyActual
      : undefined;

  if (activity.completed) {
    return (
      <article className="travel-event completed">
        <div className="event-time">{activity.time || '•'}</div>
        <div className="event-complete-icon">
          <Check size={16} />
        </div>
        <div className="event-main">
          <div className="event-title-line">
            <b>{activity.title}</b>
            <span className="done-chip">concluído</span>
          </div>
        </div>
        <button className="icon-btn small" onClick={onToggleCompleted} aria-label="Reabrir">
          <RotateCcw size={16} />
        </button>
      </article>
    );
  }

  return (
    <article className={`travel-event status-${activity.status}`}>
      <div className="event-time">{activity.time || '•'}</div>

      <div className="event-main">
        <div className="event-title-line">
          <b>{activity.title}</b>
          <span className={`status-chip ${activity.status}`}>{statusLabel(activity.status)}</span>
          {activity.paid === 'sim' && <span className="paid-chip">PAGO</span>}
          {activity.paid === 'parcial' && <span className="partial-chip">PARCIAL</span>}
        </div>

        <p className="event-subtitle">{activity.city} • {activity.category}</p>

        {(activity.estimatedAmount || expenses.length > 0) && (
          <div className="event-money-line">
            {activity.estimatedAmount && activity.estimatedCurrency && (
              <span>
                Previsto <b>{money(activity.estimatedAmount, activity.estimatedCurrency)}</b>
              </span>
            )}

            {expenses.length > 0 && (
              <span>
                Real <b>{formatTotals(realTotals)}</b>
              </span>
            )}

            {variance !== undefined && variance !== 0 && (
              <span className={variance > 0 ? 'saving' : 'over'}>
                {variance > 0 ? '↓ economia ' : '↑ acima '}
                <b>{money(Math.abs(variance), activity.estimatedCurrency!)}</b>
              </span>
            )}
          </div>
        )}

        {detailsOpen && (
          <div className="event-details">
            {activity.people && <p><b>Pessoas:</b> {activity.people}</p>}
            {activity.note && <p>{activity.note}</p>}
            {place?.address && <p><b>Local:</b> {place.address}</p>}
          </div>
        )}

        <div className="event-actions">
          {place && (
            <a
              href={googleMapsDirections(
                place.name,
                place.address,
                place.lat,
                place.lng,
              )}
              target="_blank"
              rel="noreferrer"
              className="event-action"
            >
              <Navigation size={15} />
              Maps
            </a>
          )}

          <button className="event-action" onClick={onExpense}>
            <ReceiptText size={15} />
            Gasto
          </button>

          {(activity.note || activity.people || place?.address) && (
            <button className="event-action" onClick={() => setDetailsOpen(!detailsOpen)}>
              <ChevronRight size={15} />
              {detailsOpen ? 'Fechar' : 'Detalhes'}
            </button>
          )}

          <button className="event-action conclude" onClick={onToggleCompleted}>
            <CheckCircle2 size={15} />
            Concluir
          </button>

          {onRemoveExtra && (
            <button className="event-action danger" onClick={onRemoveExtra}>
              <Trash2 size={15} />
              Remover do dia
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MoneyView({
  expenses,
  setExpenses,
  completed,
  rates,
  setRates,
  openAdd,
}: {
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  completed: Record<string, boolean>;
  rates: ExchangeRates;
  setRates: (rates: ExchangeRates) => void;
  openAdd: () => void;
}) {
  const balances = useMemo(() => {
    const result: Record<WalletId, number> = {
      eurcash: wallets.find((wallet) => wallet.id === 'eurcash')?.balance || 0,
      eurnomad: wallets.find((wallet) => wallet.id === 'eurnomad')?.balance || 0,
      usdnomad: wallets.find((wallet) => wallet.id === 'usdnomad')?.balance || 0,
    };

    expenses.forEach((expense) => {
      if (!(expense.wallet in result)) return;
      result[expense.wallet] -= debitOfExpense(expense, rates);
    });

    return result;
  }, [expenses, rates]);

  const pending = useMemo(
    () => totalsFromActivities(days.flatMap((day) => day.activities), completed),
    [completed],
  );

  const realByCity = useMemo(() => {
    const grouped = new Map<string, Expense[]>();

    expenses.forEach((expense) => {
      const current = grouped.get(expense.city) || [];
      current.push(expense);
      grouped.set(expense.city, current);
    });

    return [...grouped.entries()];
  }, [expenses]);

  return (
    <section className="page">
      <PageTitle
        kicker="CAIXA"
        title="Dinheiro da viagem"
        subtitle="O gasto lançado em cada evento baixa automaticamente da carteira escolhida."
      />

      <div className="money-hero current-money-hero">
        <div>
          <span className="eyebrow">SALDO ATUAL</span>
          <h2>
            € {(balances.eurcash + balances.eurnomad).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            <small> + </small>
            US$ {balances.usdnomad.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <p>Saldo calculado a partir dos gastos realmente lançados no aplicativo.</p>
        </div>
        <WalletCards size={38} />
      </div>

      <div className="wallet-grid">
        {wallets.map((wallet) => {
          const balance = balances[wallet.id];
          const spent = wallet.balance - balance;

          return (
            <div className="wallet-card" key={wallet.id}>
              <span>DISPONÍVEL</span>
              <h3>{money(balance, wallet.currency)}</h3>
              <p>{wallet.name}</p>
              <small>
                Inicial {money(wallet.balance, wallet.currency)} • usado {money(spent, wallet.currency)}
              </small>
            </div>
          );
        })}
      </div>

      <div className="cash-summary-grid">
        <div className="cash-summary-card">
          <span className="eyebrow">AINDA PREVISTO NO ROTEIRO</span>
          <b>{formatTotals(pending)}</b>
          <p>Estimativas dos eventos ainda não concluídos e ainda não pagos.</p>
        </div>

        <div className="cash-summary-card">
          <span className="eyebrow">CONVERSÃO DKK / CHF</span>
          <b>Nomad USD</b>
          <p>O valor é lançado na moeda local e convertido para o débito em dólar.</p>
        </div>
      </div>

      <section className="rate-card">
        <div className="section-head compact-section-head">
          <div>
            <span className="eyebrow">COTAÇÕES USADAS</span>
            <h3>Editáveis</h3>
          </div>
        </div>

        <div className="rate-grid">
          <label>
            <span>1 EUR = USD</span>
            <input
              inputMode="decimal"
              value={rates.EUR_USD}
              onChange={(event) =>
                setRates({
                  ...rates,
                  EUR_USD: Number(event.target.value.replace(',', '.')) || rates.EUR_USD,
                })
              }
            />
          </label>

          <label>
            <span>1 USD = DKK</span>
            <input
              inputMode="decimal"
              value={rates.DKK_USD}
              onChange={(event) =>
                setRates({
                  ...rates,
                  DKK_USD: Number(event.target.value.replace(',', '.')) || rates.DKK_USD,
                })
              }
            />
          </label>

          <label>
            <span>1 USD = CHF</span>
            <input
              inputMode="decimal"
              value={rates.CHF_USD}
              onChange={(event) =>
                setRates({
                  ...rates,
                  CHF_USD: Number(event.target.value.replace(',', '.')) || rates.CHF_USD,
                })
              }
            />
          </label>
        </div>
      </section>

      <div className="section-head">
        <div>
          <span className="eyebrow">LANÇAMENTOS</span>
          <h3>Gastos reais</h3>
        </div>
        <button className="primary-mini" onClick={openAdd}>
          <Plus size={16} />
          Gasto esquecido
        </button>
      </div>

      {expenses.length === 0 ? (
        <Empty
          icon={<WalletCards />}
          title="Nenhum gasto lançado"
          text="Durante a viagem, prefira lançar o gasto diretamente no evento."
        />
      ) : (
        <div className="expense-list">
          {expenses.map((expense) => (
            <div className="expense-row" key={expense.id}>
              <div>
                <b>{expense.description}</b>
                <span>
                  {expense.city} • {expense.date.split('-').reverse().join('/')} • {expense.category}
                </span>
                {expense.currency !== expense.debitCurrency && (
                  <small>
                    {money(expense.amount, expense.currency)} → débito {money(expense.debitAmount, expense.debitCurrency)}
                  </small>
                )}
              </div>

              <div className="expense-value">
                <b>{money(expense.amount, expense.currency)}</b>
                <span>
                  {wallets.find((wallet) => wallet.id === expense.wallet)?.name || expense.wallet}
                </span>
              </div>

              <button
                className="icon-btn small"
                onClick={() => setExpenses(expenses.filter((item) => item.id !== expense.id))}
                aria-label="Excluir gasto"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {realByCity.length > 0 && (
        <section className="city-spend-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">USO POR CIDADE</span>
              <h3>Gastos lançados</h3>
            </div>
          </div>

          <div className="city-spend-list">
            {realByCity.map(([city, cityExpenses]) => (
              <div className="city-spend-row" key={city}>
                <span>{city}</span>
                <b>{formatTotals(totalsFromExpenses(cityExpenses))}</b>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function ExpenseDialog({
  open,
  activity,
  selectedDate,
  rates,
  onClose,
  onAdd,
}: {
  open: boolean;
  activity?: Activity;
  selectedDate: string;
  rates: ExchangeRates;
  onClose: () => void;
  onAdd: (expense: Expense) => void;
}) {
  const defaultCurrency = activity?.estimatedCurrency || currencyForDate(activity?.date || selectedDate);

  const [form, setForm] = useState({
    date: activity?.date || selectedDate,
    city: activity?.city || '',
    description: activity?.title || '',
    category: activity?.category || 'Alimentação',
    currency: defaultCurrency as Currency,
    amount: '',
    wallet: walletForCurrency(defaultCurrency) as WalletId,
    note: '',
  });

  useEffect(() => {
    if (!open) return;

    const currency = activity?.estimatedCurrency || currencyForDate(activity?.date || selectedDate);

    setForm({
      date: activity?.date || selectedDate,
      city: activity?.city || '',
      description: activity?.title || '',
      category: activity?.category || 'Alimentação',
      currency,
      amount: '',
      wallet: walletForCurrency(currency),
      note: '',
    });
  }, [open, activity, selectedDate]);

  const amount = Number(form.amount.replace(',', '.')) || 0;
  const debitAmount = amount > 0 ? walletDebitAmount(amount, form.currency, rates) : 0;
  const debitCurrency: 'EUR' | 'USD' = form.currency === 'EUR' ? 'EUR' : 'USD';

  function changeCurrency(currency: Currency) {
    setForm({
      ...form,
      currency,
      wallet:
        currency === 'EUR'
          ? form.wallet === 'eurcash' || form.wallet === 'eurnomad'
            ? form.wallet
            : 'eurcash'
          : 'usdnomad',
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.description || !amount) return;

    const finalWallet: WalletId = form.currency === 'EUR' ? form.wallet : 'usdnomad';

    onAdd({
      id: crypto.randomUUID(),
      date: form.date,
      city: form.city || activity?.city || 'Viagem',
      description: form.description,
      category: form.category,
      currency: form.currency,
      amount,
      wallet: finalWallet,
      activityId: activity?.id,
      debitCurrency,
      debitAmount,
      exchangeRate:
        form.currency === 'DKK'
          ? rates.DKK_USD
          : form.currency === 'CHF'
            ? rates.CHF_USD
            : form.currency === 'EUR'
              ? rates.EUR_USD
              : 1,
      note: form.note,
      createdAt: new Date().toISOString(),
    });

    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={activity ? `Gasto • ${activity.title}` : 'Adicionar gasto'}
    >
      <form onSubmit={submit} className="form-grid">
        <label>
          Data
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
        </label>

        <label>
          Cidade
          <input
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
            placeholder="Ex.: Copenhague"
          />
        </label>

        <label className="full">
          Descrição
          <input
            autoFocus={!activity}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Ex.: jantar no Tivoli"
          />
        </label>

        <label>
          Categoria
          <input
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          />
        </label>

        <label>
          Moeda local
          <select
            value={form.currency}
            onChange={(event) => changeCurrency(event.target.value as Currency)}
          >
            <option value="EUR">EUR</option>
            <option value="DKK">DKK</option>
            <option value="CHF">CHF</option>
            <option value="USD">USD</option>
          </select>
        </label>

        <label>
          Valor local
          <input
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            placeholder="0,00"
          />
        </label>

        {form.currency === 'EUR' ? (
          <label>
            De onde saiu
            <select
              value={form.wallet}
              onChange={(event) => setForm({ ...form, wallet: event.target.value as WalletId })}
            >
              <option value="eurcash">Euro físico</option>
              <option value="eurnomad">Nomad EUR</option>
            </select>
          </label>
        ) : (
          <label>
            Carteira
            <input value="Nomad USD" disabled />
          </label>
        )}

        {amount > 0 && (
          <div className="conversion-preview full">
            <span>Débito no caixa</span>
            <b>{exchangeExplanation(amount, form.currency, rates)}</b>
            <small>
              {form.currency === 'EUR'
                ? form.wallet === 'eurcash'
                  ? 'Será deduzido do Euro físico.'
                  : 'Será deduzido da Nomad EUR.'
                : `Será deduzido como ${money(debitAmount, 'USD')} da Nomad USD.`}
            </small>
          </div>
        )}

        {activity?.estimatedAmount && activity.estimatedCurrency && (
          <div className="estimate-hint full">
            Previsto no roteiro: <b>{money(activity.estimatedAmount, activity.estimatedCurrency)}</b>
          </div>
        )}

        <label className="full">
          Observação
          <textarea
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            rows={3}
          />
        </label>

        <div className="form-actions full">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary">Salvar gasto</button>
        </div>
      </form>
    </Dialog>
  );
}

function DocumentsView({
  docs,
  setDocs,
  openSuggestion,
  openOther,
}: {
  docs: Doc[];
  setDocs: (docs: Doc[]) => void;
  openSuggestion: (suggestion: DocumentSuggestion) => void;
  openOther: () => void;
}) {
  const categories: DocumentCategory[] = ['Essenciais', 'Reservas', 'Ingressos'];

  async function openDocument(doc: Doc) {
    const tab = window.open('', '_blank');
    const file = await getFile(doc.id);

    if (!file) {
      tab?.close();
      return;
    }

    const url = URL.createObjectURL(file);

    if (tab) {
      tab.location.href = url;
    } else {
      window.location.href = url;
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function removeDocument(doc: Doc) {
    await deleteFile(doc.id);
    setDocs(docs.filter((item) => item.id !== doc.id));
  }

  return (
    <section className="page">
      <PageTitle
        kicker="DOCUMENTOS"
        title="Tudo que precisa estar à mão"
        subtitle="A lista começa vazia. As sugestões abaixo ajudam a não esquecer nenhum documento importante."
      />

      <div className="document-security-note">
        <FolderOpen size={20} />
        <div>
          <b>Arquivos ficam neste aparelho</b>
          <span>Os PDFs não são enviados para o repositório público do GitHub.</span>
        </div>
      </div>

      {categories.map((category) => {
        const suggestions = documentSuggestions.filter((item) => item.category === category);

        return (
          <section className="document-category" key={category}>
            <div className="section-head compact-section-head">
              <div>
                <span className="eyebrow">{category.toUpperCase()}</span>
                <h3>{category}</h3>
              </div>
            </div>

            <div className="document-suggestion-list">
              {suggestions.map((suggestion) => {
                const included = docs.some((doc) => doc.suggestionId === suggestion.id);

                return (
                  <div className={`document-suggestion ${included ? 'included' : ''}`} key={suggestion.id}>
                    <div className="document-check">
                      {included ? <Check size={16} /> : <FilePlus2 size={16} />}
                    </div>

                    <div className="document-suggestion-main">
                      <b>{suggestion.name}</b>
                      {suggestion.traveler && <span>{suggestion.traveler}</span>}
                    </div>

                    {included ? (
                      <span className="included-label">incluído</span>
                    ) : (
                      <button className="primary-mini" onClick={() => openSuggestion(suggestion)}>
                        Adicionar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="other-document-card">
        <div>
          <span className="eyebrow">OUTROS</span>
          <h3>Documento adicional</h3>
          <p>Use para qualquer confirmação, comprovante ou arquivo que não esteja na lista.</p>
        </div>
        <button className="primary-mini" onClick={openOther}>
          <Plus size={16} />
          Outro documento
        </button>
      </div>

      <div className="section-head">
        <div>
          <span className="eyebrow">ARQUIVOS INCLUÍDOS</span>
          <h3>{docs.length} documentos</h3>
        </div>
      </div>

      {docs.length === 0 ? (
        <Empty
          icon={<Files />}
          title="Nenhum documento incluído"
          text="Comece pelos passaportes e seguros da família."
        />
      ) : (
        <div className="document-list">
          {docs.map((doc) => (
            <div className="document-row" key={doc.id}>
              <div>
                <b>{doc.name}</b>
                <span>{doc.category || doc.type} • {doc.traveler || 'Família'}</span>
              </div>

              <div className="document-actions">
                <button className="icon-btn" onClick={() => openDocument(doc)} aria-label="Abrir documento">
                  <Download size={17} />
                </button>
                <button className="icon-btn danger" onClick={() => removeDocument(doc)} aria-label="Excluir documento">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DocumentDialog({
  open,
  suggestion,
  onClose,
  onAdd,
}: {
  open: boolean;
  suggestion?: DocumentSuggestion;
  onClose: () => void;
  onAdd: (doc: Doc) => void;
}) {
  const [file, setFile] = useState<File | undefined>();
  const [name, setName] = useState('');
  const [traveler, setTraveler] = useState('Família');
  const [category, setCategory] = useState<DocumentCategory | 'Outros'>('Outros');

  useEffect(() => {
    if (!open) return;
    setFile(undefined);
    setName(suggestion?.name || '');
    setTraveler(suggestion?.traveler || 'Família');
    setCategory(suggestion?.category || 'Outros');
  }, [open, suggestion]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !name) return;

    const id = crypto.randomUUID();
    await putFile(id, file);

    onAdd({
      id,
      name,
      type: category,
      traveler,
      original: file.name,
      stored: true,
      createdAt: new Date().toISOString(),
      suggestionId: suggestion?.id,
      category,
    });

    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={suggestion ? 'Adicionar documento' : 'Outro documento'}>
      <form onSubmit={submit} className="form-grid">
        <label className="full">
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label>
          Categoria
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as DocumentCategory | 'Outros')}
          >
            <option>Essenciais</option>
            <option>Reservas</option>
            <option>Ingressos</option>
            <option>Outros</option>
          </select>
        </label>

        <label>
          Viajante
          <select value={traveler} onChange={(event) => setTraveler(event.target.value)}>
            <option>Família</option>
            <option>Filipe</option>
            <option>Rafaella</option>
            <option>Martín</option>
            <option>Maria Esther</option>
          </select>
        </label>

        <label className="full file-input-label">
          Arquivo
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
          {file && <span>{file.name}</span>}
        </label>

        <div className="form-actions full">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={!file || !name}>
            Salvar documento
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ScheduleExtraDialog({
  open,
  extra,
  onClose,
  onSchedule,
}: {
  open: boolean;
  extra?: ExtraItem;
  onClose: () => void;
  onSchedule: (time: string) => void;
}) {
  const [time, setTime] = useState('17:00');

  useEffect(() => {
    if (open) setTime('17:00');
  }, [open, extra]);

  return (
    <Dialog open={open} onClose={onClose} title={extra ? `Adicionar • ${extra.title}` : 'Adicionar ao dia'}>
      <div className="schedule-extra-dialog">
        <p>Escolha o horário. O extra entrará automaticamente na posição correta da sequência do dia.</p>

        <label>
          Horário
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>

        {extra?.note && <div className="estimate-hint">{extra.note}</div>}

        <div className="form-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" onClick={() => onSchedule(time)} disabled={!time}>
            Adicionar ao roteiro
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function OpsView({
  check,
  setCheck,
}: {
  check: Record<string, boolean>;
  setCheck: (value: Record<string, boolean>) => void;
}) {
  const completedCount = seedChecklist.filter((item) => check[item.id]).length;
  const progress = Math.round((completedCount / seedChecklist.length) * 100) || 0;

  return (
    <section className="page">
      <PageTitle
        kicker="OPS"
        title="Preparação e pendências"
        subtitle="O que precisa estar resolvido antes ou durante a viagem."
      />

      <div className="ops-progress-card">
        <div>
          <span className="eyebrow">PREPARAÇÃO</span>
          <h2>{progress}%</h2>
          <p>{completedCount} de {seedChecklist.length} itens concluídos</p>
        </div>
        <CircleCheckBig size={36} />
      </div>

      <div className="checklist-list">
        {seedChecklist.map((item) => (
          <label className={`check-row ${check[item.id] ? 'checked' : ''}`} key={item.id}>
            <input
              type="checkbox"
              checked={check[item.id] || false}
              onChange={() => setCheck({ ...check, [item.id]: !check[item.id] })}
            />
            <div>
              <b>{item.label}</b>
              <span>{item.category} • prioridade {item.priority}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="section-head">
        <div>
          <span className="eyebrow">ASSISTÊNCIA</span>
          <h3>Telefones do seguro</h3>
        </div>
      </div>

      <div className="phone-grid">
        {insurancePhones.map(([country, phone]) => (
          <a className="phone-card" href={`tel:${phone.replace(/[^+\d]/g, '')}`} key={country}>
            <Phone size={17} />
            <div>
              <span>{country}</span>
              <b>{phone}</b>
            </div>
          </a>
        ))}
      </div>

      <div className="ops-alert">
        <AlertTriangle size={18} />
        <div>
          <b>Durante a viagem</b>
          <span>Use “Concluir” no Hoje para fazer o próximo compromisso subir automaticamente.</span>
        </div>
      </div>
    </section>
  );
}

function PageTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{kicker}</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function Nav({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Empty({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty">
      <div>{icon}</div>
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
