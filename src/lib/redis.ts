import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});
