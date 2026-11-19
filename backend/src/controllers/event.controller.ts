import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as eventService from '../services/event.service';

export const listEventsHandler = asyncHandler(async (req: Request, res: Response) => {
  const events = await eventService.listEvents();
  sendSuccess(res, events);
});

export const getEventHandler = asyncHandler(async (req: Request, res: Response) => {
  const ev = await eventService.getEventById(req.params.id);
  sendSuccess(res, ev);
});

export const createEventHandler = asyncHandler(async (req: Request, res: Response) => {
  const ev = await eventService.createEvent(req.body, req.user?.id);
  sendSuccess(res, ev, 201);
});

export const updateEventHandler = asyncHandler(async (req: Request, res: Response) => {
  const ev = await eventService.updateEvent(req.params.id, req.body);
  sendSuccess(res, ev);
});

export const deleteEventHandler = asyncHandler(async (req: Request, res: Response) => {
  await eventService.deleteEvent(req.params.id);
  sendSuccess(res, { message: 'Event deleted' });
});
