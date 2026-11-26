import { fromNodeHeaders } from 'better-auth/node';

// Exige una sesión válida de Better Auth. La sesión se verifica siempre en el servidor.
export function createRequireAuth(auth) {
  return async function requireAuth(request, response, next) {
    response.set('Cache-Control', 'no-store');

    if (!auth) {
      return response.status(503).json({
        error: {
          code: 'AUTH_NOT_CONFIGURED',
          message: 'El inicio de sesión estará disponible cuando se configure MongoDB y al menos un proveedor social.',
        },
      });
    }

    try {
      const sessionData = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });

      if (!sessionData?.user) {
        return response.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Iniciá sesión con Google para entrar a esta sección.',
          },
        });
      }

      request.authSession = sessionData.session;
      request.authUser = sessionData.user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
