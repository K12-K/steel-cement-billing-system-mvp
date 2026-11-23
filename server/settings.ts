import { Router, Response } from 'express';
import { getDatabase, saveDatabase } from './db.js';
import { AuthRequest } from './auth.js';

export const settingsRouter = Router();

settingsRouter.get('/', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  return res.json({
    success: true,
    settings: db.settings,
  });
});

settingsRouter.put('/', (req: AuthRequest, res: Response) => {
  const {
    company_name,
    tagline,
    gstin,
    show_gstin_on_bills,
    bill_header_title,
    show_bank_details_on_bills,
    phone,
    email,
    address,
    city,
    state,
    pincode,
    bank_name,
    account_number,
    ifsc_code,
    branch,
    terms_conditions,
  } = req.body;

  const db = getDatabase();

  if (company_name) db.settings.company_name = company_name.trim();
  if (tagline !== undefined) db.settings.tagline = tagline.trim();
  if (gstin !== undefined) db.settings.gstin = gstin.trim();
  if (typeof show_gstin_on_bills === 'boolean') {
    db.settings.show_gstin_on_bills = show_gstin_on_bills;
  }
  if (bill_header_title !== undefined) {
    db.settings.bill_header_title = String(bill_header_title).trim() || 'CASH MEMO';
  }
  if (typeof show_bank_details_on_bills === 'boolean') {
    db.settings.show_bank_details_on_bills = show_bank_details_on_bills;
  }
  if (phone !== undefined) db.settings.phone = phone.trim();
  if (email !== undefined) db.settings.email = email.trim();
  if (address !== undefined) db.settings.address = address.trim();
  if (city !== undefined) db.settings.city = city.trim();
  if (state !== undefined) db.settings.state = state.trim();
  if (pincode !== undefined) db.settings.pincode = pincode.trim();
  if (bank_name !== undefined) db.settings.bank_name = bank_name.trim();
  if (account_number !== undefined) db.settings.account_number = account_number.trim();
  if (ifsc_code !== undefined) db.settings.ifsc_code = ifsc_code.trim();
  if (branch !== undefined) db.settings.branch = branch.trim();
  if (terms_conditions !== undefined) db.settings.terms_conditions = terms_conditions.trim();

  saveDatabase();

  return res.json({
    success: true,
    message: 'Business settings and invoice footer updated successfully.',
    settings: db.settings,
  });
});
