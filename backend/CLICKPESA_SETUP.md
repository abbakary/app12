# ClickPesa Payment Integration - Setup Guide

This guide walks you through setting up ClickPesa mobile money payment integration for your multi-tenant SaaS platform.

## Quick Start

### 1. Get ClickPesa Credentials (5 minutes)

1. **Create Account**: Go to https://clickpesa.com and sign up
2. **Complete KYC**: Business verification (can take 1-24 hours)
3. **Create Application**: 
   - Go to Dashboard → Applications
   - Click "Create Application"
   - Fill in application name
   - Accept terms
4. **Copy Credentials**:
   - Client ID (always visible)
   - API Key (save immediately, shown only once!)
   - Checksum Key (for webhook verification)

### 2. Configure Environment

Create `.env` file in `backend/` directory:

```bash
# ClickPesa Authentication
CLICKPESA_CLIENT_ID=your_client_id_from_dashboard
CLICKPESA_API_KEY=your_api_key_from_dashboard
CLICKPESA_CHECKSUM=your_checksum_key_from_dashboard
CLICKPESA_BASE_URL=https://api.clickpesa.com
CLICKPESA_WEBHOOK_URL=https://yourdomain.com/api/payments/clickpesa/webhook

# Other required vars
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### 3. Start Backend

```bash
# Backend directory
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**You should see in logs:**
```
============================================================
ClickPesa Payment Integration Configuration
============================================================
✓ CLICKPESA_CLIENT_ID is configured
✓ CLICKPESA_API_KEY is configured
✓ CLICKPESA_CHECKSUM is configured
✓ CLICKPESA_WEBHOOK_URL is set to: https://...
✓ Webhook URL uses HTTPS (secure)
============================================================
ClickPesa Configuration Status: OK
============================================================

Features enabled:
  • JWT Token Authentication (1 hour validity)
  • Automatic Token Refresh (5 min buffer)
  • Rate Limiting (120 req/min per IP)
  • Exponential Backoff Retry (max 3 attempts)
  • Webhook Signature Verification (HMAC SHA256)
  • Multi-network Support (Airtel, Tigo, Halotel)
```

## Architecture Overview

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│ Your Application                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 1. Initiate Payment
                     ▼
         ┌───────────────────────┐
         │ ClickPesa Client      │
         │ - Manages JWT Token   │
         │ - Handles Rate Limits │
         │ - Retries with Backoff
         └───────────┬───────────┘
                     │
         ┌───────────┴──────────────┐
         │                          │
    ┌────▼──────┐         ┌────────▼─────┐
    │ Database  │         │ ClickPesa    │
    │ - Stores  │         │ API          │
    │ Txn Records
    │           │         │ - Process    │
    │ - Fee Logs│         │   Payments   │
    │           │         │ - Track      │
    └───────────┘         │   Status     │
                          └────┬─────────┘
                               │
                               │ 3. Webhook Event
                               ▼
                          POST /webhook
                               │
                               ▼
                        Update Transaction
                        Create Fee Log
```

### JWT Token Flow

```
Startup
  │
  ├─ Check if JWT exists and valid
  │
  └─ If needed: Exchange Credentials
       │
       ├─ POST /api/auth/oauth/token
       │   {
       │     client_id: "...",
       │     api_key: "...",
       │     grant_type: "client_credentials"
       │   }
       │
       └─ Get JWT Token (valid 1 hour)
          │
          └─ Cache Token + Expiry Time
             │
             └─ Use in All API Calls
                Authorization: Bearer {JWT}

Every Request
  │
  ├─ If JWT expires in < 5 minutes
  │   └─ Refresh Token
  │
  └─ Make API Call with JWT Token
```

### Rate Limiting Flow

```
Request Queue
  │
  ├─ Track request timestamps (last 60 seconds)
  │
  ├─ If >= 120 requests in window
  │   └─ Wait until oldest request leaves window
  │
  └─ Send request
       │
       ├─ If HTTP 429 (Rate Limited)
       │   └─ Wait (2^attempt seconds)
       │   └─ Retry
       │
       └─ Success ✓
```

## API Endpoints

### 1. Initiate Payment

**Endpoint:**
```
POST /api/payments/clickpesa/initiate
Content-Type: application/json

{
  "amount": 50000,
  "network": "airtel",
  "customer_phone": "+256700123456",
  "tenant_id": "restaurant-uuid",
  "order_reference": "ORDER-12345",
  "metadata": {
    "customer_name": "John Doe",
    "order_id": "12345"
  }
}
```

**Response:**
```json
{
  "id": "txn-uuid",
  "reference": "clickpesa_abc123def456",
  "amount": 50000,
  "admin_fee": 5000,
  "tenant_amount": 45000,
  "network": "airtel",
  "customer_phone": "+256700123456",
  "status": "processing",
  "payment_status": "initiated",
  "payout_status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### 2. Check Transaction Status

**Endpoint:**
```
GET /api/payments/clickpesa/transactions/status/{reference}
```

**Example:**
```bash
curl http://localhost:8000/api/payments/clickpesa/transactions/status/clickpesa_abc123def456
```

**Response:**
```json
{
  "id": "txn-uuid",
  "reference": "clickpesa_abc123def456",
  "amount": 50000,
  "status": "received",
  "payment_status": "confirmed",
  "payout_status": "initiated",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z"
}
```

### 3. List Tenant Transactions

**Endpoint:**
```
GET /api/payments/clickpesa/transactions/{tenant_id}?skip=0&limit=100
```

**Response:**
```json
[
  {
    "id": "txn-uuid-1",
    "reference": "clickpesa_abc123def456",
    "amount": 50000,
    "status": "received",
    ...
  },
  ...
]
```

### 4. Get Tenant Dashboard Stats

**Endpoint:**
```
GET /api/payments/clickpesa/dashboard/{tenant_id}
```

**Response:**
```json
{
  "total_revenue": 450000,
  "total_admin_fees": 50000,
  "transactions_count": 10,
  "pending_count": 2,
  "successful_count": 7,
  "failed_count": 1
}
```

## Testing

### Local Testing (Development)

Without ClickPesa credentials, the system uses mock responses:

```python
# Mock payment response
{
  "success": True,
  "transaction_id": "mock_txn_123",
  "reference": "clickpesa_abc123",
  "status": "initiated",
  "amount": 50000
}
```

### Testing with Real Credentials

1. **Get Test Credentials** from ClickPesa Dashboard (Sandbox mode if available)
2. **Set Environment Variables** in `.env`
3. **Initiate Test Payment**:

```bash
curl -X POST http://localhost:8000/api/payments/clickpesa/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "network": "airtel",
    "customer_phone": "+256700123456",
    "tenant_id": "your-tenant-uuid",
    "order_reference": "TEST-001"
  }'
```

4. **Receive Webhook** (configure ClickPesa dashboard):
   - Webhook URL: `https://yourdomain.com/api/payments/clickpesa/webhook`
   - Checksum Key: Your `CLICKPESA_CHECKSUM` value

5. **Check Transaction Status**:

```bash
curl http://localhost:8000/api/payments/clickpesa/transactions/status/clickpesa_abc123
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] ClickPesa Business Account verified (KYC complete)
- [ ] Production API credentials obtained
- [ ] `.env` configured with production credentials
- [ ] `NODE_ENV=production` set in environment
- [ ] HTTPS configured on domain
- [ ] Webhook URL points to HTTPS endpoint
- [ ] Database backed up
- [ ] Rate limiting monitoring in place
- [ ] Error logging configured
- [ ] Webhook retry logic tested

### Deployment Steps

1. **Update .env on Production Server**
```bash
export CLICKPESA_CLIENT_ID=prod_client_id
export CLICKPESA_API_KEY=prod_api_key
export CLICKPESA_CHECKSUM=prod_checksum
export CLICKPESA_WEBHOOK_URL=https://yourdomain.com/api/payments/clickpesa/webhook
export NODE_ENV=production
```

2. **Restart Backend**
```bash
# Kubernetes
kubectl restart deployment/backend

# Docker Compose
docker-compose restart backend

# Direct
systemctl restart restauflow-backend
```

3. **Verify Startup Logs**
```bash
# Should see:
# ✓ CLICKPESA_CLIENT_ID is configured
# ✓ CLICKPESA_API_KEY is configured
# ✓ CLICKPESA_CHECKSUM is configured
# ✓ ClickPesa Configuration Status: OK
```

4. **Test Payment Flow**
- Initiate small test transaction
- Monitor webhook delivery
- Verify transaction in ClickPesa dashboard
- Check admin dashboard stats

## Monitoring and Debugging

### Logs to Watch

```python
# Successful JWT exchange
2024-01-15 10:30:00 - INFO - Exchanging Client ID and API Key for JWT token
2024-01-15 10:30:01 - INFO - JWT token obtained, valid until 2024-01-15 11:30:00

# Successful payment
2024-01-15 10:31:00 - INFO - Initiating ClickPesa payment: clickpesa_abc123def456 - Amount: 50000
2024-01-15 10:31:01 - INFO - ClickPesa payment initiated successfully: clickpesa_abc123def456

# Rate limiting
2024-01-15 10:32:00 - WARNING - Rate limit approaching. Waiting 2.5s before next request

# Token refresh
2024-01-15 11:25:00 - WARNING - Received 401, refreshing JWT token
2024-01-15 11:25:01 - INFO - JWT token obtained, valid until 2024-01-15 12:25:00
```

### Common Issues

**Issue: "CLICKPESA_CLIENT_ID not set"**
- Check `.env` file exists in `backend/` directory
- Verify variable name is exactly `CLICKPESA_CLIENT_ID`
- Restart backend after changing `.env`

**Issue: "Invalid checksum" in webhook**
- Ensure `CLICKPESA_CHECKSUM` matches ClickPesa dashboard
- Verify checksum key is correct
- Check webhook payload isn't modified in transit

**Issue: "Rate limited" errors**
- Normal behavior - automatic retry happens
- If frequent, consider batching requests
- Check for request loops in your code

**Issue: "JWT token expired"**
- Automatic refresh happens (should not affect API calls)
- Check logs for "JWT token obtained"
- Verify system clock is accurate

## Troubleshooting

### Debug Mode

Enable debug logging:

```python
# In main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Test JWT Exchange

```python
from clickpesa_client import clickpesa_client
import asyncio

async def test():
    token = await clickpesa_client._get_jwt_token()
    print(f"Token: {token[:50]}...")
    print(f"Expires at: {clickpesa_client._token_expires_at}")

asyncio.run(test())
```

### Test Webhook Signature

```python
import hmac
import hashlib

def test_checksum():
    payload = '{"event":"payment_received","reference":"test"}'
    checksum_key = "your_checksum_key"
    
    calculated = hmac.new(
        checksum_key.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    print(f"Calculated: {calculated}")
```

## Support

- **ClickPesa Docs**: https://docs.clickpesa.com
- **ClickPesa Support**: support@clickpesa.com
- **Implementation Issues**: Check logs in `backend/logs/`

## References

- [ClickPesa Authentication Flow](https://docs.clickpesa.com/authentication)
- [ClickPesa Payment API](https://docs.clickpesa.com/api/payment)
- [ClickPesa Rate Limits](https://docs.clickpesa.com/rate-limits)
- [ClickPesa Webhooks](https://docs.clickpesa.com/webhooks)
