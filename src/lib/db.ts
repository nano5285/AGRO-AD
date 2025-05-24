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

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      ssl: dbSslMode === 'require' ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 10000
    });

    // Connection.connect() is not needed for createConnection, it connects automatically.
    // await connection.connect(); 
    console.log('Uspješno spojeno na bazu podataka radi testiranja!');
    return { success: true, message: 'Uspješno spojeno na bazu podataka!' };
  } catch (error: any) {
    console.error('Greška pri spajanju na bazu podataka (test):', error);
    let detailedMessage = `Greška pri spajanju (test): ${error.message}.`;
    if (error.code) {
        detailedMessage += ` (Kod: ${error.code})`;
    }
    if (dbSslMode === 'require' && error.message.includes('SSL')) {
        detailedMessage += ' Mogući problem s SSL konfiguracijom. Za Azure, osigurajte da je IP adresa klijenta na whitelist-i i da su SSL postavke servera ispravne.';
    }
    return { success: false, message: detailedMessage };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}


let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (pool) {
    return pool;
  }
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
  const dbUser = process.env.DB_USERNAME;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;
  const dbSslMode = process.env.DB_SSL_MODE;

  if (!dbHost || !dbUser || !dbPassword || !dbName || dbName === "your_actual_database_name") {
    const errorMessage = "Varijable okruženja za bazu podataka nisu ispravno postavljene ili DB_NAME nije ažuriran.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    ssl: dbSslMode === 'require' ? { rejectUnauthorized: false } : undefined, // Za produkciju razmislite o sigurnijim SSL postavkama
    waitForConnections: true,
    connectionLimit: 10, // Prilagodite prema potrebi
    queueLimit: 0,
    connectTimeout: 10000, // 10 sekundi
  });

  console.log("MySQL Pool stvoren.");
  return pool;
}

// Tipovi za rezultate upita
type QueryResult<T> = T[] & mysql.RowDataPacket[];
type OkPacketResult = mysql.OkPacket | mysql.ResultSetHeader;


export async function query<T>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  const dbPool = getPool();
  try {
    const [results] = await dbPool.query(sql, params);
    return results as QueryResult<T>;
  } catch (error) {
    console.error("Greška pri izvršavanju upita:", sql, params, error);
    throw error; // Ponovno bacanje greške da se može obraditi na višoj razini
  }
}

export async function execute<T extends OkPacketResult>(sql: string, params?: any[]): Promise<T> {
  const dbPool = getPool();
  try {
    const [results] = await dbPool.execute(sql, params);
    return results as T;
  } catch (error) {
    console.error("Greška pri izvršavanju naredbe:", sql, params, error);
    throw error;
  }
}
