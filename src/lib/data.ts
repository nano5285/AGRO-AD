'use server';
import type { TV, Campaign, AdMedia, User } from './types'; // Dodan User tip
import { query, execute } from './db';
import type { OkPacket, RowDataPacket } from 'mysql2';

// Helper za mapiranje snake_case u camelCase
const mapToCamelCase = (row: any): any => {
  const newRow: any = {};
  for (const key in row) {
    const camelKey = key.replace(/([-_][a-z])/gi, ($1) =>
      $1.toUpperCase().replace('-', '').replace('_', '')
    );
    // Ako je vrijednost Date objekt iz baze, pretvori je u ISO string za konzistentnost u aplikaciji
    // Ako je vrijednost null ili neki drugi tip, ostavi kako jest
    if (row[key] instanceof Date) {
      newRow[camelKey] = row[key].toISOString();
    } else {
      newRow[camelKey] = row[key];
    }
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
  const newId = `tv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
  const result = await execute<OkPacket>('DELETE FROM tvs WHERE id = ?', [id]);
  return result.affectedRows > 0;
};


// Campaign Management Functions
const mapDbCampaignToCampaignType = (dbCampaign: any, ads: AdMedia[], assignedTvIds: string[]): Campaign => {
  return {
    id: dbCampaign.id,
    name: dbCampaign.name,
    // dbCampaign.startTime/endTime su već ISO stringovi zbog mapToCamelCase
    startTime: dbCampaign.startTime,
    endTime: dbCampaign.endTime,
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
        // dbAd.startTime/endTime su ISO stringovi ili null zbog mapToCamelCase
        startTime: dbAd.startTime || undefined,
        endTime: dbAd.endTime || undefined,
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
  const newId = `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // campaignData.startTime i campaignData.endTime su stringovi iz forme (npr. "yyyy-MM-ddTHH:mm")
  // Pretvaramo ih u Date objekte za slanje bazi
  const startTimeForDb = new Date(campaignData.startTime);
  const endTimeForDb = new Date(campaignData.endTime);

  // newCampaign objekt će i dalje koristiti ISO stringove za startTime i endTime zbog tipa Campaign
  const newCampaign: Campaign = {
    ...campaignData, // name
    id: newId,
    startTime: startTimeForDb.toISOString(),
    endTime: endTimeForDb.toISOString(),
    ads: [],
    assignedTvIds: [],
  };

  await execute('INSERT INTO campaigns (id, name, start_time, end_time) VALUES (?, ?, ?, ?)', [
    newCampaign.id,
    newCampaign.name,
    startTimeForDb, // Prosljeđujemo Date objekt bazi
    endTimeForDb,   // Prosljeđujemo Date objekt bazi
  ]);
  return newCampaign;
};

export const updateCampaign = async (updatedCampaign: Pick<Campaign, 'id' | 'name' | 'startTime' | 'endTime'>): Promise<Campaign | undefined> => {
  // updatedCampaign.startTime i updatedCampaign.endTime su ISO stringovi iz Campaign tipa
  // Pretvaramo ih u Date objekte za slanje bazi
  const startTimeForDb = new Date(updatedCampaign.startTime);
  const endTimeForDb = new Date(updatedCampaign.endTime);

  const result = await execute<OkPacket>(
    'UPDATE campaigns SET name = ?, start_time = ?, end_time = ? WHERE id = ?',
    [
      updatedCampaign.name,
      startTimeForDb, // Prosljeđujemo Date objekt bazi
      endTimeForDb,   // Prosljeđujemo Date objekt bazi
      updatedCampaign.id,
    ]
  );
  if (result.affectedRows > 0) {
    // Vraćamo puni Campaign objekt, koji će imati ISO stringove za datume
    return getCampaignById(updatedCampaign.id);
  }
  return undefined;
};

export const deleteCampaign = async (id: string): Promise<boolean> => {
  // Prvo obriši povezane TV-e
  await execute<OkPacket>('DELETE FROM campaign_tvs WHERE campaign_id = ?', [id]);
  // Zatim obriši oglase (ako ON DELETE CASCADE nije postavljen za ads.campaign_id, inače je ovo suvišno)
  // await execute<OkPacket>('DELETE FROM ads WHERE campaign_id = ?', [id]);
  // Na kraju obriši kampanju
  const result = await execute<OkPacket>('DELETE FROM campaigns WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

// Ad Media Management
export const addAdToCampaign = async (campaignId: string, adData: Omit<AdMedia, 'id'>): Promise<AdMedia | undefined> => {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return undefined;

  const newAdId = `ad-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // adData.startTime i adData.endTime su stringovi iz forme (npr. "yyyy-MM-ddTHH:mm") ili prazni/undefined
  // Pretvaramo ih u Date objekte za slanje bazi, ili null ako nisu definirani
  const startTimeForDb = adData.startTime && adData.startTime !== '' ? new Date(adData.startTime) : null;
  const endTimeForDb = adData.endTime && adData.endTime !== '' ? new Date(adData.endTime) : null;
  
  const newAd: AdMedia = { 
    ...adData, 
    id: newAdId,
    // AdMedia tip koristi ISO stringove ili undefined
    startTime: startTimeForDb ? startTimeForDb.toISOString() : undefined,
    endTime: endTimeForDb ? endTimeForDb.toISOString() : undefined,
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
      startTimeForDb, // Prosljeđujemo Date objekt ili null bazi
      endTimeForDb,   // Prosljeđujemo Date objekt ili null bazi
      newAd.dataAIHint
    ]
  );
  return newAd;
};

export const updateAdInCampaign = async (campaignId: string, updatedAd: AdMedia): Promise<AdMedia | undefined> => {
   // updatedAd.startTime i updatedAd.endTime su ISO stringovi ili undefined iz AdMedia tipa
   // Pretvaramo ih u Date objekte za slanje bazi, ili null ako su undefined
   const startTimeForDb = updatedAd.startTime ? new Date(updatedAd.startTime) : null;
   const endTimeForDb = updatedAd.endTime ? new Date(updatedAd.endTime) : null;

   const result = await execute<OkPacket>(
    'UPDATE ads SET name = ?, type = ?, url = ?, file_name = ?, duration_seconds = ?, start_time = ?, end_time = ?, data_ai_hint = ? WHERE id = ? AND campaign_id = ?',
    [
      updatedAd.name,
      updatedAd.type,
      updatedAd.url,
      updatedAd.fileName,
      updatedAd.durationSeconds,
      startTimeForDb, // Prosljeđujemo Date objekt ili null bazi
      endTimeForDb,   // Prosljeđujemo Date objekt ili null bazi
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
    if (error.code === 'ER_DUP_ENTRY') { // Već postoji veza, smatraj uspješnim
      return true; 
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
  // newCampaign.startTime i newCampaign.endTime su ISO stringovi
  // Pretvaramo ih u Date objekte za usporedbu i slanje bazi
  const newStartTimeObj = new Date(newCampaign.startTime);
  const newEndTimeObj = new Date(newCampaign.endTime);

  const sql = `
    SELECT c.id, c.name, c.start_time, c.end_time 
    FROM campaigns c
    JOIN campaign_tvs ct ON c.id = ct.campaign_id
    WHERE ct.tv_id = ? 
      AND c.id != ?
      AND (
        (c.start_time <= ? AND c.end_time >= ?) OR -- Postojeća obuhvaća novu
        (c.start_time >= ? AND c.start_time < ?) OR -- Nova počinje unutar postojeće
        (c.end_time > ? AND c.end_time <= ?) OR    -- Nova završava unutar postojeće
        (c.start_time < ? AND c.end_time > ?)     -- Nova obuhvaća postojeću (obrnuto od prve)
      )
    LIMIT 1;
  `;
  // Prosljeđujemo Date objekte bazi
  const conflictingCampaignRows = await query<any>(sql, [
    tvId,
    newCampaign.id,
    newEndTimeObj, newStartTimeObj,    // Za (c.start_time <= newEndTimeObj AND c.end_time >= newStartTimeObj)
    newStartTimeObj, newEndTimeObj,    // Za (c.start_time >= newStartTimeObj AND c.start_time < newEndTimeObj)
    newStartTimeObj, newEndTimeObj,    // Za (c.end_time > newStartTimeObj AND c.end_time <= newEndTimeObj)
    newStartTimeObj, newEndTimeObj     // Za (c.start_time < newStartTimeObj AND c.end_time > newEndTimeObj) -> (c.start_time < newEndTimeObj AND c.end_time > newStartTimeObj)
                                       // Redoslijed parametara mora odgovarati upitnicima u SQL-u.
                                       // Parametri za uvjete preklapanja:
                                       // 1. Postojeća završava NAKON što nova počne (c.end_time >= newStartTime)
                                       // 2. Postojeća počinje PRIJE nego nova završi (c.start_time <= newEndTime)
                                       // Logika preklapanja je: (StartA <= EndB) and (EndA >= StartB)
                                       // U našem slučaju (c.start_time <= newEndTimeObj) AND (c.end_time >= newStartTimeObj)
                                       // Ovo pokriva sve slučajeve preklapanja. Pojednostavnimo SQL.
  ]);

  const simplifiedSql = `
    SELECT c.id, c.name, c.start_time, c.end_time 
    FROM campaigns c
    JOIN campaign_tvs ct ON c.id = ct.campaign_id
    WHERE ct.tv_id = ? 
      AND c.id != ?
      AND (c.start_time < ? AND c.end_time > ?)
    LIMIT 1;
  `;
  // Parametri za simplifiedSql: tvId, newCampaign.id, newEndTimeObj, newStartTimeObj

  const conflictingCampaigns = await query<any>(simplifiedSql, [
    tvId,
    newCampaign.id,
    newEndTimeObj,    // existing.start_time < newCampaign.endTime
    newStartTimeObj   // existing.end_time > newCampaign.startTime
  ]);


  if (conflictingCampaigns.length > 0) {
    const conflictData = mapToCamelCase(conflictingCampaigns[0]);
    // Vraćamo Campaign objekt s ISO stringovima za datume
    return {
        id: conflictData.id,
        name: conflictData.name,
        startTime: conflictData.startTime, 
        endTime: conflictData.endTime,     
        ads: [], 
        assignedTvIds: [] 
    } as Campaign;
  }
  return null;
};

// User Management Functions
interface UserWithPassword extends User {
  passwordHash: string;
}

export async function getUserByUsernameWithPassword(username: string): Promise<UserWithPassword | null> {
  const rows = await query<RowDataPacket[]>("SELECT id, username, password_hash, role FROM users WHERE username = ?", [username]);
  if (rows.length === 0) {
    return null;
  }
  const userRow = rows[0] as any; // mapToCamelCase ovdje nije potreban jer su imena stupaca već dobra
  return {
    id: userRow.id,
    username: userRow.username,
    passwordHash: userRow.password_hash,
    role: userRow.role,
  } as UserWithPassword;
}

export async function getUserById(userId: string): Promise<User | null> {
  const rows = await query<RowDataPacket[]>("SELECT id, username, role FROM users WHERE id = ?", [userId]);
  if (rows.length === 0) {
    return null;
  }
   const userRow = rows[0] as any; // mapToCamelCase ovdje nije potreban
  return {
    id: userRow.id,
    username: userRow.username,
    role: userRow.role,
  } as User;
}

