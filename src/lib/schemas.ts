
import { z } from 'zod';

export const tvSchema = z.object({
  name: z.string().min(3, { message: "Naziv TV-a mora imati najmanje 3 znaka." }),
  description: z.string().optional(),
});

export type TVFormData = z.infer<typeof tvSchema>;

// Core fields for a campaign
export const baseCampaignSchemaCore = {
  name: z.string().min(3, { message: "Naziv kampanje mora imati najmanje 3 znaka." }),
  startTime: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Nevažeći datum početka." }),
  endTime: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Nevažeći datum završetka." }),
};

// Schema for basic campaign form (e.g., creation)
export const campaignSchema = z.object(baseCampaignSchemaCore)
  .refine(data => new Date(data.startTime) < new Date(data.endTime), {
    message: "Datum završetka mora biti nakon datuma početka.",
    path: ["endTime"],
  });

export type CampaignFormData = z.infer<typeof campaignSchema>;

// Schema for ad media
export const adMediaSchema = z.object({
  id: z.string().optional(), // Include ID as it's part of AdMedia and useful for field arrays
  name: z.string().min(1, "Naziv oglasa je obavezan."),
  type: z.enum(['image', 'gif', 'video']),
  file: z.any().refine(file => file instanceof File || typeof file === 'string' || file === undefined, "Datoteka je obavezna ili mora biti postojeći URL."),
  fileName: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  startTime: z.string().optional().or(z.literal('')), // Allow empty string for reset
  endTime: z.string().optional().or(z.literal('')),   // Allow empty string for reset
  url: z.string().optional(), // Existing URL for ads already saved
  dataAIHint: z.string().optional(), // For existing ads
}).refine(data => {
  if (data.type === 'image' || data.type === 'gif') {
    return data.durationSeconds !== undefined && data.durationSeconds > 0;
  }
  return true;
}, {
  message: "Trajanje je obavezno za slike i GIF-ove.",
  path: ["durationSeconds"],
}).refine(data => {
  if (data.startTime && data.endTime && data.startTime !== '' && data.endTime !== '') {
    return new Date(data.startTime) < new Date(data.endTime);
  }
  return true;
}, {
  message: "Vrijeme završetka oglasa mora biti nakon vremena početka.",
  path: ["endTime"],
});

export type AdMediaFormData = z.infer<typeof adMediaSchema>;

// Schema for the campaign edit page (includes ads and assignedTvIds)
export const campaignEditPageSchema = z.object({
  ...baseCampaignSchemaCore,
  ads: z.array(adMediaSchema),
  assignedTvIds: z.array(z.string())
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: "Datum završetka mora biti nakon datuma početka.",
  path: ["endTime"],
});

export type CampaignEditPageFormData = z.infer<typeof campaignEditPageSchema>;
