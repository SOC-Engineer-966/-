const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const {
  db,
  dbPath,
  storeStorage,
  getStoreDb,
  listStores,
  createStore,
  toggleStoreStatus,
  deleteStore,
  getStoreBySlug,
  getStoreByCredentials,
  verifyAdmin,
  updateAdminPassword
} = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Multi-tenant resolution middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/admin')) {
    return next();
  }

  const rawSlug = req.headers['x-store-slug'] || req.query.store || 'default';
  const safeSlug = String(rawSlug).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') || 'default';

  if (safeSlug !== 'default') {
    const storeInfo = getStoreBySlug(safeSlug);
    if (!storeInfo) {
      return res.status(404).json({ success: false, error: 'المتجر غير موجود، يرجى التأكد من الرابط' });
    }
    if (storeInfo.status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        is_suspended: true,
        error: 'هذا الحساب معلق حالياً. يرجى مراجعة إدارة النظام للتفعيل.' 
      });
    }
  }

  const storeDb = getStoreDb(safeSlug);
  storeStorage.run({ slug: safeSlug, db: storeDb }, () => {
    next();
  });
});

// Serve static frontend files if built
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Multer for DB restore upload
const upload = multer({ dest: path.join(__dirname, 'temp_uploads') });

// Helper: Get setting value
function getSetting(key, defaultVal = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultVal;
}

// ==================== DASHBOARD API ====================
app.get('/api/dashboard', (req, res) => {
  try {
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
    
    const stockVal = db.prepare(`
      SELECT 
        COALESCE(SUM(stock_quantity), 0) as total_qty,
        COALESCE(SUM(stock_quantity * cost_price), 0) as total_cost_value,
        COALESCE(SUM(stock_quantity * retail_price), 0) as total_retail_value
      FROM items
    `).get();

    const lowStockCount = db.prepare(`
      SELECT COUNT(*) as count FROM items WHERE stock_quantity <= min_stock_alert
    `).get().count;

    const lowStockItems = db.prepare(`
      SELECT id, barcode, name, stock_quantity, min_stock_alert, cost_price, retail_price
      FROM items 
      WHERE stock_quantity <= min_stock_alert
      ORDER BY stock_quantity ASC
      LIMIT 6
    `).all();

    // Total debt receivable from customers (إجمالي الديون المعلقة في السوق)
    const totalDebtReceivable = db.prepare(`
      SELECT COALESCE(SUM(balance), 0) as total FROM customers WHERE balance > 0
    `).get().total;

    const totalCustomersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

    // Sales stats today and this month
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    const todaySales = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(total_profit), 0) as profit,
        COUNT(*) as count
      FROM sales_records 
      WHERE sale_date = ?
    `).get(today);

    const monthSales = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(total_profit), 0) as profit,
        COUNT(*) as count
      FROM sales_records 
      WHERE sale_date >= ?
    `).get(monthStart);

    const recentSales = db.prepare(`
      SELECT id, invoice_number, sale_date, customer_name, payment_method, total_amount, total_profit
      FROM sales_records
      ORDER BY id DESC
      LIMIT 5
    `).all();

    const recentAudits = db.prepare(`
      SELECT id, session_code, title, status, start_date, total_variance_qty, total_variance_cost, total_discounted_qty
      FROM audit_sessions
      ORDER BY id DESC
      LIMIT 4
    `).all();

    res.json({
      success: true,
      data: {
        totalItems,
        totalStockQty: stockVal.total_qty,
        totalCostValue: stockVal.total_cost_value,
        totalRetailValue: stockVal.total_retail_value,
        potentialProfit: stockVal.total_retail_value - stockVal.total_cost_value,
        lowStockCount,
        lowStockItems,
        totalDebtReceivable,
        totalCustomersCount,
        todaySales,
        monthSales,
        recentSales,
        recentAudits
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CATEGORIES API ====================
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(i.id) as items_count 
      FROM categories c
      LEFT JOIN items i ON c.id = i.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'اسم التصنيف مطلوب' });
    
    const stmt = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    const result = stmt.run(name.trim(), description || '');
    res.json({ success: true, id: Number(result.lastInsertRowid), message: 'تمت إضافة التصنيف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'تم حذف التصنيف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CUSTOMERS & DEBT LEDGER API ====================
app.get('/api/customers', (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT c.*, 
        COUNT(DISTINCT s.id) as sales_count,
        COUNT(DISTINCT p.id) as payments_count,
        COALESCE(MAX(s.sale_date), MAX(p.payment_date)) as last_activity
      FROM customers c
      LEFT JOIN sales_records s ON c.id = s.customer_id
      LEFT JOIN customer_payments p ON c.id = p.customer_id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ` GROUP BY c.id ORDER BY c.balance DESC, c.name ASC`;
    const customers = db.prepare(query).all(...params);
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, phone, address, balance, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'اسم العميل مطلوب' });
    const initialBal = Number(balance) || 0;
    const stmt = db.prepare('INSERT INTO customers (name, phone, address, balance, notes) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(name.trim(), phone || '', address || '', initialBal, notes || '');
    res.json({ success: true, id: Number(result.lastInsertRowid), message: 'تمت إضافة العميل بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    db.prepare('UPDATE customers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?')
      .run(name.trim(), phone || '', address || '', notes || '', req.params.id);
    res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'تم حذف العميل بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Statement of Account (كشف حساب العميل التراكمي: مسحوبات بالآجل وسندات قبض بالتقطيع)
app.get('/api/customers/:id/statement', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'العميل غير موجود' });

    // Invoices for this customer (Debit: مسحوبات بضاعة عليه)
    const sales = db.prepare(`
      SELECT id, invoice_number as ref_no, sale_date as trans_date, 'invoice' as type,
             total_amount as debit, 0 as credit, notes, created_at
      FROM sales_records
      WHERE customer_id = ?
    `).all(customer.id);

    // Payments / Installments (Credit: سداد دفعات بالتقطيع دائن)
    const payments = db.prepare(`
      SELECT id, receipt_number as ref_no, payment_date as trans_date, 'payment' as type,
             0 as debit, amount as credit, notes, created_at
      FROM customer_payments
      WHERE customer_id = ?
    `).all(customer.id);

    // Merge and sort chronologically
    const allTrans = [...sales, ...payments].sort((a, b) => {
      const dateDiff = a.trans_date.localeCompare(b.trans_date);
      if (dateDiff !== 0) return dateDiff;
      return a.id - b.id;
    });

    let runningBalance = 0;
    let totalPurchases = 0;
    let totalPaid = 0;

    const ledger = allTrans.map(t => {
      totalPurchases += t.debit;
      totalPaid += t.credit;
      runningBalance += (t.debit - t.credit);
      return {
        ...t,
        running_balance: runningBalance
      };
    });

    res.json({
      success: true,
      data: {
        customer,
        summary: {
          totalPurchases,
          totalPaid,
          currentDebt: runningBalance
        },
        ledger
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Customer Payment / Installment (سند قبض دفعة تقطيع)
app.post('/api/customers/:id/payments', (req, res) => {
  try {
    const customerId = req.params.id;
    const { amount, payment_date, payment_method, notes } = req.body;
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, error: 'يجب تحديد مبلغ دفعة صحيح أكبر من صفر' });
    }

    const dateStr = payment_date || new Date().toISOString().slice(0, 10);
    const receiptNumber = `RCP-${dateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const insertPayment = db.prepare(`
      INSERT INTO customer_payments (receipt_number, customer_id, amount, payment_date, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPayment.run(receiptNumber, customerId, payAmount, dateStr, payment_method || 'cash', notes || '');

    // Deduct from customer balance
    db.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(payAmount, customerId);

    const updatedCustomer = db.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId);

    res.json({
      success: true,
      receiptNumber,
      amount: payAmount,
      newBalance: updatedCustomer.balance,
      message: `تم تسجيل سند قبض بمبلغ ${payAmount} ر.س وتخفيض دين العميل بنجاح`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ITEMS & INVENTORY API ====================
app.get('/api/items', (req, res) => {
  try {
    const { search, category_id, low_stock, sort_by } = req.query;
    let query = `
      SELECT i.*, c.name as category_name,
        CASE 
          WHEN i.cost_price > 0 THEN ROUND(((i.retail_price - i.cost_price) / i.cost_price) * 100, 2)
          ELSE 0 
        END as margin_percent
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (i.name LIKE ? OR i.barcode LIKE ? OR i.shelf_location LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category_id) {
      query += ` AND i.category_id = ?`;
      params.push(category_id);
    }

    if (low_stock === 'true') {
      query += ` AND i.stock_quantity <= i.min_stock_alert`;
    }

    if (sort_by === 'stock_asc') {
      query += ` ORDER BY i.stock_quantity ASC`;
    } else if (sort_by === 'margin_desc') {
      query += ` ORDER BY margin_percent DESC`;
    } else if (sort_by === 'cost_desc') {
      query += ` ORDER BY i.cost_price DESC`;
    } else {
      query += ` ORDER BY i.id DESC`;
    }

    const items = db.prepare(query).all(...params);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/items/:id', (req, res) => {
  try {
    const item = db.prepare(`
      SELECT i.*, c.name as category_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!item) return res.status(400).json({ success: false, error: 'الصنف غير موجود' });

    const movements = db.prepare(`
      SELECT * FROM item_movements 
      WHERE item_id = ? 
      ORDER BY id DESC 
      LIMIT 50
    `).all(req.params.id);

    const priceLogs = db.prepare(`
      SELECT * FROM price_history 
      WHERE item_id = ? 
      ORDER BY id DESC 
      LIMIT 20
    `).all(req.params.id);

    res.json({ success: true, data: { ...item, movements, priceLogs } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const {
      barcode, name, category_id, unit, cost_price, retail_price,
      wholesale_price, min_price, stock_quantity, min_stock_alert,
      shelf_location, discount_min_qty, discount_percent, discount_notes, notes
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'اسم الصنف مطلوب' });

    const stmt = db.prepare(`
      INSERT INTO items (
        barcode, name, category_id, unit, cost_price, retail_price,
        wholesale_price, min_price, stock_quantity, min_stock_alert,
        shelf_location, discount_min_qty, discount_percent, discount_notes, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialQty = Number(stock_quantity) || 0;
    const cost = Number(cost_price) || 0;
    const retail = Number(retail_price) || 0;

    const result = stmt.run(
      barcode ? barcode.trim() : null,
      name.trim(),
      category_id ? Number(category_id) : null,
      unit || 'حبة',
      cost,
      retail,
      Number(wholesale_price) || retail,
      Number(min_price) || cost,
      initialQty,
      Number(min_stock_alert) || 5,
      shelf_location || '',
      Number(discount_min_qty) || 0,
      Number(discount_percent) || 0,
      discount_notes || '',
      notes || ''
    );

    const itemId = Number(result.lastInsertRowid);

    if (initialQty > 0) {
      db.prepare(`
        INSERT INTO item_movements (item_id, type, quantity_change, stock_before, stock_after, cost_price_at_time, notes)
        VALUES (?, 'initial_stock', ?, 0, ?, ?, 'رصيد افتتاحي عند إضافة الصنف')
      `).run(itemId, initialQty, initialQty, cost);
    }

    res.json({ success: true, id: itemId, message: 'تمت إضافة الصنف بنجاح' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: items.barcode')) {
      return res.status(400).json({ success: false, error: 'رقم الباركود مسجل مسبقاً لصنف آخر' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, error: 'الصنف غير موجود' });

    const {
      barcode, name, category_id, unit, cost_price, retail_price,
      wholesale_price, min_price, stock_quantity, min_stock_alert,
      shelf_location, discount_min_qty, discount_percent, discount_notes,
      notes, price_change_reason
    } = req.body;

    const newCost = Number(cost_price) || 0;
    const newRetail = Number(retail_price) || 0;

    if (existing.cost_price !== newCost || existing.retail_price !== newRetail) {
      db.prepare(`
        INSERT INTO price_history (item_id, old_cost_price, new_cost_price, old_retail_price, new_retail_price, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        existing.cost_price,
        newCost,
        existing.retail_price,
        newRetail,
        price_change_reason || 'تعديل أسعار مباشر من بطاقة الصنف'
      );
    }

    db.prepare(`
      UPDATE items SET
        barcode = ?, name = ?, category_id = ?, unit = ?,
        cost_price = ?, retail_price = ?, wholesale_price = ?, min_price = ?,
        stock_quantity = ?, min_stock_alert = ?, shelf_location = ?,
        discount_min_qty = ?, discount_percent = ?, discount_notes = ?,
        notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      barcode ? barcode.trim() : null,
      name.trim(),
      category_id ? Number(category_id) : null,
      unit || existing.unit,
      newCost,
      newRetail,
      Number(wholesale_price) || newRetail,
      Number(min_price) || newCost,
      Number(stock_quantity) !== undefined ? Number(stock_quantity) : existing.stock_quantity,
      Number(min_stock_alert) || existing.min_stock_alert,
      shelf_location !== undefined ? shelf_location : existing.shelf_location,
      Number(discount_min_qty) || 0,
      Number(discount_percent) || 0,
      discount_notes !== undefined ? discount_notes : existing.discount_notes,
      notes !== undefined ? notes : existing.notes,
      id
    );

    res.json({ success: true, message: 'تم تحديث بيانات الصنف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'تم حذف الصنف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== PRICING ENGINE API ====================
app.post('/api/pricing/batch-update', (req, res) => {
  try {
    const { category_id, action, percentage, target_margin, reason } = req.body;
    
    let itemsQuery = 'SELECT id, cost_price, retail_price FROM items WHERE 1=1';
    const params = [];
    if (category_id && category_id !== 'all') {
      itemsQuery += ' AND category_id = ?';
      params.push(category_id);
    }

    const items = db.prepare(itemsQuery).all(...params);
    let updatedCount = 0;

    const updateItemPrice = db.prepare('UPDATE items SET retail_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const insertHistory = db.prepare(`
      INSERT INTO price_history (item_id, old_cost_price, new_cost_price, old_retail_price, new_retail_price, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      let newRetail = item.retail_price;

      if (action === 'increase_retail_pct' && percentage) {
        newRetail = Math.round(item.retail_price * (1 + Number(percentage) / 100) * 100) / 100;
      } else if (action === 'decrease_retail_pct' && percentage) {
        newRetail = Math.round(item.retail_price * (1 - Number(percentage) / 100) * 100) / 100;
      } else if (action === 'set_target_margin' && target_margin) {
        newRetail = Math.round(item.cost_price * (1 + Number(target_margin) / 100) * 100) / 100;
      }

      if (newRetail !== item.retail_price) {
        updateItemPrice.run(newRetail, item.id);
        insertHistory.run(
          item.id,
          item.cost_price,
          item.cost_price,
          item.retail_price,
          newRetail,
          reason || 'تحديث أسعار جماعي عبر محرك التسعير'
        );
        updatedCount++;
      }
    }

    res.json({ success: true, updatedCount, message: `تم تحديث أسعار ${updatedCount} صنف بنجاح` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SALES RECORDING API ====================
app.get('/api/sales', (req, res) => {
  try {
    const { from_date, to_date, payment_method, search } = req.query;
    let query = 'SELECT * FROM sales_records WHERE 1=1';
    const params = [];

    if (from_date) {
      query += ' AND sale_date >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query += ' AND sale_date <= ?';
      params.push(to_date);
    }
    if (payment_method && payment_method !== 'all') {
      query += ' AND payment_method = ?';
      params.push(payment_method);
    }
    if (search) {
      query += ' AND (invoice_number LIKE ? OR customer_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC LIMIT 100';
    const sales = db.prepare(query).all(...params);
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sales/:id', (req, res) => {
  try {
    const sale = db.prepare('SELECT * FROM sales_records WHERE id = ?').get(req.params.id);
    if (!sale) return res.status(404).json({ success: false, error: 'سجل المبيعات غير موجود' });

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
    res.json({ success: true, data: { ...sale, items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sales', (req, res) => {
  try {
    const {
      sale_date, customer_id, customer_name, payment_method, notes, items, paid_amount
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, error: 'يجب اختيار صنف واحد على الأقل في السجل' });
    }

    const dateStr = sale_date || new Date().toISOString().slice(0, 10);
    const timeNum = Date.now().toString().slice(-4);
    const invoiceNumber = `SAL-${dateStr.replace(/-/g, '')}-${timeNum}`;

    const enableVat = getSetting('enable_vat') === 'true';
    const vatRate = Number(getSetting('vat_rate', '0')) || 0;

    let subtotal = 0;
    let totalDiscount = 0;
    let totalCost = 0;
    const processedItems = [];

    for (const line of items) {
      const dbItem = db.prepare('SELECT * FROM items WHERE id = ?').get(line.item_id);
      if (!dbItem) {
        return res.status(400).json({ success: false, error: `الصنف رقم ${line.item_id} غير موجود` });
      }

      const qty = Number(line.quantity) || 1;
      let unitPrice = Number(line.unit_price) !== undefined ? Number(line.unit_price) : dbItem.retail_price;
      
      let discountPct = Number(line.discount_percent) || 0;
      if (!discountPct && dbItem.discount_min_qty > 0 && qty >= dbItem.discount_min_qty) {
        discountPct = dbItem.discount_percent;
      }

      const grossLine = qty * unitPrice;
      const discountAmt = Math.round((grossLine * (discountPct / 100)) * 100) / 100;
      const netLine = grossLine - discountAmt;
      const lineCost = qty * dbItem.cost_price;
      const lineProfit = netLine - lineCost;

      subtotal += grossLine;
      totalDiscount += discountAmt;
      totalCost += lineCost;

      processedItems.push({
        item_id: dbItem.id,
        item_name: dbItem.name,
        quantity: qty,
        unit_cost: dbItem.cost_price,
        unit_price: unitPrice,
        discount_percent: discountPct,
        discount_amount: discountAmt,
        total_price: netLine,
        total_cost: lineCost,
        profit: lineProfit,
        stock_before: dbItem.stock_quantity,
        stock_after: dbItem.stock_quantity - qty
      });
    }

    const taxableAmount = subtotal - totalDiscount;
    const taxAmount = enableVat ? Math.round((taxableAmount * (vatRate / 100)) * 100) / 100 : 0;
    const totalAmount = taxableAmount + taxAmount;
    const totalProfit = taxableAmount - totalCost;

    // Debt & Payment calculation for Aden/Yemen installments
    let custId = customer_id ? Number(customer_id) : null;
    let paidAmt = Number(paid_amount) || 0;
    let remainingAmt = 0;

    if (payment_method === 'credit') {
      remainingAmt = Math.max(0, totalAmount - paidAmt);
    } else {
      paidAmt = totalAmount;
      remainingAmt = 0;
    }

    const insertSale = db.prepare(`
      INSERT INTO sales_records (
        invoice_number, sale_date, customer_id, customer_name, payment_method,
        subtotal, discount_amount, tax_amount, total_amount, paid_amount, remaining_amount,
        total_cost, total_profit, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertSale.run(
      invoiceNumber,
      dateStr,
      custId,
      customer_name || 'عميل نقدي',
      payment_method || 'cash',
      subtotal,
      totalDiscount,
      taxAmount,
      totalAmount,
      paidAmt,
      remainingAmt,
      totalCost,
      totalProfit,
      notes || ''
    );

    const saleId = Number(result.lastInsertRowid);

    // If credit with customer, update customer balance
    if (custId && remainingAmt > 0) {
      db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(remainingAmt, custId);
    }

    // If initial down payment was made with credit invoice, record payment receipt
    if (custId && paidAmt > 0 && payment_method === 'credit') {
      const downReceipt = `RCP-${dateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
      db.prepare(`
        INSERT INTO customer_payments (receipt_number, customer_id, amount, payment_date, payment_method, notes)
        VALUES (?, ?, ?, ?, 'cash', ?)
      `).run(downReceipt, custId, paidAmt, dateStr, `دفعة مسددة فوراً مع فاتورة ${invoiceNumber}`);
    }

    const insertSaleItem = db.prepare(`
      INSERT INTO sale_items (
        sale_id, item_id, item_name, quantity, unit_cost, unit_price,
        discount_percent, discount_amount, total_price, total_cost, profit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare('UPDATE items SET stock_quantity = stock_quantity - ? WHERE id = ?');
    const insertMovement = db.prepare(`
      INSERT INTO item_movements (
        item_id, type, quantity_change, stock_before, stock_after,
        cost_price_at_time, reference_id, notes
      ) VALUES (?, 'sale', ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      insertSaleItem.run(
        saleId,
        item.item_id,
        item.item_name,
        item.quantity,
        item.unit_cost,
        item.unit_price,
        item.discount_percent,
        item.discount_amount,
        item.total_price,
        item.total_cost,
        item.profit
      );

      // Decrement stock
      updateStock.run(item.quantity, item.item_id);

      // Log movement
      insertMovement.run(
        item.item_id,
        -item.quantity,
        item.stock_before,
        item.stock_after,
        item.unit_cost,
        saleId,
        `تسجيل مبيعات فاتورة رقم ${invoiceNumber}`
      );
    }

    res.json({
      success: true,
      saleId,
      invoiceNumber,
      totalAmount,
      paidAmount: paidAmt,
      remainingAmount: remainingAmt,
      totalProfit,
      message: 'تم تسجيل المبيعات وخصم الكميات من المخزون وترحيل الحساب بنجاح'
    });
  } catch (err) {
    console.error('Sales insert error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== STOCKTAKE & AUDIT API ====================
app.get('/api/audits', (req, res) => {
  try {
    const audits = db.prepare(`
      SELECT a.*, c.name as category_name
      FROM audit_sessions a
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY a.id DESC
    `).all();
    res.json({ success: true, data: audits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/audits', (req, res) => {
  try {
    const { title, scope, category_id, notes } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'عنوان جلسة الجرد مطلوب' });

    const code = `AUD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const startDate = new Date().toISOString().slice(0, 10);

    let itemsQuery = 'SELECT id, stock_quantity, cost_price FROM items WHERE 1=1';
    const params = [];
    if (scope === 'category' && category_id) {
      itemsQuery += ' AND category_id = ?';
      params.push(category_id);
    }

    const items = db.prepare(itemsQuery).all(...params);
    if (!items.length) {
      return res.status(400).json({ success: false, error: 'لا توجد أصناف في النطاق المحدد للجرد' });
    }

    const insertSession = db.prepare(`
      INSERT INTO audit_sessions (
        session_code, title, scope, category_id, status, start_date,
        total_system_items, notes
      ) VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?)
    `);

    const result = insertSession.run(
      code,
      title.trim(),
      scope || 'all',
      category_id ? Number(category_id) : null,
      startDate,
      items.length,
      notes || ''
    );

    const auditId = Number(result.lastInsertRowid);

    const insertAuditItem = db.prepare(`
      INSERT INTO audit_items (
        audit_id, item_id, system_quantity, cost_price, status
      ) VALUES (?, ?, ?, ?, 'pending')
    `);

    for (const item of items) {
      insertAuditItem.run(auditId, item.id, item.stock_quantity, item.cost_price);
    }

    res.json({ success: true, auditId, code, message: 'تم فتح جلسة الجرد بنجاح وجلب أرصدة النظام' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/audits/:id', (req, res) => {
  try {
    const session = db.prepare(`
      SELECT a.*, c.name as category_name
      FROM audit_sessions a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!session) return res.status(404).json({ success: false, error: 'جلسة الجرد غير موجودة' });

    const items = db.prepare(`
      SELECT ai.*, i.name as item_name, i.barcode, i.unit, i.shelf_location,
        c.name as category_name
      FROM audit_items ai
      JOIN items i ON ai.item_id = i.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE ai.audit_id = ?
      ORDER BY i.name ASC
    `).all(req.params.id);

    res.json({ success: true, data: { ...session, items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/audits/:id/record-count', (req, res) => {
  try {
    const auditId = req.params.id;
    const {
      item_id,
      physical_quantity,
      regular_quantity,
      discounted_quantity,
      discount_rate_percent,
      discount_reason,
      notes
    } = req.body;

    const auditItem = db.prepare('SELECT * FROM audit_items WHERE audit_id = ? AND item_id = ?').get(auditId, item_id);
    if (!auditItem) return res.status(404).json({ success: false, error: 'الصنف غير مدرج في جلسة الجرد هذه' });

    const physQty = Number(physical_quantity);
    const regQty = regular_quantity !== undefined ? Number(regular_quantity) : physQty;
    const discQty = Number(discounted_quantity) || 0;
    const discPct = Number(discount_rate_percent) || 0;

    const varianceQty = physQty - auditItem.system_quantity;
    const varianceCost = varianceQty * auditItem.cost_price;
    const status = varianceQty === 0 ? 'matched' : (varianceQty < 0 ? 'deficit' : 'surplus');

    db.prepare(`
      UPDATE audit_items SET
        physical_quantity = ?,
        regular_quantity = ?,
        discounted_quantity = ?,
        discount_rate_percent = ?,
        discount_reason = ?,
        variance_qty = ?,
        variance_cost = ?,
        status = ?,
        counted_at = CURRENT_TIMESTAMP,
        notes = ?
      WHERE id = ?
    `).run(
      physQty,
      regQty,
      discQty,
      discPct,
      discount_reason || '',
      varianceQty,
      varianceCost,
      status,
      notes || '',
      auditItem.id
    );

    const counts = db.prepare(`
      SELECT 
        COUNT(CASE WHEN physical_quantity IS NOT NULL THEN 1 END) as counted_count,
        COALESCE(SUM(variance_qty), 0) as total_var_qty,
        COALESCE(SUM(variance_cost), 0) as total_var_cost,
        COALESCE(SUM(discounted_quantity), 0) as total_disc_qty
      FROM audit_items
      WHERE audit_id = ?
    `).get(auditId);

    db.prepare(`
      UPDATE audit_sessions SET
        total_counted_items = ?,
        total_variance_qty = ?,
        total_variance_cost = ?,
        total_discounted_qty = ?
      WHERE id = ?
    `).run(counts.counted_count, counts.total_var_qty, counts.total_var_cost, counts.total_disc_qty, auditId);

    res.json({
      success: true,
      varianceQty,
      varianceCost,
      status,
      message: 'تم تسجيل الجرد الفعلي والكميات المخصومة بنجاح'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/audits/:id/reconcile', (req, res) => {
  try {
    const auditId = req.params.id;
    const { reconciliation_reason } = req.body;

    const session = db.prepare('SELECT * FROM audit_sessions WHERE id = ?').get(auditId);
    if (!session) return res.status(404).json({ success: false, error: 'جلسة الجرد غير موجودة' });
    if (session.status === 'reconciled') {
      return res.status(400).json({ success: false, error: 'تم اعتماد تسوية هذه الجلسة مسبقاً' });
    }

    const items = db.prepare(`
      SELECT * FROM audit_items 
      WHERE audit_id = ? AND physical_quantity IS NOT NULL
    `).all(auditId);

    if (!items.length) {
      return res.status(400).json({ success: false, error: 'لم يتم جرد أي صنف في هذه الجلسة بعد' });
    }

    const updateItemStock = db.prepare('UPDATE items SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const insertMovement = db.prepare(`
      INSERT INTO item_movements (
        item_id, type, quantity_change, stock_before, stock_after,
        cost_price_at_time, reference_id, notes
      ) VALUES (?, 'audit_reconciliation', ?, ?, ?, ?, ?, ?)
    `);

    let adjustedCount = 0;

    for (const item of items) {
      if (item.variance_qty !== 0) {
        updateItemStock.run(item.physical_quantity, item.item_id);

        let noteDetails = `تسوية جردية [${session.session_code}]: فرق ${item.variance_qty > 0 ? '+' : ''}${item.variance_qty}`;
        if (item.discounted_quantity > 0) {
          noteDetails += ` (منها ${item.discounted_quantity} كمية مخفضة بنسبة ${item.discount_rate_percent}%: ${item.discount_reason || 'تصفية'})`;
        }

        insertMovement.run(
          item.item_id,
          item.variance_qty,
          item.system_quantity,
          item.physical_quantity,
          item.cost_price,
          auditId,
          `${noteDetails} - ${reconciliation_reason || 'مطابقة الرصيد الفعلي'}`
        );

        adjustedCount++;
      }
    }

    const nowStr = new Date().toISOString();
    db.prepare(`
      UPDATE audit_sessions SET
        status = 'reconciled',
        reconciled_date = ?,
        reconciliation_reason = ?
      WHERE id = ?
    `).run(nowStr, reconciliation_reason || 'اعتماد تسوية الفروقات وتحديث المخزون', auditId);

    res.json({
      success: true,
      adjustedCount,
      message: `تم اعتماد التسوية بنجاح وتحديث أرصدة ${adjustedCount} صنف بمخزون المستودع الفعلي!`
    });
  } catch (err) {
    console.error('Reconciliation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== REPORTS API ====================
app.get('/api/reports/valuation', (req, res) => {
  try {
    const valuationByCategory = db.prepare(`
      SELECT 
        COALESCE(c.name, 'بدون تصنيف') as category_name,
        COUNT(i.id) as item_count,
        SUM(i.stock_quantity) as total_units,
        SUM(i.stock_quantity * i.cost_price) as total_cost,
        SUM(i.stock_quantity * i.retail_price) as total_retail,
        SUM((i.retail_price - i.cost_price) * i.stock_quantity) as expected_profit
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      GROUP BY c.id
      ORDER BY total_cost DESC
    `).all();

    res.json({ success: true, data: valuationByCategory });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/profit-loss', (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    let query = `
      SELECT 
        sale_date,
        COUNT(id) as invoices_count,
        SUM(subtotal) as total_subtotal,
        SUM(discount_amount) as total_discounts,
        SUM(tax_amount) as total_tax,
        SUM(total_amount) as total_revenue,
        SUM(total_cost) as total_cogs,
        SUM(total_profit) as gross_profit
      FROM sales_records
      WHERE 1=1
    `;
    const params = [];

    if (from_date) {
      query += ' AND sale_date >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query += ' AND sale_date <= ?';
      params.push(to_date);
    }

    query += ' GROUP BY sale_date ORDER BY sale_date DESC';
    const dailyData = db.prepare(query).all(...params);

    const overall = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(total_cost), 0) as total_cogs,
        COALESCE(SUM(total_profit), 0) as gross_profit
      FROM sales_records
      WHERE 1=1 ${from_date ? 'AND sale_date >= ?' : ''} ${to_date ? 'AND sale_date <= ?' : ''}
    `).get(...params);

    res.json({ success: true, data: { dailyData, overall } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/stagnant', (req, res) => {
  try {
    const stagnantItems = db.prepare(`
      SELECT i.*, c.name as category_name,
        COALESCE(SUM(si.quantity), 0) as total_sold_last_month
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN sale_items si ON i.id = si.item_id 
        AND si.sale_id IN (
          SELECT id FROM sales_records WHERE sale_date >= date('now', '-30 days')
        )
      WHERE i.stock_quantity > 0
      GROUP BY i.id
      HAVING total_sold_last_month = 0
      ORDER BY (i.stock_quantity * i.cost_price) DESC
      LIMIT 20
    `).all();

    res.json({ success: true, data: stagnantItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SETTINGS & BACKUP API ====================
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    settings.currency = 'ر.س'; // Force Saudi Riyal
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [key, val] of Object.entries(req.body)) {
      if (key === 'currency') continue; // Locked to ر.س
      upsert.run(key, String(val));
    }
    res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/backup/download', (req, res) => {
  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `al_muhasib_backup_${dateStr}.db`;
    res.download(dbPath, filename);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SUPER ADMIN & STORE MANAGEMENT API ====================
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = verifyAdmin(username, password);
    if (!admin) {
      return res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور للمشرف غير صحيحة' });
    }
    res.json({ success: true, message: 'تم تسجيل دخول المشرف بنجاح', token: 'super-admin-auth-token' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/change-password', (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
    }
    updateAdminPassword(new_password.trim());
    res.json({ success: true, message: 'تم تغيير كلمة مرور المشرف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/stores', (req, res) => {
  try {
    const stores = listStores();
    res.json({ success: true, data: stores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/stores', (req, res) => {
  try {
    const { slug, name, owner_name, phone, username, password, notes } = req.body;
    if (!slug || !name || !username || !password) {
      return res.status(400).json({ success: false, error: 'يرجى تعبئة الحقول الأساسية: اسم المتجر، رمز الرابط، اسم الدخول وكلمة المرور' });
    }
    const result = createStore({ slug, name, owner_name, phone, username, password, notes });
    res.status(201).json({ success: true, message: 'تم إنشاء المتجر بنجاح وتجهيز قاعدة بياناته المستقلة', data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/stores/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    toggleStoreStatus(req.params.id, status);
    res.json({ success: true, message: 'تم تحديث حالة المتجر بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/stores/:id', (req, res) => {
  try {
    deleteStore(req.params.id);
    res.json({ success: true, message: 'تم حذف المتجر وبياناته بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Client store login
app.post('/api/store/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const store = getStoreByCredentials(username, password);
    if (!store) {
      return res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    if (store.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'عذراً، هذا الحساب معلق حالياً. يرجى مراجعة إدارة النظام للتفعيل.' });
    }
    res.json({ success: true, data: store });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/store/current', (req, res) => {
  try {
    const currentStore = storeStorage.getStore();
    const slug = currentStore?.slug || 'default';
    if (slug === 'default') {
      return res.json({ 
        success: true, 
        data: { 
          slug: 'default', 
          name: getSetting('company_name', 'نظام المحاسب الذكي'),
          status: 'active'
        } 
      });
    }
    const info = getStoreBySlug(slug);
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA fallback for built frontend
app.get('*', (req, res) => {
  const indexHtml = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.send('Al-Muhasib API is running on port ' + PORT);
  }
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 نظام المحاسب الذكي يعمل بنجاح`);
  console.log(`💻 الرابط: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
