import express, { type Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import * as env from './config/env';
import diagnosticRoutes from './routes/diagnostic';
import samlAuthRoutes from './routes/samlAuth';
import unsolicitedRoutes from './routes/unsolicited';

/**
 * Build a configured Express app. Side-effect free — no listen, no env
 * mutation. Bootstrap is the caller's responsibility.
 */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user: Express.User, done) => done(null, user));

  app.use('/api', diagnosticRoutes);
  app.use('/api/unsolicited', unsolicitedRoutes);
  app.use('/saml', samlAuthRoutes);

  return app;
}
