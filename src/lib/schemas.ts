import { z } from 'zod';

export const tvSchema = z.object({
  name: z.string().min(3, { message: "TV name must be at least 3 characters long." }),
  description: z.string().optional(),
});

export type TVFormData = z.infer<typeof tvSchema>;

export const campaignSchema = z.object({
  name: z.string().min(3, { message: "Campaign name must be at least 3 characters long." }),
  startTime: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid start date." }),
  endTime: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid end date." }),
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: "End date must be after start date.",
  path: ["endTime"], // Point error to endTime field
});

export type CampaignFormData = z.infer<typeof campaignSchema>;

export const adMediaSchema = z.object({
  name: z.string().min(1, "Ad name is required."),
  type: z.enum(['image', 'gif', 'video']),
  file: z.any().refine(file => file instanceof File || typeof file === 'string', "File is required."), // File object during upload, string (URL) if already uploaded
  fileName: z.string().optional(), // Will be populated from file
  durationSeconds: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).refine(data => {
  if (data.type === 'image' || data.type === 'gif') {
    return data.durationSeconds !== undefined && data.durationSeconds > 0;
  }
  return true;
}, {
  message: "Duration is required for images and GIFs.",
  path: ["durationSeconds"],
}).refine(data => {
  if (data.startTime && data.endTime) {
    return new Date(data.startTime) < new Date(data.endTime);
  }
  return true;
}, {
  message: "Ad end time must be after start time.",
  path: ["endTime"],
});

export type AdMediaFormData = z.infer<typeof adMediaSchema>;
