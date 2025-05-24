import { z } from 'zod';

export const tvSchema = z.object({
  name: z.string().min(3, { message: "Naziv TV-a mora imati najmanje 3 znaka." }),
  description: z.string().optional(),
});

export type TVFormData = z.infer<typeof tvSchema>;

export const campaignSchema = z.object({
  name: z.string().min(3, { message: "Naziv kampanje mora imati najmanje 3 znaka." }),
  startTime: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Nevažeći datum početka." }),
  endTime: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Nevažeći datum završetka." }),
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: "Datum završetka mora biti nakon datuma početka.",
  path: ["endTime"], 
});

export type CampaignFormData = z.infer<typeof campaignSchema>;

export const adMediaSchema = z.object({
  name: z.string().min(1, "Naziv oglasa je obavezan."),
  type: z.enum(['image', 'gif', 'video']),
  file: z.any().refine(file => file instanceof File || typeof file === 'string', "Datoteka je obavezna."),
  fileName: z.string().optional(), 
  durationSeconds: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).refine(data => {
  if (data.type === 'image' || data.type === 'gif') {
    return data.durationSeconds !== undefined && data.durationSeconds > 0;
  }
  return true;
}, {
  message: "Trajanje je obavezno za slike i GIF-ove.",
  path: ["durationSeconds"],
}).refine(data => {
  if (data.startTime && data.endTime) {
    return new Date(data.startTime) < new Date(data.endTime);
  }
  return true;
}, {
  message: "Vrijeme završetka oglasa mora biti nakon vremena početka.",
  path: ["endTime"],
});

export type AdMediaFormData = z.infer<typeof adMediaSchema>;
