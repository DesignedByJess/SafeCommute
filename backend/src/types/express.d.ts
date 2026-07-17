declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email?: string;
      phone?: string;
      name?: string;
      onboarding_complete?: boolean;
    };
  }
}
