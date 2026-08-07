import { DEFAULT_APP_INFO } from '@localite/shared';

export function getAppInfo() {
  return {
    name: process.env.APP_NAME || DEFAULT_APP_INFO.name,
    tagline: process.env.APP_TAGLINE || DEFAULT_APP_INFO.tagline,
    about: process.env.APP_ABOUT_TEXT || DEFAULT_APP_INFO.about,
    contactPhone: process.env.APP_CONTACT_PHONE || DEFAULT_APP_INFO.contactPhone,
    contactEmail: process.env.APP_CONTACT_EMAIL || DEFAULT_APP_INFO.contactEmail,
    downloadLink: process.env.APP_DOWNLOAD_LINK || DEFAULT_APP_INFO.downloadLink,
  };
}
