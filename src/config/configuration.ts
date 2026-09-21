export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  clientUrl: string;
  serverUrl: string;
  hostOn: string;
  redis: {
    host: string;
    port: number;
    password?: string;
    url?: string;
    tls: boolean;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  saltRounds: number;
  admin: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder: string;
  };
  google: {
    clientId: string;
  };
  turnstile: {
    secretKey: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    fromName: string;
    fromEmail: string;
    resendApiKey?: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/shunno_academy_db?schema=public',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  serverUrl: process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || '',
  hostOn: process.env.HOST_ON || '',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || undefined,
    tls: process.env.REDIS_TLS === 'true',
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      'shunno_academy_super_secret_access_jwt_key_2026',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'shunno_academy_super_secret_refresh_jwt_key_2026',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  saltRounds: process.env.SALT_ROUNDS ? parseInt(process.env.SALT_ROUNDS, 10) : 12,
  admin: {
    name: process.env.ADMIN_NAME || process.env.SUPER_ADMIN_NAME || 'Shunno Admin',
    email: process.env.ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'admin@shunnoacademy.com',
    password: process.env.ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || 'AdminPassword123!',
    phone: process.env.ADMIN_PHONE || process.env.SUPER_ADMIN_PHONE || '01700000000',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    apiKey: process.env.CLOUDINARY_API_KEY || '123456789012345',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'abcdefghijklmnopqrstuvwxyz',
    folder: process.env.CLOUDINARY_FOLDER || 'shunno-academy',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY || '',
  },
  email: {
    smtpHost: (process.env.SMTP_HOST || 'smtp.gmail.com').replace(/^["']|["']$/g, '').trim(),
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT.replace(/^["']|["']$/g, '').trim(), 10) : 587,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: (process.env.SMTP_USER || '').replace(/^["']|["']$/g, '').trim(),
    smtpPass: (process.env.SMTP_PASS || '').replace(/^["']|["']$/g, '').replace(/\s+/g, '').trim(),
    fromName: (process.env.SMTP_FROM_NAME || 'Shunno Academy').replace(/^["']|["']$/g, '').trim(),
    fromEmail: (process.env.SMTP_FROM_EMAIL || 'shunnoacademy0@gmail.com').replace(/^["']|["']$/g, '').trim(),
    resendApiKey: (process.env.RESEND_API_KEY || '').replace(/^["']|["']$/g, '').trim(),
  },
});
