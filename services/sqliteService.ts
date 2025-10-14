import { Transaction, BudgetItem, BudgetPeriod } from "../types";
import initSqlJs, { Database } from "sql.js";

let db: Database | null = null;
const DB_NAME = "finance-tracker.sqlite";
const LATEST_DB_VERSION = 3;

// Helper to load the database from IndexedDB
async function loadDbFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("sqljs-database");
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
        const request = indexedDB.open("sqljs-database", LATEST_DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(DB_NAME)) {
                db.createObjectStore(DB_NAME);
            }
        };
        request.onsuccess = () => {
            const db = request.result;
            console.log("Saving database to IndexedDB:",DB_NAME);
            const transaction = db.transaction(DB_NAME, "readwrite");
            const store = transaction.objectStore(DB_NAME);
            const putRequest = store.put(data, DB_NAME);
            putRequest.onsuccess = () => resolve(putRequest.result);
            putRequest.onerror = () => reject(putRequest.error);
        };
        request.onerror = () => reject(request.error);
    });
}

// Non-destructive migration function
function runMigrations(db: Database) {
    let currentVersion = 0;
    try {
        const versionResult = db.exec("PRAGMA user_version;");
        if (versionResult[0] && versionResult[0].values[0]) {
            currentVersion = versionResult[0].values[0][0] as number;
        }
    } catch (e) {
        console.warn("Could not read user_version, assuming database is new or unversioned (version 0).");
    }

    if (currentVersion < 1) {
        console.log("Migrating to version 1: Creating initial transactions table.");
        db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                category TEXT NOT NULL
            );
        `);
    }

    if (currentVersion < 2) {
        console.log("Migrating to version 2: Creating budget periods and budgets tables.");
        db.exec(`
            CREATE TABLE IF NOT EXISTS budget_periods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                budget_period_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                FOREIGN KEY (budget_period_id) REFERENCES budget_periods(id) ON DELETE CASCADE,
                UNIQUE(budget_period_id, category)
            );
        `);
    }
    
    if (currentVersion < 3) {
        console.log("Migrating to version 3: Creating settings table.");
        db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
    }

    // After all migrations, set the final version if it has changed.
    if (currentVersion < LATEST_DB_VERSION) {
        db.exec(`PRAGMA user_version = ${LATEST_DB_VERSION};`);
        console.log(`Database migrated to version ${LATEST_DB_VERSION}.`);
    }
}


// Initialize the database
export async function initDb() {
    if (db) return;
    try {
        const SQL = await initSqlJs({
            locateFile: file => `/${file}`
        });
        const savedDb = await loadDbFromIndexedDB();
        
        if (savedDb) {
            db = new SQL.Database(savedDb);
            console.log("Loaded database from IndexedDB.");
        } else {
            db = new SQL.Database();
            console.log("Created a new in-memory database.");
        }

        // Run migrations on the loaded or new database.
        runMigrations(db);
        await saveDbToIndexedDB(); // Save any migration changes

    } catch (err) {
        console.error("Failed to initialize sql.js:", err);
        throw new Error("Could not initialize the database. Your browser may not be supported.");
    }
}

// --- DATABASE API FUNCTIONS ---

function resultsToTransactions(results: any[]): Transaction[] {
    if (!results || results.length === 0 || !results[0].values) return [];
    const [ { columns, values } ] = results;
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

export const getTransactionsCount = async (): Promise<number> => {
    if (!db) await initDb();
    const res = db!.exec("SELECT COUNT(*) FROM transactions");
    if (res[0] && res[0].values[0]) {
        return res[0].values[0][0] as number;
    }
    return 0;
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
    if (!db) throw new Error("Database not initialized.");
    const stmt = db.prepare("INSERT INTO transactions (type, description, amount, date, category) VALUES (?, ?, ?, ?, ?)");
    stmt.run([transaction.type, transaction.description, transaction.amount, transaction.date, transaction.category]);
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

// --- BUDGET PERIODS ---

function resultsToBudgetPeriods(results: any[]): BudgetPeriod[] {
    if (!results || results.length === 0 || !results[0].values) return [];
    const [{ columns, values }] = results;
    return values.map((row: any[]) => {
        const period: any = {};
        columns.forEach((col: string, i: number) => {
            const key = col === 'start_date' ? 'startDate' : col === 'end_date' ? 'endDate' : col;
            period[key] = row[i];
        });
        return period as BudgetPeriod;
    });
}

export const getBudgetPeriods = async (): Promise<BudgetPeriod[]> => {
    if (!db) await initDb();
    const res = db!.exec("SELECT * FROM budget_periods ORDER BY start_date DESC");
    return resultsToBudgetPeriods(res);
};

export const addBudgetPeriod = async (period: Omit<BudgetPeriod, 'id'>): Promise<BudgetPeriod> => {
    if (!db) throw new Error("Database not initialized.");
    const stmt = db.prepare("INSERT INTO budget_periods (name, start_date, end_date) VALUES (?, ?, ?)");
    stmt.run([period.name, period.startDate, period.endDate]);
    stmt.free();
    
    const res = db.exec("SELECT last_insert_rowid()");
    const newId = res[0].values[0][0] as number;
    await saveDbToIndexedDB();
    return { ...period, id: newId };
};

export const updateBudgetPeriod = async (period: BudgetPeriod): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const stmt = db.prepare("UPDATE budget_periods SET name = ?, start_date = ?, end_date = ? WHERE id = ?");
    stmt.run([period.name, period.startDate, period.endDate, period.id]);
    stmt.free();
    await saveDbToIndexedDB();
};

export const deleteBudgetPeriod = async (id: number): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    db.exec(`DELETE FROM budget_periods WHERE id = ${id}`);
    await saveDbToIndexedDB();
};


// --- BUDGET ITEMS ---

function resultsToBudgets(results: any[]): BudgetItem[] {
    if (!results || results.length === 0 || !results[0].values) return [];
    const [ { columns, values } ] = results;
    return values.map((row: any[]) => {
        const budgetItem: any = {};
        columns.forEach((col: string, i: number) => {
            const key = col === 'budget_period_id' ? 'budgetPeriodId' : col;
            budgetItem[key] = row[i];
        });
        return budgetItem as BudgetItem;
    });
}

export const getBudgets = async (): Promise<BudgetItem[]> => {
    if (!db) await initDb();
    const res = db!.exec("SELECT * FROM budgets");
    return resultsToBudgets(res);
};

export const saveBudgets = async (periodId: number, budgetsToSave: { category: string; amount: number }[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    db.exec("BEGIN TRANSACTION;");
    try {
        const deleteStmt = db.prepare("DELETE FROM budgets WHERE budget_period_id = ?");
        deleteStmt.run([periodId]);
        deleteStmt.free();

        const insertStmt = db.prepare("INSERT INTO budgets (budget_period_id, category, amount) VALUES (?, ?, ?)");
        budgetsToSave.forEach(({ category, amount }) => {
            if (amount > 0) {
                insertStmt.run([periodId, category, amount]);
            }
        });
        insertStmt.free();
        
        db.exec("COMMIT;");
    } catch (e) {
        db.exec("ROLLBACK;");
        throw e;
    }

    await saveDbToIndexedDB();
};

// --- SETTINGS ---
export const getSetting = async (key: string): Promise<string | null> => {
    if (!db) await initDb();
    const stmt = db!.prepare("SELECT value FROM settings WHERE key = ?");
    stmt.bind([key]);
    let value: string | null = null;
    if (stmt.step()) {
        const row = stmt.get();
        value = row[0] as string;
    }
    stmt.free();
    return value;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    stmt.run([key, value]);
    stmt.free();
    await saveDbToIndexedDB();
};

// --- MOCK DATA SEEDING ---
export const seedWithMockData = async (mockData: {
    mockTransactions: Transaction[];
    mockBudgets: BudgetItem[];
    mockBudgetPeriods: BudgetPeriod[];
}) => {
    if (!db) throw new Error("Database not initialized.");
    
    const { mockTransactions, mockBudgets, mockBudgetPeriods } = mockData;

    db.exec("BEGIN TRANSACTION;");
    try {
        const periodIdMap = new Map<number, number>();
        for (const period of mockBudgetPeriods) {
            const oldId = period.id;
            const newPeriod = await addBudgetPeriod({name: period.name, startDate: period.startDate, endDate: period.endDate});
            periodIdMap.set(oldId, newPeriod.id);
        }

        const budgetsByNewPeriodId: { [key: number]: { category: string, amount: number }[] } = {};
        for (const budget of mockBudgets) {
            const newPeriodId = periodIdMap.get(budget.budgetPeriodId);
            if (newPeriodId) {
                if (!budgetsByNewPeriodId[newPeriodId]) {
                    budgetsByNewPeriodId[newPeriodId] = [];
                }
                budgetsByNewPeriodId[newPeriodId].push({ category: budget.category, amount: budget.amount });
            }
        }
        for (const newPeriodIdStr in budgetsByNewPeriodId) {
            const newPeriodId = Number(newPeriodIdStr);
            await saveBudgets(newPeriodId, budgetsByNewPeriodId[newPeriodId]);
        }
        
        // Insert transactions oldest first
        for (const transaction of [...mockTransactions].reverse()) {
            const { id, ...transData } = transaction;
            await addTransaction(transData);
        }
        db.exec("COMMIT;");
    } catch(e) {
        db.exec("ROLLBACK;");
        console.error("Failed to seed database with mock data:", e);
        throw e;
    }
    
    await saveDbToIndexedDB();
};
