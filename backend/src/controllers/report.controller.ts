import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { Report } from '../models/Report.model';
import { Vendor } from '../models/Vendor.model';
import { Review } from '../models/Review.model';
import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';

async function verifyTargetExists(type: string, targetId: string): Promise<void> {
  let exists = false;
  if (type === 'vendor') {
    exists = !!(await Vendor.exists({ _id: targetId }));
  } else if (type === 'review') {
    exists = !!(await Review.exists({ _id: targetId }));
  } else if (type === 'user') {
    exists = !!(await User.exists({ _id: targetId }));
  }
  if (!exists) {
    throw ApiError.notFound(`Reported ${type} not found`);
  }
}

export const createReportHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const { type, targetId, reason } = req.body as { type: string; targetId: string; reason: string };

  // verify target exists
  await verifyTargetExists(type, targetId);

  // reject duplicate pending reports
  const duplicate = await Report.findOne({
    reporter: req.user.id,
    type,
    targetId,
    status: 'pending',
  });
  if (duplicate) {
    throw ApiError.conflict('You already have a pending report for this item');
  }

  const report = await Report.create({
    type,
    targetId,
    reason: (reason ?? '').trim(),
    reporter: req.user.id,
    status: 'pending',
  });

  sendSuccess(res, report, 201);
});

export const listReportsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const reports = await Report.find()
    .populate('reporter', 'name email')
    .sort({ createdAt: -1 });
  sendSuccess(res, reports);
});
