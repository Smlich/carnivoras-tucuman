export function mapFacebookProfileToUser(profile) {
  return {
    email: profile.email || `${String(profile.id)}@facebook.carnivorastucuman.invalid`,
  };
}
