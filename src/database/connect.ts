import { Env } from "./../index";
import postgres from "postgres";

export async function initiate_postgres(env: Env) {
  // let connection =
  // `postgresql://${env.DATABASE_USER}:${env.DATABASE_PASSWORD}` +
  // `@${env.DATABASE_HOST}/${env.DATABASE_NAME}?sslmode=require`;
  let connection = {
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    host: env.DATABASE_HOST,
    database: env.DATABASE_NAME,
    ssl: true,
  };
  return postgres(connection);
}
