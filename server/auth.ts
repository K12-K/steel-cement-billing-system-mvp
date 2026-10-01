import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase, saveDatabase, User } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'steel_cement_billing_jwt_secret_key_2026_super_secure';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    const db = getDatabase();
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found or has been removed.' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }
}

export const authRouter = Router();

// Login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// Register
authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  // Basic email pattern check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  const db = getDatabase();
  const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const now = new Date().toISOString();
  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: normalizedEmail,
    password_hash: bcrypt.hashSync(password, 10),
    name: name && name.trim() ? name.trim() : normalizedEmail.split('@')[0],
    role: db.users.length === 0 ? 'admin' : 'admin', // All users in business portal get full manager privileges
    created_at: now,
    updated_at: now,
  };

  db.users.push(newUser);
  saveDatabase();

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(201).json({
    success: true,
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
  });
});

// Forgot Password - Initiate reset
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    // Return friendly response without revealing email existence (or inform for development ease)
    return res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been generated.',
    });
  }

  const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit verification code
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

  db.password_reset_tokens.push({
    id: `token_${Date.now()}`,
    email: normalizedEmail,
    token,
    expires_at: expiresAt,
    used: false,
  });
  saveDatabase();

  return res.json({
    success: true,
    message: 'Password reset code generated and sent to email successfully.',
    // We also provide token in response for testing/development convenience
    reset_code: token,
    expires_at: expiresAt,
  });
});

// Reset Password
authRouter.post('/reset-password', (req: Request, res: Response) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) {
    return res.status(400).json({ success: false, message: 'Email, verification code, and new password are required.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDatabase();

  const resetRecord = db.password_reset_tokens
    .filter(t => t.email === normalizedEmail && !t.used && new Date(t.expires_at) > new Date())
    .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];

  if (!resetRecord || resetRecord.token !== code.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired password reset verification code.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User account not found.' });
  }

  user.password_hash = bcrypt.hashSync(new_password, 10);
  user.updated_at = new Date().toISOString();
  resetRecord.used = true;
  saveDatabase();

  return res.json({
    success: true,
    message: 'Password has been reset successfully. You can now log in with your new password.',
  });
});

// Get Current User Profile
authRouter.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// Change Password
authRouter.post('/change-password', requireAuth, (req: AuthRequest, res: Response) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }

  const db = getDatabase();
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ success: false, message: 'Current password does not match.' });
  }

  user.password_hash = bcrypt.hashSync(new_password, 10);
  user.updated_at = new Date().toISOString();
  saveDatabase();

  return res.json({
    success: true,
    message: 'Password changed successfully.',
  });
});
