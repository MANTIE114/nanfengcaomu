const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Mock User login/auth endpoint
app.post('/api/auth/login', (req, res) => {
    // Mock logic: just return user id 1
    db.get("SELECT * FROM users WHERE id = 1", (err, user) => {
        if (!user) {
            db.run("INSERT INTO users (nickname, phone) VALUES (?, ?)", ['南风访客', '13888888888'], function (err) {
                res.json({ success: true, token: 'mock-token', userId: this.lastID });
            });
        } else {
            res.json({ success: true, token: 'mock-token', userId: user.id });
        }
    });
});

app.get('/api/users/profile', (req, res) => {
    const userId = req.headers['x-user-id'] || 1; // Default mapped to 1
    db.get("SELECT id, nickname, avatar, phone, points, balance FROM users WHERE id = ?", [userId], (err, row) => {
        res.json({ success: true, data: row });
    });
});

// Categories
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY sort_order ASC", (err, rows) => {
        res.json({ success: true, data: rows });
    });
});

// Products
app.get('/api/products', (req, res) => {
    const { categoryId } = req.query;
    let sql = "SELECT * FROM products WHERE status = 1";
    let params = [];
    if (categoryId) {
        sql += " AND category_id = ?";
        params.push(categoryId);
    }
    db.all(sql, params, (err, rows) => {
        res.json({ success: true, data: rows });
    });
});

app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        res.json({ success: true, data: row });
    });
});

app.post('/api/products', (req, res) => {
    const { name, stock, price, category_id = 1, status = 1, cover_image = '', sku = '' } = req.body;
    db.run("INSERT INTO products (category_id, name, stock, price, status, cover_image, sku) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [category_id, name, stock, price, status, cover_image, sku],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: { id: this.lastID } });
        });
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, stock, price, category_id = 1, status = 1, cover_image = '', sku = '' } = req.body;
    db.run("UPDATE products SET category_id = ?, name = ?, stock = ?, price = ?, status = ?, cover_image = ?, sku = ? WHERE id = ?",
        [category_id, name, stock, price, status, cover_image, sku, id],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
});

// Cart
app.get('/api/cart', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    db.all(`
    SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.cover_image 
    FROM cart c 
    JOIN products p ON c.product_id = p.id 
    WHERE c.user_id = ?
  `, [userId], (err, rows) => {
        res.json({ success: true, data: rows });
    });
});

app.post('/api/cart', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { productId, quantity } = req.body;
    // Check if exists
    db.get("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err, row) => {
        if (row) {
            db.run("UPDATE cart SET quantity = quantity + ? WHERE id = ?", [quantity, row.id], (err) => {
                res.json({ success: true, message: 'Added to cart' });
            });
        } else {
            db.run("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", [userId, productId, quantity], (err) => {
                res.json({ success: true, message: 'Added to cart' });
            });
        }
    });
});

// Orders
app.post('/api/orders', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { addressId, items } = req.body; // items: [{productId, quantity, price}]
    // Simplistic order create
    const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const orderNo = 'ORD' + Date.now();
    db.run("INSERT INTO orders (user_id, order_no, status, total_amount, address_id) VALUES (?, ?, ?, ?, ?)",
        [userId, orderNo, 0, totalAmount, addressId], function (err) {
            const orderId = this.lastID;
            const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
            items.forEach(item => stmt.run(orderId, item.productId, item.quantity, item.price));
            stmt.finalize();
            res.json({ success: true, data: { orderId, orderNo } });
        });
});

app.get('/api/orders', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY create_time DESC", [userId], (err, rows) => {
        res.json({ success: true, data: rows });
    });
});

// Admin endpoints
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // Mock admin credentials
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'fake-admin-token', role: 'admin' });
    } else {
        res.status(401).json({ success: false, message: '账号或密码错误' });
    }
});

app.get('/api/admin/orders', (req, res) => {
    db.all("SELECT o.*, u.nickname FROM orders o JOIN users u ON o.user_id = u.id ORDER BY create_time DESC", (err, rows) => {
        res.json({ success: true, data: rows });
    });
});
app.get('/api/admin/stats', (req, res) => {
    res.json({ success: true, data: { todaySales: 2999, totalOrders: 156, newUsers: 12 } });
})

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
