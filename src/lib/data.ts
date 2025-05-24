'use server';
import type { TV, Campaign, AdMedia } from './types';
import { query, execute } from './db';
import type { OkPacket } from 'mysql2';

// Helper za mapiranje snake_case u camelCase
const mapToCamelCase = (row: any): any => {
  const newRow: any = {};
  for (const key in row) {
    const camelKey = key.replace(/([-_][a-z])/gi, ($1) =>
      $1.toUpperCase().replace('-', '').replace('_', '')
    );
    newRow[camelKey] = row[key] instanceof Date ? row[key].toISOString() : row[key];
  }
  return newRow;
};

// TV Management Functions
export const getTVs = async (): Promise<TV[]> => {
  const rows = await query<any>('SELECT id, name, description, unique_url FROM tvs');
  return rows.map(mapToCamelCase) as TV[];
};

export const getTVById = async (id: string): Promise<TV | undefined> => {
  const rows = await query<any>('SELECT id, name, description, unique_url FROM tvs WHERE id = ?', [id]);
  if (rows.length === 0) return undefined;
  return mapToCamelCase(rows[0]) as TV;
};

export const addTV = async (tvData: Omit<TV, 'id' | 'uniqueUrl'>): Promise<TV> => {
  const newId = `tv${Date.now()}`; // Jednostavna generacija ID-a, može se poboljšati
  const uniqueUrl = `/tv/${newId}`;
  const newTV: TV = { ...tvData, id: newId, uniqueUrl };
  await execute('INSERT INTO tvs (id, name, description, unique_url) VALUES (?, ?, ?, ?)', [
    newTV.id,
    newTV.name,
    newTV.description,
    newTV.uniqueUrl,
  ]);
  return newTV;
};

export const updateTV = async (updatedTV: TV): Promise<TV | undefined> => {
  const result = await execute<OkPacket>('UPDATE tvs SET name = ?, description = ?, unique_url = ? WHERE id = ?', [
    updatedTV.name,
    updatedTV.description,
    updatedTV.uniqueUrl,
    updatedTV.id,
  ]);
  return result.affectedRows > 0 ? updatedTV : undefined;
};

export const deleteTV = async (id: string): Promise<boolean> => {
  // ON DELETE CASCADE u campaign_tvs će obrisati reference
  const result = await execute<OkPacket>('DELETE FROM tvs WHERE id = ?', [id]);
  return result.affectedRows > 0;
};


// Campaign Management Functions
const mapDbCampaignToCampaignType = (dbCampaign: any, ads: AdMedia[], assignedTvIds: string[]): Campaign => {
  return {
    id: dbCampaign.id,
    name: dbCampaign.name,
    startTime: dbCampaign.startTime instanceof Date ? dbCampaign.startTime.toISOString() : dbCampaign.startTime,
    endTime: dbCampaign.endTime instanceof Date ? dbCampaign.endTime.toISOString() : dbCampaign.endTime,
    ads,
    assignedTvIds,
  };
};

const mapDbAdToAdType = (dbAd: any): AdMedia => {
    return {
        id: dbAd.id,
        name: dbAd.name,
        type: dbAd.type,
        url: dbAd.url,
        fileName: dbAd.fileName,
        durationSeconds: dbAd.durationSeconds,
        startTime: dbAd.startTime instanceof Date ? dbAd.startTime.toISOString() : dbAd.startTime,
        endTime: dbAd.endTime instanceof Date ? dbAd.endTime.toISOString() : dbAd.endTime,
        // dataAIHint se mapira iz data_ai_hint
        dataAIHint: dbAd.dataAiHint 
    };
}


export const getCampaigns = async (): Promise<Campaign[]> => {
  const campaignRows = await query<any>('SELECT id, name, start_time, end_time FROM campaigns');
  const campaignsList: Campaign[] = [];

  for (const campRow of campaignRows) {
    const adRows = await query<any>('SELECT id, name, type, url, file_name, duration_seconds, start_time, end_time, data_ai_hint FROM ads WHERE campaign_id = ?', [campRow.id]);
    const ads = adRows.map(mapDbAdToAdType);
    
    const tvIdRows = await query<any>('SELECT tv_id FROM campaign_tvs WHERE campaign_id = ?', [campRow.id]);
    const assignedTvIds = tvIdRows.map(row => row.tv_id);
    
    campaignsList.push(mapDbCampaignToCampaignType(mapToCamelCase(campRow), ads, assignedTvIds));
  }
  return campaignsList;
};

export const getCampaignById = async (id: string): Promise<Campaign | undefined> => {
  const campaignRows = await query<any>('SELECT id, name, start_time, end_time FROM campaigns WHERE id = ?', [id]);
  if (campaignRows.length === 0) return undefined;

  const campRow = campaignRows[0];
  const adRows = await query<any>('SELECT id, name, type, url, file_name, duration_seconds, start_time, end_time, data_ai_hint FROM ads WHERE campaign_id = ?', [id]);
  const ads = adRows.map(mapDbAdToAdType);

  const tvIdRows = await query<any>('SELECT tv_id FROM campaign_tvs WHERE campaign_id = ?', [id]);
  const assignedTvIds = tvIdRows.map(row => row.tv_id);

  return mapDbCampaignToCampaignType(mapToCamelCase(campRow), ads, assignedTvIds);
};

export const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'ads' | 'assignedTvIds'>): Promise<Campaign> => {
  const newId = `campaign${Date.now()}`;
  const newCampaign: Campaign = {
    ...campaignData,
    id: newId,
    startTime: new Date(campaignData.startTime).toISOString(), // Osiguravamo ISO format
    endTime: new Date(campaignData.endTime).toISOString(),   // Osiguravamo ISO format
    ads: [],
    assignedTvIds: [],
  };
  await execute('INSERT INTO campaigns (id, name, start_time, end_time) VALUES (?, ?, ?, ?)', [
    newCampaign.id,
    newCampaign.name,
    newCampaign.startTime, // Već je ISO string
    newCampaign.endTime,   // Već je ISO string
  ]);
  return newCampaign;
};

export const updateCampaign = async (updatedCampaign: Pick<Campaign, 'id' | 'name' | 'startTime' | 'endTime'>): Promise<Campaign | undefined> => {
  const result = await execute<OkPacket>(
    'UPDATE campaigns SET name = ?, start_time = ?, end_time = ? WHERE id = ?',
    [
      updatedCampaign.name,
      new Date(updatedCampaign.startTime).toISOString(),
      new Date(updatedCampaign.endTime).toISOString(),
      updatedCampaign.id,
    ]
  );
  if (result.affectedRows > 0) {
    return getCampaignById(updatedCampaign.id); // Vraćamo puni objekt kampanje
  }
  return undefined;
};

export const deleteCampaign = async (id: string): Promise<boolean> => {
  // ON DELETE CASCADE u ads i campaign_tvs će obrisati povezane zapise
  const result = await execute<OkPacket>('DELETE FROM campaigns WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

// Ad Media Management (within a campaign)
export const addAdToCampaign = async (campaignId: string, adData: Omit<AdMedia, 'id'>): Promise<AdMedia | undefined> => {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return undefined;

  const newAdId = `ad${Date.now()}`;
  const newAd: AdMedia = { 
    ...adData, 
    id: newAdId,
    startTime: adData.startTime ? new Date(adData.startTime).toISOString() : undefined,
    endTime: adData.endTime ? new Date(adData.endTime).toISOString() : undefined,
  };
  
  await execute(
    'INSERT INTO ads (id, campaign_id, name, type, url, file_name, duration_seconds, start_time, end_time, data_ai_hint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      newAd.id,
      campaignId,
      newAd.name,
      newAd.type,
      newAd.url,
      newAd.fileName,
      newAd.durationSeconds,
      newAd.startTime,
      newAd.endTime,
      newAd.dataAIHint
    ]
  );
  return newAd;
};

export const updateAdInCampaign = async (campaignId: string, updatedAd: AdMedia): Promise<AdMedia | undefined> => {
   const result = await execute<OkPacket>(
    'UPDATE ads SET name = ?, type = ?, url = ?, file_name = ?, duration_seconds = ?, start_time = ?, end_time = ?, data_ai_hint = ? WHERE id = ? AND campaign_id = ?',
    [
      updatedAd.name,
      updatedAd.type,
      updatedAd.url,
      updatedAd.fileName,
      updatedAd.durationSeconds,
      updatedAd.startTime ? new Date(updatedAd.startTime).toISOString() : null,
      updatedAd.endTime ? new Date(updatedAd.endTime).toISOString() : null,
      updatedAd.dataAIHint,
      updatedAd.id,
      campaignId,
    ]
  );
  return result.affectedRows > 0 ? updatedAd : undefined;
};

export const deleteAdFromCampaign = async (campaignId: string, adId: string): Promise<boolean> => {
  const result = await execute<OkPacket>('DELETE FROM ads WHERE id = ? AND campaign_id = ?', [adId, campaignId]);
  return result.affectedRows > 0;
};

// Scheduling and Conflict
export const assignCampaignToTV = async (campaignId: string, tvId: string): Promise<boolean> => {
  try {
    await execute('INSERT INTO campaign_tvs (campaign_id, tv_id) VALUES (?, ?)', [campaignId, tvId]);
    return true;
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') { // Ako veza već postoji
      return true; // Smatramo uspješnim jer je ciljano stanje postignuto
    }
    console.error("Greška pri dodjeli kampanje TV-u:", error);
    return false;
  }
};

export const unassignCampaignFromTV = async (campaignId: string, tvId: string): Promise<boolean> => {
  const result = await execute<OkPacket>('DELETE FROM campaign_tvs WHERE campaign_id = ? AND tv_id = ?', [campaignId, tvId]);
  return result.affectedRows > 0;
};

export const hasConflict = async (tvId: string, newCampaign: Pick<Campaign, 'id' | 'startTime' | 'endTime'>): Promise<Campaign | null> => {
  const newStartTime = new Date(newCampaign.startTime);
  const newEndTime = new Date(newCampaign.endTime);

  const sql = `
    SELECT c.id, c.name, c.start_time, c.end_time 
    FROM campaigns c
    JOIN campaign_tvs ct ON c.id = ct.campaign_id
    WHERE ct.tv_id = ? 
      AND c.id != ?
      AND (
        (c.start_time <= ? AND c.end_time >= ?) OR -- Postojeća obuhvaća novu
        (c.start_time >= ? AND c.start_time < ?) OR -- Nova počinje unutar postojeće
        (c.end_time > ? AND c.end_time <= ?)     -- Nova završava unutar postojeće
      )
    LIMIT 1;
  `;
  // Parametri za upit: tvId, newCampaign.id, newEndTime, newStartTime, newStartTime, newEndTime, newStartTime, newEndTime
  const conflictingCampaigns = await query<any>(sql, [
    tvId,
    newCampaign.id,
    newEndTime.toISOString(), newStartTime.toISOString(), // Za (StartA <= EndB) and (EndA >= StartB)
    newStartTime.toISOString(), newEndTime.toISOString(),   // Za početak nove unutar postojeće
    newStartTime.toISOString(), newEndTime.toISOString()    // Za kraj nove unutar postojeće
  ]);

  if (conflictingCampaigns.length > 0) {
    // Dohvati puni objekt kampanje koja se sukobljava za prikaz
    const conflictData = mapToCamelCase(conflictingCampaigns[0]);
    // Vraćamo samo osnovne podatke jer ne trebamo oglase i TV-e za poruku o sukobu
    return {
        id: conflictData.id,
        name: conflictData.name,
        startTime: conflictData.startTime, // Ovo bi već trebao biti ISO string iz mapToCamelCase
        endTime: conflictData.endTime,     // Ovo bi već trebao biti ISO string
        ads: [], // Nije potrebno za poruku o sukobu
        assignedTvIds: [] // Nije potrebno za poruku o sukobu
    } as Campaign;
  }
  return null;
};
