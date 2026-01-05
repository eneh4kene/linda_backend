import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
    facilityId: string | null;
  };
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
        facilityId: string | null;
      };

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          facilityId: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        facilityId: user.facilityId,
      };

      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ WebSocket client connected: ${socket.user?.email}`);

    // Join facility-specific room
    if (socket.user?.facilityId) {
      socket.join(`facility:${socket.user.facilityId}`);
      console.log(`📍 User ${socket.user.email} joined facility room: ${socket.user.facilityId}`);
    }

    // ADMINs join all-facilities room
    if (socket.user?.role === 'ADMIN') {
      socket.join('admin');
      console.log(`👑 Admin ${socket.user.email} joined admin room`);
    }

    // Subscribe to specific resident updates
    socket.on('subscribe:resident', (residentId: string) => {
      // Check if user has access to this resident
      prisma.resident
        .findUnique({
          where: { id: residentId },
          select: { facilityId: true },
        })
        .then((resident) => {
          if (!resident) {
            socket.emit('error', { message: 'Resident not found' });
            return;
          }

          // Check access
          if (socket.user?.role !== 'ADMIN' && socket.user?.facilityId !== resident.facilityId) {
            socket.emit('error', { message: 'Access denied to this resident' });
            return;
          }

          socket.join(`resident:${residentId}`);
          console.log(`👤 User ${socket.user?.email} subscribed to resident: ${residentId}`);
        });
    });

    // Unsubscribe from resident updates
    socket.on('unsubscribe:resident', (residentId: string) => {
      socket.leave(`resident:${residentId}`);
      console.log(`👤 User ${socket.user?.email} unsubscribed from resident: ${residentId}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ WebSocket client disconnected: ${socket.user?.email}`);
    });
  });

  console.log('🔌 WebSocket server initialized');
  return io;
}

/**
 * Get WebSocket server instance
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocket first.');
  }
  return io;
}

/**
 * Emit call status update to relevant clients
 */
export function emitCallStatusUpdate(
  callId: string,
  residentId: string,
  facilityId: string,
  status: string,
  data?: any
) {
  if (!io) return;

  const payload = {
    callId,
    residentId,
    status,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Emit to resident-specific room
  io.to(`resident:${residentId}`).emit('call:status', payload);

  // Emit to facility room
  io.to(`facility:${facilityId}`).emit('call:status', payload);

  // Emit to admin room
  io.to('admin').emit('call:status', payload);

  console.log(`📡 Call status update emitted: ${status} for call ${callId}`);
}

/**
 * Emit new concern notification
 */
export function emitConcernNotification(
  concernId: string,
  residentId: string,
  facilityId: string,
  severity: string,
  data?: any
) {
  if (!io) return;

  const payload = {
    concernId,
    residentId,
    severity,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Emit to facility room
  io.to(`facility:${facilityId}`).emit('concern:new', payload);

  // Emit to admin room
  io.to('admin').emit('concern:new', payload);

  console.log(`🚨 New concern notification emitted: ${concernId} (${severity})`);
}

/**
 * Emit concern status update
 */
export function emitConcernStatusUpdate(
  concernId: string,
  facilityId: string,
  status: string,
  data?: any
) {
  if (!io) return;

  const payload = {
    concernId,
    status,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Emit to facility room
  io.to(`facility:${facilityId}`).emit('concern:update', payload);

  // Emit to admin room
  io.to('admin').emit('concern:update', payload);

  console.log(`📋 Concern status update emitted: ${concernId} -> ${status}`);
}

/**
 * Emit resident update
 */
export function emitResidentUpdate(residentId: string, facilityId: string, updateType: string, data?: any) {
  if (!io) return;

  const payload = {
    residentId,
    updateType,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Emit to resident-specific room
  io.to(`resident:${residentId}`).emit('resident:update', payload);

  // Emit to facility room
  io.to(`facility:${facilityId}`).emit('resident:update', payload);

  // Emit to admin room
  io.to('admin').emit('resident:update', payload);

  console.log(`👤 Resident update emitted: ${residentId} (${updateType})`);
}
