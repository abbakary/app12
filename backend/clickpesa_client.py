"""
ClickPesa API client for mobile money payment integration
Implements proper JWT authentication, token refresh, rate limiting with exponential backoff
and webhook verification as per ClickPesa API documentation.

Authentication Flow:
1. Exchange Client ID + API Key for JWT token (valid for 1 hour)
2. Use JWT in all API calls with Authorization: Bearer header
3. Auto-refresh JWT before expiry
4. Implement rate limiting (120 req/min per IP) with exponential backoff
5. Use HTTPS for all credentials transmission
"""
import httpx
import hmac
import hashlib
import json
import os
import asyncio
import time
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class ClickPesaClient:
    """ClickPesa mobile money payment client with JWT authentication"""

    # ClickPesa API endpoints
    AUTH_ENDPOINT = "/api/auth/oauth/token"
    PAYMENT_ENDPOINT = "/api/payment/initiate"
    PAYOUT_ENDPOINT = "/api/payment/payout"
    TRANSACTION_STATUS_ENDPOINT = "/api/transaction/status"

    # Rate limiting: 120 requests per minute per IP
    RATE_LIMIT = 120
    RATE_LIMIT_WINDOW = 60  # seconds

    def __init__(
        self,
        client_id: str = None,
        api_key: str = None,
        checksum_key: str = None,
        base_url: str = None,
        webhook_url: str = None,
    ):
        """
        Initialize ClickPesa client with proper authentication

        Args:
            client_id: ClickPesa Client ID (from app settings)
            api_key: ClickPesa API Key (shown only once during creation)
            checksum_key: HMAC SHA256 checksum key for webhook verification
            base_url: ClickPesa API base URL
            webhook_url: Your webhook URL for ClickPesa to send events
        """
        self.client_id = client_id or os.getenv("CLICKPESA_CLIENT_ID")
        self.api_key = api_key or os.getenv("CLICKPESA_API_KEY")
        self.checksum_key = checksum_key or os.getenv("CLICKPESA_CHECKSUM")
        self.base_url = base_url or os.getenv("CLICKPESA_BASE_URL", "https://api.clickpesa.com")
        self.webhook_url = webhook_url or os.getenv("CLICKPESA_WEBHOOK_URL")

        if not self.client_id:
            logger.warning("CLICKPESA_CLIENT_ID not set - JWT authentication will fail")
        if not self.api_key:
            logger.warning("CLICKPESA_API_KEY not set - JWT authentication will fail")
        if not self.checksum_key:
            logger.warning("CLICKPESA_CHECKSUM not set - webhook verification will fail")

        self.client = httpx.AsyncClient(timeout=30.0, verify=True)  # Always use HTTPS

        # JWT token management
        self._jwt_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self._token_lock = asyncio.Lock()

        # Rate limiting
        self._request_times: list = []

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

    async def _get_jwt_token(self) -> str:
        """
        Get a valid JWT token, refreshing if necessary.
        Uses a lock to prevent concurrent token refresh requests.

        Returns:
            Valid JWT token
        """
        async with self._token_lock:
            # Check if token is still valid (refresh 5 minutes before expiry)
            if self._jwt_token and self._token_expires_at:
                time_until_expiry = (self._token_expires_at - datetime.utcnow()).total_seconds()
                if time_until_expiry > 300:  # 5 minutes buffer
                    return self._jwt_token

            # Token is expired or doesn't exist - get a new one
            logger.info("Exchanging Client ID and API Key for JWT token")
            self._jwt_token = await self._exchange_credentials_for_jwt()
            # JWT is valid for 1 hour (3600 seconds) from the time of issuance
            self._token_expires_at = datetime.utcnow() + timedelta(hours=1)
            logger.info(f"JWT token obtained, valid until {self._token_expires_at}")

            return self._jwt_token

    async def _exchange_credentials_for_jwt(self) -> str:
        """
        Exchange Client ID and API Key for a short-lived JWT token.
        This is the OAuth token exchange flow as per ClickPesa documentation.

        Returns:
            JWT token string
        """
        try:
            url = f"{self.base_url}{self.AUTH_ENDPOINT}"

            # Prepare authentication request
            payload = {
                "client_id": self.client_id,
                "api_key": self.api_key,
                "grant_type": "client_credentials",
            }

            headers = {
                "Content-Type": "application/json",
            }

            logger.debug(f"Exchanging credentials at {url}")

            response = await self.client.post(url, json=payload, headers=headers)

            if response.status_code != 200:
                logger.error(f"JWT token exchange failed: {response.status_code} - {response.text}")
                raise Exception(f"Failed to exchange credentials: {response.text}")

            data = response.json()

            if not data.get("access_token"):
                logger.error(f"No access_token in response: {data}")
                raise Exception("No access token in response")

            logger.info("JWT token successfully obtained")
            return data["access_token"]

        except Exception as e:
            logger.error(f"Error exchanging credentials for JWT: {str(e)}")
            raise

    async def _apply_rate_limiting(self):
        """
        Apply rate limiting with exponential backoff.
        ClickPesa API rate limit: 120 requests per minute per IP address
        """
        now = time.time()

        # Remove request times older than the window
        self._request_times = [t for t in self._request_times if now - t < self.RATE_LIMIT_WINDOW]

        # Check if we're at the rate limit
        if len(self._request_times) >= self.RATE_LIMIT:
            # Calculate how long to wait
            oldest_request = self._request_times[0]
            wait_time = self.RATE_LIMIT_WINDOW - (now - oldest_request)

            if wait_time > 0:
                logger.warning(f"Rate limit approaching. Waiting {wait_time:.2f}s before next request")
                await asyncio.sleep(wait_time)

        # Record this request
        self._request_times.append(now)

    async def _make_api_call(
        self,
        method: str,
        endpoint: str,
        payload: Dict[str, Any] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """
        Make an API call to ClickPesa with automatic retry and exponential backoff.

        Args:
            method: HTTP method (POST, GET, etc.)
            endpoint: API endpoint path
            payload: Request payload
            max_retries: Maximum number of retry attempts

        Returns:
            Response data
        """
        url = f"{self.base_url}{endpoint}"
        jwt_token = await self._get_jwt_token()

        headers = {
            "Authorization": f"Bearer {jwt_token}",
            "Content-Type": "application/json",
        }

        for attempt in range(max_retries):
            try:
                # Apply rate limiting before making request
                await self._apply_rate_limiting()

                logger.debug(f"Making {method} request to {endpoint} (attempt {attempt + 1}/{max_retries})")

                if method.upper() == "POST":
                    response = await self.client.post(url, json=payload, headers=headers)
                elif method.upper() == "GET":
                    response = await self.client.get(url, headers=headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")

                # Handle rate limiting response (HTTP 429)
                if response.status_code == 429:
                    wait_time = (2 ** attempt) + (asyncio.get_event_loop().time() % 1)
                    logger.warning(
                        f"Rate limited on attempt {attempt + 1}. "
                        f"Waiting {wait_time:.2f}s before retry"
                    )
                    await asyncio.sleep(wait_time)
                    continue

                # Handle other errors
                if response.status_code >= 400:
                    logger.error(f"API error: {response.status_code} - {response.text}")
                    # If it's an auth error, try refreshing the token
                    if response.status_code == 401:
                        logger.warning("Received 401, refreshing JWT token")
                        self._jwt_token = None  # Force token refresh
                        if attempt < max_retries - 1:
                            continue
                    raise Exception(f"API error {response.status_code}: {response.text}")

                return response.json()

            except asyncio.TimeoutError:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                    logger.warning(f"Request timeout on attempt {attempt + 1}. Retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue
                raise

            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Request failed on attempt {attempt + 1}: {str(e)}. Retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue
                raise

        raise Exception(f"Failed after {max_retries} attempts")

    async def initiate_payment(
        self,
        amount: float,
        customer_phone: str,
        recipient_number: str,
        network: str,
        reference: str,
        callback_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Initiate a payment request with ClickPesa.
        Uses JWT token for authentication.

        Args:
            amount: Transaction amount in currency units
            customer_phone: Customer's mobile number
            recipient_number: Tenant's mobile number (to receive payment)
            network: Mobile network ('airtel', 'tigo', 'halotel')
            reference: Unique transaction reference (idempotency key)
            callback_url: Webhook URL for callbacks

        Returns:
            Dict with transaction details or error
        """
        try:
            callback_url = callback_url or self.webhook_url

            # Prepare payment request
            payload = {
                "amount": amount,
                "customer_phone": customer_phone,
                "recipient_number": recipient_number,
                "network": network.lower(),
                "reference": reference,  # Used for idempotency
                "callback_url": callback_url,
                "timestamp": datetime.utcnow().isoformat(),
            }

            logger.info(f"Initiating ClickPesa payment: {reference} - Amount: {amount}")

            response = await self._make_api_call(
                method="POST",
                endpoint=self.PAYMENT_ENDPOINT,
                payload=payload,
            )

            logger.info(f"ClickPesa payment initiated successfully: {reference}")
            return {
                "success": True,
                "transaction_id": response.get("transaction_id"),
                "reference": reference,
                "status": response.get("status", "initiated"),
                "amount": amount,
                "network": network,
            }

        except Exception as e:
            logger.error(f"Error initiating payment: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    def verify_webhook_checksum(self, payload: str, provided_checksum: str) -> bool:
        """
        Verify webhook signature using HMAC SHA256.
        Prevents tampering and ensures the webhook came from ClickPesa.

        Args:
            payload: The webhook payload as JSON string
            provided_checksum: The checksum from webhook header (X-Checksum)

        Returns:
            True if checksum is valid, False otherwise
        """
        if not self.checksum_key:
            logger.error("Checksum key not configured - cannot verify webhooks")
            return False

        try:
            # Create HMAC SHA256 hash
            calculated_checksum = hmac.new(
                self.checksum_key.encode(),
                payload.encode() if isinstance(payload, str) else payload,
                hashlib.sha256,
            ).hexdigest()

            # Constant-time comparison to prevent timing attacks
            is_valid = hmac.compare_digest(calculated_checksum, provided_checksum)

            if not is_valid:
                logger.warning(
                    f"Invalid webhook checksum. Expected: {calculated_checksum}, "
                    f"Received: {provided_checksum}"
                )

            return is_valid

        except Exception as e:
            logger.error(f"Error verifying checksum: {str(e)}")
            return False

    def parse_webhook_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse and validate webhook event from ClickPesa

        Args:
            data: Webhook payload

        Returns:
            Parsed event data
        """
        return {
            "event": data.get("event"),
            "transaction_id": data.get("transaction_id"),
            "reference": data.get("reference"),
            "amount": data.get("amount"),
            "network": data.get("network"),
            "status": data.get("status"),
            "timestamp": data.get("timestamp"),
            "recipient_number": data.get("recipient_number"),
            "customer_number": data.get("customer_number"),
        }

    async def process_payout(
        self,
        recipient_number: str,
        amount: float,
        reference: str,
    ) -> Dict[str, Any]:
        """
        Process payout to admin account or tenant.
        Uses JWT token for authentication.

        Args:
            recipient_number: Recipient mobile number
            amount: Payout amount
            reference: Unique reference for payout (idempotency key)

        Returns:
            Payout response
        """
        try:
            payload = {
                "recipient_number": recipient_number,
                "amount": amount,
                "reference": reference,
                "timestamp": datetime.utcnow().isoformat(),
            }

            logger.info(f"Processing payout: {reference} - Amount: {amount}")

            response = await self._make_api_call(
                method="POST",
                endpoint=self.PAYOUT_ENDPOINT,
                payload=payload,
            )

            logger.info(f"Payout initiated successfully: {reference}")
            return {
                "success": True,
                "payout_id": response.get("payout_id"),
                "reference": reference,
                "amount": amount,
                "status": response.get("status", "initiated"),
            }

        except Exception as e:
            logger.error(f"Error processing payout: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    async def get_transaction_status(
        self,
        reference: str,
    ) -> Dict[str, Any]:
        """
        Get the status of a transaction by reference.
        Uses JWT token for authentication.

        Args:
            reference: Transaction reference

        Returns:
            Transaction status data
        """
        try:
            logger.debug(f"Checking transaction status: {reference}")

            # Query params
            url = f"{self.TRANSACTION_STATUS_ENDPOINT}?reference={reference}"

            response = await self._make_api_call(
                method="GET",
                endpoint=url,
            )

            return {
                "success": True,
                "reference": reference,
                "status": response.get("status"),
                "amount": response.get("amount"),
                "network": response.get("network"),
                "transaction_id": response.get("transaction_id"),
            }

        except Exception as e:
            logger.error(f"Error getting transaction status: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }


# Global instance
clickpesa_client = ClickPesaClient()
