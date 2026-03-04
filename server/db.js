const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT UNIQUE,
    nickname TEXT DEFAULT '南风访客',
    avatar TEXT,
    phone TEXT,
    points INTEGER DEFAULT 0,
    balance REAL DEFAULT 0.00,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    cover_image TEXT,
    images TEXT,
    details TEXT,
    sku TEXT,
    status INTEGER DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_no TEXT UNIQUE NOT NULL,
    status INTEGER DEFAULT 0,
    total_amount REAL NOT NULL,
    address_id INTEGER,
    tracking_no TEXT,
    logistics_company TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    pay_time DATETIME,
    ship_time DATETIME
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT,
    product_image TEXT,
    quantity INTEGER DEFAULT 1,
    price REAL NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipient TEXT NOT NULL,
    phone TEXT NOT NULL,
    province TEXT,
    city TEXT,
    district TEXT,
    detail TEXT NOT NULL,
    is_default INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Init Data (Categories)
  db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)");
      [['香道', 1], ['茶礼', 2], ['禅意服饰', 3], ['器皿', 4]].forEach(c => stmt.run(c[0], c[1]));
      stmt.finalize();
      console.log('Categories initialized.');
    }
  });

  // Init Data (Products)
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare("INSERT INTO products (category_id, name, description, price, stock, cover_image) VALUES (?, ?, ?, ?, ?, ?)");
      [
        [1, '老山檀香 · 禅意线香', '静心采撷，古法手作线香', 299.00, 128, '/assets/item1.jpg'],
        [1, '降真香手串 · 圆满款', '老山檀香提神醒脑', 1280.00, 3, '/assets/item2.jpg'],
        [2, '青瓷盖碗 · 素雅系', '明前龙井', 168.00, 0, '/assets/item3.jpg'],
      ].forEach(p => stmt.run(p[0], p[1], p[2], p[3], p[4], p[5]));
      stmt.finalize();
      console.log('Products initialized.');
    }
  });
});

module.exports = db;
