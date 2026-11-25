import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';
import mongoose from 'mongoose';
import { mapFacebookProfileToUser } from './facebook-profile.js';
import { env } from '../config/env.js';

export function createAuth() {
  const socialProviders = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      requireEmailVerification: true,
    };
  }

  if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
    socialProviders.facebook = {
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
      scopes: ['email', 'public_profile'],
      mapProfileToUser: mapFacebookProfileToUser,
    };
  }

  if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL || Object.keys(socialProviders).length === 0) {
    return null;
  }

  const mongoClient = mongoose.connection.getClient();

  return {
    providers: Object.keys(socialProviders),
    instance: betterAuth({
      appName: 'Carnívoras Tucumán',
      baseURL: env.BETTER_AUTH_URL,
      basePath: '/api/auth',
      secret: env.BETTER_AUTH_SECRET,
      trustedOrigins: env.corsOrigins,
      database: mongodbAdapter(mongoClient.db(env.MONGODB_DATABASE), { client: mongoClient }),
      socialProviders,
      account: {
        encryptOAuthTokens: true,
      },
      advanced: {
        defaultCookieAttributes: {
          httpOnly: true,
          sameSite: 'lax',
          secure: env.NODE_ENV === 'production',
        },
      },
    }),
  };
}
