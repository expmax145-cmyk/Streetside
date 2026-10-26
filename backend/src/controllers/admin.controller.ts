import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { User } from '../models/User.model';
import { Report } from '../models/Report.model';
import { Vendor } from '../models/Vendor.model';
import { ApiError } from '../utils/ApiError';
import { AuditLog } from '../models/AuditLog.model';
import * as vendorService from '../services/vendor.service';

// ── helpers ──────────────────────────────────────────────────────────────────

async function logAdminAction(
  actorId: string,
  action: string,
  targetId: string,
  meta?: Record<string, unknown>,
) {
  await AuditLog.create({ actor: actorId, action, target: targetId, meta }).catch(() => {});
}

// ── user management ──────────────────────────────────────────────────────────

export const listUsersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });
  sendSuccess(res, users);
});

export const patchUserStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const targetId = req.params.id;
  const { status } = req.body as { status: 'active' | 'suspended' };

  // prevent self-suspension
  if (targetId === req.user.id) {
    throw ApiError.badRequest('You cannot suspend your own account');
  }

  const user = await User.findById(targetId);
  if (!user) throw ApiError.notFound('User not found');

  // prevent suspending the last active admin
  if (user.role === 'admin' && status === 'suspended') {
    const activeAdmins = await User.countDocuments({
      role: 'admin',
      status: 'active',
      _id: { $ne: user._id },
    });
    if (activeAdmins === 0) {
      throw ApiError.badRequest('Cannot suspend the last active admin account');
    }
  }

  user.status = status;
  // bump refreshTokenVersion so suspended user's token is rejected immediately
  if (status === 'suspended') {
    await User.updateOne({ _id: user._id }, { status, $inc: { refreshTokenVersion: 1 } });
  } else {
    await User.updateOne({ _id: user._id }, { status });
  }

  await logAdminAction(req.user.id, `user.status.${status}`, targetId, { status });

  const updated = await User.findById(targetId);
  sendSuccess(res, updated);
});

// ── vendor management ─────────────────────────────────────────────────────────

export const listVendorsAdminHandler = asyncHandler(async (_req: Request, res: Response) => {
  // Return ALL vendors (active + inactive), not just the public list
  const vendors = await Vendor.find().sort({ createdAt: -1 });
  sendSuccess(res, vendors);
});

export const patchVendorStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw ApiError.notFound('Vendor not found');

  const { isActive } = req.body as { isActive: boolean };
  vendor.isActive = isActive;
  await vendor.save();

  // if deactivating, unset user.vendor reference
  if (!isActive && vendor.owner) {
    await User.updateOne(
      { _id: vendor.owner, vendor: vendor._id },
      { $unset: { vendor: 1 } },
    );
  }

  await logAdminAction(req.user.id, `vendor.${isActive ? 'activate' : 'deactivate'}`, String(vendor._id));
  sendSuccess(res, vendor);
});

// vendor approval gate

export const listPendingVendorsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const vendors = await vendorService.listPendingVendors();
  sendSuccess(res, vendors);
});

export const approveVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const vendor = await vendorService.approveVendor(req.params.id);
  await logAdminAction(req.user.id, 'vendor.approve', String(vendor._id));
  sendSuccess(res, vendor);
});

export const rejectVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const { reason } = req.body as { reason?: string };
  const vendor = await vendorService.rejectVendor(req.params.id, reason);
  await logAdminAction(req.user.id, 'vendor.reject', String(vendor._id), { reason });
  sendSuccess(res, vendor);
});

// ── reports ───────────────────────────────────────────────────────────────────

export const listReportsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const reports = await Report.find()
    .populate('reporter', 'name email')
    .sort({ createdAt: -1 });
  sendSuccess(res, reports);
});

export const patchReportHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');
  report.status = req.body.status;
  await report.save();
  await logAdminAction(req.user.id, `report.${req.body.status}`, String(report._id));
  sendSuccess(res, report);
});
