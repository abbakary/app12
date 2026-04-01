from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
import logging

load_dotenv()

import models
from database import engine
from websocket_manager import manager
from clickpesa_startup import initialize_clickpesa_client, shutdown_clickpesa_client

from routers import auth, orders, tables, menu, payments, stats, notifications, seed, restaurants, platform, drivers, uploads, users, analytics, customers, messaging, clickpesa_payments

logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="RestauFlow Backend API")

# Create static directory if it doesn't exist
static_dir = os.path.join(os.path.dirname(__file__), "static")
uploads_dir = os.path.join(static_dir, "uploads")
logos_dir = os.path.join(uploads_dir, "logos")
images_dir = os.path.join(uploads_dir, "images")
os.makedirs(logos_dir, exist_ok=True)
os.makedirs(images_dir, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup"""
    try:
        await initialize_clickpesa_client()
    except Exception as e:
        logger.error(f"Startup initialization error: {str(e)}")
        # In development, continue even if ClickPesa is not configured
        if os.getenv("NODE_ENV") == "production":
            raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on application shutdown"""
    await shutdown_clickpesa_client()


@app.get("/")
def read_root():
    return {"status": "online", "message": "RestauFlow Backend API is running", "docs": "/docs"}

# WebSockets
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Include Routers
app.include_router(restaurants.router)
app.include_router(platform.router)
app.include_router(auth.router)
app.include_router(menu.router)
app.include_router(tables.router)
app.include_router(orders.router)
app.include_router(drivers.router)
app.include_router(customers.router)
app.include_router(payments.router)
app.include_router(clickpesa_payments.router)  # ClickPesa payment system
app.include_router(stats.router)
app.include_router(notifications.router)
app.include_router(seed.router)
app.include_router(uploads.router)
app.include_router(users.router)
app.include_router(analytics.router)
app.include_router(messaging.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
