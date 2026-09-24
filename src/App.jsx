import { useState, useMemo, useEffect } from 'react';
import './index.css';

const CATEGORIES = {
  'Hogar': ['Arriendo / cuota de vivienda', 'Servicios públicos', 'Internet', 'Celular', 'Administración', 'Reparaciones del hogar', 'Aseo y limpieza', 'Muebles y electrodomésticos'],
  'Alimentación': ['Mercado', 'Comidas fuera de casa', 'Domicilios', 'Restaurantes', 'Snacks', 'Bebidas'],
  'Transporte': ['Gasolina', 'Transporte público', 'Taxi / Uber / Didi', 'Parqueadero', 'Peajes', 'Mantenimiento del vehículo', 'Seguro', 'Impuestos del vehículo'],
  'Deudas y obligaciones': ['Tarjeta de crédito', 'Préstamos', 'Cuotas', 'Intereses', 'Compras a crédito'],
  'Salud': ['Medicamentos', 'Citas médicas', 'Odontología', 'Exámenes', 'Seguro / medicina prepagada', 'Gimnasio'],
  'Personal': ['Ropa', 'Zapatos', 'Barbería / peluquería', 'Productos de higiene', 'Cosméticos', 'Accesorios'],
  'Compras': ['Tecnología', 'Hogar', 'Accesorios', 'Compras online', 'Compras personales'],
  'Finanzas': ['Ahorro', 'Inversiones', 'Comisiones bancarias', 'Transferencias', 'Seguros'],
  'Otros': ['Emergencias', 'Gastos imprevistos', 'Otros gastos']
};

import { supabase } from './supabaseClient';

function App() {
  const [budget, setBudget] = useState(0);
  const [isEditingBudget, setIsEditingBudget] = useState(true);

  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(Object.keys(CATEGORIES)[0]);
  const [subcategory, setSubcategory] = useState(CATEGORIES[Object.keys(CATEGORIES)[0]][0]);
  const [description, setDescription] = useState('');

  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [fixedDay, setFixedDay] = useState(1);
  const [fixedMonth, setFixedMonth] = useState('Todos');
  const [fixedTitle, setFixedTitle] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');

  const [includeFixed, setIncludeFixed] = useState(() => {
    return localStorage.getItem('snoopy_include_fixed') === 'true';
  });

  const [paidExpenses, setPaidExpenses] = useState(() => {
    const saved = localStorage.getItem('snoopy_paid_expenses');
    if (!saved) return {};
    const { month, ids } = JSON.parse(saved);
    const currentKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    // Auto-reset if we're in a new month
    if (month !== currentKey) return {};
    return ids;
  });

  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const [recentExpenseAnim, setRecentExpenseAnim] = useState(false);

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    localStorage.setItem('snoopy_include_fixed', includeFixed);
  }, [includeFixed]);

  useEffect(() => {
    async function fetchSupabaseData() {
      // Cargar presupuesto
      const { data: budgetData } = await supabase.from('budget').select('amount').eq('id', 1).single();
      if (budgetData) {
        setBudget(budgetData.amount);
        if (budgetData.amount > 0) setIsEditingBudget(false);
      }

      // Cargar gastos
      const { data: expData } = await supabase.from('expenses').select('*').order('id', { ascending: false });
      if (expData) setExpenses(expData);

      // Cargar gastos fijos
      const { data: fixedData } = await supabase.from('fixed_expenses').select('*').order('day', { ascending: true });
      if (fixedData) setFixedExpenses(fixedData);
    }
    fetchSupabaseData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = time.getDate();
  const timeString = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateString = time.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setCategory(cat);
    setSubcategory(CATEGORIES[cat][0]);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;

    const newExpense = {
      id: Date.now(),
      amount: parseFloat(amount),
      category,
      subcategory,
      description,
      date: new Date().toLocaleDateString('es-ES')
    };

    setExpenses([newExpense, ...expenses]);
    supabase.from('expenses').insert([newExpense]).then();

    setAmount('');
    setDescription('');

    // Trigger angry animation
    setRecentExpenseAnim(true);
    setTimeout(() => {
      setRecentExpenseAnim(false);
    }, 4000);
  };

  const handleAddFixedExpense = (e) => {
    e.preventDefault();
    if (!fixedAmount || isNaN(fixedAmount) || !fixedTitle) return;

    const newFixed = {
      id: Date.now(),
      day: parseInt(fixedDay),
      month: fixedMonth,
      title: fixedTitle,
      amount: parseFloat(fixedAmount)
    };

    setFixedExpenses(prev => [...prev, newFixed].sort((a, b) => a.day - b.day));
    supabase.from('fixed_expenses').insert([newFixed]).then();

    setFixedTitle('');
    setFixedAmount('');
    setFixedDay(1);
    setFixedMonth('Todos');
  };

  const handleDeleteFixedExpense = (id) => {
    setFixedExpenses(fixedExpenses.filter(exp => exp.id !== id));
    supabase.from('fixed_expenses').delete().eq('id', id).then();
  };

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
    supabase.from('expenses').delete().eq('id', id).then();
  };

  const totalExpenses = useMemo(() => expenses.reduce((acc, exp) => acc + exp.amount, 0), [expenses]);

  const currentMonthKey = `${time.getFullYear()}-${time.getMonth()}`;
  const currentMonthName = MONTHS[time.getMonth()];

  // Save paidExpenses to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('snoopy_paid_expenses', JSON.stringify({ month: currentMonthKey, ids: paidExpenses }));
  }, [paidExpenses, currentMonthKey]);

  // Auto-reset paid expenses when month changes
  useEffect(() => {
    const saved = localStorage.getItem('snoopy_paid_expenses');
    if (saved) {
      const { month } = JSON.parse(saved);
      if (month !== currentMonthKey) {
        setPaidExpenses({});
      }
    }
  }, [currentMonthKey]);

  const handleMarkPaid = (id) => {
    setPaidExpenses(prev => {
      const updated = { ...prev };
      if (updated[id]) {
        delete updated[id]; // toggle off
      } else {
        updated[id] = true;
      }
      return updated;
    });
  };
  const totalFixedExpensesThisMonth = useMemo(() => {
    return fixedExpenses
      .filter(exp => !exp.month || exp.month === 'Todos' || exp.month === currentMonthName)
      .reduce((acc, exp) => acc + exp.amount, 0);
  }, [fixedExpenses, currentMonthName]);

  const total = includeFixed ? totalExpenses + totalFixedExpensesThisMonth : totalExpenses;
  const remaining = budget - total;

  const hasFixedExpenseToday = useMemo(() => fixedExpenses.some(exp =>
    exp.day === today && (!exp.month || exp.month === 'Todos' || exp.month === currentMonthName)
  ), [fixedExpenses, today, currentMonthName]);

  let currentImg = '/snoopy_happy.png';
  let currentMsg = 'Snoopy está feliz.';
  let isAngry = false;

  if (recentExpenseAnim) {
    currentImg = '/snoopy_angry.png';
    currentMsg = '¡AMOCITOOO ESTÁS GASTANDO MUCHO!';
    isAngry = true;
  } else if (hasFixedExpenseToday) {
    currentImg = '/snoopy_angry.png';
    currentMsg = 'Amocito tienes gastos por pagar.';
    isAngry = true;
  }

  return (
    <div className="container">
      <div className="main-content">

        {/* Wallet Section */}
        <div className="card wallet-card">
          <div className="wallet-header-flex">
            <h2>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Mi Billetera
            </h2>

            <div className="toggle-switch-container">
              <span className="toggle-label">
                Restar Gastos Fijos
              </span>
              <label className="toggle-switch">
                <input type="checkbox" checked={includeFixed} onChange={(e) => setIncludeFixed(e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {isEditingBudget ? (
            <div className="budget-input">
              <input
                type="number"
                value={budget || ''}
                onChange={(e) => setBudget(Number(e.target.value))}
                placeholder="Pon tu platita amocito"
                autoFocus
              />
              <button onClick={() => {
                setIsEditingBudget(false);
                supabase.from('budget').upsert({ id: 1, amount: budget }).then();
              }}>Guardar</button>
            </div>
          ) : (
            <div className="budget-display">
              <div className="budget-item">
                <span>Presupuesto Inicial</span>
                <span>${budget.toLocaleString()}</span>
              </div>
              <div className="budget-item">
                <span>Gastos Fijos (Mes)</span>
                <span>${totalFixedExpensesThisMonth.toLocaleString()}</span>
              </div>
              <div className="budget-item">
                <span>Gastos Recientes</span>
                <span>${totalExpenses.toLocaleString()}</span>
              </div>
              <div className="budget-item highlight">
                <span>Dinero Restante</span>
                <span style={{ color: remaining < 0 ? '#ff477e' : '#ff758c' }}>
                  ${remaining.toLocaleString()}
                </span>
              </div>
              <button className="btn-small" onClick={() => setIsEditingBudget(true)}>Editar</button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="title-header">
            <div className="title-icon">
              <img
                src="/snoopy_outline.png"
                alt="Snoopy Icon"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: 'scale(2.4)'
                }}
              />
            </div>
            <h1>
              Snoopy Gastos
              <span>No gastes mucho amocito o snoopy se enoja</span>
            </h1>
          </div>

          <form onSubmit={handleAddExpense}>
            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej. 150000"
                required
              />
            </div>

            <div className="form-group">
              <label>Categoría</label>
              <select value={category} onChange={handleCategoryChange}>
                {Object.keys(CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Subcategoría</label>
              <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                {CATEGORIES[category].map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descripción (Opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Por si quieres poner algo adicional aquí amorcito"
              />
            </div>

            <button type="submit">
              Agregar Gasto
            </button>
          </form>
        </div>

        <div className="card expenses-list">
          <h2>Tus Gastos Recientes</h2>
          {expenses.length === 0 ? (
            <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem 0', fontWeight: '500' }}>
              No hay gastos registrados aún.
            </p>
          ) : (
            expenses.map(exp => (
              <div key={exp.id} className="expense-item" style={{ position: 'relative' }}>
                <div className="expense-info-container">
                  <div className="expense-info">
                    <span className="expense-title">{exp.subcategory} {exp.description && `- ${exp.description}`}</span>
                    <span className="expense-category">{exp.category} • {exp.date}</span>
                  </div>
                </div>
                <div className="expense-amount" style={{ paddingRight: '2rem' }}>
                  ${exp.amount.toLocaleString()}
                </div>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDeleteExpense(exp.id)}
                  title="Eliminar gasto"
                  style={{ top: '50%', transform: 'translateY(-50%)', right: '0.5rem' }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar">
        <div className="card snoopy-container">
          <h2>Estado Actual</h2>

          <div className="snoopy-circle-bg">
            <img
              key={isAngry ? 'angry' : 'happy'}
              src={currentImg}
              alt="Snoopy"
              className="snoopy-image"
            />

            {/* Floating hearts when happy */}
            {!isAngry && (
              <div className="hearts-container">
                <span className="heart h1">💗</span>
                <span className="heart h2">💖</span>
                <span className="heart h3">💕</span>
                <span className="heart h4">💓</span>
                <span className="heart h5">💝</span>
              </div>
            )}

            {/* Broken heart when angry */}
            {isAngry && (
              <div className="broken-heart-container">
                <span className="broken-heart">💔</span>
              </div>
            )}
          </div>

          <div className={`status-badge ${isAngry ? 'angry' : 'happy'}`}>
            {currentMsg}
          </div>
        </div>

        <div className="card">
          <h2>Calendario</h2>

          <div className="clock-container">
            <div className="clock-time">{timeString}</div>
            <div className="clock-date" style={{ textTransform: 'capitalize' }}>{dateString}</div>
          </div>

          <h3 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '1rem' }}>Gastos Fijos Programados</h3>
          <div className="custom-scrollbar" style={{ maxHeight: '360px', overflowY: 'auto', marginBottom: '1rem', padding: '10px 15px 10px 5px', margin: '-10px -15px 0 -5px' }}>
            {fixedExpenses.map(exp => {
              const isToday = exp.day === today && (!exp.month || exp.month === 'Todos' || exp.month === currentMonthName);
              const isPaid = !!paidExpenses[exp.id];
              return (
                <div key={exp.id} className={`fixed-expense-item ${isToday ? 'active' : ''} ${isPaid ? 'paid' : ''}`}>
                  <div className="calendar-day">
                    {exp.day}
                    {exp.month && exp.month !== 'Todos' && <div style={{ fontSize: '0.6rem', lineHeight: '1', marginTop: '2px' }}>{exp.month.substring(0, 3)}</div>}
                  </div>
                  <div className="fixed-expense-info">
                    <div className="fixed-expense-title">{exp.title}</div>
                    <div className="fixed-expense-amount">${exp.amount.toLocaleString()}</div>
                    {isPaid
                      ? <span className="tag-paid">✅ Pagado este mes</span>
                      : isToday && <span className="tag-urgent">PAGAR HOY</span>
                    }
                  </div>
                  <div className="fixed-expense-actions">
                    <button
                      type="button"
                      className={`paid-btn ${isPaid ? 'is-paid' : ''}`}
                      onClick={() => handleMarkPaid(exp.id)}
                      title={isPaid ? 'Marcar como no pagado' : 'Marcar como pagado este mes'}
                    >
                      {isPaid ? '✓' : '$'}
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => handleDeleteFixedExpense(exp.id)}
                      title="Eliminar gasto fijo"
                      style={{ position: 'static', opacity: 1, transform: 'none', boxShadow: 'none', background: 'transparent', width: '28px', height: '28px', padding: 0, margin: 0, minWidth: 'unset', fontSize: '0.75rem', color: 'var(--text-light)' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
            <div style={{ height: '15px' }}></div>
          </div>

          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', color: 'var(--text-dark)' }}>
            Agregar Gasto Fijo
          </h3>
          <form onSubmit={handleAddFixedExpense}>
            <div className="form-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ flex: '1 1 40%' }}>
                <label style={{ fontSize: '0.75rem' }}>Día</label>
                <input
                  type="number"
                  min="1" max="31"
                  value={fixedDay}
                  onChange={(e) => setFixedDay(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: '1 1 40%' }}>
                <label style={{ fontSize: '0.75rem' }}>Mes</label>
                <select
                  value={fixedMonth}
                  onChange={(e) => setFixedMonth(e.target.value)}
                >
                  <option value="Todos">Todos</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 100%' }}>
                <label style={{ fontSize: '0.75rem' }}>Descripción</label>
                <input
                  type="text"
                  value={fixedTitle}
                  onChange={(e) => setFixedTitle(e.target.value)}
                  placeholder="Ej. Internet"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.75rem' }}>Monto</label>
              <input
                type="number"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                placeholder="Ej. 100000"
                required
              />
            </div>
            <button type="submit" className="btn-secondary">
              + Añadir Gasto
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
