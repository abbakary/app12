# ClickPesa Mobile Money Payment Integration

This document describes the implementation of ClickPesa mobile money payment integration for the multi-tenant SaaS platform.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication Flow](#authentication-flow)
4. [API Implementation Details](#api-implementation-details)
5. [Rate Limiting & Retry Logic](#rate-limiting--retry-logic)
6. [Security Considerations](#security-considerations)
7. [Webhook Handling](#webhook-handling)
8. [Error Handling](#error-handling)

## Overview

ClickPesa provides mobile money payment processing for:
- **Payment Collection**: Accept payments from customers via mobile money networks
- **Payout Processing**: Send payments to tenant/organization accounts
- **Multi-Network Support**: Airtel, Tigo, Halotel networks
- **Webhook Notifications**: Real-time event updates

### Key Features Implemented

- ✅ JWT Token Authentication (Client ID + API Key exchange)
- ✅ Automatic Token Refresh (valid for 1 hour)
- ✅ Rate Limiting with Exponential Backoff (120 req/min)
- ✅ Webhook Signature Verification (HMAC SHA256)
- ✅ Transaction Tracking
- ✅ Admin Fee Calculation
- ✅ Payout Management

## Getting Started

### 1. Create a ClickPesa Account

1. Go to https://clickpesa.com
2. Sign up for a business account
3. Complete KYC verification
4. Navigate to Dashboard → Applications
5. Create a new application

### 2. Get Your Credentials

After creating an application, you'll receive:

- **Client ID**: Displayed in app settings (accessible anytime)
- **API Key**: Shown ONLY once during creation (save securely!)
- **Checksum Key**: For webhook signature verification

⚠️ **Important**: Save your API Key immediately. It's displayed only once.

### 3. Configure Environment Variables

Copy your credentials to `.env` file:

```bash
# ClickPesa Authentication
CLICKPESA_CLIENT_ID=your_client_id_here
CLICKPESA_API_KEY=your_api_key_here
CLICKPESA_CHECKSUM=your_checksum_key_here
CLICKPESA_BASE_URL=https://api.clickpesa.com
CLICKPESA_WEBHOOK_URL=https://yourdomain.com/api/payments/clickpesa/webhook
```

### 4. Never Hardcode Credentials

❌ **DO NOT** hardcode credentials in code:
```python
# BAD - Never do this!
client = ClickPesaClient(api_key="hardcoded_key")
```

✅ **DO** use environment variables:
```python
# GOOD - Use environment variables
client = ClickPesaClient()  # Reads from env
```

## Authentication Flow

### OAuth Token Exchange

The ClickPesa API uses a two-step authentication process:

#### Step 1: Exchange Credentials for JWT Token

**Request:**
```
POST https://api.clickpesa.com/api/auth/oauth/token
Content-Type: application/json

{
  "client_id": "YOUR_CLIENT_ID",
  "api_key": "YOUR_API_KEY",
  "grant_type": "client_credentials"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Token Validity**: 1 hour (3600 seconds) from issuance

#### Step 2: Use JWT Token in API Calls

**All subsequent requests must include:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh Strategy

The implementation automatically:

1. **Caches JWT token** after obtaining it
2. **Tracks token expiry** (issued_at + 3600 seconds)
3. **Refreshes before expiry** (5-minute buffer before 1-hour mark)
4. **Handles 401 responses** by refreshing token and retrying
5. **Uses async locks** to prevent concurrent refresh requests

```python
# Automatic refresh happens transparently
token = await client._get_jwt_token()  # Gets fresh or cached token
```

## API Implementation Details

### 1. Payment Initiation

**Endpoint**: `POST /api/payments/clickpesa/initiate`

**Request:**
```json
{
  "amount": 50000,
  "network": "airtel",
  "customer_phone": "+256700123456",
  "tenant_id": "restaurant-uuid-here",
  "order_reference": "ORDER-12345",
  "metadata": {
    "order_id": "12345",
    "customer_name": "John Doe"
  }
}
```

**Internal Flow:**
1. Validate tenant and payment details
2. Calculate admin fee (10% default)
3. Create transaction record in database
4. Exchange credentials for JWT token (if needed)
5. Call ClickPesa payment API with JWT
6. Store transaction ID from response
7. Return transaction to client

**Response:**
```json
{
  "id": "transaction-uuid",
  "reference": "clickpesa_abc123def456",
  "amount": 50000,
  "admin_fee": 5000,
  "tenant_amount": 45000,
  "status": "processing",
  "payment_status": "initiated",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### 2. Transaction Status

**Endpoint**: `GET /api/payments/clickpesa/transactions/status/{reference}`

**Implementation:**
```python
response = await clickpesa_client.get_transaction_status(reference="clickpesa_abc123")
```

**Returns current status** from ClickPesa database.

### 3. Payout Processing

**Internal Process:**
```python
# After payment_received webhook
payout = await clickpesa_client.process_payout(
    recipient_number="+256700123456",  # Tenant's mobile
    amount=45000,  # Tenant's portion (after fees)
    reference="payout_xyz789"
)
```

## Rate Limiting & Retry Logic

### API Rate Limits

ClickPesa enforces:
- **120 requests per minute** per IP address
- **Distributed across all endpoints**
- **HTTP 429** response when exceeded

### Implementation Strategy

#### 1. Request Tracking
```python
# Tracks last 60 seconds of requests
self._request_times = [t for t in self._request_times if now - t < 60]

# Check if at rate limit
if len(self._request_times) >= 120:
    wait_time = 60 - (now - oldest_request)
    await asyncio.sleep(wait_time)
```

#### 2. Exponential Backoff for Retries

When a request fails, retry with exponential backoff:
```
Attempt 1: Retry after 2^0 = 1 second
Attempt 2: Retry after 2^1 = 2 seconds
Attempt 3: Retry after 2^2 = 4 seconds
```

#### 3. Handling HTTP 429 Responses

```python
if response.status_code == 429:
    wait_time = (2 ** attempt)
    logger.warning(f"Rate limited. Waiting {wait_time}s before retry")
    await asyncio.sleep(wait_time)
    continue
```

#### 4. Max Retries
- Default: 3 attempts per request
- Includes initial attempt + 2 retries

### Example: Automatic Retry Flow

```
Request 1: Succeeds ✅
  └─ Returns immediately

Request 2: Rate limited (429) ❌
  └─ Wait 1 second
  └─ Retry
  └─ Succeeds ✅

Request 3: Timeout ❌
  └─ Wait 2 seconds
  └─ Retry
  └─ Token expired (401) ❌
  └─ Refresh token
  └─ Retry
  └─ Succeeds ✅
```

## Security Considerations

### 1. Credential Storage

✅ **DO:**
- Store credentials in environment variables
- Use HTTPS for all API calls
- Rotate API keys periodically
- Restrict database access

❌ **DON'T:**
- Hardcode credentials in code
- Log sensitive data
- Send credentials in URLs
- Share API keys via email

### 2. Token Transmission

All API calls use HTTPS:
```python
self.client = httpx.AsyncClient(timeout=30.0, verify=True)  # SSL verification enabled
```

### 3. Webhook Verification

All incoming webhooks must have valid signature:
```python
checksum = request.headers.get("X-Checksum")
if not clickpesa_client.verify_webhook_checksum(body, checksum):
    return HTTPException(status_code=401, detail="Invalid checksum")
```

Uses HMAC SHA256 with constant-time comparison to prevent timing attacks.

### 4. Rate Limiting as Security

Rate limits prevent:
- Brute force attacks
- Information enumeration
- Denial of service attempts

### 5. Idempotency

Each transaction includes a unique `reference`:
```python
reference = f"clickpesa_{uuid.uuid4().hex[:16]}"
```

This prevents duplicate charges if the same request is sent twice.

## Webhook Handling

### Supported Events

| Event | Status Update | Action |
|-------|---------------|--------|
| `payment_received` | Status: `received` | Create admin fee log |
| `payment_failed` | Status: `failed` | Log failure |
| `payout_initiated` | Payout: `initiated` | Track progress |
| `payout_completed` | Payout: `completed` | Record completion |
| `payout_failed` | Payout: `failed` | Log failure |
| `payout_reversed` | Payout: `reversed` | Handle reversal |

### Webhook Flow

**1. ClickPesa sends webhook to your endpoint**
```
POST https://yourdomain.com/api/payments/clickpesa/webhook
X-Checksum: <checksum>
Content-Type: application/json

{
  "event": "payment_received",
  "transaction_id": "txn_abc123",
  "reference": "clickpesa_abc123def456",
  "amount": 50000,
  "status": "confirmed"
}
```

**2. Verify signature**
```python
checksum = request.headers.get("X-Checksum")
if not verify_webhook_checksum(body, checksum):
    return 401 Unauthorized
```

**3. Find transaction in database**
```python
transaction = db.query(ClickPesaTransaction).filter(
    ClickPesaTransaction.reference == reference
).first()
```

**4. Update status based on event**
```python
if event == "payment_received":
    transaction.status = "received"
    transaction.payment_status = "confirmed"
    # Create admin fee log
```

**5. Return 200 OK immediately**
```python
return {"status": "processed"}
```

### Webhook Idempotency

Prevents duplicate processing:
```python
if transaction.webhook_processed_at:
    return {"status": "already_processed"}
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid credentials (401) | Client ID or API Key incorrect | Check `.env` file |
| Token expired (401) | JWT older than 1 hour | Auto-refreshed, no action needed |
| Rate limited (429) | Exceeded 120 req/min | Wait 1 minute or retry with backoff |
| Invalid phone number | Format error | Use +256XXXXXXXXX format |
| Insufficient balance | Account lacks funds | Check ClickPesa account balance |
| Network timeout | Connection issue | Retried automatically |

### Retry Logic

```python
async def _make_api_call(self, method, endpoint, payload, max_retries=3):
    for attempt in range(max_retries):
        try:
            # Make request
            response = await self.client.post(url, json=payload)
            
            if response.status_code == 429:  # Rate limited
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            
            if response.status_code == 401:  # Unauthorized (expired token)
                self._jwt_token = None  # Force refresh
                continue
            
            if response.status_code >= 400:
                raise Exception(f"API error: {response.status_code}")
            
            return response.json()  # Success!
            
        except asyncio.TimeoutError:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
                continue
            raise
```

## Testing

### Local Testing with Mock Responses

When `CLICKPESA_API_KEY` is not set (development), mock responses are returned:

```python
if not self.api_key:
    # Return mock response for testing
    return {"success": True, "transaction_id": "mock_123"}
```

### Production Setup Checklist

- [ ] Set `CLICKPESA_CLIENT_ID` in production environment
- [ ] Set `CLICKPESA_API_KEY` in production environment
- [ ] Set `CLICKPESA_CHECKSUM` for webhook verification
- [ ] Set `CLICKPESA_WEBHOOK_URL` to your domain
- [ ] Configure HTTPS SSL certificate
- [ ] Test payment flow with small amount
- [ ] Monitor logs for rate limiting
- [ ] Set up monitoring/alerting for failed transactions
- [ ] Document token refresh behavior
- [ ] Create runbook for credential rotation

## References

- ClickPesa Dashboard: https://dashboard.clickpesa.com
- ClickPesa API Documentation: https://docs.clickpesa.com
- Rate Limiting: 120 requests per minute per IP
- JWT Token Validity: 1 hour (3600 seconds)
- Retry Strategy: Exponential backoff with max 3 attempts
