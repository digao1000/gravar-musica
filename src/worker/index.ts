// This file has been cleaned up - all functionality migrated to Supabase
// The legacy authentication and API endpoints have been removed for security

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', message: 'Worker is running' });
});

// All other functionality has been migrated to Supabase
app.all('*', (c) => {
  return c.json({ 
    error: 'Endpoint not found. All functionality has been migrated to Supabase for security.' 
  }, 404);
});

export default app;