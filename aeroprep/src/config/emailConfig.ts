/**
 * EmailJS configuration for sending real verification code emails
 * straight from the browser — no custom backend server required.
 *
 * SETUP (takes ~5 minutes, free tier is fine for personal projects):
 *   1. Create a free account at https://www.emailjs.com
 *   2. Add an Email Service (Email Services -> Add New Service) and
 *      connect your Gmail account. Copy the "Service ID".
 *   3. Create an Email Template (Email Templates -> Create New Template).
 *      Use these variable names in the template body/subject so they
 *      match what this app sends:
 *        {{to_email}}   - recipient's email address
 *        {{to_name}}    - recipient's name
 *        {{otp_code}}   - the 6-digit verification code
 *      Example template body:
 *        "Hi {{to_name}}, your AeroPrep verification code is {{otp_code}}.
 *         It expires in 10 minutes."
 *      Copy the "Template ID".
 *   4. Go to Account -> General and copy your "Public Key".
 *   5. Paste all three values below.
 *
 * Until these are filled in, the app automatically falls back to
 * "Dev Mode": the code is shown directly on screen instead of emailed,
 * so you can still test and demo the full sign-in flow without setup.
 */
export const EMAILJS_CONFIG = {
  SERVICE_ID: '',   // e.g. 'service_abc1234'
  TEMPLATE_ID: '',  // e.g. 'template_xyz5678'
  PUBLIC_KEY: '',   // e.g. 'AbCdEfGhIjKlMnOp'
};

export const isEmailServiceConfigured = (): boolean =>
  Boolean(EMAILJS_CONFIG.SERVICE_ID && EMAILJS_CONFIG.TEMPLATE_ID && EMAILJS_CONFIG.PUBLIC_KEY);
