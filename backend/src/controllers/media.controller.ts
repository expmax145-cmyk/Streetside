import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import * as mediaService from '../services/media.service';

export const uploadMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const { dataUri } = req.body as { dataUri: string };
  if (!dataUri) throw ApiError.badRequest('dataUri is required');

  const media = await mediaService.storeImageFromDataUri(dataUri, req.user.id);
  sendSuccess(res, { id: String(media._id), url: `/api/media/${media._id}` }, 201);
});

export const getMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  const media = await mediaService.getMediaById(req.params.id);
  // Long cache lifetime — media documents are immutable once created
  // (a re-upload creates a new document with a new id, it never mutates
  // an existing one), so aggressive caching is always safe here.
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('Content-Type', media.mimeType);
  res.send(media.data);
});
