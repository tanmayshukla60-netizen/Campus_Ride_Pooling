import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campus_rides',
  },
  jwtSecret: process.env.JWT_SECRET || 'super-secret-campus-rides-jwt-key-for-course-demo-2026',
  collegeEmailDomain: process.env.COLLEGE_EMAIL_DOMAIN || '@vitstudent.ac.in',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  holdExpirySeconds: parseInt(process.env.HOLD_EXPIRY_SECONDS || '300', 10),
};
