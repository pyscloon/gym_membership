-- Add semi-yearly option to membership tier enum
ALTER TYPE membership_tier ADD VALUE IF NOT EXISTS 'semi-yearly';
