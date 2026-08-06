import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { loadEnv } from './config/loadEnv.js';

loadEnv();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'localite_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

export default sequelize;
