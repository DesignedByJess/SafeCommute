import { Server, Socket } from 'socket.io';
import { logger } from '../services/audit.service';
import { verifySignature } from '../utils/hmac';

const locationRateLimit = new Map<string, number>();

export function registerTripSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    const cookie = socket.handshake.headers.cookie;
    const hasToken = cookie?.includes('sb-access-token=');
    if (!hasToken) {
      logger.warn(`Socket ${socket.id} rejected — no auth cookie`);
      socket.disconnect();
      return;
    }

    socket.on('join:trip', (tripId: string) => {
      socket.join(`trip:${tripId}`);
      logger.info(`Socket ${socket.id} joined trip:${tripId}`);
    });

    socket.on('leave:trip', (tripId: string) => {
      socket.leave(`trip:${tripId}`);
      logger.info(`Socket ${socket.id} left trip:${tripId}`);
    });

    socket.on('location:update', (data: { tripId: string; lat: number; lng: number; accuracy?: number; signature?: string }) => {
      const now = Date.now();
      const last = locationRateLimit.get(data.tripId) ?? 0;
      if (now - last < 10000) {
        logger.warn(`Rate limited location update for trip ${data.tripId} from socket ${socket.id}`);
        return;
      }
      locationRateLimit.set(data.tripId, now);

      const payload = { tripId: data.tripId, lat: data.lat, lng: data.lng, accuracy: data.accuracy };
      if (data.signature && !verifySignature(payload, data.signature)) {
        logger.warn(`Rejected unsigned location update from socket ${socket.id}`);
        return;
      }
      socket.to(`trip:${data.tripId}`).emit('location:updated', {
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
        recorded_at: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}
