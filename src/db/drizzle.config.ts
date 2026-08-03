import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.MYSQL_HOST;
const sqlDbName = process.env.MYSQL_DB_NAME;
const user = process.env.MYSQL_USER;
const password = process.env.MYSQL_PASSWORD;
const port = parseInt(process.env.MYSQL_PORT || '3306', 10);

if (!sqlHost) throw new Error("MYSQL_HOST must be set in environment variables.");
if (!sqlDbName) throw new Error("MYSQL_DB_NAME must be set in environment variables.");
if (!user) throw new Error("MYSQL_USER must be set in environment variables.");
if (!password) throw new Error("MYSQL_PASSWORD must be set in environment variables.");

console.log(`Using user: ${user} to connect to database.`);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    port: port,
  },
  verbose: true,
});
