import { Server, Socket } from 'socket.io';
import { Trip, TripLocation } from '../models';
import sequelize from '../database/sequelize';
import { EncryptionService } from '../services/encryption.service';
import { logger } from '../services/audit.service';
import { verifyJwt } from '../utils/jwt';
import { deriveTripHmacKey, verifyLocationSignature } from '../utils/hmac';

function parseAccessToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/sb-access-token=([^;]+)/);
  return match ? match[1] : null;
}

export function registerTripSocketHandlers(io: Server): void {
  io.on('connection', async (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    const cookieHeader = socket.handshake.headers.cookie;
    const token = parseAccessToken(cookieHeader);
    if (!token) {
      logger.warn(`Socket ${socket.id} rejected — no auth token in cookie`);
      socket.disconnect();
      return;
    }

    const payload = await verifyJwt(token);
    if (!payload) {
      logger.warn(`Socket ${socket.id} rejected — invalid or expired token`);
      socket.disconnect();
      return;
    }

    socket.data.userId = payload.sub;
    socket.data.phone = payload.phone;
    socket.data.email = payload.email;

    socket.on('join:trip', async (tripId: string) => {
      try {
        const trip = await Trip.findOne({ where: { id: tripId } });
        if (!trip) {
          logger.warn(`Socket ${socket.id} attempted to join non-existent trip ${tripId}`);
          return;
        }

        const userId = socket.data.userId;
        let isAuthorized = trip.user_id === userId;

        if (!isAuthorized && trip.contact_phone_encrypted && socket.data.phone) {
          try {
            const decryptedContactPhone = EncryptionService.decryptPhone(trip.contact_phone_encrypted);
            if (decryptedContactPhone === socket.data.phone) {
              isAuthorized = true;
            }
          } catch (err) {
            logger.error('Failed to decrypt contact phone for authorization check', { error: err });
          }
        }

        if (!isAuthorized) {
          logger.warn(`Socket ${socket.id} (user ${userId}) unauthorized to join trip ${tripId}`);
          socket.disconnect();
          return;
        }

        socket.data.shareToken = trip.share_token;
        socket.data.tripHmacKeys = socket.data.tripHmacKeys || {};
        socket.data.tripHmacKeys[tripId] = deriveTripHmacKey(trip.share_token);
        socket.join(`trip:${tripId}`);
        logger.info(`Socket ${socket.id} joined trip:${tripId}`);
      } catch (err) {
        logger.error(`Error during join:trip for socket ${socket.id}`, { error: err });
      }
    });

    socket.on('leave:trip', (tripId: string) => {
      socket.leave(`trip:${tripId}`);
      logger.info(`Socket ${socket.id} left trip:${tripId}`);
    });

    socket.on('location:update', async (data: { tripId: string; lat: number; lng: number; accuracy?: number; signature: string }) => {
      if (!data.signature) {
        logger.warn(`Rejected unsigned location update from socket ${socket.id} — disconnecting`);
        socket.disconnect();
        return;
      }

      // Atomic rate-limit: UPDATE only if last_location_at is NULL or older than 10 seconds.
      // Returns [results, metadata] — metadata.rowCount tells us if the update succeeded.
      const [, metadata] = await sequelize.query(
        `UPDATE trips SET last_location_at = NOW()
         WHERE id = :tripId
           AND (last_location_at IS NULL OR last_location_at < NOW() - INTERVAL '10 seconds')`,
        { replacements: { tripId: data.tripId } },
      );
      if (!metadata || (metadata as { rowCount?: number }).rowCount === 0) {
        return;
      }

      try {
        const tripKey: string | undefined = socket.data.tripHmacKeys?.[data.tripId];
        if (!tripKey) {
          logger.warn(`Rejected location update for trip ${data.tripId} — not joined`);
          return;
        }

        const payload = { tripId: data.tripId, lat: data.lat, lng: data.lng, accuracy: data.accuracy };

        if (!verifyLocationSignature(payload, data.signature, tripKey)) {
          logger.warn(`Rejected location update with invalid signature from socket ${socket.id} — disconnecting`);
          socket.disconnect();
          return;
        }
      } catch (err) {
        logger.error('Failed to verify location signature', { error: err });
        return;
      }

      try {
        await TripLocation.create({
          trip_id: data.tripId,
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy || null,
          recorded_at: new Date(),
        });
      } catch (err) {
        logger.error('Failed to persist location update to database', { error: err });
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
