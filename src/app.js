const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api', require('./routes'));

// Page routes wrapper
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../views/pages/home.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../views/pages/admin/dashboard.html')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[Error]', err.message || err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

module.exports = app;
