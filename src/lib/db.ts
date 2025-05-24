'use server';

import mysql from 'mysql2/promise';

export async function testDBConnection(): Promise<{ success: boolean; message: string }> {
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
  const dbUser = process.env.DB_USERNAME;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;
  const dbSslMode = process.env.DB_SSL_MODE;

  if (!dbHost || !dbUser || !dbPassword || !dbName) {
    const missingVars = [
      !dbHost && "DB_HOST",
      !dbUser && "DB_USERNAME",
      !dbPassword && "DB_PASSWORD",
      !dbName && "DB_NAME"
    ].filter(Boolean).join(", ");
    console.error(`Varijable okruženja nedostaju: ${missingVars}`);
    return { success: false, message: `Varijable okruženja nedostaju: ${missingVars}. Provjerite .env.local datoteku.` };
  }
  
  if (dbName === "your_actual_database_name") {
    console.warn("Molimo zamijenite 'your_actual_database_name' s pravim imenom baze u .env.local");
    return { success: false, message: "Konfiguracija baze podataka nije dovršena. Molimo postavite DB_NAME u .env.local datoteci." };
  }

  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      ssl: dbSslMode === 'require' ? { rejectUnauthorized: false } : undefined, // Napomena: rejectUnauthorized: false je manje sigurno i koristi se za lakše testiranje. Za produkciju, razmislite o korištenju CA certifikata.
      connectTimeout: 10000 // 10 seconds
    });

    await connection.connect(); // Eksplicitno otvaranje konekcije
    console.log('Uspješno spojeno na bazu podataka!');
    await connection.end(); // Zatvaranje konekcije odmah nakon testa
    return { success: true, message: 'Uspješno spojeno na bazu podataka!' };
  } catch (error: any) {
    console.error('Greška pri spajanju na bazu podataka:', error);
    let detailedMessage = `Greška pri spajanju: ${error.message}.`;
    if (error.code) {
        detailedMessage += ` (Kod: ${error.code})`;
    }
    if (dbSslMode === 'require' && error.message.includes('SSL')) {
        detailedMessage += ' Mogući problem s SSL konfiguracijom. Za Azure, osigurajte da je IP adresa klijenta na whitelist-i i da su SSL postavke servera ispravne.';
    }
    return { success: false, message: detailedMessage };
  }
}
