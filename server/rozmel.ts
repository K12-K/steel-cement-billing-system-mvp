import { Router, Response } from 'express';
import { getDatabase, saveDatabase, RozmelEntry } from './db.js';
import { AuthRequest } from './auth.js';

export const rozmelRouter = Router();

// List Rozmel (Cash Book) entries with independent daily & overall summaries
rozmelRouter.get('/', (req: AuthRequest, res: Response) => {
  const { date, from_date, to_date, type, search } = req.query;
  const db = getDatabase();

  const allEntries = [...(db.rozmel_entries || [])];
  let list = [...allEntries];

  if (date && typeof date === 'string') {
    list = list.filter(e => e.entry_date === date);
  } else {
    if (from_date && typeof from_date === 'string') {
      list = list.filter(e => e.entry_date >= from_date);
    }
    if (to_date && typeof to_date === 'string') {
      list = list.filter(e => e.entry_date <= to_date);
    }
  }

  if (type && typeof type === 'string' && (type === 'in' || type === 'out')) {
    list = list.filter(e => e.type === type);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.toLowerCase().trim();
    list = list.filter(
      e =>
        e.particulars.toLowerCase().includes(term) ||
        (e.category && e.category.toLowerCase().includes(term)) ||
        (e.notes && e.notes.toLowerCase().includes(term))
    );
  }

  // Sort newest date/time first
  list.sort((a, b) => {
    const dtA = `${a.entry_date}T${a.entry_time || '00:00'}`;
    const dtB = `${b.entry_date}T${b.entry_time || '00:00'}`;
    if (dtB !== dtA) return dtB.localeCompare(dtA);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Filtered totals
  const filteredIn = list.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const filteredOut = list.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);

  // Today totals (standalone cash book)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayEntries = allEntries.filter(e => e.entry_date === todayStr);
  const todayIn = todayEntries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const todayOut = todayEntries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);

  // Overall Cash Book totals
  const overallIn = allEntries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const overallOut = allEntries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);

  // Daily breakdown for filtered entries
  const dailyMap = new Map<string, { date: string; cash_in: number; cash_out: number; net: number; count: number }>();
  for (const e of list) {
    const existing = dailyMap.get(e.entry_date) || {
      date: e.entry_date,
      cash_in: 0,
      cash_out: 0,
      net: 0,
      count: 0,
    };
    if (e.type === 'in') {
      existing.cash_in += e.amount;
    } else {
      existing.cash_out += e.amount;
    }
    existing.net = existing.cash_in - existing.cash_out;
    existing.count += 1;
    dailyMap.set(e.entry_date, existing);
  }

  const dailyBreakdown = Array.from(dailyMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(d => ({
      ...d,
      cash_in: Math.round(d.cash_in * 100) / 100,
      cash_out: Math.round(d.cash_out * 100) / 100,
      net: Math.round(d.net * 100) / 100,
    }));

  return res.json({
    success: true,
    entries: list,
    summary: {
      filtered_in: Math.round(filteredIn * 100) / 100,
      filtered_out: Math.round(filteredOut * 100) / 100,
      filtered_net: Math.round((filteredIn - filteredOut) * 100) / 100,
      today_in: Math.round(todayIn * 100) / 100,
      today_out: Math.round(todayOut * 100) / 100,
      today_net: Math.round((todayIn - todayOut) * 100) / 100,
      overall_in: Math.round(overallIn * 100) / 100,
      overall_out: Math.round(overallOut * 100) / 100,
      overall_balance: Math.round((overallIn - overallOut) * 100) / 100,
      total_entries: list.length,
    },
    daily_breakdown: dailyBreakdown,
  });
});

// Create new manual Rozmel cash entry
rozmelRouter.post('/', (req: AuthRequest, res: Response) => {
  const { entry_date, entry_time, type, amount, particulars, category, notes } = req.body;

  if (type !== 'in' && type !== 'out') {
    return res.status(400).json({ success: false, message: 'Entry type must be Cash In (in) or Cash Out (out).' });
  }

  const parsedAmount = Math.round((parseFloat(amount) || 0) * 100) / 100;
  if (parsedAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
  }

  if (!particulars || !String(particulars).trim()) {
    return res.status(400).json({ success: false, message: 'Particulars / Description is required.' });
  }

  const db = getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newEntry: RozmelEntry = {
    id: `roz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entry_date: entry_date ? String(entry_date).trim() : defaultDate,
    entry_time: entry_time ? String(entry_time).trim() : defaultTime,
    type,
    amount: parsedAmount,
    particulars: String(particulars).trim(),
    category: category ? String(category).trim() : 'General Cash',
    notes: notes ? String(notes).trim() : '',
    created_by: req.user?.email || 'admin',
    created_at: nowIso,
    updated_at: nowIso,
  };

  db.rozmel_entries.unshift(newEntry);
  saveDatabase();

  return res.status(201).json({
    success: true,
    message: `Rozmel ${type === 'in' ? 'Cash In' : 'Cash Out'} entry recorded.`,
    entry: newEntry,
  });
});

// Update Rozmel entry
rozmelRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { entry_date, entry_time, type, amount, particulars, category, notes } = req.body;

  const db = getDatabase();
  const entry = db.rozmel_entries.find(e => e.id === id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Rozmel entry not found.' });
  }

  if (type !== undefined && type !== 'in' && type !== 'out') {
    return res.status(400).json({ success: false, message: 'Entry type must be Cash In (in) or Cash Out (out).' });
  }

  if (amount !== undefined) {
    const parsedAmount = Math.round((parseFloat(amount) || 0) * 100) / 100;
    if (parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }
    entry.amount = parsedAmount;
  }

  if (entry_date !== undefined) entry.entry_date = String(entry_date).trim();
  if (entry_time !== undefined) entry.entry_time = String(entry_time).trim();
  if (type !== undefined) entry.type = type;
  if (particulars !== undefined) {
    if (!String(particulars).trim()) {
      return res.status(400).json({ success: false, message: 'Particulars / Description is required.' });
    }
    entry.particulars = String(particulars).trim();
  }
  if (category !== undefined) entry.category = String(category).trim();
  if (notes !== undefined) entry.notes = String(notes).trim();
  entry.updated_at = new Date().toISOString();

  saveDatabase();

  return res.json({
    success: true,
    message: 'Rozmel entry updated successfully.',
    entry,
  });
});

// Delete Rozmel entry
rozmelRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const index = db.rozmel_entries.findIndex(e => e.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Rozmel entry not found.' });
  }

  db.rozmel_entries.splice(index, 1);
  saveDatabase();

  return res.json({
    success: true,
    message: 'Rozmel entry deleted successfully.',
  });
});
