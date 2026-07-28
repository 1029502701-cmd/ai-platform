# Billing, Membership & Commercialization Platform (Task-Platform-015)

## 1. Architecture Overview

The unified billing system provides a complete commercialization layer for the AI platform. All credit operations, purchases, subscriptions, and refunds flow through a single centralized service.

```
Frontend / Admin UI
    │
    ▼
API Gateway
    │
    ├── /api/billing/*          (Public billing APIs)
    ├── /api/orders/*           (Order creation & listing)
    ├── /api/payment/*          (Payment processing)
    ├── /api/user/billing       (User billing info)
    └── /api/admin/billing/*    (Admin management)
    │
    ▼
BillingService (shared/billing/)
    │
    ├── consume()         — Deduct credits
    ├── refund()          — Refund credits
    ├── grantQuota()      — Add credits
    ├── checkQuota()      — Check balance + limits
    ├── createOrder()     — Create purchase order
    ├── confirmPayment()  — Confirm payment
    └── getUserBillingInfo() — Full user billing summary
    │
    ▼
Database (D1)
    ├── wallets              — User balances
    ├── billing_products     — Product catalog
    ├── user_subscriptions   — Active plans
    ├── billing_orders       — Purchase orders
    ├── billing_transactions — Audit trail
    └── billing_rules        — Pricing rules
```

## 2. Database Schema

### billing_products
Product catalog for plans, API packages, image packages.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| code | TEXT UNIQUE | Product code (e.g., "plan_monthly_pro") |
| name | TEXT | Display name |
| description | TEXT | Product description |
| product_type | TEXT | plan | api_package | image_package | custom |
| price_cents | INTEGER | Price in cents (e.g., 9900 = $99.00) |
| currency | TEXT | Default CNY |
| credits_amount | INTEGER | Credits granted on purchase |
| features | TEXT | JSON features list |
| status | TEXT | active | inactive |
| sort_order | INTEGER | Display order |
| created_at | DATETIME | Auto-set |
| updated_at | DATETIME | Auto-set |

### user_subscriptions
Active user subscription records.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| user_id | INTEGER | References users |
| product_id | INTEGER | References billing_products |
| plan_code | TEXT | Human-readable plan name |
| status | TEXT | active | expired | cancelled | trial | pending |
| start_at | DATETIME | Subscription start |
| expire_at | DATETIME | Expiration date |
| auto_renew | INTEGER | 0 or 1 |
| payment_provider | TEXT | wechat | alipay | stripe | manual |
| payment_ref | TEXT | External payment reference |
| created_at | DATETIME | Auto-set |
| updated_at | DATETIME | Auto-set |

### billing_orders
Purchase order tracking.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| order_no | TEXT UNIQUE | Generated order number |
| user_id | INTEGER | Purchasing user |
| product_id | INTEGER | Purchased product |
| amount_cents | INTEGER | Order total |
| currency | TEXT | Currency code |
| status | TEXT | pending | paid | failed | cancelled | refunded |
| payment_provider | TEXT | Payment gateway used |
| payment_ref | TEXT | Gateway transaction ref |
| paid_at | DATETIME | Payment confirmation time |
| cancelled_at | DATETIME | Cancellation time |
| refunded_at | DATETIME | Refund time |
| created_at | DATETIME | Auto-set |

### billing_transactions
Complete audit trail of every credit change.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| user_id | INTEGER | Affected user |
| order_id | INTEGER | Related order |
| subscription_id | INTEGER | Related subscription |
| tx_type | TEXT | consume | refund | grant | purchase | bonus |
| amount_cents | INTEGER | Amount changed (positive=negative for consume) |
| balance_before | INTEGER | Balance before operation |
| balance_after | INTEGER | Balance after operation |
| reason | TEXT | Human-readable reason |
| metadata | TEXT | JSON metadata |
| created_at | DATETIME | Auto-set |

### billing_rules
Model/service pricing configuration.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| rule_key | TEXT UNIQUE | Rule identifier (e.g., gpt4omini) |
| service_type | TEXT | ai | image | agent | knowledge |
| target | TEXT | Model name or "all" |
| cost_per_1m_input | INTEGER | Cost per million input tokens |
| cost_per_1m_output | INTEGER | Cost per million output tokens |
| credits_per_1m_input | INTEGER | Credit cost per 1m input |
| credits_per_1m_output | INTEGER | Credit cost per 1m output |
| image_cost_cents | INTEGER | Fixed cost per image generation |
| agent_cost_cents | INTEGER | Fixed cost per agent execution |
| knowledge_cost_cents | INTEGER | Knowledge search cost |
| enabled | INTEGER | 0 or 1 |
| created_at | DATETIME | Auto-set |

## 3. Data Flow

### Purchase Flow
```
User selects product
  → POST /api/orders (createOrder)
  → Order created with status=pending
  → POST /api/payment/create (initiate payment)
  → Payment provider QR/URL returned to frontend
  → User completes payment
  → POST /api/payment/callback (webhook)
  → BillingService.confirmPayment() → status=paid
  → billing_transactions inserted (type=purchase)
  → Wallet credits updated
```

### AI Consumption Flow
```
AI request arrives
  → BillingMiddleware.beforeAIRequest()
    - Calculate estimated cost
    - Check wallet balance
    - Pre-consume credits (atomic update)
  → AI Core generates response
  → BillingMiddleware.afterAIResponse()
    - Log actual usage to AI usage table
    - Record in billing_transactions
  → If AI fails:
    - BillingMiddleware.onFailure()
    - Refund pre-committed credits
```

### Refund Flow
```
Admin or system initiates refund
  → BillingService.refund() called
  → Wallet credits restored (atomic)
  → billing_transactions inserted (type=refund)
  → If tied to order: order status = refunded
```

### Subscription Renewal Flow
```
Cron worker runs daily at midnight UTC
  → Expire subscriptions past their expire_at
  → For auto_renew=1 subscriptions:
    - Extend expire_at by +30 days
    - Log billing_transaction (type=grant, reason=subscription_auto_renew)
```

## 4. API Reference

### Public APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/billing/products | None | List active products |
| POST | /api/billing/subscription | User | Get user subscriptions |
| GET | /api/billing/quota | User | Get quota info |
| GET | /api/billing/transactions | User | Get user transactions |
| POST | /api/orders | User | Create purchase order |
| GET | /api/orders/list | User | List user orders |
| POST | /api/payment/create | User | Initiate payment |
| POST | /api/payment/callback | None | Payment webhook |
| POST | /api/payment/refund | Admin | Admin refund |

### User APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/user/billing | User | Full billing summary |
| GET | /api/user/quota | User | Current quota |
| GET | /api/user/usage | User | Usage history |

### Admin APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/admin/billing/revenue | Admin | Revenue statistics |
| GET | /api/admin/billing/products | Admin | Product catalog |
| POST | /api/admin/billing/products | Admin | Create product |
| GET | /api/admin/billing/orders | Admin | Order listing (paginated) |
| GET | /api/admin/billing/orders/:id | Admin | Order detail |
| GET | /api/admin/billing/plans | Admin | Plan management |
| POST | /api/admin/billing/recharge | Admin | Manual credit recharge |
| GET | /api/admin/billing/pricing-rules | Admin | View pricing rules |

## 5. Security Measures

### Idempotency
- Order creation uses idempotency keys based on user_id + product_code + timestamp
- Duplicate requests return the existing order instead of creating new ones
- Transaction-level protection prevents double-charging

### Atomic Operations
- All credit changes happen within database transactions
- Balance checks and updates are atomic (SQL UPDATE with conditions)
- Failed operations trigger automatic rollback

### Access Control
- All billing mutations require authentication
- Payment callbacks verify signatures
- Admin endpoints require admin role
- Users can only access their own data

### Error Handling
- Insufficient balance returns clear error without exposing internal state
- Payment failures log but don't block subsequent attempts
- Database errors fall back safely without hanging requests

## 6. Pricing Models Supported

### Credits Mode
- Pay-per-use: each AI call deducts credits based on model pricing rules
- Configurable via billing_rules table

### Balance Mode
- Prepaid wallet: users purchase credits, spend as needed
- Supported via wallets table with atomic balance management

### Subscription Mode
- Monthly plans with automatic renewal
- Different tiers grant different quotas
- Managed via user_subscriptions + billing_products

## 7. Migration Files

| Migration | Purpose |
|-----------|---------|
| `0029_billing_platform.sql` | Products, orders, subscriptions, transactions, rules |
| `0030_billing_indexes.sql` | Performance indexes for billing tables |

## 8. Environment Variables Required

```env
WECHAT_PAY_APP_ID=        # WeChat Pay merchant app ID
WECHAT_PAY_MCH_ID=        # WeChat Pay merchant ID
WECHAT_PAY_API_KEY=       # WeChat Pay API key
STRIPE_SECRET_KEY=        # Stripe secret key (for international users)
BILLING_WEBHOOK_SECRET=   # Webhook signature verification secret
```

All secrets must be set in Cloudflare Pages environment variables — never hard-coded.

## 9. Future Integrations

- **WeChat Pay**: Implement `WeChatPayProvider.createPayment()` with actual SDK
- **Alipay**: Replace `ManualProvider` placeholder with Alipay SDK
- **Stripe**: Replace `StripeProvider` placeholder with Stripe.js integration
- **Auto-billing cycle**: Monthly/annual billing cycles with proration
- **Coupons**: Promo codes and discount logic
- **Tax**: Multi-region tax calculation