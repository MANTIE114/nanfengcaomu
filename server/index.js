const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const app = express();
const PORT = 3000;

const path = require('path');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from Resources folder
app.use('/assets', express.static(path.join(__dirname, '../Resources')));
app.use('/Resources', express.static(path.join(__dirname, '../Resources')));


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
    const { categoryId, showAll } = req.query;
    let sql = "SELECT * FROM products WHERE 1=1";
    let params = [];
    if (showAll !== '1') {
        sql += " AND status = 1";
    }
    if (categoryId) {
        sql += " AND category_id = ?";
        params.push(categoryId);
    }
    sql += " ORDER BY create_time DESC";
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
    const { name, subtitle = '', description = '', details = '', stock, price, category_id = 1, status = 1, cover_image = '', sku = '' } = req.body;
    db.run("INSERT INTO products (category_id, name, subtitle, description, details, stock, price, status, cover_image, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [category_id, name, subtitle, description, details, stock, price, status, cover_image, sku],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: { id: this.lastID } });
        });
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, subtitle = '', description = '', details = '', stock, price, category_id = 1, status = 1, cover_image = '', sku = '' } = req.body;
    db.run("UPDATE products SET category_id = ?, name = ?, subtitle = ?, description = ?, details = ?, stock = ?, price = ?, status = ?, cover_image = ?, sku = ? WHERE id = ?",
        [category_id, name, subtitle, description, details, stock, price, status, cover_image, sku, id],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
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

app.put('/api/cart/:id', (req, res) => {
    const { quantity } = req.body;
    if (quantity <= 0) {
        db.run("DELETE FROM cart WHERE id = ?", [req.params.id], () => {
            res.json({ success: true, message: 'Removed' });
        });
    } else {
        db.run("UPDATE cart SET quantity = ? WHERE id = ?", [quantity, req.params.id], () => {
            res.json({ success: true, message: 'Updated' });
        });
    }
});

app.delete('/api/cart/:id', (req, res) => {
    db.run("DELETE FROM cart WHERE id = ?", [req.params.id], () => {
        res.json({ success: true, message: 'Removed' });
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
        [userId, orderNo, 0, totalAmount, addressId || null], function (err) {
            const orderId = this.lastID;
            const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
            items.forEach(item => stmt.run(orderId, item.productId, item.quantity, item.price));
            stmt.finalize();
            res.json({ success: true, data: { orderId, orderNo } });
        });
});

app.get('/api/orders', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const sql = `
        SELECT o.*, 
            (SELECT p.cover_image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as cover_image,
            (SELECT p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_name,
            (SELECT p.subtitle FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_spec,
            (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total_quantity
        FROM orders o
        WHERE user_id = ? AND is_user_deleted = 0
        ORDER BY create_time DESC
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});


app.post('/api/orders/:id/user-delete', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const orderId = req.params.id;
    // status -1 (cancelled) or status 3 (completed) usually allows deletion from user view
    db.run("UPDATE orders SET is_user_deleted = 1 WHERE id = ? AND user_id = ?", [orderId, userId], function (err) {
        if (err) return res.json({ success: false, message: '删除失败' });
        res.json({ success: true, message: '订单已移除' });
    });
});






app.get('/api/orders/:id', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const orderId = req.params.id;
    const sql = `
        SELECT o.*, 
               a.recipient, a.phone as address_phone, a.province, a.city, a.district, a.detail as address_detail
        FROM orders o
        LEFT JOIN addresses a ON o.address_id = a.id
        WHERE o.id = ? AND o.user_id = ?
    `;
    db.get(sql, [orderId, userId], (err, order) => {
        if (!order) return res.json({ success: false, message: 'Not found' });
        db.all(`
            SELECT oi.*, p.name, p.cover_image 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [orderId], (err, items) => {
            order.items = items;
            res.json({ success: true, data: order });
        });
    });
});


app.post('/api/orders/:id/pay', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const orderId = req.params.id;
    // status: 1 means paid and pending shipment
    const now = new Date().toISOString();
    db.run("UPDATE orders SET status = 1, pay_time = ? WHERE id = ? AND user_id = ?", [now, orderId, userId], function (err) {
        if (err) return res.json({ success: false, message: '支付失败' });
        res.json({ success: true, message: '支付成功' });
    });
});
app.post('/api/orders/:id/confirm', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const orderId = req.params.id;
    // status: 3 means completed
    db.run("UPDATE orders SET status = 3 WHERE id = ? AND user_id = ?", [orderId, userId], function (err) {
        if (err) return res.json({ success: false, message: '确认收货失败' });
        res.json({ success: true, message: '确认收货成功' });
    });
});

app.post('/api/orders/:id/cancel', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const orderId = req.params.id;
    // status: -1 means cancelled
    db.run("UPDATE orders SET status = -1 WHERE id = ? AND user_id = ?", [orderId, userId], function (err) {
        if (err) return res.json({ success: false, message: '取消订单失败' });
        res.json({ success: true, message: '订单已取消' });
    });
});



app.post('/api/refunds/apply', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { order_id, reason, type, refund_amount } = req.body;
    const refundNo = 'RFD' + Date.now();

    console.log('[DEBUG] Applying for refund:', {
        order_id,
        userId,
        reason,
        type,
        refund_amount,
        refundNo
    });

    if (!order_id || refund_amount === undefined) {
        return res.status(400).json({ success: false, message: '订单ID或退款金额缺失' });
    }

    const sql = "INSERT INTO refunds (order_id, user_id, reason, type, refund_amount, refund_no, status) VALUES (?, ?, ?, ?, ?, ?, 0)";
    db.run(sql, [order_id, userId, reason || '其他原因', type || 1, refund_amount, refundNo], function (err) {
        if (err) {
            console.error('[ERROR] Refund insert failed:', err);
            return res.status(500).json({ success: false, message: '售后记录创建失败: ' + err.message });
        }

        const refundId = this.lastID;
        console.log('[DEBUG] Refund record created:', refundId);

        // Update order status to 4 (After-sales processing)
        db.run("UPDATE orders SET status = 4 WHERE id = ? AND user_id = ?", [order_id, userId], (uErr) => {
            if (uErr) {
                console.error('[ERROR] Order status update failed during refund:', uErr);
            } else {
                console.log('[DEBUG] Order status updated to 4 for order:', order_id);
            }
        });

        res.json({
            success: true,
            message: '申请已提交',
            data: { refundId, refundNo }
        });
    });
});



app.get('/api/refunds/:orderId', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { orderId } = req.params;
    db.get("SELECT * FROM refunds WHERE order_id = ? AND user_id = ?", [orderId, userId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: row });
    });
});

app.delete('/api/refunds/:orderId', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { orderId } = req.params;
    db.run("DELETE FROM refunds WHERE order_id = ? AND user_id = ?", [orderId, userId], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        // Restore order status to 1 (Paid) - Assuming it was paid before
        db.run("UPDATE orders SET status = 1 WHERE id = ? AND user_id = ?", [orderId, userId]);
        res.json({ success: true, message: 'Withdrawn' });
    });
});

// Addresses
app.get('/api/addresses', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    db.all("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", [userId], (err, rows) => {
        res.json({ success: true, data: rows });
    });
});

app.post('/api/addresses', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { recipient, phone, province, city, district, detail, is_default } = req.body;
    const isDef = is_default ? 1 : 0;
    const insertFn = () => {
        db.run(
            `INSERT INTO addresses (user_id, recipient, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, recipient, phone, province || '', city || '', district || '', detail, isDef],
            function (err) { res.json({ success: true, id: this.lastID }); }
        );
    };
    isDef ? db.run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId], insertFn) : insertFn();
});

app.put('/api/addresses/:id', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { id } = req.params;
    const { recipient, phone, province, city, district, detail, is_default } = req.body;
    const isDef = is_default ? 1 : 0;
    const updateFn = () => {
        db.run(
            `UPDATE addresses SET recipient=?, phone=?, province=?, city=?, district=?, detail=?, is_default=? WHERE id=? AND user_id=?`,
            [recipient, phone, province || '', city || '', district || '', detail, isDef, id, userId],
            function (err) { res.json({ success: true }); }
        );
    };
    isDef ? db.run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId], updateFn) : updateFn();
});

app.delete('/api/addresses/:id', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    db.run("DELETE FROM addresses WHERE id=? AND user_id=?", [req.params.id, userId], function (err) {
        res.json({ success: true });
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

app.get('/api/admin/orders/:id', (req, res) => {
    const orderId = req.params.id;
    const sql = `
        SELECT o.*, u.nickname, 
               a.recipient, a.phone, a.province, a.city, a.district, a.detail as address_detail,
               r.reason as refund_reason, r.type as refund_type, r.refund_amount, r.refund_no, r.status as refund_status, r.create_time as refund_time
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        LEFT JOIN addresses a ON o.address_id = a.id 
        LEFT JOIN refunds r ON o.id = r.order_id
        WHERE o.id = ?
    `;
    db.get(sql, [orderId], (err, order) => {
        if (!order) return res.json({ success: false, message: 'Order not found' });
        db.all("SELECT oi.*, p.name as product_name, p.cover_image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?", [orderId], (err, items) => {
            order.items = items;
            res.json({ success: true, data: order });
        });
    });
});

app.post('/api/admin/orders/:id/ship', (req, res) => {
    const { id } = req.params;
    const { tracking_no, logistics_company } = req.body;
    const ship_time = new Date().toISOString();
    db.run("UPDATE orders SET status = 2, tracking_no = ?, logistics_company = ?, ship_time = ? WHERE id = ?",
        [tracking_no, logistics_company, ship_time, id],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, message: 'Shipped successfully' });
        });
});

app.post('/api/admin/orders/:id/refund-approve', (req, res) => {
    const { id } = req.params;
    const now = new Date().toISOString();
    db.serialize(() => {
        db.run("UPDATE orders SET status = 5 WHERE id = ?", [id]);
        db.run("UPDATE refunds SET status = 2, process_time = ? WHERE order_id = ?", [now, id]);
    });
    res.json({ success: true, message: 'Refund approved' });
});

app.post('/api/admin/orders/:id/refund-reject', (req, res) => {
    const { id } = req.params;
    const now = new Date().toISOString();
    // Revert to status 1 (assuming it was paid/pending shipment)
    db.serialize(() => {
        db.run("UPDATE orders SET status = 1 WHERE id = ?", [id]);
        db.run("UPDATE refunds SET status = 3, process_time = ? WHERE order_id = ?", [now, id]);
    });
    res.json({ success: true, message: 'Refund rejected' });
});
app.get('/api/admin/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    let results = {};
    let done = 0;
    const finish = () => {
        done++;
        if (done === 4) res.json({ success: true, data: results });
    };
    db.get(`SELECT COALESCE(SUM(total_amount), 0) as todaySales FROM orders WHERE status >= 1 AND date(create_time) = ?`, [today], (err, row) => {
        results.todaySales = row ? row.todaySales : 0; finish();
    });
    db.get(`SELECT COUNT(*) as totalOrders FROM orders`, (err, row) => {
        results.totalOrders = row ? row.totalOrders : 0; finish();
    });
    db.get(`SELECT COUNT(*) as totalProducts FROM products`, (err, row) => {
        results.totalProducts = row ? row.totalProducts : 0; finish();
    });
    db.get(`SELECT COALESCE(SUM(total_amount), 0) as totalRevenue FROM orders WHERE status >= 1`, (err, row) => {
        results.totalRevenue = row ? row.totalRevenue : 0; finish();
    });
})

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
