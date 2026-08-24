import ApiError from '../utils/ApiError.js';
import { verifyJwt } from '../services/authService.js';

// Middleware buat protected routes. Cek header Authorization: Bearer <token>,
// verify JWT, attach payload ke req.user. Throw 401 kalau gagal.
//
// Pakai di route yang butuh login:
//   router.get('/me', requireAuth, meHandler);
export default function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(
      new ApiError('UNAUTHORIZED', 'Authorization header tidak valid. Format: Bearer <token>', 401)
    );
  }

  // verifyJwt udah throw ApiError sesuai (TOKEN_EXPIRED / INVALID_TOKEN)
  const payload = verifyJwt(token);

  req.user = {
    userId: payload.sub,
    walletAddress: payload.walletAddress,
    chainType: payload.chainType,
  };

  next();
}
