# PROJECT-RULES.md — Backend (Node.js + Express, MVC)

---

## 1. Layer Structure

```
src/
├── controllers/                    # C - HTTP handlers, one file per domain
│   ├── booking.controller.js
│   ├── tour.controller.js
│   ├── category.controller.js
│   ├── analytics.controller.js
│   └── admin.controller.js
│
├── models/                         # M - Data access layer, raw SQL / stored proc calls
│   ├── booking.model.js
│   ├── tour.model.js
│   ├── category.model.js
│   ├── analytics.model.js
│   └── admin.model.js
│
├── services/                       # Business logic, orchestrates models
│   ├── booking.service.js
│   ├── tour.service.js
│   ├── category.service.js
│   └── admin.service.js
│
├── routes/                         # V - Express routers
│   ├── index.js                    # Aggregates all routers → mounted in app.js
│   ├── booking.routes.js
│   ├── tour.routes.js
│   ├── category.routes.js
│   ├── analytics.routes.js
│   └── admin.routes.js
│
├── middlewares/                    # Express middleware
│   ├── auth.middleware.js
│   └── error.middleware.js
│
├── config/
│   ├── db.js                       # MySQL connection pool
│   ├── constants.js                # Enums & status codes
│   └── index.js                    # All env vars — single source of truth
│
├── utils/
│   ├── response.js                 # Unified JSON response helpers
│   ├── errors.js                   # AppError class
│   ├── asyncHandler.js             # Wraps async controllers
│   └── logger.js
│
├── app.js                          # Express setup, middleware stack, mount routes
└── server.js                       # HTTP server entry point
```

**Request flow:**
```
Request → routes/ → middlewares/ → controllers/ → services/ → models/ → DB
                                                                      ↓
Response ←────────────────────── utils/response.js ←──────────────────
```

---

## 2. Naming Conventions

| Target | Convention | Example |
|---|---|---|
| Layer folders | `kebab-case` (plural) | `controllers/`, `models/` |
| Files | `<domain>.<layer>.js` | `booking.controller.js` |
| Functions | `camelCase`, verb-first | `createBooking()`, `getTopTours()` |
| Variables | `camelCase` | `tourId`, `orderStatus` |
| Constants | `UPPER_SNAKE_CASE` object | `ORDER_STATUS.COMPLETED` |
| Route paths | `kebab-case` | `/api/booked-tours` |
| DB columns in JS | map to `camelCase` | `OrderDate` → `orderDate` |

---

## 3. MVC Responsibilities

Each layer has **one job** — never mix responsibilities.

| Layer | Owns | Must NOT |
|---|---|---|
| `routes/` | Path + method mapping, attach middleware | Contain any logic |
| `controllers/` | Parse req, call service, send response | Query DB, write business rules |
| `services/` | Business logic, decisions, orchestration | Call `res`/`req`, write raw SQL |
| `models/` | Raw SQL / stored proc calls | Have conditional logic |
| `middlewares/` | Cross-cutting concerns (auth, errors) | Be domain-specific |

---

## 4. Code Patterns (MUST follow)

### 4.1 Routes — wiring only

```js
// routes/booking.routes.js
const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/booking.controller');

router.post('/',            auth, ctrl.create);
router.patch('/:id/cancel', auth, ctrl.cancel);

module.exports = router;
```

```js
// routes/index.js
const router = require('express').Router();
router.use('/bookings',  require('./booking.routes'));
router.use('/tours',     require('./tour.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/admin',     require('./admin.routes'));
module.exports = router;
```

```js
// app.js
app.use('/api', require('./routes'));
app.use(require('./middlewares/error.middleware')); // MUST be last
```

### 4.2 Controller — HTTP interface only

```js
// controllers/booking.controller.js — ✅ DO
const bookingService = require('../services/booking.service');
const { ok, created } = require('../utils/response');
const asyncHandler    = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const { tourId, quantity, paymentMethod, note } = req.body;
  const result = await bookingService.createBooking(
    req.user.id, tourId, quantity, paymentMethod, note
  );
  return created(res, result, 'Đặt tour thành công!');
});
```

```js
// ❌ DON'T — business logic or DB calls in controller
exports.create = async (req, res) => {
  const [rows] = await db.query('CALL sp_CreateBooking(...)'); // belongs in model
  if (rows[0].status === 0) { ... }                           // belongs in service
};
```

### 4.3 Service — business logic

```js
// services/booking.service.js — ✅ DO
const bookingModel = require('../models/booking.model');
const { AppError } = require('../utils/errors');
const logger       = require('../utils/logger');
const { ORDER_STATUS } = require('../config/constants');

async function createBooking(userId, tourId, quantity, paymentMethod, note) {
  const tour = await bookingModel.findTourById(tourId);
  if (!tour) throw new AppError('Tour không tồn tại', 404);
  if (tour.remainingSeats < quantity)
    throw new AppError('Không đủ chỗ trống', 400);

  const result = await bookingModel.createBooking(userId, tourId, quantity, paymentMethod, note);
  logger.info(`Booking created: orderId=${result.orderId}, userId=${userId}`);
  return result;
}

module.exports = { createBooking };
```

### 4.4 Model — data access only

```js
// models/booking.model.js — ✅ DO
const db = require('../config/db');

async function createBooking(userId, tourId, quantity, paymentMethod, note) {
  const [rows] = await db.query(
    'CALL sp_CreateBooking(?, ?, ?, ?, ?)',
    [userId, tourId, quantity, paymentMethod, note]
  );
  return rows[0];
}

async function findTourById(tourId) {
  const [rows] = await db.query(
    'SELECT * FROM Tour WHERE TourID = ? AND DeletedAt IS NULL', [tourId]
  );
  return rows[0] ?? null;
}

module.exports = { createBooking, findTourById };
```

```js
// ❌ DON'T — conditional logic in model
async function createBooking(userId, tourId, quantity) {
  if (quantity > 50) throw new Error('...'); // belongs in service
}
```

### 4.5 Shared utilities

```js
// utils/response.js
const ok      = (res, data, msg = 'Success')  => res.status(200).json({ success: true,  message: msg, data });
const created = (res, data, msg = 'Created')  => res.status(201).json({ success: true,  message: msg, data });
const fail    = (res, msg,  code = 400)       => res.status(code).json({ success: false, message: msg, data: null });
module.exports = { ok, created, fail };
```

```js
// utils/asyncHandler.js
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

```js
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode    = statusCode;
    this.isOperational = true;
  }
}
module.exports = { AppError };
```

```js
// middlewares/error.middleware.js
const { fail } = require('../utils/response');
const logger   = require('../utils/logger');

module.exports = (err, req, res, next) => {
  const status  = err.isOperational ? err.statusCode : 500;
  const message = err.isOperational ? err.message    : 'Internal Server Error';
  logger.error({ message: err.message, stack: err.stack, path: req.path });
  return fail(res, message, status);
};
```

```js
// config/constants.js
const ORDER_STATUS = { CANCELLED: 0, PENDING: 1, COMPLETED: 2 };
const TOUR_STATUS  = { HIDDEN: 0, ACTIVE: 1 };
module.exports = { ORDER_STATUS, TOUR_STATUS };
```

---

## 5. Anti-patterns (MUST NOT do)

| ❌ Anti-pattern | ✅ Fix |
|---|---|
| Raw SQL in `controllers/` or `services/` | Move to `models/` |
| Business rules in `models/` | Move to `services/` |
| `res.json({...})` with ad-hoc shape | Use `ok()` / `created()` / `fail()` |
| `process.env.*` used directly in files | Import from `config/index.js` |
| Async controller without `asyncHandler` | Wrap every async controller |
| Swallowed errors (`catch {}` with no `next`) | Always call `next(err)` |
| Magic numbers (`OrderStatus = 2`) | Use `ORDER_STATUS.COMPLETED` |

---

## 6. Git Workflow

**Branch naming:**
```
feat/<domain>/<short-description>    # feat/booking/cancel-order
fix/<domain>/<short-description>     # fix/tour/occupancy-rate
chore/<scope>                        # chore/db-migration-v2
```

**Commit message (Conventional Commits):**
```
feat(booking): add createBooking service + model
fix(tour): block soft-delete when pending orders exist
chore(db): add V2__add_soft_delete migration
refactor(auth): extract token logic to auth.service
```

**PR requirements:** 1 reviewer approval · CI green (lint + tests) · linked task/issue


