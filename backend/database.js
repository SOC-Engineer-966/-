const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');

const storeStorage = new AsyncLocalStorage();
const dataDir = path.join(__dirname, 'data');
const storesDir = path.join(dataDir, 'stores');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(storesDir)) {
  fs.mkdirSync(storesDir, { recursive: true });
}

// Master Database for Admin and Stores Registry
const masterDbPath = path.join(dataDir, 'master.db');
const masterDb = new DatabaseSync(masterDbPath);
masterDb.exec('PRAGMA journal_mode = WAL;');

function initMasterDb() {
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin account if not exists
  const adminCheck = masterDb.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!adminCheck) {
    masterDb.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)').run('admin', 'admin77');
  }
}
initMasterDb();

// Cache of open SQLite database instances per store slug
const dbInstances = new Map();

// Initialize schema on a given store database
function initStoreSchema(storeDb, storeName = 'نظام المحاسب الذكي') {
  storeDb.exec('PRAGMA journal_mode = WAL;');
  storeDb.exec('PRAGMA foreign_keys = ON;');

  storeDb.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      balance REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      unit TEXT DEFAULT 'حبة',
      cost_price REAL NOT NULL DEFAULT 0,
      retail_price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      min_price REAL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      min_stock_alert REAL DEFAULT 5,
      shelf_location TEXT,
      discount_min_qty REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      discount_notes TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS item_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      quantity_change REAL NOT NULL,
      stock_before REAL NOT NULL,
      stock_after REAL NOT NULL,
      cost_price_at_time REAL,
      reference_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      old_cost_price REAL,
      new_cost_price REAL,
      old_retail_price REAL,
      new_retail_price REAL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE,
      sale_date TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      payment_method TEXT DEFAULT 'cash',
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      total_profit REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales_records(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      total_cost REAL NOT NULL,
      profit REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT UNIQUE,
      title TEXT NOT NULL,
      scope TEXT DEFAULT 'all',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'in_progress',
      start_date TEXT NOT NULL,
      reconciled_date TEXT,
      total_system_items INTEGER DEFAULT 0,
      total_counted_items INTEGER DEFAULT 0,
      total_variance_qty REAL DEFAULT 0,
      total_variance_cost REAL DEFAULT 0,
      total_discounted_qty REAL DEFAULT 0,
      reconciliation_reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_id INTEGER NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      system_quantity REAL NOT NULL,
      physical_quantity REAL,
      regular_quantity REAL,
      discounted_quantity REAL DEFAULT 0,
      discount_rate_percent REAL DEFAULT 0,
      discount_reason TEXT,
      cost_price REAL NOT NULL,
      variance_qty REAL,
      variance_cost REAL,
      status TEXT DEFAULT 'pending',
      counted_at DATETIME,
      notes TEXT
    );
  `);

  try { storeDb.exec("ALTER TABLE sales_records ADD COLUMN customer_id INTEGER REFERENCES customers(id);"); } catch(e){}
  try { storeDb.exec("ALTER TABLE sales_records ADD COLUMN paid_amount REAL DEFAULT 0;"); } catch(e){}
  try { storeDb.exec("ALTER TABLE sales_records ADD COLUMN remaining_amount REAL DEFAULT 0;"); } catch(e){}

  const getSetting = storeDb.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSetting = storeDb.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  const defaults = [
    ['company_name', storeName],
    ['currency', 'ر.س'],
    ['enable_vat', 'false'],
    ['vat_rate', '0'],
    ['address', 'اليمن - عدن'],
    ['phone', '']
  ];

  for (const [key, val] of defaults) {
    if (!getSetting.get(key)) {
      insertSetting.run(key, val);
    }
  }
}

// Get or create database instance for a store slug
function getStoreDb(slug = 'default') {
  const safeSlug = (slug || 'default').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  if (dbInstances.has(safeSlug)) {
    return dbInstances.get(safeSlug);
  }

  let dbFile;
  let storeName = 'نظام المحاسب الذكي';

  if (safeSlug === 'default') {
    dbFile = path.join(dataDir, 'al_muhasib.db');
  } else {
    dbFile = path.join(storesDir, `${safeSlug}.db`);
    const storeRow = masterDb.prepare('SELECT name FROM stores WHERE slug = ?').get(safeSlug);
    if (storeRow) {
      storeName = storeRow.name;
    }
  }

  const instance = new DatabaseSync(dbFile);
  initStoreSchema(instance, storeName);
  dbInstances.set(safeSlug, instance);
  return instance;
}

// Default instance for fallback
const defaultDb = getStoreDb('default');

// Transparent dynamic proxy: any db.prepare or db.exec transparently uses the active store's DB!
const db = new Proxy({}, {
  get(target, prop) {
    const currentStore = storeStorage.getStore();
    const activeDb = (currentStore && currentStore.db) ? currentStore.db : defaultDb;
    const value = activeDb[prop];
    if (typeof value === 'function') {
      return value.bind(activeDb);
    }
    return value;
  }
});

// Admin helper functions
function listStores() {
  return masterDb.prepare('SELECT id, slug, name, owner_name, phone, username, password, status, notes, created_at FROM stores ORDER BY id DESC').all();
}

function createStore({ slug, name, owner_name, phone, username, password, notes }) {
  const safeSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  const existing = masterDb.prepare('SELECT id FROM stores WHERE slug = ? OR username = ?').get(safeSlug, username);
  if (existing) {
    throw new Error('اسم المستخدم أو رمز المتجر موجود مسبقاً، يرجى اختيار رمز آخر');
  }

  masterDb.prepare(`
    INSERT INTO stores (slug, name, owner_name, phone, username, password, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(safeSlug, name, owner_name || '', phone || '', username, password, notes || '');

  // Pre-initialize store database
  getStoreDb(safeSlug);
  return { slug: safeSlug, name, username };
}

function toggleStoreStatus(id, newStatus) {
  masterDb.prepare('UPDATE stores SET status = ? WHERE id = ?').run(newStatus, id);
}

function deleteStore(id) {
  const store = masterDb.prepare('SELECT slug FROM stores WHERE id = ?').get(id);
  if (store) {
    masterDb.prepare('DELETE FROM stores WHERE id = ?').run(id);
    const dbFile = path.join(storesDir, `${store.slug}.db`);
    if (fs.existsSync(dbFile)) {
      try { fs.unlinkSync(dbFile); } catch (e) {}
    }
    dbInstances.delete(store.slug);
  }
}

function getStoreBySlug(slug) {
  return masterDb.prepare('SELECT id, slug, name, owner_name, phone, username, status, notes FROM stores WHERE slug = ?').get(slug);
}

function getStoreByCredentials(username, password) {
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '').trim();
  return masterDb.prepare('SELECT id, slug, name, owner_name, phone, username, status FROM stores WHERE LOWER(TRIM(username)) = LOWER(?) AND password = ?').get(cleanUser, cleanPass);
}

function verifyAdmin(username, password) {
  return masterDb.prepare('SELECT id, username FROM admin_users WHERE username = ? AND password = ?').get(username, password);
}

function updateAdminPassword(newPassword) {
  masterDb.prepare("UPDATE admin_users SET password = ? WHERE username = 'admin'").run(newPassword);
}

module.exports = {
  db,
  dbPath: path.join(dataDir, 'al_muhasib.db'),
  masterDb,
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
};
