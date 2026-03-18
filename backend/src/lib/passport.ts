import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "./prisma";

// Tell passport how to fetch the user from DB using the session user id
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user || undefined);
  } catch (err) {
    done(err, undefined);
  }
});

// Google OAuth strategy — this runs when user logs in with Google
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value!;
        const name = profile.displayName;
        const avatar = profile.photos?.[0].value;

        // Check if user already exists, if not create them
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: { email, name, avatar },
          });
        }

        // Also save this Google account as a connected account
        await prisma.connectedAccount.upsert({
          where: { userId_googleEmail: { userId: user.id, googleEmail: email } },
          update: { accessToken, refreshToken: refreshToken ?? "" },
          create: {
            userId: user.id,
            googleEmail: email,
            accessToken,
            refreshToken: refreshToken ?? "",
          },
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport;