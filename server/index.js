const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const app = express();
const PORT = 3000;
const path = require('path');
const multer = require('multer');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../Resources'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from Resources folder
app.use('/assets', express.static(path.join(__dirname, '../Resources')));
app.use('/Resources', express.static(path.join(__dirname, '../Resources')));

// Image Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = `/assets/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
});


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
    const userId = req.headers['x-user-id'] || 1;
    const sql = `
        SELECT u.*, 
        (SELECT COUNT(*) FROM favorites f WHERE f.user_id = u.id) as collect_count 
        FROM users u WHERE u.id = ?
    `;
    db.get(sql, [userId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: row });
    });
});

app.put('/api/users/profile', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { nickname, avatar } = req.body;

    let updates = [];
    let params = [];

    if (nickname !== undefined) {
        updates.push("nickname = ?");
        params.push(nickname);
    }
    if (avatar !== undefined) {
        updates.push("avatar = ?");
        params.push(avatar);
    }

    if (updates.length === 0) {
        return res.json({ success: true, message: 'No changes' });
    }

    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// Categories
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY is_top DESC, sort_order ASC", (err, rows) => {
        res.json({ success: true, data: rows });
    });
});

app.post('/api/admin/categories', (req, res) => {
    const { name, subtitle = '', image = '', icon = '', sort_order = 0, status = 1, is_top = 0 } = req.body;
    db.run("INSERT INTO categories (name, subtitle, image, icon, sort_order, status, is_top) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, subtitle, image, icon, sort_order, status, is_top],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: { id: this.lastID } });
        });
});

app.put('/api/admin/categories/:id', (req, res) => {
    const { id } = req.params;
    const { name, subtitle = '', image = '', icon = '', sort_order = 0, status = 1, is_top = 0 } = req.body;
    db.run("UPDATE categories SET name = ?, subtitle = ?, image = ?, icon = ?, sort_order = ?, status = ?, is_top = ? WHERE id = ?",
        [name, subtitle, image, icon, sort_order, status, is_top, id],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
});

app.put('/api/admin/categories/:id/products', (req, res) => {
    const { id } = req.params;
    const { productIds } = req.body; // Array of IDs to be IN this category
    if (!Array.isArray(productIds)) return res.status(400).json({ success: false, message: 'Invalid productIds' });

    db.serialize(() => {
        // Step 1: Remove products from this category (set to default 1 or similar)
        // Note: Schema says category_id NOT NULL, so we move them to 'Misc' or 1
        db.run("UPDATE products SET category_id = 1 WHERE category_id = ?", [id]);

        // Step 2: Assign selected products to this category
        if (productIds.length > 0) {
            const placeholders = productIds.map(() => '?').join(',');
            db.run(`UPDATE products SET category_id = ? WHERE id IN (${placeholders})`, [id, ...productIds], (err) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});

app.delete('/api/admin/categories/:id', (req, res) => {
    const { id } = req.params;
    // Check if products exist in this category first
    db.get("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [id], (err, row) => {
        if (row && row.count > 0) {
            return res.status(400).json({ success: false, message: '无法删除：该分类下已有商品' });
        }
        db.run("DELETE FROM categories WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    });
});

// Favorites
app.get('/api/favorites/status', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { productId } = req.query;
    db.get("SELECT id FROM favorites WHERE user_id = ? AND product_id = ?", [userId, productId], (err, row) => {
        res.json({ success: true, isFavorited: !!row });
    });
});

app.post('/api/favorites/toggle', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const { productId } = req.body;
    db.get("SELECT id FROM favorites WHERE user_id = ? AND product_id = ?", [userId, productId], (err, row) => {
        if (row) {
            db.run("DELETE FROM favorites WHERE id = ?", [row.id], () => {
                res.json({ success: true, isFavorited: false });
            });
        } else {
            db.run("INSERT INTO favorites (user_id, product_id) VALUES (?, ?)", [userId, productId], () => {
                res.json({ success: true, isFavorited: true });
            });
        }
    });
});

// Favorites list
app.get('/api/favorites/list', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const sql = `
        SELECT p.id, p.name, p.subtitle, p.price, p.cover_image
        FROM favorites f
        JOIN products p ON f.product_id = p.id
        WHERE f.user_id = ?
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        const domain = `http://${req.headers.host}`;
        const enriched = (rows || []).map(p => ({
            ...p,
            cover_image: p.cover_image && p.cover_image.startsWith('/') ? domain + p.cover_image : p.cover_image
        }));
        res.json({ success: true, data: enriched });
    });
});

// Products
app.get('/api/products', (req, res) => {
    const { categoryId, keyword, showAll } = req.query;
    let sql = "SELECT * FROM products WHERE 1=1";
    let params = [];

    if (showAll !== '1') {
        sql += " AND status = 1";
    }

    if (categoryId) {
        sql += " AND category_id = ?";
        params.push(categoryId);
    }

    if (keyword) {
        sql += " AND (name LIKE ? OR subtitle LIKE ? OR description LIKE ?)";
        const searchPattern = `%${keyword}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += " ORDER BY create_time DESC";

    db.all(sql, params, (err, rows) => {
        res.json({ success: true, data: rows });
    });
});

app.get('/api/products/:id/reviews', (req, res) => {
    const productId = req.params.id;
    const sql = `
        SELECT r.*, u.nickname, u.avatar 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.product_id = ? 
        ORDER BY r.create_time DESC
    `;
    db.all(sql, [productId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        const domain = req.headers.host.includes('localhost') ? `http://${req.headers.host}` : `https://${req.headers.host}`;
        const enriched = (rows || []).map(r => ({
            ...r,
            avatar: r.avatar && r.avatar.startsWith('/') ? domain + r.avatar : r.avatar
        }));
        res.json({ success: true, data: enriched });
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
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const sql = `
        SELECT o.*,
            (SELECT p.cover_image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as cover_image,
        (SELECT p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_name,
    (SELECT p.subtitle FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as first_product_spec,
        (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total_quantity
        FROM orders o
        WHERE user_id = ? AND is_user_deleted = 0
        ORDER BY create_time DESC
LIMIT ? OFFSET ?
    `;
    db.all(sql, [userId, pageSize, offset], (err, rows) => {
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

app.post('/api/orders/:id/review', (req, res) => {
    const userId = req.headers['x-user-id'] || 1;
    const orderId = req.params.id;
    const { rating = 5, content = '这款产品非常好，很满意！' } = req.body;

    db.get("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 3 AND is_reviewed = 0", [orderId, userId], (err, order) => {
        if (!order) return res.json({ success: false, message: '无法评价：订单状态异常或已评价' });

        db.all("SELECT product_id FROM order_items WHERE order_id = ?", [orderId], (err, items) => {
            if (err || !items.length) return res.json({ success: false, message: '订单内无商品' });

            db.serialize(() => {
                const stmt = db.prepare("INSERT INTO reviews (user_id, order_id, product_id, rating, content) VALUES (?, ?, ?, ?, ?)");
                items.forEach(item => stmt.run(userId, orderId, item.product_id, rating, content));
                stmt.finalize();

                db.run("UPDATE orders SET is_reviewed = 1 WHERE id = ?", [orderId]);
                res.json({ success: true, message: '评价成功' });
            });
        });
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
            `INSERT INTO addresses(user_id, recipient, phone, province, city, district, detail, is_default) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
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
            `UPDATE addresses SET recipient =?, phone =?, province =?, city =?, district =?, detail =?, is_default =? WHERE id =? AND user_id =? `,
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
    const { keyword } = req.query;
    let sql = `
        SELECT o.*, u.nickname, a.recipient, a.phone as recipient_phone,
    (SELECT p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as main_product_name,
        (SELECT p.cover_image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as main_product_image
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        LEFT JOIN addresses a ON o.address_id = a.id
        WHERE 1 = 1
    `;
    let params = [];
    if (keyword) {
        sql += ` AND(o.order_no LIKE ? OR u.nickname LIKE ? OR a.recipient LIKE ? OR a.phone LIKE ? OR o.tracking_no LIKE ?)`;
        const p = `% ${keyword}% `;
        params.push(p, p, p, p, p);
    }
    sql += ` ORDER BY o.create_time DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
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
    db.get(`SELECT COALESCE(SUM(total_amount), 0) as todaySales FROM orders WHERE status >= 1 AND date(create_time) = ? `, [today], (err, row) => {
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
