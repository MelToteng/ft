import { Transaction, Budgets, Budget, TransactionType } from "../types";
import initSqlJs, { Database } from "sql.js";

let db: Database | null = null;
const DB_NAME = "finance-tracker.sqlite";

// Helper to load the database from IndexedDB
async function loadDbFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("sqljs-database");

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_NAME)) {
        db.createObjectStore(DB_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DB_NAME)) {
        resolve(null);
        return;
      }

      const transaction = db.transaction(DB_NAME, "readonly");
      const store = transaction.objectStore(DB_NAME);
      const getRequest = store.get(DB_NAME);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => resolve(null); // DB doesn't exist yet
  });
}

// Helper to save the database to IndexedDB
async function saveDbToIndexedDB() {
  if (!db) return;
  const data = db.export();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("sqljs-database", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_NAME)) {
        db.createObjectStore(DB_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(DB_NAME, "readwrite");
      const store = transaction.objectStore(DB_NAME);
      const putRequest = store.put(data, DB_NAME);
      putRequest.onsuccess = () => resolve(putRequest.result);
      putRequest.onerror = () => reject(putRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// Initialize the database
export async function initDb() {
  if (db) return;
  try {
    const SQL = await initSqlJs({
      locateFile: (file) => `/${file}`,
    });
    const savedDb = await loadDbFromIndexedDB();
    if (savedDb) {
      db = new SQL.Database(savedDb);
    } else {
      db = new SQL.Database();
      createSchema();
    }
  } catch (err) {
    console.error("Failed to initialize sql.js:", err);
    throw new Error(
      "Could not initialize the database. Your browser may not be supported."
    );
  }
}

// Create database schema if it doesn't exist
function createSchema() {
  if (!db) throw new Error("Database not initialized.");
  db.exec(`
        CREATE TABLE transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            category TEXT NOT NULL
        );
        CREATE TABLE budgets (
            category TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            period TEXT NOT NULL,
            start_day INTEGER
        );
    `);
  saveDbToIndexedDB();
}

// --- DATABASE API FUNCTIONS ---

function resultsToTransactions(results: any[]): Transaction[] {
  if (!results || results.length === 0 || !results[0].values) return [];
  const [{ columns, values }] = results;
  return values.map((row: any[]) => {
    const transaction: any = {};
    columns.forEach((col: string, i: number) => {
      transaction[col] = row[i];
    });
    return transaction as Transaction;
  });
}

export const getTransactions = async (): Promise<Transaction[]> => {
  if (!db) await initDb();
  const res = db!.exec("SELECT * FROM transactions ORDER BY date DESC");
  return resultsToTransactions(res);
};

export const addTransaction = async (
  transaction: Omit<Transaction, "id">
): Promise<Transaction> => {
  if (!db) throw new Error("Database not initialized.");
  const stmt = db.prepare(
    "INSERT INTO transactions (type, description, amount, date, category) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run([
    transaction.type,
    transaction.description,
    transaction.amount,
    transaction.date,
    transaction.category,
  ]);
  stmt.free();

  const res = db.exec("SELECT last_insert_rowid()");
  const newId = res[0].values[0][0] as number;

  await saveDbToIndexedDB();
  return { ...transaction, id: newId };
};

export const deleteTransaction = async (id: number): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  db.exec(`DELETE FROM transactions WHERE id = ${id}`);
  await saveDbToIndexedDB();
};

export const getBudgets = async (): Promise<Budgets> => {
  if (!db) await initDb();
  const res = db!.exec("SELECT * FROM budgets");
  if (!res || res.length === 0 || !res[0].values) return {};

  const budgets: Budgets = {};
  const [{ columns, values }] = res;

  values.forEach((row: any[]) => {
    const budgetData: any = {};
    columns.forEach((col: string, i: number) => {
      budgetData[col] = row[i];
    });
    budgets[budgetData.category] = {
      amount: budgetData.amount,
      period: budgetData.period,
      startDay: budgetData.start_day,
    };
  });
  return budgets;
};

export const upsertBudget = async (
  category: string,
  budgetData: Budget
): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  const stmt = db.prepare(`
        INSERT INTO budgets (category, amount, period, start_day) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(category) DO UPDATE SET
        amount = excluded.amount,
        period = excluded.period,
        start_day = excluded.start_day
    `);
  stmt.run([
    category,
    budgetData.amount,
    budgetData.period,
    budgetData.startDay,
  ]);
  stmt.free();
  await saveDbToIndexedDB();
};

export const deleteBudget = async (category: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  db.exec(`DELETE FROM budgets WHERE category = '${category}'`);
  await saveDbToIndexedDB();
};
