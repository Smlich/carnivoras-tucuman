import { fromNodeHeaders } from 'better-auth/node';
import {
  ADMIN_COOKIE_NAME,
  isAdminConfigured,
  isAdminGoogleEmail,
  parseAdminEmails,
  parseCookies,
  verifyAdminToken,
} from '../auth/admin-session.js';
import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';
import { AdminAccount } from '../models/AdminAccount.js';

export async function getStoredAdminAccount() {
  if (!isDatabaseConnected()) return null;
  return AdminAccount.findOne({ key: 'primary' }).lean();
}

export async function resolveAdminAccess(request, { auth = null, appEnv = env } = {}) {
  const cookies = parseCookies(request.headers.cookie || '');
  const cookieToken = cookies[ADMIN_COOKIE_NAME];

  if (cookieToken && appEnv.ADMIN_SESSION_SECRET) {
    const tokenUser = verifyAdminToken(cookieToken, appEnv.ADMIN_SESSION_SECRET);
    if (tokenUser) {
      return {
        email: tokenUser.email,
        name: tokenUser.name || 'Administrador',
        role: 'admin',
        method: tokenUser.method || 'password',
      };
    }
  }

  if (auth) {
    const overrideAccount = await getStoredAdminAccount();
    if (parseAdminEmails(appEnv).length > 0 || overrideAccount?.email) {
      try {
        const sessionData = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        const userEmail = sessionData?.user?.email;
        const emailVerified = sessionData?.user?.emailVerified !== false;
        if (userEmail && emailVerified && isAdminGoogleEmail(userEmail, appEnv, overrideAccount)) {
          return {
            email: userEmail.toLowerCase(),
            name: sessionData.user.name || 'Administrador',
            role: 'admin',
            method: 'google',
          };
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function createRequireAdmin({ auth = null, appEnv = env } = {}) {
  return async function requireAdmin(request, response, next) {
    response.set('Cache-Control', 'no-store');

    try {
      if (request.method !== 'GET' && request.method !== 'HEAD' && request.get('x-admin-request') !== '1') {
        return response.status(400).json({
          error: {
            code: 'MISSING_ADMIN_HEADER',
            message: 'Falta la cabecera de seguridad de administración.',
          },
        });
      }

      const overrideAccount = await getStoredAdminAccount();
      const googleAdminAllowed = Boolean(auth && (parseAdminEmails(appEnv).length > 0 || overrideAccount?.email));
      if (!isAdminConfigured(appEnv, overrideAccount) && !googleAdminAllowed) {
        return response.status(503).json({
          error: {
            code: 'ADMIN_NOT_CONFIGURED',
            message: 'La cuenta de administración todavía no está configurada en el servidor.',
          },
        });
      }

      const adminUser = await resolveAdminAccess(request, { auth, appEnv });
      if (!adminUser) {
        return response.status(401).json({
          error: {
            code: 'ADMIN_AUTH_REQUIRED',
            message: 'Iniciá sesión como administrador para acceder a este panel.',
          },
        });
      }

      request.adminUser = adminUser;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
