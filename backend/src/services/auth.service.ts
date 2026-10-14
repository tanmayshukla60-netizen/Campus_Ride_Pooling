import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';
import { User, AuthTokenPayload, Role } from '../types';
import { AppError } from '../middleware/errorHandler';

export async function signupUser(
  fullName: string,
  email: string,
  password: string,
  requestedRole?: 'DRIVER' | 'RIDER' | 'ADMIN'
): Promise<{ user: User; token: string }> {
  // 1. Validate email domain
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith(config.collegeEmailDomain.toLowerCase())) {
    throw new AppError(
      `Registration restricted to college email addresses ending in '${config.collegeEmailDomain}'`,
      400,
      'INVALID_COLLEGE_EMAIL'
    );
  }

  // 2. Check if user already exists
  const existingUserRes = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existingUserRes.rows.length > 0) {
    throw new AppError('An account with this email address already exists', 409, 'EMAIL_EXISTS');
  }

  // 3. Password hashing
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const role: Role = requestedRole || 'RIDER';

  // 4. Insert new user using parameterized raw SQL
  const insertRes = await query<User>(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name, email, role, rating_avg, rating_count, created_at`,
    [fullName.trim(), normalizedEmail, passwordHash, role]
  );

  const newUser = insertRes.rows[0];

  // 5. Generate JWT token
  const payload: AuthTokenPayload = {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    fullName: newUser.full_name,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

  return { user: newUser, token };
}

export async function loginUser(
  email: string,
  password: string,
  requestedRole?: 'DRIVER' | 'RIDER' | 'ADMIN'
): Promise<{ user: User; token: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Fetch user by email with raw SQL
  const res = await query(
    `SELECT id, full_name, email, password_hash, role, rating_avg, rating_count, created_at
     FROM users
     WHERE email = $1`,
    [normalizedEmail]
  );

  if (res.rows.length === 0) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const userRow = res.rows[0];

  // 2. Compare bcrypt password hash
  const isMatch = await bcrypt.compare(password, userRow.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // 3. Role switching — allow any user to log in as any chosen role (for demo flexibility)
  let finalRole: Role = userRow.role;
  if (requestedRole && requestedRole !== userRow.role) {
    await query('UPDATE users SET role = $1 WHERE id = $2', [requestedRole, userRow.id]);
    finalRole = requestedRole;
  }

  const user: User = {
    id: userRow.id,
    full_name: userRow.full_name,
    email: userRow.email,
    role: finalRole,
    rating_avg: parseFloat(userRow.rating_avg),
    rating_count: userRow.rating_count,
    created_at: userRow.created_at,
  };

  // 4. Generate JWT
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

  return { user, token };
}

export async function getCurrentUser(userId: string): Promise<User> {
  const res = await query<User>(
    `SELECT id, full_name, email, role, rating_avg, rating_count, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (res.rows.length === 0) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const user = res.rows[0];
  user.rating_avg = parseFloat(user.rating_avg as any);
  return user;
}
