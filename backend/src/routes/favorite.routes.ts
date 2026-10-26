import { Router } from 'express';
import { param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { listFavoritesHandler, addFavoriteHandler, removeFavoriteHandler } from '../controllers/favorite.controller';

const router = Router();

// Every favorites route requires auth — favorites are always scoped to
// "my" account, there is no public/anonymous view of them.
router.use(authenticate);

router.get('/', listFavoritesHandler);

router.post('/:vendorId', param('vendorId').isMongoId(), validate, addFavoriteHandler);

router.delete('/:vendorId', param('vendorId').isMongoId(), validate, removeFavoriteHandler);

export default router;
