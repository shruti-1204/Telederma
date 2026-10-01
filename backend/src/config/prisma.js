require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { Pool } = require('pg');
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({
  user: 'postgres',
  password: '123456',
  host: 'localhost',
  port: 5432,
  database: 'telederma'
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;